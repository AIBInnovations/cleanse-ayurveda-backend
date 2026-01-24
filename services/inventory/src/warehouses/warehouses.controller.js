import { sendResponse, HTTP_STATUS } from "@shared/utils";
import Warehouse from "../../models/warehouse.model.js";
import Inventory from "../../models/inventory.model.js";

/**
 * GET /api/admin/warehouses
 * List all warehouses with optional filtering
 */
export const getAllWarehouses = async (req, res) => {
  try {
    console.log("> Fetching warehouses");

    const { isActive, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const warehouses = await Warehouse.find(filter)
      .sort({ priority: 1, name: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Warehouse.countDocuments(filter);

    for (const warehouse of warehouses) {
      const inventoryCount = await Inventory.countDocuments({
        warehouseId: warehouse._id,
      });
      const totalStock = await Inventory.aggregate([
        { $match: { warehouseId: warehouse._id } },
        { $group: { _id: null, total: { $sum: "$qtyOnHand" } } },
      ]);

      warehouse.inventoryCount = inventoryCount;
      warehouse.totalStock = totalStock[0]?.total || 0;
    }

    console.log(`> Found ${warehouses.length} warehouses`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Warehouses fetched successfully",
      {
        warehouses,
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
    console.log("> Error fetching warehouses:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch warehouses",
      null,
      error.message
    );
  }
};

/**
 * POST /api/admin/warehouses
 * Create new warehouse
 */
export const createWarehouse = async (req, res) => {
  try {
    console.log("> Creating warehouse");

    const warehouseData = req.body;

    if (warehouseData.isDefault) {
      await Warehouse.updateMany({}, { isDefault: false });
      console.log("> Unset default flag on existing warehouses");
    }

    const warehouse = new Warehouse(warehouseData);
    await warehouse.save();

    console.log(`> Warehouse created: ${warehouse.code}`);

    return sendResponse(
      res,
      HTTP_STATUS.CREATED,
      "Warehouse created successfully",
      warehouse,
      null
    );
  } catch (error) {
    console.log("> Error creating warehouse:", error.message);

    if (error.code === 11000) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Warehouse code already exists",
        null,
        "Duplicate warehouse code"
      );
    }

    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create warehouse",
      null,
      error.message
    );
  }
};

/**
 * PUT /api/admin/warehouses/:id
 * Update warehouse details
 */
export const updateWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`> Updating warehouse: ${id}`);

    const warehouse = await Warehouse.findById(id);

    if (!warehouse) {
      console.log(`> Warehouse not found: ${id}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Warehouse not found",
        null,
        null
      );
    }

    const updates = req.body;

    if (updates.isDefault === true && !warehouse.isDefault) {
      await Warehouse.updateMany({ _id: { $ne: id } }, { isDefault: false });
      console.log("> Unset default flag on other warehouses");
    }

    Object.assign(warehouse, updates);
    await warehouse.save();

    console.log(`> Warehouse updated: ${warehouse.code}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Warehouse updated successfully",
      warehouse,
      null
    );
  } catch (error) {
    console.log("> Error updating warehouse:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update warehouse",
      null,
      error.message
    );
  }
};

/**
 * PUT /api/admin/warehouses/:id/set-default
 * Set warehouse as default
 */
export const setDefaultWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`> Setting default warehouse: ${id}`);

    const warehouse = await Warehouse.findById(id);

    if (!warehouse) {
      console.log(`> Warehouse not found: ${id}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Warehouse not found",
        null,
        null
      );
    }

    await Warehouse.updateMany({ _id: { $ne: id } }, { isDefault: false });
    warehouse.isDefault = true;
    await warehouse.save();

    console.log(`> Default warehouse set: ${warehouse.code}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Default warehouse set successfully",
      warehouse,
      null
    );
  } catch (error) {
    console.log("> Error setting default warehouse:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to set default warehouse",
      null,
      error.message
    );
  }
};

/**
 * PATCH /api/admin/warehouses/:id/status
 * Activate or deactivate warehouse
 */
export const updateWarehouseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    console.log(`> Updating warehouse status: ${id} to ${isActive}`);

    const warehouse = await Warehouse.findById(id);

    if (!warehouse) {
      console.log(`> Warehouse not found: ${id}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Warehouse not found",
        null,
        null
      );
    }

    if (isActive === false) {
      const activeCount = await Warehouse.countDocuments({ isActive: true });
      if (activeCount <= 1) {
        return sendResponse(
          res,
          HTTP_STATUS.BAD_REQUEST,
          "Cannot deactivate the only active warehouse",
          null,
          null
        );
      }

      const activeReservations = await Inventory.aggregate([
        { $match: { warehouseId: warehouse._id } },
        {
          $lookup: {
            from: "inventoryreservations",
            localField: "_id",
            foreignField: "inventoryId",
            as: "reservations",
          },
        },
        {
          $match: {
            "reservations.status": "active",
          },
        },
      ]);

      if (activeReservations.length > 0) {
        return sendResponse(
          res,
          HTTP_STATUS.BAD_REQUEST,
          "Cannot deactivate warehouse with active reservations",
          null,
          null
        );
      }
    }

    warehouse.isActive = isActive;
    await warehouse.save();

    console.log(`> Warehouse status updated: ${warehouse.code}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Warehouse status updated successfully",
      warehouse,
      null
    );
  } catch (error) {
    console.log("> Error updating warehouse status:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update warehouse status",
      null,
      error.message
    );
  }
};

/**
 * DELETE /api/admin/warehouses/:id
 * Delete warehouse
 */
export const deleteWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`> Deleting warehouse: ${id}`);

    const warehouse = await Warehouse.findById(id);

    if (!warehouse) {
      console.log(`> Warehouse not found: ${id}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Warehouse not found",
        null,
        null
      );
    }

    const inventoryCount = await Inventory.countDocuments({
      warehouseId: warehouse._id,
    });

    if (inventoryCount > 0) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot delete warehouse with inventory records",
        null,
        null
      );
    }

    if (warehouse.isDefault) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot delete default warehouse",
        null,
        null
      );
    }

    await warehouse.deleteOne();

    console.log(`> Warehouse deleted: ${warehouse.code}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Warehouse deleted successfully",
      null,
      null
    );
  } catch (error) {
    console.log("> Error deleting warehouse:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to delete warehouse",
      null,
      error.message
    );
  }
};
