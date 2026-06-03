import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import connectDB from "./config/database";
import { ensureRolePermissionsSeeded } from "./services/rbacService";
import { getLanIPv4Addresses } from "./utils/network";

const PORT = parseInt(process.env.PORT || "5000", 10);
const HOST = process.env.HOST || "0.0.0.0";

const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();
    await ensureRolePermissionsSeeded();

    // Start Express server
    const server = app.listen(PORT, HOST, () => {
      const lanIps = getLanIPv4Addresses();
      console.log("\n═══════════════════════════════════════════════");
      console.log("  🛡️  Vitric ESM Backend API");
      console.log("═══════════════════════════════════════════════");
      console.log(`  🚀  Listening on ${HOST}:${PORT}`);
      console.log(`  🌍  Environment: ${process.env.NODE_ENV}`);
      console.log(`  🔗  Local:   http://localhost:${PORT}`);
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
