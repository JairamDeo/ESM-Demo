import SlaConfig, {
  addMinutesToDate,
  tierToTotalMinutes,
  SlaConfigPayload,
  SlaCaseTypeOverridePayload,
  SlaMode,
} from "../models/SlaConfig";
import mongoose from "mongoose";
import { OfficerLevel } from "../constants/officerLevels";

const EMPTY: SlaConfigPayload = {
  mode: "common",
  hours: null,
  minutes: null,
  l1Hours: null,
  l1Minutes: null,
  l2Hours: null,
  l2Minutes: null,
  l3Hours: null,
  l3Minutes: null,
};

function normalizeConfig(doc: Record<string, unknown> | null): SlaConfigPayload {
  if (!doc) return { ...EMPTY };

  const mode: SlaMode = doc.mode === "separate" ? "separate" : "common";

  return {
    mode,
    hours: (doc.hours as number | undefined) ?? null,
    minutes: (doc.minutes as number | undefined) ?? null,
    l1Hours: (doc.l1Hours as number | undefined) ?? null,
    l1Minutes: (doc.l1Minutes as number | undefined) ?? null,
    l2Hours: (doc.l2Hours as number | undefined) ?? null,
    l2Minutes: (doc.l2Minutes as number | undefined) ?? null,
    l3Hours: (doc.l3Hours as number | undefined) ?? null,
    l3Minutes: (doc.l3Minutes as number | undefined) ?? null,
  };
}

function normalizeCaseTypeOverrides(doc: Record<string, unknown> | null): SlaCaseTypeOverridePayload[] {
  const rows = (doc?.caseTypeOverrides as Record<string, unknown>[] | undefined) || [];
  return rows.map((row) => ({
    caseTypeId: String(row.caseTypeId),
    caseTypeName: (row.caseTypeName as string) || undefined,
    enabled: Boolean(row.enabled),
    ...normalizeConfig(row),
  }));
}

export async function getSlaConfig(): Promise<SlaConfigPayload> {
  const doc = await SlaConfig.findOne().sort({ updatedAt: -1 }).lean();
  return normalizeConfig(doc as Record<string, unknown> | null);
}

/** Resolve SLA config for a grievance — uses case-type override when enabled. */
export async function getSlaConfigForCaseType(
  caseTypeId?: mongoose.Types.ObjectId | string | null
): Promise<SlaConfigPayload> {
  const doc = await SlaConfig.findOne().sort({ updatedAt: -1 }).lean();
  const global = normalizeConfig(doc as Record<string, unknown> | null);
  if (!caseTypeId || !doc) return global;

  const idStr = String(caseTypeId);
  const overrides = (doc as any).caseTypeOverrides as Record<string, unknown>[] | undefined;
  const match = overrides?.find((o) => o.enabled && String(o.caseTypeId) === idStr);
  if (!match) return global;
  return normalizeConfig(match);
}

export async function getSlaSettingsForApi() {
  const doc = await SlaConfig.findOne().sort({ updatedAt: -1 }).lean();
  const history = [...((doc as any)?.changeHistory || [])].reverse().slice(0, 25);

  return {
    config: normalizeConfig(doc as Record<string, unknown> | null),
    caseTypeOverrides: normalizeCaseTypeOverrides(doc as Record<string, unknown> | null),
    lastEditedBy: (doc as any)?.lastEditedBy
      ? {
          name: (doc as any).lastEditedBy.name,
          email: (doc as any).lastEditedBy.email,
          role: (doc as any).lastEditedBy.role,
          rbacRole: (doc as any).lastEditedBy.rbacRole,
          at: (doc as any).lastEditedAt || (doc as any).updatedAt,
        }
      : null,
    changeHistory: history.map((entry: any) => ({
      action: entry.action,
      note: entry.note,
      at: entry.at,
      changedBy: {
        name: entry.changedBy?.name,
        email: entry.changedBy?.email,
        role: entry.changedBy?.role,
        rbacRole: entry.changedBy?.rbacRole,
      },
      previous: entry.previous,
      next: entry.next,
    })),
  };
}

export function tierMinutesFromFields(
  hours?: number | null,
  minutes?: number | null
): number | null {
  const total = tierToTotalMinutes(hours, minutes);
  return total > 0 ? total : null;
}

export function slaMinutesForLevel(
  config: SlaConfigPayload,
  level: OfficerLevel = "L1"
): number | null {
  if (config.mode === "separate") {
    if (level === "L1") return tierMinutesFromFields(config.l1Hours, config.l1Minutes);
    if (level === "L2") return tierMinutesFromFields(config.l2Hours, config.l2Minutes);
    return tierMinutesFromFields(config.l3Hours, config.l3Minutes);
  }
  return tierMinutesFromFields(config.hours, config.minutes);
}

export function computeTierDeadline(
  config: SlaConfigPayload,
  level: OfficerLevel = "L1",
  from: Date = new Date()
): Date | null {
  const minutes = slaMinutesForLevel(config, level);
  if (!minutes) return null;
  return addMinutesToDate(from, minutes);
}

/** SLA deadline for an org tier (Station=L1, HQ=L2, Area=L3), with fallbacks. */
export function computeDeadlineForOrgTier(
  config: SlaConfigPayload,
  tier: "station" | "hq" | "area",
  from: Date = new Date()
): Date | null {
  const tierToLevel: Record<typeof tier, OfficerLevel> = {
    station: "L1",
    hq: "L2",
    area: "L3",
  };
  const primary = tierToLevel[tier];
  const direct = computeTierDeadline(config, primary, from);
  if (direct) return direct;

  if (config.mode === "common") {
    return computeTierDeadline(config, "L1", from);
  }

  for (const level of ["L1", "L2", "L3"] as OfficerLevel[]) {
    const fallback = computeTierDeadline(config, level, from);
    if (fallback) return fallback;
  }
  return null;
}

export function formatSlaDuration(hours?: number | null, minutes?: number | null): string {
  const parts: string[] = [];
  if (hours && hours > 0) parts.push(`${hours}h`);
  if (minutes && minutes > 0) parts.push(`${minutes}m`);
  return parts.length ? parts.join(" ") : "—";
}
