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
  getOfficerCreateOptions,
} from "../controllers/officerController";
import { getStates, createState } from "../controllers/stateController";
import { getHQs, createHQ } from "../controllers/hqController";
import {
  getEscalations, getEscalationById, createEscalation, resolveEscalation,
} from "../controllers/escalationController";
import {
  getCaseTypes, getCaseTypeById, createCaseType, updateCaseType, deleteCaseType,
  getReports,
  getNotifications, markNotificationRead,
  subscribeToPushNotifications, sendTestPushNotification,
  updateUserProfile, getCategories, createCategory, updateCategory,
  uploadCategoryIcon, removeCategoryIconHandler
} from "../controllers/miscControllers";
import {
  getAnnouncements, createAnnouncement
} from "../controllers/announcementController";
import { protect, adminOnly, restrictTo } from "../middleware/auth";
import { requirePermission } from "../middleware/requirePermission";
import upload from "../middleware/upload";
import {
  listCaseTypeDocuments,
  getRequiredDocumentsForCaseType,
  upsertCaseTypeDocuments,
  uploadDocumentTemplate,
  removeDocumentTemplate,
} from "../controllers/caseTypeDocumentsController";

// ═══════════════════════════════════════════════════════════════════════════════
// STATES MASTER
// ═══════════════════════════════════════════════════════════════════════════════
export const statesRouter = Router();

statesRouter.get("/", protect, getStates);
statesRouter.post("/", protect, restrictTo("super_admin"), createState);

// ═══════════════════════════════════════════════════════════════════════════
// HQ MASTER
// ═══════════════════════════════════════════════════════════════════════════
export const hqRouter = Router();

hqRouter.get("/", protect, getHQs);
hqRouter.post("/", protect, restrictTo("super_admin", "area"), createHQ);

// ═══════════════════════════════════════════════════════════════════════════════
// STATIONS
// ═══════════════════════════════════════════════════════════════════════════════
export const stationRouter = Router();

stationRouter.get("/",              protect, getStations);
stationRouter.post("/",             protect, restrictTo("super_admin", "area", "headquarter"), createStation);
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

officerRouter.get("/create-options",      protect, adminOnly, getOfficerCreateOptions);
officerRouter.get("/",                    protect, adminOnly, getOfficers);
officerRouter.post("/",                   protect, restrictTo("super_admin", "area", "headquarter"), createOfficer);
officerRouter.get("/:id",                 protect, adminOnly, getOfficerById);
officerRouter.put("/:id",                 protect, restrictTo("super_admin", "area", "headquarter"), updateOfficer);
officerRouter.patch("/:id/toggle-status", protect, restrictTo("super_admin", "area", "headquarter"), toggleOfficerStatus);
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
// CASE TYPE REQUIRED DOCUMENTS
// ═══════════════════════════════════════════════════════════════════════════════
export const caseTypeDocumentsRouter = Router();

caseTypeDocumentsRouter.get(
  "/",
  protect,
  requirePermission("viewRequiredDocuments"),
  listCaseTypeDocuments
);
caseTypeDocumentsRouter.get("/for-case-type", protect, getRequiredDocumentsForCaseType);
caseTypeDocumentsRouter.put(
  "/:caseTypeId",
  protect,
  requirePermission("manageRequiredDocuments"),
  upsertCaseTypeDocuments
);
caseTypeDocumentsRouter.post(
  "/:caseTypeId/templates",
  protect,
  requirePermission("manageRequiredDocuments"),
  upload.single("template"),
  uploadDocumentTemplate
);
caseTypeDocumentsRouter.delete(
  "/:caseTypeId/templates/:itemIndex",
  protect,
  requirePermission("manageRequiredDocuments"),
  removeDocumentTemplate
);

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
notificationRouter.post("/subscribe", protect, subscribeToPushNotifications);
notificationRouter.post("/test-push", protect, sendTestPushNotification);

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
categoryRouter.post("/", protect, restrictTo("super_admin", "area"), upload.single("icon"), createCategory);
categoryRouter.put("/:id", protect, restrictTo("super_admin", "area"), updateCategory);
categoryRouter.put("/:id/icon", protect, restrictTo("super_admin", "area"), upload.single("icon"), uploadCategoryIcon);
categoryRouter.delete("/:id/icon", protect, restrictTo("super_admin", "area"), removeCategoryIconHandler);

// ═══════════════════════════════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════════════════════════
export const announcementRouter = Router();

announcementRouter.get("/", protect, adminOnly, getAnnouncements);
announcementRouter.post("/", protect, adminOnly, createAnnouncement);