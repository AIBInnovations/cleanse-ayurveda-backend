/**
 * HTTP Client Utility
 * Wrapper around axios for standardized API testing
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

class HttpClient {
  constructor(baseURL, timeout = 10000) {
    this.baseURL = baseURL;
    this.timeout = timeout;
    this.tokens = {
      admin: null,
      consumer: null,
      guest: null
    };
  }

  /**
   * Set authentication token
   * @param {string} type - Token type (admin, consumer, guest)
   * @param {string} token - JWT token
   */
  setToken(type, token) {
    this.tokens[type] = token;
  }

  /**
   * Get authentication token
   * @param {string} type - Token type
   * @returns {string|null} Token
   */
  getToken(type) {
    return this.tokens[type];
  }

  /**
   * Build request headers
   * @param {string} authType - Type of auth to use (admin, consumer, guest, none)
   * @param {object} customHeaders - Additional headers
   * @returns {object} Headers object
   */
  buildHeaders(authType = 'none', customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'x-correlation-id': uuidv4(),
      ...customHeaders
    };

    if (authType !== 'none' && this.tokens[authType]) {
      headers['Authorization'] = `Bearer ${this.tokens[authType]}`;
    }

    return headers;
  }

  /**
   * Log request details
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {object} data - Request data
   */
  logRequest(method, url, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] ${method.toUpperCase()} ${url}`);
    if (data) {
      console.log('Request Body:', JSON.stringify(data, null, 2));
    }
  }

  /**
   * Log response details
   * @param {object} response - Axios response
   * @param {number} duration - Request duration in ms
   */
  logResponse(response, duration) {
    const status = response.status;
    const statusText = response.statusText;
    console.log(`Response: ${status} ${statusText} (${duration}ms)`);
  }

  /**
   * Log error details
   * @param {Error} error - Axios error
   */
  logError(error) {
    if (error.response) {
      console.log(`❌ Error: ${error.response.status} ${error.response.statusText}`);
      console.log('Error Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('❌ Error: No response received');
      console.log('Request:', error.request);
    } else {
      console.log('❌ Error:', error.message);
    }
  }

  /**
   * Normalize response
   * @param {object} axiosResponse - Axios response object
   * @param {number} duration - Request duration
   * @returns {object} Normalized response
   */
  normalizeResponse(axiosResponse, duration) {
    return {
      success: true,
      status: axiosResponse.status,
      statusText: axiosResponse.statusText,
      data: axiosResponse.data,
      headers: axiosResponse.headers,
      duration,
      error: null
    };
  }

  /**
   * Normalize error
   * @param {Error} error - Axios error
   * @returns {object} Normalized error response
   */
  normalizeError(error) {
    if (error.response) {
      return {
        success: false,
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        error: error.response.data?.error || error.response.data?.message || error.message,
        duration: 0
      };
    } else if (error.request) {
      return {
        success: false,
        status: 0,
        statusText: 'No Response',
        data: null,
        error: 'No response received from server',
        duration: 0
      };
    } else {
      return {
        success: false,
        status: 0,
        statusText: 'Request Error',
        data: null,
        error: error.message,
        duration: 0
      };
    }
  }

  /**
   * Execute HTTP request
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {object} data - Request data
   * @param {object} options - Request options
   * @returns {Promise<object>} Normalized response
   */
  async request(method, url, data = null, options = {}) {
    const startTime = Date.now();
    const authType = options.auth || 'none';
    const verbose = options.verbose !== false; // Default to verbose logging

    const config = {
      method,
      url: `${this.baseURL}${url}`,
      timeout: this.timeout,
      headers: this.buildHeaders(authType, options.headers),
      validateStatus: () => true // Don't throw on any status
    };

    if (data) {
      config.data = data;
    }

    if (options.params) {
      config.params = options.params;
    }

    if (verbose) {
      this.logRequest(method, url, data);
    }

    try {
      const response = await axios(config);
      const duration = Date.now() - startTime;

      if (verbose) {
        this.logResponse(response, duration);
      }

      return this.normalizeResponse(response, duration);
    } catch (error) {
      // Always log 401 errors for debugging
      if (verbose || (error.response && error.response.status === 401)) {
        this.logError(error);
      }

      return this.normalizeError(error);
    }
  }

  /**
   * GET request
   * @param {string} url - Request URL
   * @param {object} options - Request options
   * @returns {Promise<object>} Response
   */
  async get(url, options = {}) {
    return this.request('GET', url, null, options);
  }

  /**
   * POST request
   * @param {string} url - Request URL
   * @param {object} data - Request body
   * @param {object} options - Request options
   * @returns {Promise<object>} Response
   */
  async post(url, data, options = {}) {
    return this.request('POST', url, data, options);
  }

  /**
   * PUT request
   * @param {string} url - Request URL
   * @param {object} data - Request body
   * @param {object} options - Request options
   * @returns {Promise<object>} Response
   */
  async put(url, data, options = {}) {
    return this.request('PUT', url, data, options);
  }

  /**
   * PATCH request
   * @param {string} url - Request URL
   * @param {object} data - Request body
   * @param {object} options - Request options
   * @returns {Promise<object>} Response
   */
  async patch(url, data, options = {}) {
    return this.request('PATCH', url, data, options);
  }

  /**
   * DELETE request
   * @param {string} url - Request URL
   * @param {object} options - Request options
   * @returns {Promise<object>} Response
   */
  async delete(url, options = {}) {
    return this.request('DELETE', url, null, options);
  }

  /**
   * Test if endpoint is successful (2xx status)
   * @param {object} response - Normalized response
   * @returns {boolean} True if successful
   */
  isSuccess(response) {
    return response.status >= 200 && response.status < 300;
  }

  /**
   * Test if response has expected data structure
   * @param {object} response - Normalized response
   * @param {array} requiredFields - Required fields in response.data
   * @returns {boolean} True if all fields present
   */
  hasRequiredFields(response, requiredFields = []) {
    if (!response.data) return false;

    for (const field of requiredFields) {
      if (!(field in response.data)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Sleep/wait utility
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise<void>}
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default HttpClient;
