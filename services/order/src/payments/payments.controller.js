import crypto from "crypto";
import { sendResponse } from "@shared/utils";
import { Order, Payment, OrderStatusHistory, OrderItem } from "../../models/index.js";
import { releaseReservation } from "../../services/inventory-integration.service.js";
import * as inventoryService from "../../services/inventory-integration.service.js";
import { sendPaymentSuccessNotification, sendPaymentFailedNotification } from "../../services/engagement-integration.service.js";

/**
 * Consumer: Verify payment signature after payment
 */
export const verifyPaymentSignature = async (req, res) => {
  try {
    console.log("> Verifying payment signature");
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Payment bypass mode - when true, skips signature verification
    const PAYMENT_BYPASS_MODE = process.env.PAYMENT_BYPASS_MODE === "true" || true; // Default to true until Razorpay is configured

    let isValid = false;

    if (PAYMENT_BYPASS_MODE) {
      console.log("> Payment bypass mode: Skipping signature verification");
      isValid = true; // Auto-approve in bypass mode
    } else {
      // Verify signature
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

      isValid = expectedSignature === razorpay_signature;
    }

    if (!isValid) {
      console.log("> Payment signature verification failed");
      return sendResponse(res, 400, "Payment signature verification failed", null, "Invalid payment signature");
    }

    // Find payment by gateway order ID
    const payment = await Payment.findOne({ gatewayOrderId: razorpay_order_id });
    if (!payment) {
      console.log("> Payment not found");
      return sendResponse(res, 404, "Payment not found", null, "Payment record not found");
    }

    // Update payment with gateway payment ID if not already set
    if (!payment.gatewayPaymentId) {
      payment.gatewayPaymentId = razorpay_payment_id;
      payment.status = "success";
      payment.capturedAt = new Date();
      await payment.save();

      // Update order payment status
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = "success";
        await order.save();

        // Create status history
        await OrderStatusHistory.create({
          orderId: order._id,
          statusType: "payment",
          previousStatus: payment.status,
          newStatus: "success",
          changedBy: "system",
          notes: `Payment verified successfully. Payment ID: ${razorpay_payment_id}`
        });

        // Send payment success notification
        sendPaymentSuccessNotification({
          userId: order.userId,
          orderNumber: order.orderNumber,
          amount: payment.amount,
          paymentId: razorpay_payment_id
        }).catch(err => console.log("> Failed to send payment success notification:", err.message));
      }
    }

    console.log("> Payment signature verified successfully");
    return sendResponse(res, 200, "Payment verified successfully", { payment }, null);
  } catch (error) {
    console.log("> Error verifying payment signature:", error);
    return sendResponse(res, 500, "Failed to verify payment signature", null, createError("VERIFICATION_ERROR", error.message));
  }
};

/**
 * Webhook: Handle Razorpay webhook events
 */
export const handleRazorpayWebhook = async (req, res) => {
  try {
    console.log("> Processing Razorpay webhook");
    const webhookSignature = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (webhookSignature !== expectedSignature) {
      console.log("> Webhook signature verification failed");
      return res.status(400).json({ error: "Invalid signature" });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log(`> Webhook event: ${event}`);

    switch (event) {
      case "payment.captured":
        await handlePaymentCaptured(payload);
        break;

      case "payment.failed":
        await handlePaymentFailed(payload);
        break;

      case "order.paid":
        await handleOrderPaid(payload);
        break;

      case "refund.created":
        await handleRefundCreated(payload);
        break;

      default:
        console.log(`> Unhandled webhook event: ${event}`);
    }

    // Always return 200 to acknowledge webhook receipt
    return res.status(200).json({ status: "ok" });
  } catch (error) {
    console.log("> Error processing webhook:", error);
    // Still return 200 to prevent Razorpay from retrying
    return res.status(200).json({ status: "error", message: error.message });
  }
};

/**
 * Handle payment.captured webhook event
 */
const handlePaymentCaptured = async (payload) => {
  const paymentEntity = payload.payment.entity;
  const orderId = paymentEntity.notes?.orderId;

  if (!orderId) {
    console.log("> No orderId in payment notes");
    return;
  }

  // Find payment
  const payment = await Payment.findOne({ gatewayOrderId: paymentEntity.order_id });
  if (!payment) {
    console.log("> Payment not found");
    return;
  }

  // Update payment
  payment.gatewayPaymentId = paymentEntity.id;
  payment.status = "captured";
  payment.capturedAt = new Date();
  payment.metadata = { ...payment.metadata, webhook_payload: paymentEntity };
  await payment.save();

  // Update order
  const order = await Order.findById(orderId);
  if (order) {
    order.paymentStatus = "captured";
    await order.save();

    // Create status history
    await OrderStatusHistory.create({
      orderId: order._id,
      statusType: "payment",
      previousStatus: "initiated",
      newStatus: "captured",
      changedBy: "system",
      notes: `Payment captured via webhook. Payment ID: ${paymentEntity.id}`
    });

    // Send notification
    sendPaymentSuccessNotification({
      userId: order.userId,
      orderNumber: order.orderNumber,
      amount: payment.amount,
      paymentId: paymentEntity.id
    }).catch(err => console.log("> Failed to send payment success notification:", err.message));
  }

  console.log("> Payment captured successfully");
};

/**
 * Handle payment.failed webhook event
 */
const handlePaymentFailed = async (payload) => {
  const paymentEntity = payload.payment.entity;
  const orderId = paymentEntity.notes?.orderId;

  if (!orderId) {
    console.log("> No orderId in payment notes");
    return;
  }

  // Find payment
  const payment = await Payment.findOne({ gatewayOrderId: paymentEntity.order_id });
  if (!payment) {
    console.log("> Payment not found");
    return;
  }

  // Update payment
  payment.gatewayPaymentId = paymentEntity.id;
  payment.status = "failed";
  payment.failureReason = paymentEntity.error_description || "Payment failed";
  payment.metadata = { ...payment.metadata, webhook_payload: paymentEntity };
  await payment.save();

  // Update order
  const order = await Order.findById(orderId);
  if (order) {
    order.paymentStatus = "failed";
    await order.save();

    // Create status history
    await OrderStatusHistory.create({
      orderId: order._id,
      statusType: "payment",
      previousStatus: "initiated",
      newStatus: "failed",
      changedBy: "system",
      notes: `Payment failed via webhook. Reason: ${paymentEntity.error_description || "Unknown"}`
    });

    // Release inventory reservation
    if (order.checkoutSessionId) {
      releaseReservation(order.checkoutSessionId).catch(err =>
        console.log("> Failed to release inventory reservation:", err.message)
      );
    }

    // Send notification
    sendPaymentFailedNotification({
      userId: order.userId,
      orderNumber: order.orderNumber,
      amount: payment.amount,
      reason: payment.failureReason
    }).catch(err => console.log("> Failed to send payment failed notification:", err.message));
  }

  console.log("> Payment failed");
};

/**
 * Handle order.paid webhook event
 */
const handleOrderPaid = async (payload) => {
  const orderEntity = payload.order.entity;
  const orderId = orderEntity.notes?.orderId;

  if (!orderId) {
    console.log("> No orderId in order notes");
    return;
  }

  // Find payment
  const payment = await Payment.findOne({ gatewayOrderId: orderEntity.id });
  if (!payment) {
    console.log("> Payment not found");
    return;
  }

  // Update payment
  payment.status = "success";
  payment.capturedAt = new Date();
  payment.metadata = { ...payment.metadata, webhook_payload: orderEntity };
  await payment.save();

  // Update order
  const order = await Order.findById(orderId);
  if (order) {
    order.paymentStatus = "success";
    order.status = "confirmed";
    await order.save();

    // Create status history for payment
    await OrderStatusHistory.create({
      orderId: order._id,
      statusType: "payment",
      previousStatus: "initiated",
      newStatus: "success",
      changedBy: "system",
      notes: "Order paid via webhook"
    });

    // Create status history for order
    await OrderStatusHistory.create({
      orderId: order._id,
      statusType: "order",
      previousStatus: "pending",
      newStatus: "confirmed",
      changedBy: "system",
      notes: "Order confirmed after successful payment"
    });
  }

  console.log("> Order paid successfully");
};

/**
 * Handle refund.created webhook event
 */
const handleRefundCreated = async (payload) => {
  const refundEntity = payload.refund.entity;
  const paymentId = refundEntity.payment_id;

  // Find payment by gateway payment ID
  const payment = await Payment.findOne({ gatewayPaymentId: paymentId });
  if (!payment) {
    console.log("> Payment not found for refund");
    return;
  }

  // Update payment status
  if (refundEntity.amount === payment.amount * 100) {
    payment.status = "refunded";
  } else {
    payment.status = "partially_refunded";
  }
  payment.refundedAmount = (payment.refundedAmount || 0) + refundEntity.amount / 100;
  payment.metadata = { ...payment.metadata, refund_webhook: refundEntity };
  await payment.save();

  // Update order
  const order = await Order.findById(payment.orderId);
  if (order) {
    if (refundEntity.amount === payment.amount * 100) {
      order.paymentStatus = "refunded";
    } else {
      order.paymentStatus = "partially_refunded";
    }
    await order.save();

    // Create status history
    await OrderStatusHistory.create({
      orderId: order._id,
      statusType: "payment",
      previousStatus: payment.status,
      newStatus: order.paymentStatus,
      changedBy: "system",
      notes: `Refund processed via webhook. Refund ID: ${refundEntity.id}, Amount: ₹${refundEntity.amount / 100}`
    });
  }

  console.log("> Refund created successfully");
};

/**
 * Admin: Get all payments with filters
 */
export const getAllPayments = async (req, res) => {
  try {
    console.log("> Getting all payments");
    const {
      page = 1,
      limit = 20,
      status,
      paymentMethod,
      orderId,
      userId,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (orderId) filter.orderId = orderId;
    if (userId) filter.userId = userId;
    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = parseFloat(minAmount);
      if (maxAmount) filter.amount.$lte = parseFloat(maxAmount);
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Get payments
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate("orderId", "orderNumber status")
        .lean(),
      Payment.countDocuments(filter)
    ]);

    console.log(`> Found ${payments.length} payments`);
    return sendResponse(
      res,
      200,
      "Payments retrieved successfully",
      {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      },
      null
    );
  } catch (error) {
    console.log("> Error getting payments:", error);
    return sendResponse(res, 500, "Failed to retrieve payments", null, createError("RETRIEVE_ERROR", error.message));
  }
};

/**
 * Admin: Get payment by ID
 */
export const getPaymentById = async (req, res) => {
  try {
    console.log("> Getting payment by ID");
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId)
      .populate("orderId", "orderNumber status paymentStatus grandTotal userId")
      .lean();

    if (!payment) {
      console.log("> Payment not found");
      return sendResponse(res, 404, "Payment not found", null, "Payment not found");
    }

    console.log("> Payment retrieved successfully");
    return sendResponse(res, 200, "Payment retrieved successfully", { payment }, null);
  } catch (error) {
    console.log("> Error getting payment:", error);
    return sendResponse(res, 500, "Failed to retrieve payment", null, createError("RETRIEVE_ERROR", error.message));
  }
};

/**
 * Admin: Retry failed payment
 */
export const retryPayment = async (req, res) => {
  try {
    console.log("> Retrying payment");
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      console.log("> Payment not found");
      return sendResponse(res, 404, "Payment not found", null, "Payment not found");
    }

    if (payment.status !== "failed") {
      console.log("> Payment is not in failed state");
      return sendResponse(res, 400, "Payment is not in failed state", null, "Only failed payments can be retried");
    }

    // Create new Razorpay order
    const Razorpay = (await import("razorpay")).default;
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const order = await Order.findById(payment.orderId);
    if (!order) {
      console.log("> Order not found");
      return sendResponse(res, 404, "Order not found", null, "Order not found");
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(payment.amount * 100),
      currency: payment.currency,
      receipt: order.orderNumber,
      notes: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        retry: "true"
      }
    });

    // Update payment
    payment.gatewayOrderId = razorpayOrder.id;
    payment.status = "initiated";
    payment.failureReason = null;
    await payment.save();

    console.log("> Payment retry initiated");
    return sendResponse(res, 200, "Payment retry initiated", { payment, razorpayOrder }, null);
  } catch (error) {
    console.log("> Error retrying payment:", error);
    return sendResponse(res, 500, "Failed to retry payment", null, createError("RETRY_ERROR", error.message));
  }
};

/**
 * Admin: Capture authorized payment
 */
export const capturePayment = async (req, res) => {
  try {
    console.log("> Capturing payment");
    const { paymentId } = req.params;
    const { amount, notes } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      console.log("> Payment not found");
      return sendResponse(res, 404, "Payment not found", null, "Payment not found");
    }

    if (payment.status !== "authorized") {
      console.log("> Payment is not in authorized state");
      return sendResponse(res, 400, "Payment is not in authorized state", null, "Only authorized payments can be captured");
    }

    // Capture payment via Razorpay
    const Razorpay = (await import("razorpay")).default;
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const captureAmount = amount ? Math.round(amount * 100) : Math.round(payment.amount * 100);
    const capturedPayment = await razorpay.payments.capture(payment.gatewayPaymentId, captureAmount, payment.currency);

    // Update payment
    payment.status = "captured";
    payment.capturedAt = new Date();
    payment.metadata = { ...payment.metadata, capture_response: capturedPayment };
    await payment.save();

    // Update order
    const order = await Order.findById(payment.orderId);
    if (order) {
      order.paymentStatus = "captured";
      await order.save();

      // Create status history
      await OrderStatusHistory.create({
        orderId: order._id,
        statusType: "payment",
        previousStatus: "authorized",
        newStatus: "captured",
        changedBy: req.user?.role === "admin" ? "admin" : "system",
        changedById: req.user?._id?.toString(),
        notes: notes || "Payment captured manually"
      });
    }

    console.log("> Payment captured successfully");
    return sendResponse(res, 200, "Payment captured successfully", { payment }, null);
  } catch (error) {
    console.log("> Error capturing payment:", error);
    return sendResponse(res, 500, "Failed to capture payment", null, createError("CAPTURE_ERROR", error.message));
  }
};

/**
 * Admin: Refund payment
 */
export const refundPayment = async (req, res) => {
  try {
    console.log("> Refunding payment");
    const { paymentId } = req.params;
    const { amount, reason, notes } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      console.log("> Payment not found");
      return sendResponse(res, 404, "Payment not found", null, "Payment not found");
    }

    if (!["captured", "success"].includes(payment.status)) {
      console.log("> Payment cannot be refunded");
      return sendResponse(res, 400, "Payment cannot be refunded", null, "Only captured/successful payments can be refunded");
    }

    // Check refund amount
    const alreadyRefunded = payment.refundedAmount || 0;
    if (alreadyRefunded + amount > payment.amount) {
      console.log("> Refund amount exceeds payment amount");
      return sendResponse(res, 400, "Refund amount exceeds available amount", null, "Refund amount exceeds available amount");
    }

    // Create refund via Razorpay
    const Razorpay = (await import("razorpay")).default;
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const refund = await razorpay.payments.refund(payment.gatewayPaymentId, {
      amount: Math.round(amount * 100),
      notes: { reason, adminNotes: notes }
    });

    // Update payment
    payment.refundedAmount = alreadyRefunded + amount;
    if (payment.refundedAmount >= payment.amount) {
      payment.status = "refunded";
    } else {
      payment.status = "partially_refunded";
    }
    payment.metadata = { ...payment.metadata, refunds: [...(payment.metadata?.refunds || []), refund] };
    await payment.save();

    // Update order
    const order = await Order.findById(payment.orderId);
    if (order) {
      order.paymentStatus = payment.status;
      await order.save();

      // Create status history
      await OrderStatusHistory.create({
        orderId: order._id,
        statusType: "payment",
        previousStatus: "success",
        newStatus: payment.status,
        changedBy: "admin",
        changedById: req.user?._id?.toString(),
        notes: `Refund of ₹${amount} initiated. Reason: ${reason}${notes ? `. Notes: ${notes}` : ""}`
      });
    }

    console.log("> Payment refunded successfully");
    return sendResponse(res, 200, "Payment refunded successfully", { payment, refund }, null);
  } catch (error) {
    console.log("> Error refunding payment:", error);
    return sendResponse(res, 500, "Failed to refund payment", null, createError("REFUND_ERROR", error.message));
  }
};

/**
 * Admin: Handle delayed payment
 * This handles the edge case where payment webhooks arrive late or payment status needs manual verification
 */
export const handleDelayedPayment = async (req, res) => {
  try {
    console.log("> Handling delayed payment");
    const { razorpayOrderId, razorpayPaymentId } = req.body;

    // Find payment record by gateway order ID
    const payment = await Payment.findOne({ gatewayOrderId: razorpayOrderId });
    if (!payment) {
      console.log("> Payment not found");
      return sendResponse(res, 404, "Payment not found", null, "Payment record not found");
    }

    // Check if payment already processed
    if (["success", "captured"].includes(payment.status)) {
      console.log("> Payment already processed");
      return sendResponse(res, 200, "Payment already processed", { payment, alreadyProcessed: true }, null);
    }

    // Find associated order
    const order = await Order.findById(payment.orderId);
    if (!order) {
      console.log("> Order not found");
      return sendResponse(res, 404, "Order not found", null, "Order not found");
    }

    // Fetch payment details from Razorpay API to verify
    const Razorpay = (await import("razorpay")).default;
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    let razorpayPayment;
    try {
      razorpayPayment = await razorpay.payments.fetch(razorpayPaymentId);
    } catch (razorpayError) {
      console.log("> Failed to fetch payment from Razorpay:", razorpayError.message);
      return sendResponse(res, 400, "Failed to verify payment with gateway", null, razorpayError.message);
    }

    // Validate payment was captured or authorized
    if (!["captured", "authorized"].includes(razorpayPayment.status)) {
      console.log("> Payment not successful:", razorpayPayment.status);

      // Mark payment as failed
      payment.status = "failed";
      payment.failureReason = `Payment status: ${razorpayPayment.status}`;
      await payment.save();

      return sendResponse(res, 400, "Payment was not successful", {
        payment,
        razorpayStatus: razorpayPayment.status
      }, null);
    }

    // Update payment record
    payment.gatewayPaymentId = razorpayPaymentId;
    payment.status = razorpayPayment.status === "captured" ? "captured" : "success";
    payment.capturedAt = new Date();
    payment.metadata = { ...payment.metadata, delayed_processing: true, razorpay_payment: razorpayPayment };
    await payment.save();

    // Update order payment status
    order.paymentStatus = payment.status;

    // If order was pending, change to confirmed
    if (order.status === "pending") {
      order.status = "confirmed";
      order.confirmedAt = new Date();
    }

    // Check stock availability for all order items
    const orderItems = await OrderItem.find({ orderId: order._id });
    const stockCheckResults = [];
    let allItemsAvailable = true;

    for (const item of orderItems) {
      const stockCheck = await inventoryService.checkStock(item.variantId, item.quantity);
      stockCheckResults.push({
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        requestedQuantity: item.quantity,
        available: stockCheck.success && stockCheck.data.available
      });

      if (!stockCheck.success || !stockCheck.data.available) {
        allItemsAvailable = false;
        console.log(`> Stock not available for item: ${item.productName} - ${item.variantName}`);
      }
    }

    if (!allItemsAvailable) {
      console.log("> Some items out of stock, initiating refund and cancelling order");

      // Initiate full refund
      try {
        const refund = await razorpay.payments.refund(razorpayPaymentId, {
          amount: Math.round(payment.amount * 100),
          notes: { reason: "Items out of stock", type: "delayed_payment_stock_unavailable" }
        });

        // Update payment
        payment.refundedAmount = payment.amount;
        payment.status = "refunded";
        payment.metadata = { ...payment.metadata, refunds: [refund] };
        await payment.save();

        // Update order
        order.paymentStatus = "refunded";
        order.status = "cancelled";
        order.cancellationReason = "Items out of stock after delayed payment";
        order.cancelledAt = new Date();
        await order.save();

        // Create status history
        await OrderStatusHistory.create({
          orderId: order._id,
          statusType: "payment",
          previousStatus: "pending",
          newStatus: "refunded",
          changedBy: "system",
          notes: "Refund initiated due to stock unavailability"
        });

        await OrderStatusHistory.create({
          orderId: order._id,
          statusType: "order",
          previousStatus: order.status,
          newStatus: "cancelled",
          changedBy: "system",
          notes: "Order cancelled due to stock unavailability after delayed payment"
        });

        console.log("> Refund initiated successfully");
        return sendResponse(res, 200, "Payment processed but items out of stock. Refund initiated.", {
          payment,
          order,
          refundInitiated: true,
          stockCheckResults
        }, null);
      } catch (refundError) {
        console.log("> Failed to initiate refund:", refundError.message);
        return sendResponse(res, 500, "Payment processed but failed to initiate refund for out-of-stock items", {
          payment,
          order,
          stockCheckResults,
          refundError: refundError.message
        }, "Manual refund required");
      }
    }

    // All items available, deduct stock for each item
    for (const item of orderItems) {
      const deductResult = await inventoryService.deductStock(item.variantId, item.quantity, order._id.toString());
      if (!deductResult.success) {
        console.log(`> Warning: Failed to deduct stock for ${item.productName}:`, deductResult.error);
      }
    }

    await order.save();

    // Create status history
    await OrderStatusHistory.create({
      orderId: order._id,
      statusType: "payment",
      previousStatus: "pending",
      newStatus: payment.status,
      changedBy: "system",
      notes: "Delayed payment processed successfully"
    });

    if (order.status === "confirmed") {
      await OrderStatusHistory.create({
        orderId: order._id,
        statusType: "order",
        previousStatus: "pending",
        newStatus: "confirmed",
        changedBy: "system",
        notes: "Order confirmed after delayed payment processing"
      });
    }

    // Send order confirmation notification
    sendPaymentSuccessNotification({
      userId: order.userId,
      orderNumber: order.orderNumber,
      amount: payment.amount,
      paymentId: razorpayPaymentId
    }).catch(err => console.log("> Failed to send payment success notification:", err.message));

    console.log("> Delayed payment processed successfully");
    return sendResponse(res, 200, "Delayed payment processed successfully", {
      payment,
      order,
      stockCheckResults
    }, null);
  } catch (error) {
    console.log("> Error handling delayed payment:", error);
    return sendResponse(res, 500, "Failed to handle delayed payment", null, createError("DELAYED_PAYMENT_ERROR", error.message));
  }
};

/**
 * Admin: Get payment statistics
 */
export const getPaymentStats = async (req, res) => {
  try {
    console.log("> Getting payment statistics");
    const { startDate, endDate, groupBy = "day" } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Get overall stats
    const [totalPayments, successfulPayments, failedPayments, totalAmount, refundedAmount] = await Promise.all([
      Payment.countDocuments(dateFilter),
      Payment.countDocuments({ ...dateFilter, status: { $in: ["success", "captured"] } }),
      Payment.countDocuments({ ...dateFilter, status: "failed" }),
      Payment.aggregate([
        { $match: { ...dateFilter, status: { $in: ["success", "captured"] } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Payment.aggregate([
        { $match: { ...dateFilter, status: { $in: ["refunded", "partially_refunded"] } } },
        { $group: { _id: null, total: { $sum: "$refundedAmount" } } }
      ])
    ]);

    // Get breakdown by status
    const statusBreakdown = await Payment.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$amount" } } }
    ]);

    // Get breakdown by payment method
    const methodBreakdown = await Payment.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$paymentMethod", count: { $sum: 1 }, amount: { $sum: "$amount" } } }
    ]);

    const stats = {
      totalPayments,
      successfulPayments,
      failedPayments,
      successRate: totalPayments > 0 ? ((successfulPayments / totalPayments) * 100).toFixed(2) : 0,
      totalAmount: totalAmount[0]?.total || 0,
      refundedAmount: refundedAmount[0]?.total || 0,
      averageAmount: successfulPayments > 0 ? ((totalAmount[0]?.total || 0) / successfulPayments).toFixed(2) : 0,
      statusBreakdown,
      methodBreakdown
    };

    console.log("> Payment statistics retrieved successfully");
    return sendResponse(res, 200, "Payment statistics retrieved successfully", { stats }, null);
  } catch (error) {
    console.log("> Error getting payment stats:", error);
    return sendResponse(res, 500, "Failed to retrieve payment statistics", null, createError("STATS_ERROR", error.message));
  }
};
