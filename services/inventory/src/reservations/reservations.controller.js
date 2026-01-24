import { sendResponse, HTTP_STATUS } from "@shared/utils";
import Inventory from "../../models/inventory.model.js";
import InventoryReservation from "../../models/inventoryReservation.model.js";
import InventoryAdjustment from "../../models/inventoryAdjustment.model.js";

const CART_TTL_MINUTES = 15;
const CHECKOUT_TTL_MINUTES = 30;

/**
 * POST /api/reservations
 * Create reservation for cart item
 */
export const createReservation = async (req, res) => {
  try {
    const { cartId, variantId, quantity, warehouseId } = req.body;

    console.log(`> Creating reservation for cart: ${cartId}`);

    const filter = { variantId };
    if (warehouseId) {
      filter.warehouseId = warehouseId;
    }

    const inventory = await Inventory.findOne(filter)
      .populate("warehouseId", "isActive")
      .sort({ "warehouseId.priority": 1 });

    if (!inventory) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Inventory not found",
        null,
        null
      );
    }

    if (!inventory.warehouseId.isActive) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Warehouse is not active",
        null,
        null
      );
    }

    const available = inventory.qtyOnHand - inventory.qtyReserved;

    if (available < quantity) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Insufficient quantity available",
        null,
        `Only ${available} available`
      );
    }

    const expiresAt = new Date(Date.now() + CART_TTL_MINUTES * 60 * 1000);

    const reservation = new InventoryReservation({
      inventoryId: inventory._id,
      cartId,
      quantity,
      status: "active",
      expiresAt,
    });

    await reservation.save();

    inventory.qtyReserved += quantity;
    await inventory.save();

    console.log(`> Reservation created: ${reservation._id}`);

    return sendResponse(
      res,
      HTTP_STATUS.CREATED,
      "Reservation created successfully",
      reservation,
      null
    );
  } catch (error) {
    console.log("> Error creating reservation:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create reservation",
      null,
      error.message
    );
  }
};

/**
 * POST /api/reservations/checkout
 * Create or extend reservations for checkout
 */
export const checkoutReservation = async (req, res) => {
  try {
    const { cartId, items } = req.body;

    console.log(`> Creating checkout reservations for cart: ${cartId}`);

    const reservations = [];
    const failures = [];

    for (const item of items) {
      const inventory = await Inventory.findOne({ variantId: item.variantId })
        .populate("warehouseId", "isActive")
        .sort({ "warehouseId.priority": 1 });

      if (!inventory || !inventory.warehouseId.isActive) {
        failures.push({
          variantId: item.variantId,
          reason: "Inventory not available",
        });
        continue;
      }

      const available = inventory.qtyOnHand - inventory.qtyReserved;

      if (available < item.quantity) {
        failures.push({
          variantId: item.variantId,
          reason: `Only ${available} available`,
        });
        continue;
      }

      let reservation = await InventoryReservation.findOne({
        cartId,
        inventoryId: inventory._id,
        status: "active",
      });

      const expiresAt = new Date(
        Date.now() + CHECKOUT_TTL_MINUTES * 60 * 1000
      );

      if (reservation) {
        const qtyDiff = item.quantity - reservation.quantity;

        if (qtyDiff !== 0) {
          inventory.qtyReserved += qtyDiff;
          await inventory.save();
        }

        reservation.quantity = item.quantity;
        reservation.expiresAt = expiresAt;
        await reservation.save();
      } else {
        reservation = new InventoryReservation({
          inventoryId: inventory._id,
          cartId,
          quantity: item.quantity,
          status: "active",
          expiresAt,
        });

        await reservation.save();

        inventory.qtyReserved += item.quantity;
        await inventory.save();
      }

      reservations.push(reservation);
    }

    if (failures.length > 0) {
      for (const reservation of reservations) {
        await releaseReservation(reservation._id);
      }

      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Some items could not be reserved",
        { failures },
        null
      );
    }

    console.log(`> Checkout reservations created: ${reservations.length}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Checkout reservations created successfully",
      { reservations, allReserved: true },
      null
    );
  } catch (error) {
    console.log("> Error creating checkout reservations:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create checkout reservations",
      null,
      error.message
    );
  }
};

/**
 * POST /api/reservations/convert
 * Convert reservations to sale
 */
export const convertReservations = async (req, res) => {
  try {
    const { cartId, orderId } = req.body;

    console.log(`> Converting reservations for cart: ${cartId}`);

    const reservations = await InventoryReservation.find({
      cartId,
      status: "active",
    });

    if (reservations.length === 0) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "No active reservations found",
        null,
        null
      );
    }

    for (const reservation of reservations) {
      reservation.status = "converted";
      reservation.orderId = orderId;
      await reservation.save();

      const inventory = await Inventory.findById(reservation.inventoryId);

      if (inventory) {
        const qtyBefore = inventory.qtyOnHand;

        inventory.qtyReserved -= reservation.quantity;
        inventory.qtyOnHand -= reservation.quantity;

        await inventory.save();

        const adjustment = new InventoryAdjustment({
          inventoryId: inventory._id,
          type: "sale",
          qtyChange: -reservation.quantity,
          qtyBefore,
          qtyAfter: inventory.qtyOnHand,
          reason: `Order placed: ${orderId}`,
          referenceType: "order",
          referenceId: orderId,
        });

        await adjustment.save();
      }
    }

    console.log(`> Converted ${reservations.length} reservations`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Reservations converted successfully",
      reservations,
      null
    );
  } catch (error) {
    console.log("> Error converting reservations:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to convert reservations",
      null,
      error.message
    );
  }
};

/**
 * DELETE /api/reservations/cart/:cartId
 * Release all reservations for a cart
 */
export const releaseCartReservations = async (req, res) => {
  try {
    const { cartId } = req.params;

    console.log(`> Releasing reservations for cart: ${cartId}`);

    const reservations = await InventoryReservation.find({
      cartId,
      status: "active",
    });

    let releasedCount = 0;

    for (const reservation of reservations) {
      await releaseReservation(reservation._id);
      releasedCount++;
    }

    console.log(`> Released ${releasedCount} reservations`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Reservations released successfully",
      { releasedCount },
      null
    );
  } catch (error) {
    console.log("> Error releasing cart reservations:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to release reservations",
      null,
      error.message
    );
  }
};

/**
 * GET /api/admin/reservations
 * List all reservations with filters
 */
export const getReservations = async (req, res) => {
  try {
    console.log("> Fetching reservations");

    const { status, inventoryId, cartId, orderId, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (inventoryId) filter.inventoryId = inventoryId;
    if (cartId) filter.cartId = cartId;
    if (orderId) filter.orderId = orderId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reservations = await InventoryReservation.find(filter)
      .populate({
        path: "inventoryId",
        populate: { path: "warehouseId", select: "name code" },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await InventoryReservation.countDocuments(filter);

    console.log(`> Found ${reservations.length} reservations`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Reservations fetched successfully",
      {
        reservations,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
      null
    );
  } catch (error) {
    console.log("> Error fetching reservations:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch reservations",
      null,
      error.message
    );
  }
};

/**
 * DELETE /api/admin/reservations/:id
 * Manually release a reservation
 */
export const releaseReservationManually = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`> Manually releasing reservation: ${id}`);

    const reservation = await InventoryReservation.findById(id);

    if (!reservation) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Reservation not found",
        null,
        null
      );
    }

    if (reservation.status !== "active") {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Reservation is not active",
        null,
        null
      );
    }

    await releaseReservation(id);

    console.log(`> Reservation released: ${id}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Reservation released successfully",
      reservation,
      null
    );
  } catch (error) {
    console.log("> Error releasing reservation:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to release reservation",
      null,
      error.message
    );
  }
};

async function releaseReservation(reservationId) {
  const reservation = await InventoryReservation.findById(reservationId);

  if (!reservation || reservation.status !== "active") {
    return;
  }

  reservation.status = "released";
  await reservation.save();

  const inventory = await Inventory.findById(reservation.inventoryId);

  if (inventory) {
    inventory.qtyReserved -= reservation.quantity;
    await inventory.save();
  }
}

export const cleanupExpiredReservations = async () => {
  try {
    console.log("> Cleaning up expired reservations");

    const expiredReservations = await InventoryReservation.find({
      status: "active",
      expiresAt: { $lt: new Date() },
    });

    for (const reservation of expiredReservations) {
      reservation.status = "expired";
      await reservation.save();

      const inventory = await Inventory.findById(reservation.inventoryId);

      if (inventory) {
        inventory.qtyReserved -= reservation.quantity;
        await inventory.save();
      }
    }

    console.log(`> Cleaned up ${expiredReservations.length} expired reservations`);
  } catch (error) {
    console.log("> Error cleaning up expired reservations:", error.message);
  }
};
