/**
 * Sort Service for building MongoDB sort queries
 * Provides utilities for constructing sort configurations from request parameters
 */

/**
 * Sort direction values
 */
export const SORT_DIRECTION = {
  ASC: 1,
  DESC: -1,
};

/**
 * Parses sort direction from string
 * @param {string} direction - Sort direction string (asc/desc)
 * @returns {number} - MongoDB sort direction (1 or -1)
 */
const parseDirection = (direction) => {
  if (!direction) return SORT_DIRECTION.DESC;
  const normalized = String(direction).toLowerCase();
  return normalized === "asc" || normalized === "1" ? SORT_DIRECTION.ASC : SORT_DIRECTION.DESC;
};

/**
 * Builds MongoDB sort object from request query
 * @param {object} query - Express request query object
 * @param {object} sortConfig - Sort configuration
 * @param {object} sortConfig.allowed - Map of allowed sort keys to field names
 * @param {string} sortConfig.default - Default sort field key
 * @param {string} sortConfig.defaultDirection - Default sort direction (asc/desc)
 * @param {string} sortConfig.sortKey - Query param key for sort field (default: sortBy)
 * @param {string} sortConfig.orderKey - Query param key for sort order (default: order)
 * @returns {object} - MongoDB sort object
 *
 * @example
 * const sortConfig = {
 *   allowed: { name: 'name', createdAt: 'createdAt', price: 'salePrice' },
 *   default: 'createdAt',
 *   defaultDirection: 'desc'
 * };
 * const sort = buildSort(req.query, sortConfig);
 */
export const buildSort = (query, sortConfig) => {
  const {
    allowed = {},
    default: defaultField = "createdAt",
    defaultDirection = "desc",
    sortKey = "sortBy",
    orderKey = "order",
  } = sortConfig;

  const requestedField = query[sortKey];
  const requestedDirection = query[orderKey];

  // Check if requested sort field is allowed
  let field = allowed[requestedField];
  let direction;

  if (field) {
    direction = parseDirection(requestedDirection);
  } else {
    // Use default
    field = allowed[defaultField] || defaultField;
    direction = parseDirection(defaultDirection);
  }

  return { [field]: direction };
};

/**
 * Builds multi-field sort from comma-separated string
 * @param {string} sortString - Comma-separated sort fields (e.g., "name:asc,createdAt:desc")
 * @param {object} allowedFields - Map of allowed field keys to database field names
 * @param {object} defaultSort - Default sort object
 * @returns {object} - MongoDB sort object
 *
 * @example
 * const sort = buildMultiSort("name:asc,price:desc", { name: 'name', price: 'salePrice' });
 * // Returns: { name: 1, salePrice: -1 }
 */
export const buildMultiSort = (sortString, allowedFields = {}, defaultSort = { createdAt: -1 }) => {
  if (!sortString || typeof sortString !== "string") {
    return defaultSort;
  }

  const sort = {};
  const parts = sortString.split(",").map((s) => s.trim()).filter((s) => s);

  for (const part of parts) {
    const [key, dir] = part.split(":").map((s) => s.trim());

    if (allowedFields[key]) {
      sort[allowedFields[key]] = parseDirection(dir);
    }
  }

  return Object.keys(sort).length > 0 ? sort : defaultSort;
};

/**
 * Builds sort with text score for full-text search
 * @param {object} baseSort - Base sort object
 * @param {boolean} hasTextSearch - Whether query includes text search
 * @returns {object} - Sort object with optional text score
 */
export const buildSortWithScore = (baseSort, hasTextSearch = false) => {
  if (hasTextSearch) {
    return { score: { $meta: "textScore" }, ...baseSort };
  }
  return baseSort;
};

/**
 * Predefined sort options for common use cases
 */
export const SORT_OPTIONS = {
  /**
   * Product sort options
   */
  product: {
    relevance: { score: { $meta: "textScore" } },
    newest: { createdAt: SORT_DIRECTION.DESC },
    oldest: { createdAt: SORT_DIRECTION.ASC },
    nameAsc: { name: SORT_DIRECTION.ASC },
    nameDesc: { name: SORT_DIRECTION.DESC },
    priceAsc: { "pricing.salePrice": SORT_DIRECTION.ASC },
    priceDesc: { "pricing.salePrice": SORT_DIRECTION.DESC },
    rating: { "ratingSummary.average": SORT_DIRECTION.DESC },
  },

  /**
   * Generic sort options
   */
  generic: {
    newest: { createdAt: SORT_DIRECTION.DESC },
    oldest: { createdAt: SORT_DIRECTION.ASC },
    nameAsc: { name: SORT_DIRECTION.ASC },
    nameDesc: { name: SORT_DIRECTION.DESC },
    sortOrder: { sortOrder: SORT_DIRECTION.ASC },
  },

  /**
   * Search result sort options (maps frontend keys to sort objects)
   */
  search: {
    relevance: { score: { $meta: "textScore" } },
    price_asc: { minPrice: SORT_DIRECTION.ASC },
    price_desc: { minPrice: SORT_DIRECTION.DESC },
    rating: { "ratingSummary.average": SORT_DIRECTION.DESC },
    newest: { createdAt: SORT_DIRECTION.DESC },
  },
};

/**
 * Common allowed sort field mappings
 */
export const ALLOWED_SORT_FIELDS = {
  /**
   * Product allowed sorts
   */
  product: {
    name: "name",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    status: "status",
  },

  /**
   * Brand allowed sorts
   */
  brand: {
    name: "name",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },

  /**
   * Category allowed sorts
   */
  category: {
    name: "name",
    sortOrder: "sortOrder",
    createdAt: "createdAt",
  },

  /**
   * Ingredient allowed sorts
   */
  ingredient: {
    name: "name",
    createdAt: "createdAt",
  },

  /**
   * Variant allowed sorts
   */
  variant: {
    name: "name",
    sku: "sku",
    price: "salePrice",
    sortOrder: "sortOrder",
    createdAt: "createdAt",
  },

  /**
   * Collection allowed sorts
   */
  collection: {
    name: "name",
    sortOrder: "sortOrder",
    createdAt: "createdAt",
  },

  /**
   * Bundle allowed sorts
   */
  bundle: {
    name: "name",
    createdAt: "createdAt",
    validFrom: "validFrom",
    validTo: "validTo",
  },
};

/**
 * Gets sort object from predefined sort options
 * @param {string} sortKey - Sort option key (e.g., "newest", "price_asc")
 * @param {string} optionSet - Which option set to use (product, generic, search)
 * @param {object} defaultSort - Default sort if key not found
 * @returns {object} - MongoDB sort object
 */
export const getSortFromOption = (sortKey, optionSet = "generic", defaultSort = { createdAt: -1 }) => {
  const options = SORT_OPTIONS[optionSet];
  if (!options) {
    return defaultSort;
  }

  return options[sortKey] || defaultSort;
};

/**
 * Creates a sort configuration helper for a specific entity
 * @param {string} entity - Entity name (product, brand, category, etc.)
 * @returns {function} - Function that builds sort from query
 *
 * @example
 * const productSorter = createEntitySorter('product');
 * const sort = productSorter(req.query);
 */
export const createEntitySorter = (entity) => {
  const allowedFields = ALLOWED_SORT_FIELDS[entity] || {};

  return (query, defaultField = "createdAt", defaultDirection = "desc") => {
    return buildSort(query, {
      allowed: allowedFields,
      default: defaultField,
      defaultDirection,
    });
  };
};

export default {
  buildSort,
  buildMultiSort,
  buildSortWithScore,
  getSortFromOption,
  createEntitySorter,
  SORT_DIRECTION,
  SORT_OPTIONS,
  ALLOWED_SORT_FIELDS,
};
