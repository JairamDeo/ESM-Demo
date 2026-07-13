import { Router } from "express";
import {
  getGrievances, getGrievanceById, createGrievance,
  updateGrievanceStatus, assignOfficer, addComment, resolveConcern,
  deleteGrievance, getMyGrievances, trackGrievance,
  getDashboardStats, deleteAllGrievances,
  requestEscalationTakeover, approveEscalationRequest, rejectEscalationRequest,
  getEscalationPreview, manualEscalateGrievance, requestEscalateToUpperTier,
  lookupVeteranByPhone,
  previewGrievanceDocument,
} from "../controllers/grievanceController";
import { getSlaSettings, updateSlaSettings } from "../controllers/slaController";
import { protect, restrictTo, adminOnly } from "../middleware/auth";
import { requirePermission } from "../middleware/requirePermission";
import upload from "../middleware/upload";

const router = Router();

// ─── Dashboard stats (admin) ──────────────────────────────────────────────────
router.get("/dashboard", protect, adminOnly, getDashboardStats);

// ─── SLA settings (on grievances page) ───────────────────────────────────────
router.get("/sla-config", protect, requirePermission("viewSlaSettings"), getSlaSettings);
router.put("/sla-config", protect, requirePermission("manageSlaSettings"), updateSlaSettings);

// ─── Public: track by ID ──────────────────────────────────────────────────────
router.get("/track/:id", trackGrievance);

// ─── User: my complaints ──────────────────────────────────────────────────────
router.get("/my", protect, restrictTo("user"), getMyGrievances);

// ─── User: submit grievance ───────────────────────────────────────────────────
router.post(
  "/",
  protect,
  upload.fields([
    { name: "attachments", maxCount: 3 },
    { name: "requiredDocuments", maxCount: 20 },
  ]),
  createGrievance
);

// ─── Admin: list all ─────────────────────────────────────────────────────────
router.get("/", protect, adminOnly, getGrievances);

// ─── Admin: lookup veteran by mobile ───────────────────────────────────────────
router.get("/veteran-lookup", protect, adminOnly, lookupVeteranByPhone);

// ─── Admin: delete all grievances ────────────────────────────────────────────
router.delete("/delete-all", protect, restrictTo("super_admin"), deleteAllGrievances);

// ─── Admin: preview submitted document ───────────────────────────────────────
router.get("/:id/documents/:uploadId/preview", protect, adminOnly, previewGrievanceDocument);

// ─── Admin: single ───────────────────────────────────────────────────────────
router.get("/:id", protect, adminOnly, getGrievanceById);

// ─── Admin: update status ─────────────────────────────────────────────────────
router.patch("/:id/status", protect, adminOnly, updateGrievanceStatus);

// ─── Admin: assign officer ────────────────────────────────────────────────────
router.patch("/:id/assign", protect, adminOnly, assignOfficer);

// ─── Escalation preview + manual escalate ────────────────────────────────────
router.get("/:id/escalation-preview", protect, adminOnly, getEscalationPreview);
router.post("/:id/escalate", protect, adminOnly, manualEscalateGrievance);

// ─── Escalation request workflow (L2/L3 → L1 approval) ───────────────────────
router.post("/:id/escalation-request", protect, adminOnly, requestEscalationTakeover);
router.post("/:id/escalate-to-upper-tier", protect, adminOnly, requestEscalateToUpperTier);
router.post("/:id/escalation-request/approve", protect, adminOnly, approveEscalationRequest);
router.post("/:id/escalation-request/reject", protect, adminOnly, rejectEscalationRequest);

// ─── Resolve concern (officer accepted veteran fix) ───────────────────────────
router.patch("/:id/concern/resolve", protect, adminOnly, resolveConcern);

// ─── Comments (admin + user) ──────────────────────────────────────────────────
router.post(
  "/:id/comments",
  protect,
  upload.fields([
    { name: "attachments", maxCount: 3 },
    { name: "documentFile", maxCount: 1 },
  ]),
  addComment
);

// ─── Admin: delete ────────────────────────────────────────────────────────────
router.delete("/:id", protect, restrictTo("super_admin", "esm_officer"), deleteGrievance);

export default router;
