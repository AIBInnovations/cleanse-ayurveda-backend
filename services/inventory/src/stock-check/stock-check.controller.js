import { sendResponse, HTTP_STATUS } from "@shared/utils";
import Inventory from "../../models/inventory.model.js";
import Warehouse from "../../models/warehouse.model.js";

/**
 * GET /api/stock/check/:variantId
 * Check stock availability for a variant
 */
export const checkStockAvailability = async (req, res) => {
  try {
    const { variantId } = req.params;
    const { warehouseId } = req.query;

    console.log(`> Checking stock for variant: ${variantId}`);

    const filter = { variantId };

    if (warehouseId) {
      filter.warehouseId = warehouseId;
    }

    const inventoryRecords = await Inventory.find(filter)
      .populate("warehouseId", "name code isActive")
      .lean();

    if (inventoryRecords.length === 0) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "No inventory found for this variant",
        null,
        null
      );
    }

    let totalAvailable = 0;
    let hasLowStock = false;
    let overallStatus = "out_of_stock";
    let sku = inventoryRecords[0].sku;
    let allowBackorder = false;

    for (const record of inventoryRecords) {
      if (!record.warehouseId.isActive) continue;

      const available = Math.max(0, record.qtyOnHand - record.qtyReserved);
      totalAvailable += available;

      if (available > 0 && available <= record.lowStockThreshold) {
        hasLowStock = true;
      }

      if (record.allowBackorder) {
        allowBackorder = true;
      }
    }

    if (totalAvailable > 0) {
      overallStatus = hasLowStock ? "low_stock" : "in_stock";
    }

    const response = {
      sku,
      status: overallStatus,
      isAvailable: totalAvailable > 0 || allowBackorder,
      qtyAvailable: overallStatus === "low_stock" ? totalAvailable : undefined,
      lowStockWarning: hasLowStock,
      allowBackorder,
    };

    console.log(`> Stock status: ${overallStatus}, available: ${totalAvailable}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Stock availability checked",
      response,
      null
    );
  } catch (error) {
    console.log("> Error checking stock:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to check stock availability",
      null,
      error.message
    );
  }
};

/**
 * POST /api/stock/check/bulk
 * Check availability for multiple variants
 */
export const bulkCheckStock = async (req, res) => {
  try {
    const { items, warehouseId } = req.body;

    console.log(`> Bulk checking stock for ${items.length} items`);

    const results = [];

    for (const item of items) {
      const filter = { variantId: item.variantId };

      if (warehouseId) {
        filter.warehouseId = warehouseId;
      }

      const inventoryRecords = await Inventory.find(filter)
        .populate("warehouseId", "isActive")
        .lean();

      let totalAvailable = 0;

      for (const record of inventoryRecords) {
        if (!record.warehouseId.isActive) continue;
        totalAvailable += Math.max(0, record.qtyOnHand - record.qtyReserved);
      }

      const available = totalAvailable >= item.requestedQty;
      const reason = !available
        ? totalAvailable === 0
          ? "Out of stock"
          : `Only ${totalAvailable} available`
        : null;

      results.push({
        variantId: item.variantId,
        requestedQty: item.requestedQty,
        availableQty: totalAvailable,
        available,
        reason,
      });
    }

    console.log(`> Bulk check complete: ${results.length} results`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Bulk stock check complete",
      results,
      null
    );
  } catch (error) {
    console.log("> Error in bulk stock check:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to check stock",
      null,
      error.message
    );
  }
};

/**
 * POST /api/stock/validate/checkout
 * Validate entire cart before checkout
 */
export const validateCheckout = async (req, res) => {
  try {
    const { cartId, items } = req.body;

    console.log(`> Validating checkout for cart: ${cartId}`);

    const unavailableItems = [];

    for (const item of items) {
      const inventoryRecords = await Inventory.find({
        variantId: item.variantId,
      })
        .populate("warehouseId", "isActive")
        .lean();

      let totalAvailable = 0;

      for (const record of inventoryRecords) {
        if (!record.warehouseId.isActive) continue;
        totalAvailable += Math.max(0, record.qtyOnHand - record.qtyReserved);
      }

      if (totalAvailable < item.quantity) {
        unavailableItems.push({
          variantId: item.variantId,
          requestedQty: item.quantity,
          availableQty: totalAvailable,
          reason:
            totalAvailable === 0
              ? "Out of stock"
              : `Only ${totalAvailable} available`,
        });
      }
    }

    const allAvailable = unavailableItems.length === 0;

    console.log(
      `> Checkout validation: ${allAvailable ? "passed" : "failed"}`
    );

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      allAvailable
        ? "All items available"
        : "Some items are unavailable",
      {
        allAvailable,
        unavailableItems: allAvailable ? undefined : unavailableItems,
      },
      null
    );
  } catch (error) {
    console.log("> Error validating checkout:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to validate checkout",
      null,
      error.message
    );
  }
};

/**
 * GET /api/admin/inventory/dashboard
 * Get inventory dashboard metrics
 */
export const getInventoryDashboard = async (req, res) => {
  try {
    console.log("> Fetching inventory dashboard");

    const totalSkus = await Inventory.countDocuments();

    const statusCounts = await Inventory.aggregate([
      {
        $addFields: {
          qtyAvailable: { $subtract: ["$qtyOnHand", "$qtyReserved"] },
        },
      },
      {
        $addFields: {
          status: {
            $cond: [
              { $lte: ["$qtyAvailable", 0] },
              "out_of_stock",
              {
                $cond: [
                  { $lte: ["$qtyAvailable", "$lowStockThreshold"] },
                  "low_stock",
                  "in_stock",
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const inStockCount =
      statusCounts.find((s) => s._id === "in_stock")?.count || 0;
    const lowStockCount =
      statusCounts.find((s) => s._id === "low_stock")?.count || 0;
    const outOfStockCount =
      statusCounts.find((s) => s._id === "out_of_stock")?.count || 0;

    const topLowStockItems = await Inventory.find()
      .where("qtyOnHand")
      .lte(10)
      .sort({ qtyOnHand: 1 })
      .limit(10)
      .populate("warehouseId", "name code")
      .lean();

    console.log("> Dashboard data fetched");

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Dashboard data fetched successfully",
      {
        totalSkus,
        inStockCount,
        lowStockCount,
        outOfStockCount,
        topLowStockItems,
      },
      null
    );
  } catch (error) {
    console.log("> Error fetching dashboard:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch dashboard data",
      null,
      error.message
    );
  }
};

/**
 * GET /api/admin/inventory
 * List all inventory with filters
 */
export const getInventoryList = async (req, res) => {
  try {
    console.log("> Fetching inventory list");

    const {
      productId,
      warehouseId,
      status,
      sku,
      page = 1,
      limit = 20,
      sortBy = "updatedAt",
      sortOrder = "desc",
    } = req.query;

    const filter = {};

    if (productId) filter.productId = productId;
    if (warehouseId) filter.warehouseId = warehouseId;
    if (sku) filter.sku = new RegExp(sku, "i");

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    let inventory = await Inventory.find(filter)
      .populate("warehouseId", "name code")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    if (status) {
      inventory = inventory.filter((item) => {
        const available = Math.max(0, item.qtyOnHand - item.qtyReserved);
        if (available === 0) return status === "out_of_stock";
        if (available <= item.lowStockThreshold) return status === "low_stock";
        return status === "in_stock";
      });
    }

    const total = await Inventory.countDocuments(filter);

    console.log(`> Found ${inventory.length} inventory records`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Inventory list fetched successfully",
      {
        inventory,
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
    console.log("> Error fetching inventory list:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch inventory list",
      null,
      error.message
    );
  }
};

/**
 * GET /api/admin/inventory/low-stock
 * Get low stock items
 */
export const getLowStockItems = async (req, res) => {
  try {
    console.log("> Fetching low stock items");

    const { warehouseId, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (warehouseId) filter.warehouseId = warehouseId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let inventory = await Inventory.find(filter)
      .populate("warehouseId", "name code")
      .lean();

    inventory = inventory.filter((item) => {
      const available = Math.max(0, item.qtyOnHand - item.qtyReserved);
      return available > 0 && available <= item.lowStockThreshold;
    });

    const paginatedInventory = inventory.slice(skip, skip + parseInt(limit));

    console.log(`> Found ${inventory.length} low stock items`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Low stock items fetched successfully",
      {
        inventory: paginatedInventory,
        pagination: {
          total: inventory.length,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(inventory.length / parseInt(limit)),
        },
      },
      null
    );
  } catch (error) {
    console.log("> Error fetching low stock items:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch low stock items",
      null,
      error.message
    );
  }
};

/**
 * GET /api/admin/inventory/out-of-stock
 * Get out of stock items
 */
export const getOutOfStockItems = async (req, res) => {
  try {
    console.log("> Fetching out of stock items");

    const { warehouseId, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (warehouseId) filter.warehouseId = warehouseId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let inventory = await Inventory.find(filter)
      .populate("warehouseId", "name code")
      .lean();

    inventory = inventory.filter((item) => {
      const available = Math.max(0, item.qtyOnHand - item.qtyReserved);
      return available === 0;
    });

    const paginatedInventory = inventory.slice(skip, skip + parseInt(limit));

    console.log(`> Found ${inventory.length} out of stock items`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Out of stock items fetched successfully",
      {
        inventory: paginatedInventory,
        pagination: {
          total: inventory.length,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(inventory.length / parseInt(limit)),
        },
      },
      null
    );
  } catch (error) {
    console.log("> Error fetching out of stock items:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch out of stock items",
      null,
      error.message
    );
  }
};
