import Joi from "joi";

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

/**
 * Validation schema for applying referral code
 * POST /api/referrals/apply
 */
export const applyCodeSchema = {
  body: Joi.object({
    code: Joi.string().trim().uppercase().min(4).max(20).required().messages({
      "string.empty": "Referral code is required",
      "any.required": "Referral code is required",
    }),
    email: Joi.string().email().lowercase().required().messages({
      "string.email": "Please provide a valid email",
      "any.required": "Email is required",
    }),
  }),
};

/**
 * Validation schema for getting user's referrals
 * GET /api/referrals/my-referrals
 */
export const getMyReferralsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    status: Joi.string().valid("pending", "signed_up", "converted", "rewarded"),
  }),
};

/**
 * Validation schema for admin listing referrals
 * GET /api/admin/referrals
 */
export const listReferralsAdminSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid("pending", "signed_up", "converted", "rewarded"),
    referrerId: objectId.allow("").messages({
      "string.pattern.base": "Invalid referrer ID format",
    }),
    isFlagged: Joi.string().valid("true", "false"),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    sortBy: Joi.string().valid("createdAt", "status").default("createdAt"),
    order: Joi.string().valid("asc", "desc").default("desc"),
  }),
};

/**
 * Validation schema for referral ID param
 */
export const referralIdParamSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid referral ID format",
      "any.required": "Referral ID is required",
    }),
  }),
};

/**
 * Validation schema for flagging referral
 * PATCH /api/admin/referrals/:id/flag-fraud
 */
export const flagFraudSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid referral ID format",
      "any.required": "Referral ID is required",
    }),
  }),
  body: Joi.object({
    reason: Joi.string().trim().max(500).required().messages({
      "string.empty": "Flag reason is required",
      "any.required": "Flag reason is required",
    }),
  }),
};

export default {
  applyCodeSchema,
  getMyReferralsSchema,
  listReferralsAdminSchema,
  referralIdParamSchema,
  flagFraudSchema,
};
