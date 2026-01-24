/**
 * Product status enum values
 */
export const PRODUCT_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  ARCHIVED: "archived",
};

/**
 * Product type enum values
 */
export const PRODUCT_TYPE = {
  SIMPLE: "simple",
  VARIABLE: "variable",
};

/**
 * Collection type enum values
 */
export const COLLECTION_TYPE = {
  MANUAL: "manual",
  SMART: "smart",
};

/**
 * Related product relation types
 */
export const RELATION_TYPE = {
  CROSS_SELL: "crossSell",
  UP_SELL: "upSell",
  FREQUENTLY_BOUGHT_TOGETHER: "frequentlyBoughtTogether",
};

/**
 * Skin type enum values
 */
export const SKIN_TYPE = {
  OILY: "oily",
  DRY: "dry",
  COMBINATION: "combination",
  SENSITIVE: "sensitive",
  NORMAL: "normal",
};

/**
 * Media type enum values
 */
export const MEDIA_TYPE = {
  IMAGE: "image",
  VIDEO: "video",
};

/**
 * Bundle pricing type enum values
 */
export const BUNDLE_PRICING_TYPE = {
  FIXED: "fixed",
  PERCENTAGE_OFF: "percentageOff",
};

/**
 * Smart collection rule operators
 */
export const RULE_OPERATOR = {
  EQUALS: "equals",
  NOT_EQUALS: "notEquals",
  CONTAINS: "contains",
  GREATER_THAN: "greaterThan",
  LESS_THAN: "lessThan",
};

/**
 * Smart collection rule fields
 */
export const RULE_FIELD = {
  TAG: "tag",
  PRODUCT_TYPE: "productType",
  PRICE: "price",
  BRAND: "brand",
  STATUS: "status",
};

/**
 * Rules match type
 */
export const RULES_MATCH = {
  ALL: "all",
  ANY: "any",
};

/**
 * Sort order options
 */
export const SORT_ORDER = {
  ASC: "asc",
  DESC: "desc",
};

/**
 * Default pagination values
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

/**
 * Search sort options
 */
export const SEARCH_SORT = {
  RELEVANCE: "relevance",
  PRICE_ASC: "price_asc",
  PRICE_DESC: "price_desc",
  RATING: "rating",
  NEWEST: "newest",
};

/**
 * List of valid search sort values
 */
export const SEARCH_SORT_VALUES = Object.values(SEARCH_SORT);

/**
 * Generic list sort options
 */
export const LIST_SORT = {
  NAME_ASC: "name_asc",
  NAME_DESC: "name_desc",
  CREATED_ASC: "created_asc",
  CREATED_DESC: "created_desc",
  UPDATED_ASC: "updated_asc",
  UPDATED_DESC: "updated_desc",
  SORT_ORDER: "sort_order",
};

/**
 * HTTP Status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
};

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  NOT_FOUND: (entity) => `${entity} not found`,
  ALREADY_EXISTS: (entity) => `${entity} already exists`,
  VALIDATION_FAILED: "Validation failed",
  UNAUTHORIZED: "Unauthorized access",
  FORBIDDEN: "Access forbidden",
  INTERNAL_ERROR: "Internal server error",
  INVALID_ID: "Invalid ID format",
  CANNOT_DELETE: (entity) => `Cannot delete ${entity} - it has dependencies`,
};

export default {
  PRODUCT_STATUS,
  PRODUCT_TYPE,
  COLLECTION_TYPE,
  RELATION_TYPE,
  SKIN_TYPE,
  MEDIA_TYPE,
  BUNDLE_PRICING_TYPE,
  RULE_OPERATOR,
  RULE_FIELD,
  RULES_MATCH,
  SORT_ORDER,
  PAGINATION,
  SEARCH_SORT,
  SEARCH_SORT_VALUES,
  LIST_SORT,
  HTTP_STATUS,
  ERROR_MESSAGES,
};
