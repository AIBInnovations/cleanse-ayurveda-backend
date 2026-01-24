import "@shared/env-loader";
import { database as connectDB } from "@shared/config";
import mongoose from "mongoose";
import createApp from "./config/express.config.js";
import { initializeJobs, stopAllJobs } from "./src/jobs/job-scheduler.js";

const PORT = process.env.PORT || 3003;
let server = null;

const gracefulShutdown = async (signal) => {
  console.log(`> Received ${signal}, shutting down gracefully...`);

  // Stop all scheduled jobs
  stopAllJobs();

  if (server) {
    server.close(async () => {
      console.log("> HTTP server closed");
      try {
        await mongoose.connection.close();
        console.log("> MongoDB connection closed");
      } catch (err) {
        console.error("> Error closing MongoDB connection:", err);
      }
      process.exit(0);
    });

    setTimeout(() => {
      console.error("> Forced shutdown after timeout");
      process.exit(1);
    }, 5000);
  } else {
    process.exit(0);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

async function startServer() {
  console.log("> Starting server...");

  await connectDB();

  const app = createApp();

  // Initialize background jobs
  initializeJobs();

  server = app.listen(PORT, () => {
    console.log(`> Server running on port ${PORT}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`> Port ${PORT} is already in use`);
      stopAllJobs();
      process.exit(1);
    } else {
      console.error("> Server error:", err);
      gracefulShutdown("SERVER_ERROR");
    }
  });
}

startServer().catch((error) => {
  console.error("> Failed to start server:", error);
  process.exit(1);
});
