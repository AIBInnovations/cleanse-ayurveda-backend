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
    is_featured: Joi.boolean(),
    search: Joi.string().trim().allow(""),
  }),
};

export const getTestimonialByIdSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid testimonial ID format",
      "any.required": "Testimonial ID is required",
    }),
  }),
};

export const createTestimonialSchema = {
  body: Joi.object({
    customer_name: Joi.string().trim().min(1).max(100).required().messages({
      "string.empty": "Customer name is required",
      "any.required": "Customer name is required",
    }),
    customer_photo_url: Joi.string().uri().allow(null, ""),
    testimonial_text: Joi.string().trim().min(1).max(2000).required().messages({
      "string.empty": "Testimonial text is required",
      "any.required": "Testimonial text is required",
    }),
    rating: Joi.number().integer().min(1).max(5).required().messages({
      "number.min": "Rating must be at least 1",
      "number.max": "Rating must not exceed 5",
      "any.required": "Rating is required",
    }),
    before_photo_url: Joi.string().uri().allow(null, ""),
    after_photo_url: Joi.string().uri().allow(null, ""),
    product_id: objectId.allow(null).messages({
      "string.pattern.base": "Invalid product ID format",
    }),
    is_verified_purchase: Joi.boolean().default(false),
    is_featured: Joi.boolean().default(false),
    is_active: Joi.boolean().default(true),
    sort_order: Joi.number().integer().default(0),
  }),
};

export const updateTestimonialSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid testimonial ID format",
      "any.required": "Testimonial ID is required",
    }),
  }),
  body: Joi.object({
    customer_name: Joi.string().trim().min(1).max(100),
    customer_photo_url: Joi.string().uri().allow(null, ""),
    testimonial_text: Joi.string().trim().min(1).max(2000),
    rating: Joi.number().integer().min(1).max(5),
    before_photo_url: Joi.string().uri().allow(null, ""),
    after_photo_url: Joi.string().uri().allow(null, ""),
    product_id: objectId.allow(null),
    is_verified_purchase: Joi.boolean(),
    is_featured: Joi.boolean(),
    sort_order: Joi.number().integer(),
  }).min(1).messages({
    "object.min": "At least one field is required to update",
  }),
};

export const reorderTestimonialsSchema = {
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
  getTestimonialByIdSchema,
  createTestimonialSchema,
  updateTestimonialSchema,
  reorderTestimonialsSchema,
};
