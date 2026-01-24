import Joi from "joi";

//
// ADMIN USER VALIDATION SCHEMAS
//

/**
 * Create admin validation schema
 */
export const createAdminSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    "string.email": "Please provide a valid email address",
    "string.empty": "Email is required",
    "any.required": "Email is required",
  }),
  firstName: Joi.string().trim().min(2).max(50).required().messages({
    "string.empty": "First name is required",
    "string.min": "First name must be at least 2 characters",
    "string.max": "First name must be at most 50 characters",
    "any.required": "First name is required",
  }),
  lastName: Joi.string().trim().min(2).max(50).required().messages({
    "string.empty": "Last name is required",
    "string.min": "Last name must be at least 2 characters",
    "string.max": "Last name must be at most 50 characters",
    "any.required": "Last name is required",
  }),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{9,14}$/)
    .allow(null, "")
    .messages({
      "string.pattern.base": "Please provide a valid phone number in E.164 format",
    }),
  roleId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid role ID format",
      "string.empty": "Role ID is required",
      "any.required": "Role ID is required",
    }),
  initialPassword: Joi.string().min(8).max(100).messages({
    "string.min": "Password must be at least 8 characters",
    "string.max": "Password must be at most 100 characters",
  }),
});

/**
 * Update admin validation schema
 * All fields optional for partial updates
 */
export const updateAdminSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).messages({
    "string.min": "First name must be at least 2 characters",
    "string.max": "First name must be at most 50 characters",
  }),
  lastName: Joi.string().trim().min(2).max(50).messages({
    "string.min": "Last name must be at least 2 characters",
    "string.max": "Last name must be at most 50 characters",
  }),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{9,14}$/)
    .allow(null, "")
    .messages({
      "string.pattern.base": "Please provide a valid phone number in E.164 format",
    }),
  roleId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      "string.pattern.base": "Invalid role ID format",
    }),
});

/**
 * Admin ID param validation schema
 */
export const adminIdParamSchema = Joi.object({
  adminId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid admin ID format",
      "string.empty": "Admin ID is required",
      "any.required": "Admin ID is required",
    }),
});

/**
 * Assign role validation schema
 */
export const assignRoleSchema = Joi.object({
  roleId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid role ID format",
      "string.empty": "Role ID is required",
      "any.required": "Role ID is required",
    }),
});

/**
 * Search admins query validation schema
 */
export const searchAdminsSchema = Joi.object({
  query: Joi.string().trim().max(100).allow("").messages({
    "string.max": "Search query must be at most 100 characters",
  }),
  email: Joi.string().email().lowercase().trim().allow("").messages({
    "string.email": "Please provide a valid email address",
  }),
  roleId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow("")
    .messages({
      "string.pattern.base": "Invalid role ID format",
    }),
  status: Joi.string().valid("active", "suspended").allow("").messages({
    "any.only": "Status must be active or suspended",
  }),
  page: Joi.number().integer().min(1).default(1).messages({
    "number.min": "Page must be at least 1",
  }),
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    "number.min": "Limit must be at least 1",
    "number.max": "Limit must be at most 100",
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
  createAdminSchema,
  updateAdminSchema,
  adminIdParamSchema,
  assignRoleSchema,
  searchAdminsSchema,
  validate,
  validateParams,
  validateQuery,
};
