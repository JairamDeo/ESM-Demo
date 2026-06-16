/**
 * Fix station → HQ mapping when a station's area does not match its HQ's area.
 *
 * Hierarchy: Area (state) → HQ → Station HQ
 *
 * Run: npm run fix:stations-hq-mapping
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Station from "../models/Station";
import HQ from "../models/HeadQuarter";
import { removeStationFromHQ, syncStationOnHQ, rebuildAllHQStationLists } from "../services/hqStationSync";

async function pickHqForState(stateId: mongoose.Types.ObjectId, hqsInState: any[]): Promise<any> {
  if (hqsInState.length === 1) return hqsInState[0];
  // Prefer HQ whose name contains the state's primary city when multiple exist
  const preferred = hqsInState.find((h) => {
    const city = String(h.city || "").toLowerCase();
    const name = String(h.name || "").toLowerCase();
    return city && name.includes(city);
  });
  return preferred || hqsInState[0];
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("✅ Connected to MongoDB");

  const activeStations = await Station.find({ isActive: { $ne: false } })
    .select("_id name hqId hqName state stateName")
    .lean();

  const hqById = new Map(
    (await HQ.find({ isActive: { $ne: false } }).lean()).map((h) => [String(h._id), h])
  );

  const hqsByState = new Map<string, any[]>();
  for (const hq of hqById.values()) {
    const key = String(hq.stateId);
    if (!hqsByState.has(key)) hqsByState.set(key, []);
    hqsByState.get(key)!.push(hq);
  }

  let remapped = 0;

  for (const station of activeStations) {
    const stationStateId = String(station.state);
    const currentHq = station.hqId ? hqById.get(String(station.hqId)) : null;

    if (currentHq && String(currentHq.stateId) === stationStateId) {
      continue;
    }

    const candidates = hqsByState.get(stationStateId) || [];
    if (candidates.length === 0) {
      console.warn(`⚠️  No HQ for area ${station.stateName || stationStateId}; skipping ${station.name}`);
      continue;
    }

    const targetHq = await pickHqForState(station.state as mongoose.Types.ObjectId, candidates);
    const oldHqId = station.hqId;

    console.log(
      `↪️  ${station.name}: ${station.hqName || oldHqId || "none"} → ${targetHq.name} (${station.stateName || stationStateId})`
    );

    await Station.updateOne(
      { _id: station._id },
      { $set: { hqId: targetHq._id, hqName: targetHq.name } }
    );

    if (oldHqId) {
      await removeStationFromHQ(oldHqId as any, station._id);
    }
    await syncStationOnHQ(targetHq._id, station._id, station.name);
    remapped++;
  }

  await rebuildAllHQStationLists();

  if (remapped === 0) {
    console.log("✅ All stations already mapped to an HQ in their area.");
  } else {
    console.log(`✅ Remapped ${remapped} station(s) and rebuilt HQ station lists.`);
  }
}

main()
  .catch((err) => {
    console.error("❌ Fix mapping failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
