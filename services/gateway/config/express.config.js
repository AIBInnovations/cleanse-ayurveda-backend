import express from "express";
import cors from "cors";
import { correlationId } from "../middlewares/correlation-id.middleware.js";
import { rateLimiter } from "../middlewares/rate-limiter.middleware.js";
import { gatewayAuth } from "../middlewares/auth.middleware.js";
import { setupRoutes } from "../services/routing.service.js";
import healthCheckService from "../services/health-check.service.js";
import { sendResponse } from "@shared/utils";
import { HTTP_STATUS } from "../utils/constants.js";

/**
 * Create and configure Express app
 */
const createApp = () => {
  const app = express();

  // CORS configuration
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "*",
      credentials: true,
    })
  );

  // Correlation ID middleware (must be first)
  app.use(correlationId);

  // Rate limiting
  app.use(rateLimiter);

  // Gateway health check endpoint
  app.get("/api/health", (req, res) => {
    const serviceStatus = healthCheckService.getHealthStatus();
    const allHealthy = Object.values(serviceStatus).every((s) => s.healthy);

    return sendResponse(
      res,
      allHealthy ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE,
      "Gateway health check",
      {
        status: allHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        services: serviceStatus,
      }
    );
  });

  app.get("/health", (req, res) => {
    return sendResponse(res, HTTP_STATUS.OK, "Gateway is running", {
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  });

  // Authentication middleware (after health checks)
  app.use(gatewayAuth);

  // Setup service routes
  setupRoutes(app);

  // 404 handler
  app.use((req, res) => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
        event: "NOT_FOUND",
        method: req.method,
        path: req.path,
      })
    );

    return sendResponse(
      res,
      HTTP_STATUS.NOT_FOUND,
      "Route not found",
      null,
      `Cannot ${req.method} ${req.path}`
    );
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
        event: "ERROR",
        error: err.message,
        stack: err.stack,
      })
    );

    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Internal gateway error",
      null,
      process.env.NODE_ENV === "development" ? err.message : "An error occurred"
    );
  });

  return app;
};

export default createApp;
