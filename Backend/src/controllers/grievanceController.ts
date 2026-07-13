import { Request, Response } from "express";
import { detectAndTranslateToOpposite } from "../services/translateService";
import mongoose from "mongoose";
import Grievance from "../models/Grievance";
import Escalation from "../models/Escalation";
import Notification from "../models/Notification";
import Station from "../models/Station";
import CaseType from "../models/CaseType";
import CaseTypeRequiredDocuments from "../models/CaseTypeRequiredDocuments";
import Officer from "../models/Officer";
import User from "../models/User";
import QRCode from "../models/QRCode";
import { getGrievanceScopeFilter } from "../utils/scopeFilter";
import { storeUploadedBuffer, storeConcernAttachment } from "../services/storageService";
import {
  enrichGrievanceWithDocuments,
  reuploadGrievanceDocument,
  isValidObjectId,
  getChecklistContext,
  validateMandatoryDraftUploads,
  validateMandatoryFilesByLabel,
  persistRequiredDocumentsForGrievance,
  parseRequiredDocumentUploads,
  parseGrievanceUploadFiles,
  resolveDraftUploadsForGrievance,
} from "../services/grievanceDocuments";
import {
  effectiveConcernStatus,
  isConcernBlocking,
  concernStatusLabel,
} from "../services/concernWorkflow";
import {
  parseDocumentUploadIds,
  getConcernDocumentsFromComment,
  concernNeedsGeneral,
  concernNeedsDocuments,
  resolveOfficerConcernScope,
  formatConcernDocumentLabels,
  type ConcernDocumentItem,
} from "../services/concernHelpers";
import { assignStationL1ForGrievance, findOfficerAtOrgTier, resolveStationOrg } from "../services/grievanceOfficerResolver";
import { createEscalationRecord } from "../utils/escalationId";
import { findGrievanceByParamId } from "../utils/grievanceLookup";
import { computeDeadlineForOrgTier, getSlaConfigForCaseType } from "../services/slaConfigService";
import {
  escalateGrievanceToLevel,
  escalateGrievanceToOrgTier,
  buildOrgFromGrievance,
  nextOrgTier,
  REASON_LABELS,
  ORG_TIER_LABELS,
  EscalationReasonType,
} from "../services/slaEscalationService";
import { assertCanActOnGrievance } from "../services/grievanceActionGuard";
import { OrgTier } from "../constants/orgTiers";
import { notifyOfficer, notifyVeteran } from "../services/notificationService";
import { OfficerLevel } from "../constants/officerLevels";
import VeteranRequiredDocumentUpload from "../models/VeteranRequiredDocumentUpload";
import { serveStoredFile } from "../services/storageResolver";

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
    const obj = grievance.toObject();
    obj.concernStatus = effectiveConcernStatus(obj);
    const data = await enrichGrievanceWithDocuments(obj);
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Helper: normalize veteran mobile ────────────────────────────────────────
function normalizeVeteranPhone(phone?: string): string {
  return String(phone || "").replace(/\D/g, "").slice(-10);
}

// ─── CREATE grievance ────────────────────────────────────────────────────────
export const createGrievance = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      type, veteranName, veteranPhone, veteranArmyNo, veteranRank,
      stationName, stationId: stationIdRaw, officerName, priority, description, submissionSource,
      caseTypeId,
    } = req.body;

    const currentUser = (req as any).user;
    const isVeteran = currentUser?.role === "user";

    let resolvedType = String(type || "").trim();
    let resolvedName = String(veteranName || "").trim();
    let resolvedStation = String(stationName || "").trim();
    let resolvedPhone = normalizeVeteranPhone(veteranPhone);

    const stationIdStr = String(stationIdRaw || "").trim();
    if (stationIdStr && mongoose.isValidObjectId(stationIdStr)) {
      const stationDoc = await Station.findOne({ _id: stationIdStr, isActive: true }).lean();
      if (!stationDoc) {
        res.status(400).json({ success: false, message: "Selected Station HQ was not found. Please refresh and try again." });
        return;
      }
      resolvedStation = stationDoc.name;
    }

    if (isVeteran) {
      if (!resolvedPhone && currentUser?.phone) resolvedPhone = normalizeVeteranPhone(currentUser.phone);
      if (!resolvedName) {
        resolvedName = resolvedPhone ? `Veteran (${resolvedPhone})` : "Veteran";
      }
    }

    const isManualAdmin = !isVeteran && String(submissionSource || "").trim() === "manual";

    if (isManualAdmin && !resolvedPhone) {
      res.status(400).json({
        success: false,
        message: "Veteran mobile number is required so the grievance appears in their account.",
      });
      return;
    }

    if (isManualAdmin && resolvedPhone.length !== 10) {
      res.status(400).json({
        success: false,
        message: "Enter a valid 10-digit veteran mobile number.",
      });
      return;
    }

    const fieldErrors: string[] = [];
    if (!resolvedType) fieldErrors.push("Please select a service type for your grievance.");
    if (!resolvedName) fieldErrors.push("Your name is required — add it in Profile or contact support.");
    if (!resolvedStation) fieldErrors.push("Please select your Station HQ before submitting.");

    if (fieldErrors.length > 0) {
      res.status(400).json({ success: false, message: fieldErrors.join(" ") });
      return;
    }

    const checklistCtx = await getChecklistContext(
      caseTypeId && mongoose.isValidObjectId(String(caseTypeId)) ? String(caseTypeId) : undefined,
      resolvedType
    );

    const { attachmentFiles, requiredDocumentFiles } = parseGrievanceUploadFiles(
      req.files as
        | Express.Multer.File[]
        | { attachments?: Express.Multer.File[]; requiredDocuments?: Express.Multer.File[] }
        | undefined
    );
    const requiredFilesByLabel = parseRequiredDocumentUploads(
      req.files as
        | Express.Multer.File[]
        | { attachments?: Express.Multer.File[]; requiredDocuments?: Express.Multer.File[] }
        | undefined,
      req.body.requiredDocumentLabels
    );
    if (requiredDocumentFiles.length > 0 && requiredFilesByLabel.size === 0) {
      requiredDocumentFiles.forEach((file, index) => {
        requiredFilesByLabel.set(`DOC-${index + 1}`, file);
      });
    }

    // Enforce only admin-marked mandatory documents; optional docs may be skipped.
    if (isVeteran && checklistCtx?.mandatoryLabels.length) {
      const mandatoryCheck = await validateMandatoryDraftUploads(
        currentUser.id,
        checklistCtx.caseType._id.toString(),
        resolvedType
      );
      if (!mandatoryCheck.ok) {
        res.status(400).json({
          success: false,
          message: `Please upload mandatory documents: ${mandatoryCheck.missing.join(", ")}`,
        });
        return;
      }
    }

    if (isManualAdmin && checklistCtx?.mandatoryLabels.length) {
      const mandatoryCheck = validateMandatoryFilesByLabel(
        checklistCtx.mandatoryLabels,
        requiredFilesByLabel
      );
      if (!mandatoryCheck.ok) {
        res.status(400).json({
          success: false,
          message: `Please upload mandatory documents: ${mandatoryCheck.missing.join(", ")}`,
        });
        return;
      }
    }

    const slaConfig = await getSlaConfigForCaseType(
      caseTypeId && mongoose.isValidObjectId(String(caseTypeId)) ? String(caseTypeId) : undefined
    );
    const now = new Date();
    const slaTierDeadline = computeDeadlineForOrgTier(slaConfig, "station", now);
    const { org, officer: l1Officer } = await assignStationL1ForGrievance(resolvedStation);

    let assignedOfficer = l1Officer;
    if (isManualAdmin && officerName && String(officerName).trim()) {
      const manualOfficerQuery: Record<string, unknown> = {
        name: String(officerName).trim(),
        role: "Station HQ Officer",
      };
      if (org?.stationId) manualOfficerQuery.station = org.stationId;
      else manualOfficerQuery.stationName = { $regex: `^${resolvedStation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" };

      const manualOfficer = await Officer.findOne(manualOfficerQuery);
      if (manualOfficer) assignedOfficer = manualOfficer;
    }

    const userId = isVeteran ? currentUser.id : undefined;
    let linkedVeteranUserId = userId;
    let linkedVeteran: InstanceType<typeof User> | null = null;

    if (isManualAdmin) {
      linkedVeteran = await User.findOne({ phone: resolvedPhone, isActive: true });
      if (!linkedVeteran) {
        res.status(400).json({
          success: false,
          message: "No veteran account found for this mobile number. Ask the veteran to register in the app first.",
        });
        return;
      }
      linkedVeteranUserId = linkedVeteran._id.toString();
      if (!resolvedName || resolvedName === "Veteran") {
        resolvedName = linkedVeteran.name || `${veteranRank || linkedVeteran.rank || ""} ${resolvedPhone}`.trim();
      }
    }

    const grievanceId = `GRV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // ── Build createdBy string ─────────────────────────────────────────────
    let createdBy = "";
    if (isVeteran) {
      const identifier = resolvedPhone || veteranArmyNo || currentUser.id;
      createdBy = `${resolvedName} (veteran · ${identifier})`;
    } else if (isManualAdmin) {
      const adminLabel = currentUser?.email || currentUser?.name || "Admin";
      createdBy = `${adminLabel} (admin) on behalf of ${resolvedName} (${resolvedPhone})`;
    } else {
      const adminLabel = currentUser?.email || currentUser?.name || "Admin";
      createdBy = `${adminLabel} (admin)`;
    }

    const submittedBy: "admin" | "veteran" = isVeteran ? "veteran" : "admin";
    
    const files = attachmentFiles;
    const attachments: string[] = [];

    if (files && files.length > 0) {
      const grievanceFolder = linkedVeteranUserId
        ? `grievances/attachments/${linkedVeteranUserId}`
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

    // ── Fetch pre-uploaded documents (only those explicitly submitted with this grievance) ──
    let uploads: any[] = [];
    if (linkedVeteranUserId) {
      const hasExplicitUploadIds = Object.prototype.hasOwnProperty.call(req.body, "documentUploadIds");
      const explicitUploadIds = hasExplicitUploadIds ? parseDocumentUploadIds(req.body) : undefined;

      uploads = await resolveDraftUploadsForGrievance({
        userId: linkedVeteranUserId,
        caseTypeId: caseTypeId && mongoose.isValidObjectId(String(caseTypeId)) ? String(caseTypeId) : undefined,
        caseTypeName: resolvedType,
        documentUploadIds: explicitUploadIds,
        isManualAdmin,
      });
      for (const upload of uploads) {
        attachments.push(upload.storedPath);
      }
    }

    // ── Translate description (veteran → English for admin) ──────────────────
    let translationData: {
      originalText?: string;
      translatedText?: string;
      language?: string;
      translationFailed?: boolean;
    } = {};
      if (description && String(description).trim()) {
        const xlat = await detectAndTranslateToOpposite(String(description).trim());
      translationData = {
        originalText: xlat.originalText,
        translatedText: xlat.translatedText,
        language: xlat.language,
        translationFailed: xlat.translationFailed,
      };
    }

    const grievance = await Grievance.create({
      grievanceId,
      type: resolvedType,
      caseTypeId:
        caseTypeId && mongoose.isValidObjectId(String(caseTypeId))
          ? caseTypeId
          : undefined,
      veteranName: resolvedName,
      veteranPhone: resolvedPhone || veteranPhone,
      veteranArmyNo,
      veteranRank,
      stationName: org?.stationName || resolvedStation,
      stationId: org?.stationId,
      hqId: org?.hqId,
      stateId: org?.stateId,
      officerId: assignedOfficer?._id,
      officerName: assignedOfficer?.name || officerName || "Unassigned",
      assignedLevel: "L1",
      assignedOrgTier: "station",
      priority: priority || "medium",
      description,
      attachments,
      createdBy,
      submittedBy,
      submissionSource: submissionSource || (isVeteran ? "portal" : "manual"),
      ...(slaTierDeadline ? { slaDeadline: slaTierDeadline, slaTierDeadline } : {}),
      userId: linkedVeteranUserId,
      ...translationData,
      timeline: [{
        status: "pending",
        note: isManualAdmin
          ? assignedOfficer
            ? `Grievance filed by admin on behalf of veteran and assigned to ${assignedOfficer.name}`
            : "Grievance filed by admin on behalf of veteran"
          : assignedOfficer
            ? `Grievance submitted and assigned to Station HQ L1 officer ${assignedOfficer.name}`
            : "Grievance submitted — no Station HQ L1 officer found",
        updatedBy: isManualAdmin
          ? (currentUser?.name || currentUser?.email || "Admin")
          : resolvedName,
        updatedAt: now,
        attachments,
        eventType: "status",
        ...(translationData.originalText !== undefined ? {
          originalText: translationData.originalText,
          translatedText: translationData.translatedText,
          language: translationData.language,
          translationFailed: translationData.translationFailed,
        } : {}),
      }],
    });

    // ── Assign grievanceId to pre-uploaded documents ───────────────────────
    if (uploads.length > 0) {
      await VeteranRequiredDocumentUpload.updateMany(
        { _id: { $in: uploads.map((u) => u._id) } },
        { $set: { grievanceId: grievance._id } }
      );
    }

    if (isManualAdmin && checklistCtx && requiredFilesByLabel.size > 0) {
      const manualDocUrls = await persistRequiredDocumentsForGrievance({
        grievance,
        ctx: checklistCtx,
        filesByLabel: requiredFilesByLabel,
        uploadedByUserId: linkedVeteranUserId || currentUser.id,
        veteranKey: linkedVeteran ? `veteran-${linkedVeteran.phone}` : `admin-manual-${currentUser.id}`,
      });
      if (manualDocUrls.length > 0) {
        grievance.attachments = [...(grievance.attachments || []), ...manualDocUrls];
        await grievance.save();
      }
    }

    if (linkedVeteranUserId) {
      await notifyVeteran(linkedVeteranUserId, {
        title: isManualAdmin ? "Grievance filed on your behalf" : "Grievance Submitted",
        message: isManualAdmin
          ? `Grievance ${grievanceId} was filed for you by admin. You can track it in My Complaints.`
          : `Your grievance ${grievanceId} has been submitted successfully`,
        type: "grievance_update",
        grievanceId: grievance._id,
        grievanceCode: grievanceId,
        url: "/user/track-case",
      });
    }

    if (assignedOfficer?._id) {
      await notifyOfficer(assignedOfficer._id, {
        title: "New grievance assigned",
        message: `${grievanceId} from ${veteranName} at ${stationName}. Please review and take action.`,
        type: "assignment",
        grievanceId: grievance._id,
        grievanceCode: grievanceId,
        url: "/grievances",
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

    const authUser = (req as any).user;
    const actErr = assertCanActOnGrievance(authUser, grievance);
    if (actErr) {
      res.status(403).json({ success: false, message: actErr });
      return;
    }

    const concernStatus = effectiveConcernStatus(grievance);
    if (isConcernBlocking(concernStatus)) {
      res.status(400).json({
        success: false,
        message: `Cannot update status while a concern is open (${concernStatusLabel(concernStatus)}). Resolve the concern first.`,
      });
      return;
    }

    const oldStatus = grievance.status;
    grievance.status = status;
    grievance.timeline.push({
      status,
      note: note || `Status updated to ${status}`,
      updatedBy: officerName || (req as any).user?.name || "System",
      updatedAt: new Date(),
      eventType: "status",
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
      await createEscalationRecord({
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
      await notifyVeteran(grievance.userId, {
        title: "Grievance Update",
        message: `Your grievance ${grievance.grievanceId} status changed to ${status}`,
        type: "grievance_update",
        grievanceId: grievance._id,
        grievanceCode: grievance.grievanceId,
        url: "/user/track-case",
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
    const grievance = await Grievance.findById(req.params.id);
    if (!grievance) { res.status(404).json({ success: false, message: "Grievance not found" }); return; }

    const concernStatus = effectiveConcernStatus(grievance);
    if (isConcernBlocking(concernStatus)) {
      res.status(400).json({
        success: false,
        message: `Cannot assign officer while a concern is open (${concernStatusLabel(concernStatus)}). Resolve the concern first.`,
      });
      return;
    }

    let resolvedOfficer =
      officerId && mongoose.isValidObjectId(officerId)
        ? await Officer.findOne({ _id: officerId, status: "active" })
        : null;
    if (!resolvedOfficer && officerName) {
      resolvedOfficer = await Officer.findOne({ name: officerName, status: "active" });
    }

    if (!resolvedOfficer) {
      res.status(400).json({ success: false, message: "Valid active officer is required" });
      return;
    }

    grievance.officerId = resolvedOfficer._id;
    grievance.officerName = resolvedOfficer.name;
    grievance.status = "in-progress";
    grievance.timeline.push({
      status: "in-progress",
      note: `Assigned to ${resolvedOfficer.name}`,
      updatedBy: (req as any).user?.name || "Admin",
      updatedAt: new Date(),
      eventType: "status",
    });
    await grievance.save();

    await notifyOfficer(resolvedOfficer._id, {
      title: "Grievance assigned to you",
      message: `${grievance.grievanceId} has been assigned to you. Please review.`,
      type: "assignment",
      grievanceId: grievance._id,
      grievanceCode: grievance.grievanceId,
      url: "/grievances",
    });

    res.status(200).json({ success: true, message: "Officer assigned", data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ADD concern (officer) or response (veteran) ─────────────────────────────
export const addComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, authorName, authorRole, concernScope, documentLabel, documentUploadId } = req.body;
    const detailDescription = req.body.description;
    const detailArmyNo = req.body.veteranArmyNo ?? req.body.armyNumber;
    const detailRank = req.body.veteranRank ?? req.body.rank;
    const detailStation = req.body.stationName ?? req.body.stationHQ;
    const uploadedFiles = req.files as
      | Express.Multer.File[]
      | { attachments?: Express.Multer.File[]; documentFile?: Express.Multer.File[] }
      | undefined;

    const attachmentFiles = Array.isArray(uploadedFiles)
      ? uploadedFiles
      : uploadedFiles?.attachments ?? [];
    const documentFile = Array.isArray(uploadedFiles)
      ? undefined
      : uploadedFiles?.documentFile?.[0];

    if (!message && attachmentFiles.length === 0 && !documentFile && !detailDescription && !detailArmyNo && !detailRank && !detailStation) {
      res.status(400).json({ success: false, message: "Concern message or attachments required" });
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

    const authUser = (req as any).user;
    const isVeteran = authUser?.role === "user";

    if (isVeteran && grievance.userId?.toString() !== authUser.id) {
      res.status(403).json({ success: false, message: "Not authorized for this grievance" });
      return;
    }

    const currentConcernStatus = effectiveConcernStatus(grievance);

    if (isVeteran) {
      if (currentConcernStatus !== "awaiting_veteran") {
        res.status(400).json({
          success: false,
          message: "No open concern awaiting your response.",
        });
        return;
      }
    } else {
      if (grievance.status === "resolved" || grievance.status === "closed") {
        res.status(400).json({
          success: false,
          message: "Cannot raise concerns on a resolved grievance.",
        });
        return;
      }
      const actErr = assertCanActOnGrievance(authUser, grievance);
      if (actErr) {
        res.status(403).json({ success: false, message: actErr });
        return;
      }
      if (currentConcernStatus === "awaiting_veteran") {
        res.status(400).json({
          success: false,
          message: "Veteran must respond before you can raise another concern.",
        });
        return;
      }
    }

    const resolvedName = authorName || authUser?.name || "Unknown";
    const resolvedRole = isVeteran ? "user" : (authorRole || authUser?.role || "officer");
    const eventType = isVeteran ? "veteran_response" : "concern";

    let scope: "general" | "document" | "both" =
      concernScope === "both" ? "both" : concernScope === "document" ? "document" : "general";
    let resolvedDocumentLabel = String(documentLabel || "").trim();
    let resolvedDocumentText = "";
    let resolvedUploadId: mongoose.Types.ObjectId | undefined;
    let replacedDocumentUrl: string | undefined;
    let concernDocuments: ConcernDocumentItem[] = [];
    const attachments: string[] = [];

    async function resolveUploadToConcernDoc(uploadId: string): Promise<ConcernDocumentItem | null> {
      const uploadQuery: Record<string, unknown> = { grievanceId: grievance!._id };
      if (isValidObjectId(uploadId)) {
        uploadQuery._id = uploadId;
      } else {
        return null;
      }

      const docUpload =
        (await VeteranRequiredDocumentUpload.findOne(uploadQuery)) ||
        (grievance!.userId
          ? await VeteranRequiredDocumentUpload.findOne({
              userId: grievance!.userId,
              _id: uploadId,
            })
          : null);
      if (!docUpload) return null;

      const checklist = await CaseTypeRequiredDocuments.findOne({ caseType: docUpload.caseType }).lean();
      const meta = checklist?.documents.find((d) => d.label === docUpload.documentLabel);
      return {
        documentLabel: docUpload.documentLabel,
        documentText: meta?.text ?? docUpload.documentLabel,
        documentUploadId: docUpload._id,
      };
    }

    if (!isVeteran) {
      const uploadIds = parseDocumentUploadIds(req.body);
      const includeGeneral =
        req.body.includeGeneral === true ||
        req.body.includeGeneral === "true" ||
        scope === "general" ||
        scope === "both";

      if (uploadIds.length > 0) {
        for (const uploadId of uploadIds) {
          const doc = await resolveUploadToConcernDoc(uploadId);
          if (!doc) {
            res.status(400).json({ success: false, message: "One or more selected documents were not found on this grievance" });
            return;
          }
          concernDocuments.push(doc);
        }
      } else if (scope === "document" && (resolvedDocumentLabel || documentUploadId)) {
        const legacyId = documentUploadId ? String(documentUploadId) : "";
        if (legacyId && isValidObjectId(legacyId)) {
          const doc = await resolveUploadToConcernDoc(legacyId);
          if (doc) concernDocuments.push(doc);
        }
      }

      if (!includeGeneral && concernDocuments.length === 0) {
        res.status(400).json({
          success: false,
          message: "Select general details and/or at least one document for the concern",
        });
        return;
      }

      scope = resolveOfficerConcernScope(includeGeneral, concernDocuments.length);
      if (concernDocuments.length > 0) {
        resolvedDocumentLabel = concernDocuments[0].documentLabel;
        resolvedDocumentText = concernDocuments[0].documentText || resolvedDocumentLabel;
        resolvedUploadId = concernDocuments[0].documentUploadId;
      }
    } else {
      const lastOfficerComment = [...grievance.comments]
        .reverse()
        .find((c) => c.authorRole !== "user");

      scope = (lastOfficerComment?.concernScope as typeof scope) || "general";
      const flaggedDocs = getConcernDocumentsFromComment(lastOfficerComment);
      const concernRaisedAt = lastOfficerComment?.createdAt
        ? new Date(lastOfficerComment.createdAt)
        : new Date(0);

      if (concernNeedsDocuments(scope)) {
        if (flaggedDocs.length === 0) {
          res.status(400).json({ success: false, message: "No documents flagged in this concern" });
          return;
        }

        if (documentFile && flaggedDocs.length === 1 && !concernNeedsGeneral(scope)) {
          const reupload = await reuploadGrievanceDocument({
            grievance,
            userId: authUser.id,
            documentLabel: flaggedDocs[0].documentLabel,
            file: documentFile,
          });
          replacedDocumentUrl = reupload.storedUrl;
          attachments.push(reupload.storedUrl);
          concernDocuments = [{
            documentLabel: flaggedDocs[0].documentLabel,
            documentText: flaggedDocs[0].documentText,
            documentUploadId: flaggedDocs[0].documentUploadId,
            replacedDocumentUrl: reupload.storedUrl,
          }];
          resolvedDocumentLabel = flaggedDocs[0].documentLabel;
          resolvedDocumentText = flaggedDocs[0].documentText || resolvedDocumentLabel;
          resolvedUploadId = flaggedDocs[0].documentUploadId;
        } else {
          const missing: string[] = [];
          concernDocuments = [];

          for (const doc of flaggedDocs) {
            const uploadQuery: Record<string, unknown> = {
              grievanceId: grievance._id,
              documentLabel: doc.documentLabel,
              userId: authUser.id,
            };
            if (doc.documentUploadId) uploadQuery._id = doc.documentUploadId;

            let upload = await VeteranRequiredDocumentUpload.findOne(uploadQuery);
            if (!upload) {
              upload = await VeteranRequiredDocumentUpload.findOne({
                userId: authUser.id,
                documentLabel: doc.documentLabel,
                ...(doc.documentUploadId ? { _id: doc.documentUploadId } : {}),
              });
            }

            const updatedAt = upload?.updatedAt ? new Date(upload.updatedAt) : null;
            if (!upload || !updatedAt || updatedAt <= concernRaisedAt) {
              missing.push(doc.documentLabel);
              continue;
            }

            concernDocuments.push({
              documentLabel: doc.documentLabel,
              documentText: doc.documentText,
              documentUploadId: upload._id,
              replacedDocumentUrl: upload.storedPath,
            });
            if (upload.storedPath) attachments.push(upload.storedPath);
          }

          if (missing.length > 0) {
            res.status(400).json({
              success: false,
              message: `Please re-upload corrected document(s): ${missing.join(", ")}`,
            });
            return;
          }

          if (concernDocuments.length > 0) {
            resolvedDocumentLabel = concernDocuments[0].documentLabel;
            resolvedDocumentText = concernDocuments[0].documentText || resolvedDocumentLabel;
            resolvedUploadId = concernDocuments[0].documentUploadId;
            replacedDocumentUrl = concernDocuments[0].replacedDocumentUrl;
          }
        }
      }

      if (concernNeedsGeneral(scope)) {
        if (detailDescription !== undefined && String(detailDescription).trim()) {
          grievance.description = String(detailDescription).trim();
        }
        if (detailArmyNo !== undefined && String(detailArmyNo).trim()) {
          grievance.veteranArmyNo = String(detailArmyNo).trim();
        }
        if (detailRank !== undefined && String(detailRank).trim()) {
          grievance.veteranRank = String(detailRank).trim();
        }
        if (detailStation !== undefined && String(detailStation).trim()) {
          grievance.stationName = String(detailStation).trim();
        }
      }
    }

    if (attachmentFiles.length > 0) {
      for (const file of attachmentFiles) {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const stored = isVeteran
          ? await storeUploadedBuffer(file.buffer, {
              folder: `grievances/veteran-responses/${grievance.grievanceId}`,
              fileName: `response-${uniqueSuffix}`,
              mimetype: file.mimetype,
            })
          : await storeConcernAttachment(
              file.buffer,
              grievance.grievanceId,
              `concern-${uniqueSuffix}`,
              file.mimetype
            );
        attachments.push(stored.url);
      }
    }

    const docLabelSummary = formatConcernDocumentLabels(concernDocuments);
    const noteText =
      message ||
      (isVeteran
        ? scope === "document" || scope === "both"
          ? concernDocuments.length > 1
            ? `Re-uploaded ${docLabelSummary}`
            : `Re-uploaded ${resolvedDocumentLabel || docLabelSummary}`
          : "Corrected details submitted"
        : scope === "both"
          ? `Concern on details${docLabelSummary ? ` and ${docLabelSummary}` : ""}`
          : scope === "document"
            ? concernDocuments.length > 1
              ? `Concern on ${docLabelSummary}`
              : `Concern on ${resolvedDocumentLabel}`
            : "General concern raised");

    // ── Translate comment bidirectionally ─────────────────────────────────────
    let commentOriginalText: string | undefined;
    let commentTranslatedText: string | undefined;
    let commentLanguage: string | undefined;
    let commentTranslationFailed: boolean | undefined;

    if (noteText && noteText.trim()) {
      if (isVeteran) {
        // Veteran: detect language and translate to English
        const xlat = await detectAndTranslateToOpposite(noteText);
        commentOriginalText    = xlat.originalText;
        commentTranslatedText  = xlat.translatedText;
        commentLanguage        = xlat.language;
        commentTranslationFailed = xlat.translationFailed;
      } else {
        // Admin/Officer: translate English → Hindi for veteran to read
        const xlat = await detectAndTranslateToOpposite(noteText);
        commentOriginalText    = noteText;
        commentTranslatedText  = xlat.translatedText;
        commentLanguage        = "en";
        commentTranslationFailed = xlat.translationFailed;
      }
    }

    const commentPayload = {
      authorId: authUser?.id,
      authorName: resolvedName,
      authorRole: resolvedRole,
      message: noteText,
      attachments,
      concernScope: scope,
      documentLabel: concernDocuments.length === 1 ? resolvedDocumentLabel : undefined,
      documentText: concernDocuments.length === 1 ? resolvedDocumentText : undefined,
      documentUploadId: concernDocuments.length === 1 ? resolvedUploadId : undefined,
      concernDocuments: concernDocuments.length > 0 ? concernDocuments : undefined,
      replacedDocumentUrl,
      // Translation fields on comment
      ...(commentOriginalText !== undefined ? {
        originalText: commentOriginalText,
        translatedText: commentTranslatedText,
        language: commentLanguage,
        translationFailed: commentTranslationFailed,
      } : {}),
      createdAt: new Date(),
    };

    grievance.comments.push(commentPayload);

    grievance.timeline.push({
      status: grievance.status,
      note: noteText,
      updatedBy: resolvedName,
      updatedAt: new Date(),
      attachments,
      eventType,
      concernScope: scope,
      documentLabel: concernDocuments.length === 1 ? resolvedDocumentLabel : undefined,
      documentText: concernDocuments.length === 1 ? resolvedDocumentText : undefined,
      documentUploadId: concernDocuments.length === 1 ? resolvedUploadId : undefined,
      concernDocuments: concernDocuments.length > 0 ? concernDocuments : undefined,
      replacedDocumentUrl,
      ...(commentOriginalText !== undefined ? {
        originalText: commentOriginalText,
        translatedText: commentTranslatedText,
        language: commentLanguage,
        translationFailed: commentTranslationFailed,
      } : {}),
    });

    grievance.concernStatus = isVeteran ? "awaiting_officer" : "awaiting_veteran";

    await grievance.save();

    if (isVeteran) {
      await notifyOfficer(grievance.officerId, {
        title: "Veteran responded to concern",
        message: `${resolvedName} responded on ${grievance.grievanceId}. Please review the update.`,
        type: "grievance_update",
        grievanceId: grievance._id,
        grievanceCode: grievance.grievanceId,
        url: "/grievances",
      });
      res.status(200).json({ success: true, message: "Response submitted", data: grievance });
      return;
    }

    if (grievance.userId) {
      const docHint =
        concernDocuments.length > 0
          ? ` Document(s): ${docLabelSummary}.`
          : scope === "both"
            ? " Details and documents need correction."
            : "";
      await notifyVeteran(grievance.userId, {
        title: "Action required on your grievance",
        message: `Officer raised a concern on ${grievance.grievanceId}.${docHint} Please review and respond.`,
        type: "grievance_update",
        grievanceId: grievance._id,
        grievanceCode: grievance.grievanceId,
        url: "/user/track-case",
      });
    }

    res.status(200).json({ success: true, message: "Concern added", data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── RESOLVE open concern (officer reviewed veteran response) ─────────────────
export const resolveConcern = async (req: Request, res: Response): Promise<void> => {
  try {
    const { note, officerName } = req.body;
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

    const authUser = (req as any).user;
    const actErr = assertCanActOnGrievance(authUser, grievance);
    if (actErr) {
      res.status(403).json({ success: false, message: actErr });
      return;
    }

    const concernStatus = effectiveConcernStatus(grievance);
    if (concernStatus !== "awaiting_officer") {
      res.status(400).json({
        success: false,
        message:
          concernStatus === "awaiting_veteran"
            ? "Veteran has not responded to the concern yet."
            : "There is no concern awaiting officer review.",
      });
      return;
    }

    const resolvedBy = officerName || (req as any).user?.name || "Officer";
    const noteText = note || "Concern resolved — veteran response accepted.";

    grievance.concernStatus = "none";
    grievance.timeline.push({
      status: grievance.status,
      note: noteText,
      updatedBy: resolvedBy,
      updatedAt: new Date(),
      eventType: "concern_resolved",
    });

    await grievance.save();

    if (grievance.userId) {
      await notifyVeteran(grievance.userId, {
        title: "Concern resolved",
        message: `The officer resolved the concern on ${grievance.grievanceId}. Your case will continue processing.`,
        type: "grievance_update",
        grievanceId: grievance._id,
        grievanceCode: grievance.grievanceId,
        url: "/user/track-case",
      });
    }

    res.status(200).json({ success: true, message: "Concern resolved", data: grievance });
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

// ─── Admin: lookup veteran by mobile (for manual grievance filing) ───────────
export const lookupVeteranByPhone = async (req: Request, res: Response): Promise<void> => {
  try {
    const phone = normalizeVeteranPhone(String(req.query.phone || ""));
    if (phone.length !== 10) {
      res.status(400).json({ success: false, message: "Enter a valid 10-digit mobile number." });
      return;
    }

    const user = await User.findOne({ phone, isActive: true }).lean();
    if (!user) {
      res.status(404).json({
        success: false,
        message: "No veteran account found for this mobile number.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        phone: user.phone,
        name: user.name || "",
        rank: user.rank || "",
        armyNumber: user.armyNumber || user.serviceNumber || "",
        stationHQ: user.stationHQ || "",
      },
    });
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
    const grievances = await Grievance.find(query)
      .populate("caseTypeId", "name nameHi")
      .sort({ createdAt: -1 });

    const data = grievances.map(g => {
      const obj = g.toObject();
      if (obj.caseTypeId) {
        (obj as any).typeHi = (obj.caseTypeId as any).nameHi || "";
        // optionally keep caseTypeId as just the ID for backwards compatibility
        obj.caseTypeId = (obj.caseTypeId as any)._id;
      }
      return obj;
    });

    res.status(200).json({ success: true, data });
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
    }).select(
      "grievanceId type caseTypeId veteranName veteranRank veteranArmyNo stationName officerName status priority timeline description comments attachments concernStatus createdAt resolvedAt"
    ).populate("caseTypeId", "name nameHi");

    if (!grievance) { res.status(404).json({ success: false, message: "Grievance not found. Check your complaint ID." }); return; }
    const obj = grievance.toObject();
    
    if (obj.caseTypeId) {
      (obj as any).typeHi = (obj.caseTypeId as any).nameHi || "";
      obj.caseTypeId = (obj.caseTypeId as any)._id;
    }

    obj.concernStatus = effectiveConcernStatus(obj);
    const data = await enrichGrievanceWithDocuments(obj);
    res.status(200).json({ success: true, data });
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

    const byPriority = await Grievance.aggregate([
      { $match: { ...baseFilter } },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const avgResolutionTimeQuery = await Grievance.aggregate([
      { $match: { ...baseFilter, status: "resolved", resolvedAt: { $exists: true } } },
      {
        $group: {
          _id: null,
          avgMs: { $avg: { $subtract: ["$resolvedAt", "$createdAt"] } },
        },
      },
    ]);
    const avgResolutionHours = avgResolutionTimeQuery[0]?.avgMs ? Math.round(avgResolutionTimeQuery[0].avgMs / (1000 * 60 * 60)) : 0;

    const bySubmissionSource = await Grievance.aggregate([
      { $match: { ...baseFilter } },
      { $group: { _id: "$submissionSource", count: { $sum: 1 } } }
    ]);

    const now = new Date();
    const slaStatsRaw = await Grievance.aggregate([
      { $match: { ...baseFilter, slaDeadline: { $exists: true } } },
      {
        $project: {
          status: 1,
          isOverdue: {
            $cond: [
              { $in: ["$status", ["resolved", "closed"]] },
              { $gt: ["$resolvedAt", "$slaDeadline"] },
              { $gt: [now, "$slaDeadline"] }
            ]
          }
        }
      },
      {
        $group: {
          _id: "$isOverdue",
          count: { $sum: 1 }
        }
      }
    ]);
    const slaStats = {
      overdue: slaStatsRaw.find(s => s._id === true)?.count || 0,
      withinSla: slaStatsRaw.find(s => s._id === false)?.count || 0
    };

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
        byPriority: byPriority.map((p) => ({ name: p._id || "Unassigned", value: p.count })),
        bySubmissionSource: bySubmissionSource.map((s) => ({ name: s._id || "unknown", value: s.count })),
        slaStats,
        avgResolutionHours,
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

// ─── Escalation preview (manual escalate modal) ──────────────────────────────
export const getEscalationPreview = async (req: Request, res: Response): Promise<void> => {
  try {
    const grievance = await findGrievanceByParamId(req.params.id);
    if (!grievance) {
      res.status(404).json({ success: false, message: "Grievance not found" });
      return;
    }

    const fromOrgTier = (grievance.assignedOrgTier || "station") as OrgTier;
    const fromLevel = (grievance.assignedLevel || "L1") as OfficerLevel;
    const toOrgTier = nextOrgTier(fromOrgTier);
    let toOfficer: { _id: mongoose.Types.ObjectId; name: string } | null = null;

    if (toOrgTier && fromLevel === "L1") {
      const org = await buildOrgFromGrievance(grievance);
      const officer = await findOfficerAtOrgTier(toOrgTier, "L1", org);
      if (officer) {
        toOfficer = { _id: officer._id, name: officer.name };
      }
    }

    res.status(200).json({
      success: true,
      data: {
        canEscalate: Boolean(toOrgTier && fromLevel === "L1"),
        fromOrgTier,
        toOrgTier,
        fromLevel,
        fromOfficerId: grievance.officerId,
        fromOfficerName: grievance.officerName || `${ORG_TIER_LABELS[fromOrgTier]} ${fromLevel}`,
        toLevel: toOrgTier ? "L1" : null,
        toOfficerId: toOfficer?._id,
        toOfficerName: toOfficer?.name || (toOrgTier ? `${ORG_TIER_LABELS[toOrgTier]} L1 (Unassigned)` : null),
        escalationTypes: [
          { value: "no_response", label: "No response — officer has not raised any concern" },
          { value: "concern_pending", label: "Concern pending — veteran has not replied" },
        ],
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Manual escalation with type ─────────────────────────────────────────────
export const manualEscalateGrievance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { escalationReasonType, note } = req.body;
    const allowed: EscalationReasonType[] = ["no_response", "concern_pending"];
    if (!escalationReasonType || !allowed.includes(escalationReasonType)) {
      res.status(400).json({
        success: false,
        message: "escalationReasonType must be no_response or concern_pending",
      });
      return;
    }

    const grievance = await findGrievanceByParamId(req.params.id);
    if (!grievance) {
      res.status(404).json({ success: false, message: "Grievance not found" });
      return;
    }
    if (grievance.status === "resolved" || grievance.status === "closed") {
      res.status(400).json({ success: false, message: "Cannot escalate a resolved case" });
      return;
    }

    const authUser = (req as any).user;
    const actErr = assertCanActOnGrievance(authUser, grievance);
    if (actErr) {
      res.status(403).json({ success: false, message: actErr });
      return;
    }

    const fromOrgTier = (grievance.assignedOrgTier || "station") as OrgTier;
    const fromLevel = (grievance.assignedLevel || "L1") as OfficerLevel;
    const targetOrgTier = nextOrgTier(fromOrgTier);
    if (!targetOrgTier || fromLevel !== "L1") {
      res.status(400).json({
        success: false,
        message: fromLevel !== "L1"
          ? "Manual org escalation only from L1 at current tier"
          : "Case is already at Area — cannot escalate further",
      });
      return;
    }

    const user = authUser;
    const reasonType = escalationReasonType as EscalationReasonType;
    const reasonText = note?.trim() || REASON_LABELS[reasonType];

    const { grievance: updated } = await escalateGrievanceToOrgTier(grievance, targetOrgTier, {
      reasonType,
      escalatedBy: user?.name || "Admin",
      note: reasonText,
      isAuto: false,
      level: "L1",
    });

    res.status(200).json({
      success: true,
      message: `Escalated from ${ORG_TIER_LABELS[fromOrgTier]} to ${ORG_TIER_LABELS[targetOrgTier]}`,
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── L2/L3 request escalation to take case from L1 ───────────────────────────
export const requestEscalationTakeover = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const level = user?.level as string | undefined;
    if (level !== "L2" && level !== "L3") {
      res.status(403).json({ success: false, message: "Only L2 and L3 officers can request escalation takeover" });
      return;
    }

    const grievance = await findGrievanceByParamId(req.params.id);
    if (!grievance) {
      res.status(404).json({ success: false, message: "Grievance not found" });
      return;
    }
    if (grievance.status === "resolved" || grievance.status === "closed") {
      res.status(400).json({ success: false, message: "Cannot request escalation on a resolved case" });
      return;
    }
    if ((grievance.assignedOrgTier || "station") !== "station") {
      res.status(400).json({ success: false, message: "Takeover requests only apply at Station HQ tier" });
      return;
    }
    if ((grievance.assignedLevel || "L1") !== "L1") {
      res.status(400).json({ success: false, message: "Case is not at L1 — escalation request not applicable" });
      return;
    }
    if (grievance.pendingEscalationRequest?.status === "pending") {
      res.status(400).json({ success: false, message: "An escalation request is already pending L1 approval" });
      return;
    }

    const requester = await Officer.findById(user.id);
    if (!requester || requester.role !== "Station HQ Officer") {
      res.status(403).json({ success: false, message: "Only Station HQ officers can request takeover" });
      return;
    }
    if (!grievance.stationId || String(requester.station) !== String(grievance.stationId)) {
      res.status(403).json({ success: false, message: "You can only request takeover for your own Station HQ" });
      return;
    }

    const { reason } = req.body;
    grievance.pendingEscalationRequest = {
      requestedByOfficerId: user.id,
      requestedByOfficerName: user.name,
      requestedByLevel: level as "L2" | "L3",
      reason: reason || `Escalation requested by ${level} officer`,
      requestedAt: new Date(),
      status: "pending",
    };
    grievance.timeline.push({
      status: "escalated",
      note: `${user.name} (${level}) requested escalation takeover — awaiting L1 approval`,
      updatedBy: user.name,
      updatedAt: new Date(),
      eventType: "escalation_request",
    });
    await grievance.save();

    await notifyOfficer(grievance.officerId, {
      title: "Escalation takeover request",
      message: `${user.name} (${level}) requested to take over ${grievance.grievanceId}. Approve or reject in grievance details.`,
      type: "escalation",
      grievanceId: grievance._id,
      grievanceCode: grievance.grievanceId,
      url: "/grievances",
    });

    res.status(200).json({ success: true, message: "Escalation request sent to L1 for approval", data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── L1 approve escalation request ───────────────────────────────────────────
export const approveEscalationRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const grievance = await findGrievanceByParamId(req.params.id);
    if (!grievance) {
      res.status(404).json({ success: false, message: "Grievance not found" });
      return;
    }

    const pending = grievance.pendingEscalationRequest;
    if (!pending || pending.status !== "pending") {
      res.status(400).json({ success: false, message: "No pending escalation request" });
      return;
    }

    const isSuperAdmin = user?.role === "super_admin";
    const isAssignedStationL1 =
      (grievance.assignedOrgTier || "station") === "station" &&
      user?.level === "L1" &&
      grievance.officerId &&
      String(grievance.officerId) === String(user.id);
    if (!isSuperAdmin && !isAssignedStationL1) {
      res.status(403).json({ success: false, message: "Only the assigned Station HQ L1 can approve escalation requests" });
      return;
    }

    const targetLevel = pending.requestedByLevel;
    const requestingOfficer = await Officer.findById(pending.requestedByOfficerId);
    if (!requestingOfficer) {
      res.status(400).json({ success: false, message: "Requesting officer not found" });
      return;
    }

    const { grievance: updated } = await escalateGrievanceToLevel(grievance, targetLevel, {
      reasonType: "approved_request",
      escalatedBy: user.name,
      note: `L1 approved — case assigned to ${requestingOfficer.name} (${targetLevel}). ${pending.reason || ""}`.trim(),
      targetOfficer: { _id: requestingOfficer._id, name: requestingOfficer.name },
      approvalStatus: "approved",
      requestedByLevel: pending.requestedByLevel,
      requestedByOfficerId: pending.requestedByOfficerId,
      isAuto: false,
    });

    updated.pendingEscalationRequest = { ...pending, status: "approved" };
    await updated.save();

    await notifyOfficer(pending.requestedByOfficerId, {
      title: "Escalation request approved",
      message: `L1 approved your request. ${grievance.grievanceId} is now assigned to you.`,
      type: "escalation",
      grievanceId: grievance._id,
      grievanceCode: grievance.grievanceId,
      url: "/grievances",
    });

    res.status(200).json({
      success: true,
      message: `Case assigned to ${requestingOfficer.name} (${targetLevel})`,
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Station officer: request escalation to upper org tier (e.g. HQ L1) ───────
export const requestEscalateToUpperTier = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const grievance = await findGrievanceByParamId(req.params.id);
    if (!grievance) {
      res.status(404).json({ success: false, message: "Grievance not found" });
      return;
    }
    if (grievance.status === "resolved" || grievance.status === "closed") {
      res.status(400).json({ success: false, message: "Cannot escalate a resolved case" });
      return;
    }

    const currentTier = (grievance.assignedOrgTier || "station") as OrgTier;
    const targetTier = nextOrgTier(currentTier);
    if (!targetTier) {
      res.status(400).json({ success: false, message: "Case is already at the highest tier" });
      return;
    }

    const requester = await Officer.findById(user.id);
    if (!requester) {
      res.status(403).json({ success: false, message: "Officer not found" });
      return;
    }

    if (currentTier === "station") {
      if (requester.role !== "Station HQ Officer" || !grievance.stationId ||
          String(requester.station) !== String(grievance.stationId)) {
        res.status(403).json({
          success: false,
          message: "Only officers of this Station HQ can request escalation to HQ",
        });
        return;
      }
    } else if (currentTier === "hq") {
      if (requester.role !== "Headquarter Officer" || !grievance.hqId ||
          String(requester.hqId) !== String(grievance.hqId)) {
        res.status(403).json({
          success: false,
          message: "Only officers of this HQ can request escalation to Area",
        });
        return;
      }
      if (user.level !== "L1") {
        res.status(403).json({ success: false, message: "Only HQ L1 can request escalation to Area" });
        return;
      }
    }

    const { reason } = req.body;
    const { grievance: updated } = await escalateGrievanceToOrgTier(grievance, targetTier, {
      reasonType: "manual_request",
      escalatedBy: user.name,
      note: reason || `Escalation requested by ${user.name} (${user.level || "officer"}) to ${ORG_TIER_LABELS[targetTier]} L1`,
      level: "L1",
    });

    res.status(200).json({
      success: true,
      message: `Case escalated to ${ORG_TIER_LABELS[targetTier]} L1`,
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── L1 reject escalation request ────────────────────────────────────────────
export const rejectEscalationRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const grievance = await findGrievanceByParamId(req.params.id);
    if (!grievance) {
      res.status(404).json({ success: false, message: "Grievance not found" });
      return;
    }

    const pending = grievance.pendingEscalationRequest;
    if (!pending || pending.status !== "pending") {
      res.status(400).json({ success: false, message: "No pending escalation request" });
      return;
    }

    const isSuperAdmin = user?.role === "super_admin";
    const isAssignedStationL1 =
      (grievance.assignedOrgTier || "station") === "station" &&
      user?.level === "L1" &&
      grievance.officerId &&
      String(grievance.officerId) === String(user.id);
    if (!isSuperAdmin && !isAssignedStationL1) {
      res.status(403).json({ success: false, message: "Only the assigned Station HQ L1 can reject escalation requests" });
      return;
    }

    grievance.pendingEscalationRequest = { ...pending, status: "rejected" };
    grievance.timeline.push({
      status: grievance.status,
      note: `L1 rejected escalation request from ${pending.requestedByOfficerName}`,
      updatedBy: user.name,
      updatedAt: new Date(),
      eventType: "escalation_request",
    });
    await grievance.save();

    await notifyOfficer(pending.requestedByOfficerId, {
      title: "Escalation request rejected",
      message: `L1 rejected your takeover request for ${grievance.grievanceId}.`,
      type: "escalation",
      grievanceId: grievance._id,
      grievanceCode: grievance.grievanceId,
      url: "/grievances",
    });

    res.status(200).json({ success: true, message: "Escalation request rejected", data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** Inline preview of a submitted required document (admin / officer). */
export const previewGrievanceDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const grievanceId = req.params.id;
    const uploadId = req.params.uploadId;

    const grievance = await Grievance.findById(grievanceId);
    if (!grievance) {
      res.status(404).json({ success: false, message: "Grievance not found" });
      return;
    }

    const upload = await VeteranRequiredDocumentUpload.findById(uploadId);
    if (!upload) {
      res.status(404).json({ success: false, message: "Document not found" });
      return;
    }

    const linkedToGrievance =
      upload.grievanceId?.toString() === grievanceId ||
      Boolean(grievance.attachments?.includes(upload.storedPath));

    if (!linkedToGrievance) {
      res.status(403).json({ success: false, message: "Document does not belong to this grievance" });
      return;
    }

    await serveStoredFile(res, upload.storedPath, {
      mimeType: upload.mimeType,
      fileName: upload.originalFileName,
      disposition: "inline",
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
