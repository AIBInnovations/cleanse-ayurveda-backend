import Joi from "joi";

/**
 * Validation schemas for invoice operations
 */

/**
 * Generate invoice validation (admin)
 */
export const generateInvoiceSchema = {
  params: Joi.object({
    orderId: Joi.string().required().messages({
      "string.empty": "Order ID is required",
      "any.required": "Order ID is required"
    })
  }),
  body: Joi.object({
    includeShippingCharges: Joi.boolean().default(true),
    includeDiscounts: Joi.boolean().default(true),
    notes: Joi.string().trim().max(500).allow("", null).optional()
  })
};

/**
 * Get invoice by ID validation (consumer)
 */
export const getInvoiceByIdSchema = {
  params: Joi.object({
    invoiceId: Joi.string().required().messages({
      "string.empty": "Invoice ID is required",
      "any.required": "Invoice ID is required"
    })
  })
};

/**
 * Get invoice by order ID validation (consumer)
 */
export const getInvoiceByOrderIdSchema = {
  params: Joi.object({
    orderId: Joi.string().required().messages({
      "string.empty": "Order ID is required",
      "any.required": "Order ID is required"
    })
  })
};

/**
 * Download invoice PDF validation (consumer)
 */
export const downloadInvoicePdfSchema = {
  params: Joi.object({
    invoiceId: Joi.string().required().messages({
      "string.empty": "Invoice ID is required",
      "any.required": "Invoice ID is required"
    })
  })
};

/**
 * Get my invoices validation (consumer)
 */
export const getMyInvoicesSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    sortBy: Joi.string().valid("createdAt", "invoiceNumber").default("createdAt"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc")
  })
};

/**
 * Get all invoices validation (admin)
 */
export const getAllInvoicesSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    userId: Joi.string().optional(),
    orderId: Joi.string().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    sortBy: Joi.string().valid("createdAt", "invoiceNumber").default("createdAt"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc")
  })
};

/**
 * Get invoice by ID validation (admin)
 */
export const getInvoiceByIdAdminSchema = {
  params: Joi.object({
    invoiceId: Joi.string().required().messages({
      "string.empty": "Invoice ID is required",
      "any.required": "Invoice ID is required"
    })
  })
};

/**
 * Send invoice email validation (admin)
 */
export const sendInvoiceEmailSchema = {
  params: Joi.object({
    invoiceId: Joi.string().required().messages({
      "string.empty": "Invoice ID is required",
      "any.required": "Invoice ID is required"
    })
  }),
  body: Joi.object({
    recipientEmail: Joi.string().email().optional().messages({
      "string.email": "Valid email address is required"
    }),
    subject: Joi.string().trim().max(200).optional(),
    message: Joi.string().trim().max(1000).allow("", null).optional()
  })
};

/**
 * Regenerate invoice validation (admin)
 */
export const regenerateInvoiceSchema = {
  params: Joi.object({
    invoiceId: Joi.string().required().messages({
      "string.empty": "Invoice ID is required",
      "any.required": "Invoice ID is required"
    })
  }),
  body: Joi.object({
    reason: Joi.string().trim().min(10).max(500).required().messages({
      "string.empty": "Reason for regeneration is required",
      "string.min": "Reason must be at least 10 characters",
      "string.max": "Reason cannot exceed 500 characters",
      "any.required": "Reason for regeneration is required"
    }),
    notes: Joi.string().trim().max(500).allow("", null).optional()
  })
};

/**
 * Get invoice stats validation (admin)
 */
export const getInvoiceStatsSchema = {
  query: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    groupBy: Joi.string().valid("day", "week", "month", "year").default("day")
  })
};
