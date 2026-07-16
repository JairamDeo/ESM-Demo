import { Request, Response } from "express";
import Escalation from "../models/Escalation";
import Grievance from "../models/Grievance";
import Notification from "../models/Notification";
import { getGrievanceScopeFilter } from "../utils/scopeFilter";
import { createEscalationRecord } from "../utils/escalationId";
import { findGrievanceByParamId } from "../utils/grievanceLookup";

// ─── GET all escalations ─────────────────────────────────────────────────────
export const getEscalations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, station, search, page = 1, limit = 20 } = req.query;

    const stationFilter = await getGrievanceScopeFilter((req as any).user);
    const query: any = { ...stationFilter };

    if (status) query.status = status;
    if (station && (req as any).user?.role === "super_admin") {
      query.stationName = { $regex: station, $options: "i" };
    }
    if (search) {
      query.$or = [
        { escalationId: { $regex: search, $options: "i" } },
        { grievanceCode: { $regex: search, $options: "i" } },
        { veteranName: { $regex: search, $options: "i" } },
        { type: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const [escalations, total] = await Promise.all([
      Escalation.find(query)
        .populate("grievanceId", "grievanceId type veteranName status priority")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Escalation.countDocuments(query),
    ]);

    // Summary also filtered by station
    const [openCount, resolvedCount, avgDays] = await Promise.all([
      Escalation.countDocuments({ ...stationFilter, status: "open" }),
      Escalation.countDocuments({ ...stationFilter, status: "resolved" }),
      Escalation.aggregate([
        { $match: { ...stationFilter, status: "open" } },
        { $group: { _id: null, avg: { $avg: "$daysOpen" } } }
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: escalations,
      summary: {
        open: openCount,
        resolved: resolvedCount,
        avgDaysOpen: Math.round(avgDays[0]?.avg || 0),
      },
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET single escalation ───────────────────────────────────────────────────
export const getEscalationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const escalation = await Escalation.findById(req.params.id).populate("grievanceId");
    if (!escalation) { res.status(404).json({ success: false, message: "Escalation not found" }); return; }
    res.status(200).json({ success: true, data: escalation });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CREATE manual escalation ────────────────────────────────────────────────
export const createEscalation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { grievanceId, reason, escalatedTo } = req.body;
    if (!grievanceId || !reason || !escalatedTo) {
      res.status(400).json({ success: false, message: "grievanceId, reason and escalatedTo are required" });
      return;
    }

    const grievance = await findGrievanceByParamId(grievanceId);
    if (!grievance) { res.status(404).json({ success: false, message: "Grievance not found" }); return; }

    const daysOpen = Math.floor((Date.now() - grievance.createdAt.getTime()) / (1000 * 60 * 60 * 24));

    const escalation = await createEscalationRecord({
      grievanceId: grievance._id,
      grievanceCode: grievance.grievanceId,
      veteranName: grievance.veteranName,
      type: grievance.type,
      stationName: grievance.stationName,
      reason,
      escalatedTo,
      escalatedBy: (req as any).user?.name || "Admin",
      daysOpen,
      escalationReasonType: "manual_request",
      fromLevel: (grievance.assignedLevel || "L1") as any,
      approvalStatus: "n/a",
    });

    grievance.status = "escalated";
    grievance.escalationId = escalation._id as any;
    grievance.timeline.push({ status: "escalated", note: reason, updatedBy: "Admin", updatedAt: new Date() });
    await grievance.save();

    res.status(201).json({ success: true, message: "Escalation created", data: escalation });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── RESOLVE escalation ──────────────────────────────────────────────────────
export const resolveEscalation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resolutionNote } = req.body;
    const escalation = await Escalation.findById(req.params.id);
    if (!escalation) { res.status(404).json({ success: false, message: "Escalation not found" }); return; }

    escalation.status = "resolved";
    escalation.resolvedAt = new Date();
    escalation.resolvedBy = (req as any).user?.name || "Admin";
    escalation.resolutionNote = resolutionNote || "Resolved by admin";
    await escalation.save();

    await Grievance.findByIdAndUpdate(escalation.grievanceId, {
      status: "in-progress",
      $push: { timeline: { status: "in-progress", note: "Escalation resolved", updatedBy: "Admin", updatedAt: new Date() } },
    });

    res.status(200).json({ success: true, message: "Escalation resolved", data: escalation });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};