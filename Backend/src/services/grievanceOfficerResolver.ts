import mongoose from "mongoose";
import Officer, { IOfficer } from "../models/Officer";
import Station from "../models/Station";
import { OfficerLevel } from "../constants/officerLevels";
import { OrgTier } from "../constants/orgTiers";

export interface StationOrgContext {
  stationId?: mongoose.Types.ObjectId;
  stationName: string;
  hqId?: mongoose.Types.ObjectId;
  hqName?: string;
  stateId?: mongoose.Types.ObjectId;
  stateName?: string;
}

export async function resolveStationOrg(stationName: string): Promise<StationOrgContext | null> {
  const trimmed = String(stationName || "").trim();
  if (!trimmed) return null;

  const station = await Station.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, "i") },
    isActive: { $ne: false },
  }).lean();

  if (!station) {
    return { stationName: trimmed };
  }

  return {
    stationId: station._id,
    stationName: station.name,
    hqId: station.hqId,
    hqName: station.hqName,
    stateId: station.state,
    stateName: station.stateName,
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Find officer at a specific org tier + level (no fallback to other tiers). */
export async function findOfficerAtOrgTier(
  tier: OrgTier,
  level: OfficerLevel,
  org: StationOrgContext
): Promise<IOfficer | null> {
  const base = { level, status: "active" as const, canLogin: true };

  if (tier === "station" && org.stationId) {
    return Officer.findOne({
      ...base,
      station: org.stationId,
      role: "Station HQ Officer",
    });
  }

  if (tier === "hq" && org.hqId) {
    return Officer.findOne({
      ...base,
      hqId: org.hqId,
      role: "Headquarter Officer",
      $or: [{ station: { $exists: false } }, { station: null }],
    });
  }

  if (tier === "area" && org.stateId) {
    return Officer.findOne({
      ...base,
      stateId: org.stateId,
      role: "Area Officer",
      $or: [{ hqId: { $exists: false } }, { hqId: null }],
    });
  }

  return null;
}

/** @deprecated Use findOfficerAtOrgTier — kept for legacy imports. */
export async function findOfficerForLevel(
  level: OfficerLevel,
  org: StationOrgContext
): Promise<IOfficer | null> {
  const tier = (org as any).__tier as OrgTier | undefined;
  if (tier) return findOfficerAtOrgTier(tier, level, org);
  return (
    (await findOfficerAtOrgTier("station", level, org)) ||
    (await findOfficerAtOrgTier("hq", level, org)) ||
    (await findOfficerAtOrgTier("area", level, org))
  );
}

/** New veteran grievance → Station HQ L1 only (no HQ/Area fallback). */
export async function assignStationL1ForGrievance(stationName: string) {
  const org = await resolveStationOrg(stationName);
  if (!org?.stationId) {
    return { org, officer: null };
  }
  const officer = await findOfficerAtOrgTier("station", "L1", org);
  return { org, officer };
}

export const assignL1OfficerForGrievance = assignStationL1ForGrievance;
