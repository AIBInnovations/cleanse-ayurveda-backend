import Joi from "joi";

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);
const locations = ["main_header", "footer", "mobile_nav", "footer_secondary"];
const blockedSchemes = /^(javascript|data|file|vbscript):/i;

// URL validator - allows internal paths and external URLs, blocks dangerous schemes
const urlValidator = (value, helpers) => {
  if (!value) return value;

  // Block dangerous schemes
  if (blockedSchemes.test(value)) {
    return helpers.error("any.custom", { message: "URL contains a blocked scheme" });
  }

  // Allow internal paths starting with /
  if (value.startsWith("/")) {
    return value;
  }

  // Allow http:// and https://
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return helpers.error("any.custom", { message: "URL must be an internal path (starting with /) or an http/https URL" });
};

// Menu item schema with depth validation
const createMenuItemSchema = (maxDepth, currentDepth = 0) => {
  const baseSchema = {
    title: Joi.string().trim().min(1).max(50).required().messages({
      "string.empty": "Menu item title is required",
      "any.required": "Menu item title is required",
      "string.max": "Menu item title must not exceed 50 characters",
    }),
    url: Joi.string().trim().custom(urlValidator).allow("", null).messages({
      "any.custom": "{{#message}}",
    }),
  };

  if (currentDepth < maxDepth - 1) {
    baseSchema.children = Joi.array()
      .items(Joi.object(createMenuItemSchema(maxDepth, currentDepth + 1)))
      .default([]);
  } else {
    baseSchema.children = Joi.array().max(0).default([]).messages({
      "array.max": `Maximum menu depth of ${maxDepth} levels exceeded`,
    });
  }

  return baseSchema;
};

const menuItemSchema = Joi.object(createMenuItemSchema(3));

export const createMenuSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).required().messages({
      "string.empty": "Name is required",
      "any.required": "Name is required",
      "string.max": "Name must not exceed 100 characters",
    }),
    location: Joi.string().valid(...locations).required().messages({
      "any.only": `Location must be one of: ${locations.join(", ")}`,
      "any.required": "Location is required",
    }),
    items: Joi.array().items(menuItemSchema).default([]),
    is_active: Joi.boolean().default(true),
  }),
};

export const updateMenuSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid menu ID format",
      "any.required": "Menu ID is required",
    }),
  }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).messages({
      "string.empty": "Name cannot be empty",
      "string.max": "Name must not exceed 100 characters",
    }),
    location: Joi.string().valid(...locations).messages({
      "any.only": `Location must be one of: ${locations.join(", ")}`,
    }),
    items: Joi.array().items(menuItemSchema),
    is_active: Joi.boolean(),
  }).min(1).messages({
    "object.min": "At least one field is required for update",
  }),
};

export const getMenuByIdSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid menu ID format",
      "any.required": "Menu ID is required",
    }),
  }),
};

export const consumerQuerySchema = {
  query: Joi.object({
    location: Joi.string().valid(...locations).messages({
      "any.only": `Location must be one of: ${locations.join(", ")}`,
    }),
  }),
};

export const adminListQuerySchema = {
  query: Joi.object({
    location: Joi.string().valid(...locations).messages({
      "any.only": `Location must be one of: ${locations.join(", ")}`,
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
  createMenuSchema,
  updateMenuSchema,
  getMenuByIdSchema,
  consumerQuerySchema,
  adminListQuerySchema,
};
