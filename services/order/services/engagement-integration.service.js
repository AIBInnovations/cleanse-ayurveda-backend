import { createHttpClient, handleServiceError, TimeoutConfig } from "./http-client.service.js";

const engagementClient = createHttpClient(
  process.env.ENGAGEMENT_SERVICE_URL || "http://localhost:3008",
  parseInt(process.env.ENGAGEMENT_SERVICE_TIMEOUT) || TimeoutConfig.STANDARD,
  "engagement"
);

// Engagement graceful degradation - when true, logs notifications instead of calling service
const ENGAGEMENT_GRACEFUL_DEGRADATION = process.env.ENGAGEMENT_GRACEFUL_DEGRADATION === "true" || true; // Default to true until engagement service is ready

/**
 * Helper to gracefully handle engagement service calls
 * If graceful degradation is enabled, logs the notification and returns success
 * @param {string} notificationType - Type of notification
 * @param {Object} data - Notification data
 * @param {Function} serviceCall - Actual service call function
 * @returns {Promise<Object>} Result
 */
const withGracefulDegradation = async (notificationType, data, serviceCall) => {
  if (ENGAGEMENT_GRACEFUL_DEGRADATION) {
    console.log(`> [Engagement Degraded] ${notificationType}:`, JSON.stringify(data, null, 2));
    return {
      success: true,
      degraded: true,
      message: "Notification logged (engagement service unavailable)"
    };
  }
  return await serviceCall();
};

/**
 * Send order confirmation email
 * @param {Object} orderData - Order details
 * @returns {Promise<Object>} Email send result
 */
export const sendOrderConfirmationEmail = async (orderData) => {
  return withGracefulDegradation("OrderConfirmation", orderData, async () => {
    try {
      const response = await engagementClient.post("/api/notifications/order-confirmation", {
        orderData
      });
      return { success: true, data: response.data };
    } catch (error) {
      return handleServiceError(error, "Engagement");
    }
  });
};

/**
 * Send order shipped notification
 * @param {Object} orderData - Order details with tracking
 * @returns {Promise<Object>} Notification result
 */
export const sendOrderShippedNotification = async (orderData) => {
  try {
    const response = await engagementClient.post("/api/notifications/order-shipped", {
      orderData
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Engagement");
  }
};

/**
 * Send order delivered notification
 * @param {Object} orderData - Order details
 * @returns {Promise<Object>} Notification result
 */
export const sendOrderDeliveredNotification = async (orderData) => {
  try {
    const response = await engagementClient.post("/api/notifications/order-delivered", {
      orderData
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Engagement");
  }
};

/**
 * Send order cancelled notification
 * @param {Object} orderData - Order details with cancellation reason
 * @returns {Promise<Object>} Notification result
 */
export const sendOrderCancelledNotification = async (orderData) => {
  try {
    const response = await engagementClient.post("/api/notifications/order-cancelled", {
      orderData
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Engagement");
  }
};

/**
 * Send payment success notification
 * @param {Object} paymentData - Payment details
 * @returns {Promise<Object>} Notification result
 */
export const sendPaymentSuccessNotification = async (paymentData) => {
  return withGracefulDegradation("PaymentSuccess", paymentData, async () => {
    try {
      const response = await engagementClient.post("/api/notifications/payment-success", {
        paymentData
      });
      return { success: true, data: response.data };
    } catch (error) {
      return handleServiceError(error, "Engagement");
    }
  });
};

/**
 * Send payment failed notification
 * @param {Object} paymentData - Payment details
 * @returns {Promise<Object>} Notification result
 */
export const sendPaymentFailedNotification = async (paymentData) => {
  try {
    const response = await engagementClient.post("/api/notifications/payment-failed", {
      paymentData
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Engagement");
  }
};

/**
 * Send refund initiated notification
 * @param {Object} refundData - Refund details
 * @returns {Promise<Object>} Notification result
 */
export const sendRefundInitiatedNotification = async (refundData) => {
  try {
    const response = await engagementClient.post("/api/notifications/refund-initiated", {
      refundData
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Engagement");
  }
};

/**
 * Send refund completed notification
 * @param {Object} refundData - Refund details
 * @returns {Promise<Object>} Notification result
 */
export const sendRefundCompletedNotification = async (refundData) => {
  try {
    const response = await engagementClient.post("/api/notifications/refund-completed", {
      refundData
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Engagement");
  }
};

/**
 * Send return approved notification
 * @param {Object} returnData - Return details
 * @returns {Promise<Object>} Notification result
 */
export const sendReturnApprovedNotification = async (returnData) => {
  try {
    const response = await engagementClient.post("/api/notifications/return-approved", {
      returnData
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Engagement");
  }
};

/**
 * Send return rejected notification
 * @param {Object} returnData - Return details with rejection reason
 * @returns {Promise<Object>} Notification result
 */
export const sendReturnRejectedNotification = async (returnData) => {
  try {
    const response = await engagementClient.post("/api/notifications/return-rejected", {
      returnData
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Engagement");
  }
};

/**
 * Send abandoned cart reminder
 * @param {Object} cartData - Cart details
 * @returns {Promise<Object>} Notification result
 */
export const sendAbandonedCartReminder = async (cartData) => {
  try {
    const response = await engagementClient.post("/api/notifications/abandoned-cart", {
      cartData
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Engagement");
  }
};

/**
 * Send invoice email with PDF
 * @param {Object} invoiceData - Invoice details with PDF URL
 * @returns {Promise<Object>} Email result
 */
export const sendInvoiceEmail = async (invoiceData) => {
  try {
    const response = await engagementClient.post("/api/notifications/invoice", {
      invoiceData
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Engagement");
  }
};

/**
 * Track customer event
 * @param {string} userId - User ID
 * @param {string} eventName - Event name
 * @param {Object} eventData - Event data
 * @returns {Promise<Object>} Tracking result
 */
export const trackCustomerEvent = async (userId, eventName, eventData) => {
  try {
    const response = await engagementClient.post("/api/events/track", {
      userId,
      eventName,
      eventData
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Engagement");
  }
};

/**
 * Get customer notification preferences
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Notification preferences
 */
export const getNotificationPreferences = async (userId) => {
  try {
    const response = await engagementClient.get(`/api/preferences/${userId}`);
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Engagement");
  }
};

/**
 * Send order cancellation email (simplified)
 * @param {string} userId - User ID
 * @param {string} orderNumber - Order number
 * @returns {Promise<Object>} Email result
 */
export const sendOrderCancellationEmail = async (userId, orderNumber) => {
  return sendOrderCancelledNotification({ userId, orderNumber });
};

/**
 * Send order delivered email (simplified)
 * @param {string} userId - User ID
 * @param {string} orderNumber - Order number
 * @returns {Promise<Object>} Email result
 */
export const sendOrderDeliveredEmail = async (userId, orderNumber) => {
  return sendOrderDeliveredNotification({ userId, orderNumber });
};

/**
 * Send order shipped email (simplified)
 * @param {string} userId - User ID
 * @param {string} orderNumber - Order number
 * @param {string} trackingNumber - Tracking number
 * @returns {Promise<Object>} Email result
 */
export const sendOrderShippedEmail = async (userId, orderNumber, trackingNumber) => {
  return sendOrderShippedNotification({ userId, orderNumber, trackingNumber });
};

/**
 * Generic send email function for background jobs
 * @param {Object} emailData - Email data { to, subject, template, context, attachments }
 * @returns {Promise<Object>} Email result
 */
export const sendEmail = async (emailData) => {
  return withGracefulDegradation("GenericEmail", emailData, async () => {
    try {
      const response = await engagementClient.post("/api/emails/send", emailData);
      return { success: true, data: response.data };
    } catch (error) {
      return handleServiceError(error, "Engagement");
    }
  });
};
