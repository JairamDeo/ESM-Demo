import mongoose from "mongoose";
import State from "../models/State";
import HQ from "../models/HeadQuarter";
import Station from "../models/Station";
import { rbacRoleFromJobRole } from "../constants/officerRoles";
import { RbacRole } from "../constants/permissions";

export interface OfficerAssignmentInput {
  role: string;
  stateId?: string;
  hqId?: string;
  stationId?: string;
}

export interface OfficerAssignmentFields {
  rbacRole: RbacRole;
  stateId?: mongoose.Types.ObjectId;
  stateName?: string;
  stateCode?: string;
  hqId?: mongoose.Types.ObjectId;
  hqName?: string;
  station?: mongoose.Types.ObjectId;
  stationName?: string;
}

export async function buildOfficerAssignment(
  input: OfficerAssignmentInput
): Promise<OfficerAssignmentFields> {
  const rbacRole = rbacRoleFromJobRole(input.role);

  if (input.role === "Super Admin") {
    return { rbacRole };
  }

  if (input.role === "Area Officer") {
    if (!input.stateId) throw new Error("Area / State is required for Area Officer");
    const stateDoc = await State.findById(input.stateId);
    if (!stateDoc?.isActive) throw new Error("Invalid area / state selected");
    return {
      rbacRole,
      stateId: stateDoc._id,
      stateName: stateDoc.name,
      stateCode: stateDoc.code,
    };
  }

  if (input.role === "Headquarter Officer") {
    if (!input.hqId) throw new Error("Headquarters is required for Headquarter Officer");
    const hqDoc = await HQ.findById(input.hqId);
    if (!hqDoc?.isActive) throw new Error("Invalid headquarters selected");
    return {
      rbacRole,
      hqId: hqDoc._id,
      hqName: hqDoc.name,
    };
  }

  if (input.role === "Station HQ Officer") {
    if (!input.stationId) throw new Error("Station HQ is required for Station HQ Officer");
    const stationDoc = await Station.findOne({ _id: input.stationId, isActive: true });
    if (!stationDoc) throw new Error("Invalid station selected");
    return {
      rbacRole,
      station: stationDoc._id,
      stationName: stationDoc.name,
      hqId: stationDoc.hqId,
      hqName: stationDoc.hqName,
      stateId: stationDoc.state as mongoose.Types.ObjectId,
      stateName: stationDoc.stateName,
      stateCode: stationDoc.stateCode,
    };
  }

  throw new Error("Invalid officer role");
}

/** Label stored on JWT for legacy station-scoped filters. */
export function loginScopeLabel(fields: OfficerAssignmentFields): string | undefined {
  if (fields.rbacRole === "super_admin") return undefined;
  if (fields.rbacRole === "area") return fields.stateName;
  if (fields.rbacRole === "headquarter") return fields.hqName;
  return fields.stationName;
}
