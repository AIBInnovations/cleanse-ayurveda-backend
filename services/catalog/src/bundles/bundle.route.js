import { Router } from "express";
import {
  listBundles,
  getBundleBySlug,
  listAllBundles,
  createBundle,
  getBundleById,
  updateBundle,
  toggleBundleStatus,
  addBundleItems,
  updateBundleItem,
  removeBundleItem,
  deleteBundle,
  validateBundle,
} from "./bundle.controller.js";
import { validate } from "@shared/middlewares";
import {
  createBundleSchema,
  updateBundleSchema,
  bundleIdParamSchema,
  bundleSlugParamSchema,
  toggleStatusSchema,
  addItemsSchema,
  updateItemSchema,
  removeItemSchema,
  listBundlesQuerySchema,
  adminListQuerySchema,
} from "./bundle.validation.js";

const consumerRouter = Router();
const adminRouter = Router();

/**
 * Consumer Routes
 */

/**
 * @route GET /api/bundles
 * @description List active bundles within valid date range
 * @access Public
 *
 * @query
 * - limit: number (default: 20, max: 50)
 *
 * @example Request
 * GET /api/bundles?limit=10
 *
 * @responseBody Success (200)
 * {
 *   "message": "Bundles fetched successfully",
 *   "data": {
 *     "bundles": [
 *       {
 *         "_id": "...",
 *         "name": "Summer Skincare Kit",
 *         "slug": "summer-skincare-kit",
 *         "description": "...",
 *         "image": { "url": "...", "publicId": "..." },
 *         "originalPrice": 1500,
 *         "finalPrice": 1200,
 *         "savings": 300,
 *         "validTo": "2024-12-31T23:59:59.000Z"
 *       }
 *     ]
 *   },
 *   "error": null
 * }
 */
consumerRouter.get("/", validate(listBundlesQuerySchema), listBundles);

/**
 * @route GET /api/bundles/:id/validate
 * @description Validate if a bundle is valid and available for purchase
 * @access Public
 */
consumerRouter.get("/:id/validate", validate(bundleIdParamSchema), validateBundle);

/**
 * @route GET /api/bundles/:slug
 * @description Get bundle details with items by slug
 * @access Public
 *
 * @params
 * - slug: Bundle slug
 *
 * @example Request
 * GET /api/bundles/summer-skincare-kit
 *
 * @responseBody Success (200)
 * {
 *   "message": "Bundle fetched successfully",
 *   "data": {
 *     "bundle": {
 *       "_id": "...",
 *       "name": "Summer Skincare Kit",
 *       "slug": "summer-skincare-kit",
 *       "description": "...",
 *       "image": { "url": "...", "publicId": "..." },
 *       "originalPrice": 1500,
 *       "finalPrice": 1200,
 *       "savings": 300,
 *       "validFrom": "...",
 *       "validTo": "...",
 *       "items": [
 *         {
 *           "_id": "...",
 *           "product": { "_id": "...", "name": "...", "slug": "...", "primaryImage": {...} },
 *           "variant": { "_id": "...", "name": "...", "sku": "...", "mrp": 500, "salePrice": 450 },
 *           "quantity": 1,
 *           "unitPrice": 450,
 *           "itemTotal": 450
 *         }
 *       ]
 *     }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Bundle not found", "data": null, "error": "Bundle with slug 'xyz' not found" }
 */
consumerRouter.get("/:slug", validate(bundleSlugParamSchema), getBundleBySlug);

/**
 * Admin Routes
 */

/**
 * @route GET /api/admin/bundles
 * @description List all bundles with filters
 * @access Admin
 *
 * @query
 * - isActive: boolean
 * - search: string
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 *
 * @example Request
 * GET /api/admin/bundles?isActive=true&search=summer&page=1
 *
 * @responseBody Success (200)
 * {
 *   "message": "Bundles fetched successfully",
 *   "data": {
 *     "bundles": [...],
 *     "pagination": { "page": 1, "limit": 20, "total": 50, "totalPages": 3 }
 *   },
 *   "error": null
 * }
 */
adminRouter.get("/", validate(adminListQuerySchema), listAllBundles);

/**
 * @route POST /api/admin/bundles
 * @description Create a new bundle
 * @access Admin
 *
 * @requestBody
 * {
 *   "name": "Summer Skincare Kit",
 *   "slug": "summer-skincare-kit",
 *   "description": "Complete skincare routine for summer",
 *   "image": { "url": "...", "publicId": "..." },
 *   "pricingType": "percentageOff",
 *   "percentageOff": 20,
 *   "validFrom": "2024-06-01",
 *   "validTo": "2024-08-31",
 *   "isActive": true
 * }
 *
 * @example Request
 * POST /api/admin/bundles
 * Content-Type: application/json
 * { "name": "Summer Skincare Kit", "pricingType": "percentageOff", "percentageOff": 20 }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Bundle created successfully",
 *   "data": {
 *     "bundle": { "_id": "...", "name": "Summer Skincare Kit", "slug": "summer-skincare-kit", ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (400)
 * { "message": "Validation failed", "data": null, "error": [...] }
 *
 * @responseBody Error (409)
 * { "message": "Slug already exists", "data": null, "error": "A bundle with slug 'summer-skincare-kit' already exists" }
 */
adminRouter.post("/", validate(createBundleSchema), createBundle);

/**
 * @route GET /api/admin/bundles/:id
 * @description Get bundle by ID with all details
 * @access Admin
 *
 * @params
 * - id: Bundle ObjectId
 *
 * @example Request
 * GET /api/admin/bundles/507f1f77bcf86cd799439011
 *
 * @responseBody Success (200)
 * {
 *   "message": "Bundle fetched successfully",
 *   "data": {
 *     "bundle": {
 *       "_id": "...",
 *       "name": "Summer Skincare Kit",
 *       "slug": "summer-skincare-kit",
 *       "pricingType": "percentageOff",
 *       "percentageOff": 20,
 *       "originalPrice": 1500,
 *       "finalPrice": 1200,
 *       "savings": 300,
 *       "items": [...]
 *     }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Bundle not found", "data": null, "error": "Bundle with ID '...' not found" }
 */
adminRouter.get("/:id", validate(bundleIdParamSchema), getBundleById);

/**
 * @route PUT /api/admin/bundles/:id
 * @description Update a bundle
 * @access Admin
 *
 * @params
 * - id: Bundle ObjectId
 *
 * @requestBody
 * {
 *   "name": "Updated Name",
 *   "description": "Updated description",
 *   "pricingType": "fixed",
 *   "fixedPrice": 999
 * }
 *
 * @example Request
 * PUT /api/admin/bundles/507f1f77bcf86cd799439011
 * Content-Type: application/json
 * { "name": "Winter Skincare Kit" }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Bundle updated successfully",
 *   "data": {
 *     "bundle": { "_id": "...", "name": "Winter Skincare Kit", ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Bundle not found", "data": null, "error": "Bundle with ID '...' not found" }
 *
 * @responseBody Error (409)
 * { "message": "Slug already exists", "data": null, "error": "A bundle with slug '...' already exists" }
 */
adminRouter.put("/:id", validate(updateBundleSchema), updateBundle);

/**
 * @route PATCH /api/admin/bundles/:id/status
 * @description Toggle bundle active status
 * @access Admin
 *
 * @params
 * - id: Bundle ObjectId
 *
 * @requestBody
 * { "isActive": false }
 *
 * @example Request
 * PATCH /api/admin/bundles/507f1f77bcf86cd799439011/status
 * Content-Type: application/json
 * { "isActive": false }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Bundle status updated successfully",
 *   "data": {
 *     "bundle": { "_id": "...", "isActive": false, ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Bundle not found", "data": null, "error": "Bundle with ID '...' not found" }
 */
adminRouter.patch("/:id/status", validate(toggleStatusSchema), toggleBundleStatus);

/**
 * @route POST /api/admin/bundles/:id/items
 * @description Add items to a bundle
 * @access Admin
 *
 * @params
 * - id: Bundle ObjectId
 *
 * @requestBody
 * {
 *   "items": [
 *     { "productId": "...", "variantId": "...", "quantity": 1, "sortOrder": 0 },
 *     { "productId": "...", "quantity": 2, "sortOrder": 1 }
 *   ]
 * }
 *
 * @example Request
 * POST /api/admin/bundles/507f1f77bcf86cd799439011/items
 * Content-Type: application/json
 * { "items": [{ "productId": "..." }] }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Items added successfully",
 *   "data": {
 *     "added": 2,
 *     "skipped": 0,
 *     "bundle": { "originalPrice": 1500, "finalPrice": 1200, "savings": 300 }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Bundle not found", "data": null, "error": "Bundle with ID '...' not found" }
 */
adminRouter.post("/:id/items", validate(addItemsSchema), addBundleItems);

/**
 * @route PUT /api/admin/bundles/:id/items/:itemId
 * @description Update a bundle item
 * @access Admin
 *
 * @params
 * - id: Bundle ObjectId
 * - itemId: BundleItem ObjectId
 *
 * @requestBody
 * {
 *   "variantId": "...",
 *   "quantity": 2,
 *   "sortOrder": 1
 * }
 *
 * @example Request
 * PUT /api/admin/bundles/507f1f77bcf86cd799439011/items/507f1f77bcf86cd799439012
 * Content-Type: application/json
 * { "quantity": 3 }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Item updated successfully",
 *   "data": {
 *     "item": { "_id": "...", "quantity": 3, ... },
 *     "bundle": { "originalPrice": 1500, "finalPrice": 1200, "savings": 300 }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Bundle item not found", "data": null, "error": "Bundle item with ID '...' not found" }
 */
adminRouter.put("/:id/items/:itemId", validate(updateItemSchema), updateBundleItem);

/**
 * @route DELETE /api/admin/bundles/:id/items/:itemId
 * @description Remove an item from a bundle
 * @access Admin
 *
 * @params
 * - id: Bundle ObjectId
 * - itemId: BundleItem ObjectId
 *
 * @example Request
 * DELETE /api/admin/bundles/507f1f77bcf86cd799439011/items/507f1f77bcf86cd799439012
 *
 * @responseBody Success (200)
 * {
 *   "message": "Item removed successfully",
 *   "data": {
 *     "removed": true,
 *     "bundle": { "originalPrice": 1000, "finalPrice": 800, "savings": 200 }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Bundle item not found", "data": null, "error": "Bundle item with ID '...' not found" }
 */
adminRouter.delete("/:id/items/:itemId", validate(removeItemSchema), removeBundleItem);

/**
 * @route DELETE /api/admin/bundles/:id
 * @description Soft delete a bundle
 * @access Admin
 *
 * @params
 * - id: Bundle ObjectId
 *
 * @example Request
 * DELETE /api/admin/bundles/507f1f77bcf86cd799439011
 *
 * @responseBody Success (200)
 * {
 *   "message": "Bundle deleted successfully",
 *   "data": {
 *     "bundle": { "_id": "...", "deletedAt": "2024-01-01T00:00:00.000Z", ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Bundle not found", "data": null, "error": "Bundle with ID '...' not found" }
 */
adminRouter.delete("/:id", validate(bundleIdParamSchema), deleteBundle);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
