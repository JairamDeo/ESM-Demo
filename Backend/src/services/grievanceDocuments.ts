import mongoose from "mongoose";
import CaseType from "../models/CaseType";
import CaseTypeRequiredDocuments from "../models/CaseTypeRequiredDocuments";
import VeteranRequiredDocumentUpload from "../models/VeteranRequiredDocumentUpload";
import type { IGrievance } from "../models/Grievance";
import { storeUploadedBuffer } from "./storageService";
import { deleteStoredAsset } from "./storageResolver";

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

export async function getSubmittedDocumentsForGrievance(
  grievance: Pick<IGrievance, "_id" | "type" | "userId" | "attachments">
): Promise<SubmittedDocumentItem[]> {
  let uploads = await VeteranRequiredDocumentUpload.find({
    grievanceId: grievance._id,
  }).sort({ documentSortOrder: 1 });

  if (uploads.length === 0 && grievance.userId) {
    const caseType = await CaseType.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(grievance.type)}$`, "i") },
    }).lean();

    if (caseType) {
      uploads = await VeteranRequiredDocumentUpload.find({
        userId: grievance.userId,
        caseType: caseType._id,
      }).sort({ documentSortOrder: 1 });

      if (grievance.attachments?.length) {
        const attachmentSet = new Set(grievance.attachments);
        uploads = uploads.filter((u) => attachmentSet.has(u.storedPath));
      }
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
