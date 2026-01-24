import { Router } from "express";
import {
  listProductCategories,
  assignCategoryToProduct,
  bulkAssignCategories,
  setPrimaryCategory,
  removeCategoryFromProduct,
} from "./product-category.controller.js";
import { validate } from "@shared/middlewares";
import {
  assignCategorySchema,
  bulkAssignCategoriesSchema,
  productIdParamSchema,
  mappingParamsSchema,
  setPrimaryCategorySchema,
} from "./product-category.validation.js";

const router = Router();

/**
 * @route GET /api/admin/products/:productId/categories
 * @description List all assigned categories for a product
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @example Request
 * GET /api/admin/products/507f1f77bcf86cd799439011/categories
 *
 * @responseBody Success (200)
 * {
 *   "message": "Product categories fetched successfully",
 *   "data": {
 *     "product": { "_id": "...", "name": "Aloe Face Wash", "slug": "aloe-face-wash" },
 *     "categories": [
 *       {
 *         "_id": "...",
 *         "category": { "_id": "...", "name": "Face Wash", "slug": "face-wash", "level": 1, "path": "/skincare/face-wash" },
 *         "isPrimary": true,
 *         "createdAt": "..."
 *       }
 *     ],
 *     "count": 1
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
router.get("/:productId/categories", validate(productIdParamSchema), listProductCategories);

/**
 * @route POST /api/admin/products/:productId/categories
 * @description Assign a category to a product
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @requestBody
 * {
 *   "categoryId": "507f1f77bcf86cd799439012",
 *   "isPrimary": true
 * }
 *
 * @example Request
 * POST /api/admin/products/507f1f77bcf86cd799439011/categories
 * Content-Type: application/json
 * { "categoryId": "...", "isPrimary": true }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Category assigned successfully",
 *   "data": {
 *     "mapping": {
 *       "_id": "...",
 *       "product": "...",
 *       "category": { "_id": "...", "name": "Face Wash", "slug": "face-wash" },
 *       "isPrimary": true
 *     }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (400)
 * { "message": "Validation failed", "data": null, "error": [{ "field": "categoryId", "message": "Category ID is required", "location": "body" }] }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 *
 * @responseBody Error (409)
 * { "message": "Category already assigned", "data": null, "error": "This category is already assigned to this product" }
 */
router.post("/:productId/categories", validate(assignCategorySchema), assignCategoryToProduct);

/**
 * @route POST /api/admin/products/:productId/categories/bulk
 * @description Bulk assign categories to a product
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @requestBody
 * {
 *   "categories": [
 *     { "categoryId": "...", "isPrimary": true },
 *     { "categoryId": "...", "isPrimary": false }
 *   ]
 * }
 *
 * @example Request
 * POST /api/admin/products/507f1f77bcf86cd799439011/categories/bulk
 * Content-Type: application/json
 * { "categories": [{ "categoryId": "...", "isPrimary": true }] }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Categories assigned successfully",
 *   "data": {
 *     "mappings": [{ "_id": "...", "category": {...}, "isPrimary": true }],
 *     "count": 2,
 *     "skipped": 0
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (400)
 * { "message": "Invalid category IDs", "data": null, "error": "Category IDs not found: ..." }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
router.post(
  "/:productId/categories/bulk",
  validate(bulkAssignCategoriesSchema),
  bulkAssignCategories
);

/**
 * @route PATCH /api/admin/products/:productId/categories/:categoryId/primary
 * @description Set a category as primary for a product
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 * - categoryId: Category ObjectId
 *
 * @example Request
 * PATCH /api/admin/products/507f1f77bcf86cd799439011/categories/507f1f77bcf86cd799439012/primary
 *
 * @responseBody Success (200)
 * {
 *   "message": "Primary category set successfully",
 *   "data": {
 *     "mapping": {
 *       "_id": "...",
 *       "category": { "_id": "...", "name": "Face Wash", "slug": "face-wash" },
 *       "isPrimary": true
 *     }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Mapping not found", "data": null, "error": "This category is not assigned to this product" }
 */
router.patch(
  "/:productId/categories/:categoryId/primary",
  validate(setPrimaryCategorySchema),
  setPrimaryCategory
);

/**
 * @route DELETE /api/admin/products/:productId/categories/:categoryId
 * @description Remove a category from a product
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 * - categoryId: Category ObjectId
 *
 * @example Request
 * DELETE /api/admin/products/507f1f77bcf86cd799439011/categories/507f1f77bcf86cd799439012
 *
 * @responseBody Success (200)
 * {
 *   "message": "Category removed successfully",
 *   "data": {
 *     "mapping": {
 *       "_id": "...",
 *       "product": "...",
 *       "category": "...",
 *       "isPrimary": false
 *     }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Mapping not found", "data": null, "error": "This category is not assigned to this product" }
 */
router.delete(
  "/:productId/categories/:categoryId",
  validate(mappingParamsSchema),
  removeCategoryFromProduct
);

export default router;
