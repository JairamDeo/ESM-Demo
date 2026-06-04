/**
 * One-time migration: move admins collection into officers + fix assignments.
 * Run: npx ts-node src/scripts/migrate-admins-to-officers.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Admin from "../models/Admin";
import Officer from "../models/Officer";
import Station from "../models/Station";
import HQ from "../models/HeadQuarter";
import State from "../models/State";
import { rbacRoleFromJobRole } from "../constants/officerRoles";

const ADMIN_ROLE_TO_JOB: Record<string, string> = {
  super_admin: "Super Admin",
  area: "Area Officer",
  headquarter: "Headquarter Officer",
  station_hq: "Station HQ Officer",
};

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB");

  const admins = await Admin.find();
  console.log(`Found ${admins.length} admin documents`);

  for (const admin of admins) {
    const jobRole = ADMIN_ROLE_TO_JOB[admin.role] || "Super Admin";
    const rbacRole = admin.role;

    const existing = await Officer.findOne({
      $or: [{ username: admin.username }, { email: admin.email }],
    });

    const base: Record<string, unknown> = {
      name: admin.name,
      email: admin.email,
      role: jobRole,
      rbacRole,
      username: admin.username,
      password: "admin123", // re-hash on save; change passwords after migration
      canLogin: true,
      status: admin.isActive ? "active" : "inactive",
      lastLogin: admin.lastLogin,
    };

    if (rbacRole === "area") {
      const station = await Station.findOne({
        name: { $regex: admin.station?.replace(" Station HQ", "") || "", $options: "i" },
      });
      if (station?.state) {
        const state = await State.findById(station.state);
        if (state) {
          base.stateId = state._id;
          base.stateName = state.name;
          base.stateCode = state.code;
        }
      } else {
        const state = await State.findOne({ isActive: true });
        if (state) {
          base.stateId = state._id;
          base.stateName = state.name;
          base.stateCode = state.code;
        }
      }
    } else if (rbacRole === "headquarter") {
      const hq = await HQ.findOne({ isActive: true });
      if (hq) {
        base.hqId = hq._id;
        base.hqName = hq.name;
      }
    } else if (rbacRole === "station_hq") {
      const station = await Station.findOne({
        name: { $regex: admin.station?.replace(" Sub-Area", "") || admin.station || "", $options: "i" },
        isActive: true,
      });
      if (station) {
        base.station = station._id;
        base.stationName = station.name;
        base.hqId = station.hqId;
        base.hqName = station.hqName;
        base.stateId = station.state;
        base.stateName = station.stateName;
        base.stateCode = station.stateCode;
      }
    }

    if (existing) {
      await Officer.findByIdAndUpdate(existing._id, base);
      console.log(`Updated officer for admin "${admin.username}"`);
    } else {
      await Officer.create(base);
      console.log(`Created officer for admin "${admin.username}"`);
    }
  }

  // Backfill existing officers without rbacRole / wrong station-only mapping
  const officers = await Officer.find({ role: { $ne: "Super Admin" } });
  for (const o of officers) {
    const updates: Record<string, unknown> = {};
    if (!o.rbacRole) updates.rbacRole = rbacRoleFromJobRole(o.role);

    if (o.role === "Area Officer" && !o.stateId && o.station) {
      const st = await Station.findById(o.station);
      if (st?.state) {
        const state = await State.findById(st.state);
        if (state) {
          updates.stateId = state._id;
          updates.stateName = state.name;
          updates.stateCode = state.code;
          updates.station = undefined;
          updates.stationName = undefined;
        }
      }
    }
    if (o.role === "Headquarter Officer" && !o.hqId) {
      const hq = await HQ.findOne({ isActive: true });
      if (hq) {
        updates.hqId = hq._id;
        updates.hqName = hq.name;
        updates.station = undefined;
        updates.stationName = undefined;
      }
    }
    if (o.role === "Station HQ Officer" && o.station && !o.hqId) {
      const st = await Station.findById(o.station);
      if (st) {
        updates.hqId = st.hqId;
        updates.hqName = st.hqName;
        updates.stateId = st.state;
        updates.stateName = st.stateName;
        updates.stateCode = st.stateCode;
      }
    }

    if (Object.keys(updates).length) {
      await Officer.findByIdAndUpdate(o._id, { $unset: { permissions: "" }, ...updates });
      console.log(`Backfilled ${o.name}`);
    } else if ((o as any).permissions) {
      await Officer.findByIdAndUpdate(o._id, { $unset: { permissions: "" } });
    }
  }

  console.log("\nDone. You may drop the admins collection manually after verifying logins.");
  await mongoose.disconnect();
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
