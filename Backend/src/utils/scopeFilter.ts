import mongoose from "mongoose";
import Station from "../models/Station";

export interface ScopeUser {
  role: string;
  station?: string;
  stateId?: string;
  hqId?: string;
  stationId?: string;
  stationName?: string;
}

/** Filter officers collection by logged-in officer scope. */
export function getOfficerListFilter(user?: ScopeUser | null): Record<string, unknown> {
  if (!user || user.role === "super_admin") return {};
  if (user.role === "area" && user.stateId) {
    return { stateId: new mongoose.Types.ObjectId(user.stateId) };
  }
  if (user.role === "headquarter" && user.hqId) {
    return { hqId: new mongoose.Types.ObjectId(user.hqId) };
  }
  if (user.role === "station_hq" && user.stationId) {
    return { station: new mongoose.Types.ObjectId(user.stationId) };
  }
  if (user.station) {
    return { stationName: { $regex: user.station.replace(" Station HQ", ""), $options: "i" } };
  }
  return {};
}

/** Filter stations collection by scope. */
export function getStationListFilter(user?: ScopeUser | null): Record<string, unknown> {
  if (!user || user.role === "super_admin") return {};
  if (user.role === "area" && user.stateId) {
    return { state: new mongoose.Types.ObjectId(user.stateId) };
  }
  if (user.role === "headquarter" && user.hqId) {
    return { hqId: new mongoose.Types.ObjectId(user.hqId) };
  }
  if (user.role === "station_hq" && user.stationId) {
    return { _id: new mongoose.Types.ObjectId(user.stationId) };
  }
  if (user.station) {
    return { name: { $regex: user.station.replace(" Station HQ", ""), $options: "i" } };
  }
  return {};
}

/** Grievances / QR / escalations use cached stationName — resolve allowed station names. */
export async function getGrievanceScopeFilter(user?: ScopeUser | null): Promise<Record<string, unknown>> {
  if (!user || user.role === "super_admin") return {};
  if (user.role === "station_hq") {
    if (user.stationName) return { stationName: user.stationName };
    if (user.stationId) {
      const s = await Station.findById(user.stationId).select("name");
      if (s) return { stationName: s.name };
    }
  }
  if (user.role === "area" && user.stateId) {
    const names = await Station.find({ state: user.stateId, isActive: true }).distinct("name");
    return names.length ? { stationName: { $in: names } } : { stationName: "__none__" };
  }
  if (user.role === "headquarter" && user.hqId) {
    const names = await Station.find({ hqId: user.hqId, isActive: true }).distinct("name");
    return names.length ? { stationName: { $in: names } } : { stationName: "__none__" };
  }
  if (user.station) {
    return { stationName: { $regex: user.station.replace(" Station HQ", ""), $options: "i" } };
  }
  return {};
}
