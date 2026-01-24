import { Router } from "express";
import {
  listIngredients,
  getIngredientBySlug,
  listAllIngredients,
  createIngredient,
  getIngredientById,
  updateIngredient,
  deleteIngredient,
} from "./ingredient.controller.js";
import { validate } from "@shared/middlewares";
import {
  createIngredientSchema,
  updateIngredientSchema,
  ingredientIdParamSchema,
  ingredientSlugParamSchema,
  listIngredientsQuerySchema,
} from "./ingredient.validation.js";

const consumerRouter = Router();
const adminRouter = Router();

/**
 * Consumer Routes
 */

/**
 * @route GET /api/ingredients
 * @description List all active ingredients
 * @access Public
 *
 * @example Request
 * GET /api/ingredients
 *
 * @responseBody Success (200)
 * {
 *   "message": "Ingredients fetched successfully",
 *   "data": {
 *     "ingredients": [
 *       { "_id": "507f1f77bcf86cd799439011", "name": "Aloe Vera", "slug": "aloe-vera", "benefits": ["Hydrating", "Soothing"], "image": { "url": "https://...", "publicId": "..." } },
 *       { "_id": "507f1f77bcf86cd799439012", "name": "Neem", "slug": "neem", "benefits": ["Antibacterial"], "image": null }
 *     ]
 *   },
 *   "error": null
 * }
 */
consumerRouter.get("/", listIngredients);

/**
 * @route GET /api/ingredients/:slug
 * @description Get ingredient by slug
 * @access Public
 *
 * @example Request
 * GET /api/ingredients/aloe-vera
 *
 * @responseBody Success (200)
 * {
 *   "message": "Ingredient fetched successfully",
 *   "data": {
 *     "ingredient": {
 *       "_id": "507f1f77bcf86cd799439011",
 *       "name": "Aloe Vera",
 *       "slug": "aloe-vera",
 *       "description": "A soothing plant extract known for its hydrating properties",
 *       "benefits": ["Hydrating", "Soothing", "Anti-inflammatory"],
 *       "image": { "url": "https://...", "publicId": "..." }
 *     }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Ingredient not found", "data": null, "error": "Ingredient with slug 'unknown' not found" }
 */
consumerRouter.get("/:slug", validate(ingredientSlugParamSchema), getIngredientBySlug);

/**
 * Admin Routes
 */

/**
 * @route GET /api/admin/ingredients
 * @description List all ingredients with pagination and filters
 * @access Admin
 *
 * @queryParams
 * - page (number): Page number, default 1
 * - limit (number): Items per page, default 20, max 100
 * - search (string): Search by name
 * - isActive (string): Filter by status ("true" or "false")
 * - sortBy (string): Sort field ("name" or "createdAt")
 * - order (string): Sort order ("asc" or "desc")
 *
 * @example Request
 * GET /api/admin/ingredients?page=1&limit=10&search=aloe&isActive=true&sortBy=name&order=asc
 *
 * @responseBody Success (200)
 * {
 *   "message": "Ingredients fetched successfully",
 *   "data": {
 *     "ingredients": [
 *       { "_id": "...", "name": "Aloe Vera", "slug": "aloe-vera", "description": "...", "benefits": [...], "image": {...}, "isActive": true, "createdAt": "...", "updatedAt": "..." }
 *     ],
 *     "pagination": { "total": 50, "page": 1, "limit": 10, "totalPages": 5, "hasNextPage": true, "hasPrevPage": false }
 *   },
 *   "error": null
 * }
 */
adminRouter.get("/", validate(listIngredientsQuerySchema), listAllIngredients);

/**
 * @route POST /api/admin/ingredients
 * @description Create a new ingredient
 * @access Admin
 *
 * @requestBody
 * {
 *   "name": "Aloe Vera",
 *   "description": "A soothing plant extract known for its hydrating properties",
 *   "benefits": ["Hydrating", "Soothing", "Anti-inflammatory"],
 *   "image": { "url": "https://res.cloudinary.com/.../aloe.png", "publicId": "ingredients/aloe123" },
 *   "isActive": true
 * }
 *
 * @example Request
 * POST /api/admin/ingredients
 * Content-Type: application/json
 * { "name": "Aloe Vera", "description": "A soothing plant", "benefits": ["Hydrating"] }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Ingredient created successfully",
 *   "data": {
 *     "ingredient": { "_id": "...", "name": "Aloe Vera", "slug": "aloe-vera", "description": "A soothing plant", "benefits": ["Hydrating"], "image": { "url": null, "publicId": null }, "isActive": true, "createdAt": "...", "updatedAt": "..." }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (400)
 * { "message": "Validation failed", "data": null, "error": [{ "field": "name", "message": "Ingredient name is required", "location": "body" }] }
 *
 * @responseBody Error (409)
 * { "message": "Ingredient already exists", "data": null, "error": "An ingredient with name 'Aloe Vera' already exists" }
 */
adminRouter.post("/", validate(createIngredientSchema), createIngredient);

/**
 * @route GET /api/admin/ingredients/:id
 * @description Get ingredient by ID
 * @access Admin
 *
 * @params
 * - id: Ingredient ObjectId
 *
 * @example Request
 * GET /api/admin/ingredients/507f1f77bcf86cd799439011
 *
 * @responseBody Success (200)
 * {
 *   "message": "Ingredient fetched successfully",
 *   "data": {
 *     "ingredient": { "_id": "507f1f77bcf86cd799439011", "name": "Aloe Vera", "slug": "aloe-vera", "description": "...", "benefits": [...], "image": {...}, "isActive": true, "createdAt": "...", "updatedAt": "..." }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Ingredient not found", "data": null, "error": "Ingredient with ID '507f1f77bcf86cd799439011' not found" }
 */
adminRouter.get("/:id", validate(ingredientIdParamSchema), getIngredientById);

/**
 * @route PUT /api/admin/ingredients/:id
 * @description Update ingredient
 * @access Admin
 *
 * @params
 * - id: Ingredient ObjectId
 *
 * @requestBody
 * {
 *   "name": "Updated Ingredient Name",
 *   "description": "Updated description",
 *   "benefits": ["Benefit 1", "Benefit 2"],
 *   "image": { "url": "https://...", "publicId": "..." },
 *   "isActive": true
 * }
 *
 * @example Request
 * PUT /api/admin/ingredients/507f1f77bcf86cd799439011
 * Content-Type: application/json
 * { "name": "Updated Aloe", "benefits": ["New Benefit"] }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Ingredient updated successfully",
 *   "data": {
 *     "ingredient": { "_id": "...", "name": "Updated Aloe", "slug": "updated-aloe", ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Ingredient not found", "data": null, "error": "Ingredient with ID '...' not found" }
 *
 * @responseBody Error (409)
 * { "message": "Ingredient name already exists", "data": null, "error": "An ingredient with name '...' already exists" }
 */
adminRouter.put("/:id", validate(updateIngredientSchema), updateIngredient);

/**
 * @route DELETE /api/admin/ingredients/:id
 * @description Soft delete ingredient
 * @access Admin
 *
 * @params
 * - id: Ingredient ObjectId
 *
 * @example Request
 * DELETE /api/admin/ingredients/507f1f77bcf86cd799439011
 *
 * @responseBody Success (200)
 * {
 *   "message": "Ingredient deleted successfully",
 *   "data": {
 *     "ingredient": { "_id": "...", "name": "Aloe Vera", "deletedAt": "2024-01-01T00:00:00.000Z", ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Ingredient not found", "data": null, "error": "Ingredient with ID '...' not found" }
 */
adminRouter.delete("/:id", validate(ingredientIdParamSchema), deleteIngredient);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
