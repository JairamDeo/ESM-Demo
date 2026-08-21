import "./config/env";
import app from "./app";
import connectDB from "./config/database";
import { ensureRolePermissionsSeeded } from "./services/rbacService";
import { verifyCloudinaryConnection } from "./services/storageService";
import { getLanIPv4Addresses } from "./utils/network";

import { runSlaEscalationCheck } from "./services/slaEscalationService";

const PORT = parseInt(process.env.PORT || "5000", 10);
const HOST = process.env.HOST || "0.0.0.0";

const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();
    await ensureRolePermissionsSeeded();
    await verifyCloudinaryConnection();

    // ── SLA auto-escalation: adaptive poll interval ──────────────────────────
    // Poll every half of the shortest configured SLA window.
    // Floor: 30 s  |  Ceiling: 5 min  (so a 1-min SLA polls every 30 s)
    const MIN_POLL_MS  = 30 * 1000;          // 30 seconds
    const MAX_POLL_MS  = 5 * 60 * 1000;      // 5 minutes
    const CONFIG_REFRESH_MS = 60 * 60 * 1000; // re-read SLA config every 1 h

    let slaIntervalHandle: ReturnType<typeof setInterval> | null = null;

    const runSlaCheck = async (label: string) => {
      try {
        const count = await runSlaEscalationCheck();
        if (count > 0) {
          console.log(`⏫  ${label}: auto-escalated ${count} grievance step(s) due to SLA breach`);
        }
      } catch (err: any) {
        console.error("SLA escalation check failed:", err.message);
      }
    };

    /** Compute the shortest SLA window (minutes) across all tiers from DB config. */
    const getShortestSlaMinutes = async (): Promise<number | null> => {
      try {
        const { getSlaConfig } = await import("./services/slaConfigService");
        const cfg = await getSlaConfig();
        const candidates: number[] = [];
        const push = (h?: number | null, m?: number | null) => {
          const total = (h || 0) * 60 + (m || 0);
          if (total > 0) candidates.push(total);
        };
        if (cfg.mode === "common") {
          push(cfg.hours, cfg.minutes);
        } else {
          push(cfg.l1Hours, cfg.l1Minutes);
          push(cfg.l2Hours, cfg.l2Minutes);
          push(cfg.l3Hours, cfg.l3Minutes);
        }
        return candidates.length ? Math.min(...candidates) : null;
      } catch {
        return null;
      }
    };

    /** (Re-)start the SLA poll with the correct interval derived from config. */
    const startSlaPoller = async () => {
      const shortestMin = await getShortestSlaMinutes();
      const pollMs = shortestMin
        ? Math.max(MIN_POLL_MS, Math.min(Math.floor((shortestMin * 60 * 1000) / 2), MAX_POLL_MS))
        : MAX_POLL_MS;

      if (slaIntervalHandle) clearInterval(slaIntervalHandle);
      slaIntervalHandle = setInterval(() => void runSlaCheck("Scheduled"), pollMs);
      console.log(
        `⏱️  SLA poller started — interval: ${pollMs / 1000}s` +
        (shortestMin ? ` (shortest SLA: ${shortestMin}m)` : " (no SLA configured, using default)")
      );
    };

    // Run immediately on startup, then start adaptive poller
    void runSlaCheck("Startup");
    void startSlaPoller();

    // Re-read SLA config every hour in case admin changes the window
    setInterval(() => void startSlaPoller(), CONFIG_REFRESH_MS);

    // Start Express server
    const server = app.listen(PORT, HOST, () => {
      const lanIps = getLanIPv4Addresses();
      console.log("\n═══════════════════════════════════════════════");
      console.log("  🛡️  Vitric ESM Backend API");
      console.log("═══════════════════════════════════════════════");
      console.log(`  🚀  Listening on ${HOST}:${PORT}`);
      console.log(`  🌍  Environment: ${process.env.NODE_ENV}`);
      console.log(`  🔗  Local:   http://localhost:${PORT}`);
      console.log(`  👋  Welcome: http://localhost:${PORT}/`);
      console.log(`  ❤️  Health:  http://localhost:${PORT}/health`);
      if (lanIps.length) {
        console.log("  📡  LAN (direct API — optional):");
        for (const ip of lanIps) {
          console.log(`       http://${ip}:${PORT}/health`);
        }
        console.log("  💡  Teammates using YOUR frontend only need :5173");
        console.log("      Set frontend VITE_API_URL=/api (Vite proxies here).");
      } else {
        console.log("  ⚠️  No LAN IPv4 found — Wi‑Fi/Ethernet may be off.");
      }
      console.log("═══════════════════════════════════════════════\n");
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("⚠️  SIGTERM received. Shutting down gracefully...");
      server.close(() => {
        console.log("✅  Server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      console.log("\n⚠️  SIGINT received. Shutting down gracefully...");
      server.close(() => {
        console.log("✅  Server closed");
        process.exit(0);
      });
    });

    // Handle unhandled rejections
    process.on("unhandledRejection", (reason: Error) => {
      console.error("❌  Unhandled Promise Rejection:", reason.message);
      server.close(() => process.exit(1));
    });
  } catch (error: any) {
    console.error("❌  Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
