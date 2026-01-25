import Joi from "joi";

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const templateContentSchema = Joi.object({
  subject: Joi.string().trim().max(200).allow(null, ""),
  body: Joi.string().trim().max(5000).required(),
  templateName: Joi.string().trim().max(100).allow(null, ""),
});

/**
 * Validation schema for creating a notification template
 * POST /api/admin/notification-templates
 */
export const createTemplateSchema = {
  body: Joi.object({
    code: Joi.string().trim().uppercase().min(1).max(50).required().messages({
      "string.empty": "Template code is required",
      "any.required": "Template code is required",
    }),
    name: Joi.string().trim().min(1).max(100).required().messages({
      "string.empty": "Template name is required",
      "any.required": "Template name is required",
    }),
    category: Joi.string().valid("transactional", "marketing", "system").required().messages({
      "any.only": "Category must be 'transactional', 'marketing', or 'system'",
      "any.required": "Category is required",
    }),
    channels: Joi.array().items(Joi.string().valid("email", "sms", "whatsapp", "push")).min(1).required().messages({
      "array.min": "At least one channel is required",
      "any.required": "Channels are required",
    }),
    templates: Joi.object({
      email: templateContentSchema.allow(null),
      sms: templateContentSchema.allow(null),
      whatsapp: templateContentSchema.allow(null),
      push: templateContentSchema.allow(null),
    }).required().messages({
      "any.required": "Templates content is required",
    }),
    variables: Joi.array().items(Joi.string().trim().max(50)).default([]),
    isActive: Joi.boolean().default(true),
    description: Joi.string().trim().max(500).allow(null, ""),
  }),
};

/**
 * Validation schema for updating a notification template
 * PUT /api/admin/notification-templates/:id
 */
export const updateTemplateSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid template ID format",
      "any.required": "Template ID is required",
    }),
  }),
  body: Joi.object({
    code: Joi.string().trim().uppercase().min(1).max(50),
    name: Joi.string().trim().min(1).max(100),
    category: Joi.string().valid("transactional", "marketing", "system"),
    channels: Joi.array().items(Joi.string().valid("email", "sms", "whatsapp", "push")).min(1),
    templates: Joi.object({
      email: templateContentSchema.allow(null),
      sms: templateContentSchema.allow(null),
      whatsapp: templateContentSchema.allow(null),
      push: templateContentSchema.allow(null),
    }),
    variables: Joi.array().items(Joi.string().trim().max(50)),
    description: Joi.string().trim().max(500).allow(null, ""),
  }).min(1).messages({
    "object.min": "At least one field is required to update",
  }),
};

/**
 * Validation schema for template ID param
 */
export const templateIdParamSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid template ID format",
      "any.required": "Template ID is required",
    }),
  }),
};

/**
 * Validation schema for listing templates
 * GET /api/admin/notification-templates
 */
export const listTemplatesSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    category: Joi.string().valid("transactional", "marketing", "system"),
    channel: Joi.string().valid("email", "sms", "whatsapp", "push"),
    isActive: Joi.string().valid("true", "false"),
    search: Joi.string().trim().allow(""),
    sortBy: Joi.string().valid("createdAt", "name", "code").default("createdAt"),
    order: Joi.string().valid("asc", "desc").default("desc"),
  }),
};

/**
 * Validation schema for previewing template
 * POST /api/admin/notification-templates/:id/preview
 */
export const previewTemplateSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid template ID format",
      "any.required": "Template ID is required",
    }),
  }),
  body: Joi.object({
    channel: Joi.string().valid("email", "sms", "whatsapp", "push").required().messages({
      "any.only": "Channel must be 'email', 'sms', 'whatsapp', or 'push'",
      "any.required": "Channel is required",
    }),
    variables: Joi.object().default({}),
  }),
};

export default {
  createTemplateSchema,
  updateTemplateSchema,
  templateIdParamSchema,
  listTemplatesSchema,
  previewTemplateSchema,
};
