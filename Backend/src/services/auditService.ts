import mongoose from "mongoose";
import { AuditAction, IAuditEntry, IRbacChangeEntry } from "../models/AuditLog";

export interface RequestActor {
  id: string;
  name?: string;
  email?: string;
  role: string;
  jobRole?: string;
}

export function buildAuditEntry(
  user: RequestActor,
  action: AuditAction,
  extra?: Partial<Pick<IAuditEntry, "note">>
): IAuditEntry {
  return {
    action,
    officerId: new mongoose.Types.ObjectId(user.id),
    name: user.name || "Officer",
    email: user.email,
    role: user.jobRole || user.role,
    rbacRole: user.role,
    at: new Date(),
    ...extra,
  };
}

export function buildRbacChangeEntry(
  user: RequestActor,
  action: IRbacChangeEntry["action"],
  fields: Partial<Pick<IRbacChangeEntry, "permission" | "previousValue" | "newValue" | "note">>
): IRbacChangeEntry {
  return {
    action,
    ...fields,
    changedBy: {
      officerId: new mongoose.Types.ObjectId(user.id),
      name: user.name || "Officer",
      email: user.email,
      role: user.jobRole || user.role,
      rbacRole: user.role,
    },
    at: new Date(),
  };
}

/** Latest creator from audit history (for list views). */
export function creatorFromHistory(history?: IAuditEntry[]): IAuditEntry | undefined {
  if (!history?.length) return undefined;
  return history.find((e) => e.action === "create") ?? history[0];
}
