import { createHttpClient, handleServiceError, TimeoutConfig } from "./http-client.service.js";

const catalogClient = createHttpClient(
  process.env.CATALOG_SERVICE_URL || "http://localhost:3002",
  parseInt(process.env.CATALOG_SERVICE_TIMEOUT) || TimeoutConfig.STANDARD,
  "catalog"
);

/**
 * Get product details by ID
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Product details
 */
export const getProduct = async (productId) => {
  try {
    const response = await catalogClient.get(`/api/products/${productId}`);
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Catalog");
  }
};

/**
 * Get variant details by ID
 * @param {string} variantId - Variant ID
 * @returns {Promise<Object>} Variant details
 */
export const getVariant = async (variantId) => {
  try {
    const response = await catalogClient.get(`/api/variants/${variantId}`);
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Catalog");
  }
};

/**
 * Get product variant details (validates both product and variant exist)
 * @param {string} productId - Product ID
 * @param {string} variantId - Variant ID
 * @returns {Promise<Object>} Product variant details
 */
export const getProductVariant = async (productId, variantId) => {
  try {
    // Get product to validate it exists
    const productResponse = await catalogClient.get(`/api/products/${productId}`);

    // Get variant details
    const variantResponse = await catalogClient.get(`/api/variants/${variantId}`);

    return {
      success: true,
      data: {
        product: productResponse.data,
        variant: variantResponse.data
      }
    };
  } catch (error) {
    return handleServiceError(error, "Catalog");
  }
};

/**
 * Get multiple variants by IDs
 * @param {Array} variantIds - Array of variant IDs
 * @returns {Promise<Object>} Bulk variant details
 */
export const bulkGetVariants = async (variantIds) => {
  try {
    const response = await catalogClient.post("/api/variants/bulk", { variantIds });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Catalog");
  }
};

/**
 * Get bundle details by ID
 * @param {string} bundleId - Bundle ID
 * @returns {Promise<Object>} Bundle details
 */
export const getBundle = async (bundleId) => {
  try {
    const response = await catalogClient.get(`/api/bundles/${bundleId}`);
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Catalog");
  }
};

/**
 * Get product details with variants
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Product with variants
 */
export const getProductWithVariants = async (productId) => {
  try {
    const response = await catalogClient.get(`/api/products/${productId}?includeVariants=true`);
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Catalog");
  }
};

/**
 * Validate product availability
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Availability status
 */
export const checkProductAvailability = async (productId) => {
  try {
    const response = await catalogClient.get(`/api/products/${productId}/availability`);
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Catalog");
  }
};

/**
 * Get category details
 * @param {string} categoryId - Category ID
 * @returns {Promise<Object>} Category details
 */
export const getCategory = async (categoryId) => {
  try {
    const response = await catalogClient.get(`/api/categories/${categoryId}`);
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Catalog");
  }
};

/**
 * Get brand details
 * @param {string} brandId - Brand ID
 * @returns {Promise<Object>} Brand details
 */
export const getBrand = async (brandId) => {
  try {
    const response = await catalogClient.get(`/api/brands/${brandId}`);
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Catalog");
  }
};

/**
 * Validate bundle composition
 * @param {string} bundleId - Bundle ID
 * @returns {Promise<Object>} Bundle validation result
 */
export const validateBundle = async (bundleId) => {
  try {
    const response = await catalogClient.get(`/api/bundles/${bundleId}/validate`);
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Catalog");
  }
};

/**
 * Get product metadata for order display
 * @param {Array} items - Array of {productId, variantId}
 * @returns {Promise<Object>} Product metadata
 */
export const getOrderItemsMetadata = async (items) => {
  try {
    const response = await catalogClient.post("/api/products/metadata", { items });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Catalog");
  }
};
