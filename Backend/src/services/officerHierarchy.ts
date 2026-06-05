import mongoose from "mongoose";
import HQ from "../models/HeadQuarter";
import Station from "../models/Station";
import State from "../models/State";
import { CREATABLE_OFFICER_ROLES } from "../constants/officerHierarchy";
import { OfficerJobRole } from "../constants/officerRoles";
import { RbacRole } from "../constants/permissions";
import { OfficerAssignmentInput } from "./officerAssignment";

export interface ActorUser {
  id: string;
  name?: string;
  role: RbacRole | string;
  jobRole?: string;
  stateId?: string;
  hqId?: string;
  stationId?: string;
}

export function getCreatableRoles(actorRole: string): OfficerJobRole[] {
  return CREATABLE_OFFICER_ROLES[actorRole as RbacRole] ?? [];
}

export function assertCanCreateRole(actor: ActorUser, targetRole: OfficerJobRole): void {
  const allowed = getCreatableRoles(actor.role);
  if (!allowed.includes(targetRole)) {
    throw new Error(`You are not allowed to create ${targetRole}`);
  }
}

async function hqBelongsToArea(hqId: string, areaId: string): Promise<boolean> {
  const hq = await HQ.findOne({ _id: hqId, isActive: true });
  if (!hq) return false;
  if (hq.stateId) return hq.stateId.toString() === areaId;
  if (!hq.state) return false;
  const state = await State.findOne({
    name: { $regex: `^${hq.state.trim()}$`, $options: "i" },
    isActive: true,
  });
  return state?._id.toString() === areaId;
}

export async function assertAssignmentInActorScope(
  actor: ActorUser,
  targetRole: OfficerJobRole,
  input: OfficerAssignmentInput
): Promise<void> {
  if (actor.role === "super_admin") return;

  if (actor.role === "area") {
    if (!actor.stateId) throw new Error("Your area assignment is missing. Contact Super Admin.");
    const areaId = actor.stateId;

    if (targetRole === "Headquarter Officer") {
      if (!input.hqId) throw new Error("Headquarters is required");
      if (!(await hqBelongsToArea(input.hqId, areaId))) {
        throw new Error("Headquarters must belong to your area");
      }
    }

    if (targetRole === "Station HQ Officer") {
      if (!input.stationId) throw new Error("Station HQ is required");
      const station = await Station.findOne({ _id: input.stationId, isActive: true });
      if (!station?.state || station.state.toString() !== areaId) {
        throw new Error("Station HQ must belong to your area");
      }
    }
    return;
  }

  if (actor.role === "headquarter") {
    if (!actor.hqId) throw new Error("Your headquarters assignment is missing. Contact Area Officer.");
    if (targetRole !== "Station HQ Officer") {
      throw new Error("You can only create Station HQ Officers");
    }
    if (!input.stationId) throw new Error("Station HQ is required");
    const station = await Station.findOne({ _id: input.stationId, isActive: true });
    if (!station?.hqId || station.hqId.toString() !== actor.hqId) {
      throw new Error("Station HQ must belong to your headquarters");
    }
    return;
  }

  throw new Error("You do not have permission to create officers");
}

/** Scope filter for listing officers below the actor in hierarchy. */
export function officerScopeQuery(actor: ActorUser): Record<string, unknown> {
  if (actor.role === "super_admin") return {};
  if (actor.role === "area" && actor.stateId) {
    return { stateId: new mongoose.Types.ObjectId(actor.stateId) };
  }
  if (actor.role === "headquarter" && actor.hqId) {
    return { hqId: new mongoose.Types.ObjectId(actor.hqId) };
  }
  if (actor.role === "station_hq" && actor.stationId) {
    return { station: new mongoose.Types.ObjectId(actor.stationId) };
  }
  return {};
}

export function hqListQuery(actor: ActorUser): Record<string, unknown> {
  const base = { isActive: true };
  if (actor.role === "super_admin") return base;
  if (actor.role === "area" && actor.stateId) {
    return { ...base, stateId: new mongoose.Types.ObjectId(actor.stateId) };
  }
  if (actor.role === "headquarter" && actor.hqId) {
    return { ...base, _id: new mongoose.Types.ObjectId(actor.hqId) };
  }
  return base;
}

export function stateListQuery(actor: ActorUser): Record<string, unknown> {
  const base = { isActive: true };
  if (actor.role === "area" && actor.stateId) {
    return { ...base, _id: new mongoose.Types.ObjectId(actor.stateId) };
  }
  return base;
}

export async function resolveAreaForHQCreate(
  actor: ActorUser,
  stateId?: string
): Promise<{ stateId: mongoose.Types.ObjectId; stateName: string; stateCode: string }> {
  if (actor.role === "area") {
    if (!actor.stateId) throw new Error("Your area is not configured");
    const state = await State.findById(actor.stateId);
    if (!state?.isActive) throw new Error("Invalid area");
    return { stateId: state._id, stateName: state.name, stateCode: state.code };
  }
  if (!stateId) throw new Error("Area (stateId) is required");
  const state = await State.findById(stateId);
  if (!state?.isActive) throw new Error("Invalid area selected");
  return { stateId: state._id, stateName: state.name, stateCode: state.code };
}
