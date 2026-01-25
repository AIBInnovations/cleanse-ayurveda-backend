import Joi from "joi";

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

/**
 * Validation schema for getting balance
 * GET /api/store-credits/balance
 */
export const getBalanceSchema = {
  query: Joi.object({}),
};

/**
 * Validation schema for getting history
 * GET /api/store-credits/history
 */
export const getHistorySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    type: Joi.string().valid("credit", "debit"),
  }),
};

/**
 * Validation schema for listing all store credits (admin)
 * GET /api/admin/store-credits
 */
export const listStoreCreditsAdminSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    minBalance: Joi.number().min(0),
    maxBalance: Joi.number().min(0),
    sortBy: Joi.string().valid("balance", "createdAt", "updatedAt").default("createdAt"),
    order: Joi.string().valid("asc", "desc").default("desc"),
  }),
};

/**
 * Validation schema for getting store credit by user ID (admin)
 * GET /api/admin/store-credits/:userId
 */
export const getByUserIdSchema = {
  params: Joi.object({
    userId: objectId.required().messages({
      "string.pattern.base": "Invalid user ID format",
      "any.required": "User ID is required",
    }),
  }),
};

/**
 * Validation schema for issuing credit (admin)
 * POST /api/admin/store-credits/:userId/credit
 */
export const issueCreditSchema = {
  params: Joi.object({
    userId: objectId.required().messages({
      "string.pattern.base": "Invalid user ID format",
      "any.required": "User ID is required",
    }),
  }),
  body: Joi.object({
    amount: Joi.number().positive().required().messages({
      "number.positive": "Amount must be positive",
      "any.required": "Amount is required",
    }),
    description: Joi.string().trim().max(500).required().messages({
      "string.empty": "Description is required",
      "any.required": "Description is required",
    }),
    referenceType: Joi.string().valid("refund", "reward", "manual", "referral").default("manual"),
    referenceId: objectId.allow(null).messages({
      "string.pattern.base": "Invalid reference ID format",
    }),
  }),
};

/**
 * Validation schema for deducting credit (admin)
 * POST /api/admin/store-credits/:userId/debit
 */
export const deductCreditSchema = {
  params: Joi.object({
    userId: objectId.required().messages({
      "string.pattern.base": "Invalid user ID format",
      "any.required": "User ID is required",
    }),
  }),
  body: Joi.object({
    amount: Joi.number().positive().required().messages({
      "number.positive": "Amount must be positive",
      "any.required": "Amount is required",
    }),
    description: Joi.string().trim().max(500).required().messages({
      "string.empty": "Description is required",
      "any.required": "Description is required",
    }),
    referenceType: Joi.string().valid("order", "manual", "expired").default("manual"),
    referenceId: objectId.allow(null).messages({
      "string.pattern.base": "Invalid reference ID format",
    }),
  }),
};

export default {
  getBalanceSchema,
  getHistorySchema,
  listStoreCreditsAdminSchema,
  getByUserIdSchema,
  issueCreditSchema,
  deductCreditSchema,
};
