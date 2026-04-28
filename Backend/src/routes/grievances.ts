import { Router } from "express";
import {
  getGrievances, getGrievanceById, createGrievance,
  updateGrievanceStatus, assignOfficer, addComment,
  deleteGrievance, getMyGrievances, trackGrievance,
  getDashboardStats,
} from "../controllers/grievanceController";
import { protect, restrictTo, adminOnly } from "../middleware/auth";

const router = Router();

// ─── Dashboard stats (admin) ──────────────────────────────────────────────────
router.get("/dashboard", protect, adminOnly, getDashboardStats);

// ─── Public: track by ID ──────────────────────────────────────────────────────
router.get("/track/:id", trackGrievance);

// ─── User: my complaints ──────────────────────────────────────────────────────
router.get("/my", protect, restrictTo("user"), getMyGrievances);

// ─── User: submit grievance ───────────────────────────────────────────────────
router.post("/", protect, createGrievance);

// ─── Admin: list all ─────────────────────────────────────────────────────────
router.get("/", protect, adminOnly, getGrievances);

// ─── Admin: single ───────────────────────────────────────────────────────────
router.get("/:id", protect, adminOnly, getGrievanceById);

// ─── Admin: update status ─────────────────────────────────────────────────────
router.patch("/:id/status", protect, adminOnly, updateGrievanceStatus);

// ─── Admin: assign officer ────────────────────────────────────────────────────
router.patch("/:id/assign", protect, adminOnly, assignOfficer);

// ─── Comments (admin + user) ──────────────────────────────────────────────────
router.post("/:id/comments", protect, addComment);

// ─── Admin: delete ────────────────────────────────────────────────────────────
router.delete("/:id", protect, restrictTo("super_admin", "esm_officer"), deleteGrievance);

export default router;
