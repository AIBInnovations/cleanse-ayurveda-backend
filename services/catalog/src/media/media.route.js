import { Router } from "express";
import {
  getProductMedia,
  listProductMediaAdmin,
  uploadProductMedia,
  bulkUploadMedia,
  updateMedia,
  setPrimaryMedia,
  reorderMedia,
  deleteMedia,
} from "./media.controller.js";
import { validate } from "@shared/middlewares";
import {
  uploadMediaSchema,
  bulkUploadMediaSchema,
  updateMediaSchema,
  mediaIdParamSchema,
  productIdParamSchema,
  productSlugParamSchema,
  setPrimaryMediaSchema,
  reorderMediaSchema,
} from "./media.validation.js";

const consumerRouter = Router();
const adminProductsRouter = Router();
const adminMediaRouter = Router();

/**
 * Consumer Routes
 */

/**
 * @route GET /api/products/:productSlug/media
 * @description Get all media for a product (consumer view)
 * @access Public
 *
 * @params
 * - productSlug: Product slug
 *
 * @example Request
 * GET /api/products/aloe-face-wash/media
 *
 * @responseBody Success (200)
 * {
 *   "message": "Product media fetched successfully",
 *   "data": {
 *     "media": [
 *       { "_id": "...", "type": "image", "url": "https://...", "altText": "Front view", "isPrimary": true, "sortOrder": 0 },
 *       { "_id": "...", "type": "image", "url": "https://...", "altText": "Side view", "isPrimary": false, "sortOrder": 1 }
 *     ]
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with slug 'xyz' not found" }
 */
consumerRouter.get("/:productSlug/media", validate(productSlugParamSchema), getProductMedia);

/**
 * Admin Routes - Product Media
 */

/**
 * @route GET /api/admin/products/:productId/media
 * @description List all media for a product (admin view)
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @example Request
 * GET /api/admin/products/507f1f77bcf86cd799439011/media
 *
 * @responseBody Success (200)
 * {
 *   "message": "Product media fetched successfully",
 *   "data": {
 *     "product": { "_id": "...", "name": "Aloe Face Wash", "slug": "aloe-face-wash" },
 *     "media": [
 *       {
 *         "_id": "...",
 *         "type": "image",
 *         "url": "https://...",
 *         "publicId": "products/abc123",
 *         "altText": "Front view",
 *         "isPrimary": true,
 *         "sortOrder": 0,
 *         "variant": null,
 *         "metadata": { "width": 800, "height": 600, "format": "jpg", "bytes": 12345 },
 *         "createdAt": "...",
 *         "updatedAt": "..."
 *       }
 *     ]
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
adminProductsRouter.get("/:productId/media", validate(productIdParamSchema), listProductMediaAdmin);

/**
 * @route POST /api/admin/products/:productId/media
 * @description Upload/add media to a product
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @requestBody
 * {
 *   "variantId": null,
 *   "type": "image",
 *   "url": "https://res.cloudinary.com/.../image.jpg",
 *   "publicId": "products/abc123",
 *   "altText": "Product front view",
 *   "isPrimary": true,
 *   "sortOrder": 0,
 *   "metadata": { "width": 800, "height": 600, "format": "jpg", "bytes": 12345 }
 * }
 *
 * @example Request
 * POST /api/admin/products/507f1f77bcf86cd799439011/media
 * Content-Type: application/json
 * { "type": "image", "url": "https://...", "isPrimary": true }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Media uploaded successfully",
 *   "data": {
 *     "media": { "_id": "...", "type": "image", "url": "https://...", "isPrimary": true, ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (400)
 * { "message": "Validation failed", "data": null, "error": [{ "field": "type", "message": "Media type is required", "location": "body" }] }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
adminProductsRouter.post("/:productId/media", validate(uploadMediaSchema), uploadProductMedia);

/**
 * @route POST /api/admin/products/:productId/media/bulk
 * @description Bulk upload media to a product
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @requestBody
 * {
 *   "media": [
 *     { "type": "image", "url": "https://...", "publicId": "...", "altText": "Image 1", "isPrimary": true, "sortOrder": 0 },
 *     { "type": "image", "url": "https://...", "publicId": "...", "altText": "Image 2", "sortOrder": 1 }
 *   ]
 * }
 *
 * @example Request
 * POST /api/admin/products/507f1f77bcf86cd799439011/media/bulk
 * Content-Type: application/json
 * { "media": [{ "type": "image", "url": "https://..." }] }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Media uploaded successfully",
 *   "data": {
 *     "media": [{ "_id": "...", "type": "image", "url": "https://...", ... }],
 *     "count": 2
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (400)
 * { "message": "Validation failed", "data": null, "error": "..." }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
adminProductsRouter.post(
  "/:productId/media/bulk",
  validate(bulkUploadMediaSchema),
  bulkUploadMedia
);

/**
 * @route PATCH /api/admin/products/:productId/media/reorder
 * @description Reorder media for a product
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @requestBody
 * {
 *   "media": [
 *     { "id": "media1Id", "sortOrder": 0 },
 *     { "id": "media2Id", "sortOrder": 1 },
 *     { "id": "media3Id", "sortOrder": 2 }
 *   ]
 * }
 *
 * @example Request
 * PATCH /api/admin/products/507f1f77bcf86cd799439011/media/reorder
 * Content-Type: application/json
 * { "media": [{ "id": "...", "sortOrder": 0 }, { "id": "...", "sortOrder": 1 }] }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Media reordered successfully",
 *   "data": { "modifiedCount": 3 },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
adminProductsRouter.patch("/:productId/media/reorder", validate(reorderMediaSchema), reorderMedia);

/**
 * Admin Routes - Media Operations
 */

/**
 * @route PUT /api/admin/media/:id
 * @description Update media details (alt text, sort order)
 * @access Admin
 *
 * @params
 * - id: Media ObjectId
 *
 * @requestBody
 * {
 *   "altText": "Updated alt text",
 *   "sortOrder": 2
 * }
 *
 * @example Request
 * PUT /api/admin/media/507f1f77bcf86cd799439011
 * Content-Type: application/json
 * { "altText": "Product image front view" }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Media updated successfully",
 *   "data": {
 *     "media": { "_id": "...", "altText": "Updated alt text", "sortOrder": 2, ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Media not found", "data": null, "error": "Media with ID '...' not found" }
 */
adminMediaRouter.put("/:id", validate(updateMediaSchema), updateMedia);

/**
 * @route PATCH /api/admin/media/:id/primary
 * @description Set media as primary for its product/variant
 * @access Admin
 *
 * @params
 * - id: Media ObjectId
 *
 * @example Request
 * PATCH /api/admin/media/507f1f77bcf86cd799439011/primary
 *
 * @responseBody Success (200)
 * {
 *   "message": "Primary media set successfully",
 *   "data": {
 *     "media": { "_id": "...", "isPrimary": true, ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Media not found", "data": null, "error": "Media with ID '...' not found" }
 */
adminMediaRouter.patch("/:id/primary", validate(setPrimaryMediaSchema), setPrimaryMedia);

/**
 * @route DELETE /api/admin/media/:id
 * @description Soft delete media and optionally remove from cloud storage
 * @access Admin
 *
 * @params
 * - id: Media ObjectId
 *
 * @query
 * - deleteFromCloud: boolean (default: false) - Also delete from Cloudinary
 *
 * @example Request
 * DELETE /api/admin/media/507f1f77bcf86cd799439011?deleteFromCloud=true
 *
 * @responseBody Success (200)
 * {
 *   "message": "Media deleted successfully",
 *   "data": {
 *     "media": { "_id": "...", "deletedAt": "2024-01-01T00:00:00.000Z", ... },
 *     "cloudDeleted": true
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Media not found", "data": null, "error": "Media with ID '...' not found" }
 */
adminMediaRouter.delete("/:id", validate(mediaIdParamSchema), deleteMedia);

export default {
  consumer: consumerRouter,
  adminProducts: adminProductsRouter,
  adminMedia: adminMediaRouter,
};
