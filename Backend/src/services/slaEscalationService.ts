import mongoose from "mongoose";
import Grievance, { IGrievance } from "../models/Grievance";
import Escalation from "../models/Escalation";
import { OfficerLevel } from "../constants/officerLevels";
import {
  OrgTier,
  ORG_TIER_LABELS,
  nextOrgTier,
} from "../constants/orgTiers";
import {
  findOfficerAtOrgTier,
  resolveStationOrg,
  StationOrgContext,
} from "./grievanceOfficerResolver";
import { computeDeadlineForOrgTier, getSlaConfig } from "./slaConfigService";
import { notifyOfficer } from "./notificationService";

export type EscalationReasonType =
  | "no_response"
  | "concern_pending"
  | "sla_breach"
  | "manual_request"
  | "approved_request";

const REASON_LABELS: Record<EscalationReasonType, string> = {
  no_response: "No response — officer has not raised any concern",
  concern_pending: "Concern pending — veteran has not replied to officer concern",
  sla_breach: "SLA deadline exceeded without resolution",
  manual_request: "Manual escalation request",
  approved_request: "L1 approved escalation request from senior officer",
};

export function determineEscalationReasonType(grievance: IGrievance): EscalationReasonType {
  if (grievance.concernStatus === "awaiting_veteran") {
    return "concern_pending";
  }
  const hasOfficerConcern =
    grievance.timeline?.some((t) => t.eventType === "concern") ||
    grievance.comments?.some((c) => c.concernScope);
  if (!hasOfficerConcern && (grievance.concernStatus === "none" || !grievance.concernStatus)) {
    return "no_response";
  }
  return "sla_breach";
}

/** @deprecated SLA uses org tiers now — numeric L2/L3 escalation within station is not used for auto SLA. */
function nextLevel(current: OfficerLevel): OfficerLevel | null {
  if (current === "L1") return "L2";
  if (current === "L2") return "L3";
  return null;
}

export { nextLevel };

async function buildOrgFromGrievance(grievance: IGrievance): Promise<StationOrgContext> {
  if (grievance.stationId || grievance.hqId || grievance.stateId) {
    return {
      stationId: grievance.stationId,
      stationName: grievance.stationName,
      hqId: grievance.hqId,
      stateId: grievance.stateId,
    };
  }
  const org = await resolveStationOrg(grievance.stationName);
  return org || { stationName: grievance.stationName };
}

async function nextEscalationId(): Promise<string> {
  const count = await Escalation.countDocuments();
  return `ESC-${String(count + 1).padStart(3, "0")}`;
}

export interface AssignGrievanceOfficerOpts {
  reasonType: EscalationReasonType;
  escalatedBy?: string;
  note?: string;
  org?: StationOrgContext;
  orgTier: OrgTier;
  level: OfficerLevel;
  targetOfficer?: { _id: mongoose.Types.ObjectId; name: string } | null;
  approvalStatus?: "pending" | "approved" | "rejected" | "n/a";
  requestedByLevel?: OfficerLevel;
  requestedByOfficerId?: mongoose.Types.ObjectId;
  isAuto?: boolean;
}

/** Assign grievance to an officer at a specific org tier + level. */
export async function assignGrievanceOfficer(
  grievance: IGrievance,
  opts: AssignGrievanceOfficerOpts
): Promise<{ grievance: IGrievance; escalation: mongoose.Document | null }> {
  const org = opts.org || (await buildOrgFromGrievance(grievance));
  const officer =
    opts.targetOfficer ||
    (await findOfficerAtOrgTier(opts.orgTier, opts.level, org));

  const fromLevel = (grievance.assignedLevel || "L1") as OfficerLevel;
  const fromOrgTier = (grievance.assignedOrgTier || "station") as OrgTier;
  const fromOfficerId = grievance.officerId;
  const fromOfficerName = grievance.officerName || `${ORG_TIER_LABELS[fromOrgTier]} ${fromLevel}`;
  const reasonText = opts.note || REASON_LABELS[opts.reasonType];
  const daysOpen = Math.floor(
    (Date.now() - grievance.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  const config = await getSlaConfig();
  const tierDeadline = computeDeadlineForOrgTier(config, opts.orgTier, new Date());
  const toOfficerName =
    officer?.name || `${ORG_TIER_LABELS[opts.orgTier]} ${opts.level} (Unassigned)`;

  const escalation = await Escalation.create({
    escalationId: await nextEscalationId(),
    grievanceId: grievance._id,
    grievanceCode: grievance.grievanceId,
    veteranName: grievance.veteranName,
    type: grievance.type,
    stationName: grievance.stationName,
    reason: reasonText,
    escalatedTo: toOfficerName,
    escalatedBy: opts.escalatedBy || "System (Auto)",
    daysOpen,
    escalationReasonType: opts.reasonType,
    fromLevel,
    toLevel: opts.level,
    fromOrgTier,
    toOrgTier: opts.orgTier,
    fromOfficerId,
    fromOfficerName,
    approvalStatus: opts.approvalStatus || "n/a",
    requestedByLevel: opts.requestedByLevel,
    requestedByOfficerId: opts.requestedByOfficerId,
    officerId: officer?._id,
  });

  grievance.assignedOrgTier = opts.orgTier;
  grievance.assignedLevel = opts.level;
  grievance.officerId = officer?._id;
  grievance.officerName = toOfficerName;
  grievance.status = "escalated";
  grievance.escalationId = escalation._id as mongoose.Types.ObjectId;
  if (opts.orgTier === "area") {
    grievance.slaTierDeadline = undefined;
    grievance.slaDeadline = tierDeadline || undefined;
  } else if (tierDeadline) {
    grievance.slaTierDeadline = tierDeadline;
    grievance.slaDeadline = tierDeadline;
  }

  const actionVerb = opts.isAuto ? "Auto-escalated" : "Escalated";
  grievance.timeline.push({
    status: "escalated",
    note: `${actionVerb} from ${ORG_TIER_LABELS[fromOrgTier]} ${fromLevel} (${fromOfficerName}) → ${ORG_TIER_LABELS[opts.orgTier]} ${opts.level} (${toOfficerName}). ${fromOfficerName} will no longer act on this case. Reason: ${reasonText}`,
    updatedBy: opts.escalatedBy || "System (Auto)",
    updatedAt: new Date(),
    eventType: "escalation",
  });
  await grievance.save();

  if (officer?._id) {
    await notifyOfficer(officer._id, {
      title: opts.isAuto ? "Grievance auto-escalated to you" : "Grievance escalated to you",
      message: `${grievance.grievanceId} — ${reasonText}. Assigned to you at ${ORG_TIER_LABELS[opts.orgTier]} ${opts.level}.`,
      type: "escalation",
      grievanceId: grievance._id as mongoose.Types.ObjectId,
      grievanceCode: grievance.grievanceId,
      url: "/grievances",
    });
  }

  return { grievance, escalation };
}

/** Escalate up org hierarchy: Station L1 → HQ L1 → Area L1 (SLA path). */
export async function escalateGrievanceToOrgTier(
  grievance: IGrievance,
  targetTier: OrgTier,
  opts: Omit<AssignGrievanceOfficerOpts, "orgTier" | "level"> & { level?: OfficerLevel }
): Promise<{ grievance: IGrievance; escalation: mongoose.Document | null }> {
  return assignGrievanceOfficer(grievance, {
    ...opts,
    orgTier: targetTier,
    level: opts.level || "L1",
  });
}

/** @deprecated Use assignGrievanceOfficer — kept for L2/L3 takeover within same tier. */
export async function escalateGrievanceToLevel(
  grievance: IGrievance,
  targetLevel: OfficerLevel,
  opts: Omit<AssignGrievanceOfficerOpts, "orgTier" | "level"> & {
    org?: StationOrgContext;
    targetOfficer?: { _id: mongoose.Types.ObjectId; name: string } | null;
  }
): Promise<{ grievance: IGrievance; escalation: mongoose.Document | null }> {
  const orgTier = (grievance.assignedOrgTier || "station") as OrgTier;
  return assignGrievanceOfficer(grievance, {
    ...opts,
    orgTier,
    level: targetLevel,
  });
}

export async function runSlaEscalationCheck(): Promise<number> {
  const now = new Date();

  const candidates = await Grievance.find({
    isDeleted: false,
    status: { $in: ["pending", "in-progress", "escalated"] },
    slaTierDeadline: { $lte: now },
    assignedLevel: "L1",
    $or: [
      { assignedOrgTier: { $in: ["station", "hq"] } },
      { assignedOrgTier: { $exists: false } },
    ],
  });

  let escalated = 0;
  for (const grievance of candidates) {
    let current = grievance;
    let safety = 0;

    // Chain: Station → HQ → Area when deadlines are already breached (e.g. missing L2 SLA config)
    while (safety++ < 3) {
      const currentTier = (current.assignedOrgTier || "station") as OrgTier;
      const targetTier = nextOrgTier(currentTier);
      if (!targetTier) break;

      if (safety > 1) {
        const fresh = await Grievance.findById(current._id);
        if (!fresh?.slaTierDeadline || fresh.slaTierDeadline > now) break;
        current = fresh;
      }

      const reasonType = determineEscalationReasonType(current);
      const { grievance: updated } = await escalateGrievanceToOrgTier(current, targetTier, {
        reasonType,
        escalatedBy: "System (Auto SLA)",
        isAuto: true,
        level: "L1",
      });
      escalated += 1;

      const reloaded = await Grievance.findById(updated._id);
      if (!reloaded) break;
      current = reloaded;

      const newDeadline = current.slaTierDeadline;
      if (targetTier === "area") break;
      if (newDeadline && newDeadline > now) break;
    }
  }
  return escalated;
}

export { REASON_LABELS, nextOrgTier, ORG_TIER_LABELS };
