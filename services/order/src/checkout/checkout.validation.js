import Joi from "joi";

/**
 * Validation schemas for checkout operations
 */

/**
 * Address validation schema (reusable)
 */
const addressSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "Full name is required",
    "string.min": "Full name must be at least 2 characters",
    "string.max": "Full name cannot exceed 100 characters",
    "any.required": "Full name is required"
  }),
  phone: Joi.string().trim().pattern(/^[6-9]\d{9}$/).required().messages({
    "string.empty": "Phone number is required",
    "string.pattern.base": "Phone number must be a valid 10-digit Indian mobile number",
    "any.required": "Phone number is required"
  }),
  addressLine1: Joi.string().trim().min(5).max(200).required().messages({
    "string.empty": "Address line 1 is required",
    "string.min": "Address must be at least 5 characters",
    "string.max": "Address cannot exceed 200 characters",
    "any.required": "Address line 1 is required"
  }),
  addressLine2: Joi.string().trim().max(200).allow("", null).optional(),
  city: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "City is required",
    "string.min": "City must be at least 2 characters",
    "string.max": "City cannot exceed 100 characters",
    "any.required": "City is required"
  }),
  state: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "State is required",
    "string.min": "State must be at least 2 characters",
    "string.max": "State cannot exceed 100 characters",
    "any.required": "State is required"
  }),
  pincode: Joi.string().trim().pattern(/^\d{6}$/).required().messages({
    "string.empty": "Pincode is required",
    "string.pattern.base": "Pincode must be a valid 6-digit number",
    "any.required": "Pincode is required"
  }),
  country: Joi.string().trim().default("India").optional(),
  landmark: Joi.string().trim().max(100).allow("", null).optional(),
  addressType: Joi.string().valid("home", "work", "other").default("home").optional()
});

/**
 * Initiate checkout validation
 */
export const initiateCheckoutSchema = {
  body: Joi.object({
    cartId: Joi.string().optional().messages({
      "string.empty": "Cart ID cannot be empty"
    })
  })
};

/**
 * Update shipping address validation
 */
export const updateShippingAddressSchema = {
  params: Joi.object({
    sessionId: Joi.string().required().messages({
      "string.empty": "Session ID is required",
      "any.required": "Session ID is required"
    })
  }),
  body: Joi.object({
    shippingAddress: addressSchema.required().messages({
      "any.required": "Shipping address is required"
    })
  })
};

/**
 * Update billing address validation
 */
export const updateBillingAddressSchema = {
  params: Joi.object({
    sessionId: Joi.string().required().messages({
      "string.empty": "Session ID is required",
      "any.required": "Session ID is required"
    })
  }),
  body: Joi.object({
    billingAddress: addressSchema.required().messages({
      "any.required": "Billing address is required"
    }),
    sameAsShipping: Joi.boolean().default(false).optional()
  })
};

/**
 * Select shipping method validation
 */
export const selectShippingMethodSchema = {
  params: Joi.object({
    sessionId: Joi.string().required().messages({
      "string.empty": "Session ID is required",
      "any.required": "Session ID is required"
    })
  }),
  body: Joi.object({
    shippingMethodId: Joi.string().required().messages({
      "string.empty": "Shipping method ID is required",
      "any.required": "Shipping method ID is required"
    }),
    shippingCost: Joi.number().min(0).required().messages({
      "number.base": "Shipping cost must be a number",
      "number.min": "Shipping cost cannot be negative",
      "any.required": "Shipping cost is required"
    }),
    estimatedDeliveryDays: Joi.number().integer().min(1).max(90).optional()
  })
};

/**
 * Complete checkout validation
 */
export const completeCheckoutSchema = {
  params: Joi.object({
    sessionId: Joi.string().required().messages({
      "string.empty": "Session ID is required",
      "any.required": "Session ID is required"
    })
  }),
  body: Joi.object({
    paymentMethod: Joi.string()
      .valid("credit_card", "debit_card", "upi", "net_banking", "wallet", "cod", "emi")
      .required()
      .messages({
        "string.empty": "Payment method is required",
        "any.only": "Invalid payment method",
        "any.required": "Payment method is required"
      }),
    notes: Joi.string().trim().max(500).allow("", null).optional()
  })
};

/**
 * Get checkout session validation
 */
export const getCheckoutSessionSchema = {
  params: Joi.object({
    sessionId: Joi.string().required().messages({
      "string.empty": "Session ID is required",
      "any.required": "Session ID is required"
    })
  })
};

/**
 * Cancel checkout validation
 */
export const cancelCheckoutSchema = {
  params: Joi.object({
    sessionId: Joi.string().required().messages({
      "string.empty": "Session ID is required",
      "any.required": "Session ID is required"
    })
  })
};

/**
 * Get checkout session by ID validation (admin)
 */
export const getCheckoutByIdSchema = {
  params: Joi.object({
    sessionId: Joi.string().required().messages({
      "string.empty": "Session ID is required",
      "any.required": "Session ID is required"
    })
  })
};

/**
 * Get expired checkout sessions validation (admin)
 */
export const getExpiredCheckoutsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional()
  })
};
