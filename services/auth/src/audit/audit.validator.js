import Joi from "joi";
import {
  ACTOR_TYPE,
  AUDIT_ACTION,
  ENTITY_TYPE,
} from "../../utils/constants.js";

// Get all valid values from constants
const validActorTypes = Object.values(ACTOR_TYPE);
const validActions = Object.values(AUDIT_ACTION);
const validEntityTypes = Object.values(ENTITY_TYPE);

//
// AUDIT LOG VALIDATION SCHEMAS
//

/**
 * Query audit logs validation schema
 */
export const queryAuditLogsSchema = Joi.object({
  actorId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow("")
    .messages({
      "string.pattern.base": "Invalid actor ID format",
    }),
  actorType: Joi.string()
    .valid(...validActorTypes)
    .allow("")
    .messages({
      "any.only": `Actor type must be one of: ${validActorTypes.join(", ")}`,
    }),
  action: Joi.string()
    .valid(...validActions)
    .allow("")
    .messages({
      "any.only": "Invalid action value",
    }),
  entityType: Joi.string()
    .valid(...validEntityTypes)
    .allow("")
    .messages({
      "any.only": `Entity type must be one of: ${validEntityTypes.join(", ")}`,
    }),
  entityId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow("")
    .messages({
      "string.pattern.base": "Invalid entity ID format",
    }),
  startDate: Joi.date().iso().allow("").messages({
    "date.format": "Start date must be a valid ISO date",
  }),
  endDate: Joi.date().iso().min(Joi.ref("startDate")).allow("").messages({
    "date.format": "End date must be a valid ISO date",
    "date.min": "End date must be after start date",
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
 * Entity params validation schema
 */
export const entityParamsSchema = Joi.object({
  entityType: Joi.string()
    .valid(...validEntityTypes)
    .required()
    .messages({
      "any.only": `Entity type must be one of: ${validEntityTypes.join(", ")}`,
      "any.required": "Entity type is required",
    }),
  entityId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid entity ID format",
      "string.empty": "Entity ID is required",
      "any.required": "Entity ID is required",
    }),
});

/**
 * Actor params validation schema
 */
export const actorParamsSchema = Joi.object({
  actorType: Joi.string()
    .valid(...validActorTypes)
    .required()
    .messages({
      "any.only": `Actor type must be one of: ${validActorTypes.join(", ")}`,
      "any.required": "Actor type is required",
    }),
  actorId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid actor ID format",
      "string.empty": "Actor ID is required",
      "any.required": "Actor ID is required",
    }),
});

/**
 * Pagination query schema (for entity/actor endpoints)
 */
export const paginationSchema = Joi.object({
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
  queryAuditLogsSchema,
  entityParamsSchema,
  actorParamsSchema,
  paginationSchema,
  validateQuery,
  validateParams,
};
