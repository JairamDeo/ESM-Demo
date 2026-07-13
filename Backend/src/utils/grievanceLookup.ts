import mongoose from "mongoose";
import Grievance, { IGrievance } from "../models/Grievance";

/** Resolve a grievance by MongoDB _id or human-readable grievanceId (e.g. GRV-2026-1234). */
export async function findGrievanceByParamId(
  id: string | string[],
  opts?: { includeDeleted?: boolean }
): Promise<IGrievance | null> {
  const raw = String(Array.isArray(id) ? id[0] : id || "").trim();
  if (!raw) return null;

  const or: Record<string, unknown>[] = [{ grievanceId: raw.toUpperCase() }];
  if (mongoose.isValidObjectId(raw)) {
    or.unshift({ _id: raw });
  }

  const filter: Record<string, unknown> = { $or: or };
  if (!opts?.includeDeleted) {
    filter.isDeleted = false;
  }

  return Grievance.findOne(filter);
}
