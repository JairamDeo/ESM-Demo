import mongoose from "mongoose";
import {
  SlaConfigPayload,
  SlaConfigSnapshot,
  SlaMode,
} from "../models/SlaConfig";
import { RequestActor } from "./auditService";
import { formatSlaDuration } from "./slaConfigService";

function tierLabel(h?: number | null, m?: number | null): string {
  return formatSlaDuration(h, m);
}

export function snapshotFromPayload(payload: SlaConfigPayload): SlaConfigSnapshot {
  if (payload.mode === "separate") {
    return {
      mode: "separate",
      l1Hours: payload.l1Hours ?? 0,
      l1Minutes: payload.l1Minutes ?? 0,
      l2Hours: payload.l2Hours ?? 0,
      l2Minutes: payload.l2Minutes ?? 0,
      l3Hours: payload.l3Hours ?? 0,
      l3Minutes: payload.l3Minutes ?? 0,
    };
  }
  return {
    mode: "common",
    hours: payload.hours ?? 0,
    minutes: payload.minutes ?? 0,
  };
}

export function snapshotFromDoc(doc: Record<string, unknown> | null): SlaConfigSnapshot | null {
  if (!doc) return null;
  const mode: SlaMode = doc.mode === "separate" ? "separate" : "common";
  if (mode === "separate") {
    return {
      mode: "separate",
      l1Hours: (doc.l1Hours as number) ?? 0,
      l1Minutes: (doc.l1Minutes as number) ?? 0,
      l2Hours: (doc.l2Hours as number) ?? 0,
      l2Minutes: (doc.l2Minutes as number) ?? 0,
      l3Hours: (doc.l3Hours as number) ?? 0,
      l3Minutes: (doc.l3Minutes as number) ?? 0,
    };
  }
  return {
    mode: "common",
    hours: (doc.hours as number) ?? 0,
    minutes: (doc.minutes as number) ?? 0,
  };
}

export function describeSlaSnapshot(snapshot: SlaConfigSnapshot): string {
  if (snapshot.mode === "separate") {
    return `Separate · L1 ${tierLabel(snapshot.l1Hours, snapshot.l1Minutes)}, L2 ${tierLabel(snapshot.l2Hours, snapshot.l2Minutes)}, L3 ${tierLabel(snapshot.l3Hours, snapshot.l3Minutes)}`;
  }
  return `Common · ${tierLabel(snapshot.hours, snapshot.minutes)}`;
}

export function buildSlaChangeNote(
  previous: SlaConfigSnapshot | null | undefined,
  next: SlaConfigSnapshot
): string {
  const nextDesc = describeSlaSnapshot(next);
  if (!previous) return `Initial SLA set: ${nextDesc}`;
  const prevDesc = describeSlaSnapshot(previous);
  if (prevDesc === nextDesc) return `SLA saved (unchanged): ${nextDesc}`;
  return `Changed from ${prevDesc} to ${nextDesc}`;
}

export function buildSlaEditor(user: RequestActor) {
  return {
    officerId: new mongoose.Types.ObjectId(user.id),
    name: user.name || "Officer",
    email: user.email,
    role: user.jobRole || user.role,
    rbacRole: user.role,
  };
}

export function buildSlaChangeEntry(
  user: RequestActor,
  previous: SlaConfigSnapshot | null | undefined,
  next: SlaConfigSnapshot
) {
  return {
    action: previous ? ("update" as const) : ("create" as const),
    previous: previous || undefined,
    next,
    changedBy: buildSlaEditor(user),
    at: new Date(),
    note: buildSlaChangeNote(previous, next),
  };
}
