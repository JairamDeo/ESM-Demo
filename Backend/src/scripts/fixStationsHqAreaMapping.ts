/**
 * Fix station → HQ mapping when stations were created under the wrong HQ.
 *
 * Use-case: Gujarat stations mistakenly assigned to Maharashtra HQ (Kamptee).
 *
 * Run: npm run fix:stations-hq-mapping
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Station from "../models/Station";
import HQ from "../models/HeadQuarter";
import State from "../models/State";
import { removeStationFromHQ, syncStationOnHQ } from "../services/hqStationSync";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("✅ Connected to MongoDB");

  const gujarat = await State.findOne({ name: { $regex: "^Gujarat$", $options: "i" }, isActive: { $ne: false } }).lean();
  if (!gujarat) throw new Error("Gujarat state not found");

  const gujaratHqs = await HQ.find({ isActive: true, stateId: gujarat._id }).lean();
  if (gujaratHqs.length === 0) throw new Error("No HQ found for Gujarat");

  // If multiple Gujarat HQs exist, prefer the one with name containing 'Rajkot'
  const targetHq =
    gujaratHqs.find((h: any) => String(h.name || "").toLowerCase().includes("rajkot")) || gujaratHqs[0];

  console.log(`🎯 Target Gujarat HQ: ${targetHq.name} (${targetHq._id})`);

  const wrongStations = await Station.find({
    isActive: true,
    state: gujarat._id,
    hqId: { $ne: targetHq._id },
  }).select("_id name hqId hqName stateName").lean();

  if (wrongStations.length === 0) {
    console.log("✅ No stations require remapping.");
    return;
  }

  console.log(`🔎 Found ${wrongStations.length} station(s) to remap to Gujarat HQ.`);

  for (const s of wrongStations) {
    const oldHqId = s.hqId;
    console.log(`↪️  ${s.name}: ${s.hqName || oldHqId}  →  ${targetHq.name}`);

    // Update station document
    await Station.updateOne(
      { _id: s._id },
      { $set: { hqId: targetHq._id, hqName: targetHq.name } }
    );

    // Sync HQ station lists
    await removeStationFromHQ(oldHqId as any, s._id);
    await syncStationOnHQ(targetHq._id, s._id, s.name);
  }

  console.log("✅ Station → HQ mapping fixed.");
}

main()
  .catch((err) => {
    console.error("❌ Fix mapping failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

