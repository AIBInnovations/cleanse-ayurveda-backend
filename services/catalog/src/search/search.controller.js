import Product from "../../models/product.model.js";
import ProductVariant from "../../models/product-variant.model.js";
import ProductMedia from "../../models/product-media.model.js";
import ProductCategory from "../../models/product-category.model.js";
import Category from "../../models/category.model.js";
import Brand from "../../models/brand.model.js";
import SearchSynonym from "../../models/search-synonym.model.js";
import { sendResponse } from "@shared/utils";

/**
 * Calculates Levenshtein distance between two strings for typo tolerance
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} - Edit distance
 */
const levenshteinDistance = (a, b) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

/**
 * Expands search query with synonyms
 * @param {string} query - Original search query
 * @returns {Promise<string[]>} - Array of search terms including synonyms
 */
const expandQueryWithSynonyms = async (query) => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const expandedTerms = new Set(terms);

  // Find synonyms for each term
  for (const term of terms) {
    const synonym = await SearchSynonym.findOne({
      term,
      isActive: true,
    });

    if (synonym) {
      synonym.synonyms.forEach((s) => expandedTerms.add(s.toLowerCase()));
    }

    // Also check if term is a synonym of something
    const reverseMatch = await SearchSynonym.findOne({
      synonyms: term,
      isActive: true,
    });

    if (reverseMatch) {
      expandedTerms.add(reverseMatch.term.toLowerCase());
      reverseMatch.synonyms.forEach((s) => expandedTerms.add(s.toLowerCase()));
    }
  }

  return Array.from(expandedTerms);
};

/**
 * Builds MongoDB text search query with synonym expansion
 * @param {string} query - Search query
 * @returns {Promise<object>} - MongoDB query object
 */
const buildSearchQuery = async (query) => {
  const expandedTerms = await expandQueryWithSynonyms(query);
  return { $text: { $search: expandedTerms.join(" ") } };
};

/**
 * Enriches products with primary image and pricing
 * @param {Array} products - Array of product documents
 * @returns {Promise<Array>} - Enriched products
 */
const enrichProducts = async (products) => {
  const enrichedProducts = [];

  for (const product of products) {
    // Get primary image
    const primaryImage = await ProductMedia.findOne({
      product: product._id,
      isPrimary: true,
      deletedAt: null,
    }).select("url altText");

    // Get default variant for pricing
    let pricing = null;
    const defaultVariant = await ProductVariant.findOne({
      product: product._id,
      isDefault: true,
      isActive: true,
      deletedAt: null,
    }).select("mrp salePrice");

    if (defaultVariant) {
      pricing = {
        mrp: defaultVariant.mrp,
        salePrice: defaultVariant.salePrice,
      };
    } else {
      const firstVariant = await ProductVariant.findOne({
        product: product._id,
        isActive: true,
        deletedAt: null,
      })
        .sort({ sortOrder: 1 })
        .select("mrp salePrice");

      if (firstVariant) {
        pricing = {
          mrp: firstVariant.mrp,
          salePrice: firstVariant.salePrice,
        };
      }
    }

    enrichedProducts.push({
      _id: product._id,
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription,
      primaryImage: primaryImage
        ? { url: primaryImage.url, altText: primaryImage.altText }
        : null,
      pricing,
      ratingSummary: product.ratingSummary,
      brand: product.brand,
      score: product.score,
    });
  }

  return enrichedProducts;
};

/**
 * Gets product IDs filtered by price range
 * @param {number} minPrice - Minimum price
 * @param {number} maxPrice - Maximum price
 * @returns {Promise<Set>} - Set of product IDs
 */
const getProductIdsByPriceRange = async (minPrice, maxPrice) => {
  const priceQuery = { isActive: true, deletedAt: null };

  if (minPrice !== undefined) {
    priceQuery.$or = [
      { salePrice: { $gte: minPrice } },
      { $and: [{ salePrice: null }, { mrp: { $gte: minPrice } }] },
    ];
  }

  if (maxPrice !== undefined) {
    const maxPriceCondition = [
      { salePrice: { $lte: maxPrice } },
      { $and: [{ salePrice: null }, { mrp: { $lte: maxPrice } }] },
    ];

    if (priceQuery.$or) {
      priceQuery.$and = [{ $or: priceQuery.$or }, { $or: maxPriceCondition }];
      delete priceQuery.$or;
    } else {
      priceQuery.$or = maxPriceCondition;
    }
  }

  const variants = await ProductVariant.find(priceQuery).select("product");
  return new Set(variants.map((v) => v.product.toString()));
};

/**
 * Consumer Controllers
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
export const searchProducts = async (req, res) => {
  try {
    const {
      q,
      category,
      brand,
      minPrice,
      maxPrice,
      skinType,
      rating,
      sort = "relevance",
      page = 1,
      limit = 20,
    } = req.query;

    console.log("searchProducts request:", {
      q,
      category,
      brand,
      minPrice,
      maxPrice,
      skinType,
      rating,
      sort,
      page,
      limit,
    });

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build base query with text search
    const textQuery = await buildSearchQuery(q);
    const baseQuery = {
      ...textQuery,
      status: "active",
      deletedAt: null,
    };

    // Apply category filter
    if (category) {
      const productCategories = await ProductCategory.find({
        category,
      }).select("product");
      const productIds = productCategories.map((pc) => pc.product);
      baseQuery._id = { $in: productIds };
    }

    // Apply brand filter
    if (brand) {
      baseQuery.brand = brand;
    }

    // Apply skin type filter
    if (skinType) {
      const skinTypes = Array.isArray(skinType) ? skinType : [skinType];
      baseQuery["attributes.skinType"] = { $in: skinTypes };
    }

    // Apply rating filter
    if (rating) {
      baseQuery["ratingSummary.average"] = { $gte: parseFloat(rating) };
    }

    // Get products matching text search
    let products = await Product.find(baseQuery, {
      score: { $meta: "textScore" },
    }).populate("brand", "name slug");

    // Apply price filter if specified
    if (minPrice !== undefined || maxPrice !== undefined) {
      const validProductIds = await getProductIdsByPriceRange(
        minPrice !== undefined ? parseFloat(minPrice) : undefined,
        maxPrice !== undefined ? parseFloat(maxPrice) : undefined
      );

      products = products.filter((p) => validProductIds.has(p._id.toString()));
    }

    // Calculate total before pagination
    const total = products.length;

    // Sort products
    switch (sort) {
      case "price_asc":
      case "price_desc":
        // Need to fetch pricing for each product
        const productsWithPricing = await Promise.all(
          products.map(async (product) => {
            const variant = await ProductVariant.findOne({
              product: product._id,
              isActive: true,
              deletedAt: null,
            })
              .sort({ isDefault: -1, sortOrder: 1 })
              .select("mrp salePrice");

            const price = variant
              ? variant.salePrice || variant.mrp
              : Infinity;
            return { product, price };
          })
        );

        productsWithPricing.sort((a, b) =>
          sort === "price_asc" ? a.price - b.price : b.price - a.price
        );

        products = productsWithPricing.map((p) => p.product);
        break;

      case "rating":
        products.sort(
          (a, b) =>
            (b.ratingSummary?.average || 0) - (a.ratingSummary?.average || 0)
        );
        break;

      case "newest":
        products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;

      case "relevance":
      default:
        products.sort((a, b) => (b.score || 0) - (a.score || 0));
        break;
    }

    // Apply pagination
    const paginatedProducts = products.slice(skip, skip + parseInt(limit));

    // Enrich products with images and pricing
    const enrichedProducts = await enrichProducts(paginatedProducts);

    // Build facets (for all matching products, not paginated)
    const allProductIds = products.map((p) => p._id);

    // Category facets
    const categoryFacets = await ProductCategory.aggregate([
      { $match: { product: { $in: allProductIds } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $project: {
          _id: "$category._id",
          name: "$category.name",
          slug: "$category.slug",
          count: 1,
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Brand facets
    const brandFacets = await Product.aggregate([
      { $match: { _id: { $in: allProductIds }, brand: { $ne: null } } },
      { $group: { _id: "$brand", count: { $sum: 1 } } },
      {
        $lookup: {
          from: "brands",
          localField: "_id",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: "$brand" },
      {
        $project: {
          _id: "$brand._id",
          name: "$brand.name",
          slug: "$brand.slug",
          count: 1,
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Price range facets
    const priceRanges = [
      { range: "0-500", min: 0, max: 500 },
      { range: "500-1000", min: 500, max: 1000 },
      { range: "1000-2000", min: 1000, max: 2000 },
      { range: "2000+", min: 2000, max: Infinity },
    ];

    const priceRangeFacets = [];
    for (const range of priceRanges) {
      const validIds = await getProductIdsByPriceRange(range.min, range.max);
      const count = allProductIds.filter((id) =>
        validIds.has(id.toString())
      ).length;

      if (count > 0) {
        priceRangeFacets.push({ range: range.range, count });
      }
    }

    const totalPages = Math.ceil(total / parseInt(limit));

    console.log("searchProducts response:", {
      query: q,
      total,
      resultsReturned: enrichedProducts.length,
    });

    return sendResponse(
      res,
      200,
      "Search results fetched successfully",
      {
        query: q,
        products: enrichedProducts,
        facets: {
          categories: categoryFacets,
          brands: brandFacets,
          priceRanges: priceRangeFacets,
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
      },
      null
    );
  } catch (error) {
    console.log("searchProducts error:", error.message);
    return sendResponse(res, 500, "Search failed", null, error.message);
  }
};

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
export const getSearchSuggestions = async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;
    console.log("getSearchSuggestions request:", { q, limit });

    const searchRegex = new RegExp(q, "i");
    const suggestions = [];

    // Search products
    const products = await Product.find({
      name: searchRegex,
      status: "active",
      deletedAt: null,
    })
      .select("name slug")
      .limit(parseInt(limit))
      .lean();

    products.forEach((p) => {
      suggestions.push({
        type: "product",
        text: p.name,
        slug: p.slug,
      });
    });

    // Search categories
    const categories = await Category.find({
      name: searchRegex,
      isActive: true,
      deletedAt: null,
    })
      .select("name slug")
      .limit(3)
      .lean();

    categories.forEach((c) => {
      suggestions.push({
        type: "category",
        text: c.name,
        slug: c.slug,
      });
    });

    // Search brands
    const brands = await Brand.find({
      name: searchRegex,
      isActive: true,
      deletedAt: null,
    })
      .select("name slug")
      .limit(3)
      .lean();

    brands.forEach((b) => {
      suggestions.push({
        type: "brand",
        text: b.name,
        slug: b.slug,
      });
    });

    // Sort by relevance (exact match first, then by distance)
    suggestions.sort((a, b) => {
      const aLower = a.text.toLowerCase();
      const bLower = b.text.toLowerCase();
      const qLower = q.toLowerCase();

      // Exact match first
      if (aLower === qLower) return -1;
      if (bLower === qLower) return 1;

      // Starts with query
      if (aLower.startsWith(qLower) && !bLower.startsWith(qLower)) return -1;
      if (bLower.startsWith(qLower) && !aLower.startsWith(qLower)) return 1;

      // Levenshtein distance
      return levenshteinDistance(aLower, qLower) - levenshteinDistance(bLower, qLower);
    });

    // Limit total suggestions
    const limitedSuggestions = suggestions.slice(0, parseInt(limit));

    console.log("getSearchSuggestions response:", { count: limitedSuggestions.length });

    return sendResponse(
      res,
      200,
      "Suggestions fetched successfully",
      { suggestions: limitedSuggestions },
      null
    );
  } catch (error) {
    console.log("getSearchSuggestions error:", error.message);
    return sendResponse(res, 500, "Failed to fetch suggestions", null, error.message);
  }
};

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
export const searchInCategory = async (req, res) => {
  try {
    const { categorySlug } = req.params;
    const {
      q,
      brand,
      minPrice,
      maxPrice,
      skinType,
      sort = "relevance",
      page = 1,
      limit = 20,
    } = req.query;

    console.log("searchInCategory request:", {
      categorySlug,
      q,
      brand,
      minPrice,
      maxPrice,
      skinType,
      sort,
      page,
      limit,
    });

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find category
    const category = await Category.findOne({
      slug: categorySlug,
      isActive: true,
      deletedAt: null,
    }).select("name slug description");

    if (!category) {
      console.log("searchInCategory error: Category not found");
      return sendResponse(
        res,
        404,
        "Category not found",
        null,
        `Category with slug '${categorySlug}' not found`
      );
    }

    // Get products in category
    const productCategories = await ProductCategory.find({
      category: category._id,
    }).select("product");

    const categoryProductIds = productCategories.map((pc) => pc.product);

    // Build query
    const baseQuery = {
      _id: { $in: categoryProductIds },
      status: "active",
      deletedAt: null,
    };

    // Apply text search if query provided
    if (q) {
      const textQuery = await buildSearchQuery(q);
      Object.assign(baseQuery, textQuery);
    }

    // Apply brand filter
    if (brand) {
      baseQuery.brand = brand;
    }

    // Apply skin type filter
    if (skinType) {
      const skinTypes = Array.isArray(skinType) ? skinType : [skinType];
      baseQuery["attributes.skinType"] = { $in: skinTypes };
    }

    // Get products
    let products;
    if (q) {
      products = await Product.find(baseQuery, {
        score: { $meta: "textScore" },
      }).populate("brand", "name slug");
    } else {
      products = await Product.find(baseQuery).populate("brand", "name slug");
    }

    // Apply price filter if specified
    if (minPrice !== undefined || maxPrice !== undefined) {
      const validProductIds = await getProductIdsByPriceRange(
        minPrice !== undefined ? parseFloat(minPrice) : undefined,
        maxPrice !== undefined ? parseFloat(maxPrice) : undefined
      );

      products = products.filter((p) => validProductIds.has(p._id.toString()));
    }

    const total = products.length;

    // Sort products
    switch (sort) {
      case "price_asc":
      case "price_desc":
        const productsWithPricing = await Promise.all(
          products.map(async (product) => {
            const variant = await ProductVariant.findOne({
              product: product._id,
              isActive: true,
              deletedAt: null,
            })
              .sort({ isDefault: -1, sortOrder: 1 })
              .select("mrp salePrice");

            const price = variant
              ? variant.salePrice || variant.mrp
              : Infinity;
            return { product, price };
          })
        );

        productsWithPricing.sort((a, b) =>
          sort === "price_asc" ? a.price - b.price : b.price - a.price
        );

        products = productsWithPricing.map((p) => p.product);
        break;

      case "rating":
        products.sort(
          (a, b) =>
            (b.ratingSummary?.average || 0) - (a.ratingSummary?.average || 0)
        );
        break;

      case "newest":
        products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;

      case "relevance":
      default:
        if (q) {
          products.sort((a, b) => (b.score || 0) - (a.score || 0));
        } else {
          products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        break;
    }

    // Apply pagination
    const paginatedProducts = products.slice(skip, skip + parseInt(limit));

    // Enrich products
    const enrichedProducts = await enrichProducts(paginatedProducts);

    const totalPages = Math.ceil(total / parseInt(limit));

    console.log("searchInCategory response:", {
      categorySlug,
      total,
      resultsReturned: enrichedProducts.length,
    });

    return sendResponse(
      res,
      200,
      "Category search results fetched successfully",
      {
        category: {
          _id: category._id,
          name: category.name,
          slug: category.slug,
        },
        query: q || null,
        products: enrichedProducts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
      },
      null
    );
  } catch (error) {
    console.log("searchInCategory error:", error.message);
    return sendResponse(res, 500, "Category search failed", null, error.message);
  }
};

/**
 * Admin Controllers
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
export const listSynonyms = async (req, res) => {
  try {
    const { isActive, search, page = 1, limit = 20 } = req.query;
    console.log("listSynonyms request:", { isActive, search, page, limit });

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = {};

    if (typeof isActive !== "undefined") {
      query.isActive = isActive;
    }

    if (search) {
      query.$or = [
        { term: { $regex: search, $options: "i" } },
        { synonyms: { $regex: search, $options: "i" } },
      ];
    }

    const [synonyms, total] = await Promise.all([
      SearchSynonym.find(query)
        .sort({ term: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      SearchSynonym.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    console.log("listSynonyms response:", { count: synonyms.length, total });

    return sendResponse(
      res,
      200,
      "Synonyms fetched successfully",
      {
        synonyms,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
      },
      null
    );
  } catch (error) {
    console.log("listSynonyms error:", error.message);
    return sendResponse(res, 500, "Failed to fetch synonyms", null, error.message);
  }
};

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
export const createSynonym = async (req, res) => {
  try {
    const { term, synonyms, isActive } = req.body;
    console.log("createSynonym request:", { term, synonymCount: synonyms.length });

    // Check for existing term
    const existing = await SearchSynonym.findOne({ term: term.toLowerCase() });

    if (existing) {
      console.log("createSynonym error: Term already exists");
      return sendResponse(
        res,
        409,
        "Term already exists",
        null,
        `A synonym entry for term '${term}' already exists`
      );
    }

    const synonym = new SearchSynonym({
      term: term.toLowerCase(),
      synonyms: synonyms.map((s) => s.toLowerCase()),
      isActive: isActive !== undefined ? isActive : true,
    });

    await synonym.save();

    console.log("createSynonym response:", { synonymId: synonym._id });

    return sendResponse(
      res,
      201,
      "Synonym created successfully",
      { synonym },
      null
    );
  } catch (error) {
    console.log("createSynonym error:", error.message);
    return sendResponse(res, 500, "Failed to create synonym", null, error.message);
  }
};

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
export const updateSynonym = async (req, res) => {
  try {
    const { id } = req.params;
    const { term, synonyms, isActive } = req.body;
    console.log("updateSynonym request:", { id, body: req.body });

    const synonym = await SearchSynonym.findById(id);

    if (!synonym) {
      console.log("updateSynonym error: Synonym not found");
      return sendResponse(
        res,
        404,
        "Synonym not found",
        null,
        `Synonym with ID '${id}' not found`
      );
    }

    // Check for duplicate term if changing
    if (term && term.toLowerCase() !== synonym.term) {
      const existing = await SearchSynonym.findOne({
        term: term.toLowerCase(),
        _id: { $ne: id },
      });

      if (existing) {
        console.log("updateSynonym error: Term already exists");
        return sendResponse(
          res,
          409,
          "Term already exists",
          null,
          `A synonym entry for term '${term}' already exists`
        );
      }
    }

    if (term !== undefined) synonym.term = term.toLowerCase();
    if (synonyms !== undefined)
      synonym.synonyms = synonyms.map((s) => s.toLowerCase());
    if (isActive !== undefined) synonym.isActive = isActive;

    await synonym.save();

    console.log("updateSynonym response:", { synonymId: synonym._id });

    return sendResponse(
      res,
      200,
      "Synonym updated successfully",
      { synonym },
      null
    );
  } catch (error) {
    console.log("updateSynonym error:", error.message);
    return sendResponse(res, 500, "Failed to update synonym", null, error.message);
  }
};

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
export const deleteSynonym = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("deleteSynonym request:", { id });

    const synonym = await SearchSynonym.findByIdAndDelete(id);

    if (!synonym) {
      console.log("deleteSynonym error: Synonym not found");
      return sendResponse(
        res,
        404,
        "Synonym not found",
        null,
        `Synonym with ID '${id}' not found`
      );
    }

    console.log("deleteSynonym response:", { deleted: true });

    return sendResponse(
      res,
      200,
      "Synonym deleted successfully",
      { deleted: true },
      null
    );
  } catch (error) {
    console.log("deleteSynonym error:", error.message);
    return sendResponse(res, 500, "Failed to delete synonym", null, error.message);
  }
};

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
export const getSearchAnalytics = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    console.log("getSearchAnalytics request:", { limit });

    // Get summary stats
    const [
      totalProducts,
      activeProducts,
      totalCategories,
      totalBrands,
      totalSynonyms,
      activeSynonyms,
    ] = await Promise.all([
      Product.countDocuments({ deletedAt: null }),
      Product.countDocuments({ status: "active", deletedAt: null }),
      Category.countDocuments({ deletedAt: null }),
      Brand.countDocuments({ deletedAt: null }),
      SearchSynonym.countDocuments(),
      SearchSynonym.countDocuments({ isActive: true }),
    ]);

    // Top categories by product count
    const topCategories = await ProductCategory.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      { $match: { "product.status": "active", "product.deletedAt": null } },
      { $group: { _id: "$category", productCount: { $sum: 1 } } },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $project: {
          _id: "$category._id",
          name: "$category.name",
          slug: "$category.slug",
          productCount: 1,
        },
      },
      { $sort: { productCount: -1 } },
      { $limit: parseInt(limit) },
    ]);

    // Top brands by product count
    const topBrands = await Product.aggregate([
      { $match: { status: "active", deletedAt: null, brand: { $ne: null } } },
      { $group: { _id: "$brand", productCount: { $sum: 1 } } },
      {
        $lookup: {
          from: "brands",
          localField: "_id",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: "$brand" },
      {
        $project: {
          _id: "$brand._id",
          name: "$brand.name",
          slug: "$brand.slug",
          productCount: 1,
        },
      },
      { $sort: { productCount: -1 } },
      { $limit: parseInt(limit) },
    ]);

    console.log("getSearchAnalytics response:", {
      totalProducts,
      activeProducts,
    });

    return sendResponse(
      res,
      200,
      "Search analytics fetched successfully",
      {
        summary: {
          totalProducts,
          activeProducts,
          totalCategories,
          totalBrands,
          totalSynonyms,
          activeSynonyms,
        },
        topCategories,
        topBrands,
      },
      null
    );
  } catch (error) {
    console.log("getSearchAnalytics error:", error.message);
    return sendResponse(res, 500, "Failed to fetch analytics", null, error.message);
  }
};

export default {
  searchProducts,
  getSearchSuggestions,
  searchInCategory,
  listSynonyms,
  createSynonym,
  updateSynonym,
  deleteSynonym,
  getSearchAnalytics,
};
