import Joi from "joi";
import { ALL_PERMISSIONS } from "../../utils/constants.js";

//
// ROLE VALIDATION SCHEMAS
//

/**
 * Create role validation schema
 */
export const createRoleSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-z_]+$/)
    .required()
    .messages({
      "string.empty": "Role name is required",
      "string.min": "Role name must be at least 2 characters",
      "string.max": "Role name must be at most 50 characters",
      "string.pattern.base":
        "Role name must be lowercase with underscores only",
      "any.required": "Role name is required",
    }),
  description: Joi.string().trim().max(200).allow(null, "").messages({
    "string.max": "Description must be at most 200 characters",
  }),
  displayName: Joi.string().trim().min(2).max(100).allow(null, "").messages({
    "string.min": "Display name must be at least 2 characters",
    "string.max": "Display name must be at most 100 characters",
  }),
  isActive: Joi.boolean().default(true).messages({
    "boolean.base": "isActive must be a boolean",
  }),
  permissions: Joi.array()
    .items(Joi.string().valid(...ALL_PERMISSIONS))
    .unique()
    .default([])
    .messages({
      "array.unique": "Permissions must be unique",
      "any.only": "Invalid permission value",
    }),
});

/**
 * Update role validation schema
 * All fields optional for partial updates
 */
export const updateRoleSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-z_]+$/)
    .messages({
      "string.min": "Role name must be at least 2 characters",
      "string.max": "Role name must be at most 50 characters",
      "string.pattern.base":
        "Role name must be lowercase with underscores only",
    }),
  description: Joi.string().trim().max(200).allow(null, "").messages({
    "string.max": "Description must be at most 200 characters",
  }),
  displayName: Joi.string().trim().min(2).max(100).allow(null, "").messages({
    "string.min": "Display name must be at least 2 characters",
    "string.max": "Display name must be at most 100 characters",
  }),
  isActive: Joi.boolean().messages({
    "boolean.base": "isActive must be a boolean",
  }),
  permissions: Joi.array()
    .items(Joi.string().valid(...ALL_PERMISSIONS))
    .unique()
    .messages({
      "array.unique": "Permissions must be unique",
      "any.only": "Invalid permission value",
    }),
});

/**
 * Role ID param validation schema
 */
export const roleIdParamSchema = Joi.object({
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
 * Assign permissions validation schema
 */
export const assignPermissionsSchema = Joi.object({
  permissions: Joi.array()
    .items(Joi.string().valid(...ALL_PERMISSIONS))
    .unique()
    .min(1)
    .required()
    .messages({
      "array.min": "At least one permission is required",
      "array.unique": "Permissions must be unique",
      "any.only": "Invalid permission value",
      "any.required": "Permissions array is required",
    }),
});

/**
 * Remove permissions validation schema
 */
export const removePermissionsSchema = Joi.object({
  permissions: Joi.array()
    .items(Joi.string().valid(...ALL_PERMISSIONS))
    .unique()
    .min(1)
    .required()
    .messages({
      "array.min": "At least one permission is required",
      "array.unique": "Permissions must be unique",
      "any.only": "Invalid permission value",
      "any.required": "Permissions array is required",
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
  createRoleSchema,
  updateRoleSchema,
  roleIdParamSchema,
  assignPermissionsSchema,
  removePermissionsSchema,
  validate,
  validateParams,
};
