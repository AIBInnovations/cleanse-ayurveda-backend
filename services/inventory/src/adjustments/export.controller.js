import { sendResponse, HTTP_STATUS } from "@shared/utils";
import InventoryAdjustment from "../../models/inventoryAdjustment.model.js";
import { Parser } from "json2csv";

/**
 * GET /api/admin/adjustments/export
 * Export adjustment report as CSV
 */
export const exportAdjustmentReport = async (req, res) => {
  try {
    console.log("> Exporting adjustment report");

    const {
      inventoryId,
      type,
      referenceType,
      adjustedById,
      startDate,
      endDate,
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

    const adjustments = await InventoryAdjustment.find(filter)
      .populate({
        path: "inventoryId",
        populate: { path: "warehouseId", select: "name code" },
      })
      .sort({ createdAt: -1 })
      .lean();

    const csvData = adjustments.map((adj) => ({
      "Adjustment ID": adj._id,
      SKU: adj.inventoryId?.sku || "Unknown",
      Warehouse: adj.inventoryId?.warehouseId?.name || "Unknown",
      "Warehouse Code": adj.inventoryId?.warehouseId?.code || "Unknown",
      Type: adj.type,
      "Qty Change": adj.qtyChange,
      "Qty Before": adj.qtyBefore,
      "Qty After": adj.qtyAfter,
      Reason: adj.reason,
      "Reference Type": adj.referenceType,
      "Reference ID": adj.referenceId || "N/A",
      "Adjusted By ID": adj.adjustedById || "System",
      "Created At": adj.createdAt,
    }));

    const fields = [
      "Adjustment ID",
      "SKU",
      "Warehouse",
      "Warehouse Code",
      "Type",
      "Qty Change",
      "Qty Before",
      "Qty After",
      "Reason",
      "Reference Type",
      "Reference ID",
      "Adjusted By ID",
      "Created At",
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(csvData);

    console.log(`> Exported ${csvData.length} adjustment records`);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=adjustments-export-${Date.now()}.csv`
    );

    return res.send(csv);
  } catch (error) {
    console.log("> Error exporting adjustments:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to export adjustment report",
      null,
      error.message
    );
  }
};
