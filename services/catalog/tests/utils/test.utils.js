/**
 * Testing utilities for the Catalog Service
 * Provides helpers for API testing, assertions, and test data generation
 */

/**
 * Base URL for API testing
 */
const BASE_URL = process.env.TEST_API_URL || "http://localhost:3000/api";

/**
 * Makes an HTTP request to the API
 * @param {string} method - HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @param {string} endpoint - API endpoint (e.g., "/brands")
 * @param {object} options - Request options
 * @param {object} options.body - Request body for POST/PUT/PATCH
 * @param {object} options.query - Query parameters
 * @param {object} options.headers - Additional headers
 * @returns {Promise<object>} - { status, data, headers, ok }
 */
export const apiRequest = async (method, endpoint, options = {}) => {
  const { body, query, headers = {} } = options;

  let url = `${BASE_URL}${endpoint}`;

  // Add query parameters
  if (query && Object.keys(query).length > 0) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, v));
        } else {
          params.append(key, value);
        }
      }
    }
    url += `?${params.toString()}`;
  }

  const fetchOptions = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body && ["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
    fetchOptions.body = JSON.stringify(body);
  }

  console.log(`> [TEST] ${method} ${url}`);
  if (body) {
    console.log(`> [TEST] Body:`, JSON.stringify(body, null, 2));
  }

  const response = await fetch(url, fetchOptions);
  const data = await response.json();

  console.log(`> [TEST] Response ${response.status}:`, JSON.stringify(data, null, 2));

  return {
    status: response.status,
    data,
    headers: response.headers,
    ok: response.ok,
  };
};

/**
 * HTTP method shortcuts
 */
export const api = {
  get: (endpoint, query) => apiRequest("GET", endpoint, { query }),
  post: (endpoint, body) => apiRequest("POST", endpoint, { body }),
  put: (endpoint, body) => apiRequest("PUT", endpoint, { body }),
  patch: (endpoint, body) => apiRequest("PATCH", endpoint, { body }),
  delete: (endpoint) => apiRequest("DELETE", endpoint),
};

/**
 * Assertion helpers
 */
export const assert = {
  /**
   * Assert response status code
   */
  status: (response, expected) => {
    if (response.status !== expected) {
      throw new Error(`Expected status ${expected}, got ${response.status}`);
    }
    console.log(`  [PASS] Status is ${expected}`);
    return true;
  },

  /**
   * Assert response has data
   */
  hasData: (response) => {
    if (!response.data || response.data.data === null) {
      throw new Error("Expected response to have data");
    }
    console.log(`  [PASS] Response has data`);
    return true;
  },

  /**
   * Assert response has error
   */
  hasError: (response) => {
    if (!response.data || response.data.error === null) {
      throw new Error("Expected response to have error");
    }
    console.log(`  [PASS] Response has error`);
    return true;
  },

  /**
   * Assert response data contains key
   */
  dataHasKey: (response, key) => {
    if (!response.data?.data || !(key in response.data.data)) {
      throw new Error(`Expected data to have key "${key}"`);
    }
    console.log(`  [PASS] Data has key "${key}"`);
    return true;
  },

  /**
   * Assert response data value equals expected
   */
  dataEquals: (response, key, expected) => {
    const actual = response.data?.data?.[key];
    if (actual !== expected) {
      throw new Error(`Expected data.${key} to be "${expected}", got "${actual}"`);
    }
    console.log(`  [PASS] data.${key} equals "${expected}"`);
    return true;
  },

  /**
   * Assert array length
   */
  arrayLength: (response, key, expectedLength) => {
    const arr = response.data?.data?.[key];
    if (!Array.isArray(arr)) {
      throw new Error(`Expected data.${key} to be an array`);
    }
    if (arr.length !== expectedLength) {
      throw new Error(`Expected array length ${expectedLength}, got ${arr.length}`);
    }
    console.log(`  [PASS] Array "${key}" has length ${expectedLength}`);
    return true;
  },

  /**
   * Assert array is not empty
   */
  arrayNotEmpty: (response, key) => {
    const arr = response.data?.data?.[key];
    if (!Array.isArray(arr) || arr.length === 0) {
      throw new Error(`Expected data.${key} to be a non-empty array`);
    }
    console.log(`  [PASS] Array "${key}" is not empty (${arr.length} items)`);
    return true;
  },

  /**
   * Assert pagination exists
   */
  hasPagination: (response) => {
    const pagination = response.data?.data?.pagination;
    if (!pagination) {
      throw new Error("Expected response to have pagination");
    }
    if (!("page" in pagination) || !("limit" in pagination) || !("total" in pagination)) {
      throw new Error("Pagination missing required fields");
    }
    console.log(`  [PASS] Has pagination (page: ${pagination.page}, total: ${pagination.total})`);
    return true;
  },

  /**
   * Assert message equals
   */
  messageEquals: (response, expected) => {
    if (response.data?.message !== expected) {
      throw new Error(`Expected message "${expected}", got "${response.data?.message}"`);
    }
    console.log(`  [PASS] Message equals "${expected}"`);
    return true;
  },

  /**
   * Assert true condition
   */
  isTrue: (condition, message) => {
    if (!condition) {
      throw new Error(message || "Assertion failed");
    }
    console.log(`  [PASS] ${message || "Condition is true"}`);
    return true;
  },
};

/**
 * Test runner
 */
export class TestRunner {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      errors: [],
    };
  }

  /**
   * Add a test case
   * @param {string} description - Test description
   * @param {function} testFn - Async test function
   */
  test(description, testFn) {
    this.tests.push({ description, testFn });
  }

  /**
   * Run all tests
   */
  async run() {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Running: ${this.name}`);
    console.log(`${"=".repeat(60)}\n`);

    for (const { description, testFn } of this.tests) {
      console.log(`\nTest: ${description}`);
      console.log(`${"-".repeat(40)}`);

      try {
        await testFn();
        this.results.passed++;
        console.log(`[PASSED] ${description}\n`);
      } catch (error) {
        this.results.failed++;
        this.results.errors.push({ description, error: error.message });
        console.log(`[FAILED] ${description}`);
        console.log(`  Error: ${error.message}\n`);
      }
    }

    this.printSummary();
    return this.results;
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Summary: ${this.name}`);
    console.log(`${"=".repeat(60)}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Total:  ${this.tests.length}`);

    if (this.results.errors.length > 0) {
      console.log(`\nFailures:`);
      this.results.errors.forEach(({ description, error }) => {
        console.log(`  - ${description}: ${error}`);
      });
    }

    console.log(`\n`);
  }
}

/**
 * Test data generators
 */
export const generate = {
  /**
   * Generate unique string
   */
  unique: (prefix = "test") => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

  /**
   * Generate brand data
   */
  brand: (overrides = {}) => ({
    name: generate.unique("Brand"),
    description: "Test brand description",
    website: "https://example.com",
    isActive: true,
    ...overrides,
  }),

  /**
   * Generate ingredient data
   */
  ingredient: (overrides = {}) => ({
    name: generate.unique("Ingredient"),
    description: "Test ingredient description",
    benefits: ["Benefit 1", "Benefit 2"],
    source: "Natural",
    isActive: true,
    ...overrides,
  }),

  /**
   * Generate category data
   */
  category: (overrides = {}) => ({
    name: generate.unique("Category"),
    description: "Test category description",
    isActive: true,
    ...overrides,
  }),

  /**
   * Generate product data
   */
  product: (brandId, overrides = {}) => ({
    name: generate.unique("Product"),
    shortDescription: "Short description",
    description: "Full product description",
    productType: "simple",
    status: "active",
    brand: brandId,
    tags: ["test", "sample"],
    skinType: ["normal", "oily"],
    isFeatured: false,
    ...overrides,
  }),

  /**
   * Generate variant data
   */
  variant: (productId, overrides = {}) => ({
    product: productId,
    name: generate.unique("Variant"),
    sku: generate.unique("SKU"),
    mrp: 1000,
    salePrice: 800,
    costPrice: 500,
    stockQuantity: 100,
    isActive: true,
    isDefault: false,
    ...overrides,
  }),

  /**
   * Generate collection data
   */
  collection: (overrides = {}) => ({
    name: generate.unique("Collection"),
    description: "Test collection description",
    type: "manual",
    isActive: true,
    ...overrides,
  }),

  /**
   * Generate bundle data
   */
  bundle: (items = [], overrides = {}) => ({
    name: generate.unique("Bundle"),
    description: "Test bundle description",
    items,
    pricingType: "fixed",
    fixedPrice: 1500,
    isActive: true,
    ...overrides,
  }),

  /**
   * Generate synonym data
   */
  synonym: (overrides = {}) => ({
    term: generate.unique("term").toLowerCase(),
    synonyms: ["synonym1", "synonym2"],
    isActive: true,
    ...overrides,
  }),
};

/**
 * Delay helper
 * @param {number} ms - Milliseconds to wait
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Clean up test data
 * @param {string} endpoint - API endpoint for deletion
 * @param {string} id - Resource ID to delete
 */
export const cleanup = async (endpoint, id) => {
  try {
    await api.delete(`${endpoint}/${id}`);
    console.log(`  [CLEANUP] Deleted ${endpoint}/${id}`);
  } catch (error) {
    console.log(`  [CLEANUP] Failed to delete ${endpoint}/${id}: ${error.message}`);
  }
};

export default {
  apiRequest,
  api,
  assert,
  TestRunner,
  generate,
  delay,
  cleanup,
};
