import Joi from "joi";

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

// Allowed MIME types
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
];

// Max file size (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const uploadSingleSchema = {
  body: Joi.object({
    folder: Joi.string().trim().max(50).default("general").messages({
      "string.max": "Folder name must not exceed 50 characters",
    }),
    alt_text: Joi.string().trim().max(200).allow("", null).messages({
      "string.max": "Alt text must not exceed 200 characters",
    }),
  }),
};

export const uploadMultipleSchema = {
  body: Joi.object({
    folder: Joi.string().trim().max(50).default("general").messages({
      "string.max": "Folder name must not exceed 50 characters",
    }),
  }),
};

export const updateMediaSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid media ID format",
      "any.required": "Media ID is required",
    }),
  }),
  body: Joi.object({
    alt_text: Joi.string().trim().max(200).allow("", null).messages({
      "string.max": "Alt text must not exceed 200 characters",
    }),
    folder: Joi.string().trim().max(50).messages({
      "string.max": "Folder name must not exceed 50 characters",
    }),
  }).min(1).messages({
    "object.min": "At least one field is required for update",
  }),
};

export const getMediaByIdSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid media ID format",
      "any.required": "Media ID is required",
    }),
  }),
};

export const bulkDeleteSchema = {
  body: Joi.object({
    ids: Joi.array().items(
      objectId.messages({
        "string.pattern.base": "Invalid media ID format",
      })
    ).min(1).max(50).required().messages({
      "array.min": "At least one media ID is required",
      "array.max": "Cannot delete more than 50 files at once",
      "any.required": "Media IDs are required",
    }),
  }),
};

export const adminListQuerySchema = {
  query: Joi.object({
    folder: Joi.string().trim(),
    type: Joi.string().valid("image", "document").messages({
      "any.only": "Type must be 'image' or 'document'",
    }),
    mime_type: Joi.string().trim(),
    search: Joi.string().trim().max(100).pattern(/^[a-zA-Z0-9\s\-_.]+$/).messages({
      "string.pattern.base": "Search contains invalid characters",
    }),
    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

export default {
  uploadSingleSchema,
  uploadMultipleSchema,
  updateMediaSchema,
  getMediaByIdSchema,
  bulkDeleteSchema,
  adminListQuerySchema,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
};
