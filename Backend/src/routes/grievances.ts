import { Router } from "express";
import {
  getGrievances, getGrievanceById, createGrievance,
  updateGrievanceStatus, assignOfficer, addComment, resolveConcern,
  deleteGrievance, getMyGrievances, trackGrievance,
  getDashboardStats,deleteAllGrievances,
} from "../controllers/grievanceController";
import { protect, restrictTo, adminOnly } from "../middleware/auth";
import upload from "../middleware/upload";

const router = Router();

// ─── Dashboard stats (admin) ──────────────────────────────────────────────────
router.get("/dashboard", protect, adminOnly, getDashboardStats);

// ─── Public: track by ID ──────────────────────────────────────────────────────
router.get("/track/:id", trackGrievance);

// ─── User: my complaints ──────────────────────────────────────────────────────
router.get("/my", protect, restrictTo("user"), getMyGrievances);

// ─── User: submit grievance ───────────────────────────────────────────────────
router.post("/", protect, upload.array("attachments", 3), createGrievance);

// ─── Admin: list all ─────────────────────────────────────────────────────────
router.get("/", protect, adminOnly, getGrievances);

// ─── Admin: delete all grievances ────────────────────────────────────────────
router.delete("/delete-all", protect, restrictTo("super_admin"), deleteAllGrievances);

// ─── Admin: single ───────────────────────────────────────────────────────────
router.get("/:id", protect, adminOnly, getGrievanceById);

// ─── Admin: update status ─────────────────────────────────────────────────────
router.patch("/:id/status", protect, adminOnly, updateGrievanceStatus);

// ─── Admin: assign officer ────────────────────────────────────────────────────
router.patch("/:id/assign", protect, adminOnly, assignOfficer);

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
