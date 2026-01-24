import { Router } from "express";
import {
  listProducts,
  getProductBySlug,
  getProductVariants,
  getProductMedia,
  getProductIngredients,
  getProductRelated,
  listAllProducts,
  createProduct,
  getProductById,
  updateProduct,
  updateProductStatus,
  updateProductFlags,
  duplicateProduct,
  deleteProduct,
  bulkUpdateProducts,
  bulkExportProducts,
  bulkImportProducts,
  getProductsMetadata,
  getBulkVariants,
  getProductAvailability,
} from "./product.controller.js";
import {
  downloadCSVTemplate,
  uploadProductsCSV,
  exportProductsCSV
} from "./product-csv.controller.js";
import { validate, uploadSingle } from "@shared/middlewares";
import { authenticateAdmin } from "@shared/auth-middleware";
import {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  productSlugParamSchema,
  listProductsQuerySchema,
  listProductsAdminQuerySchema,
  updateProductStatusSchema,
  updateProductFlagsSchema,
  duplicateProductSchema,
  bulkUpdateProductsSchema,
  productSubResourceSchema,
  productRelatedQuerySchema,
} from "./product.validation.js";

const consumerRouter = Router();
const adminRouter = Router();

/**
 * Consumer Routes
 */

/**
 * @route GET /api/products
 * @description List products with filters (PLP)
 * @access Public
 *
 * @queryParams
 * - page (number): Page number, default 1
 * - limit (number): Items per page, default 20, max 50
 * - search (string): Search term
 * - category (string): Category slug
 * - brand (string): Brand ID
 * - minPrice, maxPrice (number): Price range
 * - skinType (string|array): Skin type filter
 * - concerns (string|array): Concerns filter
 * - tags (string|array): Tags filter
 * - isFeatured, isBestseller, isNewArrival (string): Boolean flags ("true"/"false")
 * - sortBy (string): Sort field ("name", "createdAt", "price")
 * - order (string): Sort order ("asc", "desc")
 *
 * @example Request
 * GET /api/products?category=skincare&skinType=oily&sortBy=name&order=asc
 *
 * @responseBody Success (200)
 * {
 *   "message": "Products fetched successfully",
 *   "data": {
 *     "products": [
 *       {
 *         "_id": "...",
 *         "name": "Aloe Face Wash",
 *         "slug": "aloe-face-wash",
 *         "shortDescription": "...",
 *         "brand": { "_id": "...", "name": "...", "slug": "..." },
 *         "primaryImage": { "url": "...", "altText": "..." },
 *         "pricing": { "mrp": 499, "salePrice": 399, "discountPercent": 20 }
 *       }
 *     ],
 *     "pagination": { "total": 100, "page": 1, "limit": 20, "totalPages": 5, "hasNextPage": true, "hasPrevPage": false }
 *   },
 *   "error": null
 * }
 */
consumerRouter.get("/", validate(listProductsQuerySchema), listProducts);

/**
 * @route POST /api/products/metadata
 * @description Get metadata for multiple products (for Order service integration)
 * @access Public
 */
consumerRouter.post("/metadata", getProductsMetadata);

/**
 * @route POST /api/variants/bulk
 * @description Get variants for multiple products (for Order service integration)
 * @access Public
 */
consumerRouter.post("/variants/bulk", getBulkVariants);

/**
 * @route GET /api/products/:id/availability
 * @description Check if a product is available for purchase
 * @access Public
 */
consumerRouter.get("/:id/availability", getProductAvailability);

/**
 * @route GET /api/products/:slug
 * @description Get product detail (PDP)
 * @access Public
 *
 * @params
 * - slug: Product slug
 *
 * @example Request
 * GET /api/products/aloe-face-wash
 *
 * @responseBody Success (200)
 * {
 *   "message": "Product fetched successfully",
 *   "data": {
 *     "product": {
 *       "_id": "...",
 *       "name": "Aloe Face Wash",
 *       "slug": "aloe-face-wash",
 *       "description": "...",
 *       "shortDescription": "...",
 *       "benefits": ["Hydrating", "Soothing"],
 *       "howToUse": "...",
 *       "brand": { "_id": "...", "name": "...", "slug": "...", "logo": {...} },
 *       "productType": "simple",
 *       "tags": ["face wash"],
 *       "attributes": { "skinType": ["oily"], "concerns": ["acne"] },
 *       "seo": { "title": "...", "description": "...", "keywords": [] },
 *       "ratingSummary": { "average": 4.5, "count": 120 },
 *       "primaryImage": { "url": "...", "altText": "..." },
 *       "pricing": { "mrp": 499, "salePrice": 399, "discountPercent": 20 },
 *       "categories": [{ "_id": "...", "name": "Skincare", "slug": "skincare", "isPrimary": true }]
 *     }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with slug 'xyz' not found" }
 */
consumerRouter.get("/:slug", validate(productSlugParamSchema), getProductBySlug);

/**
 * @route GET /api/products/:slug/variants
 * @description Get product variants
 * @access Public
 *
 * @params
 * - slug: Product slug
 *
 * @example Request
 * GET /api/products/aloe-face-wash/variants
 *
 * @responseBody Success (200)
 * {
 *   "message": "Variants fetched successfully",
 *   "data": {
 *     "variants": [
 *       { "_id": "...", "name": "50ml", "sku": "ALO-FW-50", "variantType": "size", "mrp": 299, "salePrice": 249, "discountPercent": 17, "weight": 50, "isDefault": true, "sortOrder": 0 },
 *       { "_id": "...", "name": "100ml", "sku": "ALO-FW-100", "variantType": "size", "mrp": 499, "salePrice": 399, "discountPercent": 20, "weight": 100, "isDefault": false, "sortOrder": 1 }
 *     ]
 *   },
 *   "error": null
 * }
 */
consumerRouter.get("/:slug/variants", validate(productSubResourceSchema), getProductVariants);

/**
 * @route GET /api/products/:slug/media
 * @description Get product media (images, videos)
 * @access Public
 *
 * @params
 * - slug: Product slug
 *
 * @example Request
 * GET /api/products/aloe-face-wash/media
 *
 * @responseBody Success (200)
 * {
 *   "message": "Media fetched successfully",
 *   "data": {
 *     "media": [
 *       { "_id": "...", "type": "image", "url": "...", "altText": "Front view", "isPrimary": true, "sortOrder": 0, "variant": null, "metadata": { "width": 800, "height": 800 } },
 *       { "_id": "...", "type": "video", "url": "...", "altText": "How to use", "isPrimary": false, "sortOrder": 1, "variant": null, "metadata": {} }
 *     ]
 *   },
 *   "error": null
 * }
 */
consumerRouter.get("/:slug/media", validate(productSubResourceSchema), getProductMedia);

/**
 * @route GET /api/products/:slug/ingredients
 * @description Get product ingredients
 * @access Public
 *
 * @params
 * - slug: Product slug
 *
 * @example Request
 * GET /api/products/aloe-face-wash/ingredients
 *
 * @responseBody Success (200)
 * {
 *   "message": "Ingredients fetched successfully",
 *   "data": {
 *     "ingredients": [
 *       {
 *         "_id": "...",
 *         "ingredient": { "_id": "...", "name": "Aloe Vera", "slug": "aloe-vera", "benefits": ["Hydrating"], "image": {...} },
 *         "percentage": 20,
 *         "isKeyIngredient": true,
 *         "sortOrder": 0
 *       }
 *     ]
 *   },
 *   "error": null
 * }
 */
consumerRouter.get("/:slug/ingredients", validate(productSubResourceSchema), getProductIngredients);

/**
 * @route GET /api/products/:slug/related
 * @description Get related products
 * @access Public
 *
 * @params
 * - slug: Product slug
 *
 * @queryParams
 * - type (string): Relation type ("crossSell", "upSell", "frequentlyBoughtTogether")
 * - limit (number): Max results, default 10, max 20
 *
 * @example Request
 * GET /api/products/aloe-face-wash/related?type=crossSell&limit=5
 *
 * @responseBody Success (200)
 * {
 *   "message": "Related products fetched successfully",
 *   "data": {
 *     "related": {
 *       "crossSell": [{ "_id": "...", "name": "Aloe Toner", "slug": "aloe-toner", "primaryImage": {...}, "pricing": {...} }],
 *       "upSell": [...],
 *       "frequentlyBoughtTogether": [...]
 *     }
 *   },
 *   "error": null
 * }
 */
consumerRouter.get("/:slug/related", validate(productRelatedQuerySchema), getProductRelated);

/**
 * Admin Routes
 */

// Apply admin authentication to all admin routes
adminRouter.use(authenticateAdmin);

/**
 * @route GET /api/admin/products
 * @description List all products with filters
 * @access Admin
 *
 * @queryParams
 * - page (number): Page number, default 1
 * - limit (number): Items per page, default 20, max 100
 * - search (string): Search term
 * - status (string): Filter by status ("draft", "active", "archived")
 * - productType (string): Filter by type ("simple", "variable")
 * - brand (string): Brand ID
 * - category (string): Category slug
 * - isFeatured, isBestseller, isNewArrival (string): Boolean flags
 * - sortBy (string): Sort field ("name", "createdAt", "updatedAt", "status")
 * - order (string): Sort order ("asc", "desc")
 *
 * @example Request
 * GET /api/admin/products?status=active&brand=507f1f77bcf86cd799439011&sortBy=createdAt&order=desc
 *
 * @responseBody Success (200)
 * {
 *   "message": "Products fetched successfully",
 *   "data": {
 *     "products": [...],
 *     "pagination": { "total": 100, "page": 1, "limit": 20, "totalPages": 5, "hasNextPage": true, "hasPrevPage": false }
 *   },
 *   "error": null
 * }
 */
adminRouter.get("/", validate(listProductsAdminQuerySchema), listAllProducts);

/**
 * @route GET /api/admin/products/bulk-export
 * @description Export products as JSON
 * @access Admin
 *
 * @queryParams
 * - status (string): Filter by status
 * - brand (string): Filter by brand ID
 *
 * @example Request
 * GET /api/admin/products/bulk-export?status=active
 *
 * @responseBody Success (200)
 * {
 *   "message": "Products exported successfully",
 *   "data": {
 *     "products": [...],
 *     "exportedAt": "2024-01-01T00:00:00.000Z",
 *     "count": 100
 *   },
 *   "error": null
 * }
 */
adminRouter.get("/bulk-export", bulkExportProducts);

/**
 * @route POST /api/admin/products
 * @description Create a new product
 * @access Admin
 *
 * @requestBody
 * {
 *   "name": "Aloe Face Wash",
 *   "description": "A gentle face wash with aloe vera",
 *   "shortDescription": "Gentle aloe face wash",
 *   "benefits": ["Hydrating", "Soothing", "Gentle"],
 *   "howToUse": "Apply on wet face, massage gently, rinse",
 *   "brand": "507f1f77bcf86cd799439011",
 *   "productType": "simple",
 *   "status": "draft",
 *   "isFeatured": false,
 *   "isBestseller": false,
 *   "isNewArrival": true,
 *   "tags": ["face wash", "aloe", "gentle"],
 *   "attributes": { "skinType": ["oily", "combination"], "concerns": ["acne", "oiliness"] },
 *   "seo": { "title": "Aloe Face Wash", "description": "...", "keywords": ["face wash"] },
 *   "hsnCode": "33049990"
 * }
 *
 * @example Request
 * POST /api/admin/products
 * Content-Type: application/json
 * { "name": "Aloe Face Wash", "brand": "507f1f77bcf86cd799439011" }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Product created successfully",
 *   "data": {
 *     "product": { "_id": "...", "name": "Aloe Face Wash", "slug": "aloe-face-wash", "status": "draft", ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (400)
 * { "message": "Validation failed", "data": null, "error": [{ "field": "name", "message": "Product name is required", "location": "body" }] }
 *
 * @responseBody Error (409)
 * { "message": "Product already exists", "data": null, "error": "A product with name 'Aloe Face Wash' already exists" }
 */
adminRouter.post("/", validate(createProductSchema), createProduct);

/**
 * @route POST /api/admin/products/bulk-import
 * @description Bulk import products
 * @access Admin
 *
 * @requestBody
 * {
 *   "products": [
 *     { "name": "Product 1", "description": "...", "brand": "...", "productType": "simple" },
 *     { "name": "Product 2", "description": "...", "brand": "..." }
 *   ]
 * }
 *
 * @example Request
 * POST /api/admin/products/bulk-import
 * Content-Type: application/json
 * { "products": [{ "name": "Product 1" }, { "name": "Product 2" }] }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Products imported successfully",
 *   "data": {
 *     "created": 5,
 *     "failed": 1,
 *     "errors": [{ "index": 3, "name": "Product 4", "error": "Product already exists" }]
 *   },
 *   "error": null
 * }
 */
adminRouter.post("/bulk-import", bulkImportProducts);

/**
 * @route GET /api/admin/products/csv/template
 * @description Download CSV template for bulk product upload
 * @access Admin
 *
 * @example Request
 * GET /api/admin/products/csv/template
 *
 * @responseBody Success (200)
 * Returns CSV file with sample product data and headers
 */
adminRouter.get("/csv/template", downloadCSVTemplate);

/**
 * @route POST /api/admin/products/csv/upload
 * @description Upload CSV file for bulk product creation/update
 * @access Admin
 *
 * @requestBody
 * Form-data with "file" field containing CSV file
 *
 * @example Request
 * POST /api/admin/products/csv/upload
 * Content-Type: multipart/form-data
 * file: products.csv
 *
 * @responseBody Success (200)
 * {
 *   "message": "CSV upload completed",
 *   "data": {
 *     "summary": {
 *       "total": 10,
 *       "created": 7,
 *       "updated": 2,
 *       "failed": 1
 *     },
 *     "errors": [...]
 *   },
 *   "error": null
 * }
 */
adminRouter.post("/csv/upload", uploadSingle, uploadProductsCSV);

/**
 * @route GET /api/admin/products/csv/export
 * @description Export products to CSV file
 * @access Admin
 *
 * @queryParams
 * - status (string): Filter by status
 * - brand (string): Filter by brand ID
 * - limit (number): Max products to export, default 1000
 *
 * @example Request
 * GET /api/admin/products/csv/export?status=active&limit=500
 *
 * @responseBody Success (200)
 * Returns CSV file with product data
 */
adminRouter.get("/csv/export", exportProductsCSV);

/**
 * @route PATCH /api/admin/products/bulk-update
 * @description Bulk update products
 * @access Admin
 *
 * @requestBody
 * {
 *   "productIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
 *   "updates": { "status": "active", "isFeatured": true }
 * }
 *
 * @example Request
 * PATCH /api/admin/products/bulk-update
 * Content-Type: application/json
 * { "productIds": ["id1", "id2"], "updates": { "status": "active" } }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Products updated successfully",
 *   "data": { "modifiedCount": 2 },
 *   "error": null
 * }
 */
adminRouter.patch("/bulk-update", validate(bulkUpdateProductsSchema), bulkUpdateProducts);

/**
 * @route GET /api/admin/products/:id
 * @description Get product by ID
 * @access Admin
 *
 * @params
 * - id: Product ObjectId
 *
 * @example Request
 * GET /api/admin/products/507f1f77bcf86cd799439011
 *
 * @responseBody Success (200)
 * {
 *   "message": "Product fetched successfully",
 *   "data": {
 *     "product": { "_id": "507f1f77bcf86cd799439011", "name": "Aloe Face Wash", "slug": "aloe-face-wash", ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
adminRouter.get("/:id", validate(productIdParamSchema), getProductById);

/**
 * @route PUT /api/admin/products/:id
 * @description Update product
 * @access Admin
 *
 * @params
 * - id: Product ObjectId
 *
 * @requestBody
 * {
 *   "name": "Updated Product Name",
 *   "description": "Updated description",
 *   "status": "active",
 *   ...
 * }
 *
 * @example Request
 * PUT /api/admin/products/507f1f77bcf86cd799439011
 * Content-Type: application/json
 * { "name": "Updated Aloe Face Wash", "status": "active" }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Product updated successfully",
 *   "data": {
 *     "product": { "_id": "...", "name": "Updated Aloe Face Wash", "slug": "updated-aloe-face-wash", ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 *
 * @responseBody Error (409)
 * { "message": "Product name already exists", "data": null, "error": "A product with name '...' already exists" }
 */
adminRouter.put("/:id", validate(updateProductSchema), updateProduct);

/**
 * @route PATCH /api/admin/products/:id/status
 * @description Update product status
 * @access Admin
 *
 * @params
 * - id: Product ObjectId
 *
 * @requestBody
 * { "status": "active" }
 *
 * @example Request
 * PATCH /api/admin/products/507f1f77bcf86cd799439011/status
 * Content-Type: application/json
 * { "status": "active" }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Product status updated successfully",
 *   "data": {
 *     "product": { "_id": "...", "name": "...", "status": "active", ... }
 *   },
 *   "error": null
 * }
 */
adminRouter.patch("/:id/status", validate(updateProductStatusSchema), updateProductStatus);

/**
 * @route PATCH /api/admin/products/:id/flags
 * @description Update product flags (featured, bestseller, new arrival)
 * @access Admin
 *
 * @params
 * - id: Product ObjectId
 *
 * @requestBody
 * { "isFeatured": true, "isBestseller": false, "isNewArrival": true }
 *
 * @example Request
 * PATCH /api/admin/products/507f1f77bcf86cd799439011/flags
 * Content-Type: application/json
 * { "isFeatured": true }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Product flags updated successfully",
 *   "data": {
 *     "product": { "_id": "...", "name": "...", "isFeatured": true, ... }
 *   },
 *   "error": null
 * }
 */
adminRouter.patch("/:id/flags", validate(updateProductFlagsSchema), updateProductFlags);

/**
 * @route POST /api/admin/products/:id/duplicate
 * @description Duplicate a product
 * @access Admin
 *
 * @params
 * - id: Product ObjectId
 *
 * @requestBody
 * { "name": "Duplicated Product Name" }
 *
 * @example Request
 * POST /api/admin/products/507f1f77bcf86cd799439011/duplicate
 * Content-Type: application/json
 * { "name": "Aloe Face Wash v2" }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Product duplicated successfully",
 *   "data": {
 *     "product": { "_id": "...", "name": "Aloe Face Wash v2", "slug": "aloe-face-wash-v2", "status": "draft", ... }
 *   },
 *   "error": null
 * }
 */
adminRouter.post("/:id/duplicate", validate(duplicateProductSchema), duplicateProduct);

/**
 * @route DELETE /api/admin/products/:id
 * @description Soft delete product
 * @access Admin
 *
 * @params
 * - id: Product ObjectId
 *
 * @example Request
 * DELETE /api/admin/products/507f1f77bcf86cd799439011
 *
 * @responseBody Success (200)
 * {
 *   "message": "Product deleted successfully",
 *   "data": {
 *     "product": { "_id": "...", "name": "...", "deletedAt": "2024-01-01T00:00:00.000Z", ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
adminRouter.delete("/:id", validate(productIdParamSchema), deleteProduct);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
