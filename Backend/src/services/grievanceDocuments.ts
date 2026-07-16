import mongoose from "mongoose";
import CaseType from "../models/CaseType";
import CaseTypeRequiredDocuments, { IDocumentChecklistItem } from "../models/CaseTypeRequiredDocuments";
import VeteranRequiredDocumentUpload from "../models/VeteranRequiredDocumentUpload";
import type { IGrievance } from "../models/Grievance";
import { storeUploadedBuffer } from "./storageService";
import { deleteStoredAsset } from "./storageResolver";

export interface ChecklistContext {
  caseType: { _id: mongoose.Types.ObjectId; id: string; name: string };
  checklist: {
    categoryName?: string;
    documents: IDocumentChecklistItem[];
    maxFileSizeMb?: number;
    isActive?: boolean;
  };
  mandatoryLabels: string[];
}

async function resolveCaseTypeByKey(key?: string) {
  const trimmed = String(key || "").trim();
  if (!trimmed) return null;
  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    const byId = await CaseType.findById(trimmed).populate("category", "name");
    if (byId) return byId;
  }
  const bySlug = await CaseType.findOne({ id: { $regex: `^${escapeRegex(trimmed)}$`, $options: "i" } });
  if (bySlug) return bySlug;
  return CaseType.findOne({ name: { $regex: `^${escapeRegex(trimmed)}$`, $options: "i" } });
}

export async function getChecklistContext(
  caseTypeId?: string,
  caseTypeName?: string
): Promise<ChecklistContext | null> {
  const caseType = await resolveCaseTypeByKey(caseTypeId || caseTypeName);
  if (!caseType) return null;

  const checklistDoc = await CaseTypeRequiredDocuments.findOne({
    caseType: caseType._id,
    isActive: { $ne: false },
  }).lean();

  if (!checklistDoc?.documents?.length) return null;

  const mandatoryLabels = checklistDoc.documents
    .filter((d) => d.isMandatory !== false)
    .map((d) => d.label);

  return {
    caseType: { _id: caseType._id, id: caseType.id, name: caseType.name },
    checklist: {
      categoryName: checklistDoc.categoryName,
      documents: checklistDoc.documents,
      maxFileSizeMb: checklistDoc.maxFileSizeMb,
      isActive: checklistDoc.isActive !== false,
    },
    mandatoryLabels,
  };
}

export async function validateMandatoryDraftUploads(
  userId: string,
  caseTypeId?: string,
  caseTypeName?: string
): Promise<{ ok: boolean; missing: string[] }> {
  const ctx = await getChecklistContext(caseTypeId, caseTypeName);
  if (!ctx || ctx.mandatoryLabels.length === 0) return { ok: true, missing: [] };

  const uploads = await VeteranRequiredDocumentUpload.find({
    userId,
    grievanceId: { $exists: false },
    caseType: ctx.caseType._id,
    documentLabel: { $in: ctx.mandatoryLabels },
  }).select("documentLabel");

  const uploaded = new Set(uploads.map((u) => u.documentLabel));
  const missing = ctx.mandatoryLabels.filter((label) => !uploaded.has(label));
  return { ok: missing.length === 0, missing };
}

export function validateMandatoryFilesByLabel(
  mandatoryLabels: string[],
  filesByLabel: Map<string, Express.Multer.File>
): { ok: boolean; missing: string[] } {
  const missing = mandatoryLabels.filter((label) => !filesByLabel.has(label));
  return { ok: missing.length === 0, missing };
}

export async function persistRequiredDocumentsForGrievance(params: {
  grievance: Pick<IGrievance, "_id" | "grievanceId">;
  ctx: ChecklistContext;
  filesByLabel: Map<string, Express.Multer.File>;
  uploadedByUserId: string;
  veteranKey?: string;
}): Promise<string[]> {
  const { grievance, ctx, filesByLabel, uploadedByUserId, veteranKey } = params;
  const attachmentUrls: string[] = [];
  const maxMb = ctx.checklist.maxFileSizeMb ?? 5;
  const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

  for (const docItem of ctx.checklist.documents) {
    const file = filesByLabel.get(docItem.label);
    if (!file) continue;

    if (!allowed.includes(file.mimetype)) {
      throw new Error(`Only PDF, JPG, JPEG, PNG allowed for ${docItem.label}`);
    }
    if (file.size > maxMb * 1024 * 1024) {
      throw new Error(`File for ${docItem.label} exceeds ${maxMb} MB limit`);
    }

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const stored = await storeUploadedBuffer(file.buffer, {
      folder: `grievances/required-documents/${grievance.grievanceId}/${slugify(docItem.label)}`,
      fileName: `${slugify(docItem.label)}-${uniqueSuffix}`,
      mimetype: file.mimetype,
    });

    await VeteranRequiredDocumentUpload.create({
      userId: uploadedByUserId,
      veteranKey: veteranKey || `manual-${uploadedByUserId}`,
      caseType: ctx.caseType._id,
      caseTypeSlug: ctx.caseType.id,
      caseTypeName: ctx.caseType.name,
      categoryName: ctx.checklist.categoryName || "",
      documentLabel: docItem.label,
      documentSortOrder: docItem.sortOrder ?? 0,
      originalFileName: file.originalname,
      storedPath: stored.url,
      mimeType: stored.mimeType,
      fileSize: stored.bytes,
      grievanceId: grievance._id,
    });

    attachmentUrls.push(stored.url);
  }

  return attachmentUrls;
}

export function parseRequiredDocumentUploads(
  files:
    | Express.Multer.File[]
    | { attachments?: Express.Multer.File[]; requiredDocuments?: Express.Multer.File[] }
    | undefined,
  labelsRaw: unknown
): Map<string, Express.Multer.File> {
  const map = new Map<string, Express.Multer.File>();
  let labels: string[] = [];
  if (typeof labelsRaw === "string" && labelsRaw.trim()) {
    try {
      labels = JSON.parse(labelsRaw);
    } catch {
      labels = [];
    }
  } else if (Array.isArray(labelsRaw)) {
    labels = labelsRaw.map(String);
  }

  const requiredFiles = Array.isArray(files)
    ? []
    : files?.requiredDocuments || [];

  requiredFiles.forEach((file, index) => {
    const label = labels[index];
    if (label) map.set(label, file);
  });

  return map;
}

export function parseGrievanceUploadFiles(
  files:
    | Express.Multer.File[]
    | { attachments?: Express.Multer.File[]; requiredDocuments?: Express.Multer.File[] }
    | undefined
): { attachmentFiles: Express.Multer.File[]; requiredDocumentFiles: Express.Multer.File[] } {
  if (Array.isArray(files)) {
    return { attachmentFiles: files, requiredDocumentFiles: [] };
  }
  return {
    attachmentFiles: files?.attachments || [],
    requiredDocumentFiles: files?.requiredDocuments || [],
  };
}

export interface SubmittedDocumentItem {
  uploadId: string;
  documentLabel: string;
  documentText: string;
  isMandatory: boolean;
  originalFileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: Date;
  sortOrder: number;
}

export async function resolveDraftUploadsForGrievance(params: {
  userId: string;
  caseTypeId?: string;
  caseTypeName?: string;
  documentUploadIds?: string[];
  isManualAdmin?: boolean;
}): Promise<InstanceType<typeof VeteranRequiredDocumentUpload>[]> {
  if (params.isManualAdmin) return [];

  const { userId, caseTypeId, caseTypeName, documentUploadIds } = params;

  if (documentUploadIds !== undefined) {
    if (documentUploadIds.length === 0) return [];
    const validIds = documentUploadIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) return [];
    return VeteranRequiredDocumentUpload.find({
      _id: { $in: validIds },
      userId,
      grievanceId: { $exists: false },
    });
  }

  const filter: Record<string, unknown> = {
    userId,
    grievanceId: { $exists: false },
  };
  const caseTypeIdStr = String(caseTypeId || "").trim();
  if (caseTypeIdStr && mongoose.Types.ObjectId.isValid(caseTypeIdStr)) {
    filter.caseType = caseTypeIdStr;
  } else if (caseTypeName) {
    filter.caseTypeName = caseTypeName;
  }
  return VeteranRequiredDocumentUpload.find(filter);
}

export async function getSubmittedDocumentsForGrievance(
  grievance: Pick<IGrievance, "_id" | "type" | "userId" | "attachments">
): Promise<SubmittedDocumentItem[]> {
  let uploads = await VeteranRequiredDocumentUpload.find({
    grievanceId: grievance._id,
  }).sort({ documentSortOrder: 1 });

  // Legacy rows: only include drafts whose stored path is on this grievance record.
  if (uploads.length === 0 && grievance.attachments?.length) {
    const attachmentSet = new Set(grievance.attachments);
    uploads = await VeteranRequiredDocumentUpload.find({
      storedPath: { $in: [...attachmentSet] },
      $or: [{ grievanceId: grievance._id }, { grievanceId: { $exists: false } }],
    }).sort({ documentSortOrder: 1 });

    if (grievance.userId) {
      uploads = uploads.filter((u) => String(u.userId) === String(grievance.userId));
    }
  }

  if (uploads.length === 0) return [];

  const caseTypeId = uploads[0].caseType;
  const checklist = await CaseTypeRequiredDocuments.findOne({
    caseType: caseTypeId,
  }).lean();
  const docMeta = new Map((checklist?.documents ?? []).map((d) => [d.label, d]));

  return uploads.map((u) => {
    const meta = docMeta.get(u.documentLabel);
    return {
      uploadId: u._id.toString(),
      documentLabel: u.documentLabel,
      documentText: meta?.text ?? u.documentLabel,
      isMandatory: meta?.isMandatory !== false,
      originalFileName: u.originalFileName,
      fileUrl: u.storedPath,
      mimeType: u.mimeType,
      fileSize: u.fileSize,
      uploadedAt: (u.updatedAt ?? u.createdAt) as Date,
      sortOrder: u.documentSortOrder ?? 0,
    };
  });
}

export async function enrichGrievanceWithDocuments(grievance: IGrievance | Record<string, unknown>) {
  const g = grievance as Pick<IGrievance, "_id" | "type" | "userId" | "attachments"> & Record<string, unknown>;
  const submittedDocuments = await getSubmittedDocumentsForGrievance(g);
  const caseTypeId =
    submittedDocuments.length > 0
      ? (
          await VeteranRequiredDocumentUpload.findOne({ grievanceId: g._id })
            .select("caseType")
            .lean()
        )?.caseType?.toString()
      : (
          await CaseType.findOne({
            name: { $regex: new RegExp(`^${escapeRegex(String(g.type))}$`, "i") },
          })
            .select("_id")
            .lean()
        )?._id?.toString();

  return {
    ...grievance,
    caseTypeId: caseTypeId ?? null,
    submittedDocuments,
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function reuploadGrievanceDocument(params: {
  grievance: IGrievance;
  userId: string;
  documentLabel: string;
  file: Express.Multer.File;
}) {
  const { grievance, userId, documentLabel, file } = params;

  let upload = await VeteranRequiredDocumentUpload.findOne({
    grievanceId: grievance._id,
    documentLabel,
    userId,
  });

  if (!upload && grievance.caseTypeId) {
    upload = await VeteranRequiredDocumentUpload.findOne({
      userId,
      documentLabel,
      caseType: grievance.caseTypeId,
    }).sort({ updatedAt: -1 });
  }

  if (!upload) {
    upload = await VeteranRequiredDocumentUpload.findOne({
      userId,
      documentLabel,
      caseTypeName: grievance.type,
    }).sort({ updatedAt: -1 });
  }

  if (!upload) {
    throw new Error("Document not found on this grievance");
  }

  const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
  if (!allowed.includes(file.mimetype)) {
    throw new Error("Only PDF, JPG, JPEG, PNG allowed");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File must be under 5 MB");
  }

  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const stored = await storeUploadedBuffer(file.buffer, {
    folder: `grievances/veteran-responses/${grievance.grievanceId}/${slugify(documentLabel)}`,
    fileName: `reupload-${uniqueSuffix}`,
    mimetype: file.mimetype,
  });

  const oldPath = upload.storedPath;

  if (oldPath && oldPath !== stored.url) {
    await deleteStoredAsset(oldPath).catch(() => undefined);
  }

  upload.originalFileName = file.originalname;
  upload.storedPath = stored.url;
  upload.mimeType = stored.mimeType;
  upload.fileSize = stored.bytes;
  if (!upload.grievanceId) {
    upload.grievanceId = grievance._id;
  }
  await upload.save();

  // Replace old file URL everywhere on the grievance record
  const withoutOld = (grievance.attachments || []).filter((url) => url !== oldPath);
  if (!withoutOld.includes(stored.url)) {
    withoutOld.push(stored.url);
  }
  grievance.attachments = withoutOld;

  for (const entry of grievance.timeline || []) {
    if (!entry.attachments?.length) continue;
    entry.attachments = entry.attachments.map((url) => (url === oldPath ? stored.url : url));
    entry.attachments = entry.attachments.filter((url, idx, arr) => arr.indexOf(url) === idx);
  }

  return { upload, storedUrl: stored.url, oldPath };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "document";
}

export function isValidObjectId(value?: string): boolean {
  return !!value && mongoose.Types.ObjectId.isValid(value);
}
