import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth";
import grievanceRoutes from "./routes/grievances";
import translateRouter from "./routes/translate";
import {
  stationRouter, qrRouter, officerRouter,
  caseTypeRouter, caseTypeDocumentsRouter, escalationRouter, reportsRouter,
  notificationRouter, userRouter, statesRouter, hqRouter, categoryRouter,
  announcementRouter
} from "./routes/index";

import { rbacRouter } from "./routes/rbac";
import { veteranDocumentsRouter } from "./routes/veteranDocuments";
import { errorHandler, notFound } from "./middleware/errorHandler";

const app: Application = express();

// ─── Security middleware ──────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── Rate limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
  max: parseInt(process.env.RATE_LIMIT_MAX || "100"),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});
app.use("/api", limiter);

// Stricter limit on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many login attempts. Try again in 15 minutes." },
});
app.use("/api/auth", authLimiter);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Vitric ESM Backend API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    environment: process.env.NODE_ENV,
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth",          authRoutes);
app.use("/api/states-master", statesRouter);
app.use("/api/hq-master",     hqRouter);
app.use("/api/grievances",    grievanceRoutes);
app.use("/api/stations",      stationRouter);
app.use("/api/qr-codes",      qrRouter);
app.use("/api/officers",      officerRouter);
app.use("/api/case-types",    caseTypeRouter);
app.use("/api/case-type-documents", caseTypeDocumentsRouter);
app.use("/api/escalations",   escalationRouter);
app.use("/api/reports",       reportsRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/users",         userRouter);
app.use("/api/categories",    categoryRouter);
app.use("/api/announcements", announcementRouter);
app.use("/api/rbac",          rbacRouter);
app.use("/api/veteran/required-documents", veteranDocumentsRouter);
app.use("/api/translate",     translateRouter);

// ─── 404 + Error handler ──────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
