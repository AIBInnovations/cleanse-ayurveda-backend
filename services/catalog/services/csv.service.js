/**
 * CSV Service for bulk import/export operations
 * Provides utilities for parsing and generating CSV data
 */

/**
 * Default CSV options
 */
const DEFAULT_DELIMITER = ",";
const DEFAULT_LINE_TERMINATOR = "\n";

/**
 * Escapes a CSV field value
 * @param {any} value - Value to escape
 * @returns {string} - Escaped CSV field
 */
const escapeField = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  // Check if the value needs to be quoted
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    // Escape double quotes by doubling them
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

/**
 * Parses a CSV line into an array of values
 * @param {string} line - CSV line to parse
 * @param {string} delimiter - Field delimiter
 * @returns {string[]} - Array of field values
 */
const parseLine = (line, delimiter = DEFAULT_DELIMITER) => {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }

  // Add the last field
  fields.push(current.trim());

  return fields;
};

/**
 * Parses CSV string into an array of objects
 * @param {string} csvString - CSV content as string
 * @param {object} options - Parsing options
 * @param {string} options.delimiter - Field delimiter (default: ,)
 * @param {boolean} options.hasHeader - Whether first row is header (default: true)
 * @param {string[]} options.headers - Custom headers (overrides first row)
 * @returns {object} - { headers: string[], data: object[], errors: object[] }
 */
export const parseCSV = (csvString, options = {}) => {
  const { delimiter = DEFAULT_DELIMITER, hasHeader = true, headers: customHeaders } = options;

  const errors = [];
  const lines = csvString
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { headers: [], data: [], errors: [{ row: 0, message: "CSV is empty" }] };
  }

  let headers = customHeaders;
  let dataStartIndex = 0;

  if (!headers) {
    if (hasHeader) {
      headers = parseLine(lines[0], delimiter);
      dataStartIndex = 1;
    } else {
      // Generate numbered headers
      const firstLineFields = parseLine(lines[0], delimiter);
      headers = firstLineFields.map((_, index) => `column_${index + 1}`);
    }
  }

  const data = [];

  for (let i = dataStartIndex; i < lines.length; i++) {
    const lineNumber = i + 1;

    try {
      const fields = parseLine(lines[i], delimiter);

      if (fields.length !== headers.length) {
        errors.push({
          row: lineNumber,
          message: `Expected ${headers.length} fields, got ${fields.length}`,
        });
        continue;
      }

      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = fields[index];
      });

      data.push(obj);
    } catch (err) {
      errors.push({
        row: lineNumber,
        message: err.message,
      });
    }
  }

  return { headers, data, errors };
};

/**
 * Generates CSV string from an array of objects
 * @param {object[]} data - Array of objects to convert to CSV
 * @param {object} options - Generation options
 * @param {string[]} options.headers - Column headers (keys to include)
 * @param {object} options.headerLabels - Map of key to display label
 * @param {string} options.delimiter - Field delimiter (default: ,)
 * @returns {string} - CSV string
 */
export const generateCSV = (data, options = {}) => {
  const {
    headers,
    headerLabels = {},
    delimiter = DEFAULT_DELIMITER,
  } = options;

  if (!data || data.length === 0) {
    return "";
  }

  // Determine headers from first object if not provided
  const columns = headers || Object.keys(data[0]);

  // Build header row
  const headerRow = columns
    .map((col) => escapeField(headerLabels[col] || col))
    .join(delimiter);

  // Build data rows
  const dataRows = data.map((row) => {
    return columns.map((col) => escapeField(row[col])).join(delimiter);
  });

  return [headerRow, ...dataRows].join(DEFAULT_LINE_TERMINATOR);
};

/**
 * Validates CSV data against a schema
 * @param {object[]} data - Parsed CSV data
 * @param {object} schema - Validation schema
 * @param {string[]} schema.required - Required fields
 * @param {object} schema.types - Field type mapping (string, number, boolean, date)
 * @param {object} schema.validators - Custom validators { field: (value) => boolean }
 * @returns {object} - { valid: object[], invalid: object[] }
 */
export const validateCSVData = (data, schema) => {
  const { required = [], types = {}, validators = {} } = schema;
  const valid = [];
  const invalid = [];

  data.forEach((row, index) => {
    const rowNumber = index + 1;
    const errors = [];

    // Check required fields
    for (const field of required) {
      if (!row[field] || row[field].trim() === "") {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Check types
    for (const [field, type] of Object.entries(types)) {
      const value = row[field];
      if (value === undefined || value === "") continue;

      switch (type) {
        case "number":
          if (isNaN(parseFloat(value))) {
            errors.push(`Invalid number for field: ${field}`);
          }
          break;
        case "boolean":
          if (!["true", "false", "1", "0", "yes", "no"].includes(value.toLowerCase())) {
            errors.push(`Invalid boolean for field: ${field}`);
          }
          break;
        case "date":
          if (isNaN(Date.parse(value))) {
            errors.push(`Invalid date for field: ${field}`);
          }
          break;
      }
    }

    // Run custom validators
    for (const [field, validator] of Object.entries(validators)) {
      const value = row[field];
      if (value !== undefined && value !== "" && !validator(value)) {
        errors.push(`Validation failed for field: ${field}`);
      }
    }

    if (errors.length > 0) {
      invalid.push({ row: rowNumber, data: row, errors });
    } else {
      valid.push(row);
    }
  });

  return { valid, invalid };
};

/**
 * Transforms CSV row data based on field mappings
 * @param {object[]} data - Parsed CSV data
 * @param {object} transformers - Map of field to transformer function
 * @returns {object[]} - Transformed data
 *
 * @example
 * const transformers = {
 *   price: (val) => parseFloat(val),
 *   isActive: (val) => val.toLowerCase() === 'true',
 *   tags: (val) => val.split(';').map(t => t.trim())
 * };
 */
export const transformCSVData = (data, transformers) => {
  return data.map((row) => {
    const transformed = { ...row };

    for (const [field, transformer] of Object.entries(transformers)) {
      if (transformed[field] !== undefined) {
        transformed[field] = transformer(transformed[field]);
      }
    }

    return transformed;
  });
};

/**
 * Common field transformers
 */
export const TRANSFORMERS = {
  toNumber: (val) => (val === "" ? null : parseFloat(val)),
  toInteger: (val) => (val === "" ? null : parseInt(val, 10)),
  toBoolean: (val) => ["true", "1", "yes"].includes(String(val).toLowerCase()),
  toArray: (val, separator = ";") =>
    val ? val.split(separator).map((v) => v.trim()).filter((v) => v) : [],
  toDate: (val) => (val ? new Date(val) : null),
  toLowerCase: (val) => (val ? String(val).toLowerCase() : ""),
  toUpperCase: (val) => (val ? String(val).toUpperCase() : ""),
  trim: (val) => (val ? String(val).trim() : ""),
};

/**
 * Generates a template CSV with headers only
 * @param {string[]} headers - Column headers
 * @param {object} headerLabels - Map of key to display label
 * @returns {string} - CSV string with headers only
 */
export const generateCSVTemplate = (headers, headerLabels = {}) => {
  return headers.map((h) => escapeField(headerLabels[h] || h)).join(DEFAULT_DELIMITER);
};

/**
 * Product CSV field mappings
 */
export const PRODUCT_CSV_FIELDS = {
  headers: [
    "name",
    "slug",
    "shortDescription",
    "description",
    "productType",
    "status",
    "brand",
    "tags",
    "skinType",
    "isFeatured",
  ],
  labels: {
    name: "Product Name",
    slug: "Slug",
    shortDescription: "Short Description",
    description: "Description",
    productType: "Product Type",
    status: "Status",
    brand: "Brand ID",
    tags: "Tags (semicolon separated)",
    skinType: "Skin Type (semicolon separated)",
    isFeatured: "Is Featured",
  },
  required: ["name"],
  transformers: {
    tags: TRANSFORMERS.toArray,
    skinType: TRANSFORMERS.toArray,
    isFeatured: TRANSFORMERS.toBoolean,
    name: TRANSFORMERS.trim,
    slug: TRANSFORMERS.toLowerCase,
  },
};

/**
 * Brand CSV field mappings
 */
export const BRAND_CSV_FIELDS = {
  headers: ["name", "slug", "description", "website", "isActive"],
  labels: {
    name: "Brand Name",
    slug: "Slug",
    description: "Description",
    website: "Website URL",
    isActive: "Is Active",
  },
  required: ["name"],
  transformers: {
    isActive: TRANSFORMERS.toBoolean,
    name: TRANSFORMERS.trim,
    slug: TRANSFORMERS.toLowerCase,
  },
};

/**
 * Category CSV field mappings
 */
export const CATEGORY_CSV_FIELDS = {
  headers: ["name", "slug", "description", "parentSlug", "sortOrder", "isActive"],
  labels: {
    name: "Category Name",
    slug: "Slug",
    description: "Description",
    parentSlug: "Parent Category Slug",
    sortOrder: "Sort Order",
    isActive: "Is Active",
  },
  required: ["name"],
  transformers: {
    sortOrder: TRANSFORMERS.toInteger,
    isActive: TRANSFORMERS.toBoolean,
    name: TRANSFORMERS.trim,
    slug: TRANSFORMERS.toLowerCase,
  },
};

/**
 * Ingredient CSV field mappings
 */
export const INGREDIENT_CSV_FIELDS = {
  headers: ["name", "slug", "description", "benefits", "source", "isActive"],
  labels: {
    name: "Ingredient Name",
    slug: "Slug",
    description: "Description",
    benefits: "Benefits (semicolon separated)",
    source: "Source",
    isActive: "Is Active",
  },
  required: ["name"],
  transformers: {
    benefits: TRANSFORMERS.toArray,
    isActive: TRANSFORMERS.toBoolean,
    name: TRANSFORMERS.trim,
    slug: TRANSFORMERS.toLowerCase,
  },
};

export default {
  parseCSV,
  generateCSV,
  validateCSVData,
  transformCSVData,
  generateCSVTemplate,
  TRANSFORMERS,
  PRODUCT_CSV_FIELDS,
  BRAND_CSV_FIELDS,
  CATEGORY_CSV_FIELDS,
  INGREDIENT_CSV_FIELDS,
};
