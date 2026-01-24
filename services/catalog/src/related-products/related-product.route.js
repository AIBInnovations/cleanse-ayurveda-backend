import { Router } from "express";
import {
  getCrossSellProducts,
  getUpSellProducts,
  getFrequentlyBoughtTogether,
  listRelatedProducts,
  addRelatedProduct,
  bulkAddRelatedProducts,
  reorderRelatedProducts,
  removeRelatedProduct,
} from "./related-product.controller.js";
import { validate } from "@shared/middlewares";
import {
  consumerRelatedQuerySchema,
  listRelatedQuerySchema,
  addRelatedSchema,
  bulkAddRelatedSchema,
  reorderRelatedSchema,
  removeRelatedSchema,
} from "./related-product.validation.js";

const consumerRouter = Router();
const adminRouter = Router();

/**
 * Consumer Routes
 */

/**
 * @route GET /api/products/:productSlug/cross-sell
 * @description Get cross-sell products for a product
 * @access Public
 *
 * @params
 * - productSlug: Product slug
 *
 * @query
 * - limit: number (default: 10, max: 20)
 *
 * @example Request
 * GET /api/products/aloe-face-wash/cross-sell?limit=5
 *
 * @responseBody Success (200)
 * {
 *   "message": "Cross-sell products fetched successfully",
 *   "data": {
 *     "products": [
 *       {
 *         "_id": "...",
 *         "name": "Aloe Toner",
 *         "slug": "aloe-toner",
 *         "shortDescription": "...",
 *         "primaryImage": { "url": "...", "altText": "..." },
 *         "pricing": { "mrp": 500, "salePrice": 450 },
 *         "ratingSummary": { "average": 4.5, "count": 100 }
 *       }
 *     ]
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with slug 'xyz' not found" }
 */
consumerRouter.get(
  "/:productSlug/cross-sell",
  validate(consumerRelatedQuerySchema),
  getCrossSellProducts
);

/**
 * @route GET /api/products/:productSlug/up-sell
 * @description Get up-sell products for a product
 * @access Public
 *
 * @params
 * - productSlug: Product slug
 *
 * @query
 * - limit: number (default: 10, max: 20)
 *
 * @example Request
 * GET /api/products/aloe-face-wash/up-sell?limit=5
 *
 * @responseBody Success (200)
 * {
 *   "message": "Up-sell products fetched successfully",
 *   "data": {
 *     "products": [
 *       {
 *         "_id": "...",
 *         "name": "Premium Aloe Face Wash",
 *         "slug": "premium-aloe-face-wash",
 *         "shortDescription": "...",
 *         "primaryImage": { "url": "...", "altText": "..." },
 *         "pricing": { "mrp": 800, "salePrice": 720 },
 *         "ratingSummary": { "average": 4.8, "count": 50 }
 *       }
 *     ]
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with slug 'xyz' not found" }
 */
consumerRouter.get(
  "/:productSlug/up-sell",
  validate(consumerRelatedQuerySchema),
  getUpSellProducts
);

/**
 * @route GET /api/products/:productSlug/frequently-bought
 * @description Get frequently bought together products for a product
 * @access Public
 *
 * @params
 * - productSlug: Product slug
 *
 * @query
 * - limit: number (default: 10, max: 20)
 *
 * @example Request
 * GET /api/products/aloe-face-wash/frequently-bought?limit=5
 *
 * @responseBody Success (200)
 * {
 *   "message": "Frequently bought together products fetched successfully",
 *   "data": {
 *     "products": [
 *       {
 *         "_id": "...",
 *         "name": "Aloe Moisturizer",
 *         "slug": "aloe-moisturizer",
 *         "shortDescription": "...",
 *         "primaryImage": { "url": "...", "altText": "..." },
 *         "pricing": { "mrp": 600, "salePrice": 540 },
 *         "ratingSummary": { "average": 4.6, "count": 80 }
 *       }
 *     ]
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with slug 'xyz' not found" }
 */
consumerRouter.get(
  "/:productSlug/frequently-bought",
  validate(consumerRelatedQuerySchema),
  getFrequentlyBoughtTogether
);

/**
 * Admin Routes
 */

/**
 * @route GET /api/admin/products/:productId/related
 * @description List all related products grouped by type
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @query
 * - relationType: string (optional, filter by type)
 *
 * @example Request
 * GET /api/admin/products/507f1f77bcf86cd799439011/related
 * GET /api/admin/products/507f1f77bcf86cd799439011/related?relationType=crossSell
 *
 * @responseBody Success (200)
 * {
 *   "message": "Related products fetched successfully",
 *   "data": {
 *     "product": { "_id": "...", "name": "Aloe Face Wash", "slug": "aloe-face-wash" },
 *     "crossSell": [
 *       { "_id": "...", "relatedProduct": {...}, "sortOrder": 0 }
 *     ],
 *     "upSell": [...],
 *     "frequentlyBoughtTogether": [...]
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
adminRouter.get(
  "/:productId/related",
  validate(listRelatedQuerySchema),
  listRelatedProducts
);

/**
 * @route POST /api/admin/products/:productId/related
 * @description Add a related product
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @requestBody
 * {
 *   "relatedProductId": "507f1f77bcf86cd799439012",
 *   "relationType": "crossSell",
 *   "sortOrder": 0
 * }
 *
 * @example Request
 * POST /api/admin/products/507f1f77bcf86cd799439011/related
 * Content-Type: application/json
 * { "relatedProductId": "...", "relationType": "crossSell" }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Related product added successfully",
 *   "data": {
 *     "relation": { "_id": "...", "product": "...", "relatedProduct": "...", "relationType": "crossSell", "sortOrder": 0 }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (400)
 * { "message": "Cannot relate product to itself", "data": null, "error": "A product cannot be related to itself" }
 *
 * @responseBody Error (409)
 * { "message": "Relation already exists", "data": null, "error": "This relation already exists" }
 */
adminRouter.post(
  "/:productId/related",
  validate(addRelatedSchema),
  addRelatedProduct
);

/**
 * @route POST /api/admin/products/:productId/related/bulk
 * @description Bulk add related products
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @requestBody
 * {
 *   "products": [
 *     { "relatedProductId": "...", "relationType": "crossSell", "sortOrder": 0 },
 *     { "relatedProductId": "...", "relationType": "upSell", "sortOrder": 0 }
 *   ]
 * }
 *
 * @example Request
 * POST /api/admin/products/507f1f77bcf86cd799439011/related/bulk
 * Content-Type: application/json
 * { "products": [{ "relatedProductId": "...", "relationType": "crossSell" }] }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Related products added successfully",
 *   "data": { "added": 2, "skipped": 1 },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
adminRouter.post(
  "/:productId/related/bulk",
  validate(bulkAddRelatedSchema),
  bulkAddRelatedProducts
);

/**
 * @route PATCH /api/admin/products/:productId/related/reorder
 * @description Reorder related products of a specific type
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @requestBody
 * {
 *   "relationType": "crossSell",
 *   "products": [
 *     { "relatedProductId": "...", "sortOrder": 0 },
 *     { "relatedProductId": "...", "sortOrder": 1 }
 *   ]
 * }
 *
 * @example Request
 * PATCH /api/admin/products/507f1f77bcf86cd799439011/related/reorder
 * Content-Type: application/json
 * { "relationType": "crossSell", "products": [{ "relatedProductId": "...", "sortOrder": 0 }] }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Related products reordered successfully",
 *   "data": { "modifiedCount": 3 },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
adminRouter.patch(
  "/:productId/related/reorder",
  validate(reorderRelatedSchema),
  reorderRelatedProducts
);

/**
 * @route DELETE /api/admin/products/:productId/related/:relatedId
 * @description Remove a related product
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 * - relatedId: Related Product ObjectId
 *
 * @query
 * - relationType: string (optional, to specify which relation type to remove)
 *
 * @example Request
 * DELETE /api/admin/products/507f1f77bcf86cd799439011/related/507f1f77bcf86cd799439012
 * DELETE /api/admin/products/507f1f77bcf86cd799439011/related/507f1f77bcf86cd799439012?relationType=crossSell
 *
 * @responseBody Success (200)
 * {
 *   "message": "Related product removed successfully",
 *   "data": { "removed": true, "deletedCount": 1 },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Relation not found", "data": null, "error": "No relation found between these products" }
 */
adminRouter.delete(
  "/:productId/related/:relatedId",
  validate(removeRelatedSchema),
  removeRelatedProduct
);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
