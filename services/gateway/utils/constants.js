/**
 * Service route mappings
 * Maps API path prefixes to backend service URLs
 */
export const SERVICE_ROUTES = {
  "/api/auth": process.env.AUTH_SERVICE_URL || "http://localhost:3001",
  "/api/catalog": process.env.CATALOG_SERVICE_URL || "http://localhost:3002",
  "/api/order": process.env.ORDER_SERVICE_URL || "http://localhost:3003",
  "/api/pricing": process.env.PRICING_SERVICE_URL || "http://localhost:3004",
  "/api/calculate": process.env.PRICING_SERVICE_URL || "http://localhost:3004",
  "/api/coupons": process.env.PRICING_SERVICE_URL || "http://localhost:3004",
  "/api/inventory": process.env.INVENTORY_SERVICE_URL || "http://localhost:3005",
  "/api/cms": process.env.CMS_SERVICE_URL || "http://localhost:3006",
  "/api/engagement": process.env.ENGAGEMENT_SERVICE_URL || "http://localhost:3007",
};

/**
 * Public routes that don't require authentication
 */
export const PUBLIC_ROUTES = [
  "/api/health",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/verify-otp",
  "/api/auth/send-otp",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/refresh",
  "/api/auth/login/otp",
  "/api/auth/login/password",
  "/api/auth/password/request-reset",
  "/api/auth/password/reset",
  "/api/auth/admin/login",
  "/api/auth/admin/password/request-reset",
  "/api/auth/admin/password/reset",
  "/api/auth/test/firebase-token",
  "/api/auth/guest",
  "/api/catalog/products",
  "/api/catalog/categories",
  "/api/catalog/brands",
  "/api/catalog/collections",
  "/api/catalog/bundles",
  "/api/catalog/search",
  "/api/pricing/calculate",
  "/api/pricing/prices",
  "/api/calculate/cart",
  "/api/calculate/tax",
  "/api/coupons/validate",
  "/api/cms/health",
  "/api/cms/pages",
  "/api/cms/blogs",
  "/api/cms/banners",
  "/api/cms/popups",
  "/api/cms/navigation",
  "/api/cms/faqs",
  "/api/cms/testimonials",
  "/api/cms/reels",
  "/api/engagement/health",
  "/api/engagement/products",
  "/api/engagement/loyalty/tiers",
  "/api/engagement/referrals/apply",
  "/api/inventory/stock",
  "/api/auth/addresses/validate-pincode",
];

/**
 * Routes that require authentication OR guest session
 * These routes will use optionalAuth - authenticate if token present
 */
export const OPTIONAL_AUTH_ROUTES = [
  "/api/order/cart",
  "/api/order/checkout",
];

/**
 * Admin routes that require admin authentication
 */
export const ADMIN_ROUTES = [
  "/api/catalog/admin",
  "/api/order/admin",
  "/api/inventory/admin",
  "/api/pricing/admin",
  "/api/coupons/admin",
  "/api/calculate/admin",
  "/api/auth/admin",
  "/api/cms/admin",
  "/api/engagement/admin",
];

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

/**
 * Rate limit configuration
 */
export const RATE_LIMIT_CONFIG = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 10000, // 10000 requests per window (increased for testing)
  SKIP_SUCCESSFUL_REQUESTS: false,
  SKIP_FAILED_REQUESTS: false,
};

/**
 * Health check configuration
 */
export const HEALTH_CHECK_CONFIG = {
  INTERVAL_MS: 30000, // Check every 30 seconds
  TIMEOUT_MS: 5000, // 5 second timeout
  UNHEALTHY_THRESHOLD: 3, // Mark unhealthy after 3 failures
};


