/**
 * Link existing HQs to areas (stateId). Run: npx ts-node src/scripts/backfill-hq-area.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import HQ from "../models/HeadQuarter";
import State from "../models/State";

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const hqs = await HQ.find({ $or: [{ stateId: { $exists: false } }, { stateId: null }] });
  for (const hq of hqs) {
    const state = await State.findOne({
      name: { $regex: `^${(hq.state || "").trim()}$`, $options: "i" },
      isActive: true,
    });
    if (state) {
      await HQ.findByIdAndUpdate(hq._id, {
        stateId: state._id,
        stateName: state.name,
        stateCode: state.code,
      });
      console.log(`Linked HQ "${hq.name}" → ${state.name}`);
    }
  }
  console.log("Done");
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
