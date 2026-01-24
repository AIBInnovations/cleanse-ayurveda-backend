import { Router } from "express";
import {
  getCategoryTree,
  getCategoryBySlug,
  getCategoryProducts,
  listAllCategories,
  createCategory,
  getCategoryById,
  updateCategory,
  reorderCategory,
  toggleCategoryVisibility,
  deleteCategory,
} from "./category.controller.js";
import { validate } from "@shared/middlewares";
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  categorySlugParamSchema,
  listCategoriesQuerySchema,
  reorderCategorySchema,
  toggleCategoryVisibilitySchema,
  categoryProductsSchema,
} from "./category.validation.js";

const consumerRouter = Router();
const adminRouter = Router();

/**
 * Consumer Routes
 */

/**
 * @route GET /api/categories
 * @description Get category tree for menu
 * @access Public
 *
 * @example Request
 * GET /api/categories
 *
 * @responseBody Success (200)
 * {
 *   "message": "Categories fetched successfully",
 *   "data": {
 *     "categories": [
 *       {
 *         "_id": "507f1f77bcf86cd799439011",
 *         "name": "Skincare",
 *         "slug": "skincare",
 *         "image": { "url": "https://...", "publicId": "..." },
 *         "children": [
 *           { "_id": "...", "name": "Face Wash", "slug": "face-wash", "children": [] }
 *         ]
 *       }
 *     ]
 *   },
 *   "error": null
 * }
 */
consumerRouter.get("/", getCategoryTree);

/**
 * @route GET /api/categories/:slug
 * @description Get category by slug with subcategories
 * @access Public
 *
 * @example Request
 * GET /api/categories/skincare
 *
 * @responseBody Success (200)
 * {
 *   "message": "Category fetched successfully",
 *   "data": {
 *     "category": {
 *       "_id": "507f1f77bcf86cd799439011",
 *       "name": "Skincare",
 *       "slug": "skincare",
 *       "description": "All skincare products",
 *       "image": { "url": "https://...", "publicId": "..." },
 *       "banner": { "url": "https://...", "publicId": "..." },
 *       "seo": { "title": "...", "description": "...", "keywords": [] },
 *       "subcategories": [
 *         { "_id": "...", "name": "Face Wash", "slug": "face-wash", "image": {...} }
 *       ]
 *     }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Category not found", "data": null, "error": "Category with slug 'unknown' not found" }
 */
consumerRouter.get("/:slug", validate(categorySlugParamSchema), getCategoryBySlug);

/**
 * @route GET /api/categories/:slug/products
 * @description Get products in category
 * @access Public
 *
 * @queryParams
 * - page (number): Page number, default 1
 * - limit (number): Items per page, default 20, max 50
 * - sortBy (string): Sort field ("name" or "createdAt")
 * - order (string): Sort order ("asc" or "desc")
 * - includeSubcategories (string): Include products from subcategories ("true" or "false", default "true")
 *
 * @example Request
 * GET /api/categories/skincare/products?page=1&limit=10&sortBy=name&order=asc
 *
 * @responseBody Success (200)
 * {
 *   "message": "Products fetched successfully",
 *   "data": {
 *     "category": { "_id": "...", "name": "Skincare", "slug": "skincare" },
 *     "products": [
 *       { "_id": "...", "name": "Aloe Face Wash", "slug": "aloe-face-wash", ... }
 *     ],
 *     "pagination": { "total": 50, "page": 1, "limit": 10, "totalPages": 5, "hasNextPage": true, "hasPrevPage": false }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Category not found", "data": null, "error": "Category with slug 'unknown' not found" }
 */
consumerRouter.get("/:slug/products", validate(categoryProductsSchema), getCategoryProducts);

/**
 * Admin Routes
 */

/**
 * @route GET /api/admin/categories
 * @description List all categories (tree or flat)
 * @access Admin
 *
 * @queryParams
 * - page (number): Page number, default 1 (flat mode only)
 * - limit (number): Items per page, default 20, max 100 (flat mode only)
 * - search (string): Search by name
 * - isActive (string): Filter by status ("true" or "false")
 * - showInMenu (string): Filter by menu visibility ("true" or "false")
 * - parent (string): Filter by parent ID (use "null" for root categories)
 * - level (number): Filter by level
 * - sortBy (string): Sort field ("name", "createdAt", "sortOrder")
 * - order (string): Sort order ("asc" or "desc")
 * - flat (string): Return flat list ("true" or "false", default "false")
 *
 * @example Request (tree mode)
 * GET /api/admin/categories
 *
 * @example Request (flat mode)
 * GET /api/admin/categories?flat=true&page=1&limit=10
 *
 * @responseBody Success (200) - Tree mode
 * {
 *   "message": "Categories fetched successfully",
 *   "data": {
 *     "categories": [
 *       { "_id": "...", "name": "Skincare", "slug": "skincare", "children": [...] }
 *     ]
 *   },
 *   "error": null
 * }
 *
 * @responseBody Success (200) - Flat mode
 * {
 *   "message": "Categories fetched successfully",
 *   "data": {
 *     "categories": [...],
 *     "pagination": { "total": 50, "page": 1, "limit": 10, "totalPages": 5, "hasNextPage": true, "hasPrevPage": false }
 *   },
 *   "error": null
 * }
 */
adminRouter.get("/", validate(listCategoriesQuerySchema), listAllCategories);

/**
 * @route POST /api/admin/categories
 * @description Create a new category
 * @access Admin
 *
 * @requestBody
 * {
 *   "name": "Skincare",
 *   "description": "All skincare products",
 *   "parent": "507f1f77bcf86cd799439011",
 *   "image": { "url": "https://res.cloudinary.com/.../image.png", "publicId": "categories/image123" },
 *   "banner": { "url": "https://res.cloudinary.com/.../banner.png", "publicId": "categories/banner123" },
 *   "seo": { "title": "Skincare Products", "description": "Shop skincare", "keywords": ["skincare"] },
 *   "showInMenu": true,
 *   "sortOrder": 1,
 *   "isActive": true
 * }
 *
 * @example Request
 * POST /api/admin/categories
 * Content-Type: application/json
 * { "name": "Skincare", "description": "All skincare products" }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Category created successfully",
 *   "data": {
 *     "category": { "_id": "...", "name": "Skincare", "slug": "skincare", "level": 0, "path": "skincare", ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (400)
 * { "message": "Validation failed", "data": null, "error": [{ "field": "name", "message": "Category name is required", "location": "body" }] }
 *
 * @responseBody Error (409)
 * { "message": "Category already exists", "data": null, "error": "A category with name 'Skincare' already exists" }
 *
 * @responseBody Error (404)
 * { "message": "Parent category not found", "data": null, "error": "Parent category with ID '...' not found" }
 */
adminRouter.post("/", validate(createCategorySchema), createCategory);

/**
 * @route GET /api/admin/categories/:id
 * @description Get category by ID
 * @access Admin
 *
 * @params
 * - id: Category ObjectId
 *
 * @example Request
 * GET /api/admin/categories/507f1f77bcf86cd799439011
 *
 * @responseBody Success (200)
 * {
 *   "message": "Category fetched successfully",
 *   "data": {
 *     "category": { "_id": "507f1f77bcf86cd799439011", "name": "Skincare", "slug": "skincare", "parent": { "_id": "...", "name": "...", "slug": "..." }, ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Category not found", "data": null, "error": "Category with ID '507f1f77bcf86cd799439011' not found" }
 */
adminRouter.get("/:id", validate(categoryIdParamSchema), getCategoryById);

/**
 * @route PUT /api/admin/categories/:id
 * @description Update category
 * @access Admin
 *
 * @params
 * - id: Category ObjectId
 *
 * @requestBody
 * {
 *   "name": "Updated Category Name",
 *   "description": "Updated description",
 *   "parent": "507f1f77bcf86cd799439011",
 *   "image": { "url": "https://...", "publicId": "..." },
 *   "banner": { "url": "https://...", "publicId": "..." },
 *   "seo": { "title": "...", "description": "...", "keywords": [] },
 *   "showInMenu": true,
 *   "sortOrder": 2,
 *   "isActive": true
 * }
 *
 * @example Request
 * PUT /api/admin/categories/507f1f77bcf86cd799439011
 * Content-Type: application/json
 * { "name": "Updated Skincare", "sortOrder": 2 }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Category updated successfully",
 *   "data": {
 *     "category": { "_id": "...", "name": "Updated Skincare", "slug": "updated-skincare", ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Category not found", "data": null, "error": "Category with ID '...' not found" }
 *
 * @responseBody Error (409)
 * { "message": "Category name already exists", "data": null, "error": "A category with name '...' already exists" }
 *
 * @responseBody Error (400)
 * { "message": "Invalid parent", "data": null, "error": "Category cannot be its own parent" }
 */
adminRouter.put("/:id", validate(updateCategorySchema), updateCategory);

/**
 * @route PATCH /api/admin/categories/:id/reorder
 * @description Reorder category
 * @access Admin
 *
 * @params
 * - id: Category ObjectId
 *
 * @requestBody
 * { "sortOrder": 2 }
 *
 * @example Request
 * PATCH /api/admin/categories/507f1f77bcf86cd799439011/reorder
 * Content-Type: application/json
 * { "sortOrder": 2 }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Category reordered successfully",
 *   "data": {
 *     "category": { "_id": "...", "name": "Skincare", "sortOrder": 2, ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Category not found", "data": null, "error": "Category with ID '...' not found" }
 */
adminRouter.patch("/:id/reorder", validate(reorderCategorySchema), reorderCategory);

/**
 * @route PATCH /api/admin/categories/:id/visibility
 * @description Toggle category menu visibility
 * @access Admin
 *
 * @params
 * - id: Category ObjectId
 *
 * @requestBody
 * { "showInMenu": false }
 *
 * @example Request
 * PATCH /api/admin/categories/507f1f77bcf86cd799439011/visibility
 * Content-Type: application/json
 * { "showInMenu": false }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Category visibility updated successfully",
 *   "data": {
 *     "category": { "_id": "...", "name": "Skincare", "showInMenu": false, ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Category not found", "data": null, "error": "Category with ID '...' not found" }
 */
adminRouter.patch("/:id/visibility", validate(toggleCategoryVisibilitySchema), toggleCategoryVisibility);

/**
 * @route DELETE /api/admin/categories/:id
 * @description Soft delete category
 * @access Admin
 *
 * @params
 * - id: Category ObjectId
 *
 * @example Request
 * DELETE /api/admin/categories/507f1f77bcf86cd799439011
 *
 * @responseBody Success (200)
 * {
 *   "message": "Category deleted successfully",
 *   "data": {
 *     "category": { "_id": "...", "name": "Skincare", "deletedAt": "2024-01-01T00:00:00.000Z", ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Category not found", "data": null, "error": "Category with ID '...' not found" }
 *
 * @responseBody Error (400)
 * { "message": "Cannot delete category", "data": null, "error": "Category has subcategories. Delete or reassign them first." }
 */
adminRouter.delete("/:id", validate(categoryIdParamSchema), deleteCategory);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
