import { sendResponse, HTTP_STATUS } from "@shared/utils";
import { Order, OrderItem, OrderStatusHistory, Payment } from "../../models/index.js";
import { ORDER_STATUS, PAYMENT_STATUS, FULFILLMENT_STATUS, STATUS_TYPE, CHANGED_BY_TYPE } from "../../utils/constants.js";
import * as inventoryService from "../../services/inventory-integration.service.js";
import * as engagementService from "../../services/engagement-integration.service.js";

/**
 * Get my orders (consumer)
 * @route GET /api/orders
 * @access Private (Consumer)
 */
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status, paymentStatus, startDate, endDate } = req.query;

    console.log("> Getting orders for user:", userId);

    const query = { userId };

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(query)
    ]);

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await OrderItem.find({ orderId: order._id }).lean();
        return { ...order, items };
      })
    );

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Orders retrieved successfully",
      {
        orders: ordersWithItems,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      },
      null
    );
  } catch (error) {
    console.log("> Error getting orders:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve orders",
      null,
      error.message
    );
  }
};

/**
 * Get order by ID (consumer)
 * @route GET /api/orders/:orderId
 * @access Private (Consumer)
 */
export const getOrderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    console.log("> Getting order:", orderId);

    const order = await Order.findOne({ _id: orderId, userId }).lean();

    if (!order) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Order not found",
        null,
        null
      );
    }

    const items = await OrderItem.find({ orderId: order._id }).lean();
    const history = await OrderStatusHistory.find({ orderId: order._id })
      .sort({ createdAt: -1 })
      .lean();

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Order retrieved successfully",
      { ...order, items, history },
      null
    );
  } catch (error) {
    console.log("> Error getting order:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve order",
      null,
      error.message
    );
  }
};

/**
 * Get order by order number (consumer)
 * @route GET /api/orders/number/:orderNumber
 * @access Private (Consumer)
 */
export const getOrderByNumber = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderNumber } = req.params;

    console.log("> Getting order by number:", orderNumber);

    const order = await Order.findOne({ orderNumber, userId }).lean();

    if (!order) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Order not found",
        null,
        null
      );
    }

    const items = await OrderItem.find({ orderId: order._id }).lean();
    const history = await OrderStatusHistory.find({ orderId: order._id })
      .sort({ createdAt: -1 })
      .lean();

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Order retrieved successfully",
      { ...order, items, history },
      null
    );
  } catch (error) {
    console.log("> Error getting order by number:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve order",
      null,
      error.message
    );
  }
};

/**
 * Cancel order (consumer)
 * @route POST /api/orders/:orderId/cancel
 * @access Private (Consumer)
 */
export const cancelOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { reason } = req.body;

    console.log("> Cancelling order:", orderId);

    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Order not found",
        null,
        null
      );
    }

    const cancellableStatuses = [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED];
    if (!cancellableStatuses.includes(order.status)) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Cannot cancel order in ${order.status} status`,
        null,
        null
      );
    }

    const previousStatus = order.status;
    order.status = ORDER_STATUS.CANCELLED;
    await order.save();

    await OrderStatusHistory.create({
      orderId: order._id,
      statusType: STATUS_TYPE.ORDER,
      oldStatus: previousStatus,
      newStatus: ORDER_STATUS.CANCELLED,
      changedBy: CHANGED_BY_TYPE.CUSTOMER,
      changedByUserId: userId,
      notes: reason || "Order cancelled by customer"
    });

    const releaseResult = await inventoryService.releaseInventory(order._id.toString());
    if (!releaseResult.success) {
      console.log("> Failed to release inventory:", releaseResult.error);
    }

    await engagementService.sendOrderCancellationEmail(userId, order.orderNumber);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Order cancelled successfully",
      order,
      null
    );
  } catch (error) {
    console.log("> Error cancelling order:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to cancel order",
      null,
      error.message
    );
  }
};

/**
 * Get all orders / Search orders (admin)
 * @route GET /api/admin/orders
 * @access Private (Admin)
 */
export const getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      query: searchQuery,
      status,
      paymentStatus,
      fulfillmentStatus,
      userId,
      orderNumber,
      email,
      phone,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    console.log("> Getting all orders (admin)", { searchQuery, status, paymentStatus });

    const query = {};

    // Text search on order number, email, phone
    if (searchQuery) {
      const searchRegex = { $regex: searchQuery, $options: "i" };
      query.$or = [
        { orderNumber: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { "guestInfo.email": searchRegex },
        { "guestInfo.phone": searchRegex },
        { "shippingAddressSnapshot.fullName": searchRegex },
        { "shippingAddressSnapshot.phone": searchRegex }
      ];
    }

    // Individual field filters
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (fulfillmentStatus) query.fulfillmentStatus = fulfillmentStatus;
    if (userId) query.userId = userId;
    if (orderNumber) query.orderNumber = { $regex: orderNumber, $options: "i" };
    if (email) query.email = { $regex: email, $options: "i" };
    if (phone) query.phone = { $regex: phone, $options: "i" };

    // Amount range filter
    if (minAmount || maxAmount) {
      query.grandTotal = {};
      if (minAmount) query.grandTotal.$gte = parseFloat(minAmount);
      if (maxAmount) query.grandTotal.$lte = parseFloat(maxAmount);
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(query)
    ]);

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await OrderItem.find({ orderId: order._id }).lean();
        return { ...order, items };
      })
    );

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Orders retrieved successfully",
      {
        orders: ordersWithItems,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        },
        filters: {
          searchQuery,
          status,
          paymentStatus,
          fulfillmentStatus,
          dateRange: startDate || endDate ? { startDate, endDate } : null,
          amountRange: minAmount || maxAmount ? { minAmount, maxAmount } : null
        }
      },
      null
    );
  } catch (error) {
    console.log("> Error getting all orders:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve orders",
      null,
      error.message
    );
  }
};

/**
 * Get order by ID (admin)
 * @route GET /api/admin/orders/:orderId
 * @access Private (Admin)
 */
export const getOrderByIdAdmin = async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log("> Getting order (admin):", orderId);

    const order = await Order.findById(orderId).lean();

    if (!order) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Order not found",
        null,
        null
      );
    }

    const items = await OrderItem.find({ orderId: order._id }).lean();
    const history = await OrderStatusHistory.find({ orderId: order._id })
      .sort({ createdAt: -1 })
      .lean();
    const payments = await Payment.find({ orderId: order._id })
      .sort({ createdAt: -1 })
      .lean();

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Order retrieved successfully",
      { ...order, items, history, payments },
      null
    );
  } catch (error) {
    console.log("> Error getting order:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve order",
      null,
      error.message
    );
  }
};

/**
 * Order status state machine - defines valid transitions
 */
const ORDER_STATUS_TRANSITIONS = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.OUT_FOR_DELIVERY]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.RETURNED],
  [ORDER_STATUS.CANCELLED]: [], // Terminal state
  [ORDER_STATUS.RETURNED]: [ORDER_STATUS.REFUNDED],
  [ORDER_STATUS.REFUNDED]: [] // Terminal state
};

/**
 * Update order status (admin)
 * @route PUT /api/admin/orders/:orderId/status
 * @access Private (Admin)
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes, trackingNumber, carrierName, cancellationReason } = req.body;
    const adminId = req.user.id;

    console.log("> Updating order status:", { orderId, status });

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

    const previousStatus = order.status;

    // Validate status transition using state machine
    const allowedTransitions = ORDER_STATUS_TRANSITIONS[previousStatus] || [];
    if (!allowedTransitions.includes(status)) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Cannot transition from ${previousStatus} to ${status}`,
        { currentStatus: previousStatus, allowedStatuses: allowedTransitions },
        `Invalid status transition. Allowed transitions from ${previousStatus}: ${allowedTransitions.join(", ")}`
      );
    }

    // Handle status-specific logic
    if (status === ORDER_STATUS.CANCELLED) {
      // Require cancellation reason
      if (!cancellationReason && !notes) {
        return sendResponse(
          res,
          HTTP_STATUS.BAD_REQUEST,
          "Cancellation reason is required",
          null,
          null
        );
      }

      // Release inventory reservations
      const releaseResult = await inventoryService.releaseInventory(order._id.toString());
      if (!releaseResult.success) {
        console.log("> Warning: Failed to release inventory:", releaseResult.error);
      }

      // Initiate refund if payment was completed
      if (order.paymentStatus === PAYMENT_STATUS.SUCCESS || order.paymentStatus === PAYMENT_STATUS.CAPTURED) {
        try {
          // Find the payment for this order
          const payment = await Payment.findOne({ orderId: order._id });
          if (payment && payment.gatewayPaymentId) {
            // Import Razorpay dynamically
            const Razorpay = (await import("razorpay")).default;
            const razorpay = new Razorpay({
              key_id: process.env.RAZORPAY_KEY_ID,
              key_secret: process.env.RAZORPAY_KEY_SECRET
            });

            // Initiate full refund
            const refund = await razorpay.payments.refund(payment.gatewayPaymentId, {
              amount: Math.round(payment.amount * 100),
              notes: { reason: cancellationReason || notes, type: "order_cancellation" }
            });

            // Update payment record
            payment.refundedAmount = payment.amount;
            payment.status = "refunded";
            payment.metadata = { ...payment.metadata, refunds: [...(payment.metadata?.refunds || []), refund] };
            await payment.save();

            // Update order payment status
            order.paymentStatus = PAYMENT_STATUS.REFUNDED;

            console.log("> Refund initiated successfully for cancelled order");
          }
        } catch (refundError) {
          console.log("> Warning: Failed to initiate refund:", refundError.message);
          // Continue with cancellation even if refund fails
        }
      }

      // Store cancellation details
      order.cancellationReason = cancellationReason || notes;
      order.cancelledAt = new Date();
    }

    if (status === ORDER_STATUS.SHIPPED) {
      // Require tracking number
      if (!trackingNumber) {
        return sendResponse(
          res,
          HTTP_STATUS.BAD_REQUEST,
          "Tracking number is required for shipped status",
          null,
          null
        );
      }

      order.trackingNumber = trackingNumber;
      order.shippedAt = new Date();

      if (carrierName) {
        order.carrierName = carrierName;
      }

      // Send shipment notification
      await engagementService.sendOrderShippedEmail(order.userId, order.orderNumber, trackingNumber)
        .catch(err => console.log("> Warning: Failed to send shipped notification:", err.message));
    }

    if (status === ORDER_STATUS.OUT_FOR_DELIVERY) {
      order.outForDeliveryAt = new Date();
    }

    if (status === ORDER_STATUS.DELIVERED) {
      order.deliveredAt = new Date();

      // For COD orders, mark payment as completed
      if (order.paymentMethod === "cod" && order.paymentStatus === PAYMENT_STATUS.PENDING) {
        order.paymentStatus = PAYMENT_STATUS.SUCCESS;

        // Create payment status history
        await OrderStatusHistory.create({
          orderId: order._id,
          statusType: STATUS_TYPE.PAYMENT,
          oldStatus: PAYMENT_STATUS.PENDING,
          newStatus: PAYMENT_STATUS.SUCCESS,
          changedBy: CHANGED_BY_TYPE.ADMIN,
          changedByUserId: adminId,
          notes: "COD payment collected on delivery"
        });
      }

      // Send delivery notification
      await engagementService.sendOrderDeliveredEmail(order.userId, order.orderNumber)
        .catch(err => console.log("> Warning: Failed to send delivered notification:", err.message));
    }

    // Update order status
    order.status = status;
    await order.save();

    // Create status history entry
    await OrderStatusHistory.create({
      orderId: order._id,
      statusType: STATUS_TYPE.ORDER,
      oldStatus: previousStatus,
      newStatus: status,
      changedBy: CHANGED_BY_TYPE.ADMIN,
      changedByUserId: adminId,
      notes: notes || cancellationReason || `Order status updated to ${status}`
    });

    console.log("> Order status updated successfully:", { previousStatus, newStatus: status });

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Order status updated successfully",
      order,
      null
    );
  } catch (error) {
    console.log("> Error updating order status:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update order status",
      null,
      error.message
    );
  }
};

/**
 * Update payment status (admin)
 * @route PUT /api/admin/orders/:orderId/payment-status
 * @access Private (Admin)
 */
export const updatePaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus, notes } = req.body;
    const adminId = req.user.id;

    console.log("> Updating payment status:", { orderId, paymentStatus });

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

    const previousStatus = order.paymentStatus;
    order.paymentStatus = paymentStatus;
    await order.save();

    await OrderStatusHistory.create({
      orderId: order._id,
      statusType: STATUS_TYPE.PAYMENT,
      oldStatus: previousStatus,
      newStatus: paymentStatus,
      changedBy: CHANGED_BY_TYPE.ADMIN,
      changedByUserId: adminId,
      notes: notes || `Payment status updated to ${paymentStatus}`
    });

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Payment status updated successfully",
      order,
      null
    );
  } catch (error) {
    console.log("> Error updating payment status:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update payment status",
      null,
      error.message
    );
  }
};

/**
 * Update fulfillment status (admin)
 * @route PUT /api/admin/orders/:orderId/fulfillment-status
 * @access Private (Admin)
 */
export const updateFulfillmentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { fulfillmentStatus, notes } = req.body;
    const adminId = req.user.id;

    console.log("> Updating fulfillment status:", { orderId, fulfillmentStatus });

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

    const previousStatus = order.fulfillmentStatus;
    order.fulfillmentStatus = fulfillmentStatus;
    await order.save();

    await OrderStatusHistory.create({
      orderId: order._id,
      statusType: STATUS_TYPE.FULFILLMENT,
      oldStatus: previousStatus,
      newStatus: fulfillmentStatus,
      changedBy: CHANGED_BY_TYPE.ADMIN,
      changedByUserId: adminId,
      notes: notes || `Fulfillment status updated to ${fulfillmentStatus}`
    });

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Fulfillment status updated successfully",
      order,
      null
    );
  } catch (error) {
    console.log("> Error updating fulfillment status:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update fulfillment status",
      null,
      error.message
    );
  }
};

/**
 * Get order statistics (admin)
 * @route GET /api/admin/orders/stats
 * @access Private (Admin)
 */
export const getOrderStats = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = "day" } = req.query;

    console.log("> Getting order statistics");

    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [
      totalOrders,
      totalRevenue,
      statusCounts,
      paymentStatusCounts
    ] = await Promise.all([
      Order.countDocuments(query),
      Order.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } }
      ]),
      Order.aggregate([
        { $match: query },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: query },
        { $group: { _id: "$paymentStatus", count: { $sum: 1 } } }
      ])
    ]);

    const avgOrderValue = totalOrders > 0 ? (totalRevenue[0]?.total || 0) / totalOrders : 0;

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Order statistics retrieved successfully",
      {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
        statusBreakdown: statusCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        paymentStatusBreakdown: paymentStatusCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      },
      null
    );
  } catch (error) {
    console.log("> Error getting order stats:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve order statistics",
      null,
      error.message
    );
  }
};

/**
 * Add notes to order (admin)
 * @route POST /api/admin/orders/:orderId/notes
 * @access Private (Admin)
 */
export const addOrderNotes = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { notes } = req.body;
    const adminId = req.user.id;

    console.log("> Adding notes to order:", orderId);

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

    order.notes = order.notes ? `${order.notes}\n\n${notes}` : notes;
    await order.save();

    await OrderStatusHistory.create({
      orderId: order._id,
      statusType: STATUS_TYPE.ORDER,
      oldStatus: order.status,
      newStatus: order.status,
      changedBy: CHANGED_BY_TYPE.ADMIN,
      changedByUserId: adminId,
      notes: `Admin added notes: ${notes}`
    });

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Notes added successfully",
      order,
      null
    );
  } catch (error) {
    console.log("> Error adding order notes:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to add notes",
      null,
      error.message
    );
  }
};

/**
 * Bulk update order status (admin)
 * @route PATCH /api/admin/orders/bulk/status
 * @access Private (Admin)
 */
export const bulkUpdateStatus = async (req, res) => {
  try {
    const { orderIds, status, notes } = req.body;
    const adminId = req.user.id;

    console.log("> Bulk updating order status:", { count: orderIds.length, status });

    // Limit to 100 orders per request
    if (orderIds.length > 100) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot update more than 100 orders at once",
        null,
        null
      );
    }

    const results = {
      successful: [],
      failed: [],
      successCount: 0,
      failureCount: 0
    };

    for (const orderId of orderIds) {
      try {
        const order = await Order.findById(orderId);

        if (!order) {
          results.failed.push({
            orderId,
            reason: "Order not found"
          });
          results.failureCount++;
          continue;
        }

        const previousStatus = order.status;

        // Validate status transition
        const allowedTransitions = ORDER_STATUS_TRANSITIONS[previousStatus] || [];
        if (!allowedTransitions.includes(status)) {
          results.failed.push({
            orderId,
            orderNumber: order.orderNumber,
            currentStatus: previousStatus,
            reason: `Invalid transition from ${previousStatus} to ${status}. Allowed: ${allowedTransitions.join(", ")}`
          });
          results.failureCount++;
          continue;
        }

        // Update status
        order.status = status;

        // Handle status-specific logic (simplified for bulk operations)
        if (status === ORDER_STATUS.CANCELLED) {
          await inventoryService.releaseInventory(order._id.toString())
            .catch(err => console.log("> Warning: Failed to release inventory:", err.message));
          order.cancelledAt = new Date();
        } else if (status === ORDER_STATUS.SHIPPED) {
          order.shippedAt = new Date();
        } else if (status === ORDER_STATUS.OUT_FOR_DELIVERY) {
          order.outForDeliveryAt = new Date();
        } else if (status === ORDER_STATUS.DELIVERED) {
          order.deliveredAt = new Date();
          // Mark COD payment as completed
          if (order.paymentMethod === "cod" && order.paymentStatus === PAYMENT_STATUS.PENDING) {
            order.paymentStatus = PAYMENT_STATUS.SUCCESS;
          }
        }

        await order.save();

        // Create status history
        await OrderStatusHistory.create({
          orderId: order._id,
          statusType: STATUS_TYPE.ORDER,
          oldStatus: previousStatus,
          newStatus: status,
          changedBy: CHANGED_BY_TYPE.ADMIN,
          changedByUserId: adminId,
          notes: notes || `Bulk status update to ${status}`
        });

        results.successful.push({
          orderId,
          orderNumber: order.orderNumber,
          previousStatus,
          newStatus: status
        });
        results.successCount++;
      } catch (error) {
        console.log(`> Error updating order ${orderId}:`, error.message);
        results.failed.push({
          orderId,
          reason: error.message
        });
        results.failureCount++;
      }
    }

    console.log("> Bulk update completed:", { successCount: results.successCount, failureCount: results.failureCount });

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      `Bulk update completed. ${results.successCount} succeeded, ${results.failureCount} failed.`,
      results,
      null
    );
  } catch (error) {
    console.log("> Error in bulk update:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to perform bulk update",
      null,
      error.message
    );
  }
};

/**
 * Bulk export orders (admin)
 * @route POST /api/admin/orders/bulk/export
 * @access Private (Admin)
 */
export const bulkExportOrders = async (req, res) => {
  try {
    const {
      format = "csv",
      status,
      paymentStatus,
      startDate,
      endDate,
      minAmount,
      maxAmount
    } = req.body;

    console.log("> Bulk exporting orders:", { format, status, paymentStatus });

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (minAmount || maxAmount) {
      filter.grandTotal = {};
      if (minAmount) filter.grandTotal.$gte = parseFloat(minAmount);
      if (maxAmount) filter.grandTotal.$lte = parseFloat(maxAmount);
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Limit to 5000 orders for safety
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();

    console.log(`> Found ${orders.length} orders to export`);

    if (format === "csv") {
      // Transform to CSV format
      const csvRows = orders.map(order => ({
        "Order Number": order.orderNumber,
        "Order Date": new Date(order.createdAt).toISOString().split("T")[0],
        "Customer Email": order.email || order.guestInfo?.email || "",
        "Customer Phone": order.phone || order.guestInfo?.phone || "",
        "Customer Name": order.shippingAddressSnapshot?.fullName || "",
        "Order Status": order.status,
        "Payment Status": order.paymentStatus,
        "Payment Method": order.paymentMethod || "",
        "Subtotal": order.subtotal,
        "Discount": order.discountTotal,
        "Shipping": order.shippingTotal,
        "Tax": order.taxTotal,
        "Grand Total": order.grandTotal,
        "Shipping City": order.shippingAddressSnapshot?.city || "",
        "Shipping State": order.shippingAddressSnapshot?.state || "",
        "Shipping Pincode": order.shippingAddressSnapshot?.pincode || "",
        "Tracking Number": order.trackingNumber || "",
        "Carrier": order.carrierName || "",
        "Shipped At": order.shippedAt ? new Date(order.shippedAt).toISOString().split("T")[0] : "",
        "Delivered At": order.deliveredAt ? new Date(order.deliveredAt).toISOString().split("T")[0] : ""
      }));

      // Generate CSV content
      const headers = Object.keys(csvRows[0] || {});
      const csvContent = [
        headers.join(","),
        ...csvRows.map(row => headers.map(h => {
          const value = row[h] || "";
          // Escape values that contain commas or quotes
          if (String(value).includes(",") || String(value).includes('"')) {
            return `"${String(value).replace(/"/g, '""')}"`;
          }
          return value;
        }).join(","))
      ].join("\n");

      const filename = `orders-export-${new Date().toISOString().split("T")[0]}.csv`;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(csvContent);
    } else if (format === "json") {
      // Export as JSON
      const filename = `orders-export-${new Date().toISOString().split("T")[0]}.json`;

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.json({
        exportDate: new Date().toISOString(),
        totalOrders: orders.length,
        filters: { status, paymentStatus, startDate, endDate, minAmount, maxAmount },
        orders
      });
    } else {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Invalid export format. Supported formats: csv, json",
        null,
        null
      );
    }
  } catch (error) {
    console.log("> Error exporting orders:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to export orders",
      null,
      error.message
    );
  }
};
