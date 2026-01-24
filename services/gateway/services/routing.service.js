import { createProxyMiddleware } from "http-proxy-middleware";
import { SERVICE_ROUTES, HTTP_STATUS } from "../utils/constants.js";
import healthCheckService from "./health-check.service.js";
import { sendResponse } from "@shared/utils";

/**
 * Create proxy middleware for a service
 */
const createServiceProxy = (targetUrl, servicePath) => {
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    pathRewrite: (path) => {
      // Express strips the mount path (e.g., /api/catalog) before calling this
      // So /api/catalog/products becomes /products
      // We need to add /api back since all backend services expect /api/* paths
      return "/api" + path;
    },
    onProxyReq: (proxyReq, req) => {
      // Forward correlation ID
      if (req.correlationId) {
        proxyReq.setHeader("x-correlation-id", req.correlationId);
      }

      // Forward user context
      if (req.userId) {
        proxyReq.setHeader("x-user-id", req.userId);
      }

      // Forward guest context
      if (req.guestId) {
        proxyReq.setHeader("x-guest-id", req.guestId);
      }

      // Forward user type
      if (req.userType) {
        proxyReq.setHeader("x-user-type", req.userType);
      }

      // Forward session ID if available
      if (req.sessionId) {
        proxyReq.setHeader("x-session-id", req.sessionId);
      }

      // Log proxied request
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
          event: "PROXY_REQUEST",
          method: req.method,
          path: req.path,
          target: targetUrl,
          sessionId: req.sessionId || null,
        })
      );
    },
    onProxyRes: (proxyRes, req) => {
      // Log proxied response
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
          event: "PROXY_RESPONSE",
          method: req.method,
          path: req.path,
          statusCode: proxyRes.statusCode,
          target: targetUrl,
        })
      );
    },
    onError: (err, req, res) => {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
          event: "PROXY_ERROR",
          method: req.method,
          path: req.path,
          target: targetUrl,
          error: err.message,
        })
      );

      return sendResponse(
        res,
        HTTP_STATUS.BAD_GATEWAY,
        "Service unavailable",
        null,
        "Unable to reach backend service"
      );
    },
  });
};

/**
 * Service health check middleware
 * Returns 503 if service is unhealthy
 */
const checkServiceHealth = (servicePath) => {
  return (req, res, next) => {
    if (!healthCheckService.isServiceHealthy(servicePath)) {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
          event: "SERVICE_UNAVAILABLE",
          service: servicePath,
        })
      );

      return sendResponse(
        res,
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        "Service unavailable",
        null,
        "The requested service is currently unavailable"
      );
    }

    next();
  };
};

/**
 * Setup routing for all services
 */
export const setupRoutes = (app) => {
  // Create proxies for each service
  Object.entries(SERVICE_ROUTES).forEach(([path, targetUrl]) => {
    app.use(
      path,
      checkServiceHealth(path),
      createServiceProxy(targetUrl, path)
    );
  });

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "ROUTES_CONFIGURED",
      routes: Object.keys(SERVICE_ROUTES),
    })
  );
};
