import { sendResponse, HTTP_STATUS } from "@shared/utils";
import { Order } from "../models/index.js";

/**
 * Middleware to verify order ownership
 * Ensures user can only access their own orders
 */
export const verifyOrderOwnership = async (req, res, next) => {
  try {
    console.log("> Verifying order ownership");

    const userId = req.user.id;
    const { orderId } = req.params;

    if (!orderId) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Order ID is required",
        null,
        null
      );
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Order not found",
        null,
        null
      );
    }

    if (order.userId !== userId) {
      console.log("> Order ownership verification failed");
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "You do not have access to this order",
        null,
        null
      );
    }

    req.order = order;
    next();
  } catch (error) {
    console.log("> Error verifying order ownership:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to verify order ownership",
      null,
      error.message
    );
  }
};

/**
 * Middleware to verify order ownership by order number
 * Useful for public-facing endpoints
 */
export const verifyOrderOwnershipByNumber = async (req, res, next) => {
  try {
    console.log("> Verifying order ownership by number");

    const userId = req.user.id;
    const { orderNumber } = req.params;

    if (!orderNumber) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Order number is required",
        null,
        null
      );
    }

    const order = await Order.findOne({ orderNumber });

    if (!order) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Order not found",
        null,
        null
      );
    }

    if (order.userId !== userId) {
      console.log("> Order ownership verification failed");
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "You do not have access to this order",
        null,
        null
      );
    }

    req.order = order;
    next();
  } catch (error) {
    console.log("> Error verifying order ownership:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to verify order ownership",
      null,
      error.message
    );
  }
};

/**
 * Middleware to allow order modification only in specific statuses
 * @param {Array} allowedStatuses - Array of allowed order statuses
 */
export const checkOrderModifiable = (allowedStatuses) => {
  return async (req, res, next) => {
    try {
      console.log("> Checking if order is modifiable");

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

      if (!allowedStatuses.includes(order.status)) {
        console.log(`> Order modification not allowed in ${order.status} status`);
        return sendResponse(
          res,
          HTTP_STATUS.FORBIDDEN,
          `Order cannot be modified in ${order.status} status`,
          null,
          null
        );
      }

      next();
    } catch (error) {
      console.log("> Error checking order modifiability:", error.message);
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Failed to verify order status",
        null,
        error.message
      );
    }
  };
};
