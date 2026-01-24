import Joi from "joi";

/**
 * Validation schemas for order operations
 */

/**
 * Get my orders validation (consumer)
 */
export const getMyOrdersSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string()
      .valid("pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled", "returned", "refunded")
      .optional(),
    paymentStatus: Joi.string()
      .valid("pending", "initiated", "processing", "authorized", "captured", "success", "failed", "cancelled", "refunded", "partially_refunded")
      .optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional()
  })
};

/**
 * Get order by ID validation (consumer)
 */
export const getOrderByIdSchema = {
  params: Joi.object({
    orderId: Joi.string().required().messages({
      "string.empty": "Order ID is required",
      "any.required": "Order ID is required"
    })
  })
};

/**
 * Get order by number validation (consumer)
 */
export const getOrderByNumberSchema = {
  params: Joi.object({
    orderNumber: Joi.string().required().messages({
      "string.empty": "Order number is required",
      "any.required": "Order number is required"
    })
  })
};

/**
 * Cancel order validation (consumer)
 */
export const cancelOrderSchema = {
  params: Joi.object({
    orderId: Joi.string().required().messages({
      "string.empty": "Order ID is required",
      "any.required": "Order ID is required"
    })
  }),
  body: Joi.object({
    reason: Joi.string().trim().min(10).max(500).required().messages({
      "string.empty": "Cancellation reason is required",
      "string.min": "Reason must be at least 10 characters",
      "string.max": "Reason cannot exceed 500 characters",
      "any.required": "Cancellation reason is required"
    })
  })
};

/**
 * Get all orders / Search orders validation (admin)
 */
export const getAllOrdersSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    query: Joi.string().trim().min(1).max(200).optional().messages({
      "string.min": "Search query must be at least 1 character",
      "string.max": "Search query cannot exceed 200 characters"
    }),
    status: Joi.string()
      .valid("pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled", "returned", "refunded")
      .optional(),
    paymentStatus: Joi.string()
      .valid("pending", "initiated", "processing", "authorized", "captured", "success", "failed", "cancelled", "refunded", "partially_refunded")
      .optional(),
    fulfillmentStatus: Joi.string()
      .valid("unfulfilled", "partially_fulfilled", "fulfilled")
      .optional(),
    userId: Joi.string().optional(),
    orderNumber: Joi.string().optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().optional(),
    minAmount: Joi.number().min(0).optional(),
    maxAmount: Joi.number().min(0).optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    sortBy: Joi.string().valid("createdAt", "grandTotal", "orderNumber", "status", "paymentStatus").default("createdAt"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc")
  })
};

/**
 * Get order by ID validation (admin)
 */
export const getOrderByIdAdminSchema = {
  params: Joi.object({
    orderId: Joi.string().required().messages({
      "string.empty": "Order ID is required",
      "any.required": "Order ID is required"
    })
  })
};

/**
 * Update order status validation (admin)
 */
export const updateOrderStatusSchema = {
  params: Joi.object({
    orderId: Joi.string().required().messages({
      "string.empty": "Order ID is required",
      "any.required": "Order ID is required"
    })
  }),
  body: Joi.object({
    status: Joi.string()
      .valid("pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled", "returned", "refunded")
      .required()
      .messages({
        "string.empty": "Status is required",
        "any.only": "Invalid order status",
        "any.required": "Status is required"
      }),
    notes: Joi.string().trim().max(500).allow("", null).optional(),
    trackingNumber: Joi.string().trim().max(100).when("status", {
      is: "shipped",
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    carrierName: Joi.string().trim().max(100).optional(),
    cancellationReason: Joi.string().trim().min(10).max(500).when("status", {
      is: "cancelled",
      then: Joi.optional(),
      otherwise: Joi.forbidden()
    }).messages({
      "string.min": "Cancellation reason must be at least 10 characters",
      "string.max": "Cancellation reason cannot exceed 500 characters"
    })
  })
};

/**
 * Update payment status validation (admin)
 */
export const updatePaymentStatusSchema = {
  params: Joi.object({
    orderId: Joi.string().required().messages({
      "string.empty": "Order ID is required",
      "any.required": "Order ID is required"
    })
  }),
  body: Joi.object({
    paymentStatus: Joi.string()
      .valid("pending", "initiated", "processing", "authorized", "captured", "success", "failed", "cancelled")
      .required()
      .messages({
        "string.empty": "Payment status is required",
        "any.only": "Invalid payment status",
        "any.required": "Payment status is required"
      }),
    notes: Joi.string().trim().max(500).allow("", null).optional()
  })
};

/**
 * Update fulfillment status validation (admin)
 */
export const updateFulfillmentStatusSchema = {
  params: Joi.object({
    orderId: Joi.string().required().messages({
      "string.empty": "Order ID is required",
      "any.required": "Order ID is required"
    })
  }),
  body: Joi.object({
    fulfillmentStatus: Joi.string()
      .valid("unfulfilled", "partially_fulfilled", "fulfilled")
      .required()
      .messages({
        "string.empty": "Fulfillment status is required",
        "any.only": "Invalid fulfillment status",
        "any.required": "Fulfillment status is required"
      }),
    notes: Joi.string().trim().max(500).allow("", null).optional()
  })
};

/**
 * Get order stats validation (admin)
 */
export const getOrderStatsSchema = {
  query: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    groupBy: Joi.string().valid("day", "week", "month", "year").default("day")
  })
};

/**
 * Add order notes validation (admin)
 */
export const addOrderNotesSchema = {
  params: Joi.object({
    orderId: Joi.string().required().messages({
      "string.empty": "Order ID is required",
      "any.required": "Order ID is required"
    })
  }),
  body: Joi.object({
    notes: Joi.string().trim().min(5).max(1000).required().messages({
      "string.empty": "Notes are required",
      "string.min": "Notes must be at least 5 characters",
      "string.max": "Notes cannot exceed 1000 characters",
      "any.required": "Notes are required"
    })
  })
};

/**
 * Bulk update status validation (admin)
 */
export const bulkUpdateStatusSchema = {
  body: Joi.object({
    orderIds: Joi.array()
      .items(Joi.string())
      .min(1)
      .max(100)
      .required()
      .messages({
        "array.min": "At least one order ID is required",
        "array.max": "Cannot update more than 100 orders at once",
        "any.required": "Order IDs are required"
      }),
    status: Joi.string()
      .valid("pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled", "returned", "refunded")
      .required()
      .messages({
        "string.empty": "Status is required",
        "any.only": "Invalid order status",
        "any.required": "Status is required"
      }),
    notes: Joi.string().trim().max(500).allow("", null).optional()
  })
};

/**
 * Bulk export orders validation (admin)
 */
export const bulkExportOrdersSchema = {
  body: Joi.object({
    format: Joi.string().valid("csv", "json").default("csv"),
    status: Joi.string()
      .valid("pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled", "returned", "refunded")
      .optional(),
    paymentStatus: Joi.string()
      .valid("pending", "initiated", "processing", "authorized", "captured", "success", "failed", "cancelled", "refunded", "partially_refunded")
      .optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    minAmount: Joi.number().min(0).optional(),
    maxAmount: Joi.number().min(0).optional()
  })
};
