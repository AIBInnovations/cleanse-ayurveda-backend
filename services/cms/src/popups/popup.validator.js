import Joi from "joi";

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);
const popupTypes = ["newsletter", "promo", "exit_intent"];
const triggerTypes = ["time_delay", "exit_intent"];
const frequencies = ["once", "session", "daily"];

const urlSchema = Joi.string().trim().uri({ scheme: ["http", "https"] }).allow("", null);

export const createPopupSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).required().messages({
      "string.empty": "Name is required",
      "any.required": "Name is required",
      "string.max": "Name must not exceed 100 characters",
    }),
    type: Joi.string().valid(...popupTypes).required().messages({
      "any.only": `Type must be one of: ${popupTypes.join(", ")}`,
      "any.required": "Type is required",
    }),
    title: Joi.string().trim().max(100).allow("", null).messages({
      "string.max": "Title must not exceed 100 characters",
    }),
    content: Joi.string().allow("", null),
    image_url: urlSchema.messages({
      "string.uri": "Image URL must be a valid http or https URL",
    }),
    cta_text: Joi.string().trim().max(50).allow("", null).messages({
      "string.max": "CTA text must not exceed 50 characters",
    }),
    cta_url: Joi.string().trim().allow("", null),
    trigger_type: Joi.string().valid(...triggerTypes).default("time_delay").messages({
      "any.only": `Trigger type must be one of: ${triggerTypes.join(", ")}`,
    }),
    trigger_value: Joi.string().allow("", null).custom((value, helpers) => {
      const triggerType = helpers.state.ancestors[0].trigger_type;
      if (triggerType === "time_delay" && value) {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue) || numValue < 0) {
          return helpers.error("any.custom", { message: "Trigger value must be a positive number for time_delay" });
        }
      }
      return value;
    }).messages({
      "any.custom": "{{#message}}",
    }),
    frequency: Joi.string().valid(...frequencies).default("session").messages({
      "any.only": `Frequency must be one of: ${frequencies.join(", ")}`,
    }),
    target_pages: Joi.array().items(Joi.string().trim()).default([]),
    is_active: Joi.boolean().default(true),
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
    discount_code: Joi.string().trim().max(50).allow("", null).messages({
      "string.max": "Discount code must not exceed 50 characters",
    }),
  }),
};

export const updatePopupSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid popup ID format",
      "any.required": "Popup ID is required",
    }),
  }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).messages({
      "string.empty": "Name cannot be empty",
      "string.max": "Name must not exceed 100 characters",
    }),
    type: Joi.string().valid(...popupTypes).messages({
      "any.only": `Type must be one of: ${popupTypes.join(", ")}`,
    }),
    title: Joi.string().trim().max(100).allow("", null).messages({
      "string.max": "Title must not exceed 100 characters",
    }),
    content: Joi.string().allow("", null),
    image_url: urlSchema.messages({
      "string.uri": "Image URL must be a valid http or https URL",
    }),
    cta_text: Joi.string().trim().max(50).allow("", null).messages({
      "string.max": "CTA text must not exceed 50 characters",
    }),
    cta_url: Joi.string().trim().allow("", null),
    trigger_type: Joi.string().valid(...triggerTypes).messages({
      "any.only": `Trigger type must be one of: ${triggerTypes.join(", ")}`,
    }),
    trigger_value: Joi.string().allow("", null),
    frequency: Joi.string().valid(...frequencies).messages({
      "any.only": `Frequency must be one of: ${frequencies.join(", ")}`,
    }),
    target_pages: Joi.array().items(Joi.string().trim()),
    is_active: Joi.boolean(),
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
    discount_code: Joi.string().trim().max(50).allow("", null).messages({
      "string.max": "Discount code must not exceed 50 characters",
    }),
  }).min(1).messages({
    "object.min": "At least one field is required for update",
  }),
};

export const getPopupByIdSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid popup ID format",
      "any.required": "Popup ID is required",
    }),
  }),
};

export const consumerQuerySchema = {
  query: Joi.object({
    target_page: Joi.string().trim(),
    type: Joi.string().valid(...popupTypes).messages({
      "any.only": `Type must be one of: ${popupTypes.join(", ")}`,
    }),
  }),
};

export const adminListQuerySchema = {
  query: Joi.object({
    type: Joi.string().valid(...popupTypes).messages({
      "any.only": `Type must be one of: ${popupTypes.join(", ")}`,
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

export const subscribeNewsletterSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid popup ID format",
      "any.required": "Popup ID is required",
    }),
  }),
  body: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
    page_url: Joi.string().uri({ scheme: ["http", "https"] }).allow("", null).messages({
      "string.uri": "Page URL must be a valid http or https URL",
    }),
  }),
};

export const trackPopupEventSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid popup ID format",
      "any.required": "Popup ID is required",
    }),
  }),
};

export const getPopupStatsSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid popup ID format",
      "any.required": "Popup ID is required",
    }),
  }),
  query: Joi.object({
    from_date: Joi.date().iso(),
    to_date: Joi.date().iso(),
  }),
};

export default {
  createPopupSchema,
  updatePopupSchema,
  getPopupByIdSchema,
  consumerQuerySchema,
  adminListQuerySchema,
  subscribeNewsletterSchema,
  trackPopupEventSchema,
  getPopupStatsSchema,
};
