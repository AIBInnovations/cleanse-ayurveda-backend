import Joi from "joi";

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);
const placements = ["hero", "top_strip", "mid_page"];

const urlSchema = Joi.string().trim().uri({ scheme: ["http", "https"] }).allow("", null);

export const createBannerSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).required().messages({
      "string.empty": "Name is required",
      "any.required": "Name is required",
      "string.max": "Name must not exceed 100 characters",
    }),
    placement: Joi.string().valid(...placements).required().messages({
      "any.only": `Placement must be one of: ${placements.join(", ")}`,
      "any.required": "Placement is required",
    }),
    title: Joi.string().trim().max(100).allow("", null).messages({
      "string.max": "Title must not exceed 100 characters",
    }),
    subtitle: Joi.string().trim().max(200).allow("", null).messages({
      "string.max": "Subtitle must not exceed 200 characters",
    }),
    cta_text: Joi.string().trim().max(50).allow("", null).messages({
      "string.max": "CTA text must not exceed 50 characters",
    }),
    cta_url: Joi.string().trim().allow("", null),
    image_desktop_url: urlSchema.messages({
      "string.uri": "Desktop image URL must be a valid http or https URL",
    }),
    image_mobile_url: urlSchema.messages({
      "string.uri": "Mobile image URL must be a valid http or https URL",
    }),
    target_pages: Joi.array().items(Joi.string().trim()).default([]),
    is_active: Joi.boolean().default(true),
    priority: Joi.number().integer().min(0).default(0).messages({
      "number.min": "Priority must be a non-negative number",
    }),
    starts_at: Joi.date().iso().allow(null),
    ends_at: Joi.date().iso().allow(null).custom((value, helpers) => {
      const startsAt = helpers.state.ancestors[0].starts_at;
      if (startsAt && value && new Date(value) <= new Date(startsAt)) {
        return helpers.error("any.custom", { message: "End date must be after start date" });
      }
      return value;
    }).messages({
      "any.custom": "{{#message}}",
    }),
  }),
};

export const updateBannerSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid banner ID format",
      "any.required": "Banner ID is required",
    }),
  }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).messages({
      "string.empty": "Name cannot be empty",
      "string.max": "Name must not exceed 100 characters",
    }),
    placement: Joi.string().valid(...placements).messages({
      "any.only": `Placement must be one of: ${placements.join(", ")}`,
    }),
    title: Joi.string().trim().max(100).allow("", null).messages({
      "string.max": "Title must not exceed 100 characters",
    }),
    subtitle: Joi.string().trim().max(200).allow("", null).messages({
      "string.max": "Subtitle must not exceed 200 characters",
    }),
    cta_text: Joi.string().trim().max(50).allow("", null).messages({
      "string.max": "CTA text must not exceed 50 characters",
    }),
    cta_url: Joi.string().trim().allow("", null),
    image_desktop_url: urlSchema.messages({
      "string.uri": "Desktop image URL must be a valid http or https URL",
    }),
    image_mobile_url: urlSchema.messages({
      "string.uri": "Mobile image URL must be a valid http or https URL",
    }),
    target_pages: Joi.array().items(Joi.string().trim()),
    is_active: Joi.boolean(),
    priority: Joi.number().integer().min(0).messages({
      "number.min": "Priority must be a non-negative number",
    }),
    starts_at: Joi.date().iso().allow(null),
    ends_at: Joi.date().iso().allow(null).custom((value, helpers) => {
      const startsAt = helpers.state.ancestors[0].starts_at;
      if (startsAt && value && new Date(value) <= new Date(startsAt)) {
        return helpers.error("any.custom", { message: "End date must be after start date" });
      }
      return value;
    }).messages({
      "any.custom": "{{#message}}",
    }),
  }).min(1).messages({
    "object.min": "At least one field is required for update",
  }),
};

export const getBannerByIdSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid banner ID format",
      "any.required": "Banner ID is required",
    }),
  }),
};

export const reorderBannersSchema = {
  body: Joi.array().items(
    Joi.object({
      id: objectId.required().messages({
        "string.pattern.base": "Invalid banner ID format",
        "any.required": "Banner ID is required",
      }),
      priority: Joi.number().integer().min(0).required().messages({
        "number.min": "Priority must be a non-negative number",
        "any.required": "Priority is required",
      }),
    })
  ).min(1).messages({
    "array.min": "At least one banner is required for reordering",
  }),
};

export const consumerQuerySchema = {
  query: Joi.object({
    placement: Joi.string().valid(...placements).messages({
      "any.only": `Placement must be one of: ${placements.join(", ")}`,
    }),
    target_page: Joi.string().trim(),
  }),
};

export const adminListQuerySchema = {
  query: Joi.object({
    placement: Joi.string().valid(...placements).messages({
      "any.only": `Placement must be one of: ${placements.join(", ")}`,
    }),
    is_active: Joi.boolean(),
    status: Joi.string().valid("active", "scheduled", "expired", "inactive").messages({
      "any.only": "Status must be one of: active, scheduled, expired, inactive",
    }),
    search: Joi.string().trim().max(100).pattern(/^[a-zA-Z0-9\s\-_]+$/).messages({
      "string.pattern.base": "Search contains invalid characters",
    }),
    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

export default {
  createBannerSchema,
  updateBannerSchema,
  getBannerByIdSchema,
  reorderBannersSchema,
  consumerQuerySchema,
  adminListQuerySchema,
};
