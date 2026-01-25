import Joi from "joi";

const RESERVED_SLUGS = ["admin", "api", "auth", "login", "signup", "logout", "register", "dashboard"];

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const seoSchema = Joi.object({
  title: Joi.string().trim().max(70).allow("", null),
  description: Joi.string().trim().max(160).allow("", null),
  keywords: Joi.array().items(Joi.string().trim().max(50)).max(10).default([]),
});

export const createPageSchema = {
  body: Joi.object({
    title: Joi.string().trim().min(1).max(200).required().messages({
      "string.empty": "Title is required",
      "any.required": "Title is required",
      "string.min": "Title must be at least 1 character",
      "string.max": "Title must not exceed 200 characters",
    }),
    slug: Joi.string()
      .trim()
      .lowercase()
      .pattern(slugPattern)
      .max(200)
      .custom((value, helpers) => {
        if (RESERVED_SLUGS.includes(value)) {
          return helpers.error("any.custom", { message: "This slug is reserved and cannot be used" });
        }
        return value;
      })
      .messages({
        "string.pattern.base": "Slug must contain only lowercase letters, numbers, and hyphens",
        "any.custom": "{{#message}}",
      }),
    content: Joi.string().max(100000).allow("", null).messages({
      "string.max": "Content must not exceed 100000 characters",
    }),
    page_type: Joi.string().valid("static", "policy").default("static").messages({
      "any.only": "Page type must be either 'static' or 'policy'",
    }),
    status: Joi.string().valid("draft", "published").default("draft").messages({
      "any.only": "Status must be either 'draft' or 'published'",
    }),
    published_at: Joi.date().iso().allow(null),
    is_system: Joi.boolean().default(false),
    seo: seoSchema.default({}),
  }),
};

export const updatePageSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid page ID format",
      "any.required": "Page ID is required",
    }),
  }),
  body: Joi.object({
    title: Joi.string().trim().min(1).max(200).messages({
      "string.empty": "Title cannot be empty",
      "string.min": "Title must be at least 1 character",
      "string.max": "Title must not exceed 200 characters",
    }),
    slug: Joi.string()
      .trim()
      .lowercase()
      .pattern(slugPattern)
      .max(200)
      .custom((value, helpers) => {
        if (RESERVED_SLUGS.includes(value)) {
          return helpers.error("any.custom", { message: "This slug is reserved and cannot be used" });
        }
        return value;
      })
      .messages({
        "string.pattern.base": "Slug must contain only lowercase letters, numbers, and hyphens",
        "any.custom": "{{#message}}",
      }),
    content: Joi.string().max(100000).allow("", null).messages({
      "string.max": "Content must not exceed 100000 characters",
    }),
    page_type: Joi.string().valid("static", "policy").messages({
      "any.only": "Page type must be either 'static' or 'policy'",
    }),
    status: Joi.string().valid("draft", "published").messages({
      "any.only": "Status must be either 'draft' or 'published'",
    }),
    published_at: Joi.date().iso().allow(null),
    seo: seoSchema,
  }).min(1).messages({
    "object.min": "At least one field is required for update",
  }),
};

export const getPageByIdSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid page ID format",
      "any.required": "Page ID is required",
    }),
  }),
};

export const getPageBySlugSchema = {
  params: Joi.object({
    slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).required().messages({
      "string.pattern.base": "Invalid slug format",
      "any.required": "Slug is required",
    }),
  }),
};

export const adminListQuerySchema = {
  query: Joi.object({
    status: Joi.string().valid("draft", "published"),
    page_type: Joi.string().valid("static", "policy"),
    search: Joi.string().trim().max(100).pattern(/^[a-zA-Z0-9\s\-_]+$/).messages({
      "string.pattern.base": "Search contains invalid characters",
    }),
    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid("created_at", "-created_at", "title", "-title", "published_at", "-published_at").default("-created_at"),
  }),
};

export const consumerListQuerySchema = {
  query: Joi.object({
    page_type: Joi.string().valid("static", "policy"),
    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

export default {
  createPageSchema,
  updatePageSchema,
  getPageByIdSchema,
  getPageBySlugSchema,
  adminListQuerySchema,
  consumerListQuerySchema,
};
