import Joi from "joi";

/**
 * Admin login validation schema
 */
export const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    "string.email": "Please provide a valid email address",
    "string.empty": "Email is required",
    "any.required": "Email is required",
  }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required",
    "any.required": "Password is required",
  }),
});

/**
 * Admin change password validation schema
 */
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "string.empty": "Current password is required",
    "any.required": "Current password is required",
  }),
  newPassword: Joi.string().min(8).required().messages({
    "string.min": "New password must be at least 8 characters",
    "string.empty": "New password is required",
    "any.required": "New password is required",
  }),
});

/**
 * Admin force change password validation schema (first login)
 */
export const forceChangePasswordSchema = Joi.object({
  newPassword: Joi.string().min(8).required().messages({
    "string.min": "New password must be at least 8 characters",
    "string.empty": "New password is required",
    "any.required": "New password is required",
  }),
});

/**
 * Admin request password reset validation schema
 */
export const requestPasswordResetSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    "string.email": "Please provide a valid email address",
    "string.empty": "Email is required",
    "any.required": "Email is required",
  }),
});

/**
 * Admin reset password validation schema
 */
export const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    "string.empty": "Reset token is required",
    "any.required": "Reset token is required",
  }),
  newPassword: Joi.string().min(8).required().messages({
    "string.min": "New password must be at least 8 characters",
    "string.empty": "New password is required",
    "any.required": "New password is required",
  }),
});

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
      const errorMessages = error.details.map((detail) => detail.message).join(", ");
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

export default {
  loginSchema,
  changePasswordSchema,
  forceChangePasswordSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  validate,
};
