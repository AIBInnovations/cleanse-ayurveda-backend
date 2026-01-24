import { sendResponse } from "@shared/utils";
import { Order, OrderItem, Refund, Payment, OrderStatusHistory } from "../../models/index.js";
import { sendRefundInitiatedNotification, sendRefundCompletedNotification } from "../../services/engagement-integration.service.js";

/**
 * Consumer: Request a refund
 */
export const requestRefund = async (req, res) => {
  try {
    console.log("> Requesting refund");
    const { orderId, items, description, refundMethod, bankDetails } = req.body;
    const userId = req.user._id.toString();

    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      console.log("> Order not found");
      return sendResponse(res, 404, "Order not found", null, "Order not found");
    }

    // Verify ownership
    if (order.userId.toString() !== userId) {
      console.log("> Unauthorized access to order");
      return sendResponse(res, 403, "Unauthorized", null, "You are not authorized to request refund for this order");
    }

    // Check if order is eligible for refund
    if (!["delivered", "cancelled"].includes(order.status)) {
      console.log("> Order not eligible for refund");
      return sendResponse(res, 400, "Order not eligible for refund", null, "Only delivered or cancelled orders can be refunded");
    }

    // Check if payment is successful
    if (!["success", "captured"].includes(order.paymentStatus)) {
      console.log("> Payment not successful");
      return sendResponse(res, 400, "Payment not successful", null, "Order payment must be successful to request refund");
    }

    // Check refund window
    const refundWindowDays = parseInt(process.env.REFUND_WINDOW_DAYS) || 7;
    const refundWindowMs = refundWindowDays * 24 * 60 * 60 * 1000;
    const orderAge = Date.now() - order.deliveredAt?.getTime();
    if (order.status === "delivered" && orderAge > refundWindowMs) {
      console.log("> Refund window expired");
      return sendResponse(
        res,
        400,
        "Refund window expired",
        null,
        `Refund can only be requested within ${refundWindowDays} days of delivery`
      );
    }

    // Get order items
    const orderItems = await OrderItem.find({ orderId });
    const orderItemsMap = new Map(orderItems.map(item => [item._id.toString(), item]));

    // Validate items and calculate refund amount
    let refundAmount = 0;
    const refundItems = [];

    for (const item of items) {
      const orderItem = orderItemsMap.get(item.orderItemId);
      if (!orderItem) {
        console.log(`> Order item not found: ${item.orderItemId}`);
        return sendResponse(res, 404, "Order item not found", null, `Order item ${item.orderItemId} not found`);
      }

      // Check if quantity is valid
      const refundableQuantity = orderItem.quantity - (orderItem.quantityRefunded || 0);
      if (item.quantity > refundableQuantity) {
        console.log(`> Invalid refund quantity for item: ${item.orderItemId}`);
        return sendResponse(
          res,
          400,
          "Invalid refund quantity",
          null,
          `Only ${refundableQuantity} units available for refund`
        );
      }

      // Calculate refund amount for this item
      const itemRefundAmount = (orderItem.unitPrice - orderItem.lineDiscount / orderItem.quantity) * item.quantity;
      refundAmount += itemRefundAmount;

      refundItems.push({
        orderItemId: item.orderItemId,
        productId: orderItem.productId,
        variantId: orderItem.variantId,
        quantity: item.quantity,
        unitPrice: orderItem.unitPrice,
        refundAmount: itemRefundAmount,
        reason: item.reason
      });
    }

    // Create refund
    const refund = await Refund.create({
      orderId,
      userId,
      orderNumber: order.orderNumber,
      refundAmount,
      approvedAmount: null,
      status: "pending",
      refundMethod: refundMethod || "original_payment_method",
      bankDetails: refundMethod === "bank_transfer" ? bankDetails : null,
      description,
      requestedBy: userId
    });

    // Items are embedded in the refund document, no separate insertion needed

    // Send notification
    sendRefundInitiatedNotification({
      userId,
      orderNumber: order.orderNumber,
      refundAmount,
      refundId: refund._id.toString()
    }).catch(err => console.log("> Failed to send refund initiated notification:", err.message));

    console.log("> Refund requested successfully");
    return sendResponse(res, 201, "Refund requested successfully", { refund }, null);
  } catch (error) {
    console.log("> Error requesting refund:", error);
    return sendResponse(res, 500, "Failed to request refund", null, error.message);
  }
};

/**
 * Consumer: Get my refunds
 */
export const getMyRefunds = async (req, res) => {
  try {
    console.log("> Getting my refunds");
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    const userId = req.user._id.toString();

    // Build filter
    const filter = { userId };
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Get refunds
    const skip = (page - 1) * limit;
    const [refunds, total] = await Promise.all([
      Refund.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("orderId", "orderNumber status")
        .lean(),
      Refund.countDocuments(filter)
    ]);

    // Items are already embedded in the refund documents

    console.log(`> Found ${refunds.length} refunds`);
    return sendResponse(
      res,
      200,
      "Refunds retrieved successfully",
      {
        refunds: refunds,
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
    console.log("> Error getting refunds:", error);
    return sendResponse(res, 500, "Failed to retrieve refunds", null, error.message);
  }
};

/**
 * Consumer: Get refund by ID
 */
export const getRefundById = async (req, res) => {
  try {
    console.log("> Getting refund by ID");
    const { refundId } = req.params;
    const userId = req.user._id.toString();

    const refund = await Refund.findById(refundId)
      .populate("orderId", "orderNumber status deliveredAt")
      .lean();

    if (!refund) {
      console.log("> Refund not found");
      return sendResponse(res, 404, "Refund not found", null, "Refund not found");
    }

    // Verify ownership
    if (refund.userId.toString() !== userId) {
      console.log("> Unauthorized access to refund");
      return sendResponse(res, 403, "Unauthorized", null, "You are not authorized to view this refund");
    }

    // Items are embedded in the refund document
    console.log("> Refund retrieved successfully");
    return sendResponse(res, 200, "Refund retrieved successfully", { refund }, null);
  } catch (error) {
    console.log("> Error getting refund:", error);
    return sendResponse(res, 500, "Failed to retrieve refund", null, error.message);
  }
};

/**
 * Consumer: Cancel refund request
 */
export const cancelRefund = async (req, res) => {
  try {
    console.log("> Cancelling refund");
    const { refundId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id.toString();

    const refund = await Refund.findById(refundId);
    if (!refund) {
      console.log("> Refund not found");
      return sendResponse(res, 404, "Refund not found", null, "Refund not found");
    }

    // Verify ownership
    if (refund.userId.toString() !== userId) {
      console.log("> Unauthorized access to refund");
      return sendResponse(res, 403, "Unauthorized", null, "You are not authorized to cancel this refund");
    }

    // Check if refund can be cancelled
    if (!["pending", "approved"].includes(refund.status)) {
      console.log("> Refund cannot be cancelled");
      return sendResponse(res, 400, "Refund cannot be cancelled", null, "Only pending or approved refunds can be cancelled");
    }

    // Update refund
    refund.status = "cancelled";
    refund.cancelReason = reason || "Cancelled by customer";
    refund.cancelledAt = new Date();
    await refund.save();

    console.log("> Refund cancelled successfully");
    return sendResponse(res, 200, "Refund cancelled successfully", { refund }, null);
  } catch (error) {
    console.log("> Error cancelling refund:", error);
    return sendResponse(res, 500, "Failed to cancel refund", null, error.message);
  }
};

/**
 * Admin: Get all refunds
 */
export const getAllRefunds = async (req, res) => {
  try {
    console.log("> Getting all refunds");
    const {
      page = 1,
      limit = 20,
      status,
      userId,
      orderId,
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
    if (userId) filter.userId = userId;
    if (orderId) filter.orderId = orderId;
    if (minAmount || maxAmount) {
      filter.refundAmount = {};
      if (minAmount) filter.refundAmount.$gte = parseFloat(minAmount);
      if (maxAmount) filter.refundAmount.$lte = parseFloat(maxAmount);
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Get refunds
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [refunds, total] = await Promise.all([
      Refund.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate("orderId", "orderNumber status deliveredAt")
        .populate("userId", "name email phone")
        .lean(),
      Refund.countDocuments(filter)
    ]);

    // Items are already embedded in the refund documents

    console.log(`> Found ${refunds.length} refunds`);
    return sendResponse(
      res,
      200,
      "Refunds retrieved successfully",
      {
        refunds: refunds,
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
    console.log("> Error getting refunds:", error);
    return sendResponse(res, 500, "Failed to retrieve refunds", null, error.message);
  }
};

/**
 * Admin: Get refund by ID
 */
export const getRefundByIdAdmin = async (req, res) => {
  try {
    console.log("> Getting refund by ID (admin)");
    const { refundId } = req.params;

    const refund = await Refund.findById(refundId)
      .populate("orderId", "orderNumber status deliveredAt paymentStatus")
      .populate("userId", "name email phone")
      .lean();

    if (!refund) {
      console.log("> Refund not found");
      return sendResponse(res, 404, "Refund not found", null, "Refund not found");
    }

    // Items are embedded in the refund document
    console.log("> Refund retrieved successfully");
    return sendResponse(res, 200, "Refund retrieved successfully", { refund }, null);
  } catch (error) {
    console.log("> Error getting refund:", error);
    return sendResponse(res, 500, "Failed to retrieve refund", null, error.message);
  }
};

/**
 * Admin: Approve refund
 */
export const approveRefund = async (req, res) => {
  try {
    console.log("> Approving refund");
    const { refundId } = req.params;
    const { approvedAmount, notes } = req.body;

    const refund = await Refund.findById(refundId);
    if (!refund) {
      console.log("> Refund not found");
      return sendResponse(res, 404, "Refund not found", null, "Refund not found");
    }

    // Check if refund can be approved
    if (refund.status !== "pending") {
      console.log("> Refund cannot be approved");
      return sendResponse(res, 400, "Refund cannot be approved", null, "Only pending refunds can be approved");
    }

    // Update refund
    refund.status = "approved";
    refund.approvedAmount = approvedAmount || refund.refundAmount;
    refund.approvedBy = req.user._id.toString();
    refund.approvedAt = new Date();
    refund.adminNotes = notes || "";
    await refund.save();

    console.log("> Refund approved successfully");
    return sendResponse(res, 200, "Refund approved successfully", { refund }, null);
  } catch (error) {
    console.log("> Error approving refund:", error);
    return sendResponse(res, 500, "Failed to approve refund", null, error.message);
  }
};

/**
 * Admin: Reject refund
 */
export const rejectRefund = async (req, res) => {
  try {
    console.log("> Rejecting refund");
    const { refundId } = req.params;
    const { reason, notes } = req.body;

    const refund = await Refund.findById(refundId);
    if (!refund) {
      console.log("> Refund not found");
      return sendResponse(res, 404, "Refund not found", null, "Refund not found");
    }

    // Check if refund can be rejected
    if (refund.status !== "pending") {
      console.log("> Refund cannot be rejected");
      return sendResponse(res, 400, "Refund cannot be rejected", null, "Only pending refunds can be rejected");
    }

    // Update refund
    refund.status = "rejected";
    refund.rejectionReason = reason;
    refund.adminNotes = notes || "";
    refund.rejectedBy = req.user._id.toString();
    refund.rejectedAt = new Date();
    await refund.save();

    console.log("> Refund rejected successfully");
    return sendResponse(res, 200, "Refund rejected successfully", { refund }, null);
  } catch (error) {
    console.log("> Error rejecting refund:", error);
    return sendResponse(res, 500, "Failed to reject refund", null, error.message);
  }
};

/**
 * Admin: Process refund
 */
export const processRefund = async (req, res) => {
  try {
    console.log("> Processing refund");
    const { refundId } = req.params;
    const { transactionId, notes } = req.body;

    const refund = await Refund.findById(refundId).populate("orderId");
    if (!refund) {
      console.log("> Refund not found");
      return sendResponse(res, 404, "Refund not found", null, "Refund not found");
    }

    // Check if refund can be processed
    if (refund.status !== "approved") {
      console.log("> Refund cannot be processed");
      return sendResponse(res, 400, "Refund cannot be processed", null, "Only approved refunds can be processed");
    }

    // Get payment for this order
    const payment = await Payment.findOne({ orderId: refund.orderId._id, status: { $in: ["success", "captured"] } });
    if (!payment) {
      console.log("> No successful payment found for order");
      return sendResponse(res, 404, "Payment not found", null, "No successful payment found for this order");
    }

    // Process refund based on refund method
    let refundResult;
    if (refund.refundMethod === "original_payment_method" && payment.gatewayPaymentId) {
      // Process via Razorpay
      const Razorpay = (await import("razorpay")).default;
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });

      refundResult = await razorpay.payments.refund(payment.gatewayPaymentId, {
        amount: Math.round(refund.approvedAmount * 100),
        notes: { refundId: refund._id.toString(), reason: refund.description }
      });

      // Update payment
      payment.refundedAmount = (payment.refundedAmount || 0) + refund.approvedAmount;
      if (payment.refundedAmount >= payment.amount) {
        payment.status = "refunded";
      } else {
        payment.status = "partially_refunded";
      }
      await payment.save();

      // Update order payment status
      const order = await Order.findById(refund.orderId._id);
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
          changedById: req.user._id.toString(),
          notes: `Refund processed. Amount: ₹${refund.approvedAmount}. Refund ID: ${refund._id}`
        });
      }
    }

    // Update refund
    refund.status = "completed";
    refund.processedBy = req.user._id.toString();
    refund.processedAt = new Date();
    refund.transactionId = transactionId || refundResult?.id;
    refund.gatewayResponse = refundResult || null;
    refund.adminNotes = notes ? `${refund.adminNotes || ""}\n${notes}` : refund.adminNotes;
    await refund.save();

    // Update order items using embedded refund items
    const refundItems = refund.items || [];
    for (const refundItem of refundItems) {
      const orderItem = await OrderItem.findById(refundItem.orderItemId);
      if (orderItem) {
        orderItem.quantityRefunded = (orderItem.quantityRefunded || 0) + refundItem.quantity;
        await orderItem.save();
      }
    }

    // Send notification
    sendRefundCompletedNotification({
      userId: refund.userId.toString(),
      orderNumber: refund.orderNumber,
      refundAmount: refund.approvedAmount,
      refundMethod: refund.refundMethod
    }).catch(err => console.log("> Failed to send refund completed notification:", err.message));

    console.log("> Refund processed successfully");
    return sendResponse(res, 200, "Refund processed successfully", { refund }, null);
  } catch (error) {
    console.log("> Error processing refund:", error);
    return sendResponse(res, 500, "Failed to process refund", null, error.message);
  }
};

/**
 * Admin: Get refund statistics
 */
export const getRefundStats = async (req, res) => {
  try {
    console.log("> Getting refund statistics");
    const { startDate, endDate, groupBy = "day" } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Get overall stats
    const [totalRefunds, pendingRefunds, approvedRefunds, rejectedRefunds, completedRefunds, totalAmount, completedAmount] = await Promise.all([
      Refund.countDocuments(dateFilter),
      Refund.countDocuments({ ...dateFilter, status: "pending" }),
      Refund.countDocuments({ ...dateFilter, status: "approved" }),
      Refund.countDocuments({ ...dateFilter, status: "rejected" }),
      Refund.countDocuments({ ...dateFilter, status: "completed" }),
      Refund.aggregate([{ $match: dateFilter }, { $group: { _id: null, total: { $sum: "$refundAmount" } } }]),
      Refund.aggregate([{ $match: { ...dateFilter, status: "completed" } }, { $group: { _id: null, total: { $sum: "$approvedAmount" } } }])
    ]);

    // Get breakdown by status
    const statusBreakdown = await Refund.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$refundAmount" } } }
    ]);

    // Get breakdown by refund method
    const methodBreakdown = await Refund.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$refundMethod", count: { $sum: 1 }, amount: { $sum: "$refundAmount" } } }
    ]);

    const stats = {
      totalRefunds,
      pendingRefunds,
      approvedRefunds,
      rejectedRefunds,
      completedRefunds,
      approvalRate: totalRefunds > 0 ? (((approvedRefunds + completedRefunds) / totalRefunds) * 100).toFixed(2) : 0,
      totalAmount: totalAmount[0]?.total || 0,
      completedAmount: completedAmount[0]?.total || 0,
      averageAmount: totalRefunds > 0 ? ((totalAmount[0]?.total || 0) / totalRefunds).toFixed(2) : 0,
      statusBreakdown,
      methodBreakdown
    };

    console.log("> Refund statistics retrieved successfully");
    return sendResponse(res, 200, "Refund statistics retrieved successfully", { stats }, null);
  } catch (error) {
    console.log("> Error getting refund stats:", error);
    return sendResponse(res, 500, "Failed to retrieve refund statistics", null, error.message);
  }
};
