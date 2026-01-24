import { Router } from "express";
import {
  listProductIngredients,
  mapIngredientToProduct,
  bulkMapIngredients,
  updateIngredientMapping,
  reorderProductIngredients,
  removeIngredientMapping,
} from "./product-ingredient.controller.js";
import { validate } from "@shared/middlewares";
import {
  mapIngredientSchema,
  updateMappingSchema,
  productIdParamSchema,
  mappingParamsSchema,
  reorderIngredientsSchema,
  bulkMapIngredientsSchema,
} from "./product-ingredient.validation.js";

const router = Router();

/**
 * @route GET /api/admin/products/:productId/ingredients
 * @description List all mapped ingredients for a product
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @example Request
 * GET /api/admin/products/507f1f77bcf86cd799439011/ingredients
 *
 * @responseBody Success (200)
 * {
 *   "message": "Product ingredients fetched successfully",
 *   "data": {
 *     "product": { "_id": "...", "name": "Aloe Face Wash", "slug": "aloe-face-wash" },
 *     "ingredients": [
 *       {
 *         "_id": "...",
 *         "ingredient": { "_id": "...", "name": "Aloe Vera", "slug": "aloe-vera", "image": { "url": "..." } },
 *         "percentage": 15,
 *         "isKeyIngredient": true,
 *         "sortOrder": 0
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
router.get("/:productId/ingredients", validate(productIdParamSchema), listProductIngredients);

/**
 * @route POST /api/admin/products/:productId/ingredients
 * @description Map an ingredient to a product
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @requestBody
 * {
 *   "ingredientId": "507f1f77bcf86cd799439012",
 *   "percentage": 15,
 *   "isKeyIngredient": true,
 *   "sortOrder": 0
 * }
 *
 * @example Request
 * POST /api/admin/products/507f1f77bcf86cd799439011/ingredients
 * Content-Type: application/json
 * { "ingredientId": "...", "percentage": 15, "isKeyIngredient": true }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Ingredient mapped successfully",
 *   "data": {
 *     "mapping": {
 *       "_id": "...",
 *       "product": "...",
 *       "ingredient": { "_id": "...", "name": "Aloe Vera", "slug": "aloe-vera" },
 *       "percentage": 15,
 *       "isKeyIngredient": true,
 *       "sortOrder": 0
 *     }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (400)
 * { "message": "Validation failed", "data": null, "error": [{ "field": "ingredientId", "message": "Ingredient ID is required", "location": "body" }] }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 *
 * @responseBody Error (409)
 * { "message": "Ingredient already mapped", "data": null, "error": "This ingredient is already mapped to this product" }
 */
router.post("/:productId/ingredients", validate(mapIngredientSchema), mapIngredientToProduct);

/**
 * @route POST /api/admin/products/:productId/ingredients/bulk
 * @description Bulk map ingredients to a product
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @requestBody
 * {
 *   "ingredients": [
 *     { "ingredientId": "...", "percentage": 15, "isKeyIngredient": true, "sortOrder": 0 },
 *     { "ingredientId": "...", "percentage": 10, "isKeyIngredient": false, "sortOrder": 1 }
 *   ]
 * }
 *
 * @example Request
 * POST /api/admin/products/507f1f77bcf86cd799439011/ingredients/bulk
 * Content-Type: application/json
 * { "ingredients": [{ "ingredientId": "...", "percentage": 15 }] }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Ingredients mapped successfully",
 *   "data": {
 *     "mappings": [{ "_id": "...", "ingredient": {...}, "percentage": 15, ... }],
 *     "count": 2,
 *     "skipped": 0
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (400)
 * { "message": "Invalid ingredient IDs", "data": null, "error": "Ingredient IDs not found: ..." }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
router.post(
  "/:productId/ingredients/bulk",
  validate(bulkMapIngredientsSchema),
  bulkMapIngredients
);

/**
 * @route PATCH /api/admin/products/:productId/ingredients/reorder
 * @description Reorder ingredients for a product
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @requestBody
 * {
 *   "ingredients": [
 *     { "ingredientId": "...", "sortOrder": 0 },
 *     { "ingredientId": "...", "sortOrder": 1 },
 *     { "ingredientId": "...", "sortOrder": 2 }
 *   ]
 * }
 *
 * @example Request
 * PATCH /api/admin/products/507f1f77bcf86cd799439011/ingredients/reorder
 * Content-Type: application/json
 * { "ingredients": [{ "ingredientId": "...", "sortOrder": 0 }, { "ingredientId": "...", "sortOrder": 1 }] }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Ingredients reordered successfully",
 *   "data": { "modifiedCount": 3 },
 *   "error": null
 * }
 *
 * @responseBody Error (400)
 * { "message": "Invalid ingredient IDs", "data": null, "error": "Some ingredients are not mapped to this product" }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
router.patch(
  "/:productId/ingredients/reorder",
  validate(reorderIngredientsSchema),
  reorderProductIngredients
);

/**
 * @route PUT /api/admin/products/:productId/ingredients/:ingredientId
 * @description Update an ingredient mapping
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 * - ingredientId: Ingredient ObjectId
 *
 * @requestBody
 * {
 *   "percentage": 20,
 *   "isKeyIngredient": false,
 *   "sortOrder": 1
 * }
 *
 * @example Request
 * PUT /api/admin/products/507f1f77bcf86cd799439011/ingredients/507f1f77bcf86cd799439012
 * Content-Type: application/json
 * { "percentage": 20, "isKeyIngredient": false }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Mapping updated successfully",
 *   "data": {
 *     "mapping": {
 *       "_id": "...",
 *       "ingredient": { "_id": "...", "name": "Aloe Vera", "slug": "aloe-vera" },
 *       "percentage": 20,
 *       "isKeyIngredient": false,
 *       "sortOrder": 1
 *     }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (400)
 * { "message": "Validation failed", "data": null, "error": "At least one field is required to update" }
 *
 * @responseBody Error (404)
 * { "message": "Mapping not found", "data": null, "error": "No mapping found for this product and ingredient" }
 */
router.put(
  "/:productId/ingredients/:ingredientId",
  validate(updateMappingSchema),
  updateIngredientMapping
);

/**
 * @route DELETE /api/admin/products/:productId/ingredients/:ingredientId
 * @description Remove an ingredient mapping from a product
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 * - ingredientId: Ingredient ObjectId
 *
 * @example Request
 * DELETE /api/admin/products/507f1f77bcf86cd799439011/ingredients/507f1f77bcf86cd799439012
 *
 * @responseBody Success (200)
 * {
 *   "message": "Ingredient removed successfully",
 *   "data": {
 *     "mapping": {
 *       "_id": "...",
 *       "product": "...",
 *       "ingredient": "...",
 *       "percentage": 15,
 *       "isKeyIngredient": true
 *     }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Mapping not found", "data": null, "error": "No mapping found for this product and ingredient" }
 */
router.delete(
  "/:productId/ingredients/:ingredientId",
  validate(mappingParamsSchema),
  removeIngredientMapping
);

export default router;
