import Joi from "joi";

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

/**
 * Validation schema for getting user's transactions
 * GET /api/store-credits/transactions
 */
export const getTransactionsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    type: Joi.string().valid("credit", "debit"),
  }),
};

/**
 * Validation schema for listing all transactions (admin)
 * GET /api/admin/store-credit-transactions
 */
export const listTransactionsAdminSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    type: Joi.string().valid("credit", "debit"),
    referenceType: Joi.string().valid("refund", "reward", "order", "manual", "referral", "expired"),
    userId: objectId.allow("").messages({
      "string.pattern.base": "Invalid user ID format",
    }),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    sortBy: Joi.string().valid("createdAt", "amount").default("createdAt"),
    order: Joi.string().valid("asc", "desc").default("desc"),
  }),
};

export default {
  getTransactionsSchema,
  listTransactionsAdminSchema,
};
