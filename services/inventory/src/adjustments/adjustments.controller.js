import { sendResponse, HTTP_STATUS } from "@shared/utils";
import Inventory from "../../models/inventory.model.js";
import InventoryAdjustment from "../../models/inventoryAdjustment.model.js";

/**
 * POST /api/admin/adjustments/restock
 * Record stock restock
 */
export const recordRestock = async (req, res) => {
  try {
    const { inventoryId, quantity, reason, referenceId } = req.body;

    console.log(`> Recording restock for inventory: ${inventoryId}`);

    const inventory = await Inventory.findById(inventoryId);

    if (!inventory) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Inventory record not found",
        null,
        null
      );
    }

    const qtyBefore = inventory.qtyOnHand;
    const qtyAfter = qtyBefore + quantity;

    const adjustment = new InventoryAdjustment({
      inventoryId: inventory._id,
      type: "restock",
      qtyChange: quantity,
      qtyBefore,
      qtyAfter,
      reason,
      referenceType: referenceId ? "order" : "manual",
      referenceId: referenceId || undefined,
      adjustedById: req.user?.id,
    });

    await adjustment.save();

    inventory.qtyOnHand = qtyAfter;
    await inventory.save();

    console.log(`> Restock recorded: +${quantity}`);

    return sendResponse(
      res,
      HTTP_STATUS.CREATED,
      "Restock recorded successfully",
      { adjustment, inventory },
      null
    );
  } catch (error) {
    console.log("> Error recording restock:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to record restock",
      null,
      error.message
    );
  }
};

/**
 * POST /api/admin/adjustments/damage
 * Record damage or loss
 */
export const recordDamage = async (req, res) => {
  try {
    const { inventoryId, quantity, reason } = req.body;

    console.log(`> Recording damage for inventory: ${inventoryId}`);

    const inventory = await Inventory.findById(inventoryId);

    if (!inventory) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Inventory record not found",
        null,
        null
      );
    }

    const qtyBefore = inventory.qtyOnHand;
    const qtyAfter = qtyBefore - quantity;

    if (qtyAfter < 0) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Insufficient quantity to record damage",
        null,
        `Only ${qtyBefore} available`
      );
    }

    const adjustment = new InventoryAdjustment({
      inventoryId: inventory._id,
      type: "damage",
      qtyChange: -quantity,
      qtyBefore,
      qtyAfter,
      reason,
      referenceType: "manual",
      adjustedById: req.user?.id,
    });

    await adjustment.save();

    inventory.qtyOnHand = qtyAfter;
    await inventory.save();

    console.log(`> Damage recorded: -${quantity}`);

    return sendResponse(
      res,
      HTTP_STATUS.CREATED,
      "Damage recorded successfully",
      { adjustment, inventory },
      null
    );
  } catch (error) {
    console.log("> Error recording damage:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to record damage",
      null,
      error.message
    );
  }
};

/**
 * POST /api/admin/adjustments/correction
 * Record stock correction
 */
export const recordCorrection = async (req, res) => {
  try {
    const { inventoryId, qtyChange, reason } = req.body;

    console.log(`> Recording correction for inventory: ${inventoryId}`);

    const inventory = await Inventory.findById(inventoryId);

    if (!inventory) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Inventory record not found",
        null,
        null
      );
    }

    const qtyBefore = inventory.qtyOnHand;
    const qtyAfter = qtyBefore + qtyChange;

    if (qtyAfter < 0) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Resulting quantity cannot be negative",
        null,
        null
      );
    }

    const adjustment = new InventoryAdjustment({
      inventoryId: inventory._id,
      type: "correction",
      qtyChange,
      qtyBefore,
      qtyAfter,
      reason,
      referenceType: "manual",
      adjustedById: req.user?.id,
    });

    await adjustment.save();

    inventory.qtyOnHand = qtyAfter;
    await inventory.save();

    console.log(`> Correction recorded: ${qtyChange > 0 ? "+" : ""}${qtyChange}`);

    return sendResponse(
      res,
      HTTP_STATUS.CREATED,
      "Correction recorded successfully",
      { adjustment, inventory },
      null
    );
  } catch (error) {
    console.log("> Error recording correction:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to record correction",
      null,
      error.message
    );
  }
};

/**
 * GET /api/admin/adjustments
 * List all adjustments with filters
 */
export const getAdjustments = async (req, res) => {
  try {
    console.log("> Fetching adjustments");

    const {
      inventoryId,
      type,
      referenceType,
      adjustedById,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (inventoryId) filter.inventoryId = inventoryId;
    if (type) filter.type = type;
    if (referenceType) filter.referenceType = referenceType;
    if (adjustedById) filter.adjustedById = adjustedById;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const adjustments = await InventoryAdjustment.find(filter)
      .populate({
        path: "inventoryId",
        populate: { path: "warehouseId", select: "name code" },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await InventoryAdjustment.countDocuments(filter);

    console.log(`> Found ${adjustments.length} adjustments`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Adjustments fetched successfully",
      {
        adjustments,
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
    console.log("> Error fetching adjustments:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch adjustments",
      null,
      error.message
    );
  }
};

/**
 * GET /api/admin/adjustments/inventory/:inventoryId
 * Get adjustment history for specific inventory
 */
export const getInventoryAdjustmentHistory = async (req, res) => {
  try {
    const { inventoryId } = req.params;
    const { startDate, endDate } = req.query;

    console.log(`> Fetching adjustment history for: ${inventoryId}`);

    const inventory = await Inventory.findById(inventoryId);

    if (!inventory) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Inventory record not found",
        null,
        null
      );
    }

    const filter = { inventoryId };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const adjustments = await InventoryAdjustment.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    console.log(`> Found ${adjustments.length} adjustments`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Adjustment history fetched successfully",
      adjustments,
      null
    );
  } catch (error) {
    console.log("> Error fetching adjustment history:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch adjustment history",
      null,
      error.message
    );
  }
};
