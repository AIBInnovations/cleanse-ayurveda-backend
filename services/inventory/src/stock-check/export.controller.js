import { sendResponse, HTTP_STATUS } from "@shared/utils";
import Inventory from "../../models/inventory.model.js";
import { Parser } from "json2csv";

/**
 * GET /api/stock/admin/export
 * Export inventory report as CSV
 */
export const exportInventoryReport = async (req, res) => {
  try {
    console.log("> Exporting inventory report");

    const { productId, warehouseId, status, sku } = req.query;

    const filter = {};

    if (productId) filter.productId = productId;
    if (warehouseId) filter.warehouseId = warehouseId;
    if (sku) filter.sku = new RegExp(sku, "i");

    let inventory = await Inventory.find(filter)
      .populate("warehouseId", "name code")
      .lean();

    if (status) {
      inventory = inventory.filter((item) => {
        const available = Math.max(0, item.qtyOnHand - item.qtyReserved);
        if (available === 0) return status === "out_of_stock";
        if (available <= item.lowStockThreshold) return status === "low_stock";
        return status === "in_stock";
      });
    }

    const csvData = inventory.map((item) => {
      const available = Math.max(0, item.qtyOnHand - item.qtyReserved);
      let itemStatus = "in_stock";
      if (available === 0) itemStatus = "out_of_stock";
      else if (available <= item.lowStockThreshold) itemStatus = "low_stock";

      return {
        SKU: item.sku,
        "Product ID": item.productId,
        "Variant ID": item.variantId,
        Warehouse: item.warehouseId?.name || "Unknown",
        "Warehouse Code": item.warehouseId?.code || "Unknown",
        "Qty On Hand": item.qtyOnHand,
        "Qty Reserved": item.qtyReserved,
        "Qty Available": available,
        Status: itemStatus,
        "Low Stock Threshold": item.lowStockThreshold,
        "Allow Backorder": item.allowBackorder ? "Yes" : "No",
        "Reorder Point": item.reorderPoint,
        "Updated At": item.updatedAt,
      };
    });

    const fields = [
      "SKU",
      "Product ID",
      "Variant ID",
      "Warehouse",
      "Warehouse Code",
      "Qty On Hand",
      "Qty Reserved",
      "Qty Available",
      "Status",
      "Low Stock Threshold",
      "Allow Backorder",
      "Reorder Point",
      "Updated At",
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(csvData);

    console.log(`> Exported ${csvData.length} inventory records`);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=inventory-export-${Date.now()}.csv`
    );

    return res.send(csv);
  } catch (error) {
    console.log("> Error exporting inventory:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to export inventory report",
      null,
      error.message
    );
  }
};
