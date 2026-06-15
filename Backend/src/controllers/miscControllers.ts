import { Request, Response } from "express";
import CaseType from "../models/CaseType";
import Grievance from "../models/Grievance";
import Escalation from "../models/Escalation";
import Station from "../models/Station";
import Officer from "../models/Officer";
import Notification from "../models/Notification";
import Category from "../models/Category";
import { storeCategoryIcon, removeCategoryIcon } from "../services/storageService";


// ─── Helper: date filter ─────────────────────────────────────────────────────
const getDateFilter = (period?: string): any => {
  if (!period || period === "all") return {};
  const now = new Date();
  let from: Date;
  switch (period) {
    case "today":
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "this_week":
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "this_month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "last_3_months":
      from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      break;
    case "last_6_months":
      from = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      break;
    case "this_year":
      from = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      return {};
  }
  return { createdAt: { $gte: from } };
};

import { getGrievanceScopeFilter } from "../utils/scopeFilter";

// ═══════════════════════════════════════════════════════════════════════════════
// CASE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export const getCaseTypes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const filter: any = {};
    if (status === "active") {
      filter.isActive = { $ne: false }; // Match active case types
    }
    const caseTypesRaw = await CaseType.find(filter).populate("category", "name isActive iconUrl").lean();
    // Sort by casetype<N> numeric suffix if present, else fallback stable.
    const caseTypes = caseTypesRaw
      .sort((a: any, b: any) => {
        const aId = String(a.id ?? "");
        const bId = String(b.id ?? "");
        const aMatch = /^casetype(\d+)$/i.exec(aId);
        const bMatch = /^casetype(\d+)$/i.exec(bId);
        if (aMatch && bMatch) return Number(aMatch[1]) - Number(bMatch[1]);
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return aId.localeCompare(bId);
      })
      .map((ct: any) => {
        const populated = ct.category && typeof ct.category === "object" ? ct.category : null;
        return {
          ...ct,
          categoryId: populated?._id ?? ct.category,
          categoryName: populated?.name ?? "Other",
          categoryIconUrl: populated?.iconUrl ?? null,
        };
      });
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
    const { name, description, category } = req.body;
    if (!name) { res.status(400).json({ success: false, message: "name is required" }); return; }
    if (!category) { res.status(400).json({ success: false, message: "category is required" }); return; }
    // Generate next id like "casetype17" (max+1), safe even if items deleted.
    const existing = await CaseType.find({ id: { $regex: /^casetype\d+$/i } }, { id: 1 }).lean();
    const maxN = existing.reduce((max: number, d: any) => {
      const m = /^casetype(\d+)$/i.exec(String(d.id ?? ""));
      const n = m ? Number(m[1]) : 0;
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0);
    const nextId = `casetype${maxN + 1}`;
    const actor = (req as any).user;
    const createdBy = actor
      ? { id: actor.id, name: actor.name, email: actor.email, role: actor.role }
      : undefined;
    const caseType = await CaseType.create({
      id: nextId,
      name,
      description,
      category,
      createdBy,
      updatedBy: createdBy,
    });
    res.status(201).json({ success: true, data: caseType });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCaseType = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = (req as any).user;
    const updatedBy = actor
      ? { id: actor.id, name: actor.name, email: actor.email, role: actor.role }
      : undefined;

    const existing = await CaseType.findById(req.params.id);
    if (!existing) { res.status(404).json({ success: false, message: "Case type not found" }); return; }

    const update: any = { ...req.body, updatedBy };
    if (Object.prototype.hasOwnProperty.call(req.body, "isActive") && req.body.isActive !== existing.isActive) {
      update.statusUpdatedBy = updatedBy;
      update.statusUpdatedAt = new Date();
    }

    const caseType = await CaseType.findByIdAndUpdate(req.params.id, update, { new: true });
    res.status(200).json({ success: true, data: caseType });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCaseType = async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await CaseType.findById(req.params.id);
    if (!existing) { res.status(404).json({ success: false, message: "Case type not found" }); return; }

    await CaseType.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Case type deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTS & ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════

export const getReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const { months = 6, period } = req.query;
    const monthsNum = parseInt(months as string);

    // Date filter from period
    const dateFilter = getDateFilter(period as string);

    // Station filter from role
    const stationFilter = await getGrievanceScopeFilter((req as any).user);

    // Base filter combining both
    const baseFilter = { isDeleted: false, ...stationFilter, ...dateFilter };

    // Start date for monthly chart
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsNum);
    const monthlyFilter = {
      createdAt: { $gte: startDate },
      isDeleted: false,
      ...stationFilter,
    };

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Monthly received vs resolved
    const monthly = await Grievance.aggregate([
      { $match: monthlyFilter },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          received:  { $sum: 1 },
          resolved:  { $sum: { $cond: [{ $eq: ["$status", "resolved"]  }, 1, 0] } },
          pending:   { $sum: { $cond: [{ $eq: ["$status", "pending"]   }, 1, 0] } },
          escalated: { $sum: { $cond: [{ $eq: ["$status", "escalated"] }, 1, 0] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // SLA compliance
    const slaCompliance = await Grievance.aggregate([
      { $match: { ...stationFilter, ...dateFilter, status: "resolved", resolvedAt: { $exists: true }, isDeleted: false } },
      {
        $project: {
          month: { $month: "$createdAt" },
          year:  { $year:  "$createdAt" },
          daysToResolve: {
            $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 1000 * 60 * 60 * 24],
          },
        },
      },
      {
        $group: {
          _id: { year: "$year", month: "$month" },
          total:     { $sum: 1 },
          withinSLA: { $sum: { $cond: [{ $lte: ["$daysToResolve", 15] }, 1, 0] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Station performance
    const stationPerf = await Grievance.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id:      "$stationName",
          total:    { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
          pending:  { $sum: { $cond: [{ $eq: ["$status", "pending"]  }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Case type distribution
    const typeDistribution = await Grievance.aggregate([
      { $match: baseFilter },
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Overall totals — filtered by period + station
    const [totalGrievances, totalResolved, totalPending, totalEscalated, totalOfficers, totalStations] = await Promise.all([
      Grievance.countDocuments(baseFilter),
      Grievance.countDocuments({ ...baseFilter, status: "resolved"  }),
      Grievance.countDocuments({ ...baseFilter, status: "pending"   }),
      Grievance.countDocuments({ ...baseFilter, status: "escalated" }),
      Officer.countDocuments({ status: "active" }),
      Station.countDocuments({ isActive: true }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: { totalGrievances, totalResolved, totalPending, totalEscalated, totalOfficers, totalStations },
        monthly: monthly.map((m) => ({
          month:     monthNames[m._id.month - 1],
          year:      m._id.year,
          received:  m.received,
          resolved:  m.resolved,
          pending:   m.pending,
          escalated: m.escalated,
        })),
        slaCompliance: slaCompliance.map((s) => ({
          month:    monthNames[s._id.month - 1],
          sla:      Math.round((s.withinSLA / s.total) * 100),
          total:    s.total,
          withinSLA: s.withinSLA,
        })),
        stationPerformance: stationPerf.map((s) => ({
          station:  s._id,
          total:    s.total,
          resolved: s.resolved,
          pending:  s.pending,
          rate:     s.total > 0 ? Math.round((s.resolved / s.total) * 100) : 0,
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

    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(100).lean();
    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      recipientType: userRole === "user" ? "user" : "admin",
      isRead: false,
    });

    res.status(200).json({ success: true, data: notifications, unreadCount });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markNotificationRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const recipientType = userRole === "user" ? "user" : "admin";
    const { id } = req.params;
    if (id === "all") {
      await Notification.updateMany({ recipientId: userId, recipientType }, { isRead: true });
      res.status(200).json({ success: true, message: "All notifications marked as read" });
    } else {
      const notification = await Notification.findOneAndUpdate(
        { _id: id, recipientId: userId, recipientType },
        { isRead: true },
        { new: true }
      );
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


// ═══════════════════════════════════════════════════════════════════════════════
// Get Categories
// ═══════════════════════════════════════════════════════════════════════════════

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    // Auto-seed categories if none exist
    const count = await Category.countDocuments();
    if (count === 0) {
      const defaultCategories = [
        { name: "Identity & Personal", isActive: true },
        { name: "Pension & Financial", isActive: true },
        { name: "Family Details", isActive: true },
        { name: "Requests & Tracking", isActive: true },
      ];
      const inserted = await Category.insertMany(defaultCategories);
      
      // Fix orphaned CaseTypes based on known names
      const categoryByName = Object.fromEntries(inserted.map(c => [c.name, c._id]));
      const caseTypeMapping: Record<string, string> = {
        "Update Name": "Identity & Personal",
        "Update Aadhaar & PAN": "Identity & Personal",
        "Update Mobile & Email": "Identity & Personal",
        "Update Address": "Identity & Personal",
        "Resolve Pension Issues": "Pension & Financial",
        "Stop FMA": "Pension & Financial",
        "Monthly Pay Slip": "Pension & Financial",
        "Pension Payment Order": "Pension & Financial",
        "Add Nominee": "Family Details",
        "Update DOB of Spouse": "Family Details",
        "Update Spouse Details": "Family Details",
        "Add/Update Family Details": "Family Details",
        "Death Intimation": "Requests & Tracking",
        "Grievance for Increment": "Requests & Tracking",
        "Track Case Status": "Requests & Tracking",
        "SMS / Portal Alerts": "Requests & Tracking",
        "Medical Certificate": "Requests & Tracking"
      };

      const allCaseTypes = await CaseType.find();
      for (const ct of allCaseTypes) {
        const catName = caseTypeMapping[ct.name] || "Identity & Personal";
        ct.category = categoryByName[catName];
        await ct.save();
      }
    }

    const { status } = req.query;
    const filter: any = {};
    if (status !== "all") {
      filter.isActive = { $ne: false };
    }
    const categories = await Category.find(filter).sort({ name: 1 }).lean();
    res.status(200).json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, isActive } = req.body;
    if (!name) { res.status(400).json({ success: false, message: "name is required" }); return; }

    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) { res.status(400).json({ success: false, message: "Category with this name already exists" }); return; }

    const category = await Category.create({
      name: String(name).trim(),
      isActive: isActive !== undefined ? isActive === true || isActive === "true" : true,
    });

    const file = (req as any).file as Express.Multer.File | undefined;
    if (file) {
      const stored = await storeCategoryIcon(file.buffer, `${category._id}-icon`, file.mimetype);
      category.iconUrl = stored.url;
      await category.save();
    }

    res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await Category.findById(req.params.id);
    if (!existing) { res.status(404).json({ success: false, message: "Category not found" }); return; }

    const update: Record<string, unknown> = {};
    if (req.body.name !== undefined) update.name = String(req.body.name).trim();
    if (req.body.isActive !== undefined) {
      update.isActive = req.body.isActive === true || req.body.isActive === "true";
    }

    if (Object.keys(update).length === 0) {
      res.status(200).json({ success: true, data: existing });
      return;
    }

    const category = await Category.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    res.status(200).json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadCategoryIcon = async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await Category.findById(req.params.id);
    if (!existing) { res.status(404).json({ success: false, message: "Category not found" }); return; }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ success: false, message: "icon file is required" });
      return;
    }

    if (existing.iconUrl) await removeCategoryIcon(existing.iconUrl);
    const stored = await storeCategoryIcon(file.buffer, `${existing._id}-icon`, file.mimetype);
    existing.iconUrl = stored.url;
    await existing.save();

    res.status(200).json({ success: true, data: existing });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const removeCategoryIconHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await Category.findById(req.params.id);
    if (!existing) { res.status(404).json({ success: false, message: "Category not found" }); return; }

    if (existing.iconUrl) {
      await removeCategoryIcon(existing.iconUrl);
      existing.iconUrl = undefined;
      await existing.save();
    }

    res.status(200).json({ success: true, data: existing });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const getPushConfig = async (_req: Request, res: Response): Promise<void> => {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() || "";
    const configured = Boolean(publicKey && process.env.VAPID_PRIVATE_KEY?.trim());
    res.status(200).json({
      success: true,
      data: { publicKey, configured },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPushStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { getPushDevices } = await import("../services/pushDeviceService");
    const userId = (req as any).user.id;
    const userType = (req as any).user.role === "user" ? "user" : "admin";

    const devices = await getPushDevices(userId, userType);

    res.status(200).json({
      success: true,
      data: {
        count: devices.length,
        configured: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
        storedIn: userType === "user" ? "users" : "officers",
        devices: devices.map((d, i) => ({
          id: d._id || i,
          endpointPreview: d.endpoint.slice(0, 48) + "…",
          userAgent: d.userAgent || "Unknown device",
          registeredAt: d.lastSyncedAt,
          lastSyncedAt: d.lastSyncedAt,
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const subscribeToPushNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { registerPushDevice } = await import("../services/pushDeviceService");
    const { subscription, userAgent } = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const userType = userRole === "user" ? "user" : "admin";

    if (!subscription || !subscription.endpoint) {
      res.status(400).json({ success: false, message: "Invalid subscription object" });
      return;
    }
    if (!subscription.keys?.p256dh || !subscription.keys?.auth) {
      res.status(400).json({ success: false, message: "Invalid subscription keys" });
      return;
    }

    const devices = await registerPushDevice(userId, userType, {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      userAgent: userAgent || (req.headers["user-agent"] as string) || undefined,
    });

    res.status(200).json({
      success: true,
      message: `Device saved on ${userType === "user" ? "veteran profile" : "officer profile"}`,
      data: {
        count: devices.length,
        endpointPreview: subscription.endpoint.slice(0, 48) + "…",
        storedIn: userType === "user" ? "users" : "officers",
      },
    });
  } catch (error: any) {
    console.error("Push subscription error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendTestPushNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { getPushDevices, removePushDevice } = await import("../services/pushDeviceService");
    const { sendPushNotification } = await import("../utils/webPush");
    const userId = (req as any).user.id;
    const userType = (req as any).user.role === "user" ? "user" : "admin";

    const subscriptions = await getPushDevices(userId, userType);
    
    if (!subscriptions.length) {
      res.status(404).json({ success: false, message: "No push subscriptions found for this user." });
      return;
    }

    let successCount = 0;
    for (const sub of subscriptions) {
      const subscription = { endpoint: sub.endpoint, keys: sub.keys };
      const success = await sendPushNotification(subscription, {
        title: "Test Notification",
        body: "This is a test push notification from Vitric ESM.",
        icon: "/Logo.svg",
        url: "/notifications",
      });
      if (success) successCount++;
      else {
        await removePushDevice(userId, userType, sub.endpoint).catch(() => undefined);
      }
    }

    res.status(200).json({ 
      success: true, 
      message: `Sent test notification to ${successCount} out of ${subscriptions.length} devices.` 
    });
  } catch (error: any) {
    console.error("Test push error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
