import Joi from "joi";

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

/**
 * Validation schema for creating a loyalty rule
 * POST /api/admin/loyalty/rules
 */
export const createRuleSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).required().messages({
      "string.empty": "Rule name is required",
      "any.required": "Rule name is required",
    }),
    ruleType: Joi.string().valid("earn", "redeem").required().messages({
      "any.only": "Rule type must be 'earn' or 'redeem'",
      "any.required": "Rule type is required",
    }),
    actionType: Joi.string().valid("purchase", "signup", "review", "referral", "birthday").required().messages({
      "any.only": "Action type must be one of: purchase, signup, review, referral, birthday",
      "any.required": "Action type is required",
    }),
    pointsValue: Joi.number().integer().min(0).required().messages({
      "number.min": "Points value must be 0 or greater",
      "any.required": "Points value is required",
    }),
    pointsPerAmount: Joi.number().min(0).allow(null),
    minOrderValue: Joi.number().min(0).default(0),
    maxPointsPerOrder: Joi.number().integer().min(0).allow(null),
    isActive: Joi.boolean().default(true),
    validFrom: Joi.date().iso().allow(null),
    validUntil: Joi.date().iso().allow(null),
    description: Joi.string().trim().max(500).allow(null, ""),
  }),
};

/**
 * Validation schema for updating a loyalty rule
 * PUT /api/admin/loyalty/rules/:id
 */
export const updateRuleSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid rule ID format",
      "any.required": "Rule ID is required",
    }),
  }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100),
    ruleType: Joi.string().valid("earn", "redeem"),
    actionType: Joi.string().valid("purchase", "signup", "review", "referral", "birthday"),
    pointsValue: Joi.number().integer().min(0),
    pointsPerAmount: Joi.number().min(0).allow(null),
    minOrderValue: Joi.number().min(0),
    maxPointsPerOrder: Joi.number().integer().min(0).allow(null),
    validFrom: Joi.date().iso().allow(null),
    validUntil: Joi.date().iso().allow(null),
    description: Joi.string().trim().max(500).allow(null, ""),
  }).min(1).messages({
    "object.min": "At least one field is required to update",
  }),
};

/**
 * Validation schema for rule ID param
 */
export const ruleIdParamSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid rule ID format",
      "any.required": "Rule ID is required",
    }),
  }),
};

/**
 * Validation schema for listing rules
 * GET /api/admin/loyalty/rules
 */
export const listRulesSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    ruleType: Joi.string().valid("earn", "redeem"),
    actionType: Joi.string().valid("purchase", "signup", "review", "referral", "birthday"),
    isActive: Joi.string().valid("true", "false"),
    sortBy: Joi.string().valid("createdAt", "name", "pointsValue").default("createdAt"),
    order: Joi.string().valid("asc", "desc").default("desc"),
  }),
};

export default {
  createRuleSchema,
  updateRuleSchema,
  ruleIdParamSchema,
  listRulesSchema,
};
