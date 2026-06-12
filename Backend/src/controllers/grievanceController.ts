import { Request, Response } from "express";
import mongoose from "mongoose";
import Grievance from "../models/Grievance";
import Escalation from "../models/Escalation";
import Notification from "../models/Notification";
import Station from "../models/Station";
import CaseType from "../models/CaseType";
import Officer from "../models/Officer";
import QRCode from "../models/QRCode";
import { getGrievanceScopeFilter } from "../utils/scopeFilter";
import { storeUploadedBuffer } from "../services/storageService";

// ─── Helper: get date filter ─────────────────────────────────────────────────
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
    case "this_year":
      from = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      return {};
  }
  return { createdAt: { $gte: from } };
};

// ─── GET all grievances (with search + filter + pagination) ──────────────────
export const getGrievances = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1, limit = 10, search = "",
      status, priority, station, type, officer,
      sortBy = "createdAt", sortOrder = "desc",
      startDate, endDate,
    } = req.query;

    const stationFilter = await getGrievanceScopeFilter((req as any).user);
    const query: any = { isDeleted: false, ...stationFilter };

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
    // Only allow station filter override for super_admin
    if (station && (req as any).user?.role === "super_admin") {
    query.stationName = { $regex: station, $options: "i" };
    }
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
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
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
    if (!grievance) { res.status(404).json({ success: false, message: "Grievance not found" }); return; }
    res.status(200).json({ success: true, data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CREATE grievance ────────────────────────────────────────────────────────
import VeteranRequiredDocumentUpload from "../models/VeteranRequiredDocumentUpload";

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

    const slaDeadline = new Date();
    slaDeadline.setDate(slaDeadline.getDate() + 15);

    const userId = (req as any).user?.role === "user" ? (req as any).user.id : undefined;
    const grievanceId = `GRV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // ── Build createdBy string ─────────────────────────────────────────────
    const currentUser = (req as any).user;
    let createdBy = "";
    if (currentUser?.role === "user") {
      // Veteran: show name + phone or armyNo
      const identifier = veteranPhone || veteranArmyNo || currentUser.id;
      createdBy = `${veteranName} (${identifier})`;
    } else {
      // Admin / Officer: show email + id
      const adminEmail = currentUser?.email || currentUser?.name || "Admin";
      createdBy = `${adminEmail} (${currentUser?.id || "unknown"})`;
    }
    
    const files = req.files as Express.Multer.File[];
    const attachments: string[] = [];

    if (files && files.length > 0) {
      const grievanceFolder = userId
        ? `grievances/attachments/${userId}`
        : `grievances/attachments/anonymous`;

      for (const file of files) {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const stored = await storeUploadedBuffer(file.buffer, {
          folder: grievanceFolder,
          fileName: `${file.fieldname}-${uniqueSuffix}`,
          mimetype: file.mimetype,
        });
        attachments.push(stored.url);
      }
    }

    // ── Fetch pre-uploaded documents ───────────────────────────────────────
    let uploads: any[] = [];
    if (userId) {
      uploads = await VeteranRequiredDocumentUpload.find({
        userId,
        caseTypeName: type,
        grievanceId: { $exists: false },
      });
      for (const upload of uploads) {
        attachments.push(upload.storedPath);
      }
    }

    const grievance = await Grievance.create({
      grievanceId, type, veteranName, veteranPhone, veteranArmyNo, veteranRank,
      stationName, officerName: officerName || "Unassigned",
      priority: priority || "medium",
      description,
      attachments,
      createdBy,
      submissionSource: submissionSource || "portal",
      slaDeadline, userId,
      timeline: [{ status: "pending", note: "Grievance submitted", updatedBy: veteranName, updatedAt: new Date(), attachments }],
    });

    // ── Assign grievanceId to pre-uploaded documents ───────────────────────
    if (uploads.length > 0) {
      await VeteranRequiredDocumentUpload.updateMany(
        { _id: { $in: uploads.map((u) => u._id) } },
        { $set: { grievanceId: grievance._id } }
      );
    }

    if (userId) {
      await Notification.create({
        recipientId: userId, recipientType: "user",
        title: "Grievance Submitted",
        message: `Your grievance ${grievanceId} has been submitted successfully`,
        type: "grievance_update",
        grievanceId: grievance._id, grievanceCode: grievanceId,
      });
    }

    await Station.findOneAndUpdate(
      { name: { $regex: stationName, $options: "i" } },
      { $inc: { totalCases: 1 } }
    );
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
      res.status(400).json({ success: false, message: "Invalid status" }); return;
    }

    const grievance = await Grievance.findOne({
      $or: [
        { _id: mongoose.isValidObjectId(req.params.id) ? req.params.id : null },
        { grievanceId: (req.params.id as string).toUpperCase() },
      ],
      isDeleted: false,
    });

    if (!grievance) { res.status(404).json({ success: false, message: "Grievance not found" }); return; }

    const oldStatus = grievance.status;
    grievance.status = status;
    grievance.timeline.push({
      status,
      note: note || `Status updated to ${status}`,
      updatedBy: officerName || (req as any).user?.name || "System",
      updatedAt: new Date(),
    });

    if (status === "resolved") {
      grievance.resolvedAt = new Date();
      await CaseType.findOneAndUpdate({ name: grievance.type }, { $inc: { resolvedCases: 1, pendingCases: -1 } });
      await Station.findOneAndUpdate(
        { name: { $regex: grievance.stationName, $options: "i" } },
        { $inc: { resolvedCases: 1 } }
      );
    }

    if (status === "escalated" && oldStatus !== "escalated") {
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

    if (grievance.userId) {
      await Notification.create({
        recipientId: grievance.userId, recipientType: "user",
        title: "Grievance Update",
        message: `Your grievance ${grievance.grievanceId} status changed to ${status}`,
        type: "grievance_update",
        grievanceId: grievance._id, grievanceCode: grievance.grievanceId,
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
        officerId, officerName, status: "in-progress",
        $push: { timeline: { status: "in-progress", note: `Assigned to ${officerName}`, updatedBy: "Admin", updatedAt: new Date() } },
      },
      { new: true }
    );
    if (!grievance) { res.status(404).json({ success: false, message: "Grievance not found" }); return; }
    res.status(200).json({ success: true, message: "Officer assigned", data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ADD comment ─────────────────────────────────────────────────────────────
export const addComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, authorName, authorRole } = req.body;
    if (!message && (!req.files || (req.files as any[]).length === 0)) {
      res.status(400).json({ success: false, message: "Message or attachments required" });
      return;
    }

    const grievance = await Grievance.findOne({
      $or: [
        { _id: mongoose.isValidObjectId(req.params.id) ? req.params.id : null },
        { grievanceId: (req.params.id as string).toUpperCase() },
      ],
      isDeleted: false,
    });
    if (!grievance) { res.status(404).json({ success: false, message: "Grievance not found" }); return; }

    const files = req.files as Express.Multer.File[];
    const attachments: string[] = [];

    if (files && files.length > 0) {
      const uploadDir = path.join(__dirname, "../../uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      for (const file of files) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        if (file.mimetype === "application/pdf") {
          const filename = file.fieldname + "-" + uniqueSuffix + ".pdf";
          await fs.promises.writeFile(path.join(uploadDir, filename), file.buffer);
          attachments.push(`/uploads/${filename}`);
        } else {
          const filename = file.fieldname + "-" + uniqueSuffix + ".webp";
          await sharp(file.buffer)
            .webp({ quality: 80 })
            .toFile(path.join(uploadDir, filename));
          attachments.push(`/uploads/${filename}`);
        }
      }
    }

    grievance.comments.push({
      authorId: (req as any).user?.id,
      authorName: authorName || (req as any).user?.name || "Unknown",
      authorRole: authorRole || (req as any).user?.role || "user",
      message: message || "(attachment)",
      attachments,
      createdAt: new Date(),
    });
    await grievance.save();
    res.status(200).json({ success: true, message: "Comment added", data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE (soft-delete) ────────────────────────────────────────────────────
export const deleteGrievance = async (req: Request, res: Response): Promise<void> => {
  try {
    const grievance = await Grievance.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
    if (!grievance) { res.status(404).json({ success: false, message: "Grievance not found" }); return; }
    res.status(200).json({ success: true, message: "Grievance deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET my grievances (veteran) ─────────────────────────────────────────────
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

// ─── TRACK grievance (public) ────────────────────────────────────────────────
export const trackGrievance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const grievance = await Grievance.findOne({
      $or: [
        { grievanceId: (id as string).toUpperCase() },
        { _id: mongoose.isValidObjectId(id) ? id : null },
      ],
      isDeleted: false,
    }).select("grievanceId type veteranName veteranRank veteranArmyNo stationName officerName status priority timeline description comments attachments createdAt resolvedAt");

    if (!grievance) { res.status(404).json({ success: false, message: "Grievance not found. Check your complaint ID." }); return; }
    res.status(200).json({ success: true, data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DASHBOARD stats ─────────────────────────────────────────────────────────
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period } = req.query;

    // Role-based station filter
    const stationFilter = await getGrievanceScopeFilter((req as any).user);

    // Date filter from period param
    const dateFilter = getDateFilter(period as string);

    // Combined base filter
    const baseFilter = { isDeleted: false, ...stationFilter, ...dateFilter };

    const [total, pending, inProgress, escalated, resolved] = await Promise.all([
      Grievance.countDocuments(baseFilter),
      Grievance.countDocuments({ ...baseFilter, status: "pending" }),
      Grievance.countDocuments({ ...baseFilter, status: "in-progress" }),
      Grievance.countDocuments({ ...baseFilter, status: "escalated" }),
      Grievance.countDocuments({ ...baseFilter, status: "resolved" }),
    ]);

    // Monthly data (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyGrievances = await Grievance.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, isDeleted: false, ...stationFilter } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          received: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const byType = await Grievance.aggregate([
      { $match: { ...baseFilter } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const byStation = await Grievance.aggregate([
      { $match: { ...baseFilter } },
      { $group: { _id: "$stationName", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const recent = await Grievance.find(baseFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .select("grievanceId type veteranName stationName status createdAt");

      // Dynamic counts
      const [stationCount, officerCount, activeQRCount] = await Promise.all([
      Station.countDocuments({ isActive: true }),
      Officer.countDocuments({ status: "active" }),
      QRCode.countDocuments({ status: "active" }), ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    res.status(200).json({
      success: true,
      data: {
        stats: { total, pending, inProgress, escalated, resolved },
        counts: { stations: stationCount, officers: officerCount, activeQR: activeQRCount }, // ← add this
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

// ─── DELETE ALL ───────────────────────────────────────────────────────────────
export const deleteAllGrievances = async (_req: Request, res: Response): Promise<void> => {
  try {
    await Grievance.deleteMany({});
    await Escalation.deleteMany({});
    await Notification.deleteMany({});
    res.status(200).json({ success: true, message: "All grievances, escalations and notifications deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};