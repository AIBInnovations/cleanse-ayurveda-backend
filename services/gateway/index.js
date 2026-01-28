import "@shared/env-loader";
import createApp from "./config/express.config.js";
import healthCheckService from "./services/health-check.service.js";
import { closeAllProxies } from "./services/routing.service.js";

const PORT = process.env.PORT || 3000;

let server = null;

/**
 * Gracefully shutdown the server
 */
const gracefulShutdown = (signal) => {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "SHUTDOWN_INITIATED",
      signal,
      service: "gateway",
    })
  );

  // Stop health check service
  healthCheckService.stopPeriodicChecks();

  // Close all proxy instances
  closeAllProxies();

  if (server) {
    server.close(() => {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          event: "SERVER_CLOSED",
          service: "gateway",
        })
      );
      process.exit(0);
    });

    // Force exit after 5 seconds if server hasn't closed
    setTimeout(() => {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          event: "FORCED_SHUTDOWN",
          service: "gateway",
        })
      );
      process.exit(1);
    }, 5000);
  } else {
    process.exit(0);
  }
};

const startServer = async () => {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "SERVER_STARTING",
      service: "gateway",
      port: PORT,
    })
  );

  // Create Express app
  const app = createApp();

  // Start health check monitoring
  healthCheckService.startPeriodicChecks();

  // Start server and store the instance
  server = app.listen(PORT, () => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        event: "SERVER_STARTED",
        service: "gateway",
        port: PORT,
        message: `API Gateway running on port ${PORT}`,
      })
    );
  });

  // Handle server errors
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          event: "PORT_IN_USE",
          port: PORT,
          message: `Port ${PORT} is already in use. Please ensure no other process is using this port.`,
        })
      );
      healthCheckService.stopPeriodicChecks();
      process.exit(1);
    } else {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          event: "SERVER_ERROR",
          error: err.message,
          stack: err.stack,
        })
      );
      gracefulShutdown("SERVER_ERROR");
    }
  });
};

// Handle graceful shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "UNHANDLED_REJECTION",
      error: err.message,
      stack: err.stack,
    })
  );
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "UNCAUGHT_EXCEPTION",
      error: err.message,
      stack: err.stack,
    })
  );
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

startServer();
