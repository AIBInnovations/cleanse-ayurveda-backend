import Joi from "joi";

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);
const sectionTypes = ["features_grid", "bento_layout", "product_showcase"];
const overlayPositions = [
  "top_left",
  "top_right",
  "bottom_left",
  "bottom_right",
  "center",
];
const showcaseLayouts = ["image_left", "image_right", "image_background"];

const urlSchema = Joi.string()
  .trim()
  .uri({ scheme: ["http", "https"] })
  .allow("", null);

// Sub-schemas for nested objects
const featureItemSchema = Joi.object({
  icon_url: urlSchema.messages({
    "string.uri": "Icon URL must be a valid http or https URL",
  }),
  heading: Joi.string().trim().min(1).max(100).required().messages({
    "string.empty": "Feature heading is required",
    "any.required": "Feature heading is required",
    "string.max": "Feature heading must not exceed 100 characters",
  }),
  description: Joi.string().trim().max(500).allow("", null).messages({
    "string.max": "Feature description must not exceed 500 characters",
  }),
});

const imageItemSchema = Joi.object({
  url: urlSchema.required().messages({
    "string.uri": "Image URL must be a valid http or https URL",
    "any.required": "Image URL is required",
  }),
  alt_text: Joi.string().trim().max(200).allow("", null).messages({
    "string.max": "Alt text must not exceed 200 characters",
  }),
  link_url: Joi.string().trim().allow("", null),
});

const productReferenceSchema = Joi.object({
  product_id: objectId.required().messages({
    "string.pattern.base": "Invalid product ID format",
    "any.required": "Product ID is required",
  }),
  custom_image_url: urlSchema.messages({
    "string.uri": "Custom image URL must be a valid http or https URL",
  }),
});

const textOverlaySchema = Joi.object({
  heading: Joi.string().trim().max(100).allow("", null).messages({
    "string.max": "Overlay heading must not exceed 100 characters",
  }),
  body: Joi.string().trim().max(500).allow("", null).messages({
    "string.max": "Overlay body must not exceed 500 characters",
  }),
  position: Joi.string()
    .valid(...overlayPositions)
    .default("center")
    .messages({
      "any.only": `Position must be one of: ${overlayPositions.join(", ")}`,
    }),
});

const bentoItemsSchema = Joi.object({
  images: Joi.array().items(imageItemSchema).default([]),
  products: Joi.array().items(productReferenceSchema).default([]),
  text_overlays: Joi.array().items(textOverlaySchema).default([]),
});

const showcaseProductSchema = Joi.object({
  product_id: objectId.allow(null).messages({
    "string.pattern.base": "Invalid product ID format",
  }),
  image_url: urlSchema.messages({
    "string.uri": "Image URL must be a valid http or https URL",
  }),
  heading: Joi.string().trim().max(200).allow("", null).messages({
    "string.max": "Heading must not exceed 200 characters",
  }),
  description: Joi.string().trim().max(1000).allow("", null).messages({
    "string.max": "Description must not exceed 1000 characters",
  }),
  cta_text: Joi.string().trim().max(50).default("Shop Now").messages({
    "string.max": "CTA text must not exceed 50 characters",
  }),
  layout: Joi.string()
    .valid(...showcaseLayouts)
    .default("image_left")
    .messages({
      "any.only": `Layout must be one of: ${showcaseLayouts.join(", ")}`,
    }),
});

// Common fields validation
const commonFieldsSchema = {
  name: Joi.string().trim().min(1).max(100).required().messages({
    "string.empty": "Section name is required",
    "any.required": "Section name is required",
    "string.max": "Section name must not exceed 100 characters",
  }),
  section_type: Joi.string()
    .valid(...sectionTypes)
    .required()
    .messages({
      "any.only": `Section type must be one of: ${sectionTypes.join(", ")}`,
      "any.required": "Section type is required",
    }),
  heading: Joi.string().trim().max(200).allow("", null).messages({
    "string.max": "Heading must not exceed 200 characters",
  }),
  subheading: Joi.string().trim().max(300).allow("", null).messages({
    "string.max": "Subheading must not exceed 300 characters",
  }),
  background_color: Joi.string().trim().default("#ffffff").messages({
    "string.base": "Background color must be a string",
  }),
  text_color: Joi.string().trim().default("#000000").messages({
    "string.base": "Text color must be a string",
  }),
  is_active: Joi.boolean().default(true),
  starts_at: Joi.date().iso().allow(null),
  ends_at: Joi.date()
    .iso()
    .allow(null)
    .custom((value, helpers) => {
      const startsAt = helpers.state.ancestors[0].starts_at;
      if (startsAt && value && new Date(value) <= new Date(startsAt)) {
        return helpers.error("any.custom", {
          message: "End date must be after start date",
        });
      }
      return value;
    })
    .messages({
      "any.custom": "{{#message}}",
    }),
};

// CREATE schema
export const createSectionSchema = {
  body: Joi.object({
    ...commonFieldsSchema,
    // Content fields (conditionally validated)
    features: Joi.array().items(featureItemSchema),
    bento_items: bentoItemsSchema,
    showcase_product: showcaseProductSchema,
  })
    .custom((value, helpers) => {
      // Validate based on section_type
      switch (value.section_type) {
        case "features_grid":
          if (!value.features || value.features.length === 0) {
            return helpers.error("any.custom", {
              message: "features_grid requires at least one feature item",
            });
          }
          break;

        case "bento_layout":
          const bentoItemCount =
            (value.bento_items?.images?.length || 0) +
            (value.bento_items?.products?.length || 0);
          if (bentoItemCount === 0) {
            return helpers.error("any.custom", {
              message: "bento_layout requires at least one image or product",
            });
          }
          break;

        case "product_showcase":
          if (!value.showcase_product?.product_id) {
            return helpers.error("any.custom", {
              message: "product_showcase requires a product_id",
            });
          }
          break;
      }

      return value;
    })
    .messages({
      "any.custom": "{{#message}}",
      "object.unknown": "{{#label}} is not allowed",
    }),
};

// UPDATE schema (all fields optional except validation rules)
export const updateSectionSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid section ID format",
      "any.required": "Section ID is required",
    }),
  }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).messages({
      "string.empty": "Section name cannot be empty",
      "string.max": "Section name must not exceed 100 characters",
    }),
    section_type: Joi.string()
      .valid(...sectionTypes)
      .messages({
        "any.only": `Section type must be one of: ${sectionTypes.join(", ")}`,
      }),
    heading: Joi.string().trim().max(200).allow("", null).messages({
      "string.max": "Heading must not exceed 200 characters",
    }),
    subheading: Joi.string().trim().max(300).allow("", null).messages({
      "string.max": "Subheading must not exceed 300 characters",
    }),
    background_color: Joi.string().trim(),
    text_color: Joi.string().trim(),
    features: Joi.array().items(featureItemSchema),
    bento_items: bentoItemsSchema,
    showcase_product: showcaseProductSchema,
    is_active: Joi.boolean(),
    starts_at: Joi.date().iso().allow(null),
    ends_at: Joi.date()
      .iso()
      .allow(null)
      .custom((value, helpers) => {
        const startsAt = helpers.state.ancestors[0].starts_at;
        if (startsAt && value && new Date(value) <= new Date(startsAt)) {
          return helpers.error("any.custom", {
            message: "End date must be after start date",
          });
        }
        return value;
      })
      .messages({
        "any.custom": "{{#message}}",
      }),
  })
    .min(1)
    .messages({
      "object.min": "At least one field is required for update",
    }),
};

// LIST query schema
export const listSectionsQuerySchema = {
  query: Joi.object({
    section_type: Joi.string()
      .valid(...sectionTypes)
      .messages({
        "any.only": `Section type must be one of: ${sectionTypes.join(", ")}`,
      }),
    is_active: Joi.boolean(),
    status: Joi.string().valid("active", "inactive", "scheduled", "expired"),
    search: Joi.string().trim().max(100).messages({
      "string.max": "Search query must not exceed 100 characters",
    }),
    page: Joi.number().integer().min(1).max(1000).default(1).messages({
      "number.min": "Page must be at least 1",
      "number.max": "Page must not exceed 1000",
    }),
    limit: Joi.number().integer().min(1).max(100).default(20).messages({
      "number.min": "Limit must be at least 1",
      "number.max": "Limit must not exceed 100",
    }),
  }),
};

// GET by ID schema
export const getSectionByIdSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid section ID format",
      "any.required": "Section ID is required",
    }),
  }),
};

// GET by name schema
export const getSectionByNameSchema = {
  params: Joi.object({
    name: Joi.string().trim().min(1).max(100).required().messages({
      "string.empty": "Section name is required",
      "any.required": "Section name is required",
      "string.max": "Section name must not exceed 100 characters",
    }),
  }),
};

// DELETE schema
export const deleteSectionSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid section ID format",
      "any.required": "Section ID is required",
    }),
  }),
};

// ACTIVATE/DEACTIVATE schema
export const toggleSectionSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid section ID format",
      "any.required": "Section ID is required",
    }),
  }),
};

export default {
  createSectionSchema,
  updateSectionSchema,
  listSectionsQuerySchema,
  getSectionByIdSchema,
  getSectionByNameSchema,
  deleteSectionSchema,
  toggleSectionSchema,
};
