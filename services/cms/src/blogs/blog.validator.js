import Joi from "joi";

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const tagPattern = /^[a-z0-9-]+$/;

const seoSchema = Joi.object({
  title: Joi.string().trim().max(70).allow("", null),
  description: Joi.string().trim().max(160).allow("", null),
  keywords: Joi.array().items(Joi.string().trim().max(50)).max(10).default([]),
});

const urlSchema = Joi.string().trim().uri({ scheme: ["http", "https"] }).allow("", null);

export const createBlogSchema = {
  body: Joi.object({
    title: Joi.string().trim().min(1).max(200).required().messages({
      "string.empty": "Title is required",
      "any.required": "Title is required",
      "string.max": "Title must not exceed 200 characters",
    }),
    slug: Joi.string().trim().lowercase().pattern(slugPattern).max(200).messages({
      "string.pattern.base": "Slug must contain only lowercase letters, numbers, and hyphens",
    }),
    excerpt: Joi.string().trim().min(10).max(500).allow("", null).messages({
      "string.min": "Excerpt must be at least 10 characters",
      "string.max": "Excerpt must not exceed 500 characters",
    }),
    content: Joi.string().max(500000).allow("", null).messages({
      "string.max": "Content must not exceed 500000 characters",
    }),
    category_id: objectId.allow(null).messages({
      "string.pattern.base": "Invalid category ID format",
    }),
    tags: Joi.array()
      .items(Joi.string().trim().lowercase().pattern(tagPattern).max(50))
      .max(10)
      .default([])
      .messages({
        "string.pattern.base": "Tags must contain only lowercase letters, numbers, and hyphens",
      }),
    featured_image_url: urlSchema.messages({
      "string.uri": "Image URL must be a valid http or https URL",
    }),
    is_featured: Joi.boolean().default(false),
    status: Joi.string().valid("draft", "published").default("draft").messages({
      "any.only": "Status must be either 'draft' or 'published'",
    }),
    published_at: Joi.date().iso().allow(null),
    seo: seoSchema.default({}),
  }),
};

export const updateBlogSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid blog ID format",
      "any.required": "Blog ID is required",
    }),
  }),
  body: Joi.object({
    title: Joi.string().trim().min(1).max(200).messages({
      "string.empty": "Title cannot be empty",
      "string.max": "Title must not exceed 200 characters",
    }),
    slug: Joi.string().trim().lowercase().pattern(slugPattern).max(200).messages({
      "string.pattern.base": "Slug must contain only lowercase letters, numbers, and hyphens",
    }),
    excerpt: Joi.string().trim().min(10).max(500).allow("", null).messages({
      "string.min": "Excerpt must be at least 10 characters",
      "string.max": "Excerpt must not exceed 500 characters",
    }),
    content: Joi.string().max(500000).allow("", null).messages({
      "string.max": "Content must not exceed 500000 characters",
    }),
    category_id: objectId.allow(null).messages({
      "string.pattern.base": "Invalid category ID format",
    }),
    tags: Joi.array()
      .items(Joi.string().trim().lowercase().pattern(tagPattern).max(50))
      .max(10)
      .messages({
        "string.pattern.base": "Tags must contain only lowercase letters, numbers, and hyphens",
      }),
    featured_image_url: urlSchema.messages({
      "string.uri": "Image URL must be a valid http or https URL",
    }),
    is_featured: Joi.boolean(),
    status: Joi.string().valid("draft", "published").messages({
      "any.only": "Status must be either 'draft' or 'published'",
    }),
    published_at: Joi.date().iso().allow(null),
    seo: seoSchema,
  }).min(1).messages({
    "object.min": "At least one field is required for update",
  }),
};

export const getBlogByIdSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid blog ID format",
      "any.required": "Blog ID is required",
    }),
  }),
};

export const getBlogBySlugSchema = {
  params: Joi.object({
    slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).required().messages({
      "string.pattern.base": "Invalid slug format",
      "any.required": "Slug is required",
    }),
  }),
};

export const consumerListQuerySchema = {
  query: Joi.object({
    category: Joi.string().trim().lowercase(),
    tag: Joi.string().trim().lowercase().pattern(tagPattern),
    featured: Joi.boolean(),
    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
    sort: Joi.string().valid("latest", "popular").default("latest"),
  }),
};

export const adminListQuerySchema = {
  query: Joi.object({
    status: Joi.string().valid("draft", "published"),
    category_id: objectId,
    is_featured: Joi.boolean(),
    author_id: objectId,
    search: Joi.string().trim().max(100).pattern(/^[a-zA-Z0-9\s\-_]+$/).messages({
      "string.pattern.base": "Search contains invalid characters",
    }),
    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string()
      .valid("created_at", "-created_at", "published_at", "-published_at", "title", "-title", "view_count", "-view_count")
      .default("-created_at"),
  }),
};

export default {
  createBlogSchema,
  updateBlogSchema,
  getBlogByIdSchema,
  getBlogBySlugSchema,
  consumerListQuerySchema,
  adminListQuerySchema,
};
