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
      // Enhanced debug logging
      console.log("DEBUG onProxyReq:", {
        method: req.method,
        path: req.path,
        userId: req.userId,
        guestId: req.guestId,
        userType: req.userType,
        hasBody: !!req.body,
        hasAuthHeader: !!req.headers.authorization,
        hasAccessToken: !!req.accessToken,
        headers: {
          'x-user-id': req.userId,
          'x-guest-id': req.guestId,
          'x-user-type': req.userType,
          'authorization': req.accessToken ? `Bearer ${req.accessToken.substring(0, 20)}...` : null
        }
      });

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

      // Forward Authorization header for services that validate JWT directly
      // Some services use @shared/auth-middleware which expects the Authorization header
      if (req.accessToken) {
        proxyReq.setHeader("Authorization", `Bearer ${req.accessToken}`);
      } else if (req.headers.authorization) {
        // Fallback to original header if accessToken not set (e.g., for public routes)
        proxyReq.setHeader("Authorization", req.headers.authorization);
      }

      // Note: No body reconstruction needed since gateway doesn't parse request bodies
      // The proxy middleware transparently forwards the raw request body to backend services

      // Log proxied request
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
          event: "PROXY_REQUEST",
          method: req.method,
          path: req.path,
          target: targetUrl,
          headers: {
            userId: req.userId || null,
            guestId: req.guestId || null,
            userType: req.userType || null,
          },
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
