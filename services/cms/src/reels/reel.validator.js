import Joi from "joi";

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

export const consumerQuerySchema = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(20),
  }),
};

export const adminListQuerySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    is_active: Joi.boolean(),
    search: Joi.string().trim().allow(""),
  }),
};

export const getReelByIdSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid reel ID format",
      "any.required": "Reel ID is required",
    }),
  }),
};

export const createReelSchema = {
  body: Joi.object({
    title: Joi.string().trim().min(1).max(200).required().messages({
      "string.empty": "Title is required",
      "any.required": "Title is required",
    }),
    description: Joi.string().trim().max(1000).allow(null, ""),
    video_url: Joi.string().uri().required().messages({
      "string.uri": "Please provide a valid video URL",
      "any.required": "Video URL is required",
    }),
    thumbnail_url: Joi.string().uri().allow(null, ""),
    duration: Joi.number().integer().min(0).allow(null),
    is_active: Joi.boolean().default(true),
    sort_order: Joi.number().integer().default(0),
  }),
};

export const updateReelSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid reel ID format",
      "any.required": "Reel ID is required",
    }),
  }),
  body: Joi.object({
    title: Joi.string().trim().min(1).max(200),
    description: Joi.string().trim().max(1000).allow(null, ""),
    video_url: Joi.string().uri(),
    thumbnail_url: Joi.string().uri().allow(null, ""),
    duration: Joi.number().integer().min(0).allow(null),
    sort_order: Joi.number().integer(),
  }).min(1).messages({
    "object.min": "At least one field is required to update",
  }),
};

export const reorderReelsSchema = {
  body: Joi.object({
    items: Joi.array()
      .items(
        Joi.object({
          id: objectId.required(),
          sort_order: Joi.number().integer().required(),
        })
      )
      .min(1)
      .required()
      .messages({
        "array.min": "At least one item is required",
        "any.required": "Items are required",
      }),
  }),
};

export default {
  consumerQuerySchema,
  adminListQuerySchema,
  getReelByIdSchema,
  createReelSchema,
  updateReelSchema,
  reorderReelsSchema,
};
