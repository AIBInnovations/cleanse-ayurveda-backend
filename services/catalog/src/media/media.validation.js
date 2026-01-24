import Joi from "joi";

/**
 * Validates MongoDB ObjectId format
 */
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

/**
 * Validation schema for uploading product media
 * POST /api/admin/products/:productId/media
 */
export const uploadMediaSchema = {
  params: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
  }),
  body: Joi.object({
    variantId: objectId.allow(null).messages({
      "string.pattern.base": "Invalid variant ID format",
    }),
    type: Joi.string().valid("image", "video").required().messages({
      "any.only": "Type must be either 'image' or 'video'",
      "any.required": "Media type is required",
    }),
    url: Joi.string().uri().required().messages({
      "string.uri": "URL must be a valid URI",
      "any.required": "URL is required",
    }),
    publicId: Joi.string().allow(null, ""),
    altText: Joi.string().trim().max(200).allow(null, "").messages({
      "string.max": "Alt text must not exceed 200 characters",
    }),
    isPrimary: Joi.boolean().default(false),
    sortOrder: Joi.number().integer().min(0).default(0),
    metadata: Joi.object({
      width: Joi.number().integer().positive().allow(null),
      height: Joi.number().integer().positive().allow(null),
      format: Joi.string().allow(null, ""),
      bytes: Joi.number().integer().positive().allow(null),
    }).default({}),
  }),
};

/**
 * Validation schema for bulk uploading media
 * POST /api/admin/products/:productId/media/bulk
 */
export const bulkUploadMediaSchema = {
  params: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
  }),
  body: Joi.object({
    media: Joi.array()
      .items(
        Joi.object({
          variantId: objectId.allow(null).messages({
            "string.pattern.base": "Invalid variant ID format",
          }),
          type: Joi.string().valid("image", "video").required().messages({
            "any.only": "Type must be either 'image' or 'video'",
            "any.required": "Media type is required",
          }),
          url: Joi.string().uri().required().messages({
            "string.uri": "URL must be a valid URI",
            "any.required": "URL is required",
          }),
          publicId: Joi.string().allow(null, ""),
          altText: Joi.string().trim().max(200).allow(null, "").messages({
            "string.max": "Alt text must not exceed 200 characters",
          }),
          isPrimary: Joi.boolean().default(false),
          sortOrder: Joi.number().integer().min(0).default(0),
          metadata: Joi.object({
            width: Joi.number().integer().positive().allow(null),
            height: Joi.number().integer().positive().allow(null),
            format: Joi.string().allow(null, ""),
            bytes: Joi.number().integer().positive().allow(null),
          }).default({}),
        })
      )
      .min(1)
      .max(20)
      .required()
      .messages({
        "array.min": "At least one media item is required",
        "array.max": "Cannot upload more than 20 media items at once",
        "any.required": "Media array is required",
      }),
  }),
};

/**
 * Validation schema for updating media
 * PUT /api/admin/media/:id
 */
export const updateMediaSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid media ID format",
      "any.required": "Media ID is required",
    }),
  }),
  body: Joi.object({
    altText: Joi.string().trim().max(200).allow(null, "").messages({
      "string.max": "Alt text must not exceed 200 characters",
    }),
    sortOrder: Joi.number().integer().min(0),
  })
    .min(1)
    .messages({
      "object.min": "At least one field is required to update",
    }),
};

/**
 * Validation schema for media ID param
 * GET/DELETE /api/admin/media/:id
 */
export const mediaIdParamSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid media ID format",
      "any.required": "Media ID is required",
    }),
  }),
};

/**
 * Validation schema for product ID param (list media)
 * GET /api/admin/products/:productId/media
 */
export const productIdParamSchema = {
  params: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
  }),
};

/**
 * Validation schema for product slug param (consumer)
 * GET /api/products/:productSlug/media
 */
export const productSlugParamSchema = {
  params: Joi.object({
    productSlug: Joi.string().trim().lowercase().required().messages({
      "string.empty": "Product slug is required",
      "any.required": "Product slug is required",
    }),
  }),
};

/**
 * Validation schema for setting primary media
 * PATCH /api/admin/media/:id/primary
 */
export const setPrimaryMediaSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid media ID format",
      "any.required": "Media ID is required",
    }),
  }),
};

/**
 * Validation schema for reordering media
 * PATCH /api/admin/products/:productId/media/reorder
 */
export const reorderMediaSchema = {
  params: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
  }),
  body: Joi.object({
    media: Joi.array()
      .items(
        Joi.object({
          id: objectId.required().messages({
            "string.pattern.base": "Invalid media ID format",
            "any.required": "Media ID is required",
          }),
          sortOrder: Joi.number().integer().min(0).required().messages({
            "number.base": "Sort order must be a number",
            "number.min": "Sort order must be at least 0",
            "any.required": "Sort order is required",
          }),
        })
      )
      .min(1)
      .required()
      .messages({
        "array.min": "At least one media item is required",
        "any.required": "Media array is required",
      }),
  }),
};

export default {
  uploadMediaSchema,
  bulkUploadMediaSchema,
  updateMediaSchema,
  mediaIdParamSchema,
  productIdParamSchema,
  productSlugParamSchema,
  setPrimaryMediaSchema,
  reorderMediaSchema,
};
