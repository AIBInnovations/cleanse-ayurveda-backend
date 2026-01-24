import axios from "axios";

const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || "http://localhost:3005";

// Create axios instance with defaults
const inventoryClient = axios.create({
  baseURL: INVENTORY_SERVICE_URL,
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Create inventory record for a new product/variant
 * @param {string} productId - Product ID
 * @param {string} variantId - Variant ID (required)
 * @param {string} sku - Product/Variant SKU (required)
 * @param {string} warehouseId - Warehouse ID (optional, uses default if not provided)
 * @param {number} initialStock - Initial stock quantity
 * @param {number} lowStockThreshold - Low stock alert threshold
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export const createInventoryRecord = async (productId, variantId, sku, warehouseId = null, initialStock = 0, lowStockThreshold = 10) => {
  try {
    if (!variantId || !sku) {
      console.log(`> Skipping inventory creation: missing required fields (variantId: ${variantId}, sku: ${sku})`);
      return {
        success: false,
        error: "variantId and sku are required",
      };
    }

    console.log(`> Creating inventory record for variant ${variantId} (SKU: ${sku})`);

    // If no warehouse provided, get default warehouse
    let targetWarehouseId = warehouseId;
    if (!targetWarehouseId) {
      try {
        const warehouseResponse = await inventoryClient.get("/api/admin/warehouses?limit=1");
        if (warehouseResponse.data?.data?.warehouses?.[0]) {
          targetWarehouseId = warehouseResponse.data.data.warehouses[0]._id;
          console.log(`> Using default warehouse: ${targetWarehouseId}`);
        } else {
          console.log(`> Warning: No warehouses found, cannot create inventory record`);
          return {
            success: false,
            error: "No warehouses available",
          };
        }
      } catch (warehouseError) {
        console.log(`> Warning: Failed to fetch default warehouse: ${warehouseError.message}`);
        return {
          success: false,
          error: "Failed to fetch default warehouse",
        };
      }
    }

    const payload = {
      productId,
      variantId,
      sku: sku.toUpperCase(),
      warehouseId: targetWarehouseId,
      qtyOnHand: initialStock,
      lowStockThreshold,
    };

    const response = await inventoryClient.post("/api/admin/inventory", payload);

    console.log(`> Inventory record created successfully for SKU: ${sku}`);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.log(`> Warning: Failed to create inventory record: ${error.message}`);
    if (error.response?.data) {
      console.log(`> Error response:`, JSON.stringify(error.response.data));
    }
    return {
      success: false,
      error: error.response?.data?.error || error.message,
    };
  }
};

/**
 * Archive inventory record when product is archived
 * @param {string} productId - Product ID
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export const archiveInventoryRecord = async (productId) => {
  try {
    console.log(`> Archiving inventory record for product ${productId}`);

    const response = await inventoryClient.patch(`/api/inventory/products/${productId}/archive`);

    console.log(`> Inventory record archived successfully`);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.log(`> Warning: Failed to archive inventory record: ${error.message}`);
    return {
      success: false,
      error: error.response?.data?.error || error.message,
    };
  }
};

export default {
  createInventoryRecord,
  archiveInventoryRecord,
};
