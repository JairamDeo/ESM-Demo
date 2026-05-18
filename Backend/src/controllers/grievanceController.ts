import { Request, Response } from "express";
import mongoose from "mongoose";
import Grievance from "../models/Grievance";
import Escalation from "../models/Escalation";
import Notification from "../models/Notification";
import Station from "../models/Station";
import CaseType from "../models/CaseType";

// ─── GET all grievances (with search + filter + pagination) ──────────────────
export const getGrievances = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      priority,
      station,
      type,
      officer,
      sortBy = "createdAt",
      sortOrder = "desc",
      startDate,
      endDate,
    } = req.query;

    const query: any = { isDeleted: false };

    // Search across multiple fields
    if (search) {
      query.$or = [
        { grievanceId: { $regex: search, $options: "i" } },
        { veteranName: { $regex: search, $options: "i" } },
        { veteranArmyNo: { $regex: search, $options: "i" } },
        { type: { $regex: search, $options: "i" } },
        { stationName: { $regex: search, $options: "i" } },
        { officerName: { $regex: search, $options: "i" } },
      ];
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (station) query.stationName = { $regex: station, $options: "i" };
    if (type) query.type = { $regex: type, $options: "i" };
    if (officer) query.officerName = { $regex: officer, $options: "i" };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const sortObj: any = {};
    sortObj[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const [grievances, total] = await Promise.all([
      Grievance.find(query).sort(sortObj).skip(skip).limit(limitNum).lean(),
      Grievance.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: grievances,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET single grievance ────────────────────────────────────────────────────
export const getGrievanceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const grievance = await Grievance.findOne({
      $or: [
        { _id: mongoose.isValidObjectId(req.params.id) ? req.params.id : null },
        { grievanceId: (req.params.id as string).toUpperCase() },
      ],
      isDeleted: false,
    });

    if (!grievance) {
      res.status(404).json({ success: false, message: "Grievance not found" });
      return;
    }

    res.status(200).json({ success: true, data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CREATE grievance ────────────────────────────────────────────────────────
export const createGrievance = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      type, veteranName, veteranPhone, veteranArmyNo, veteranRank,
      stationName, officerName, priority, description, submissionSource,
    } = req.body;

    if (!type || !veteranName || !stationName) {
      res.status(400).json({ success: false, message: "type, veteranName, stationName are required" });
      return;
    }

    // Set SLA deadline: 15 days from now
    const slaDeadline = new Date();
    slaDeadline.setDate(slaDeadline.getDate() + 15);

    const userId = (req as any).user?.role === "user" ? (req as any).user.id : undefined;
    const grievanceId = `GRV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const grievance = await Grievance.create({
      grievanceId,type, veteranName, veteranPhone, veteranArmyNo, veteranRank,
      stationName, officerName: officerName || "Unassigned",
      priority: priority || "medium",
      description,
      submissionSource: submissionSource || "portal",
      slaDeadline,
      userId,
      timeline: [{ status: "pending", note: "Grievance submitted", updatedBy: veteranName, updatedAt: new Date() }],
    });

     if (userId) {
      await Notification.create({
        recipientId: userId,
        recipientType: "user",
        title: "Grievance Submitted",
        message: `Your grievance ${grievanceId} has been submitted successfully`,
        type: "grievance_update",
        grievanceId: grievance._id,
        grievanceCode: grievanceId,
      });
    }

    // Update Station case count
    await Station.findOneAndUpdate(
      { name: { $regex: stationName, $options: "i" } },
      { $inc: { totalCases: 1 } }
    );

    // Update CaseType count
    await CaseType.findOneAndUpdate(
      { name: type },
      { $inc: { totalCases: 1, pendingCases: 1 } }
    );

    res.status(201).json({ success: true, message: "Grievance created successfully", data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── UPDATE grievance status ─────────────────────────────────────────────────
export const updateGrievanceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, note, officerName } = req.body;
    const validStatuses = ["pending", "in-progress", "escalated", "resolved", "closed"];

    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: "Invalid status" });
      return;
    }

    const grievance = await Grievance.findOne({
      $or: [
        { _id: mongoose.isValidObjectId(req.params.id) ? req.params.id : null },
        { grievanceId: (req.params.id as string).toUpperCase() },
      ],
      isDeleted: false,
    });

    if (!grievance) {
      res.status(404).json({ success: false, message: "Grievance not found" });
      return;
    }

    const oldStatus = grievance.status;
    grievance.status = status;

    // Add timeline entry
    grievance.timeline.push({
      status,
      note: note || `Status updated to ${status}`,
      updatedBy: officerName || (req as any).user?.name || "System",
      updatedAt: new Date(),
    });

    if (status === "resolved") {
      grievance.resolvedAt = new Date();
      // Update CaseType resolved count
      await CaseType.findOneAndUpdate({ name: grievance.type }, { $inc: { resolvedCases: 1, pendingCases: -1 } });
      // Update Station resolved count
      await Station.findOneAndUpdate(
        { name: { $regex: grievance.stationName, $options: "i" } },
        { $inc: { resolvedCases: 1 } }
      );
    }

    if (status === "escalated" && oldStatus !== "escalated") {
      // Auto-create escalation
      const daysSinceCreation = Math.floor((Date.now() - grievance.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const escCount = await Escalation.countDocuments();
      await Escalation.create({
        escalationId: `ESC-${String(escCount + 1).padStart(3, "0")}`,
        grievanceId: grievance._id,
        grievanceCode: grievance.grievanceId,
        veteranName: grievance.veteranName,
        type: grievance.type,
        stationName: grievance.stationName,
        reason: note || "Manually escalated",
        escalatedTo: "ESM Officer",
        escalatedBy: officerName || "System",
        daysOpen: daysSinceCreation,
      });
      grievance.timeline.push({ status: "escalated", note: "Case escalated to ESM Officer", updatedBy: "System", updatedAt: new Date() });
    }

    await grievance.save();

    // Send notification if userId exists
    if (grievance.userId) {
      await Notification.create({
        recipientId: grievance.userId,
        recipientType: "user",
        title: "Grievance Update",
        message: `Your grievance ${grievance.grievanceId} status changed to ${status}`,
        type: "grievance_update",
        grievanceId: grievance._id,
        grievanceCode: grievance.grievanceId,
      });
    }

    res.status(200).json({ success: true, message: "Status updated", data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ASSIGN officer to grievance ─────────────────────────────────────────────
export const assignOfficer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { officerId, officerName } = req.body;
    const grievance = await Grievance.findByIdAndUpdate(
      req.params.id,
      {
        officerId,
        officerName,
        status: "in-progress",
        $push: {
          timeline: { status: "in-progress", note: `Assigned to ${officerName}`, updatedBy: "Admin", updatedAt: new Date() },
        },
      },
      { new: true }
    );
    if (!grievance) { res.status(404).json({ success: false, message: "Grievance not found" }); return; }
    res.status(200).json({ success: true, message: "Officer assigned", data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ADD comment to grievance ────────────────────────────────────────────────
export const addComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, authorName, authorRole } = req.body;
    if (!message) { res.status(400).json({ success: false, message: "Message is required" }); return; }

    const grievance = await Grievance.findOne({
      $or: [
        { _id: mongoose.isValidObjectId(req.params.id) ? req.params.id : null },
        { grievanceId: (req.params.id as string).toUpperCase() },
      ],
      isDeleted: false,
    });
    if (!grievance) { res.status(404).json({ success: false, message: "Grievance not found" }); return; }

    grievance.comments.push({
      authorId: (req as any).user?.id,
      authorName: authorName || (req as any).user?.name || "Unknown",
      authorRole: authorRole || (req as any).user?.role || "user",
      message,
      createdAt: new Date(),
    });
    await grievance.save();

    res.status(200).json({ success: true, message: "Comment added", data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE (soft-delete) grievance ─────────────────────────────────────────
export const deleteGrievance = async (req: Request, res: Response): Promise<void> => {
  try {
    const grievance = await Grievance.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
    if (!grievance) { res.status(404).json({ success: false, message: "Grievance not found" }); return; }
    res.status(200).json({ success: true, message: "Grievance deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET grievances by USER (veteran) ────────────────────────────────────────
export const getMyGrievances = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { status } = req.query;
    const query: any = { userId, isDeleted: false };
    if (status) query.status = status;

    const grievances = await Grievance.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: grievances });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── TRACK grievance by ID (public) ─────────────────────────────────────────
export const trackGrievance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const grievance = await Grievance.findOne({
      $or: [
        { grievanceId: (id as string).toUpperCase() },
        { _id: mongoose.isValidObjectId(id) ? id : null },
      ],
      isDeleted: false,
    }).select("grievanceId type veteranName stationName officerName status priority timeline createdAt resolvedAt");

    if (!grievance) {
      res.status(404).json({ success: false, message: "Grievance not found. Check your complaint ID." });
      return;
    }
    res.status(200).json({ success: true, data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DASHBOARD stats ─────────────────────────────────────────────────────────
export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [total, pending, inProgress, escalated, resolved] = await Promise.all([
      Grievance.countDocuments({ isDeleted: false }),
      Grievance.countDocuments({ status: "pending", isDeleted: false }),
      Grievance.countDocuments({ status: "in-progress", isDeleted: false }),
      Grievance.countDocuments({ status: "escalated", isDeleted: false }),
      Grievance.countDocuments({ status: "resolved", isDeleted: false }),
    ]);

    // Monthly data (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyGrievances = await Grievance.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, isDeleted: false } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          received: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // By type
    const byType = await Grievance.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // By station
    const byStation = await Grievance.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: "$stationName", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Recent grievances
    const recent = await Grievance.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("grievanceId type veteranName stationName status createdAt");

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    res.status(200).json({
      success: true,
      data: {
        stats: { total, pending, inProgress, escalated, resolved },
        monthly: monthlyGrievances.map((m) => ({
          name: monthNames[m._id.month - 1],
          received: m.received,
          resolved: m.resolved,
        })),
        byType: byType.map((t) => ({ name: t._id, value: t.count })),
        byStation: byStation.map((s) => ({ name: s._id.replace(" Station HQ", "").replace(" HQ", ""), cases: s.count })),
        recent,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
