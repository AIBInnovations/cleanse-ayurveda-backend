import { Router } from "express";
import {
  listBrands,
  getBrandBySlug,
  listAllBrands,
  createBrand,
  getBrandById,
  updateBrand,
  toggleBrandStatus,
  deleteBrand,
} from "./brand.controller.js";
import { validate } from "@shared/middlewares";
import { authenticateAdmin } from "@shared/auth-middleware";
import {
  createBrandSchema,
  updateBrandSchema,
  brandIdParamSchema,
  brandSlugParamSchema,
  toggleBrandStatusSchema,
  listBrandsQuerySchema,
} from "./brand.validation.js";

const consumerRouter = Router();
const adminRouter = Router();

/**
 * Consumer Routes
 */

/**
 * @route GET /api/brands
 * @description List all active brands
 * @access Public
 *
 * @example Request
 * GET /api/brands
 *
 * @responseBody Success (200)
 * {
 *   "message": "Brands fetched successfully",
 *   "data": {
 *     "brands": [
 *       { "_id": "507f1f77bcf86cd799439011", "name": "Brand A", "slug": "brand-a", "logo": { "url": "https://...", "publicId": "..." } },
 *       { "_id": "507f1f77bcf86cd799439012", "name": "Brand B", "slug": "brand-b", "logo": null }
 *     ]
 *   },
 *   "error": null
 * }
 */
consumerRouter.get("/", listBrands);

/**
 * @route GET /api/brands/:slug
 * @description Get brand by slug
 * @access Public
 *
 * @example Request
 * GET /api/brands/brand-a
 *
 * @responseBody Success (200)
 * {
 *   "message": "Brand fetched successfully",
 *   "data": {
 *     "brand": { "_id": "507f1f77bcf86cd799439011", "name": "Brand A", "slug": "brand-a", "description": "Description here", "logo": { "url": "https://...", "publicId": "..." } }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Brand not found", "data": null, "error": "Brand with slug 'unknown' not found" }
 */
consumerRouter.get("/:slug", validate(brandSlugParamSchema), getBrandBySlug);

/**
 * Admin Routes
 */

// Apply admin authentication to all admin routes
adminRouter.use(authenticateAdmin);

/**
 * @route GET /api/admin/brands
 * @description List all brands with pagination and filters
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
 * GET /api/admin/brands?page=1&limit=10&search=brand&isActive=true&sortBy=name&order=asc
 *
 * @responseBody Success (200)
 * {
 *   "message": "Brands fetched successfully",
 *   "data": {
 *     "brands": [
 *       { "_id": "...", "name": "Brand A", "slug": "brand-a", "description": "...", "logo": {...}, "isActive": true, "createdAt": "...", "updatedAt": "..." }
 *     ],
 *     "pagination": { "total": 50, "page": 1, "limit": 10, "totalPages": 5, "hasNextPage": true, "hasPrevPage": false }
 *   },
 *   "error": null
 * }
 */
adminRouter.get("/", validate(listBrandsQuerySchema), listAllBrands);

/**
 * @route POST /api/admin/brands
 * @description Create a new brand
 * @access Admin
 *
 * @requestBody
 * {
 *   "name": "New Brand",
 *   "description": "Brand description",
 *   "logo": { "url": "https://res.cloudinary.com/.../logo.png", "publicId": "brands/logo123" },
 *   "isActive": true
 * }
 *
 * @example Request
 * POST /api/admin/brands
 * Content-Type: application/json
 * { "name": "New Brand", "description": "A new brand" }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Brand created successfully",
 *   "data": {
 *     "brand": { "_id": "...", "name": "New Brand", "slug": "new-brand", "description": "A new brand", "logo": { "url": null, "publicId": null }, "isActive": true, "createdAt": "...", "updatedAt": "..." }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (400)
 * { "message": "Validation failed", "data": null, "error": [{ "field": "name", "message": "Brand name is required", "location": "body" }] }
 *
 * @responseBody Error (409)
 * { "message": "Brand already exists", "data": null, "error": "A brand with name 'New Brand' already exists" }
 */
adminRouter.post("/", validate(createBrandSchema), createBrand);

/**
 * @route GET /api/admin/brands/:id
 * @description Get brand by ID
 * @access Admin
 *
 * @params
 * - id: Brand ObjectId
 *
 * @example Request
 * GET /api/admin/brands/507f1f77bcf86cd799439011
 *
 * @responseBody Success (200)
 * {
 *   "message": "Brand fetched successfully",
 *   "data": {
 *     "brand": { "_id": "507f1f77bcf86cd799439011", "name": "Brand A", "slug": "brand-a", "description": "...", "logo": {...}, "isActive": true, "createdAt": "...", "updatedAt": "..." }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Brand not found", "data": null, "error": "Brand with ID '507f1f77bcf86cd799439011' not found" }
 */
adminRouter.get("/:id", validate(brandIdParamSchema), getBrandById);

/**
 * @route PUT /api/admin/brands/:id
 * @description Update brand
 * @access Admin
 *
 * @params
 * - id: Brand ObjectId
 *
 * @requestBody
 * {
 *   "name": "Updated Brand Name",
 *   "description": "Updated description",
 *   "logo": { "url": "https://...", "publicId": "..." },
 *   "isActive": true
 * }
 *
 * @example Request
 * PUT /api/admin/brands/507f1f77bcf86cd799439011
 * Content-Type: application/json
 * { "name": "Updated Brand", "description": "New description" }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Brand updated successfully",
 *   "data": {
 *     "brand": { "_id": "...", "name": "Updated Brand", "slug": "updated-brand", ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Brand not found", "data": null, "error": "Brand with ID '...' not found" }
 *
 * @responseBody Error (409)
 * { "message": "Brand name already exists", "data": null, "error": "A brand with name '...' already exists" }
 */
adminRouter.put("/:id", validate(updateBrandSchema), updateBrand);

/**
 * @route PATCH /api/admin/brands/:id/status
 * @description Toggle brand active status
 * @access Admin
 *
 * @params
 * - id: Brand ObjectId
 *
 * @requestBody
 * { "isActive": false }
 *
 * @example Request
 * PATCH /api/admin/brands/507f1f77bcf86cd799439011/status
 * Content-Type: application/json
 * { "isActive": false }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Brand status updated successfully",
 *   "data": {
 *     "brand": { "_id": "...", "name": "Brand A", "isActive": false, ... }
 *   },
 *   "error": null
 * }
 */
adminRouter.patch("/:id/status", validate(toggleBrandStatusSchema), toggleBrandStatus);

/**
 * @route DELETE /api/admin/brands/:id
 * @description Soft delete brand
 * @access Admin
 *
 * @params
 * - id: Brand ObjectId
 *
 * @example Request
 * DELETE /api/admin/brands/507f1f77bcf86cd799439011
 *
 * @responseBody Success (200)
 * {
 *   "message": "Brand deleted successfully",
 *   "data": {
 *     "brand": { "_id": "...", "name": "Brand A", "deletedAt": "2024-01-01T00:00:00.000Z", ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Brand not found", "data": null, "error": "Brand with ID '...' not found" }
 */
adminRouter.delete("/:id", validate(brandIdParamSchema), deleteBrand);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
