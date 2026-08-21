import mongoose from "mongoose";
import Officer from "../models/Officer";
import Station from "../models/Station";
import HQ from "../models/HeadQuarter";
import State from "../models/State";

type Id = mongoose.Types.ObjectId | string;

function asId(value: unknown): Id | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "_id" in value) {
    return (value as { _id: Id })._id;
  }
  return value as Id;
}

function mappingEntry(officer: {
  _id: Id;
  role: string;
  level?: string;
}) {
  return {
    officerId: officer._id,
    role: officer.role,
    ...(officer.level ? { level: officer.level } : {}),
  };
}

export async function removeOfficerFromAllOrgs(officerId: Id): Promise<void> {
  const pull = { $pull: { officers: { officerId } } };
  await Promise.all([
    Station.updateMany({ "officers.officerId": officerId }, pull),
    HQ.updateMany({ "officers.officerId": officerId }, pull),
    State.updateMany({ "officers.officerId": officerId }, pull),
  ]);
}

export async function refreshStationOfficerCount(stationId?: Id | null): Promise<void> {
  if (!stationId) return;
  const officerCount = await Officer.countDocuments({
    station: stationId,
    role: "Station HQ Officer",
    status: "active",
  });
  await Station.updateOne({ _id: stationId }, { officerCount });
}

/** Place officer ObjectId on the matching Station / HQ / Area array. */
export async function applyOfficerOrgMapping(officer: {
  _id: Id;
  role: string;
  level?: string;
  station?: Id | null;
  hqId?: Id | null;
  stateId?: Id | null;
}): Promise<void> {
  await removeOfficerFromAllOrgs(officer._id);
  const entry = mappingEntry(officer);

  const stationId = asId(officer.station);
  const hqId = asId(officer.hqId);
  const stateId = asId(officer.stateId);

  if (officer.role === "Station HQ Officer" && stationId) {
    await Station.updateOne({ _id: stationId }, { $push: { officers: entry } });
    await refreshStationOfficerCount(stationId);
    return;
  }

  if (officer.role === "Headquarter Officer" && hqId) {
    await HQ.updateOne({ _id: hqId }, { $push: { officers: entry } });
    return;
  }

  if (officer.role === "Area Officer" && stateId) {
    await State.updateOne({ _id: stateId }, { $push: { officers: entry } });
  }
}

/** Rebuild officers[] on every Station, HQ, and Area from the Officer collection. */
export async function rebuildAllOfficerOrgMappings(): Promise<{
  stations: number;
  hqs: number;
  areas: number;
}> {
  const officers = await Officer.find({})
    .select("_id role level station hqId stateId status")
    .lean();

  const byStation = new Map<string, typeof officers>();
  const byHq = new Map<string, typeof officers>();
  const byArea = new Map<string, typeof officers>();

  for (const o of officers) {
    if (o.role === "Station HQ Officer" && o.station) {
      const key = String(o.station);
      if (!byStation.has(key)) byStation.set(key, []);
      byStation.get(key)!.push(o);
    } else if (o.role === "Headquarter Officer" && o.hqId) {
      const key = String(o.hqId);
      if (!byHq.has(key)) byHq.set(key, []);
      byHq.get(key)!.push(o);
    } else if (o.role === "Area Officer" && o.stateId) {
      const key = String(o.stateId);
      if (!byArea.has(key)) byArea.set(key, []);
      byArea.get(key)!.push(o);
    }
  }

  const stations = await Station.find({}).select("_id").lean();
  for (const s of stations) {
    const list = byStation.get(String(s._id)) || [];
    const mapped = list.map((o) => mappingEntry(o));
    const officerCount = list.filter((o) => o.status === "active").length;
    await Station.updateOne({ _id: s._id }, { officers: mapped, officerCount });
  }

  const hqs = await HQ.find({}).select("_id").lean();
  for (const h of hqs) {
    const list = byHq.get(String(h._id)) || [];
    await HQ.updateOne({ _id: h._id }, { officers: list.map((o) => mappingEntry(o)) });
  }

  const areas = await State.find({}).select("_id").lean();
  for (const a of areas) {
    const list = byArea.get(String(a._id)) || [];
    await State.updateOne({ _id: a._id }, { officers: list.map((o) => mappingEntry(o)) });
  }

  return { stations: stations.length, hqs: hqs.length, areas: areas.length };
}
