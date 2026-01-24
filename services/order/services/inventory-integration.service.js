import { createHttpClient, handleServiceError, TimeoutConfig } from "./http-client.service.js";

const inventoryClient = createHttpClient(
  process.env.INVENTORY_SERVICE_URL || "http://localhost:3005",
  parseInt(process.env.INVENTORY_SERVICE_TIMEOUT) || TimeoutConfig.STANDARD,
  "inventory"
);

/**
 * Check stock availability for a variant
 * @param {string} variantId - Variant ID to check
 * @param {number} quantity - Quantity needed
 * @returns {Promise<Object>} Stock check result
 */
export const checkStock = async (variantId, quantity) => {
  try {
    const response = await inventoryClient.get(`/api/stock/check/${variantId}`, {
      params: { quantity }
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Inventory");
  }
};

/**
 * Bulk check stock for multiple items
 * @param {Array} items - Array of {variantId, quantity}
 * @returns {Promise<Object>} Bulk stock check result
 */
export const bulkCheckStock = async (items) => {
  try {
    const response = await inventoryClient.post("/api/stock/check/bulk", { items });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Inventory");
  }
};

/**
 * Create inventory reservation for cart
 * @param {string} cartId - Cart ID
 * @param {string} variantId - Variant ID
 * @param {number} quantity - Quantity to reserve
 * @param {string} warehouseId - Optional warehouse ID
 * @returns {Promise<Object>} Reservation result
 */
export const createReservation = async (cartId, variantId, quantity, warehouseId = null) => {
  try {
    const response = await inventoryClient.post("/api/reservations", {
      cartId,
      variantId,
      quantity,
      warehouseId
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Inventory");
  }
};

/**
 * Update existing reservation quantity
 * @param {string} reservationId - Reservation ID
 * @param {number} quantity - New quantity
 * @returns {Promise<Object>} Update result
 */
export const updateReservation = async (reservationId, quantity) => {
  try {
    const response = await inventoryClient.put(`/api/reservations/${reservationId}`, {
      quantity
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Inventory");
  }
};

/**
 * Release a specific reservation
 * @param {string} reservationId - Reservation ID
 * @returns {Promise<Object>} Release result
 */
export const releaseReservation = async (reservationId) => {
  try {
    const response = await inventoryClient.delete(`/api/reservations/${reservationId}`);
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Inventory");
  }
};

/**
 * Release all reservations for a cart
 * @param {string} cartId - Cart ID
 * @returns {Promise<Object>} Release result
 */
export const releaseCartReservations = async (cartId) => {
  try {
    const response = await inventoryClient.delete(`/api/reservations/cart/${cartId}`);
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Inventory");
  }
};

/**
 * Convert cart reservations to order sale
 * @param {string} cartId - Cart ID
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Conversion result
 */
export const convertReservationsToSale = async (cartId, orderId) => {
  try {
    const response = await inventoryClient.post("/api/reservations/convert", {
      cartId,
      orderId
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Inventory");
  }
};

/**
 * Return inventory to stock (admin operation)
 * @param {string} orderId - Order ID
 * @param {Array} items - Array of {variantId, quantity, warehouseId}
 * @returns {Promise<Object>} Return result
 */
export const returnInventory = async (orderId, items) => {
  try {
    const response = await inventoryClient.post("/api/admin/adjustments/return", {
      orderId,
      items,
      reason: "Order return"
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Inventory");
  }
};

/**
 * Get warehouse stock levels for a variant
 * @param {string} variantId - Variant ID
 * @returns {Promise<Object>} Warehouse stock result
 */
export const getWarehouseStock = async (variantId) => {
  try {
    const response = await inventoryClient.get(`/api/stock/${variantId}/warehouses`);
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Inventory");
  }
};

/**
 * Deduct stock for an order item (direct deduction without reservation)
 * @param {string} variantId - Variant ID
 * @param {number} quantity - Quantity to deduct
 * @param {string} orderId - Order ID for tracking
 * @param {string} warehouseId - Optional warehouse ID
 * @returns {Promise<Object>} Deduction result
 */
export const deductStock = async (variantId, quantity, orderId, warehouseId = null) => {
  try {
    const response = await inventoryClient.post("/api/admin/adjustments/deduct", {
      variantId,
      quantity,
      orderId,
      warehouseId,
      reason: "Order fulfillment"
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Inventory");
  }
};

/**
 * Release inventory for an order (when order is cancelled)
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Release result
 */
export const releaseInventory = async (orderId) => {
  try {
    const response = await inventoryClient.post("/api/admin/adjustments/release", {
      orderId,
      reason: "Order cancelled"
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Inventory");
  }
};
