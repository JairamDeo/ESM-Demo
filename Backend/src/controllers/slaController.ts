import { Request, Response } from "express";
import SlaConfig from "../models/SlaConfig";
import { getSlaSettingsForApi, tierMinutesFromFields } from "../services/slaConfigService";
import { SlaMode, SlaCaseTypeOverridePayload } from "../models/SlaConfig";
import mongoose from "mongoose";
import {
  buildSlaChangeEntry,
  buildSlaEditor,
  snapshotFromDoc,
  snapshotFromPayload,
} from "../services/slaAuditService";
import { RequestActor } from "../services/auditService";

const parseOptional = (v: unknown): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

function validateTier(label: string, hours: number | null, minutes: number | null): string | null {
  if (hours == null && minutes == null) {
    return `Enter hours or minutes for ${label}.`;
  }
  const total = tierMinutesFromFields(hours, minutes);
  if (!total || total <= 0) {
    return `${label} SLA must be greater than zero.`;
  }
  return null;
}

function validateOverridePayload(row: Record<string, unknown>): string | null {
  const enabled = Boolean(row.enabled);
  if (!enabled) return null;

  const slaMode: SlaMode = row.mode === "separate" ? "separate" : "common";
  const name = String(row.caseTypeName || row.caseTypeId || "case type");

  if (slaMode === "common") {
    return validateTier(`${name} (common)`, parseOptional(row.hours), parseOptional(row.minutes));
  }
  const tiers = [
    { label: `${name} Station`, h: parseOptional(row.l1Hours), m: parseOptional(row.l1Minutes) },
    { label: `${name} HQ`, h: parseOptional(row.l2Hours), m: parseOptional(row.l2Minutes) },
    { label: `${name} Area`, h: parseOptional(row.l3Hours), m: parseOptional(row.l3Minutes) },
  ];
  for (const tier of tiers) {
    const err = validateTier(tier.label, tier.h, tier.m);
    if (err) return err;
  }
  return null;
}

function normalizeOverridesInput(raw: unknown): SlaCaseTypeOverridePayload[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: SlaCaseTypeOverridePayload[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const caseTypeId = String(row.caseTypeId || "").trim();
    if (!caseTypeId || !mongoose.isValidObjectId(caseTypeId) || seen.has(caseTypeId)) continue;
    seen.add(caseTypeId);

    const mode: SlaMode = row.mode === "separate" ? "separate" : "common";
    out.push({
      caseTypeId,
      caseTypeName: row.caseTypeName ? String(row.caseTypeName) : undefined,
      enabled: Boolean(row.enabled),
      mode,
      hours: parseOptional(row.hours),
      minutes: parseOptional(row.minutes),
      l1Hours: parseOptional(row.l1Hours),
      l1Minutes: parseOptional(row.l1Minutes),
      l2Hours: parseOptional(row.l2Hours),
      l2Minutes: parseOptional(row.l2Minutes),
      l3Hours: parseOptional(row.l3Hours),
      l3Minutes: parseOptional(row.l3Minutes),
    });
  }
  return out;
}

function overridesForDb(rows: SlaCaseTypeOverridePayload[]) {
  return rows.map((row) => ({
    caseTypeId: new mongoose.Types.ObjectId(row.caseTypeId),
    caseTypeName: row.caseTypeName,
    enabled: row.enabled,
    mode: row.mode,
    hours: row.hours ?? 0,
    minutes: row.minutes ?? 0,
    l1Hours: row.l1Hours ?? 0,
    l1Minutes: row.l1Minutes ?? 0,
    l2Hours: row.l2Hours ?? 0,
    l2Minutes: row.l2Minutes ?? 0,
    l3Hours: row.l3Hours ?? 0,
    l3Minutes: row.l3Minutes ?? 0,
  }));
}

function buildNextPayload(
  slaMode: SlaMode,
  body: Record<string, unknown>
) {
  if (slaMode === "common") {
    return snapshotFromPayload({
      mode: "common",
      hours: parseOptional(body.hours) ?? 0,
      minutes: parseOptional(body.minutes) ?? 0,
    });
  }
  return snapshotFromPayload({
    mode: "separate",
    l1Hours: parseOptional(body.l1Hours) ?? 0,
    l1Minutes: parseOptional(body.l1Minutes) ?? 0,
    l2Hours: parseOptional(body.l2Hours) ?? 0,
    l2Minutes: parseOptional(body.l2Minutes) ?? 0,
    l3Hours: parseOptional(body.l3Hours) ?? 0,
    l3Minutes: parseOptional(body.l3Minutes) ?? 0,
  });
}

function actorFromRequest(req: Request): RequestActor {
  const user = (req as any).user;
  return {
    id: user?.id,
    name: user?.name,
    email: user?.email,
    role: user?.role,
    jobRole: user?.jobRole,
  };
}

export const getSlaSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await getSlaSettingsForApi();
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSlaSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      mode,
      hours,
      minutes,
      l1Hours,
      l1Minutes,
      l2Hours,
      l2Minutes,
      l3Hours,
      l3Minutes,
      caseTypeOverrides,
    } = req.body;

    const overrides = normalizeOverridesInput(caseTypeOverrides);
    const hasCaseTypeSla = overrides.some((o) => o.enabled);
    const globalModeProvided = mode !== undefined && mode !== null;

    const actor = actorFromRequest(req);
    if (!actor.id) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const existing = await SlaConfig.findOne().sort({ updatedAt: -1 }).lean();
    const slaMode: SlaMode =
      globalModeProvided && mode === "separate"
        ? "separate"
        : globalModeProvided
          ? "common"
          : (existing as any)?.mode === "separate"
            ? "separate"
            : "common";
    const body = { hours, minutes, l1Hours, l1Minutes, l2Hours, l2Minutes, l3Hours, l3Minutes };
    const updateGlobal = globalModeProvided;

    if (!globalModeProvided) {
      res.status(400).json({ success: false, message: "Configure default SLA for all case types." });
      return;
    }

    if (slaMode === "common") {
      const err = validateTier("Default common", parseOptional(hours), parseOptional(minutes));
      if (err) {
        res.status(400).json({ success: false, message: err });
        return;
      }
    } else {
      const tiers = [
        { label: "Default Station", h: parseOptional(l1Hours), m: parseOptional(l1Minutes) },
        { label: "Default HQ", h: parseOptional(l2Hours), m: parseOptional(l2Minutes) },
        { label: "Default Area", h: parseOptional(l3Hours), m: parseOptional(l3Minutes) },
      ];
      for (const tier of tiers) {
        const err = validateTier(tier.label, tier.h, tier.m);
        if (err) {
          res.status(400).json({ success: false, message: err });
          return;
        }
      }
    }

    for (const row of overrides) {
      if (!row.enabled) continue;
      const err = validateOverridePayload(row as unknown as Record<string, unknown>);
      if (err) {
        res.status(400).json({ success: false, message: err });
        return;
      }
    }

    const previousSnapshot = snapshotFromDoc(existing as Record<string, unknown> | null);
    const nextSnapshot = buildNextPayload(slaMode, body);
    const changeEntry = buildSlaChangeEntry(actor, previousSnapshot, nextSnapshot);
    if (hasCaseTypeSla) {
      const customCount = overrides.filter((o) => o.enabled).length;
      changeEntry.note = `SLA saved: default + ${customCount} custom case type(s)`;
    }
    const editor = buildSlaEditor(actor);
    const now = new Date();

    const setFields: Record<string, unknown> = {
      lastEditedBy: editor,
      lastEditedAt: now,
      updatedBy: editor.name,
      caseTypeOverrides: overridesForDb(overrides),
    };

    if (updateGlobal) {
      setFields.mode = slaMode;
      if (slaMode === "common") {
        Object.assign(setFields, {
          hours: parseOptional(hours) ?? 0,
          minutes: parseOptional(minutes) ?? 0,
        });
      } else {
        Object.assign(setFields, {
          l1Hours: parseOptional(l1Hours) ?? 0,
          l1Minutes: parseOptional(l1Minutes) ?? 0,
          l2Hours: parseOptional(l2Hours) ?? 0,
          l2Minutes: parseOptional(l2Minutes) ?? 0,
          l3Hours: parseOptional(l3Hours) ?? 0,
          l3Minutes: parseOptional(l3Minutes) ?? 0,
        });
      }
    }

    const unsetFields = updateGlobal
      ? slaMode === "common"
        ? {
            l1Hours: "",
            l1Minutes: "",
            l2Hours: "",
            l2Minutes: "",
            l3Hours: "",
            l3Minutes: "",
          }
        : { hours: "", minutes: "" }
      : null;

    if (existing) {
      const update: Record<string, unknown> = {
        $set: setFields,
        $push: { changeHistory: changeEntry },
      };
      if (unsetFields) update.$unset = unsetFields;
      await SlaConfig.findByIdAndUpdate(existing._id, update);
    } else {
      await SlaConfig.create({
        mode: "common",
        hours: 0,
        minutes: 0,
        ...setFields,
        changeHistory: [changeEntry],
      });
    }

    const data = await getSlaSettingsForApi();
    res.status(200).json({ success: true, message: "SLA settings updated", data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
