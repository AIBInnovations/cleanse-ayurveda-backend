import Joi from "joi";

//
// CONSUMER ADDRESS VALIDATION SCHEMAS
//

/**
 * Create address validation schema
 */
export const createAddressSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "Full name is required",
    "string.min": "Full name must be at least 2 characters",
    "string.max": "Full name must be at most 100 characters",
    "any.required": "Full name is required",
  }),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{9,14}$/)
    .required()
    .messages({
      "string.pattern.base": "Please provide a valid phone number",
      "string.empty": "Phone number is required",
      "any.required": "Phone number is required",
    }),
  addressLine1: Joi.string().trim().min(5).max(200).required().messages({
    "string.empty": "Address line 1 is required",
    "string.min": "Address line 1 must be at least 5 characters",
    "string.max": "Address line 1 must be at most 200 characters",
    "any.required": "Address line 1 is required",
  }),
  addressLine2: Joi.string().trim().max(200).allow(null, "").messages({
    "string.max": "Address line 2 must be at most 200 characters",
  }),
  city: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "City is required",
    "string.min": "City must be at least 2 characters",
    "string.max": "City must be at most 100 characters",
    "any.required": "City is required",
  }),
  state: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "State is required",
    "string.min": "State must be at least 2 characters",
    "string.max": "State must be at most 100 characters",
    "any.required": "State is required",
  }),
  pincode: Joi.string()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      "string.pattern.base": "Pincode must be a 6-digit number",
      "string.empty": "Pincode is required",
      "any.required": "Pincode is required",
    }),
  country: Joi.string().trim().max(100).default("India").messages({
    "string.max": "Country must be at most 100 characters",
  }),
  landmark: Joi.string().trim().max(200).allow(null, "").messages({
    "string.max": "Landmark must be at most 200 characters",
  }),
  label: Joi.string()
    .valid("Home", "Office", "Other")
    .default("Home")
    .messages({
      "any.only": "Label must be Home, Office, or Other",
    }),
  type: Joi.string()
    .valid("shipping", "billing", "both")
    .default("both")
    .messages({
      "any.only": "Type must be shipping, billing, or both",
    }),
  isDefaultShipping: Joi.boolean().default(false),
  isDefaultBilling: Joi.boolean().default(false),
});

/**
 * Update address validation schema
 * All fields optional for partial updates
 */
export const updateAddressSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).messages({
    "string.min": "Full name must be at least 2 characters",
    "string.max": "Full name must be at most 100 characters",
  }),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{9,14}$/)
    .messages({
      "string.pattern.base": "Please provide a valid phone number",
    }),
  addressLine1: Joi.string().trim().min(5).max(200).messages({
    "string.min": "Address line 1 must be at least 5 characters",
    "string.max": "Address line 1 must be at most 200 characters",
  }),
  addressLine2: Joi.string().trim().max(200).allow(null, "").messages({
    "string.max": "Address line 2 must be at most 200 characters",
  }),
  city: Joi.string().trim().min(2).max(100).messages({
    "string.min": "City must be at least 2 characters",
    "string.max": "City must be at most 100 characters",
  }),
  state: Joi.string().trim().min(2).max(100).messages({
    "string.min": "State must be at least 2 characters",
    "string.max": "State must be at most 100 characters",
  }),
  pincode: Joi.string()
    .pattern(/^\d{6}$/)
    .messages({
      "string.pattern.base": "Pincode must be a 6-digit number",
    }),
  country: Joi.string().trim().max(100).messages({
    "string.max": "Country must be at most 100 characters",
  }),
  landmark: Joi.string().trim().max(200).allow(null, "").messages({
    "string.max": "Landmark must be at most 200 characters",
  }),
  label: Joi.string().valid("Home", "Office", "Other").messages({
    "any.only": "Label must be Home, Office, or Other",
  }),
  type: Joi.string().valid("shipping", "billing", "both").messages({
    "any.only": "Type must be shipping, billing, or both",
  }),
  isDefaultShipping: Joi.boolean(),
  isDefaultBilling: Joi.boolean(),
});

/**
 * Address ID param validation schema
 */
export const addressIdParamSchema = Joi.object({
  addressId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid address ID format",
      "string.empty": "Address ID is required",
      "any.required": "Address ID is required",
    }),
});

/**
 * Validate pincode request schema
 */
export const validatePincodeSchema = Joi.object({
  pincode: Joi.string()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      "string.pattern.base": "Pincode must be a 6-digit number",
      "string.empty": "Pincode is required",
      "any.required": "Pincode is required",
    }),
});

//
// ADMIN ADDRESS MANAGEMENT VALIDATION SCHEMAS
//

/**
 * Customer ID param for address lookup
 */
export const customerAddressParamSchema = Joi.object({
  customerId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid customer ID format",
      "string.empty": "Customer ID is required",
      "any.required": "Customer ID is required",
    }),
});

/**
 * Flag address validation schema
 */
export const flagAddressSchema = Joi.object({
  reason: Joi.string().trim().min(5).max(500).required().messages({
    "string.empty": "Flag reason is required",
    "string.min": "Flag reason must be at least 5 characters",
    "string.max": "Flag reason must be at most 500 characters",
    "any.required": "Flag reason is required",
  }),
});

//
// VALIDATION MIDDLEWARE FACTORIES
//

/**
 * Validate request body against a schema
 * @param {object} schema - Joi schema
 * @returns {function} Express middleware
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessages = error.details
        .map((detail) => detail.message)
        .join(", ");
      console.log(`Validation error: ${errorMessages}`);
      return res.status(400).json({
        message: "Validation failed",
        data: null,
        error: errorMessages,
      });
    }

    req.body = value;
    next();
  };
};

/**
 * Validate request params against a schema
 * @param {object} schema - Joi schema
 * @returns {function} Express middleware
 */
export const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessages = error.details
        .map((detail) => detail.message)
        .join(", ");
      console.log(`Validation error: ${errorMessages}`);
      return res.status(400).json({
        message: "Validation failed",
        data: null,
        error: errorMessages,
      });
    }

    req.params = value;
    next();
  };
};

export default {
  createAddressSchema,
  updateAddressSchema,
  addressIdParamSchema,
  validatePincodeSchema,
  customerAddressParamSchema,
  flagAddressSchema,
  validate,
  validateParams,
};
