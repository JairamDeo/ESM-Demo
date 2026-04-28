import { Router } from "express";
import {
  getStations, getStationById, createStation,
  updateStation, deleteStation, generateQRForStation,
} from "../controllers/stationController";
import {
  getQRCodes, getQRCodeById, generateQRCode, viewQRCode,
  downloadQRCode, regenerateQRCode, recordScan, toggleQRStatus,
} from "../controllers/qrCodeController";
import {
  getOfficers, getOfficerById, createOfficer,
  updateOfficer, toggleOfficerStatus, deleteOfficer,
} from "../controllers/officerController";
import {
  getEscalations, getEscalationById, createEscalation, resolveEscalation,
} from "../controllers/escalationController";
import {
  getCaseTypes, getCaseTypeById, createCaseType, updateCaseType,
  getReports,
  getNotifications, markNotificationRead,
  updateUserProfile,
} from "../controllers/miscControllers";
import { protect, adminOnly, restrictTo } from "../middleware/auth";

// ═══════════════════════════════════════════════════════════════════════════════
// STATIONS
// ═══════════════════════════════════════════════════════════════════════════════
export const stationRouter = Router();

stationRouter.get("/", protect, adminOnly, getStations);
stationRouter.post("/", protect, restrictTo("super_admin", "esm_officer"), createStation);
stationRouter.get("/:id", protect, adminOnly, getStationById);
stationRouter.put("/:id", protect, restrictTo("super_admin", "esm_officer"), updateStation);
stationRouter.delete("/:id", protect, restrictTo("super_admin"), deleteStation);
stationRouter.post("/:id/generate-qr", protect, adminOnly, generateQRForStation);

// ═══════════════════════════════════════════════════════════════════════════════
// QR CODES
// ═══════════════════════════════════════════════════════════════════════════════
export const qrRouter = Router();

qrRouter.get("/", protect, adminOnly, getQRCodes);
qrRouter.post("/", protect, adminOnly, generateQRCode);
qrRouter.get("/:id/view", viewQRCode);           // Public — SVG response
qrRouter.get("/:id/download", downloadQRCode);   // Public — PNG download
qrRouter.post("/:id/regenerate", protect, adminOnly, regenerateQRCode);
qrRouter.patch("/:id/toggle", protect, adminOnly, toggleQRStatus);
qrRouter.get("/:id", protect, adminOnly, getQRCodeById);
qrRouter.post("/scan/:code", recordScan);         // Public — scan tracking

// ═══════════════════════════════════════════════════════════════════════════════
// OFFICERS
// ═══════════════════════════════════════════════════════════════════════════════
export const officerRouter = Router();

officerRouter.get("/", protect, adminOnly, getOfficers);
officerRouter.post("/", protect, restrictTo("super_admin", "esm_officer"), createOfficer);
officerRouter.get("/:id", protect, adminOnly, getOfficerById);
officerRouter.put("/:id", protect, restrictTo("super_admin", "esm_officer"), updateOfficer);
officerRouter.patch("/:id/toggle-status", protect, restrictTo("super_admin", "esm_officer"), toggleOfficerStatus);
officerRouter.delete("/:id", protect, restrictTo("super_admin"), deleteOfficer);

// ═══════════════════════════════════════════════════════════════════════════════
// CASE TYPES
// ═══════════════════════════════════════════════════════════════════════════════
export const caseTypeRouter = Router();

caseTypeRouter.get("/", protect, adminOnly, getCaseTypes);
caseTypeRouter.post("/", protect, restrictTo("super_admin"), createCaseType);
caseTypeRouter.get("/:id", protect, adminOnly, getCaseTypeById);
caseTypeRouter.put("/:id", protect, restrictTo("super_admin"), updateCaseType);

// ═══════════════════════════════════════════════════════════════════════════════
// ESCALATIONS
// ═══════════════════════════════════════════════════════════════════════════════
export const escalationRouter = Router();

escalationRouter.get("/", protect, adminOnly, getEscalations);
escalationRouter.post("/", protect, adminOnly, createEscalation);
escalationRouter.get("/:id", protect, adminOnly, getEscalationById);
escalationRouter.patch("/:id/resolve", protect, adminOnly, resolveEscalation);

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════════════════
export const reportsRouter = Router();

reportsRouter.get("/", protect, adminOnly, getReports);

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════
export const notificationRouter = Router();

notificationRouter.get("/", protect, getNotifications);
notificationRouter.patch("/:id/read", protect, markNotificationRead);

// ═══════════════════════════════════════════════════════════════════════════════
// USER PROFILE
// ═══════════════════════════════════════════════════════════════════════════════
export const userRouter = Router();

userRouter.put("/profile", protect, restrictTo("user"), updateUserProfile);
