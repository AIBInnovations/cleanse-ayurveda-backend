import Joi from "joi";

/**
 * Validation schemas for payment operations
 */

/**
 * Verify payment signature validation (consumer)
 */
export const verifyPaymentSignatureSchema = {
  body: Joi.object({
    razorpay_order_id: Joi.string().required().messages({
      "string.empty": "Razorpay order ID is required",
      "any.required": "Razorpay order ID is required"
    }),
    razorpay_payment_id: Joi.string().required().messages({
      "string.empty": "Razorpay payment ID is required",
      "any.required": "Razorpay payment ID is required"
    }),
    razorpay_signature: Joi.string().required().messages({
      "string.empty": "Razorpay signature is required",
      "any.required": "Razorpay signature is required"
    })
  })
};

/**
 * Get payment by ID validation (admin)
 */
export const getPaymentByIdSchema = {
  params: Joi.object({
    paymentId: Joi.string().required().messages({
      "string.empty": "Payment ID is required",
      "any.required": "Payment ID is required"
    })
  })
};

/**
 * Get all payments validation (admin)
 */
export const getAllPaymentsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string()
      .valid("pending", "initiated", "processing", "authorized", "captured", "success", "failed", "cancelled", "refunded", "partially_refunded")
      .optional(),
    paymentMethod: Joi.string()
      .valid("credit_card", "debit_card", "upi", "net_banking", "wallet", "cod", "emi")
      .optional(),
    orderId: Joi.string().optional(),
    userId: Joi.string().optional(),
    minAmount: Joi.number().min(0).optional(),
    maxAmount: Joi.number().min(0).optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    sortBy: Joi.string().valid("createdAt", "amount", "status").default("createdAt"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc")
  })
};

/**
 * Retry payment validation (admin)
 */
export const retryPaymentSchema = {
  params: Joi.object({
    paymentId: Joi.string().required().messages({
      "string.empty": "Payment ID is required",
      "any.required": "Payment ID is required"
    })
  })
};

/**
 * Capture payment validation (admin)
 */
export const capturePaymentSchema = {
  params: Joi.object({
    paymentId: Joi.string().required().messages({
      "string.empty": "Payment ID is required",
      "any.required": "Payment ID is required"
    })
  }),
  body: Joi.object({
    amount: Joi.number().min(0).optional(),
    notes: Joi.string().trim().max(500).allow("", null).optional()
  })
};

/**
 * Refund payment validation (admin)
 */
export const refundPaymentSchema = {
  params: Joi.object({
    paymentId: Joi.string().required().messages({
      "string.empty": "Payment ID is required",
      "any.required": "Payment ID is required"
    })
  }),
  body: Joi.object({
    amount: Joi.number().min(0).required().messages({
      "number.base": "Refund amount must be a number",
      "number.min": "Refund amount must be greater than 0",
      "any.required": "Refund amount is required"
    }),
    reason: Joi.string().trim().min(10).max(500).required().messages({
      "string.empty": "Refund reason is required",
      "string.min": "Reason must be at least 10 characters",
      "string.max": "Reason cannot exceed 500 characters",
      "any.required": "Refund reason is required"
    }),
    notes: Joi.string().trim().max(500).allow("", null).optional()
  })
};

/**
 * Get payment stats validation (admin)
 */
export const getPaymentStatsSchema = {
  query: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    groupBy: Joi.string().valid("day", "week", "month", "year").default("day")
  })
};

/**
 * Handle delayed payment validation (admin)
 */
export const handleDelayedPaymentSchema = {
  body: Joi.object({
    razorpayOrderId: Joi.string().required().messages({
      "string.empty": "Razorpay order ID is required",
      "any.required": "Razorpay order ID is required"
    }),
    razorpayPaymentId: Joi.string().required().messages({
      "string.empty": "Razorpay payment ID is required",
      "any.required": "Razorpay payment ID is required"
    })
  })
};
