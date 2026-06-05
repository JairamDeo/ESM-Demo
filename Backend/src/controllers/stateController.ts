import { Request, Response } from "express";
import State from "../models/State";
import { stateListQuery } from "../services/officerHierarchy";
import { buildAuditEntry } from "../services/auditService";

export const getStates = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = stateListQuery((req as any).user);
    const states = await State.find(query).sort({ name: 1 });
    res.json({ success: true, data: states });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createState = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, code } = req.body;
    if (!name || !code) {
      res.status(400).json({ success: false, message: "name and code are required" });
      return;
    }

    const existing = await State.findOne({
      $or: [
        { name: { $regex: `^${name.trim()}$`, $options: "i" } },
        { code: code.trim().toUpperCase() },
      ],
    });

    if (existing?.isActive) {
      res.status(409).json({ success: false, message: "Area with this name or code already exists" });
      return;
    }

    const actor = (req as any).user;
    const auditEntry = buildAuditEntry(
      actor,
      existing ? "update" : "create",
      existing ? { note: "Area reactivated" } : undefined
    );

    const state = existing
      ? await State.findByIdAndUpdate(
          existing._id,
          {
            name: name.trim(),
            code: code.trim().toUpperCase(),
            isActive: true,
            $push: { auditHistory: auditEntry },
          },
          { new: true }
        )
      : await State.create({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          auditHistory: [auditEntry],
        });

    res.status(201).json({ success: true, message: "Area created", data: state });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};
