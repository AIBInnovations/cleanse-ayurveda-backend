import Joi from "joi";

//
// CONSUMER PROFILE VALIDATION SCHEMAS
//

/**
 * Update profile validation schema
 * All fields optional for partial updates
 */
export const updateProfileSchema = Joi.object({
  firstName: Joi.string().trim().max(50).allow(null, "").messages({
    "string.max": "First name must be at most 50 characters",
  }),
  lastName: Joi.string().trim().max(50).allow(null, "").messages({
    "string.max": "Last name must be at most 50 characters",
  }),
  preferences: Joi.object({
    language: Joi.string()
      .valid("en", "hi", "ta", "te", "kn", "ml", "mr", "gu", "bn", "pa")
      .messages({
        "any.only": "Invalid language preference",
      }),
    currency: Joi.string().valid("INR", "USD", "EUR", "GBP").messages({
      "any.only": "Invalid currency preference",
    }),
  }).messages({
    "object.base": "Preferences must be an object",
  }),
  marketingConsent: Joi.object({
    email: Joi.boolean().messages({
      "boolean.base": "Email consent must be a boolean",
    }),
    sms: Joi.boolean().messages({
      "boolean.base": "SMS consent must be a boolean",
    }),
    whatsapp: Joi.boolean().messages({
      "boolean.base": "WhatsApp consent must be a boolean",
    }),
    push: Joi.boolean().messages({
      "boolean.base": "Push consent must be a boolean",
    }),
  }).messages({
    "object.base": "Marketing consent must be an object",
  }),
});

/**
 * Change email validation schema
 */
export const changeEmailSchema = Joi.object({
  newEmail: Joi.string().email().lowercase().trim().required().messages({
    "string.email": "Please provide a valid email address",
    "string.empty": "New email is required",
    "any.required": "New email is required",
  }),
});

/**
 * Request phone change validation schema
 */
export const changePhoneSchema = Joi.object({
  newPhone: Joi.string()
    .pattern(/^\+?[1-9]\d{9,14}$/)
    .required()
    .messages({
      "string.pattern.base": "Please provide a valid phone number",
      "string.empty": "New phone number is required",
      "any.required": "New phone number is required",
    }),
});

/**
 * Verify phone change validation schema
 */
export const verifyPhoneSchema = Joi.object({
  firebaseIdToken: Joi.string().required().messages({
    "string.empty": "Firebase ID token is required",
    "any.required": "Firebase ID token is required",
  }),
});

/**
 * Delete account validation schema
 * Requires explicit confirmation
 */
export const deleteAccountSchema = Joi.object({
  confirmation: Joi.string().valid("DELETE").required().messages({
    "any.only": "Type 'DELETE' to confirm account deletion",
    "string.empty": "Confirmation is required",
    "any.required": "Confirmation is required",
  }),
});

//
// ADMIN CUSTOMER MANAGEMENT VALIDATION SCHEMAS
//

/**
 * Search customers validation schema
 */
export const searchCustomersSchema = Joi.object({
  query: Joi.string().trim().max(100).allow("").messages({
    "string.max": "Search query must be at most 100 characters",
  }),
  email: Joi.string().email().lowercase().trim().allow("").messages({
    "string.email": "Please provide a valid email address",
  }),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{9,14}$/)
    .allow("")
    .messages({
      "string.pattern.base": "Please provide a valid phone number",
    }),
  status: Joi.string().valid("active", "suspended", "deleted").messages({
    "any.only": "Status must be active, suspended, or deleted",
  }),
  page: Joi.number().integer().min(1).default(1).messages({
    "number.min": "Page must be at least 1",
  }),
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    "number.min": "Limit must be at least 1",
    "number.max": "Limit must be at most 100",
  }),
});

/**
 * Customer ID param validation schema
 */
export const customerIdParamSchema = Joi.object({
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
 * Update customer status validation schema
 */
export const updateCustomerStatusSchema = Joi.object({
  status: Joi.string().valid("active", "suspended").required().messages({
    "any.only": "Status must be active or suspended",
    "any.required": "Status is required",
  }),
  reason: Joi.string()
    .trim()
    .max(500)
    .when("status", {
      is: "suspended",
      then: Joi.required(),
      otherwise: Joi.optional().allow(""),
    })
    .messages({
      "string.max": "Reason must be at most 500 characters",
      "any.required": "Reason is required when suspending a customer",
    }),
});

/**
 * Add customer note validation schema
 */
export const addCustomerNoteSchema = Joi.object({
  note: Joi.string().trim().min(1).max(1000).required().messages({
    "string.empty": "Note is required",
    "string.min": "Note cannot be empty",
    "string.max": "Note must be at most 1000 characters",
    "any.required": "Note is required",
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

/**
 * Validate request query against a schema
 * @param {object} schema - Joi schema
 * @returns {function} Express middleware
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
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

    // Update query properties individually since req.query is read-only
    Object.keys(req.query).forEach(key => delete req.query[key]);
    Object.assign(req.query, value);
    next();
  };
};

export default {
  updateProfileSchema,
  changeEmailSchema,
  changePhoneSchema,
  verifyPhoneSchema,
  deleteAccountSchema,
  searchCustomersSchema,
  customerIdParamSchema,
  updateCustomerStatusSchema,
  addCustomerNoteSchema,
  validate,
  validateParams,
  validateQuery,
};
