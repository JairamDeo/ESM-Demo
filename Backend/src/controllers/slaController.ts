import { Request, Response } from "express";
import SlaConfig from "../models/SlaConfig";
import { getSlaSettingsForApi, tierMinutesFromFields } from "../services/slaConfigService";
import { SlaMode } from "../models/SlaConfig";
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
    } = req.body;

    const slaMode: SlaMode = mode === "separate" ? "separate" : "common";
    const body = { hours, minutes, l1Hours, l1Minutes, l2Hours, l2Minutes, l3Hours, l3Minutes };

    if (slaMode === "common") {
      const err = validateTier("Common", parseOptional(hours), parseOptional(minutes));
      if (err) {
        res.status(400).json({ success: false, message: err });
        return;
      }
    } else {
      const tiers = [
        { label: "L1", h: parseOptional(l1Hours), m: parseOptional(l1Minutes) },
        { label: "L2", h: parseOptional(l2Hours), m: parseOptional(l2Minutes) },
        { label: "L3", h: parseOptional(l3Hours), m: parseOptional(l3Minutes) },
      ];
      for (const tier of tiers) {
        const err = validateTier(tier.label, tier.h, tier.m);
        if (err) {
          res.status(400).json({ success: false, message: err });
          return;
        }
      }
    }

    const actor = actorFromRequest(req);
    if (!actor.id) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const existing = await SlaConfig.findOne().sort({ updatedAt: -1 }).lean();
    const previousSnapshot = snapshotFromDoc(existing as Record<string, unknown> | null);
    const nextSnapshot = buildNextPayload(slaMode, body);
    const changeEntry = buildSlaChangeEntry(actor, previousSnapshot, nextSnapshot);
    const editor = buildSlaEditor(actor);
    const now = new Date();

    const setFields: Record<string, unknown> = {
      mode: slaMode,
      lastEditedBy: editor,
      lastEditedAt: now,
      updatedBy: editor.name,
    };

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

    const unsetFields =
      slaMode === "common"
        ? {
            l1Hours: "",
            l1Minutes: "",
            l2Hours: "",
            l2Minutes: "",
            l3Hours: "",
            l3Minutes: "",
          }
        : { hours: "", minutes: "" };

    if (existing) {
      await SlaConfig.findByIdAndUpdate(existing._id, {
        $set: setFields,
        $unset: unsetFields,
        $push: { changeHistory: changeEntry },
      });
    } else {
      await SlaConfig.create({
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
