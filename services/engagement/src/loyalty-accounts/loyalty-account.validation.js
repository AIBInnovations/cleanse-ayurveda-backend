import Joi from "joi";

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

/**
 * Validation schema for getting account
 * GET /api/loyalty/account
 */
export const getAccountSchema = {
  query: Joi.object({}),
};

/**
 * Validation schema for getting account history
 * GET /api/loyalty/account/history
 */
export const getAccountHistorySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    type: Joi.string().valid("earn", "redeem", "expire", "adjust"),
  }),
};

/**
 * Validation schema for listing accounts (admin)
 * GET /api/admin/loyalty/accounts
 */
export const listAccountsAdminSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    tierId: objectId.allow("").messages({
      "string.pattern.base": "Invalid tier ID format",
    }),
    minBalance: Joi.number().integer().min(0),
    maxBalance: Joi.number().integer().min(0),
    sortBy: Joi.string().valid("pointsBalance", "createdAt", "lastActivityAt").default("createdAt"),
    order: Joi.string().valid("asc", "desc").default("desc"),
  }),
};

/**
 * Validation schema for getting account by user ID (admin)
 * GET /api/admin/loyalty/accounts/:userId
 */
export const getAccountByUserIdSchema = {
  params: Joi.object({
    userId: objectId.required().messages({
      "string.pattern.base": "Invalid user ID format",
      "any.required": "User ID is required",
    }),
  }),
};

/**
 * Validation schema for adjusting points (admin)
 * PATCH /api/admin/loyalty/accounts/:userId/adjust
 */
export const adjustPointsSchema = {
  params: Joi.object({
    userId: objectId.required().messages({
      "string.pattern.base": "Invalid user ID format",
      "any.required": "User ID is required",
    }),
  }),
  body: Joi.object({
    points: Joi.number().integer().required().messages({
      "any.required": "Points value is required",
    }),
    description: Joi.string().trim().max(500).required().messages({
      "string.empty": "Description is required",
      "any.required": "Description is required",
    }),
  }),
};

export default {
  getAccountSchema,
  getAccountHistorySchema,
  listAccountsAdminSchema,
  getAccountByUserIdSchema,
  adjustPointsSchema,
};
