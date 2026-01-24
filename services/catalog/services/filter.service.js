/**
 * Filter Service for building MongoDB query filters
 * Provides utilities for constructing complex filter queries from request parameters
 */

import mongoose from "mongoose";

const { ObjectId } = mongoose.Types;

/**
 * Checks if a string is a valid MongoDB ObjectId
 * @param {string} id - String to check
 * @returns {boolean} - True if valid ObjectId
 */
const isValidObjectId = (id) => {
  return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
};

/**
 * Filter type handlers for building MongoDB queries
 */
const FILTER_HANDLERS = {
  /**
   * Handles boolean filter values
   */
  boolean: (value) => {
    if (typeof value === "boolean") return value;
    return value === "true" || value === "1" || value === "yes";
  },

  /**
   * Handles string filter values (exact match)
   */
  string: (value) => String(value),

  /**
   * Handles string filter values (case-insensitive regex)
   */
  stringLike: (value) => ({ $regex: value, $options: "i" }),

  /**
   * Handles MongoDB ObjectId values
   */
  objectId: (value) => {
    if (isValidObjectId(value)) {
      return new ObjectId(value);
    }
    return value;
  },

  /**
   * Handles number filter values
   */
  number: (value) => parseFloat(value),

  /**
   * Handles integer filter values
   */
  integer: (value) => parseInt(value, 10),

  /**
   * Handles array filter values (matches any value in array)
   */
  array: (value) => {
    if (Array.isArray(value)) {
      return { $in: value };
    }
    return { $in: String(value).split(",").map((v) => v.trim()) };
  },

  /**
   * Handles array filter values with ObjectIds
   */
  arrayObjectId: (value) => {
    let arr = Array.isArray(value) ? value : String(value).split(",").map((v) => v.trim());
    arr = arr.filter(isValidObjectId).map((id) => new ObjectId(id));
    return { $in: arr };
  },

  /**
   * Handles date filter values
   */
  date: (value) => new Date(value),

  /**
   * Handles date range - greater than or equal
   */
  dateGte: (value) => ({ $gte: new Date(value) }),

  /**
   * Handles date range - less than or equal
   */
  dateLte: (value) => ({ $lte: new Date(value) }),

  /**
   * Handles number range - greater than or equal
   */
  numberGte: (value) => ({ $gte: parseFloat(value) }),

  /**
   * Handles number range - less than or equal
   */
  numberLte: (value) => ({ $lte: parseFloat(value) }),

  /**
   * Handles number range - greater than
   */
  numberGt: (value) => ({ $gt: parseFloat(value) }),

  /**
   * Handles number range - less than
   */
  numberLt: (value) => ({ $lt: parseFloat(value) }),
};

/**
 * Builds MongoDB filter query from request query params
 * @param {object} query - Express request query object
 * @param {object} filterConfig - Configuration for allowed filters
 * @returns {object} - MongoDB filter object
 *
 * @example
 * const filterConfig = {
 *   isActive: { type: 'boolean', field: 'isActive' },
 *   status: { type: 'string' },
 *   brand: { type: 'objectId' },
 *   tags: { type: 'array' },
 *   minPrice: { type: 'numberGte', field: 'price' },
 *   maxPrice: { type: 'numberLte', field: 'price' },
 *   search: { type: 'stringLike', field: 'name' }
 * };
 * const filter = buildFilter(req.query, filterConfig);
 */
export const buildFilter = (query, filterConfig) => {
  const filter = {};

  for (const [queryKey, config] of Object.entries(filterConfig)) {
    const value = query[queryKey];

    if (value === undefined || value === "" || value === null) {
      continue;
    }

    const type = typeof config === "string" ? config : config.type;
    const field = typeof config === "object" && config.field ? config.field : queryKey;

    const handler = FILTER_HANDLERS[type];
    if (!handler) {
      console.log(`Unknown filter type: ${type}`);
      continue;
    }

    const processedValue = handler(value);

    // Handle range filters that may target the same field
    if (typeof processedValue === "object" && processedValue !== null) {
      if (processedValue.$gte !== undefined || processedValue.$lte !== undefined ||
          processedValue.$gt !== undefined || processedValue.$lt !== undefined) {
        // Merge with existing range filter on same field
        filter[field] = { ...filter[field], ...processedValue };
      } else {
        filter[field] = processedValue;
      }
    } else {
      filter[field] = processedValue;
    }
  }

  return filter;
};

/**
 * Adds soft delete filter to query
 * @param {object} filter - Existing filter object
 * @param {boolean} includeDeleted - Whether to include soft-deleted items
 * @returns {object} - Filter with soft delete condition
 */
export const withSoftDelete = (filter, includeDeleted = false) => {
  if (includeDeleted) {
    return filter;
  }
  return { ...filter, deletedAt: null };
};

/**
 * Adds active status filter
 * @param {object} filter - Existing filter object
 * @param {boolean} activeOnly - Whether to filter only active items
 * @returns {object} - Filter with active condition
 */
export const withActiveOnly = (filter, activeOnly = true) => {
  if (!activeOnly) {
    return filter;
  }
  return { ...filter, isActive: true };
};

/**
 * Builds text search query
 * @param {string} searchTerm - Search term
 * @returns {object|null} - Text search query or null
 */
export const buildTextSearch = (searchTerm) => {
  if (!searchTerm || searchTerm.trim() === "") {
    return null;
  }
  return { $text: { $search: searchTerm.trim() } };
};

/**
 * Builds regex search for a specific field
 * @param {string} field - Field name to search
 * @param {string} searchTerm - Search term
 * @param {object} options - Regex options
 * @returns {object|null} - Regex search query or null
 */
export const buildRegexSearch = (field, searchTerm, options = { caseInsensitive: true }) => {
  if (!searchTerm || searchTerm.trim() === "") {
    return null;
  }

  const regexOptions = options.caseInsensitive ? "i" : "";
  return { [field]: { $regex: searchTerm.trim(), $options: regexOptions } };
};

/**
 * Builds OR condition for multiple field search
 * @param {string[]} fields - Fields to search in
 * @param {string} searchTerm - Search term
 * @returns {object|null} - OR query or null
 */
export const buildMultiFieldSearch = (fields, searchTerm) => {
  if (!searchTerm || searchTerm.trim() === "" || !fields || fields.length === 0) {
    return null;
  }

  const term = searchTerm.trim();
  const conditions = fields.map((field) => ({
    [field]: { $regex: term, $options: "i" },
  }));

  return { $or: conditions };
};

/**
 * Combines multiple filters with AND logic
 * @param {...object} filters - Filter objects to combine
 * @returns {object} - Combined filter
 */
export const combineFilters = (...filters) => {
  const combined = {};

  for (const filter of filters) {
    if (filter && typeof filter === "object") {
      for (const [key, value] of Object.entries(filter)) {
        if (key === "$or" || key === "$and") {
          // Handle logical operators
          combined[key] = combined[key] ? [...combined[key], ...value] : value;
        } else if (combined[key] && typeof combined[key] === "object" && typeof value === "object") {
          // Merge range operators
          combined[key] = { ...combined[key], ...value };
        } else {
          combined[key] = value;
        }
      }
    }
  }

  return combined;
};

/**
 * Common filter configurations for catalog entities
 */
export const COMMON_FILTERS = {
  /**
   * Product filters
   */
  product: {
    status: { type: "string" },
    productType: { type: "string" },
    brand: { type: "objectId" },
    isFeatured: { type: "boolean" },
    tags: { type: "array" },
    skinType: { type: "array" },
  },

  /**
   * Brand filters
   */
  brand: {
    isActive: { type: "boolean" },
    search: { type: "stringLike", field: "name" },
  },

  /**
   * Category filters
   */
  category: {
    isActive: { type: "boolean" },
    parent: { type: "objectId" },
    search: { type: "stringLike", field: "name" },
  },

  /**
   * Ingredient filters
   */
  ingredient: {
    isActive: { type: "boolean" },
    search: { type: "stringLike", field: "name" },
  },

  /**
   * Variant filters
   */
  variant: {
    isActive: { type: "boolean" },
    isDefault: { type: "boolean" },
    minPrice: { type: "numberGte", field: "salePrice" },
    maxPrice: { type: "numberLte", field: "salePrice" },
    inStock: { type: "boolean", field: "stockQuantity" },
  },

  /**
   * Collection filters
   */
  collection: {
    isActive: { type: "boolean" },
    type: { type: "string" },
    search: { type: "stringLike", field: "name" },
  },

  /**
   * Bundle filters
   */
  bundle: {
    isActive: { type: "boolean" },
    pricingType: { type: "string" },
    search: { type: "stringLike", field: "name" },
  },
};

export default {
  buildFilter,
  withSoftDelete,
  withActiveOnly,
  buildTextSearch,
  buildRegexSearch,
  buildMultiFieldSearch,
  combineFilters,
  COMMON_FILTERS,
  FILTER_HANDLERS,
};
