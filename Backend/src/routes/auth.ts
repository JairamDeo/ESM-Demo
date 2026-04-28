import { Router } from "express";
import {
  adminLogin, adminLogout, getAdminMe,
  sendOTP, verifyOTP, getUserMe,
} from "../controllers/authController";
import { protect, adminOnly } from "../middleware/auth";

const router = Router();

// ─── Admin ───────────────────────────────────────────────────────────────────
router.post("/admin/login", adminLogin);
router.post("/admin/logout", protect, adminLogout);
router.get("/admin/me", protect, adminOnly, getAdminMe);

// ─── User (Veteran OTP) ───────────────────────────────────────────────────────
router.post("/user/send-otp", sendOTP);
router.post("/user/verify-otp", verifyOTP);
router.get("/user/me", protect, getUserMe);

export default router;
