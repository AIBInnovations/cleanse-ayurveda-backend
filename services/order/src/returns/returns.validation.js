import Joi from "joi";

/**
 * Validation schemas for return operations
 */

/**
 * Request return validation (consumer)
 */
export const requestReturnSchema = {
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
              "color_mismatch",
              "expired",
              "changed_mind",
              "other"
            )
            .required()
            .messages({
              "string.empty": "Reason is required",
              "any.only": "Invalid return reason",
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
    images: Joi.array()
      .items(Joi.string().uri())
      .max(5)
      .optional()
      .messages({
        "array.max": "Maximum 5 images allowed"
      })
  })
};

/**
 * Get my returns validation (consumer)
 */
export const getMyReturnsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string()
      .valid("pending", "approved", "rejected", "pickup_scheduled", "picked_up", "inspecting", "accepted", "rejected_after_inspection", "completed", "cancelled")
      .optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional()
  })
};

/**
 * Get return by ID validation (consumer)
 */
export const getReturnByIdSchema = {
  params: Joi.object({
    returnId: Joi.string().required().messages({
      "string.empty": "Return ID is required",
      "any.required": "Return ID is required"
    })
  })
};

/**
 * Cancel return request validation (consumer)
 */
export const cancelReturnSchema = {
  params: Joi.object({
    returnId: Joi.string().required().messages({
      "string.empty": "Return ID is required",
      "any.required": "Return ID is required"
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
 * Get all returns validation (admin)
 */
export const getAllReturnsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string()
      .valid("pending", "approved", "rejected", "pickup_scheduled", "picked_up", "inspecting", "accepted", "rejected_after_inspection", "completed", "cancelled")
      .optional(),
    userId: Joi.string().optional(),
    orderId: Joi.string().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    sortBy: Joi.string().valid("createdAt", "status").default("createdAt"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc")
  })
};

/**
 * Get return by ID validation (admin)
 */
export const getReturnByIdAdminSchema = {
  params: Joi.object({
    returnId: Joi.string().required().messages({
      "string.empty": "Return ID is required",
      "any.required": "Return ID is required"
    })
  })
};

/**
 * Approve return validation (admin)
 */
export const approveReturnSchema = {
  params: Joi.object({
    returnId: Joi.string().required().messages({
      "string.empty": "Return ID is required",
      "any.required": "Return ID is required"
    })
  }),
  body: Joi.object({
    notes: Joi.string().trim().max(1000).allow("", null).optional()
  })
};

/**
 * Reject return validation (admin)
 */
export const rejectReturnSchema = {
  params: Joi.object({
    returnId: Joi.string().required().messages({
      "string.empty": "Return ID is required",
      "any.required": "Return ID is required"
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
 * Schedule pickup validation (admin)
 */
export const schedulePickupSchema = {
  params: Joi.object({
    returnId: Joi.string().required().messages({
      "string.empty": "Return ID is required",
      "any.required": "Return ID is required"
    })
  }),
  body: Joi.object({
    pickupDate: Joi.date().iso().min("now").required().messages({
      "date.base": "Pickup date must be a valid date",
      "date.min": "Pickup date must be in the future",
      "any.required": "Pickup date is required"
    }),
    pickupTimeSlot: Joi.string()
      .valid("morning", "afternoon", "evening")
      .required()
      .messages({
        "string.empty": "Pickup time slot is required",
        "any.only": "Invalid pickup time slot",
        "any.required": "Pickup time slot is required"
      }),
    courierPartner: Joi.string().trim().max(100).optional(),
    trackingNumber: Joi.string().trim().max(100).optional(),
    notes: Joi.string().trim().max(1000).allow("", null).optional()
  })
};

/**
 * Confirm pickup validation (admin)
 */
export const confirmPickupSchema = {
  params: Joi.object({
    returnId: Joi.string().required().messages({
      "string.empty": "Return ID is required",
      "any.required": "Return ID is required"
    })
  }),
  body: Joi.object({
    pickupConfirmedAt: Joi.date().iso().optional(),
    notes: Joi.string().trim().max(1000).allow("", null).optional()
  })
};

/**
 * Inspect return validation (admin)
 */
export const inspectReturnSchema = {
  params: Joi.object({
    returnId: Joi.string().required().messages({
      "string.empty": "Return ID is required",
      "any.required": "Return ID is required"
    })
  }),
  body: Joi.object({
    inspectionStatus: Joi.string()
      .valid("accepted", "rejected_after_inspection")
      .required()
      .messages({
        "string.empty": "Inspection status is required",
        "any.only": "Invalid inspection status",
        "any.required": "Inspection status is required"
      }),
    inspectionNotes: Joi.string().trim().min(10).max(1000).required().messages({
      "string.empty": "Inspection notes are required",
      "string.min": "Inspection notes must be at least 10 characters",
      "string.max": "Inspection notes cannot exceed 1000 characters",
      "any.required": "Inspection notes are required"
    }),
    rejectionReason: Joi.string()
      .trim()
      .max(1000)
      .when("inspectionStatus", {
        is: "rejected_after_inspection",
        then: Joi.required(),
        otherwise: Joi.optional()
      })
      .messages({
        "string.empty": "Rejection reason is required when rejecting return",
        "any.required": "Rejection reason is required when rejecting return"
      })
  })
};

/**
 * Get return stats validation (admin)
 */
export const getReturnStatsSchema = {
  query: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    groupBy: Joi.string().valid("day", "week", "month", "year").default("day")
  })
};
