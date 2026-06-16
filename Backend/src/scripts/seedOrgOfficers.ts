/**
 * Seed officers (L1/L2/L3) from existing Area → HQ → Station HQ data.
 * Does NOT wipe DB — keeps Super Admin; upserts by email.
 *
 * Run: npm run seed:org-officers
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import State from "../models/State";
import HQ from "../models/HeadQuarter";
import Station from "../models/Station";
import Officer from "../models/Officer";
import { OfficerLevel } from "../constants/officerLevels";
import { buildOfficerAssignment } from "../services/officerAssignment";

const PASSWORD = "Jairam@123";
const LEVELS: OfficerLevel[] = ["L1", "L2", "L3"];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/station hq/gi, "st")
    .replace(/sub-area hq|area hq/gi, "hq")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 36);
}

type SeedRow = {
  email: string;
  name: string;
  role: "Area Officer" | "Headquarter Officer" | "Station HQ Officer";
  level: OfficerLevel;
  stateId?: string;
  hqId?: string;
  stationId?: string;
};

async function upsertOfficer(row: SeedRow) {
  const username = row.email.split("@")[0];
  const assignment = await buildOfficerAssignment({
    role: row.role,
    stateId: row.stateId,
    hqId: row.hqId,
    stationId: row.stationId,
  });

  const payload = {
    name: row.name,
    rank: row.level,
    role: row.role,
    level: row.level,
    email: row.email,
    username,
    password: PASSWORD,
    canLogin: true,
    status: "active" as const,
    ...assignment,
  };

  const existing = await Officer.findOne({ email: row.email });
  if (existing) {
    if (existing.role === "Super Admin") {
      console.log(`⏭️  Skipped ${row.email} (super admin email conflict)`);
      return existing;
    }
    Object.assign(existing, payload);
    await existing.save();
    return existing;
  }

  return Officer.create(payload);
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("✅ Connected to MongoDB\n");

  const states = await State.find({ isActive: { $ne: false } }).sort({ name: 1 }).lean();
  const hqs = await HQ.find({ isActive: { $ne: false } }).sort({ name: 1 }).lean();
  const stations = await Station.find({ isActive: { $ne: false } }).sort({ name: 1 }).lean();

  if (states.length === 0 || hqs.length === 0 || stations.length === 0) {
    throw new Error("Missing org data — seed areas, HQs, and stations first.");
  }

  const rows: SeedRow[] = [];

  for (const state of states) {
    const areaSlug = slugify(state.code || state.name);
    for (const level of LEVELS) {
      rows.push({
        email: `${areaSlug}-area-${level.toLowerCase()}@vitric.in`,
        name: `${state.name} Area ${level}`,
        role: "Area Officer",
        level,
        stateId: String(state._id),
      });
    }
  }

  for (const hq of hqs) {
    const hqSlug = slugify(hq.name);
    for (const level of LEVELS) {
      rows.push({
        email: `${hqSlug}-${level.toLowerCase()}@vitric.in`,
        name: `${hq.name} ${level}`,
        role: "Headquarter Officer",
        level,
        hqId: String(hq._id),
      });
    }
  }

  for (const station of stations) {
    const stSlug = slugify(station.name);
    for (const level of LEVELS) {
      rows.push({
        email: `${stSlug}-${level.toLowerCase()}@vitric.in`,
        name: `${station.name} ${level}`,
        role: "Station HQ Officer",
        level,
        stationId: String(station._id),
      });
    }
  }

  console.log(`📋 Seeding ${rows.length} officers (${states.length} areas, ${hqs.length} HQs, ${stations.length} stations)…\n`);

  for (const row of rows) {
    await upsertOfficer(row);
  }

  const superAdmin = await Officer.countDocuments({ role: "Super Admin" });
  const total = await Officer.countDocuments();

  console.log("═══════════════════════════════════════════════════════════════");
  console.log(" ORG OFFICERS SEEDED");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`\nSuper Admin preserved: ${superAdmin}`);
  console.log(`Total officers in DB: ${total}`);
  console.log(`Password (all seeded officers): ${PASSWORD}`);
  console.log("Login username = email prefix (e.g. mh-area-l1, nagpur-st-l1)\n");

  console.log("Sample L1 logins for escalation testing:");
  for (const row of rows.filter((r) => r.level === "L1").slice(0, 8)) {
    console.log(`  ${row.email.split("@")[0].padEnd(28)} → ${row.name}`);
  }
  if (rows.filter((r) => r.level === "L1").length > 8) {
    console.log("  …");
  }

  console.log("\nGrievance routing:");
  console.log("  New case → Station L1 at selected station");
  console.log("  SLA breach → HQ L1 under that station's HQ");
  console.log("  SLA breach at HQ → Area L1 for that station's area\n");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ seed:org-officers failed:", err);
  process.exit(1);
});
