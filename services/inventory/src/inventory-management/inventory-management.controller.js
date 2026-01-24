import { sendResponse, HTTP_STATUS } from "@shared/utils";
import Inventory from "../../models/inventory.model.js";
import Warehouse from "../../models/warehouse.model.js";
import InventoryAdjustment from "../../models/inventoryAdjustment.model.js";
import csvParser from "csv-parser";
import { Readable } from "stream";

/**
 * POST /api/admin/inventory
 * Create new inventory record
 */
export const createInventory = async (req, res) => {
  try {
    console.log("> Creating inventory record");

    const inventoryData = req.body;

    const warehouseExists = await Warehouse.findById(
      inventoryData.warehouseId
    );
    if (!warehouseExists) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Warehouse not found",
        null,
        null
      );
    }

    const inventory = new Inventory(inventoryData);
    await inventory.save();

    console.log(`> Inventory created for SKU: ${inventory.sku}`);

    return sendResponse(
      res,
      HTTP_STATUS.CREATED,
      "Inventory record created successfully",
      inventory,
      null
    );
  } catch (error) {
    console.log("> Error creating inventory:", error.message);

    if (error.code === 11000) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "SKU already exists",
        null,
        "Duplicate SKU"
      );
    }

    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create inventory record",
      null,
      error.message
    );
  }
};

/**
 * PUT /api/admin/inventory/:id/quantity
 * Update stock quantity manually
 */
export const updateQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { qtyChange, reason } = req.body;

    console.log(`> Updating quantity for inventory: ${id}`);

    const inventory = await Inventory.findById(id);

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

    console.log(`> Quantity updated: ${qtyBefore} -> ${qtyAfter}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Quantity updated successfully",
      { inventory, adjustment },
      null
    );
  } catch (error) {
    console.log("> Error updating quantity:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update quantity",
      null,
      error.message
    );
  }
};

/**
 * PUT /api/admin/inventory/:id/threshold
 * Set low stock threshold
 */
export const setLowStockThreshold = async (req, res) => {
  try {
    const { id } = req.params;
    const { lowStockThreshold } = req.body;

    console.log(`> Setting low stock threshold for: ${id}`);

    const inventory = await Inventory.findById(id);

    if (!inventory) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Inventory record not found",
        null,
        null
      );
    }

    inventory.lowStockThreshold = lowStockThreshold;
    await inventory.save();

    console.log(`> Low stock threshold set to: ${lowStockThreshold}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Low stock threshold updated successfully",
      inventory,
      null
    );
  } catch (error) {
    console.log("> Error setting threshold:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to set low stock threshold",
      null,
      error.message
    );
  }
};

/**
 * PUT /api/admin/inventory/:id/reorder-point
 * Set reorder point
 */
export const setReorderPoint = async (req, res) => {
  try {
    const { id } = req.params;
    const { reorderPoint } = req.body;

    console.log(`> Setting reorder point for: ${id}`);

    const inventory = await Inventory.findById(id);

    if (!inventory) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Inventory record not found",
        null,
        null
      );
    }

    inventory.reorderPoint = reorderPoint;
    await inventory.save();

    console.log(`> Reorder point set to: ${reorderPoint}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Reorder point updated successfully",
      inventory,
      null
    );
  } catch (error) {
    console.log("> Error setting reorder point:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to set reorder point",
      null,
      error.message
    );
  }
};

/**
 * PATCH /api/admin/inventory/:id/backorder
 * Enable or disable backorder
 */
export const setBackorder = async (req, res) => {
  try {
    const { id } = req.params;
    const { allowBackorder } = req.body;

    console.log(`> Setting backorder for: ${id} to ${allowBackorder}`);

    const inventory = await Inventory.findById(id);

    if (!inventory) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Inventory record not found",
        null,
        null
      );
    }

    inventory.allowBackorder = allowBackorder;
    await inventory.save();

    console.log(`> Backorder set to: ${allowBackorder}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Backorder setting updated successfully",
      inventory,
      null
    );
  } catch (error) {
    console.log("> Error setting backorder:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to set backorder",
      null,
      error.message
    );
  }
};

/**
 * PUT /api/admin/inventory/:id/backorder-limit
 * Set backorder limit
 */
export const setBackorderLimit = async (req, res) => {
  try {
    const { id } = req.params;
    const { backorderLimit } = req.body;

    console.log(`> Setting backorder limit for: ${id}`);

    const inventory = await Inventory.findById(id);

    if (!inventory) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Inventory record not found",
        null,
        null
      );
    }

    inventory.backorderLimit = backorderLimit;
    await inventory.save();

    console.log(`> Backorder limit set to: ${backorderLimit}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Backorder limit updated successfully",
      inventory,
      null
    );
  } catch (error) {
    console.log("> Error setting backorder limit:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to set backorder limit",
      null,
      error.message
    );
  }
};

/**
 * POST /api/admin/inventory/transfer
 * Transfer stock between warehouses
 */
export const transferStock = async (req, res) => {
  try {
    const { fromWarehouseId, toWarehouseId, variantId, quantity, reason } =
      req.body;

    console.log(`> Transferring ${quantity} units from ${fromWarehouseId} to ${toWarehouseId}`);

    const fromWarehouse = await Warehouse.findById(fromWarehouseId);
    const toWarehouse = await Warehouse.findById(toWarehouseId);

    if (!fromWarehouse || !toWarehouse) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Warehouse not found",
        null,
        null
      );
    }

    if (!fromWarehouse.isActive || !toWarehouse.isActive) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Both warehouses must be active",
        null,
        null
      );
    }

    const sourceInventory = await Inventory.findOne({
      variantId,
      warehouseId: fromWarehouseId,
    });

    if (!sourceInventory) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Source inventory not found",
        null,
        null
      );
    }

    const available = sourceInventory.qtyOnHand - sourceInventory.qtyReserved;

    if (available < quantity) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Insufficient available quantity",
        null,
        `Only ${available} available`
      );
    }

    let destInventory = await Inventory.findOne({
      variantId,
      warehouseId: toWarehouseId,
    });

    if (!destInventory) {
      destInventory = new Inventory({
        productId: sourceInventory.productId,
        variantId: sourceInventory.variantId,
        sku: sourceInventory.sku + "-" + toWarehouse.code,
        warehouseId: toWarehouseId,
        qtyOnHand: 0,
        qtyReserved: 0,
        lowStockThreshold: sourceInventory.lowStockThreshold,
        allowBackorder: sourceInventory.allowBackorder,
      });
    }

    const sourceAdjustment = new InventoryAdjustment({
      inventoryId: sourceInventory._id,
      type: "correction",
      qtyChange: -quantity,
      qtyBefore: sourceInventory.qtyOnHand,
      qtyAfter: sourceInventory.qtyOnHand - quantity,
      reason: `Transfer to ${toWarehouse.name}: ${reason}`,
      referenceType: "manual",
      adjustedById: req.user?.id,
    });

    const destAdjustment = new InventoryAdjustment({
      inventoryId: destInventory._id,
      type: "correction",
      qtyChange: quantity,
      qtyBefore: destInventory.qtyOnHand,
      qtyAfter: destInventory.qtyOnHand + quantity,
      reason: `Transfer from ${fromWarehouse.name}: ${reason}`,
      referenceType: "manual",
      adjustedById: req.user?.id,
    });

    await sourceAdjustment.save();
    await destAdjustment.save();

    sourceInventory.qtyOnHand -= quantity;
    await sourceInventory.save();

    destInventory.qtyOnHand += quantity;
    await destInventory.save();

    console.log(`> Transfer complete`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Stock transferred successfully",
      {
        source: sourceInventory,
        destination: destInventory,
        adjustments: [sourceAdjustment, destAdjustment],
      },
      null
    );
  } catch (error) {
    console.log("> Error transferring stock:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to transfer stock",
      null,
      error.message
    );
  }
};
