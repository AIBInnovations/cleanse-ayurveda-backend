import { sendResponse } from "@shared/utils";
import { Order, OrderItem, Return, Refund } from "../../models/index.js";
import { sendReturnApprovedNotification, sendReturnRejectedNotification } from "../../services/engagement-integration.service.js";

/**
 * Consumer: Request a return
 */
export const requestReturn = async (req, res) => {
  try {
    console.log("> Requesting return");
    const { orderId, items, description, images } = req.body;
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
      return sendResponse(res, 403, "Unauthorized", null, "You are not authorized to request return for this order");
    }

    // Check if order is eligible for return
    if (order.status !== "delivered") {
      console.log("> Order not eligible for return");
      return sendResponse(res, 400, "Order not eligible for return", null, "Only delivered orders can be returned");
    }

    // Check return window
    const returnWindowDays = parseInt(process.env.RETURN_WINDOW_DAYS) || 7;
    const returnWindowMs = returnWindowDays * 24 * 60 * 60 * 1000;
    const orderAge = Date.now() - order.deliveredAt?.getTime();
    if (orderAge > returnWindowMs) {
      console.log("> Return window expired");
      return sendResponse(
        res,
        400,
        "Return window expired",
        null,
        `Return can only be requested within ${returnWindowDays} days of delivery`
      );
    }

    // Get order items
    const orderItems = await OrderItem.find({ orderId });
    const orderItemsMap = new Map(orderItems.map(item => [item._id.toString(), item]));

    // Validate items
    const returnItems = [];
    for (const item of items) {
      const orderItem = orderItemsMap.get(item.orderItemId);
      if (!orderItem) {
        console.log(`> Order item not found: ${item.orderItemId}`);
        return sendResponse(res, 404, "Order item not found", null, `Order item ${item.orderItemId} not found`);
      }

      // Check if quantity is valid
      const returnableQuantity = orderItem.quantity - (orderItem.quantityReturned || 0);
      if (item.quantity > returnableQuantity) {
        console.log(`> Invalid return quantity for item: ${item.orderItemId}`);
        return sendResponse(
          res,
          400,
          "Invalid return quantity",
          null,
          `Only ${returnableQuantity} units available for return`
        );
      }

      returnItems.push({
        orderItemId: item.orderItemId,
        productId: orderItem.productId,
        variantId: orderItem.variantId,
        quantity: item.quantity,
        reason: item.reason
      });
    }

    // Create return with embedded items
    const returnRequest = await Return.create({
      orderId,
      userId,
      orderNumber: order.orderNumber,
      status: "pending",
      reason: items[0]?.reason || "other", // Use first item's reason or default
      items: returnItems,
      customerNotes: description,
      requestedBy: userId,
      pickupAddress: order.shippingAddress
    });

    console.log("> Return requested successfully");
    return sendResponse(res, 201, "Return requested successfully", { return: returnRequest }, null);
  } catch (error) {
    console.log("> Error requesting return:", error);
    return sendResponse(res, 500, "Failed to request return", null, error.message);
  }
};

/**
 * Consumer: Get my returns
 */
export const getMyReturns = async (req, res) => {
  try {
    console.log("> Getting my returns");
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

    // Get returns with embedded items
    const skip = (page - 1) * limit;
    const [returns, total] = await Promise.all([
      Return.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("orderId", "orderNumber status deliveredAt")
        .lean(),
      Return.countDocuments(filter)
    ]);

    console.log(`> Found ${returns.length} returns`);
    return sendResponse(
      res,
      200,
      "Returns retrieved successfully",
      {
        returns,
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
    console.log("> Error getting returns:", error);
    return sendResponse(res, 500, "Failed to retrieve returns", null, error.message);
  }
};

/**
 * Consumer: Get return by ID
 */
export const getReturnById = async (req, res) => {
  try {
    console.log("> Getting return by ID");
    const { returnId } = req.params;
    const userId = req.user._id.toString();

    const returnRequest = await Return.findById(returnId)
      .populate("orderId", "orderNumber status deliveredAt")
      .lean();

    if (!returnRequest) {
      console.log("> Return not found");
      return sendResponse(res, 404, "Return not found", null, "Return not found");
    }

    // Verify ownership
    if (returnRequest.userId.toString() !== userId) {
      console.log("> Unauthorized access to return");
      return sendResponse(res, 403, "Unauthorized", null, "You are not authorized to view this return");
    }

    // Items are already embedded in the return document
    console.log("> Return retrieved successfully");
    return sendResponse(res, 200, "Return retrieved successfully", { return: returnRequest }, null);
  } catch (error) {
    console.log("> Error getting return:", error);
    return sendResponse(res, 500, "Failed to retrieve return", null, error.message);
  }
};

/**
 * Consumer: Cancel return request
 */
export const cancelReturn = async (req, res) => {
  try {
    console.log("> Cancelling return");
    const { returnId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id.toString();

    const returnRequest = await Return.findById(returnId);
    if (!returnRequest) {
      console.log("> Return not found");
      return sendResponse(res, 404, "Return not found", null, "Return not found");
    }

    // Verify ownership
    if (returnRequest.userId.toString() !== userId) {
      console.log("> Unauthorized access to return");
      return sendResponse(res, 403, "Unauthorized", null, "You are not authorized to cancel this return");
    }

    // Check if return can be cancelled
    if (!["pending", "approved", "pickup_scheduled"].includes(returnRequest.status)) {
      console.log("> Return cannot be cancelled");
      return sendResponse(res, 400, "Return cannot be cancelled", null, "Return cannot be cancelled at this stage");
    }

    // Update return
    returnRequest.status = "cancelled";
    returnRequest.cancelReason = reason || "Cancelled by customer";
    returnRequest.cancelledAt = new Date();
    await returnRequest.save();

    console.log("> Return cancelled successfully");
    return sendResponse(res, 200, "Return cancelled successfully", { return: returnRequest }, null);
  } catch (error) {
    console.log("> Error cancelling return:", error);
    return sendResponse(res, 500, "Failed to cancel return", null, error.message);
  }
};

/**
 * Admin: Get all returns
 */
export const getAllReturns = async (req, res) => {
  try {
    console.log("> Getting all returns");
    const {
      page = 1,
      limit = 20,
      status,
      userId,
      orderId,
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
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Get returns
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [returns, total] = await Promise.all([
      Return.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate("orderId", "orderNumber status deliveredAt")
        .populate("userId", "name email phone")
        .lean(),
      Return.countDocuments(filter)
    ]);

    // Items are already embedded in the return documents
    console.log(`> Found ${returns.length} returns`);
    return sendResponse(
      res,
      200,
      "Returns retrieved successfully",
      {
        returns,
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
    console.log("> Error getting returns:", error);
    return sendResponse(res, 500, "Failed to retrieve returns", null, error.message);
  }
};

/**
 * Admin: Get return by ID
 */
export const getReturnByIdAdmin = async (req, res) => {
  try {
    console.log("> Getting return by ID (admin)");
    const { returnId } = req.params;

    const returnRequest = await Return.findById(returnId)
      .populate("orderId", "orderNumber status deliveredAt paymentStatus")
      .populate("userId", "name email phone")
      .lean();

    if (!returnRequest) {
      console.log("> Return not found");
      return sendResponse(res, 404, "Return not found", null, "Return not found");
    }

    // Items are already embedded in the return document
    console.log("> Return retrieved successfully");
    return sendResponse(res, 200, "Return retrieved successfully", { return: returnRequest }, null);
  } catch (error) {
    console.log("> Error getting return:", error);
    return sendResponse(res, 500, "Failed to retrieve return", null, error.message);
  }
};

/**
 * Admin: Approve return
 */
export const approveReturn = async (req, res) => {
  try {
    console.log("> Approving return");
    const { returnId } = req.params;
    const { notes } = req.body;

    const returnRequest = await Return.findById(returnId);
    if (!returnRequest) {
      console.log("> Return not found");
      return sendResponse(res, 404, "Return not found", null, "Return not found");
    }

    // Check if return can be approved
    if (returnRequest.status !== "pending") {
      console.log("> Return cannot be approved");
      return sendResponse(res, 400, "Return cannot be approved", null, "Only pending returns can be approved");
    }

    // Update return
    returnRequest.status = "approved";
    returnRequest.approvedBy = req.user._id.toString();
    returnRequest.approvedAt = new Date();
    returnRequest.adminNotes = notes || "";
    await returnRequest.save();

    // Send notification
    sendReturnApprovedNotification({
      userId: returnRequest.userId.toString(),
      orderNumber: returnRequest.orderNumber,
      returnId: returnRequest._id.toString()
    }).catch(err => console.log("> Failed to send return approved notification:", err.message));

    console.log("> Return approved successfully");
    return sendResponse(res, 200, "Return approved successfully", { return: returnRequest }, null);
  } catch (error) {
    console.log("> Error approving return:", error);
    return sendResponse(res, 500, "Failed to approve return", null, error.message);
  }
};

/**
 * Admin: Reject return
 */
export const rejectReturn = async (req, res) => {
  try {
    console.log("> Rejecting return");
    const { returnId } = req.params;
    const { reason, notes } = req.body;

    const returnRequest = await Return.findById(returnId);
    if (!returnRequest) {
      console.log("> Return not found");
      return sendResponse(res, 404, "Return not found", null, "Return not found");
    }

    // Check if return can be rejected
    if (returnRequest.status !== "pending") {
      console.log("> Return cannot be rejected");
      return sendResponse(res, 400, "Return cannot be rejected", null, "Only pending returns can be rejected");
    }

    // Update return
    returnRequest.status = "rejected";
    returnRequest.rejectionReason = reason;
    returnRequest.adminNotes = notes || "";
    returnRequest.rejectedBy = req.user._id.toString();
    returnRequest.rejectedAt = new Date();
    await returnRequest.save();

    // Send notification
    sendReturnRejectedNotification({
      userId: returnRequest.userId.toString(),
      orderNumber: returnRequest.orderNumber,
      reason: reason
    }).catch(err => console.log("> Failed to send return rejected notification:", err.message));

    console.log("> Return rejected successfully");
    return sendResponse(res, 200, "Return rejected successfully", { return: returnRequest }, null);
  } catch (error) {
    console.log("> Error rejecting return:", error);
    return sendResponse(res, 500, "Failed to reject return", null, error.message);
  }
};

/**
 * Admin: Schedule pickup
 */
export const schedulePickup = async (req, res) => {
  try {
    console.log("> Scheduling pickup");
    const { returnId } = req.params;
    const { pickupDate, pickupTimeSlot, courierPartner, trackingNumber, notes } = req.body;

    const returnRequest = await Return.findById(returnId);
    if (!returnRequest) {
      console.log("> Return not found");
      return sendResponse(res, 404, "Return not found", null, "Return not found");
    }

    // Check if return can have pickup scheduled
    if (returnRequest.status !== "approved") {
      console.log("> Pickup cannot be scheduled");
      return sendResponse(res, 400, "Pickup cannot be scheduled", null, "Pickup can only be scheduled for approved returns");
    }

    // Update return
    returnRequest.status = "pickup_scheduled";
    returnRequest.pickupDate = new Date(pickupDate);
    returnRequest.pickupTimeSlot = pickupTimeSlot;
    returnRequest.courierPartner = courierPartner || null;
    returnRequest.trackingNumber = trackingNumber || null;
    returnRequest.adminNotes = notes ? `${returnRequest.adminNotes || ""}\n${notes}` : returnRequest.adminNotes;
    await returnRequest.save();

    console.log("> Pickup scheduled successfully");
    return sendResponse(res, 200, "Pickup scheduled successfully", { return: returnRequest }, null);
  } catch (error) {
    console.log("> Error scheduling pickup:", error);
    return sendResponse(res, 500, "Failed to schedule pickup", null, error.message);
  }
};

/**
 * Admin: Confirm pickup
 */
export const confirmPickup = async (req, res) => {
  try {
    console.log("> Confirming pickup");
    const { returnId } = req.params;
    const { pickupConfirmedAt, notes } = req.body;

    const returnRequest = await Return.findById(returnId);
    if (!returnRequest) {
      console.log("> Return not found");
      return sendResponse(res, 404, "Return not found", null, "Return not found");
    }

    // Check if pickup can be confirmed
    if (returnRequest.status !== "pickup_scheduled") {
      console.log("> Pickup cannot be confirmed");
      return sendResponse(res, 400, "Pickup cannot be confirmed", null, "Only scheduled pickups can be confirmed");
    }

    // Update return
    returnRequest.status = "picked_up";
    returnRequest.pickupConfirmedAt = pickupConfirmedAt ? new Date(pickupConfirmedAt) : new Date();
    returnRequest.adminNotes = notes ? `${returnRequest.adminNotes || ""}\n${notes}` : returnRequest.adminNotes;
    await returnRequest.save();

    console.log("> Pickup confirmed successfully");
    return sendResponse(res, 200, "Pickup confirmed successfully", { return: returnRequest }, null);
  } catch (error) {
    console.log("> Error confirming pickup:", error);
    return sendResponse(res, 500, "Failed to confirm pickup", null, error.message);
  }
};

/**
 * Admin: Inspect return
 */
export const inspectReturn = async (req, res) => {
  try {
    console.log("> Inspecting return");
    const { returnId } = req.params;
    const { inspectionStatus, inspectionNotes, rejectionReason } = req.body;

    const returnRequest = await Return.findById(returnId);
    if (!returnRequest) {
      console.log("> Return not found");
      return sendResponse(res, 404, "Return not found", null, "Return not found");
    }

    // Check if return can be inspected
    if (returnRequest.status !== "picked_up") {
      console.log("> Return cannot be inspected");
      return sendResponse(res, 400, "Return cannot be inspected", null, "Only picked up returns can be inspected");
    }

    // Update return
    returnRequest.status = inspectionStatus;
    returnRequest.inspectionNotes = inspectionNotes;
    returnRequest.inspectedBy = req.user._id.toString();
    returnRequest.inspectedAt = new Date();

    if (inspectionStatus === "rejected_after_inspection") {
      returnRequest.rejectionReason = rejectionReason;
    } else if (inspectionStatus === "accepted") {
      // Update order items using embedded return items
      for (const returnItem of returnRequest.items) {
        const orderItem = await OrderItem.findById(returnItem.orderItemId);
        if (orderItem) {
          orderItem.quantityReturned = (orderItem.quantityReturned || 0) + returnItem.quantity;
          await orderItem.save();
        }
      }

      // Update order status if all items returned
      const order = await Order.findById(returnRequest.orderId);
      if (order) {
        const orderItems = await OrderItem.find({ orderId: order._id });
        const allReturned = orderItems.every(item => item.quantityReturned >= item.quantity);
        if (allReturned) {
          order.status = "returned";
          await order.save();
        }
      }

      returnRequest.status = "completed";
    }

    await returnRequest.save();

    console.log("> Return inspected successfully");
    return sendResponse(res, 200, "Return inspected successfully", { return: returnRequest }, null);
  } catch (error) {
    console.log("> Error inspecting return:", error);
    return sendResponse(res, 500, "Failed to inspect return", null, error.message);
  }
};

/**
 * Admin: Get return statistics
 */
export const getReturnStats = async (req, res) => {
  try {
    console.log("> Getting return statistics");
    const { startDate, endDate, groupBy = "day" } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Get overall stats
    const [
      totalReturns,
      pendingReturns,
      approvedReturns,
      rejectedReturns,
      completedReturns,
      pickupScheduledReturns,
      pickedUpReturns
    ] = await Promise.all([
      Return.countDocuments(dateFilter),
      Return.countDocuments({ ...dateFilter, status: "pending" }),
      Return.countDocuments({ ...dateFilter, status: "approved" }),
      Return.countDocuments({ ...dateFilter, status: "rejected" }),
      Return.countDocuments({ ...dateFilter, status: "completed" }),
      Return.countDocuments({ ...dateFilter, status: "pickup_scheduled" }),
      Return.countDocuments({ ...dateFilter, status: "picked_up" })
    ]);

    // Get breakdown by status
    const statusBreakdown = await Return.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // Get breakdown by reason from embedded items
    const reasonBreakdown = await Return.aggregate([
      { $match: dateFilter },
      { $unwind: "$items" },
      { $group: { _id: "$items.reason", count: { $sum: 1 } } }
    ]);

    const stats = {
      totalReturns,
      pendingReturns,
      approvedReturns,
      rejectedReturns,
      completedReturns,
      pickupScheduledReturns,
      pickedUpReturns,
      approvalRate: totalReturns > 0 ? (((approvedReturns + completedReturns) / totalReturns) * 100).toFixed(2) : 0,
      completionRate: totalReturns > 0 ? ((completedReturns / totalReturns) * 100).toFixed(2) : 0,
      statusBreakdown,
      reasonBreakdown
    };

    console.log("> Return statistics retrieved successfully");
    return sendResponse(res, 200, "Return statistics retrieved successfully", { stats }, null);
  } catch (error) {
    console.log("> Error getting return stats:", error);
    return sendResponse(res, 500, "Failed to retrieve return statistics", null, error.message);
  }
};
