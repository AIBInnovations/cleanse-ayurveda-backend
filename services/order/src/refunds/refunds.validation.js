import Joi from "joi";

/**
 * Validation schemas for refund operations
 */

/**
 * Request refund validation (consumer)
 */
export const requestRefundSchema = {
  body: Joi.object({
    orderId: Joi.string().required().messages({
      "string.empty": "Order ID is required",
      "any.required": "Order ID is required"
    }),
    items: Joi.array()
      .items(
        Joi.object({
          orderItemId: Joi.string().required().messages({
            "string.empty": "Order item ID is required",
            "any.required": "Order item ID is required"
          }),
          quantity: Joi.number().integer().min(1).required().messages({
            "number.base": "Quantity must be a number",
            "number.integer": "Quantity must be an integer",
            "number.min": "Quantity must be at least 1",
            "any.required": "Quantity is required"
          }),
          reason: Joi.string()
            .valid(
              "damaged",
              "defective",
              "wrong_item",
              "not_as_described",
              "quality_issue",
              "size_issue",
              "changed_mind",
              "other"
            )
            .required()
            .messages({
              "string.empty": "Reason is required",
              "any.only": "Invalid refund reason",
              "any.required": "Reason is required"
            })
        })
      )
      .min(1)
      .required()
      .messages({
        "array.min": "At least one item is required",
        "any.required": "Items are required"
      }),
    description: Joi.string().trim().min(10).max(1000).required().messages({
      "string.empty": "Description is required",
      "string.min": "Description must be at least 10 characters",
      "string.max": "Description cannot exceed 1000 characters",
      "any.required": "Description is required"
    }),
    refundMethod: Joi.string()
      .valid("original_payment_method", "bank_transfer", "store_credit")
      .default("original_payment_method")
      .optional(),
    bankDetails: Joi.object({
      accountNumber: Joi.string().trim().required(),
      ifscCode: Joi.string().trim().required(),
      accountHolderName: Joi.string().trim().required(),
      bankName: Joi.string().trim().optional()
    }).when("refundMethod", {
      is: "bank_transfer",
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  })
};

/**
 * Get my refunds validation (consumer)
 */
export const getMyRefundsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string()
      .valid("pending", "approved", "rejected", "processing", "completed", "cancelled")
      .optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional()
  })
};

/**
 * Get refund by ID validation (consumer)
 */
export const getRefundByIdSchema = {
  params: Joi.object({
    refundId: Joi.string().required().messages({
      "string.empty": "Refund ID is required",
      "any.required": "Refund ID is required"
    })
  })
};

/**
 * Cancel refund request validation (consumer)
 */
export const cancelRefundSchema = {
  params: Joi.object({
    refundId: Joi.string().required().messages({
      "string.empty": "Refund ID is required",
      "any.required": "Refund ID is required"
    })
  }),
  body: Joi.object({
    reason: Joi.string().trim().min(10).max(500).optional().messages({
      "string.min": "Reason must be at least 10 characters",
      "string.max": "Reason cannot exceed 500 characters"
    })
  })
};

/**
 * Get all refunds validation (admin)
 */
export const getAllRefundsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string()
      .valid("pending", "approved", "rejected", "processing", "completed", "cancelled")
      .optional(),
    userId: Joi.string().optional(),
    orderId: Joi.string().optional(),
    minAmount: Joi.number().min(0).optional(),
    maxAmount: Joi.number().min(0).optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    sortBy: Joi.string().valid("createdAt", "refundAmount", "status").default("createdAt"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc")
  })
};

/**
 * Get refund by ID validation (admin)
 */
export const getRefundByIdAdminSchema = {
  params: Joi.object({
    refundId: Joi.string().required().messages({
      "string.empty": "Refund ID is required",
      "any.required": "Refund ID is required"
    })
  })
};

/**
 * Approve refund validation (admin)
 */
export const approveRefundSchema = {
  params: Joi.object({
    refundId: Joi.string().required().messages({
      "string.empty": "Refund ID is required",
      "any.required": "Refund ID is required"
    })
  }),
  body: Joi.object({
    approvedAmount: Joi.number().min(0).optional().messages({
      "number.base": "Approved amount must be a number",
      "number.min": "Approved amount must be at least 0"
    }),
    notes: Joi.string().trim().max(1000).allow("", null).optional()
  })
};

/**
 * Reject refund validation (admin)
 */
export const rejectRefundSchema = {
  params: Joi.object({
    refundId: Joi.string().required().messages({
      "string.empty": "Refund ID is required",
      "any.required": "Refund ID is required"
    })
  }),
  body: Joi.object({
    reason: Joi.string().trim().min(10).max(1000).required().messages({
      "string.empty": "Rejection reason is required",
      "string.min": "Reason must be at least 10 characters",
      "string.max": "Reason cannot exceed 1000 characters",
      "any.required": "Rejection reason is required"
    }),
    notes: Joi.string().trim().max(1000).allow("", null).optional()
  })
};

/**
 * Process refund validation (admin)
 */
export const processRefundSchema = {
  params: Joi.object({
    refundId: Joi.string().required().messages({
      "string.empty": "Refund ID is required",
      "any.required": "Refund ID is required"
    })
  }),
  body: Joi.object({
    transactionId: Joi.string().trim().optional(),
    notes: Joi.string().trim().max(1000).allow("", null).optional()
  })
};

/**
 * Get refund stats validation (admin)
 */
export const getRefundStatsSchema = {
  query: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    groupBy: Joi.string().valid("day", "week", "month", "year").default("day")
  })
};
