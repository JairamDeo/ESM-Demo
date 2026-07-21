import { Request, Response } from "express";
import mongoose from "mongoose";
import CaseType from "../models/CaseType";
import Grievance from "../models/Grievance";
import CaseTypeRequiredDocuments from "../models/CaseTypeRequiredDocuments";
import VeteranRequiredDocumentUpload from "../models/VeteranRequiredDocumentUpload";
import User from "../models/User";
import { deleteStoredAsset, serveStoredFile } from "../services/storageResolver";
import { storeUploadedBuffer } from "../services/storageService";
import { reuploadGrievanceDocument } from "../services/grievanceDocuments";
import {
  buildRequiredDocFolder,
  slugifySegment,
  veteranStorageKey,
} from "../services/veteranDocumentStorage";

function paramString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

async function resolveCaseTypeById(caseTypeId: string) {
  const trimmed = caseTypeId.trim();
  if (!mongoose.Types.ObjectId.isValid(trimmed)) {
    return null;
  }
  return CaseType.findById(trimmed).populate("category", "name");
}

async function getChecklistForCaseType(caseType: any) {
  const doc = await CaseTypeRequiredDocuments.findOne({
    caseType: caseType._id,
    isActive: { $ne: false },
  }).lean();

  const categoryName = (caseType.category as any)?.name ?? doc?.categoryName ?? "";
  const documents = (doc?.documents ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    caseTypeId: caseType._id,
    caseTypeSlug: caseType.id,
    caseTypeName: caseType.name,
    caseTypeNameHi: (caseType as any).nameHi ?? doc?.caseTypeNameHi ?? "",
    categoryName,
    description: caseType.description ?? "",
    documents,
    questions: doc?.questions ?? [],
    questionsHi: doc?.questionsHi ?? [],
    guidelines: doc?.guidelines ?? [],
    guidelinesHi: doc?.guidelinesHi ?? [],
    note: doc?.note ?? "",
    noteHi: doc?.noteHi ?? "",
    acceptedFormats: doc?.acceptedFormats ?? "PDF, JPG, JPEG, PNG",
    maxFileSizeMb: doc?.maxFileSizeMb ?? 5,
    isActive: doc?.isActive !== false,
  };
}

function mergeUploadsIntoChecklist(checklist: any, uploads: any[]) {
  const byLabel = new Map(uploads.map((u) => [u.documentLabel, u]));
  const byOrder = new Map(uploads.map((u) => [u.documentSortOrder, u]));

  const items = checklist.documents.map((d: any, index: number) => {
    const upload = byLabel.get(d.label) ?? byOrder.get(d.sortOrder ?? index);
    return {
      label: d.label,
      text: d.text,
      isMandatory: d.isMandatory !== false,
      sortOrder: d.sortOrder ?? index,
      templateUrl: d.templateUrl || null,
      templateFileName: d.templateFileName || null,
      upload: upload
        ? {
            uploadId: upload._id,
            originalFileName: upload.originalFileName,
            fileUrl: upload.storedPath,
            mimeType: upload.mimeType,
            fileSize: upload.fileSize,
            uploadedAt: upload.updatedAt ?? upload.createdAt,
            previewUrl: `/api/veteran/required-documents/uploads/${upload._id}/preview`,
          }
        : null,
    };
  });

  const uploadedCount = items.filter((i: any) => i.upload).length;
  const mandatoryCount = items.filter((i: any) => i.isMandatory).length;
  const mandatoryUploaded = items.filter((i: any) => i.isMandatory && i.upload).length;

  return {
    ...checklist,
    items,
    summary: {
      totalDocuments: items.length,
      uploadedCount,
      mandatoryCount,
      mandatoryUploaded,
      allMandatoryUploaded: mandatoryCount === 0 || mandatoryUploaded >= mandatoryCount,
    },
  };
}

/** Step 2 — checklist + veteran's current uploads for this case type */
export const getVeteranDocumentChecklist = async (req: Request, res: Response): Promise<void> => {
  try {
    const caseTypeId = paramString(req.query.caseTypeId as string | string[]);

    if (!caseTypeId) {
      res.status(400).json({
        success: false,
        message: "caseTypeId query parameter is required (MongoDB _id)",
      });
      return;
    }

    const caseType = await resolveCaseTypeById(caseTypeId);
    if (!caseType) {
      res.status(404).json({ success: false, message: "Case type not found" });
      return;
    }

    const userId = (req as any).user.id;
    const checklist = await getChecklistForCaseType(caseType);

    const uploads = await VeteranRequiredDocumentUpload.find({
      userId,
      caseType: caseType._id,
      grievanceId: { $exists: false },
    }).sort({ documentSortOrder: 1 });

    res.json({
      success: true,
      data: mergeUploadsIntoChecklist(checklist, uploads),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Upload one required document (replaces previous for same label) */
export const uploadVeteranRequiredDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const caseTypeId = paramString(req.body.caseTypeId);
    const grievanceIdRaw = paramString(req.body.grievanceId);

    const documentLabel = paramString(req.body.documentLabel);
    const itemIndexRaw = req.body.itemIndex;
    const itemIndex =
      itemIndexRaw !== undefined && itemIndexRaw !== "" ? parseInt(String(itemIndexRaw), 10) : NaN;

    if (!caseTypeId) {
      res.status(400).json({ success: false, message: "caseTypeId is required (MongoDB _id)" });
      return;
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ success: false, message: "file is required" });
      return;
    }

    const caseType = await resolveCaseTypeById(caseTypeId);
    if (!caseType) {
      res.status(404).json({ success: false, message: "Case type not found" });
      return;
    }

    const checklist = await getChecklistForCaseType(caseType);
    if (!checklist.isActive || checklist.documents.length === 0) {
      res.status(400).json({ success: false, message: "No document checklist configured for this case type" });
      return;
    }

    let docItem = checklist.documents.find((d) => d.label === documentLabel);
    if (!docItem && !Number.isNaN(itemIndex)) {
      docItem = checklist.documents[itemIndex];
    }
    if (!docItem) {
      res.status(400).json({ success: false, message: "Invalid documentLabel or itemIndex" });
      return;
    }

    if (grievanceIdRaw && mongoose.Types.ObjectId.isValid(grievanceIdRaw)) {
      const grievance = await Grievance.findOne({
        _id: grievanceIdRaw,
        userId: user.id,
        isDeleted: false,
      });
      if (!grievance) {
        res.status(404).json({ success: false, message: "Grievance not found" });
        return;
      }

      const reupload = await reuploadGrievanceDocument({
        grievance,
        userId: user.id,
        documentLabel: docItem.label,
        file,
      });
      await grievance.save();

      res.status(200).json({
        success: true,
        message: "Document updated",
        data: {
          uploadId: reupload.upload._id,
          caseTypeId: caseType._id,
          documentLabel: docItem.label,
          originalFileName: reupload.upload.originalFileName,
          fileUrl: reupload.storedUrl,
          mimeType: reupload.upload.mimeType,
          fileSize: reupload.upload.fileSize,
          previewUrl: `/api/veteran/required-documents/uploads/${reupload.upload._id}/preview`,
        },
      });
      return;
    }

    const maxMb = checklist.maxFileSizeMb ?? 5;
    if (file.size > maxMb * 1024 * 1024) {
      res.status(400).json({ success: false, message: `File exceeds ${maxMb} MB limit` });
      return;
    }

    const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowed.includes(file.mimetype)) {
      res.status(400).json({ success: false, message: "Only PDF, JPG, JPEG, PNG allowed" });
      return;
    }

    const dbUser = await User.findById(user.id).lean();
    const veteranKey = veteranStorageKey({
      id: user.id,
      phone: dbUser?.phone ?? user.phone,
      name: dbUser?.name ?? user.name,
    });

    const cloudFolder = buildRequiredDocFolder(
      veteranKey,
      checklist.categoryName,
      caseType.id,
      docItem.label
    );

    const baseName = `${slugifySegment(docItem.label)}-${Date.now()}`;
    const stored = await storeUploadedBuffer(file.buffer, {
      folder: cloudFolder,
      fileName: baseName,
      mimetype: file.mimetype,
    });

    const storedPath = stored.url;

    const existing = await VeteranRequiredDocumentUpload.findOne({
      userId: user.id,
      caseType: caseType._id,
      documentLabel: docItem.label,
      grievanceId: { $exists: false },
    });

    if (existing?.storedPath) {
      await deleteStoredAsset(existing.storedPath);
    }

    const record = existing
      ? await VeteranRequiredDocumentUpload.findByIdAndUpdate(
          existing._id,
          {
            veteranKey,
            caseType: caseType._id,
            caseTypeName: caseType.name,
            categoryName: checklist.categoryName,
            documentSortOrder: docItem.sortOrder,
            originalFileName: file.originalname,
            storedPath,
            mimeType: stored.mimeType,
            fileSize: stored.bytes,
          },
          { new: true }
        )
      : await VeteranRequiredDocumentUpload.create({
          userId: user.id,
          veteranKey,
          caseType: caseType._id,
          caseTypeSlug: caseType.id,
          caseTypeName: caseType.name,
          categoryName: checklist.categoryName,
          documentLabel: docItem.label,
          documentSortOrder: docItem.sortOrder,
          originalFileName: file.originalname,
          storedPath,
          mimeType: stored.mimeType,
          fileSize: stored.bytes,
        });

    res.status(201).json({
      success: true,
      message: "Document uploaded",
      data: {
        uploadId: record!._id,
        caseTypeId: caseType._id,
        documentLabel: docItem.label,
        originalFileName: record!.originalFileName,
        fileUrl: record!.storedPath,
        mimeType: record!.mimeType,
        fileSize: record!.fileSize,
        previewUrl: `/api/veteran/required-documents/uploads/${record!._id}/preview`,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** List veteran uploads for a case type (draft, not yet linked to grievance) */
export const listVeteranUploads = async (req: Request, res: Response): Promise<void> => {
  try {
    const caseTypeId = paramString(req.query.caseTypeId as string | string[]);

    if (!caseTypeId) {
      res.status(400).json({ success: false, message: "caseTypeId query parameter is required (MongoDB _id)" });
      return;
    }

    const caseType = await resolveCaseTypeById(caseTypeId);
    if (!caseType) {
      res.status(404).json({ success: false, message: "Case type not found" });
      return;
    }

    const uploads = await VeteranRequiredDocumentUpload.find({
      userId: (req as any).user.id,
      caseType: caseType._id,
      grievanceId: { $exists: false },
    }).sort({ documentSortOrder: 1 });

    res.json({
      success: true,
      data: uploads.map((u) => ({
        uploadId: u._id,
        caseTypeId: u.caseType,
        documentLabel: u.documentLabel,
        originalFileName: u.originalFileName,
        fileUrl: u.storedPath,
        mimeType: u.mimeType,
        fileSize: u.fileSize,
        previewUrl: `/api/veteran/required-documents/uploads/${u._id}/preview`,
        uploadedAt: u.updatedAt,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Preview / download veteran uploaded file — :uploadId = upload record MongoDB _id from upload/checklist response */
export const previewVeteranUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    const uploadId = paramString(req.params.uploadId);
    const upload = await VeteranRequiredDocumentUpload.findById(uploadId);
    if (!upload) {
      res.status(404).json({ success: false, message: "Upload not found" });
      return;
    }

    if (upload.userId.toString() !== (req as any).user.id) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    await serveStoredFile(res, upload.storedPath, {
      mimeType: upload.mimeType,
      fileName: upload.originalFileName,
      disposition: "inline",
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Download admin annexure template for a checklist item */
export const downloadChecklistTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const caseTypeId = paramString(req.query.caseTypeId as string | string[]);
    const documentLabel = paramString(req.query.documentLabel as string | string[]);
    const itemIndex = parseInt(paramString(req.query.itemIndex as string | string[]), 10);

    if (!caseTypeId) {
      res.status(400).json({ success: false, message: "caseTypeId query parameter is required (MongoDB _id)" });
      return;
    }

    const caseType = await resolveCaseTypeById(caseTypeId);
    if (!caseType) {
      res.status(404).json({ success: false, message: "Case type not found" });
      return;
    }

    const checklist = await getChecklistForCaseType(caseType);
    let docItem = checklist.documents.find((d) => d.label === documentLabel);
    if (!docItem && !Number.isNaN(itemIndex)) docItem = checklist.documents[itemIndex];
    if (!docItem?.templateUrl) {
      res.status(404).json({ success: false, message: "No template available for this document" });
      return;
    }

    await serveStoredFile(res, docItem.templateUrl, {
      mimeType: "application/pdf",
      fileName: docItem.templateFileName || "template.pdf",
      disposition: "attachment",
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Clear all draft uploads for a case type (new grievance — not linked to any grievance yet) */
export const clearVeteranDraftUploads = async (req: Request, res: Response): Promise<void> => {
  try {
    const caseTypeId = paramString(req.query.caseTypeId as string | string[]);
    if (!caseTypeId) {
      res.status(400).json({ success: false, message: "caseTypeId query parameter is required" });
      return;
    }

    const caseType = await resolveCaseTypeById(caseTypeId);
    if (!caseType) {
      res.status(404).json({ success: false, message: "Case type not found" });
      return;
    }

    const userId = (req as any).user.id;
    const uploads = await VeteranRequiredDocumentUpload.find({
      userId,
      caseType: caseType._id,
      grievanceId: { $exists: false },
    });

    for (const upload of uploads) {
      if (upload.storedPath) {
        await deleteStoredAsset(upload.storedPath).catch(() => undefined);
      }
      await upload.deleteOne();
    }

    res.json({ success: true, message: "Draft uploads cleared", cleared: uploads.length });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Delete veteran upload — :uploadId = upload record MongoDB _id from upload/checklist response */
export const deleteVeteranUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    const uploadId = paramString(req.params.uploadId);
    const upload = await VeteranRequiredDocumentUpload.findById(uploadId);
    if (!upload) {
      res.status(404).json({ success: false, message: "Upload not found" });
      return;
    }

    if (upload.userId.toString() !== (req as any).user.id) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    if (upload.grievanceId) {
      res.status(400).json({ success: false, message: "Cannot delete — linked to submitted grievance" });
      return;
    }

    await deleteStoredAsset(upload.storedPath);

    await upload.deleteOne();
    res.json({ success: true, message: "Upload removed" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
