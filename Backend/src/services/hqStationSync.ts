import mongoose from "mongoose";
import HQ from "../models/HeadQuarter";
import Station from "../models/Station";

type Id = mongoose.Types.ObjectId | string;

/** Add or refresh one station entry on an HQ's stations list. */
export async function syncStationOnHQ(hqId: Id, stationId: Id, stationName: string): Promise<void> {
  await HQ.updateOne({ _id: hqId }, { $pull: { stations: { stationId } } });
  await HQ.updateOne(
    { _id: hqId },
    { $push: { stations: { stationId, stationName: stationName.trim() } } }
  );
}

/** Remove a station from an HQ's stations list. */
export async function removeStationFromHQ(
  hqId: Id | undefined | null,
  stationId: Id
): Promise<void> {
  if (!hqId) return;
  await HQ.updateOne({ _id: hqId }, { $pull: { stations: { stationId } } });
}

/** Rebuild stations[] on one HQ from active stations in DB. */
export async function rebuildHQStationsList(hqId: Id): Promise<void> {
  const stations = await Station.find({ hqId, isActive: true })
    .select("name")
    .sort({ name: 1 })
    .lean();

  await HQ.findByIdAndUpdate(hqId, {
    stations: stations.map((s) => ({ stationId: s._id, stationName: s.name })),
  });
}

/** Rebuild stations[] for every active HQ. */
export async function rebuildAllHQStationLists(): Promise<void> {
  const hqs = await HQ.find({ isActive: true }).select("_id").lean();
  for (const hq of hqs) {
    await rebuildHQStationsList(hq._id);
  }
}
