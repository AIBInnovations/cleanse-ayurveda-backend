import { Router } from "express";
import {
  listProductVariants,
  getVariantById,
  listProductVariantsAdmin,
  addVariant,
  getVariantByIdAdmin,
  updateVariant,
  toggleVariantStatus,
  reorderVariants,
  deleteVariant,
} from "./variant.controller.js";
import { validate } from "@shared/middlewares";
import {
  createVariantSchema,
  updateVariantSchema,
  variantIdParamSchema,
  productIdParamSchema,
  productSlugParamSchema,
  toggleVariantStatusSchema,
  reorderVariantsSchema,
} from "./variant.validation.js";

const consumerRouter = Router();
const adminRouter = Router();
const adminVariantRouter = Router();

/**
 * Consumer Routes
 */

/**
 * @route GET /api/products/:productSlug/variants
 * @description List active variants for a product
 * @access Public
 *
 * @params
 * - productSlug: Product slug
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
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with slug 'xyz' not found" }
 */
consumerRouter.get("/:productSlug/variants", validate(productSlugParamSchema), listProductVariants);

/**
 * @route GET /api/variants/:id
 * @description Get variant detail
 * @access Public
 *
 * @params
 * - id: Variant ObjectId
 *
 * @example Request
 * GET /api/variants/507f1f77bcf86cd799439011
 *
 * @responseBody Success (200)
 * {
 *   "message": "Variant fetched successfully",
 *   "data": {
 *     "variant": {
 *       "_id": "507f1f77bcf86cd799439011",
 *       "name": "50ml",
 *       "sku": "ALO-FW-50",
 *       "variantType": "size",
 *       "mrp": 299,
 *       "salePrice": 249,
 *       "discountPercent": 17,
 *       "weight": 50,
 *       "isDefault": true,
 *       "product": { "_id": "...", "name": "Aloe Face Wash", "slug": "aloe-face-wash" }
 *     }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Variant not found", "data": null, "error": "Variant with ID '...' not found" }
 */
consumerRouter.get("/:id", validate(variantIdParamSchema), getVariantById);

/**
 * Admin Routes - Product Variants
 */

/**
 * @route GET /api/admin/products/:productId/variants
 * @description List all variants for a product
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @example Request
 * GET /api/admin/products/507f1f77bcf86cd799439011/variants
 *
 * @responseBody Success (200)
 * {
 *   "message": "Variants fetched successfully",
 *   "data": {
 *     "product": { "_id": "...", "name": "Aloe Face Wash", "slug": "aloe-face-wash" },
 *     "variants": [
 *       { "_id": "...", "name": "50ml", "sku": "ALO-FW-50", "barcode": "1234567890123", "variantType": "size", "mrp": 299, "salePrice": 249, "costPrice": 150, "discountPercent": 17, "weight": 50, "isDefault": true, "isActive": true, "sortOrder": 0, "createdAt": "...", "updatedAt": "..." }
 *     ]
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
adminRouter.get("/:productId/variants", validate(productIdParamSchema), listProductVariantsAdmin);

/**
 * @route POST /api/admin/products/:productId/variants
 * @description Add a variant to a product
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @requestBody
 * {
 *   "name": "50ml",
 *   "sku": "ALO-FW-50",
 *   "barcode": "1234567890123",
 *   "variantType": "size",
 *   "mrp": 299,
 *   "salePrice": 249,
 *   "costPrice": 150,
 *   "weight": 50,
 *   "isDefault": true,
 *   "isActive": true,
 *   "sortOrder": 0
 * }
 *
 * @example Request
 * POST /api/admin/products/507f1f77bcf86cd799439011/variants
 * Content-Type: application/json
 * { "name": "50ml", "sku": "ALO-FW-50", "mrp": 299, "salePrice": 249 }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Variant created successfully",
 *   "data": {
 *     "variant": { "_id": "...", "name": "50ml", "sku": "ALO-FW-50", "mrp": 299, "salePrice": 249, "discountPercent": 17, ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (400)
 * { "message": "Validation failed", "data": null, "error": [{ "field": "sku", "message": "SKU is required", "location": "body" }] }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 *
 * @responseBody Error (409)
 * { "message": "SKU already exists", "data": null, "error": "A variant with SKU 'ALO-FW-50' already exists" }
 */
adminRouter.post("/:productId/variants", validate(createVariantSchema), addVariant);

/**
 * Admin Routes - Variant Operations
 */

/**
 * @route PATCH /api/admin/variants/reorder
 * @description Reorder variants for a product
 * @access Admin
 *
 * @requestBody
 * {
 *   "productId": "507f1f77bcf86cd799439011",
 *   "variants": [
 *     { "id": "variant1Id", "sortOrder": 0 },
 *     { "id": "variant2Id", "sortOrder": 1 },
 *     { "id": "variant3Id", "sortOrder": 2 }
 *   ]
 * }
 *
 * @example Request
 * PATCH /api/admin/variants/reorder
 * Content-Type: application/json
 * { "productId": "...", "variants": [{ "id": "...", "sortOrder": 0 }, { "id": "...", "sortOrder": 1 }] }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Variants reordered successfully",
 *   "data": { "modifiedCount": 2 },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
adminVariantRouter.patch("/reorder", validate(reorderVariantsSchema), reorderVariants);

/**
 * @route GET /api/admin/variants/:id
 * @description Get variant by ID
 * @access Admin
 *
 * @params
 * - id: Variant ObjectId
 *
 * @example Request
 * GET /api/admin/variants/507f1f77bcf86cd799439011
 *
 * @responseBody Success (200)
 * {
 *   "message": "Variant fetched successfully",
 *   "data": {
 *     "variant": {
 *       "_id": "507f1f77bcf86cd799439011",
 *       "name": "50ml",
 *       "sku": "ALO-FW-50",
 *       "barcode": "1234567890123",
 *       "variantType": "size",
 *       "mrp": 299,
 *       "salePrice": 249,
 *       "costPrice": 150,
 *       "discountPercent": 17,
 *       "weight": 50,
 *       "isDefault": true,
 *       "isActive": true,
 *       "sortOrder": 0,
 *       "product": { "_id": "...", "name": "Aloe Face Wash", "slug": "aloe-face-wash", "status": "active" },
 *       "createdAt": "...",
 *       "updatedAt": "..."
 *     }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Variant not found", "data": null, "error": "Variant with ID '...' not found" }
 */
adminVariantRouter.get("/:id", validate(variantIdParamSchema), getVariantByIdAdmin);

/**
 * @route PUT /api/admin/variants/:id
 * @description Update variant
 * @access Admin
 *
 * @params
 * - id: Variant ObjectId
 *
 * @requestBody
 * {
 *   "name": "100ml",
 *   "sku": "ALO-FW-100",
 *   "mrp": 499,
 *   "salePrice": 399,
 *   "weight": 100,
 *   "isDefault": true
 * }
 *
 * @example Request
 * PUT /api/admin/variants/507f1f77bcf86cd799439011
 * Content-Type: application/json
 * { "name": "100ml", "mrp": 499, "salePrice": 399 }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Variant updated successfully",
 *   "data": {
 *     "variant": { "_id": "...", "name": "100ml", "mrp": 499, "salePrice": 399, "discountPercent": 20, ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Variant not found", "data": null, "error": "Variant with ID '...' not found" }
 *
 * @responseBody Error (409)
 * { "message": "SKU already exists", "data": null, "error": "A variant with SKU '...' already exists" }
 */
adminVariantRouter.put("/:id", validate(updateVariantSchema), updateVariant);

/**
 * @route PATCH /api/admin/variants/:id/status
 * @description Toggle variant active status
 * @access Admin
 *
 * @params
 * - id: Variant ObjectId
 *
 * @requestBody
 * { "isActive": false }
 *
 * @example Request
 * PATCH /api/admin/variants/507f1f77bcf86cd799439011/status
 * Content-Type: application/json
 * { "isActive": false }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Variant status updated successfully",
 *   "data": {
 *     "variant": { "_id": "...", "name": "50ml", "isActive": false, ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Variant not found", "data": null, "error": "Variant with ID '...' not found" }
 */
adminVariantRouter.patch("/:id/status", validate(toggleVariantStatusSchema), toggleVariantStatus);

/**
 * @route DELETE /api/admin/variants/:id
 * @description Soft delete variant
 * @access Admin
 *
 * @params
 * - id: Variant ObjectId
 *
 * @example Request
 * DELETE /api/admin/variants/507f1f77bcf86cd799439011
 *
 * @responseBody Success (200)
 * {
 *   "message": "Variant deleted successfully",
 *   "data": {
 *     "variant": { "_id": "...", "name": "50ml", "deletedAt": "2024-01-01T00:00:00.000Z", ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Variant not found", "data": null, "error": "Variant with ID '...' not found" }
 *
 * @responseBody Error (400)
 * { "message": "Cannot delete variant", "data": null, "error": "Cannot delete the only active variant" }
 */
adminVariantRouter.delete("/:id", validate(variantIdParamSchema), deleteVariant);

export default {
  consumer: consumerRouter,
  adminProducts: adminRouter,
  adminVariants: adminVariantRouter,
};
