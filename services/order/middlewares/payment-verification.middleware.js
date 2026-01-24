import crypto from "crypto";
import { sendResponse, HTTP_STATUS } from "@shared/utils";

/**
 * Middleware to verify Razorpay webhook signature
 * Ensures webhook requests are authentic
 */
export const verifyRazorpaySignature = (req, res, next) => {
  try {
    console.log("> Verifying Razorpay webhook signature");

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.log("> Razorpay webhook secret not configured");
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Webhook secret not configured",
        null,
        null
      );
    }

    const signature = req.headers["x-razorpay-signature"];

    if (!signature) {
      console.log("> Webhook signature missing");
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Webhook signature missing",
        null,
        null
      );
    }

    const body = JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.log("> Webhook signature verification failed");
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid webhook signature",
        null,
        null
      );
    }

    console.log("> Webhook signature verified successfully");
    next();
  } catch (error) {
    console.log("> Error verifying webhook signature:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to verify webhook signature",
      null,
      error.message
    );
  }
};

/**
 * Middleware to verify Razorpay payment signature
 * Used when verifying payment on frontend callback
 */
export const verifyRazorpayPaymentSignature = (req, res, next) => {
  try {
    console.log("> Verifying Razorpay payment signature");

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Missing payment verification parameters",
        null,
        null
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      console.log("> Razorpay key secret not configured");
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Payment gateway not configured",
        null,
        null
      );
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");

    if (razorpay_signature !== expectedSignature) {
      console.log("> Payment signature verification failed");
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid payment signature",
        null,
        null
      );
    }

    console.log("> Payment signature verified successfully");

    req.verifiedPayment = {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id
    };

    next();
  } catch (error) {
    console.log("> Error verifying payment signature:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to verify payment signature",
      null,
      error.message
    );
  }
};

/**
 * Middleware to validate payment amount
 * Ensures payment amount matches order amount
 */
export const validatePaymentAmount = async (req, res, next) => {
  try {
    console.log("> Validating payment amount");

    const { amount } = req.body;
    const order = req.order;

    if (!order) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Order not found in request",
        null,
        null
      );
    }

    const expectedAmount = Math.round(order.grandTotal * 100);

    if (amount !== expectedAmount) {
      console.log("> Payment amount mismatch");
      console.log(`> Expected: ${expectedAmount}, Received: ${amount}`);
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Payment amount mismatch",
        null,
        `Expected ${expectedAmount} paise, received ${amount} paise`
      );
    }

    next();
  } catch (error) {
    console.log("> Error validating payment amount:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to validate payment amount",
      null,
      error.message
    );
  }
};

/**
 * Middleware to check if payment is already processed
 * Prevents duplicate payment processing
 */
export const checkDuplicatePayment = async (req, res, next) => {
  try {
    console.log("> Checking for duplicate payment");

    const { Payment } = await import("../models/index.js");
    const { razorpay_payment_id } = req.body;

    if (!razorpay_payment_id) {
      return next();
    }

    const existingPayment = await Payment.findOne({
      gatewayPaymentId: razorpay_payment_id
    });

    if (existingPayment) {
      console.log("> Duplicate payment detected");
      return sendResponse(
        res,
        HTTP_STATUS.CONFLICT,
        "Payment already processed",
        { paymentId: existingPayment._id },
        null
      );
    }

    next();
  } catch (error) {
    console.log("> Error checking duplicate payment:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to check payment status",
      null,
      error.message
    );
  }
};
