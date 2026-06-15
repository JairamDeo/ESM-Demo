/**
 * Seed test hierarchy for grievance routing / escalation QA.
 * Run: npm run seed:test-hierarchy
 *
 * Does NOT wipe existing data — upserts Test Area / HQ / Station HQ org + officers.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import State from "../models/State";
import HQ from "../models/HeadQuarter";
import Station from "../models/Station";
import Officer from "../models/Officer";
import { rbacRoleFromJobRole } from "../constants/officerRoles";
import { OfficerLevel } from "../constants/officerLevels";
import { rebuildHQStationsList } from "../services/hqStationSync";

const PASSWORD = "Jairam@123";

type SeedOfficer = {
  email: string;
  name: string;
  role: "Area Officer" | "Headquarter Officer" | "Station HQ Officer";
  level: OfficerLevel;
  stateId?: mongoose.Types.ObjectId;
  hqId?: mongoose.Types.ObjectId;
  stationId?: mongoose.Types.ObjectId;
};

async function upsertOfficer(row: SeedOfficer) {
  const username = row.email.split("@")[0];
  const existing = await Officer.findOne({ email: row.email });
  const payload = {
    name: row.name,
    rank: row.level,
    role: row.role,
    rbacRole: rbacRoleFromJobRole(row.role),
    level: row.level,
    email: row.email,
    username,
    password: PASSWORD,
    canLogin: true,
    status: "active" as const,
    stateId: row.stateId,
    hqId: row.hqId,
    station: row.stationId,
    stationName: row.stationId ? undefined : undefined,
  };

  if (existing) {
    existing.name = payload.name;
    existing.username = username;
    existing.level = payload.level;
    existing.role = payload.role;
    existing.rbacRole = payload.rbacRole;
    existing.canLogin = true;
    existing.status = "active";
    existing.stateId = row.stateId;
    existing.hqId = row.hqId;
    existing.station = row.stationId;
    existing.password = PASSWORD;
    await existing.save();
    return existing;
  }

  return Officer.create(payload);
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("✅ Connected to MongoDB\n");

  const area1 =
    (await State.findOne({ name: "Test Area 1" })) ||
    (await State.create({ name: "Test Area 1", code: "TA1", isActive: true }));

  const area2 =
    (await State.findOne({ name: "Test Area 2" })) ||
    (await State.create({ name: "Test Area 2", code: "TA2", isActive: true }));

  const hq1 =
    (await HQ.findOne({ name: "Test HQ 1" })) ||
    (await HQ.create({
      name: "Test HQ 1",
      city: "Test City HQ1",
      state: area1.name,
      stateId: area1._id,
      stateName: area1.name,
      stateCode: area1.code,
      isActive: true,
    }));

  const hq2 =
    (await HQ.findOne({ name: "Test HQ 2" })) ||
    (await HQ.create({
      name: "Test HQ 2",
      city: "Test City HQ2",
      state: area1.name,
      stateId: area1._id,
      stateName: area1.name,
      stateCode: area1.code,
      isActive: true,
    }));

  const hq3 =
    (await HQ.findOne({ name: "Test HQ 3" })) ||
    (await HQ.create({
      name: "Test HQ 3",
      city: "Test City HQ3",
      state: area2.name,
      stateId: area2._id,
      stateName: area2.name,
      stateCode: area2.code,
      isActive: true,
    }));

  const st1 =
    (await Station.findOne({ name: "Test Station HQ 1" })) ||
    (await Station.create({
      name: "Test Station HQ 1",
      city: "Test City 1",
      state: area1._id,
      stateName: area1.name,
      stateCode: area1.code,
      hqId: hq1._id,
      hqName: hq1.name,
      isActive: true,
    }));

  const st2 =
    (await Station.findOne({ name: "Test Station HQ 2" })) ||
    (await Station.create({
      name: "Test Station HQ 2",
      city: "Test City 2",
      state: area1._id,
      stateName: area1.name,
      stateCode: area1.code,
      hqId: hq2._id,
      hqName: hq2.name,
      isActive: true,
    }));

  const st3 =
    (await Station.findOne({ name: "Test Station HQ 3" })) ||
    (await Station.create({
      name: "Test Station HQ 3",
      city: "Test City 3",
      state: area2._id,
      stateName: area2.name,
      stateCode: area2.code,
      hqId: hq3._id,
      hqName: hq3.name,
      isActive: true,
    }));

  await rebuildHQStationsList(hq1._id);
  await rebuildHQStationsList(hq2._id);
  await rebuildHQStationsList(hq3._id);

  const officers: SeedOfficer[] = [];

  for (const level of ["L1", "L2", "L3"] as OfficerLevel[]) {
    officers.push({
      email: `test-a1-${level.toLowerCase()}@esm.in`,
      name: `Test Area 1 ${level}`,
      role: "Area Officer",
      level,
      stateId: area1._id,
    });
    officers.push({
      email: `test-a2-${level.toLowerCase()}@esm.in`,
      name: `Test Area 2 ${level}`,
      role: "Area Officer",
      level,
      stateId: area2._id,
    });
    officers.push({
      email: `test-hq1-${level.toLowerCase()}@esm.in`,
      name: `Test HQ 1 ${level}`,
      role: "Headquarter Officer",
      level,
      stateId: area1._id,
      hqId: hq1._id,
    });
    officers.push({
      email: `test-hq2-${level.toLowerCase()}@esm.in`,
      name: `Test HQ 2 ${level}`,
      role: "Headquarter Officer",
      level,
      stateId: area1._id,
      hqId: hq2._id,
    });
    officers.push({
      email: `test-hq3-${level.toLowerCase()}@esm.in`,
      name: `Test HQ 3 ${level}`,
      role: "Headquarter Officer",
      level,
      stateId: area2._id,
      hqId: hq3._id,
    });
    officers.push({
      email: `test-st1-${level.toLowerCase()}@esm.in`,
      name: `Test Station HQ 1 ${level}`,
      role: "Station HQ Officer",
      level,
      stateId: area1._id,
      hqId: hq1._id,
      stationId: st1._id,
    });
    officers.push({
      email: `test-st2-${level.toLowerCase()}@esm.in`,
      name: `Test Station HQ 2 ${level}`,
      role: "Station HQ Officer",
      level,
      stateId: area1._id,
      hqId: hq2._id,
      stationId: st2._id,
    });
    officers.push({
      email: `test-st3-${level.toLowerCase()}@esm.in`,
      name: `Test Station HQ 3 ${level}`,
      role: "Station HQ Officer",
      level,
      stateId: area2._id,
      hqId: hq3._id,
      stationId: st3._id,
    });
  }

  for (const row of officers) {
    await upsertOfficer(row);
  }

  console.log("═══════════════════════════════════════════════════════════════");
  console.log(" TEST HIERARCHY SEEDED");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\nOrganization:");
  console.log("  Test Area 1 → Test HQ 1 → Test Station HQ 1");
  console.log("  Test Area 1 → Test HQ 2 → Test Station HQ 2");
  console.log("  Test Area 2 → Test HQ 3 → Test Station HQ 3");
  console.log("\nAll officers: password = Jairam@123");
  console.log("Login username = email prefix (e.g. test-st1-l1)\n");
  console.log("| Email                  | Level | Role              | Assignment        |");
  console.log("|------------------------|-------|-------------------|-------------------|");

  for (const row of officers) {
    let assign = "Test Area 1";
    if (row.email.includes("a2")) assign = "Test Area 2";
    if (row.email.includes("hq1")) assign = "Test HQ 1 / Area 1";
    if (row.email.includes("hq2")) assign = "Test HQ 2 / Area 1";
    if (row.email.includes("hq3")) assign = "Test HQ 3 / Area 2";
    if (row.email.includes("st1")) assign = "Test Station HQ 1 → HQ1 → Area1";
    if (row.email.includes("st2")) assign = "Test Station HQ 2 → HQ2 → Area1";
    if (row.email.includes("st3")) assign = "Test Station HQ 3 → HQ3 → Area2";
    console.log(
      `| ${row.email.padEnd(22)} | ${row.level.padEnd(5)} | ${row.role.padEnd(17)} | ${assign.padEnd(17)} |`
    );
  }

  console.log("\nGrievance flow:");
  console.log("  1. Veteran selects Test Station HQ 1 → assigned to test-st1-l1@esm.in only");
  console.log("  2. SLA breach → escalates to test-hq1-l1@esm.in (HQ L1, not station L2/L3)");
  console.log("  3. SLA breach at HQ → escalates to test-a1-l1@esm.in (Area L1)");
  console.log("  4. Station L2/L3 can request escalate → auto to HQ L1");
  console.log("  5. HQ/Area officers can VIEW but only assigned officer can ACT\n");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
