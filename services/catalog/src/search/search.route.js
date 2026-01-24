import { Router } from "express";
import {
  searchProducts,
  getSearchSuggestions,
  searchInCategory,
  listSynonyms,
  createSynonym,
  updateSynonym,
  deleteSynonym,
  getSearchAnalytics,
} from "./search.controller.js";
import { validate } from "@shared/middlewares";
import {
  searchQuerySchema,
  suggestionsQuerySchema,
  searchInCategorySchema,
  listSynonymsQuerySchema,
  createSynonymSchema,
  updateSynonymSchema,
  synonymIdParamSchema,
  analyticsQuerySchema,
} from "./search.validation.js";

const consumerRouter = Router();
const adminRouter = Router();

/**
 * Consumer Routes
 */

/**
 * @route GET /api/search
 * @description Full-text search with filters
 * @access Public
 *
 * @query
 * - q: string (required) - Search query
 * - category: ObjectId - Filter by category
 * - brand: ObjectId - Filter by brand
 * - minPrice: number - Minimum price
 * - maxPrice: number - Maximum price
 * - skinType: string|string[] - Filter by skin type
 * - rating: number (1-5) - Minimum rating
 * - sort: string (relevance, price_asc, price_desc, rating, newest)
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 50)
 *
 * @example Request
 * GET /api/search?q=aloe&category=...&minPrice=100&maxPrice=500&sort=price_asc
 *
 * @responseBody Success (200)
 * {
 *   "message": "Search results fetched successfully",
 *   "data": {
 *     "query": "aloe",
 *     "products": [
 *       {
 *         "_id": "...",
 *         "name": "Aloe Face Wash",
 *         "slug": "aloe-face-wash",
 *         "primaryImage": {...},
 *         "pricing": { "mrp": 500, "salePrice": 450 },
 *         "ratingSummary": {...}
 *       }
 *     ],
 *     "facets": {
 *       "categories": [{ "_id": "...", "name": "Face Care", "count": 10 }],
 *       "brands": [{ "_id": "...", "name": "Ayurvedic Herbs", "count": 5 }],
 *       "priceRanges": [{ "range": "0-500", "count": 15 }]
 *     },
 *     "pagination": { "page": 1, "limit": 20, "total": 50, "totalPages": 3 }
 *   },
 *   "error": null
 * }
 */
consumerRouter.get("/", validate(searchQuerySchema), searchProducts);

/**
 * @route GET /api/search/suggestions
 * @description Get search suggestions for typeahead/autocomplete
 * @access Public
 *
 * @query
 * - q: string (required) - Partial search query
 * - limit: number (default: 5, max: 10)
 *
 * @example Request
 * GET /api/search/suggestions?q=alo&limit=5
 *
 * @responseBody Success (200)
 * {
 *   "message": "Suggestions fetched successfully",
 *   "data": {
 *     "suggestions": [
 *       { "type": "product", "text": "Aloe Face Wash", "slug": "aloe-face-wash" },
 *       { "type": "product", "text": "Aloe Vera Gel", "slug": "aloe-vera-gel" },
 *       { "type": "category", "text": "Aloe Products", "slug": "aloe-products" },
 *       { "type": "brand", "text": "Aloe Naturals", "slug": "aloe-naturals" }
 *     ]
 *   },
 *   "error": null
 * }
 */
consumerRouter.get(
  "/suggestions",
  validate(suggestionsQuerySchema),
  getSearchSuggestions
);

/**
 * @route GET /api/search/category/:categorySlug
 * @description Search products within a specific category
 * @access Public
 *
 * @params
 * - categorySlug: Category slug
 *
 * @query
 * - q: string (optional) - Search query within category
 * - brand: ObjectId - Filter by brand
 * - minPrice: number - Minimum price
 * - maxPrice: number - Maximum price
 * - skinType: string|string[] - Filter by skin type
 * - sort: string (relevance, price_asc, price_desc, rating, newest)
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 50)
 *
 * @example Request
 * GET /api/search/category/face-care?q=wash&sort=price_asc
 *
 * @responseBody Success (200)
 * {
 *   "message": "Category search results fetched successfully",
 *   "data": {
 *     "category": { "_id": "...", "name": "Face Care", "slug": "face-care" },
 *     "products": [...],
 *     "pagination": { "page": 1, "limit": 20, "total": 30, "totalPages": 2 }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Category not found", "data": null, "error": "Category with slug 'xyz' not found" }
 */
consumerRouter.get(
  "/category/:categorySlug",
  validate(searchInCategorySchema),
  searchInCategory
);

/**
 * Admin Routes
 */

/**
 * @route GET /api/admin/search/synonyms
 * @description List all search synonyms
 * @access Admin
 *
 * @query
 * - isActive: boolean
 * - search: string
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 *
 * @example Request
 * GET /api/admin/search/synonyms?isActive=true&page=1
 *
 * @responseBody Success (200)
 * {
 *   "message": "Synonyms fetched successfully",
 *   "data": {
 *     "synonyms": [
 *       { "_id": "...", "term": "face wash", "synonyms": ["facial cleanser", "face cleanser"], "isActive": true }
 *     ],
 *     "pagination": { "page": 1, "limit": 20, "total": 50, "totalPages": 3 }
 *   },
 *   "error": null
 * }
 */
adminRouter.get("/synonyms", validate(listSynonymsQuerySchema), listSynonyms);

/**
 * @route POST /api/admin/search/synonyms
 * @description Create a new search synonym
 * @access Admin
 *
 * @requestBody
 * {
 *   "term": "face wash",
 *   "synonyms": ["facial cleanser", "face cleanser", "face cleaning"],
 *   "isActive": true
 * }
 *
 * @example Request
 * POST /api/admin/search/synonyms
 * Content-Type: application/json
 * { "term": "moisturizer", "synonyms": ["moisturiser", "hydrating cream"] }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Synonym created successfully",
 *   "data": {
 *     "synonym": { "_id": "...", "term": "moisturizer", "synonyms": [...], "isActive": true }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (409)
 * { "message": "Term already exists", "data": null, "error": "A synonym entry for term 'moisturizer' already exists" }
 */
adminRouter.post("/synonyms", validate(createSynonymSchema), createSynonym);

/**
 * @route PUT /api/admin/search/synonyms/:id
 * @description Update a search synonym
 * @access Admin
 *
 * @params
 * - id: Synonym ObjectId
 *
 * @requestBody
 * {
 *   "term": "updated term",
 *   "synonyms": ["synonym1", "synonym2"],
 *   "isActive": false
 * }
 *
 * @example Request
 * PUT /api/admin/search/synonyms/507f1f77bcf86cd799439011
 * Content-Type: application/json
 * { "synonyms": ["new synonym"] }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Synonym updated successfully",
 *   "data": {
 *     "synonym": { "_id": "...", "term": "...", "synonyms": [...], "isActive": ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Synonym not found", "data": null, "error": "Synonym with ID '...' not found" }
 */
adminRouter.put("/synonyms/:id", validate(updateSynonymSchema), updateSynonym);

/**
 * @route DELETE /api/admin/search/synonyms/:id
 * @description Delete a search synonym
 * @access Admin
 *
 * @params
 * - id: Synonym ObjectId
 *
 * @example Request
 * DELETE /api/admin/search/synonyms/507f1f77bcf86cd799439011
 *
 * @responseBody Success (200)
 * {
 *   "message": "Synonym deleted successfully",
 *   "data": { "deleted": true },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Synonym not found", "data": null, "error": "Synonym with ID '...' not found" }
 */
adminRouter.delete(
  "/synonyms/:id",
  validate(synonymIdParamSchema),
  deleteSynonym
);

/**
 * @route GET /api/admin/search/analytics
 * @description Get basic search analytics
 * @access Admin
 *
 * @query
 * - startDate: ISO date
 * - endDate: ISO date
 * - limit: number (default: 20, max: 100)
 *
 * @example Request
 * GET /api/admin/search/analytics?limit=10
 *
 * @responseBody Success (200)
 * {
 *   "message": "Search analytics fetched successfully",
 *   "data": {
 *     "summary": {
 *       "totalProducts": 500,
 *       "activeProducts": 450,
 *       "totalCategories": 20,
 *       "totalBrands": 15,
 *       "totalSynonyms": 50,
 *       "activeSynonyms": 45
 *     },
 *     "topCategories": [
 *       { "_id": "...", "name": "Face Care", "productCount": 100 }
 *     ],
 *     "topBrands": [
 *       { "_id": "...", "name": "Ayurvedic Herbs", "productCount": 50 }
 *     ]
 *   },
 *   "error": null
 * }
 */
adminRouter.get("/analytics", validate(analyticsQuerySchema), getSearchAnalytics);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
