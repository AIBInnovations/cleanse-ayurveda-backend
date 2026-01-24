import { ResilientHttpClient, TimeoutConfig } from "@shared/http-client";

/**
 * Get service credentials for authentication
 * @returns {Object} Service ID and API key
 */
const getServiceCredentials = () => {
  const serviceId = "order"; // Current service ID
  const apiKey = process.env.SERVICE_API_KEY_ORDER;

  if (!apiKey) {
    console.warn("SERVICE_API_KEY_ORDER not configured. Service-to-service calls may fail.");
  }

  return { serviceId, apiKey };
};

/**
 * Create a resilient HTTP client with circuit breaker, retry logic, and service authentication
 * @param {string} baseURL - Base URL for the service
 * @param {number} timeout - Request timeout in milliseconds
 * @param {string} serviceName - Name of the service for logging
 * @returns {ResilientHttpClient} Resilient HTTP client instance
 */
export const createHttpClient = (baseURL, timeout = TimeoutConfig.STANDARD, serviceName = "unknown") => {
  const { serviceId, apiKey } = getServiceCredentials();

  return new ResilientHttpClient({
    serviceName,
    baseURL,
    timeout,
    serviceId,
    apiKey
  });
};

/**
 * Handle service integration errors consistently
 * @param {Error} error - Error object
 * @param {string} serviceName - Name of the service for logging
 * @returns {Object} Standardized error response
 */
export const handleServiceError = (error, serviceName) => {
  console.log(`> ${serviceName} service error:`, error.message);

  if (error.response) {
    return {
      success: false,
      error: error.response.data?.message || error.message || "Service request failed",
      statusCode: error.response.status
    };
  }

  if (error.code === "ECONNREFUSED") {
    return {
      success: false,
      error: `${serviceName} service unavailable`,
      statusCode: 503
    };
  }

  if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
    return {
      success: false,
      error: `${serviceName} service timeout`,
      statusCode: 504
    };
  }

  // Circuit breaker open error
  if (error.message && error.message.includes("Circuit breaker is OPEN")) {
    return {
      success: false,
      error: `${serviceName} service temporarily unavailable (circuit breaker open)`,
      statusCode: 503
    };
  }

  return {
    success: false,
    error: error.message || "Service unavailable",
    statusCode: 502
  };
};

// Export TimeoutConfig for use in integration services
export { TimeoutConfig };
