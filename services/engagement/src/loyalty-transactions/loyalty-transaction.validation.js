import Joi from "joi";

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

/**
 * Validation schema for getting user's transactions
 * GET /api/loyalty/transactions
 */
export const getTransactionsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    type: Joi.string().valid("earn", "redeem", "expire", "adjust"),
  }),
};

/**
 * Validation schema for listing all transactions (admin)
 * GET /api/admin/loyalty/transactions
 */
export const listTransactionsAdminSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    type: Joi.string().valid("earn", "redeem", "expire", "adjust"),
    referenceType: Joi.string().valid("order", "signup", "review", "referral", "manual", "expiry", "birthday"),
    userId: objectId.allow("").messages({
      "string.pattern.base": "Invalid user ID format",
    }),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    sortBy: Joi.string().valid("createdAt", "points").default("createdAt"),
    order: Joi.string().valid("asc", "desc").default("desc"),
  }),
};

/**
 * Validation schema for creating manual transaction (admin)
 * POST /api/admin/loyalty/transactions/manual
 */
export const createManualTransactionSchema = {
  body: Joi.object({
    userId: objectId.required().messages({
      "string.pattern.base": "Invalid user ID format",
      "any.required": "User ID is required",
    }),
    type: Joi.string().valid("earn", "redeem", "adjust").required().messages({
      "any.only": "Type must be 'earn', 'redeem', or 'adjust'",
      "any.required": "Transaction type is required",
    }),
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
  getTransactionsSchema,
  listTransactionsAdminSchema,
  createManualTransactionSchema,
};
