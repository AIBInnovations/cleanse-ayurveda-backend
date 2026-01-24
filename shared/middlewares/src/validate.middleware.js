import { sendResponse, HTTP_STATUS } from "@shared/utils";

/**
 * Generic Joi validation middleware
 * @param {object} schema - Joi schema to validate against OR an object with nested schemas { body, query, params }
 * @param {string} target - Request property to validate (body, query, params)
 * @returns {function} Express middleware function
 */
export const validate = (schema, target = "body") => {
  return (req, res, next) => {
    // If schema is an object with nested schemas (e.g., { body: Joi.object(...), query: Joi.object(...) })
    // Extract the appropriate schema for the target
    let actualSchema = schema;
    if (schema && !schema.validate && typeof schema === "object") {
      // Check if schema has nested schemas
      if (schema[target]) {
        actualSchema = schema[target];
      } else {
        // If called with nested schema but no matching target, try all targets
        // and validate all of them
        const targets = Object.keys(schema).filter((key) =>
          ["body", "query", "params"].includes(key)
        );

        for (const t of targets) {
          const dataToValidate = req[t];
          const { error, value } = schema[t].validate(dataToValidate, {
            abortEarly: false,
            stripUnknown: true,
          });

          if (error) {
            const errorDetails = error.details.map((detail) => detail.message).join(", ");
            console.log(`Validation failed for ${t}: ${errorDetails}`);

            return sendResponse(
              res,
              HTTP_STATUS.BAD_REQUEST,
              "Validation failed",
              null,
              errorDetails
            );
          }

          // Handle req.query being read-only
          if (t === "query") {
            Object.keys(req.query).forEach(key => delete req.query[key]);
            Object.assign(req.query, value);
          } else {
            req[t] = value;
          }
        }

        return next();
      }
    }

    const dataToValidate = req[target];
    console.log(`Validating ${target}:`, JSON.stringify(dataToValidate));

    const { error, value } = actualSchema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorDetails = error.details.map((detail) => detail.message).join(", ");
      console.log(`Validation failed: ${errorDetails}`);

      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Validation failed",
        null,
        errorDetails
      );
    }

    // Handle req.query being read-only
    if (target === "query") {
      Object.keys(req.query).forEach(key => delete req.query[key]);
      Object.assign(req.query, value);
    } else {
      req[target] = value;
    }
    next();
  };
};

/**
 * Validate request body
 * @param {object} schema - Joi schema
 * @returns {function} Express middleware
 */
export const validateBody = (schema) => validate(schema, "body");

/**
 * Validate query parameters
 * @param {object} schema - Joi schema
 * @returns {function} Express middleware
 */
export const validateQuery = (schema) => validate(schema, "query");

/**
 * Validate route parameters
 * @param {object} schema - Joi schema
 * @returns {function} Express middleware
 */
export const validateParams = (schema) => validate(schema, "params");

export default {
  validate,
  validateBody,
  validateQuery,
  validateParams,
};
