import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth";
import upload from "../middleware/upload";
import {
  clearVeteranDraftUploads,
  deleteVeteranUpload,
  downloadChecklistTemplate,
  getVeteranDocumentChecklist,
  listVeteranUploads,
  previewVeteranUpload,
  uploadVeteranRequiredDocument,
} from "../controllers/veteranDocumentsController";

export const veteranDocumentsRouter = Router();

/** Download admin annexure PDF template — accessible by any authenticated role (user OR admin) */
veteranDocumentsRouter.get("/templates/download", protect, downloadChecklistTemplate);

/** Step 2 screen — checklist + upload status */
veteranDocumentsRouter.get("/checklist", protect, restrictTo("user"), getVeteranDocumentChecklist);

/** Upload file for one document item */
veteranDocumentsRouter.post("/upload", protect, restrictTo("user"), upload.single("file"), uploadVeteranRequiredDocument);

/** List current uploads for case type */
veteranDocumentsRouter.get("/uploads", protect, restrictTo("user"), listVeteranUploads);

/** Clear draft uploads before a new grievance filing */
veteranDocumentsRouter.delete("/drafts", protect, restrictTo("user"), clearVeteranDraftUploads);

/** Preview / inline view uploaded file — uploadId from upload response */
veteranDocumentsRouter.get("/uploads/:uploadId/preview", protect, restrictTo("user"), previewVeteranUpload);

/** Delete uploaded file (before grievance submit) — uploadId from upload response */
veteranDocumentsRouter.delete("/uploads/:uploadId", protect, restrictTo("user"), deleteVeteranUpload);
