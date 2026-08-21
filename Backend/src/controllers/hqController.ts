import { Request, Response } from "express";
import HQ from "../models/HeadQuarter";
import { buildAuditEntry } from "../services/auditService";
import { hqListQuery, resolveAreaForHQCreate } from "../services/officerHierarchy";

export const getHQs = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = hqListQuery((req as any).user);
    const hqs = await HQ.find(query).populate("officers.officerId", "name role level status").sort({ name: 1 });
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

    const existing = await HQ.findOne({ name: { $regex: `^${name.trim()}$`, $options: "i" } });
    if (existing?.isActive) {
      res.status(409).json({ success: false, message: "Headquarters with this name already exists" });
      return;
    }

    const auditEntry = buildAuditEntry(
      actor,
      existing ? "update" : "create",
      existing ? { note: "Headquarters reactivated" } : undefined
    );

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
      isActive: true,
    };

    const hq = existing
      ? await HQ.findByIdAndUpdate(
          existing._id,
          { ...payload, $push: { auditHistory: auditEntry } },
          { new: true }
        )
      : await HQ.create({ ...payload, auditHistory: [auditEntry] });

    res.status(201).json({ success: true, message: "Headquarters created", data: hq });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};
