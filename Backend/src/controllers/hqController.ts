import { Request, Response } from "express";
import HQ from "../models/HeadQuarter";
import {
  auditActorFromRequest,
  hqListQuery,
  resolveAreaForHQCreate,
} from "../services/officerHierarchy";

export const getHQs = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = hqListQuery((req as any).user);
    const hqs = await HQ.find(query).sort({ name: 1 });
    res.json({ success: true, data: hqs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createHQ = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, city, stateId, address, commanderName, contactEmail, contactPhone } = req.body;
    const actor = (req as any).user;

    if (!name || !city) {
      res.status(400).json({ success: false, message: "name and city are required" });
      return;
    }

    const area = await resolveAreaForHQCreate(actor, stateId);
    const audit = auditActorFromRequest(actor);

    const existing = await HQ.findOne({ name: { $regex: `^${name.trim()}$`, $options: "i" } });
    if (existing?.isActive) {
      res.status(409).json({ success: false, message: "Headquarters with this name already exists" });
      return;
    }

    const payload = {
      name: name.trim(),
      city: city.trim(),
      state: area.stateName,
      stateId: area.stateId,
      stateName: area.stateName,
      stateCode: area.stateCode,
      address,
      commanderName,
      contactEmail,
      contactPhone,
      createdBy: audit,
      updatedBy: audit,
      isActive: true,
    };

    const hq = existing
      ? await HQ.findByIdAndUpdate(existing._id, payload, { new: true })
      : await HQ.create(payload);

    res.status(201).json({ success: true, message: "Headquarters created", data: hq });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};
