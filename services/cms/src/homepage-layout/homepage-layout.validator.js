import Joi from "joi";

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

const sectionSources = [
  "banner",
  "custom_section",
  "featured_products",
  "collections",
  "testimonials",
  "reels",
];

const referenceModels = ["Banner", "HomepageSection", "Testimonial", "Reel"];
const productSources = ["featured", "bestseller", "new_arrival", "collection"];
const layoutStyles = ["grid", "carousel", "list"];

// Config schema for dynamic sections
const configSchema = Joi.object({
  product_source: Joi.string()
    .valid(...productSources, null)
    .allow(null)
    .messages({
      "any.only": `Product source must be one of: ${productSources.join(", ")}`,
    }),
  collection_id: objectId.allow(null).messages({
    "string.pattern.base": "Invalid collection ID format",
  }),
  limit: Joi.number().integer().min(1).max(100).default(8).messages({
    "number.min": "Limit must be at least 1",
    "number.max": "Limit must not exceed 100",
  }),
  collection_ids: Joi.array().items(objectId).default([]).messages({
    "string.pattern.base": "Invalid collection ID format in collection_ids",
  }),
  display_count: Joi.number().integer().min(1).max(50).allow(null).messages({
    "number.min": "Display count must be at least 1",
    "number.max": "Display count must not exceed 50",
  }),
  layout_style: Joi.string()
    .valid(...layoutStyles, null)
    .allow(null)
    .messages({
      "any.only": `Layout style must be one of: ${layoutStyles.join(", ")}`,
    }),
  heading: Joi.string().trim().max(200).allow("", null).messages({
    "string.max": "Heading must not exceed 200 characters",
  }),
  subheading: Joi.string().trim().max(300).allow("", null).messages({
    "string.max": "Subheading must not exceed 300 characters",
  }),
});

// Section reference schema
const sectionReferenceSchema = Joi.object({
  section_source: Joi.string()
    .valid(...sectionSources)
    .required()
    .messages({
      "any.only": `Section source must be one of: ${sectionSources.join(", ")}`,
      "any.required": "Section source is required",
    }),

  reference_id: objectId.allow(null).messages({
    "string.pattern.base": "Invalid reference ID format",
  }),

  reference_model: Joi.string()
    .valid(...referenceModels, null)
    .allow(null)
    .messages({
      "any.only": `Reference model must be one of: ${referenceModels.join(", ")}`,
    }),

  config: configSchema,

  sort_order: Joi.number().integer().min(0).required().messages({
    "number.min": "Sort order must be a non-negative number",
    "any.required": "Sort order is required",
  }),

  is_visible: Joi.boolean().default(true),
})
  .custom((value, helpers) => {
    // Validate that reference_id is provided when required
    const requiresReference = ["banner", "custom_section", "testimonials", "reels"];

    if (requiresReference.includes(value.section_source)) {
      if (!value.reference_id) {
        return helpers.error("any.custom", {
          message: `${value.section_source} requires a reference_id`,
        });
      }
      if (!value.reference_model) {
        return helpers.error("any.custom", {
          message: `${value.section_source} requires a reference_model`,
        });
      }
    }

    // Validate that collection_id is provided for collection product source
    if (value.config?.product_source === "collection" && !value.config?.collection_id) {
      return helpers.error("any.custom", {
        message: "collection_id is required when product_source is 'collection'",
      });
    }

    return value;
  })
  .messages({
    "any.custom": "{{#message}}",
  });

// UPDATE layout schema
export const updateLayoutSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).messages({
      "string.empty": "Layout name cannot be empty",
      "string.max": "Layout name must not exceed 100 characters",
    }),

    sections: Joi.array()
      .items(sectionReferenceSchema)
      .min(0)
      .messages({
        "array.base": "Sections must be an array",
      }),

    is_active: Joi.boolean(),

    version: Joi.number().integer().min(1).messages({
      "number.min": "Version must be at least 1",
    }),

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

// GET layout versions query schema
export const getLayoutVersionsQuerySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).max(1000).default(1).messages({
      "number.min": "Page must be at least 1",
      "number.max": "Page must not exceed 1000",
    }),
    limit: Joi.number().integer().min(1).max(100).default(10).messages({
      "number.min": "Limit must be at least 1",
      "number.max": "Limit must not exceed 100",
    }),
  }),
};

export default {
  updateLayoutSchema,
  getLayoutVersionsQuerySchema,
};
