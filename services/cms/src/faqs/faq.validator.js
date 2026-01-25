import Joi from "joi";

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);
const categories = ["general", "shipping", "payment", "returns", "account", "products"];

export const createFaqSchema = {
  body: Joi.object({
    question: Joi.string().trim().min(5).max(500).required().messages({
      "string.empty": "Question is required",
      "any.required": "Question is required",
      "string.min": "Question must be at least 5 characters",
      "string.max": "Question must not exceed 500 characters",
    }),
    answer: Joi.string().min(1).max(10000).required().messages({
      "string.empty": "Answer is required",
      "any.required": "Answer is required",
      "string.max": "Answer must not exceed 10000 characters",
    }),
    category: Joi.string().valid(...categories).default("general").messages({
      "any.only": `Category must be one of: ${categories.join(", ")}`,
    }),
    sort_order: Joi.number().integer().min(0).max(9999).messages({
      "number.min": "Sort order must be a non-negative number",
      "number.max": "Sort order must not exceed 9999",
    }),
    is_active: Joi.boolean().default(true),
  }),
};

export const updateFaqSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid FAQ ID format",
      "any.required": "FAQ ID is required",
    }),
  }),
  body: Joi.object({
    question: Joi.string().trim().min(5).max(500).messages({
      "string.empty": "Question cannot be empty",
      "string.min": "Question must be at least 5 characters",
      "string.max": "Question must not exceed 500 characters",
    }),
    answer: Joi.string().min(1).max(10000).messages({
      "string.empty": "Answer cannot be empty",
      "string.max": "Answer must not exceed 10000 characters",
    }),
    category: Joi.string().valid(...categories).messages({
      "any.only": `Category must be one of: ${categories.join(", ")}`,
    }),
    sort_order: Joi.number().integer().min(0).max(9999).messages({
      "number.min": "Sort order must be a non-negative number",
      "number.max": "Sort order must not exceed 9999",
    }),
    is_active: Joi.boolean(),
  }).min(1).messages({
    "object.min": "At least one field is required for update",
  }),
};

export const getFaqByIdSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid FAQ ID format",
      "any.required": "FAQ ID is required",
    }),
  }),
};

export const reorderFaqsSchema = {
  body: Joi.array().items(
    Joi.object({
      id: objectId.required().messages({
        "string.pattern.base": "Invalid FAQ ID format",
        "any.required": "FAQ ID is required",
      }),
      sort_order: Joi.number().integer().min(0).max(9999).required().messages({
        "number.min": "Sort order must be a non-negative number",
        "number.max": "Sort order must not exceed 9999",
        "any.required": "Sort order is required",
      }),
    })
  ).min(1).messages({
    "array.min": "At least one FAQ is required for reordering",
  }),
};

export const consumerQuerySchema = {
  query: Joi.object({
    category: Joi.string().valid(...categories).messages({
      "any.only": `Category must be one of: ${categories.join(", ")}`,
    }),
    search: Joi.string().trim().max(100).pattern(/^[a-zA-Z0-9\s\-_]+$/).messages({
      "string.pattern.base": "Search contains invalid characters",
    }),
  }),
};

export const adminListQuerySchema = {
  query: Joi.object({
    category: Joi.string().valid(...categories).messages({
      "any.only": `Category must be one of: ${categories.join(", ")}`,
    }),
    is_active: Joi.boolean(),
    search: Joi.string().trim().max(100).pattern(/^[a-zA-Z0-9\s\-_]+$/).messages({
      "string.pattern.base": "Search contains invalid characters",
    }),
    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

export default {
  createFaqSchema,
  updateFaqSchema,
  getFaqByIdSchema,
  reorderFaqsSchema,
  consumerQuerySchema,
  adminListQuerySchema,
};
