import Joi from "joi";

/**
 * User registration validation schema
 * Validates Firebase ID token and optional profile fields
 */
export const registerSchema = Joi.object({
  firebaseIdToken: Joi.string().required().messages({
    "string.empty": "Firebase ID token is required",
    "any.required": "Firebase ID token is required",
  }),
  termsAccepted: Joi.boolean().valid(true).required().messages({
    "any.only": "Terms and conditions must be accepted",
    "any.required": "Terms acceptance is required",
  }),
  firstName: Joi.string().trim().max(50).allow(null, "").messages({
    "string.max": "First name must be at most 50 characters",
  }),
  lastName: Joi.string().trim().max(50).allow(null, "").messages({
    "string.max": "Last name must be at most 50 characters",
  }),
  email: Joi.string().email().lowercase().trim().allow(null, "").messages({
    "string.email": "Please provide a valid email address",
  }),
  marketingConsent: Joi.boolean().default(false),
});

/**
 * Login with OTP validation schema
 * Validates Firebase ID token after client-side OTP verification
 */
export const loginWithOTPSchema = Joi.object({
  firebaseIdToken: Joi.string().required().messages({
    "string.empty": "Firebase ID token is required",
    "any.required": "Firebase ID token is required",
  }),
});

/**
 * Login with password validation schema
 * Validates phone/email and password
 */
export const loginWithPasswordSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{9,14}$/)
    .messages({
      "string.pattern.base": "Please provide a valid phone number",
    }),
  email: Joi.string().email().lowercase().trim().messages({
    "string.email": "Please provide a valid email address",
  }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required",
    "any.required": "Password is required",
  }),
})
  .or("phone", "email")
  .messages({
    "object.missing": "Phone or email is required",
  });

/**
 * Logout validation schema
 * Optional refreshToken for specific session logout
 */
export const logoutSchema = Joi.object({
  refreshToken: Joi.string().allow(null, ""),
});

/**
 * Refresh token validation schema
 */
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    "string.empty": "Refresh token is required",
    "any.required": "Refresh token is required",
  }),
});

/**
 * Request password reset validation schema
 */
export const requestPasswordResetSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{9,14}$/)
    .required()
    .messages({
      "string.pattern.base": "Please provide a valid phone number",
      "any.required": "Phone number is required",
    }),
});

/**
 * Reset password validation schema
 */
export const resetPasswordSchema = Joi.object({
  firebaseIdToken: Joi.string().required().messages({
    "string.empty": "Firebase ID token is required",
    "any.required": "Firebase ID token is required",
  }),
  newPassword: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters",
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
  registerSchema,
  loginWithOTPSchema,
  loginWithPasswordSchema,
  logoutSchema,
  refreshTokenSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  validate,
};
