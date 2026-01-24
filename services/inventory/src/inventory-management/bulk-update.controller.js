import { sendResponse, HTTP_STATUS } from "@shared/utils";
import Inventory from "../../models/inventory.model.js";
import Warehouse from "../../models/warehouse.model.js";
import InventoryAdjustment from "../../models/inventoryAdjustment.model.js";
import csvParser from "csv-parser";
import { Readable } from "stream";

/**
 * POST /api/admin/inventory/bulk-update
 * Bulk update stock via CSV
 */
export const bulkUpdateStock = async (req, res) => {
  try {
    console.log("> Starting bulk stock update");

    if (!req.file) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "CSV file is required",
        null,
        null
      );
    }

    const results = [];
    const errors = [];
    let successCount = 0;
    let failureCount = 0;

    const csvData = [];
    const stream = Readable.from(req.file.buffer.toString());

    await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on("data", (row) => {
          csvData.push(row);
        })
        .on("end", resolve)
        .on("error", reject);
    });

    console.log(`> Processing ${csvData.length} rows`);

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 2;

      try {
        const sku = row.sku?.trim().toUpperCase();
        const warehouseCode = row.warehouseCode?.trim().toUpperCase();
        const qtyChange = parseInt(row.qtyChange);
        const reason = row.reason?.trim();

        if (!sku || !warehouseCode || isNaN(qtyChange) || !reason) {
          errors.push({
            row: rowNumber,
            error: "Missing or invalid required fields (sku, warehouseCode, qtyChange, reason)",
            data: row,
          });
          failureCount++;
          continue;
        }

        const warehouse = await Warehouse.findOne({ code: warehouseCode });

        if (!warehouse) {
          errors.push({
            row: rowNumber,
            error: `Warehouse not found: ${warehouseCode}`,
            data: row,
          });
          failureCount++;
          continue;
        }

        const inventory = await Inventory.findOne({
          sku,
          warehouseId: warehouse._id,
        });

        if (!inventory) {
          errors.push({
            row: rowNumber,
            error: `Inventory not found for SKU: ${sku} in warehouse: ${warehouseCode}`,
            data: row,
          });
          failureCount++;
          continue;
        }

        const qtyBefore = inventory.qtyOnHand;
        const qtyAfter = qtyBefore + qtyChange;

        if (qtyAfter < 0) {
          errors.push({
            row: rowNumber,
            error: `Resulting quantity would be negative (${qtyAfter})`,
            data: row,
          });
          failureCount++;
          continue;
        }

        const adjustment = new InventoryAdjustment({
          inventoryId: inventory._id,
          type: "correction",
          qtyChange,
          qtyBefore,
          qtyAfter,
          reason: `Bulk update: ${reason}`,
          referenceType: "manual",
          adjustedById: req.user?.id,
        });

        await adjustment.save();

        inventory.qtyOnHand = qtyAfter;
        await inventory.save();

        results.push({
          row: rowNumber,
          sku,
          warehouseCode,
          qtyBefore,
          qtyAfter,
          qtyChange,
        });

        successCount++;
      } catch (error) {
        errors.push({
          row: rowNumber,
          error: error.message,
          data: row,
        });
        failureCount++;
      }
    }

    console.log(`> Bulk update complete: ${successCount} success, ${failureCount} failures`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Bulk update completed",
      {
        successCount,
        failureCount,
        results,
        errors: errors.length > 0 ? errors : undefined,
      },
      null
    );
  } catch (error) {
    console.log("> Error in bulk update:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to process bulk update",
      null,
      error.message
    );
  }
};
