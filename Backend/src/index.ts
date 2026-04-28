import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import connectDB from "./config/database";

const PORT = parseInt(process.env.PORT || "5000", 10);

const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log("\n═══════════════════════════════════════════════");
      console.log("  🛡️  Vitric ESM Backend API");
      console.log("═══════════════════════════════════════════════");
      console.log(`  🚀  Server running on port ${PORT}`);
      console.log(`  🌍  Environment: ${process.env.NODE_ENV}`);
      console.log(`  🔗  URL: http://localhost:${PORT}`);
      console.log(`  ❤️  Health: http://localhost:${PORT}/health`);
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
