import { Router } from "express";
import {
  listCollections,
  getCollectionBySlug,
  getCollectionProducts,
  listAllCollections,
  createCollection,
  getCollectionById,
  updateCollection,
  toggleCollectionStatus,
  toggleCollectionFeatured,
  addProductsToCollection,
  reorderCollectionProducts,
  removeProductFromCollection,
  deleteCollection,
  getCollectionProductsAdmin,
} from "./collection.controller.js";
import { validate } from "@shared/middlewares";
import {
  createCollectionSchema,
  updateCollectionSchema,
  collectionIdParamSchema,
  collectionSlugParamSchema,
  toggleStatusSchema,
  toggleFeaturedSchema,
  addProductsSchema,
  reorderProductsSchema,
  removeProductSchema,
  listCollectionsQuerySchema,
  collectionProductsQuerySchema,
  adminCollectionProductsQuerySchema,
  adminListQuerySchema,
} from "./collection.validation.js";

const consumerRouter = Router();
const adminRouter = Router();

/**
 * Consumer Routes
 */

/**
 * @route GET /api/collections
 * @description List featured/active collections
 * @access Public
 *
 * @query
 * - featured: boolean (optional)
 * - limit: number (default: 20, max: 50)
 *
 * @example Request
 * GET /api/collections?featured=true&limit=10
 *
 * @responseBody Success (200)
 * {
 *   "message": "Collections fetched successfully",
 *   "data": {
 *     "collections": [
 *       { "_id": "...", "name": "Summer Sale", "slug": "summer-sale", "image": {...}, "isFeatured": true }
 *     ]
 *   },
 *   "error": null
 * }
 */
consumerRouter.get("/", validate(listCollectionsQuerySchema), listCollections);

/**
 * @route GET /api/collections/:slug
 * @description Get collection details by slug
 * @access Public
 *
 * @params
 * - slug: Collection slug
 *
 * @example Request
 * GET /api/collections/summer-sale
 *
 * @responseBody Success (200)
 * {
 *   "message": "Collection fetched successfully",
 *   "data": {
 *     "collection": {
 *       "_id": "...",
 *       "name": "Summer Sale",
 *       "slug": "summer-sale",
 *       "description": "...",
 *       "image": {...},
 *       "banner": {...},
 *       "seo": {...}
 *     }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Collection not found", "data": null, "error": "Collection with slug 'xyz' not found" }
 */
consumerRouter.get("/:slug", validate(collectionSlugParamSchema), getCollectionBySlug);

/**
 * @route GET /api/collections/:slug/products
 * @description Get products in a collection
 * @access Public
 *
 * @params
 * - slug: Collection slug
 *
 * @query
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 50)
 *
 * @example Request
 * GET /api/collections/summer-sale/products?page=1&limit=20
 *
 * @responseBody Success (200)
 * {
 *   "message": "Collection products fetched successfully",
 *   "data": {
 *     "collection": { "_id": "...", "name": "Summer Sale", "slug": "summer-sale" },
 *     "products": [
 *       { "_id": "...", "name": "Aloe Face Wash", "slug": "aloe-face-wash", "primaryImage": {...}, "pricing": {...} }
 *     ],
 *     "pagination": { "page": 1, "limit": 20, "total": 50, "totalPages": 3 }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Collection not found", "data": null, "error": "Collection with slug 'xyz' not found" }
 */
consumerRouter.get("/:slug/products", validate(collectionProductsQuerySchema), getCollectionProducts);

/**
 * Admin Routes
 */

/**
 * @route GET /api/admin/collections
 * @description List all collections with filters
 * @access Admin
 *
 * @query
 * - type: string (manual, smart)
 * - isActive: boolean
 * - isFeatured: boolean
 * - search: string
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 *
 * @example Request
 * GET /api/admin/collections?type=manual&isActive=true&page=1
 *
 * @responseBody Success (200)
 * {
 *   "message": "Collections fetched successfully",
 *   "data": {
 *     "collections": [...],
 *     "pagination": { "page": 1, "limit": 20, "total": 50, "totalPages": 3 }
 *   },
 *   "error": null
 * }
 */
adminRouter.get("/", validate(adminListQuerySchema), listAllCollections);

/**
 * @route POST /api/admin/collections
 * @description Create a new collection
 * @access Admin
 *
 * @requestBody
 * {
 *   "name": "Summer Sale",
 *   "slug": "summer-sale",
 *   "description": "Best summer deals",
 *   "type": "manual",
 *   "image": { "url": "...", "publicId": "..." },
 *   "isFeatured": true,
 *   "isActive": true
 * }
 *
 * @example Request
 * POST /api/admin/collections
 * Content-Type: application/json
 * { "name": "Summer Sale", "type": "manual" }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Collection created successfully",
 *   "data": {
 *     "collection": { "_id": "...", "name": "Summer Sale", "slug": "summer-sale", ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (400)
 * { "message": "Validation failed", "data": null, "error": [...] }
 *
 * @responseBody Error (409)
 * { "message": "Slug already exists", "data": null, "error": "A collection with slug 'summer-sale' already exists" }
 */
adminRouter.post("/", validate(createCollectionSchema), createCollection);

/**
 * @route GET /api/admin/collections/:id
 * @description Get collection by ID
 * @access Admin
 *
 * @params
 * - id: Collection ObjectId
 *
 * @example Request
 * GET /api/admin/collections/507f1f77bcf86cd799439011
 *
 * @responseBody Success (200)
 * {
 *   "message": "Collection fetched successfully",
 *   "data": {
 *     "collection": { "_id": "...", "name": "Summer Sale", "slug": "summer-sale", "rules": [...], "productCount": 10, ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Collection not found", "data": null, "error": "Collection with ID '...' not found" }
 */
adminRouter.get("/:id", validate(collectionIdParamSchema), getCollectionById);

/**
 * @route GET /api/admin/collections/:id/products
 * @description Get products in a collection (admin)
 * @access Admin
 *
 * @params
 * - id: Collection ObjectId
 *
 * @query
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 *
 * @example Request
 * GET /api/admin/collections/507f1f77bcf86cd799439011/products?page=1&limit=20
 *
 * @responseBody Success (200)
 * {
 *   "message": "Collection products fetched successfully",
 *   "data": {
 *     "collection": { "_id": "...", "name": "Summer Sale", "slug": "summer-sale", "type": "manual" },
 *     "products": [
 *       {
 *         "_id": "...",
 *         "name": "Product Name",
 *         "slug": "product-slug",
 *         "status": "active",
 *         "primaryImage": { "url": "https://..." },
 *         "pricing": { "mrp": 999, "salePrice": 799 }
 *       }
 *     ],
 *     "pagination": { "page": 1, "limit": 20, "total": 50 }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Collection not found", "data": null, "error": "Collection with ID '...' not found" }
 */
adminRouter.get("/:id/products", validate(adminCollectionProductsQuerySchema), getCollectionProductsAdmin);

/**
 * @route PUT /api/admin/collections/:id
 * @description Update a collection
 * @access Admin
 *
 * @params
 * - id: Collection ObjectId
 *
 * @requestBody
 * {
 *   "name": "Updated Name",
 *   "description": "Updated description",
 *   "isFeatured": true
 * }
 *
 * @example Request
 * PUT /api/admin/collections/507f1f77bcf86cd799439011
 * Content-Type: application/json
 * { "name": "Winter Sale" }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Collection updated successfully",
 *   "data": {
 *     "collection": { "_id": "...", "name": "Winter Sale", ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Collection not found", "data": null, "error": "Collection with ID '...' not found" }
 *
 * @responseBody Error (409)
 * { "message": "Slug already exists", "data": null, "error": "A collection with slug '...' already exists" }
 */
adminRouter.put("/:id", validate(updateCollectionSchema), updateCollection);

/**
 * @route PATCH /api/admin/collections/:id/status
 * @description Toggle collection active status
 * @access Admin
 *
 * @params
 * - id: Collection ObjectId
 *
 * @requestBody
 * { "isActive": false }
 *
 * @example Request
 * PATCH /api/admin/collections/507f1f77bcf86cd799439011/status
 * Content-Type: application/json
 * { "isActive": false }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Collection status updated successfully",
 *   "data": {
 *     "collection": { "_id": "...", "isActive": false, ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Collection not found", "data": null, "error": "Collection with ID '...' not found" }
 */
adminRouter.patch("/:id/status", validate(toggleStatusSchema), toggleCollectionStatus);

/**
 * @route PATCH /api/admin/collections/:id/featured
 * @description Toggle collection featured status
 * @access Admin
 *
 * @params
 * - id: Collection ObjectId
 *
 * @requestBody
 * { "isFeatured": true }
 *
 * @example Request
 * PATCH /api/admin/collections/507f1f77bcf86cd799439011/featured
 * Content-Type: application/json
 * { "isFeatured": true }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Collection featured status updated successfully",
 *   "data": {
 *     "collection": { "_id": "...", "isFeatured": true, ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Collection not found", "data": null, "error": "Collection with ID '...' not found" }
 */
adminRouter.patch("/:id/featured", validate(toggleFeaturedSchema), toggleCollectionFeatured);

/**
 * @route POST /api/admin/collections/:id/products
 * @description Add products to a manual collection
 * @access Admin
 *
 * @params
 * - id: Collection ObjectId
 *
 * @requestBody
 * {
 *   "products": [
 *     { "productId": "...", "sortOrder": 0 },
 *     { "productId": "...", "sortOrder": 1 }
 *   ]
 * }
 *
 * @example Request
 * POST /api/admin/collections/507f1f77bcf86cd799439011/products
 * Content-Type: application/json
 * { "products": [{ "productId": "..." }] }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Products added successfully",
 *   "data": {
 *     "added": 2,
 *     "skipped": 0
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (400)
 * { "message": "Invalid collection type", "data": null, "error": "Cannot add products to smart collections" }
 *
 * @responseBody Error (404)
 * { "message": "Collection not found", "data": null, "error": "Collection with ID '...' not found" }
 */
adminRouter.post("/:id/products", validate(addProductsSchema), addProductsToCollection);

/**
 * @route PATCH /api/admin/collections/:id/products/reorder
 * @description Reorder products in a manual collection
 * @access Admin
 *
 * @params
 * - id: Collection ObjectId
 *
 * @requestBody
 * {
 *   "products": [
 *     { "productId": "...", "sortOrder": 0 },
 *     { "productId": "...", "sortOrder": 1 }
 *   ]
 * }
 *
 * @example Request
 * PATCH /api/admin/collections/507f1f77bcf86cd799439011/products/reorder
 * Content-Type: application/json
 * { "products": [{ "productId": "...", "sortOrder": 0 }] }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Products reordered successfully",
 *   "data": { "modifiedCount": 3 },
 *   "error": null
 * }
 *
 * @responseBody Error (400)
 * { "message": "Invalid collection type", "data": null, "error": "Cannot reorder products in smart collections" }
 *
 * @responseBody Error (404)
 * { "message": "Collection not found", "data": null, "error": "Collection with ID '...' not found" }
 */
adminRouter.patch("/:id/products/reorder", validate(reorderProductsSchema), reorderCollectionProducts);

/**
 * @route DELETE /api/admin/collections/:id/products/:productId
 * @description Remove a product from a manual collection
 * @access Admin
 *
 * @params
 * - id: Collection ObjectId
 * - productId: Product ObjectId
 *
 * @example Request
 * DELETE /api/admin/collections/507f1f77bcf86cd799439011/products/507f1f77bcf86cd799439012
 *
 * @responseBody Success (200)
 * {
 *   "message": "Product removed successfully",
 *   "data": { "removed": true },
 *   "error": null
 * }
 *
 * @responseBody Error (400)
 * { "message": "Invalid collection type", "data": null, "error": "Cannot remove products from smart collections" }
 *
 * @responseBody Error (404)
 * { "message": "Product not in collection", "data": null, "error": "This product is not in this collection" }
 */
adminRouter.delete("/:id/products/:productId", validate(removeProductSchema), removeProductFromCollection);

/**
 * @route DELETE /api/admin/collections/:id
 * @description Soft delete a collection
 * @access Admin
 *
 * @params
 * - id: Collection ObjectId
 *
 * @example Request
 * DELETE /api/admin/collections/507f1f77bcf86cd799439011
 *
 * @responseBody Success (200)
 * {
 *   "message": "Collection deleted successfully",
 *   "data": {
 *     "collection": { "_id": "...", "deletedAt": "2024-01-01T00:00:00.000Z", ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Collection not found", "data": null, "error": "Collection with ID '...' not found" }
 */
adminRouter.delete("/:id", validate(collectionIdParamSchema), deleteCollection);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
