import { createHttpClient, handleServiceError, TimeoutConfig } from "./http-client.service.js";

const shippingClient = createHttpClient(
  process.env.SHIPPING_SERVICE_URL || "http://localhost:3007",
  parseInt(process.env.SHIPPING_SERVICE_TIMEOUT) || TimeoutConfig.STANDARD,
  "shipping"
);

// Shipping bypass mode - when true, returns mock data instead of calling shipping service
const SHIPPING_BYPASS_MODE = process.env.SHIPPING_BYPASS_MODE === "true" || true; // Default to true until shipping service is ready
const DEFAULT_SHIPPING_RATE = 50; // Default flat shipping rate in INR

/**
 * Get available shipping methods for address
 * @param {Object} address - Shipping address
 * @param {Object} cartData - Cart data for weight/dimensions
 * @returns {Promise<Object>} Available shipping methods
 */
export const getAvailableShippingMethods = async (address, cartData) => {
  if (SHIPPING_BYPASS_MODE) {
    console.log("> Shipping bypass mode: Returning mock shipping methods");
    return {
      success: true,
      data: {
        methods: [
          {
            id: "standard",
            name: "Standard Delivery",
            description: "Delivered in 5-7 business days",
            rate: DEFAULT_SHIPPING_RATE,
            estimatedDays: 7,
            isDefault: true
          }
        ]
      }
    };
  }

  try {
    const response = await shippingClient.post("/api/shipping/methods", {
      address,
      cartData
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Shipping");
  }
};

/**
 * Calculate shipping rate for specific method
 * @param {string} methodId - Shipping method ID
 * @param {Object} address - Shipping address
 * @param {Object} packageData - Package weight and dimensions
 * @returns {Promise<Object>} Calculated shipping rate
 */
export const calculateShippingRate = async (methodId, address, packageData) => {
  if (SHIPPING_BYPASS_MODE) {
    console.log("> Shipping bypass mode: Returning flat rate");
    return {
      success: true,
      data: {
        methodId: methodId || "standard",
        rate: DEFAULT_SHIPPING_RATE,
        estimatedDays: 7,
        currency: "INR"
      }
    };
  }

  try {
    const response = await shippingClient.post("/api/shipping/calculate", {
      methodId,
      address,
      packageData
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Shipping");
  }
};

/**
 * Create shipment for order
 * @param {Object} shipmentData - Shipment details
 * @returns {Promise<Object>} Created shipment
 */
export const createShipment = async (shipmentData) => {
  if (SHIPPING_BYPASS_MODE) {
    console.log("> Shipping bypass mode: Simulating shipment creation");
    const mockShipmentId = `SHIP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const mockTrackingNumber = `TRK${Date.now()}`;

    return {
      success: true,
      data: {
        shipmentId: mockShipmentId,
        trackingNumber: mockTrackingNumber,
        status: "pending",
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        carrier: "Standard Courier"
      }
    };
  }

  try {
    const response = await shippingClient.post("/api/admin/shipments", shipmentData);
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Shipping");
  }
};

/**
 * Track shipment status
 * @param {string} trackingNumber - Tracking number
 * @returns {Promise<Object>} Tracking information
 */
export const trackShipment = async (trackingNumber) => {
  try {
    const response = await shippingClient.get(`/api/tracking/${trackingNumber}`);
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Shipping");
  }
};

/**
 * Get shipment details by ID
 * @param {string} shipmentId - Shipment ID
 * @returns {Promise<Object>} Shipment details
 */
export const getShipment = async (shipmentId) => {
  try {
    const response = await shippingClient.get(`/api/shipments/${shipmentId}`);
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Shipping");
  }
};

/**
 * Update shipment status
 * @param {string} shipmentId - Shipment ID
 * @param {string} status - New status
 * @param {string} notes - Optional notes
 * @returns {Promise<Object>} Update result
 */
export const updateShipmentStatus = async (shipmentId, status, notes = null) => {
  try {
    const response = await shippingClient.put(`/api/admin/shipments/${shipmentId}/status`, {
      status,
      notes
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Shipping");
  }
};

/**
 * Cancel shipment
 * @param {string} shipmentId - Shipment ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} Cancellation result
 */
export const cancelShipment = async (shipmentId, reason) => {
  try {
    const response = await shippingClient.post(`/api/admin/shipments/${shipmentId}/cancel`, {
      reason
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Shipping");
  }
};

/**
 * Get shipping zones for pincode
 * @param {string} pincode - Pincode to check
 * @returns {Promise<Object>} Available zones
 */
export const getZonesByPincode = async (pincode) => {
  try {
    const response = await shippingClient.get(`/api/zones/pincode/${pincode}`);
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Shipping");
  }
};

/**
 * Validate shipping address serviceability
 * @param {Object} address - Address to validate
 * @returns {Promise<Object>} Serviceability result
 */
export const validateServiceability = async (address) => {
  if (SHIPPING_BYPASS_MODE) {
    console.log("> Shipping bypass mode: Address is serviceable");
    return {
      success: true,
      data: {
        serviceable: true,
        estimatedDays: 7,
        message: "Delivery available to this location"
      }
    };
  }

  try {
    const response = await shippingClient.post("/api/shipping/validate", { address });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Shipping");
  }
};

/**
 * Schedule pickup for return
 * @param {Object} pickupData - Pickup details
 * @returns {Promise<Object>} Pickup scheduling result
 */
export const scheduleReturnPickup = async (pickupData) => {
  try {
    const response = await shippingClient.post("/api/admin/pickups", pickupData);
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Shipping");
  }
};

/**
 * Get estimated delivery date
 * @param {string} methodId - Shipping method ID
 * @param {Object} address - Shipping address
 * @returns {Promise<Object>} Estimated delivery date
 */
export const getEstimatedDelivery = async (methodId, address) => {
  try {
    const response = await shippingClient.post("/api/shipping/estimate", {
      methodId,
      address
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Shipping");
  }
};
