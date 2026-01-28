import httpProxy from "http-proxy";
import { SERVICE_ROUTES, HTTP_STATUS } from "../utils/constants.js";
import healthCheckService from "./health-check.service.js";
import { sendResponse } from "@shared/utils";

// Proxy instance cache (one per unique target URL)
const proxyInstances = new Map();

/**
 * Get or create proxy instance for target URL
 */
const getOrCreateProxy = (targetUrl) => {
  if (!proxyInstances.has(targetUrl)) {
    const proxy = httpProxy.createProxyServer({
      target: targetUrl,
      changeOrigin: true,
      timeout: 30000, // 30 second timeout
    });

    setupProxyEvents(proxy, targetUrl);
    proxyInstances.set(targetUrl, proxy);

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "PROXY_CREATED",
      target: targetUrl,
    }));
  }

  return proxyInstances.get(targetUrl);
};

/**
 * Setup event handlers for proxy instance
 */
const setupProxyEvents = (proxy, targetUrl) => {
  // Handle outgoing request to backend
  proxy.on("proxyReq", (proxyReq, req, res) => {
    // Enhanced debug logging
    console.log("DEBUG onProxyReq:", {
      method: req.method,
      path: req.path,
      userId: req.userId,
      guestId: req.guestId,
      userType: req.userType,
      hasAuthHeader: !!req.headers.authorization,
      hasAccessToken: !!req.accessToken,
    });

    // Forward correlation ID
    if (req.correlationId) {
      proxyReq.setHeader("x-correlation-id", req.correlationId);
    }

    // Forward user context
    if (req.userId) {
      proxyReq.setHeader("x-user-id", req.userId);
    }

    if (req.guestId) {
      proxyReq.setHeader("x-guest-id", req.guestId);
    }

    if (req.userType) {
      proxyReq.setHeader("x-user-type", req.userType);
    }

    if (req.sessionId) {
      proxyReq.setHeader("x-session-id", req.sessionId);
    }

    // Forward Authorization header
    if (req.accessToken) {
      proxyReq.setHeader("Authorization", `Bearer ${req.accessToken}`);
    } else if (req.headers.authorization) {
      proxyReq.setHeader("Authorization", req.headers.authorization);
    }

    // Log proxied request
    console.log(JSON.stringify({
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
    }));
  });

  // Handle response from backend
  proxy.on("proxyRes", (proxyRes, req, res) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId,
      event: "PROXY_RESPONSE",
      method: req.method,
      path: req.path,
      statusCode: proxyRes.statusCode,
      target: targetUrl,
    }));
  });

  // Handle proxy errors
  proxy.on("error", (err, req, res) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId,
      event: "PROXY_ERROR",
      method: req.method,
      path: req.path,
      target: targetUrl,
      error: err.message,
    }));

    // Only send response if headers haven't been sent
    if (!res.headersSent) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_GATEWAY,
        "Service unavailable",
        null,
        "Unable to reach backend service"
      );
    }
  });
};

/**
 * Create proxy middleware for a service
 */
const createServiceProxy = (targetUrl, servicePath) => {
  const proxy = getOrCreateProxy(targetUrl);

  // Return Express middleware function
  return (req, res, next) => {
    // Path rewriting: Express strips mount path, we add /api back
    // Example: /api/catalog/products → /products → /api/products
    req.url = "/api" + req.url;

    console.log("DEBUG proxy.web:", {
      method: req.method,
      rewrittenUrl: req.url,
      servicePath,
      targetUrl,
    });

    // Proxy the request
    proxy.web(req, res, {}, (err) => {
      // Error is handled by 'error' event listener
      // Don't call next(err) to avoid double error handling
    });
  };
};

/**
 * Service health check middleware
 * Returns 503 if service is unhealthy
 */
const checkServiceHealth = (servicePath) => {
  return (req, res, next) => {
    if (!healthCheckService.isServiceHealthy(servicePath)) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
        event: "SERVICE_UNAVAILABLE",
        service: servicePath,
      }));

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

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: "ROUTES_CONFIGURED",
    routes: Object.keys(SERVICE_ROUTES),
    uniqueTargets: [...new Set(Object.values(SERVICE_ROUTES))].length,
    totalRoutes: Object.keys(SERVICE_ROUTES).length,
  }));
};

/**
 * Close all proxy instances (for graceful shutdown)
 */
export const closeAllProxies = () => {
  proxyInstances.forEach((proxy, targetUrl) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "PROXY_CLOSING",
      target: targetUrl,
    }));

    proxy.close();
  });

  proxyInstances.clear();

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: "ALL_PROXIES_CLOSED",
  }));
};
