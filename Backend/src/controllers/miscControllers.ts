import { Request, Response } from "express";
import CaseType from "../models/CaseType";
import Grievance from "../models/Grievance";
import Escalation from "../models/Escalation";
import Station from "../models/Station";
import Officer from "../models/Officer";
import Notification from "../models/Notification";

// ═══════════════════════════════════════════════════════════════════════════════
// CASE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export const getCaseTypes = async (_req: Request, res: Response): Promise<void> => {
  try {
    const caseTypes = await CaseType.find({ isActive: true }).sort({ id: 1 });
    res.status(200).json({ success: true, data: caseTypes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCaseTypeById = async (req: Request, res: Response): Promise<void> => {
  try {
    const caseType = await CaseType.findById(req.params.id);
    if (!caseType) { res.status(404).json({ success: false, message: "Case type not found" }); return; }
    res.status(200).json({ success: true, data: caseType });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCaseType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    if (!name) { res.status(400).json({ success: false, message: "name is required" }); return; }
    const count = await CaseType.countDocuments();
    const caseType = await CaseType.create({ id: count + 1, name, description });
    res.status(201).json({ success: true, data: caseType });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCaseType = async (req: Request, res: Response): Promise<void> => {
  try {
    const caseType = await CaseType.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!caseType) { res.status(404).json({ success: false, message: "Case type not found" }); return; }
    res.status(200).json({ success: true, data: caseType });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTS & ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════

export const getReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const { months = 6 } = req.query;
    const monthsNum = parseInt(months as string);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsNum);

    // Monthly received vs resolved
    const monthly = await Grievance.aggregate([
      { $match: { createdAt: { $gte: startDate }, isDeleted: false } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          received: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          escalated: { $sum: { $cond: [{ $eq: ["$status", "escalated"] }, 1, 0] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // SLA compliance — resolved within 15 days
    const slaCompliance = await Grievance.aggregate([
      { $match: { status: "resolved", resolvedAt: { $exists: true }, isDeleted: false } },
      {
        $project: {
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
          daysToResolve: {
            $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 1000 * 60 * 60 * 24],
          },
        },
      },
      {
        $group: {
          _id: { year: "$year", month: "$month" },
          total: { $sum: 1 },
          withinSLA: { $sum: { $cond: [{ $lte: ["$daysToResolve", 15] }, 1, 0] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Station performance
    const stationPerf = await Grievance.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: "$stationName",
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Case type distribution
    const typeDistribution = await Grievance.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Overall totals
    const [totalGrievances, totalResolved, totalPending, totalEscalated, totalOfficers, totalStations] = await Promise.all([
      Grievance.countDocuments({ isDeleted: false }),
      Grievance.countDocuments({ status: "resolved", isDeleted: false }),
      Grievance.countDocuments({ status: "pending", isDeleted: false }),
      Grievance.countDocuments({ status: "escalated", isDeleted: false }),
      Officer.countDocuments({ status: "active" }),
      Station.countDocuments({ isActive: true }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: { totalGrievances, totalResolved, totalPending, totalEscalated, totalOfficers, totalStations },
        monthly: monthly.map((m) => ({
          month: monthNames[m._id.month - 1],
          year: m._id.year,
          received: m.received,
          resolved: m.resolved,
          pending: m.pending,
          escalated: m.escalated,
        })),
        slaCompliance: slaCompliance.map((s) => ({
          month: monthNames[s._id.month - 1],
          sla: Math.round((s.withinSLA / s.total) * 100),
          total: s.total,
          withinSLA: s.withinSLA,
        })),
        stationPerformance: stationPerf.map((s) => ({
          station: s._id,
          total: s.total,
          resolved: s.resolved,
          pending: s.pending,
          rate: s.total > 0 ? Math.round((s.resolved / s.total) * 100) : 0,
        })),
        typeDistribution: typeDistribution.map((t) => ({ type: t._id, count: t.count })),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { unreadOnly } = req.query;

    const query: any = {
      recipientId: userId,
      recipientType: userRole === "user" ? "user" : "admin",
    };
    if (unreadOnly === "true") query.isRead = false;

    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(30).lean();
    const unreadCount = await Notification.countDocuments({ recipientId: userId, recipientType: userRole === "user" ? "user" : "admin", isRead: false, });

    res.status(200).json({ success: true, data: notifications, unreadCount });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markNotificationRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (id === "all") {
      await Notification.updateMany({ recipientId: (req as any).user.id }, { isRead: true });
      res.status(200).json({ success: true, message: "All notifications marked as read" });
    } else {
      const notification = await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
      if (!notification) { res.status(404).json({ success: false, message: "Notification not found" }); return; }
      res.status(200).json({ success: true, data: notification });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// USER PROFILE (veteran)
// ═══════════════════════════════════════════════════════════════════════════════

export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const User = (await import("../models/User")).default;
    const { name, rank, serviceNumber, armyNumber, email, address, stationHQ } = req.body;

    const user = await User.findByIdAndUpdate(
      (req as any).user.id,
      { name, rank, serviceNumber, armyNumber, email, address, stationHQ },
      { new: true, runValidators: true }
    );
    if (!user) { res.status(404).json({ success: false, message: "User not found" }); return; }
    res.status(200).json({ success: true, message: "Profile updated", data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
