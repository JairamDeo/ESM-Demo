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
  getCaseTypes, getCaseTypeById, createCaseType, updateCaseType, deleteCaseType,
  getReports,
  getNotifications, markNotificationRead,
  updateUserProfile, getCategories, createCategory, updateCategory
} from "../controllers/miscControllers";
import { protect, adminOnly, restrictTo } from "../middleware/auth";

// ═══════════════════════════════════════════════════════════════════════════════
// STATES MASTER
// ═══════════════════════════════════════════════════════════════════════════════
export const statesRouter = Router();

statesRouter.get("/", protect, async (req, res) => {
  try {
    const State = (await import("../models/State")).default;
    const states = await State.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: states });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// HQ MASTER
// ═══════════════════════════════════════════════════════════════════════════
export const hqRouter = Router();

hqRouter.get("/", protect, async (req, res) => {
  try {
    const HQ = (await import("../models/HeadQuarter")).default;
    const hqs = await HQ.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: hqs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// STATIONS
// ═══════════════════════════════════════════════════════════════════════════════
export const stationRouter = Router();

stationRouter.get("/",              protect, getStations);
stationRouter.post("/",             protect, restrictTo("super_admin", "area"), createStation);
stationRouter.get("/:id",           protect, adminOnly, getStationById);
stationRouter.put("/:id",           protect, restrictTo("super_admin", "area"), updateStation);
stationRouter.delete("/:id",        protect, restrictTo("super_admin"), deleteStation);
stationRouter.post("/:id/generate-qr", protect, adminOnly, generateQRForStation);

// ═══════════════════════════════════════════════════════════════════════════════
// QR CODES
// ═══════════════════════════════════════════════════════════════════════════════
export const qrRouter = Router();

qrRouter.get("/",                protect, adminOnly, getQRCodes);
qrRouter.post("/",               protect, adminOnly, generateQRCode);
qrRouter.get("/:id/view",        viewQRCode);
qrRouter.get("/:id/download",    downloadQRCode);
qrRouter.post("/:id/regenerate", protect, adminOnly, regenerateQRCode);
qrRouter.patch("/:id/toggle",    protect, adminOnly, toggleQRStatus);
qrRouter.get("/:id",             protect, adminOnly, getQRCodeById);
qrRouter.post("/scan/:code",     recordScan);

// ═══════════════════════════════════════════════════════════════════════════════
// OFFICERS
// ═══════════════════════════════════════════════════════════════════════════════
export const officerRouter = Router();

officerRouter.get("/",                    protect, adminOnly, getOfficers);
officerRouter.post("/",                   protect, restrictTo("super_admin", "area"), createOfficer);
officerRouter.get("/:id",                 protect, adminOnly, getOfficerById);
officerRouter.put("/:id",                 protect, restrictTo("super_admin", "area"), updateOfficer);
officerRouter.patch("/:id/toggle-status", protect, restrictTo("super_admin", "area"), toggleOfficerStatus);
officerRouter.delete("/:id",              protect, restrictTo("super_admin"), deleteOfficer);

// ═══════════════════════════════════════════════════════════════════════════════
// CASE TYPES
// ═══════════════════════════════════════════════════════════════════════════════
export const caseTypeRouter = Router();

caseTypeRouter.get("/",    protect, getCaseTypes);
caseTypeRouter.post("/",   protect, restrictTo("super_admin", "area"), createCaseType);
caseTypeRouter.get("/:id", protect, adminOnly, getCaseTypeById);
caseTypeRouter.put("/:id", protect, restrictTo("super_admin", "area"), updateCaseType);
caseTypeRouter.delete("/:id", protect, restrictTo("super_admin", "area"), deleteCaseType);

// ═══════════════════════════════════════════════════════════════════════════════
// ESCALATIONS
// ═══════════════════════════════════════════════════════════════════════════════
export const escalationRouter = Router();

escalationRouter.get("/",            protect, adminOnly, getEscalations);
escalationRouter.post("/",           protect, adminOnly, createEscalation);
escalationRouter.get("/:id",         protect, adminOnly, getEscalationById);
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

notificationRouter.get("/",          protect, getNotifications);
notificationRouter.patch("/:id/read", protect, markNotificationRead);

// ═══════════════════════════════════════════════════════════════════════════════
// USER PROFILE
// ═══════════════════════════════════════════════════════════════════════════════
export const userRouter = Router();

userRouter.put("/profile", protect, restrictTo("user"), updateUserProfile);

// ═══════════════════════════════════════════════════════════════════════════════
// Category Router
// ═══════════════════════════════════════════════════════════════════════════════
export const categoryRouter = Router();

categoryRouter.get("/", protect, getCategories);
categoryRouter.post("/", protect, restrictTo("super_admin", "area"), createCategory);
categoryRouter.put("/:id", protect, restrictTo("super_admin", "area"), updateCategory);