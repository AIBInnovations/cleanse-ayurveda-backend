import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { circuitBreakerManager } from "@shared/circuit-breaker";

/**
 * Timeout configuration by operation type
 */
export const TimeoutConfig = {
  QUICK: 1000, // Health checks
  STANDARD: 5000, // Standard read operations
  COMPLEX: 30000, // Reports, aggregations
  LONG_RUNNING: 60000, // Bulk operations
};

/**
 * Retry configuration
 */
const RetryConfig = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 100, // ms
  MAX_DELAY: 5000, // ms
  BACKOFF_MULTIPLIER: 2,
  JITTER_FACTOR: 0.1,
};

/**
 * Check if error is retryable
 * @param {Error} error - Error object
 * @returns {boolean} True if error is retryable
 */
function isRetryableError(error) {
  if (!error.response) {
    // Network errors are retryable
    return true;
  }

  const status = error.response.status;

  // Retry on 5xx errors and 429 (too many requests)
  if (status >= 500 || status === 429) {
    return true;
  }

  // Don't retry 4xx errors (client errors)
  return false;
}

/**
 * Calculate delay with exponential backoff and jitter
 * @param {number} attempt - Retry attempt number (0-based)
 * @returns {number} Delay in milliseconds
 */
function calculateDelay(attempt) {
  const exponentialDelay = Math.min(
    RetryConfig.INITIAL_DELAY * Math.pow(RetryConfig.BACKOFF_MULTIPLIER, attempt),
    RetryConfig.MAX_DELAY
  );

  // Add jitter to prevent thundering herd
  const jitter = exponentialDelay * RetryConfig.JITTER_FACTOR * Math.random();

  return exponentialDelay + jitter;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resilient HTTP Client
 *
 * HTTP client with circuit breaker, retry logic, and configurable timeouts
 */
export class ResilientHttpClient {
  constructor(config = {}) {
    this.serviceName = config.serviceName || "unknown";
    this.baseURL = config.baseURL;
    this.defaultTimeout = config.timeout || TimeoutConfig.STANDARD;
    this.serviceId = config.serviceId || "unknown";
    this.apiKey = config.apiKey || "";

    // Create axios instance
    this.axios = axios.create({
      baseURL: this.baseURL,
      timeout: this.defaultTimeout,
      headers: {
        "Content-Type": "application/json",
        "X-Service-ID": this.serviceId,
        "X-API-Key": this.apiKey,
      },
    });
  }

  /**
   * Make an HTTP request with resilience features
   * @param {object} config - Request configuration
   * @returns {Promise<any>} Response data
   */
  async request(config) {
    const {
      method = "GET",
      url,
      data,
      headers = {},
      timeout = this.defaultTimeout,
      retry = true,
      maxRetries = RetryConfig.MAX_RETRIES,
      idempotencyKey,
      circuitBreaker = true,
    } = config;

    // Generate idempotency key for non-idempotent operations
    const requestIdempotencyKey =
      idempotencyKey ||
      (method !== "GET" && method !== "HEAD" ? uuidv4() : undefined);

    // Prepare request headers
    const requestHeaders = {
      ...headers,
    };

    if (requestIdempotencyKey) {
      requestHeaders["X-Idempotency-Key"] = requestIdempotencyKey;
    }

    // Prepare axios config
    const axiosConfig = {
      method,
      url,
      data,
      headers: requestHeaders,
      timeout,
    };

    // Function to execute
    const executeRequest = async () => {
      let lastError;

      for (let attempt = 0; attempt <= (retry ? maxRetries : 0); attempt++) {
        try {
          this.logRequest("REQUEST_ATTEMPT", {
            attempt: attempt + 1,
            maxRetries: maxRetries + 1,
            method,
            url,
          });

          const response = await this.axios.request(axiosConfig);

          if (attempt > 0) {
            this.logRequest("REQUEST_RETRY_SUCCESS", {
              attempt: attempt + 1,
              method,
              url,
            });
          }

          return response.data;
        } catch (error) {
          lastError = error;

          this.logRequest("REQUEST_ERROR", {
            attempt: attempt + 1,
            method,
            url,
            error: error.message,
            status: error.response?.status,
          });

          // Don't retry if this is the last attempt
          if (attempt >= maxRetries) {
            break;
          }

          // Check if error is retryable
          if (!retry || !isRetryableError(error)) {
            this.logRequest("REQUEST_NOT_RETRYABLE", {
              method,
              url,
              error: error.message,
            });
            break;
          }

          // Calculate delay and wait
          const delay = calculateDelay(attempt);
          this.logRequest("REQUEST_RETRY_DELAY", {
            attempt: attempt + 1,
            delay: `${delay}ms`,
          });
          await sleep(delay);
        }
      }

      // All retries exhausted, throw the last error
      throw lastError;
    };

    // Execute with or without circuit breaker
    if (circuitBreaker) {
      return circuitBreakerManager.execute(
        `${this.serviceName}:${method}:${url}`,
        executeRequest
      );
    } else {
      return executeRequest();
    }
  }

  /**
   * GET request
   * @param {string} url - Request URL
   * @param {object} config - Request configuration
   * @returns {Promise<any>} Response data
   */
  async get(url, config = {}) {
    return this.request({
      method: "GET",
      url,
      timeout: config.timeout || TimeoutConfig.STANDARD,
      ...config,
    });
  }

  /**
   * POST request
   * @param {string} url - Request URL
   * @param {any} data - Request body
   * @param {object} config - Request configuration
   * @returns {Promise<any>} Response data
   */
  async post(url, data, config = {}) {
    return this.request({
      method: "POST",
      url,
      data,
      timeout: config.timeout || TimeoutConfig.STANDARD,
      ...config,
    });
  }

  /**
   * PUT request
   * @param {string} url - Request URL
   * @param {any} data - Request body
   * @param {object} config - Request configuration
   * @returns {Promise<any>} Response data
   */
  async put(url, data, config = {}) {
    return this.request({
      method: "PUT",
      url,
      data,
      timeout: config.timeout || TimeoutConfig.STANDARD,
      ...config,
    });
  }

  /**
   * PATCH request
   * @param {string} url - Request URL
   * @param {any} data - Request body
   * @param {object} config - Request configuration
   * @returns {Promise<any>} Response data
   */
  async patch(url, data, config = {}) {
    return this.request({
      method: "PATCH",
      url,
      data,
      timeout: config.timeout || TimeoutConfig.STANDARD,
      ...config,
    });
  }

  /**
   * DELETE request
   * @param {string} url - Request URL
   * @param {object} config - Request configuration
   * @returns {Promise<any>} Response data
   */
  async delete(url, config = {}) {
    return this.request({
      method: "DELETE",
      url,
      timeout: config.timeout || TimeoutConfig.STANDARD,
      ...config,
    });
  }

  /**
   * Log request event
   * @param {string} event - Event name
   * @param {object} details - Event details
   */
  logRequest(event, details) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        event: `HTTP_CLIENT_${event}`,
        service: this.serviceName,
        ...details,
      })
    );
  }
}
