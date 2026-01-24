/**
 * Builds MongoDB filter query from request query params
 * @param {object} query - Express request query object
 * @param {object} allowedFilters - Map of allowed filter keys to their types
 * @returns {object} - MongoDB filter object
 *
 * @example
 * const allowedFilters = {
 *   isActive: 'boolean',
 *   status: 'string',
 *   brand: 'objectId',
 *   tags: 'array',
 *   minPrice: 'number',
 *   maxPrice: 'number'
 * };
 */
export const buildFilterQuery = (query, allowedFilters) => {
  const filter = {};

  for (const [key, type] of Object.entries(allowedFilters)) {
    if (query[key] === undefined || query[key] === "") continue;

    const value = query[key];

    switch (type) {
      case "boolean":
        filter[key] = value === "true" || value === true;
        break;

      case "string":
        filter[key] = value;
        break;

      case "objectId":
        filter[key] = value;
        break;

      case "array":
        if (Array.isArray(value)) {
          filter[key] = { $in: value };
        } else {
          filter[key] = { $in: value.split(",").map((v) => v.trim()) };
        }
        break;

      case "number":
        filter[key] = parseFloat(value);
        break;

      default:
        filter[key] = value;
    }
  }

  return filter;
};

/**
 * Builds MongoDB sort object from request query
 * @param {object} query - Express request query object
 * @param {object} allowedSorts - Map of allowed sort keys to their field names
 * @param {string} defaultSort - Default sort field
 * @param {string} defaultOrder - Default sort order (asc/desc)
 * @returns {object} - MongoDB sort object
 *
 * @example
 * const allowedSorts = {
 *   name: 'name',
 *   createdAt: 'createdAt',
 *   price: 'salePrice'
 * };
 */
export const buildSortQuery = (
  query,
  allowedSorts,
  defaultSort = "createdAt",
  defaultOrder = "desc"
) => {
  const sortField = query.sortBy || defaultSort;
  const sortOrder = query.order === "asc" ? 1 : -1;

  if (allowedSorts[sortField]) {
    return { [allowedSorts[sortField]]: sortOrder };
  }

  return { [defaultSort]: defaultOrder === "asc" ? 1 : -1 };
};

/**
 * Builds text search query
 * @param {string} searchTerm - Search term from query
 * @returns {object|null} - MongoDB text search query or null
 */
export const buildSearchQuery = (searchTerm) => {
  if (!searchTerm || searchTerm.trim() === "") {
    return null;
  }

  return { $text: { $search: searchTerm.trim() } };
};

export default {
  buildFilterQuery,
  buildSortQuery,
  buildSearchQuery,
};
