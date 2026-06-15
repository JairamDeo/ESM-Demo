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

veteranDocumentsRouter.use(protect, restrictTo("user"));

/** Step 2 screen — checklist + upload status */
veteranDocumentsRouter.get("/checklist", getVeteranDocumentChecklist);

/** Upload file for one document item */
veteranDocumentsRouter.post("/upload", upload.single("file"), uploadVeteranRequiredDocument);

/** List current uploads for case type */
veteranDocumentsRouter.get("/uploads", listVeteranUploads);

/** Clear draft uploads before a new grievance filing */
veteranDocumentsRouter.delete("/drafts", clearVeteranDraftUploads);

/** Preview / inline view uploaded file — uploadId from upload response */
veteranDocumentsRouter.get("/uploads/:uploadId/preview", previewVeteranUpload);

/** Delete uploaded file (before grievance submit) — uploadId from upload response */
veteranDocumentsRouter.delete("/uploads/:uploadId", deleteVeteranUpload);

/** Download admin annexure PDF template */
veteranDocumentsRouter.get("/templates/download", downloadChecklistTemplate);
