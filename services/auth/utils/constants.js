/**
 * Application-wide constants
 */

// OTP purposes
export const OTP_PURPOSE = {
  LOGIN: "login",
  REGISTER: "register",
  VERIFY: "verify",
  RESET: "reset",
};

// OTP identifier types
export const OTP_IDENTIFIER_TYPE = {
  PHONE: "phone",
  EMAIL: "email",
};

// User statuses
export const USER_STATUS = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
  DELETED: "deleted",
};

// Admin statuses
export const ADMIN_STATUS = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
};

// Session user types
export const SESSION_USER_TYPE = {
  CONSUMER: "consumer",
  ADMIN: "admin",
};

// Actor types for audit
export const ACTOR_TYPE = {
  CONSUMER: "consumer",
  ADMIN: "admin",
  SYSTEM: "system",
};

// Address labels
export const ADDRESS_LABEL = {
  HOME: "Home",
  OFFICE: "Office",
  OTHER: "Other",
};

// Audit actions
export const AUDIT_ACTION = {
  // User auth
  USER_REGISTERED: "USER_REGISTERED",
  USER_LOGIN: "USER_LOGIN",
  USER_LOGOUT: "USER_LOGOUT",
  USER_PASSWORD_RESET: "USER_PASSWORD_RESET",

  // User profile
  USER_PROFILE_UPDATED: "USER_PROFILE_UPDATED",
  USER_EMAIL_CHANGED: "USER_EMAIL_CHANGED",
  USER_PHONE_CHANGED: "USER_PHONE_CHANGED",
  USER_AVATAR_UPDATED: "USER_AVATAR_UPDATED",
  USER_AVATAR_REMOVED: "USER_AVATAR_REMOVED",

  // User account
  ACCOUNT_DELETION_REQUESTED: "ACCOUNT_DELETION_REQUESTED",
  ACCOUNT_DELETION_CANCELLED: "ACCOUNT_DELETION_CANCELLED",
  CUSTOMER_SUSPENDED: "CUSTOMER_SUSPENDED",
  CUSTOMER_REACTIVATED: "CUSTOMER_REACTIVATED",
  CUSTOMER_NOTE_ADDED: "CUSTOMER_NOTE_ADDED",

  // Address
  ADDRESS_CREATED: "ADDRESS_CREATED",
  ADDRESS_UPDATED: "ADDRESS_UPDATED",
  ADDRESS_DELETED: "ADDRESS_DELETED",
  ADDRESS_FLAGGED: "ADDRESS_FLAGGED",
  ADDRESS_VERIFIED: "ADDRESS_VERIFIED",

  // Session
  SESSION_TERMINATED: "SESSION_TERMINATED",
  ALL_SESSIONS_TERMINATED: "ALL_SESSIONS_TERMINATED",

  // Admin auth
  ADMIN_LOGIN: "ADMIN_LOGIN",
  ADMIN_LOGOUT: "ADMIN_LOGOUT",
  ADMIN_PASSWORD_CHANGED: "ADMIN_PASSWORD_CHANGED",
  ADMIN_PASSWORD_RESET: "ADMIN_PASSWORD_RESET",

  // Admin management
  ADMIN_CREATED: "ADMIN_CREATED",
  ADMIN_UPDATED: "ADMIN_UPDATED",
  ADMIN_ROLE_CHANGED: "ADMIN_ROLE_CHANGED",
  ADMIN_SUSPENDED: "ADMIN_SUSPENDED",
  ADMIN_REACTIVATED: "ADMIN_REACTIVATED",
  ADMIN_FORCE_LOGOUT: "ADMIN_FORCE_LOGOUT",
  EMERGENCY_LOGOUT_ALL_ADMINS: "EMERGENCY_LOGOUT_ALL_ADMINS",
  ADMINS_BULK_CREATED: "ADMINS_BULK_CREATED",

  // Role management
  ROLE_CREATED: "ROLE_CREATED",
  ROLE_UPDATED: "ROLE_UPDATED",
  ROLE_DELETED: "ROLE_DELETED",
  ROLE_PERMISSIONS_UPDATED: "ROLE_PERMISSIONS_UPDATED",
};

// Entity types for audit
export const ENTITY_TYPE = {
  USER: "User",
  ADMIN: "Admin",
  SESSION: "Session",
  ADDRESS: "Address",
  ROLE: "Role",
  OTP: "OTP",
};

// Permissions - grouped by module
export const PERMISSIONS = {
  // Customer management
  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_MANAGE: "customers.manage",
  CUSTOMERS_EXPORT: "customers.export",
  CUSTOMERS_ADDRESSES: "customers.addresses",

  // Order management (for future cross-service)
  ORDERS_VIEW: "orders.view",
  ORDERS_MANAGE: "orders.manage",

  // Product management (for future cross-service)
  PRODUCTS_VIEW: "products.view",
  PRODUCTS_MANAGE: "products.manage",

  // Role management
  ROLES_VIEW: "roles.view",
  ROLES_MANAGE: "roles.manage",

  // Admin management
  ADMINS_VIEW: "admins.view",
  ADMINS_MANAGE: "admins.manage",

  // Settings management
  SETTINGS_VIEW: "settings.view",
  SETTINGS_MANAGE: "settings.manage",

  // Audit management
  AUDIT_VIEW: "audit.view",

  // Session management
  SESSIONS_VIEW: "sessions.view",
  SESSIONS_MANAGE: "sessions.manage",
  SESSIONS_EMERGENCY: "sessions.emergency",
};

// All permissions as array
export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

// Default role configurations
export const DEFAULT_ROLES = {
  SUPER_ADMIN: {
    name: "super_admin",
    description: "Full system access",
    displayName: "Super Administrator",
    permissions: ALL_PERMISSIONS,
    isSystemRole: true,
  },
  CATALOG_MANAGER: {
    name: "catalog_manager",
    description: "Manage product catalog",
    displayName: "Catalog Manager",
    permissions: [PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.PRODUCTS_MANAGE],
    isSystemRole: true,
  },
  ORDER_MANAGER: {
    name: "order_manager",
    description: "Manage orders and customers",
    displayName: "Order Manager",
    permissions: [
      PERMISSIONS.ORDERS_VIEW,
      PERMISSIONS.ORDERS_MANAGE,
      PERMISSIONS.CUSTOMERS_VIEW,
    ],
    isSystemRole: true,
  },
  MARKETING_MANAGER: {
    name: "marketing_manager",
    description: "Marketing and promotions",
    displayName: "Marketing Manager",
    permissions: [PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.CUSTOMERS_VIEW],
    isSystemRole: true,
  },
  SUPPORT_AGENT: {
    name: "support_agent",
    description: "Customer support",
    displayName: "Support Agent",
    permissions: [PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.ORDERS_VIEW],
    isSystemRole: true,
  },
  FINANCE: {
    name: "finance",
    description: "Financial reports and reconciliation",
    displayName: "Finance",
    permissions: [PERMISSIONS.ORDERS_VIEW, PERMISSIONS.CUSTOMERS_VIEW],
    isSystemRole: true,
  },
};

// Token expiry times (in seconds for JWT, milliseconds noted where used)
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: "15m",
  REFRESH_TOKEN: "7d",
  REMEMBER_ME_REFRESH_TOKEN: "30d",
  PASSWORD_RESET_TOKEN: "1h",
};

// OTP configuration
export const OTP_CONFIG = {
  EXPIRY_MINUTES: 10,
  MAX_ATTEMPTS: 5,
  RESEND_COOLDOWN_SECONDS: 60,
  MAX_REQUESTS_PER_HOUR: 5,
};

// Rate limiting configuration
export const RATE_LIMIT = {
  OTP_WINDOW_MS: 10 * 60 * 1000, // 10 minutes
  OTP_MAX_REQUESTS: 5,
  LOGIN_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  LOGIN_MAX_ATTEMPTS: 10,
};

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
};
