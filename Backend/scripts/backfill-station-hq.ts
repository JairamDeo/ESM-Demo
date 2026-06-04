/**
 * One-time: link existing stations to headquarters and rebuild HQ.stations[].
 * Run: npx ts-node scripts/backfill-station-hq.ts
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Station from "../src/models/Station";
import HQ from "../src/models/HeadQuarter";
import { rebuildAllHQStationLists } from "../src/services/hqStationSync";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const hq = await HQ.findOne({ isActive: true }).sort({ createdAt: 1 });
  if (!hq) {
    console.error("No active HQ found. Create a headquarters first.");
    process.exit(1);
  }

  const linkResult = await Station.updateMany(
    { $or: [{ hqId: { $exists: false } }, { hqId: null }] },
    { $set: { hqId: hq._id, hqName: hq.name } }
  );
  console.log(`Linked ${linkResult.modifiedCount} station(s) to HQ: ${hq.name}`);

  await rebuildAllHQStationLists();
  const updated = await HQ.findById(hq._id).lean();
  console.log(`HQ "${updated?.name}" now has ${updated?.stations?.length ?? 0} station(s) in stations[]`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
