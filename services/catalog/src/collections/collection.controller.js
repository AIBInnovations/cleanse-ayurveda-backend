import Collection from "../../models/collection.model.js";
import CollectionProduct from "../../models/collection-product.model.js";
import Product from "../../models/product.model.js";
import ProductVariant from "../../models/product-variant.model.js";
import ProductMedia from "../../models/product-media.model.js";
import { sendResponse } from "@shared/utils";

/**
 * Generate slug from name
 */
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/**
 * Build smart collection query based on rules
 */
const buildSmartCollectionQuery = (rules, rulesMatch) => {
  if (!rules || rules.length === 0) {
    return { status: "active", deletedAt: null };
  }

  const conditions = rules.map((rule) => {
    const { field, operator, value } = rule;

    switch (operator) {
      case "equals":
        if (field === "tag") return { tags: value };
        if (field === "brand") return { brand: value };
        return { [field]: value };

      case "notEquals":
        if (field === "tag") return { tags: { $ne: value } };
        if (field === "brand") return { brand: { $ne: value } };
        return { [field]: { $ne: value } };

      case "contains":
        if (field === "tag") return { tags: { $regex: value, $options: "i" } };
        return { [field]: { $regex: value, $options: "i" } };

      case "greaterThan":
        return { [field]: { $gt: value } };

      case "lessThan":
        return { [field]: { $lt: value } };

      default:
        return {};
    }
  });

  const baseQuery = { status: "active", deletedAt: null };

  if (rulesMatch === "any") {
    return { ...baseQuery, $or: conditions };
  }

  return { ...baseQuery, $and: conditions };
};

/**
 * Enrich products with primary image and pricing
 */
const enrichProducts = async (products) => {
  const productIds = products.map((p) => p._id);

  // Get primary images
  const primaryImages = await ProductMedia.find({
    product: { $in: productIds },
    isPrimary: true,
    deletedAt: null,
  }).select("product url altText");

  const imageMap = {};
  primaryImages.forEach((img) => {
    imageMap[img.product.toString()] = { url: img.url, altText: img.altText };
  });

  // Get default variants for pricing
  const defaultVariants = await ProductVariant.find({
    product: { $in: productIds },
    isDefault: true,
    isActive: true,
    deletedAt: null,
  }).select("product mrp salePrice discountPercent");

  const pricingMap = {};
  defaultVariants.forEach((variant) => {
    pricingMap[variant.product.toString()] = {
      mrp: variant.mrp,
      salePrice: variant.salePrice,
      discountPercent: variant.discountPercent,
    };
  });

  return products.map((product) => {
    const productObj = product.toObject ? product.toObject() : product;
    const id = productObj._id.toString();
    return {
      ...productObj,
      primaryImage: imageMap[id] || null,
      pricing: pricingMap[id] || null,
    };
  });
};

/**
 * Consumer Controllers
 */

/**
 * @route GET /api/collections
 * @description List featured/active collections
 * @access Public
 *
 * @query
 * - featured: boolean (optional)
 * - limit: number (default: 20, max: 50)
 *
 * @example Request
 * GET /api/collections?featured=true&limit=10
 *
 * @responseBody Success (200)
 * {
 *   "message": "Collections fetched successfully",
 *   "data": {
 *     "collections": [
 *       { "_id": "...", "name": "Summer Sale", "slug": "summer-sale", "image": {...}, "isFeatured": true }
 *     ]
 *   },
 *   "error": null
 * }
 */
export const listCollections = async (req, res) => {
  console.log("> List collections request");
  console.log("> Request query:", req.query);

  try {
    const { featured, limit = 20 } = req.query;

    const query = { isActive: true, deletedAt: null };
    if (featured !== undefined) {
      query.isFeatured = featured === "true" || featured === true;
    }

    const collections = await Collection.find(query)
      .select("name slug description image isFeatured type")
      .sort({ isFeatured: -1, createdAt: -1 })
      .limit(parseInt(limit));

    console.log(`> Found ${collections.length} collections`);

    const responseData = { collections };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 200, "Collections fetched successfully", responseData, null);
  } catch (error) {
    console.log("> Error fetching collections:", error.message);
    return sendResponse(res, 500, "Failed to fetch collections", null, error.message);
  }
};

/**
 * @route GET /api/collections/:slug
 * @description Get collection details by slug
 * @access Public
 *
 * @params
 * - slug: Collection slug
 *
 * @example Request
 * GET /api/collections/summer-sale
 *
 * @responseBody Success (200)
 * {
 *   "message": "Collection fetched successfully",
 *   "data": {
 *     "collection": {
 *       "_id": "...",
 *       "name": "Summer Sale",
 *       "slug": "summer-sale",
 *       "description": "...",
 *       "image": {...},
 *       "banner": {...},
 *       "seo": {...}
 *     }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Collection not found", "data": null, "error": "Collection with slug 'xyz' not found" }
 */
export const getCollectionBySlug = async (req, res) => {
  console.log("> Get collection by slug request");
  console.log("> Request params:", req.params);

  try {
    const { slug } = req.params;

    const collection = await Collection.findOne({
      slug,
      isActive: true,
      deletedAt: null,
    }).select("-rules -rulesMatch -deletedAt");

    if (!collection) {
      console.log("> Collection not found:", slug);
      return sendResponse(
        res,
        404,
        "Collection not found",
        null,
        `Collection with slug '${slug}' not found`
      );
    }

    console.log("> Collection found:", collection._id);

    const responseData = { collection };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 200, "Collection fetched successfully", responseData, null);
  } catch (error) {
    console.log("> Error fetching collection:", error.message);
    return sendResponse(res, 500, "Failed to fetch collection", null, error.message);
  }
};

/**
 * @route GET /api/collections/:slug/products
 * @description Get products in a collection
 * @access Public
 *
 * @params
 * - slug: Collection slug
 *
 * @query
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 50)
 *
 * @example Request
 * GET /api/collections/summer-sale/products?page=1&limit=20
 *
 * @responseBody Success (200)
 * {
 *   "message": "Collection products fetched successfully",
 *   "data": {
 *     "collection": { "_id": "...", "name": "Summer Sale", "slug": "summer-sale" },
 *     "products": [
 *       { "_id": "...", "name": "Aloe Face Wash", "slug": "aloe-face-wash", "primaryImage": {...}, "pricing": {...} }
 *     ],
 *     "pagination": { "page": 1, "limit": 20, "total": 50, "totalPages": 3 }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Collection not found", "data": null, "error": "Collection with slug 'xyz' not found" }
 */
export const getCollectionProducts = async (req, res) => {
  console.log("> Get collection products request");
  console.log("> Request params:", req.params);
  console.log("> Request query:", req.query);

  try {
    const { slug } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Find collection
    const collection = await Collection.findOne({
      slug,
      isActive: true,
      deletedAt: null,
    }).select("name slug type rules rulesMatch");

    if (!collection) {
      console.log("> Collection not found:", slug);
      return sendResponse(
        res,
        404,
        "Collection not found",
        null,
        `Collection with slug '${slug}' not found`
      );
    }

    let products = [];
    let total = 0;

    if (collection.type === "smart") {
      // Smart collection: query products based on rules
      const query = buildSmartCollectionQuery(collection.rules, collection.rulesMatch);

      total = await Product.countDocuments(query);
      products = await Product.find(query)
        .select("name slug shortDescription tags isFeatured isBestseller isNewArrival")
        .populate("brand", "name slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);
    } else {
      // Manual collection: get products from CollectionProduct
      total = await CollectionProduct.countDocuments({ collection: collection._id });

      const collectionProducts = await CollectionProduct.find({ collection: collection._id })
        .sort({ sortOrder: 1 })
        .skip(skip)
        .limit(limitNum)
        .populate({
          path: "product",
          match: { status: "active", deletedAt: null },
          select: "name slug shortDescription tags isFeatured isBestseller isNewArrival brand",
          populate: { path: "brand", select: "name slug" },
        });

      products = collectionProducts
        .filter((cp) => cp.product !== null)
        .map((cp) => cp.product);
    }

    // Enrich products with images and pricing
    const enrichedProducts = await enrichProducts(products);

    const totalPages = Math.ceil(total / limitNum);

    console.log(`> Found ${products.length} products`);

    const responseData = {
      collection: { _id: collection._id, name: collection.name, slug: collection.slug },
      products: enrichedProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 200, "Collection products fetched successfully", responseData, null);
  } catch (error) {
    console.log("> Error fetching collection products:", error.message);
    return sendResponse(res, 500, "Failed to fetch collection products", null, error.message);
  }
};

/**
 * Admin Controllers
 */

/**
 * @route GET /api/admin/collections
 * @description List all collections with filters
 * @access Admin
 *
 * @query
 * - type: string (manual, smart)
 * - isActive: boolean
 * - isFeatured: boolean
 * - search: string
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 *
 * @example Request
 * GET /api/admin/collections?type=manual&isActive=true&page=1
 *
 * @responseBody Success (200)
 * {
 *   "message": "Collections fetched successfully",
 *   "data": {
 *     "collections": [...],
 *     "pagination": { "page": 1, "limit": 20, "total": 50, "totalPages": 3 }
 *   },
 *   "error": null
 * }
 */
export const listAllCollections = async (req, res) => {
  console.log("> List all collections request");
  console.log("> Request query:", req.query);

  try {
    const { type, isActive, isFeatured, search, page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = { deletedAt: null };

    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === "true" || isActive === true;
    if (isFeatured !== undefined) query.isFeatured = isFeatured === "true" || isFeatured === true;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Collection.countDocuments(query);
    const collections = await Collection.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(total / limitNum);

    console.log(`> Found ${collections.length} collections`);

    const responseData = {
      collections,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 200, "Collections fetched successfully", responseData, null);
  } catch (error) {
    console.log("> Error fetching collections:", error.message);
    return sendResponse(res, 500, "Failed to fetch collections", null, error.message);
  }
};

/**
 * @route POST /api/admin/collections
 * @description Create a new collection
 * @access Admin
 *
 * @requestBody
 * {
 *   "name": "Summer Sale",
 *   "slug": "summer-sale",
 *   "description": "Best summer deals",
 *   "type": "manual",
 *   "image": { "url": "...", "publicId": "..." },
 *   "isFeatured": true,
 *   "isActive": true
 * }
 *
 * @example Request
 * POST /api/admin/collections
 * Content-Type: application/json
 * { "name": "Summer Sale", "type": "manual" }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Collection created successfully",
 *   "data": {
 *     "collection": { "_id": "...", "name": "Summer Sale", "slug": "summer-sale", ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (409)
 * { "message": "Slug already exists", "data": null, "error": "A collection with slug 'summer-sale' already exists" }
 */
export const createCollection = async (req, res) => {
  console.log("> Create collection request");
  console.log("> Request body:", req.body);

  try {
    const {
      name,
      slug,
      description,
      type,
      rules,
      rulesMatch,
      image,
      banner,
      seo,
      isFeatured,
      isActive,
    } = req.body;

    // Generate slug if not provided
    const finalSlug = slug || generateSlug(name);

    // Check for existing slug
    const existingCollection = await Collection.findOne({
      slug: finalSlug,
      deletedAt: null,
    });

    if (existingCollection) {
      console.log("> Slug already exists:", finalSlug);
      return sendResponse(
        res,
        409,
        "Slug already exists",
        null,
        `A collection with slug '${finalSlug}' already exists`
      );
    }

    // Create collection
    const collection = await Collection.create({
      name,
      slug: finalSlug,
      description: description || null,
      type: type || "manual",
      rules: rules || [],
      rulesMatch: rulesMatch || "all",
      image: image || {},
      banner: banner || {},
      seo: seo || {},
      isFeatured: isFeatured || false,
      isActive: isActive !== undefined ? isActive : true,
    });

    console.log("> Collection created:", collection._id);

    const responseData = { collection };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 201, "Collection created successfully", responseData, null);
  } catch (error) {
    console.log("> Error creating collection:", error.message);
    return sendResponse(res, 500, "Failed to create collection", null, error.message);
  }
};

/**
 * @route GET /api/admin/collections/:id
 * @description Get collection by ID
 * @access Admin
 *
 * @params
 * - id: Collection ObjectId
 *
 * @example Request
 * GET /api/admin/collections/507f1f77bcf86cd799439011
 *
 * @responseBody Success (200)
 * {
 *   "message": "Collection fetched successfully",
 *   "data": {
 *     "collection": { "_id": "...", "name": "Summer Sale", "slug": "summer-sale", "rules": [...], ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Collection not found", "data": null, "error": "Collection with ID '...' not found" }
 */
export const getCollectionById = async (req, res) => {
  console.log("> Get collection by ID request");
  console.log("> Request params:", req.params);

  try {
    const { id } = req.params;

    const collection = await Collection.findOne({ _id: id, deletedAt: null });

    if (!collection) {
      console.log("> Collection not found:", id);
      return sendResponse(
        res,
        404,
        "Collection not found",
        null,
        `Collection with ID '${id}' not found`
      );
    }

    // Get product count for manual collections
    let productCount = 0;
    if (collection.type === "manual") {
      productCount = await CollectionProduct.countDocuments({ collection: id });
    } else {
      const query = buildSmartCollectionQuery(collection.rules, collection.rulesMatch);
      productCount = await Product.countDocuments(query);
    }

    console.log("> Collection found:", collection._id);

    const responseData = {
      collection: { ...collection.toObject(), productCount },
    };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 200, "Collection fetched successfully", responseData, null);
  } catch (error) {
    console.log("> Error fetching collection:", error.message);
    return sendResponse(res, 500, "Failed to fetch collection", null, error.message);
  }
};

/**
 * @route PUT /api/admin/collections/:id
 * @description Update a collection
 * @access Admin
 *
 * @params
 * - id: Collection ObjectId
 *
 * @requestBody
 * {
 *   "name": "Updated Name",
 *   "description": "Updated description",
 *   "isFeatured": true
 * }
 *
 * @example Request
 * PUT /api/admin/collections/507f1f77bcf86cd799439011
 * Content-Type: application/json
 * { "name": "Winter Sale" }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Collection updated successfully",
 *   "data": {
 *     "collection": { "_id": "...", "name": "Winter Sale", ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Collection not found", "data": null, "error": "Collection with ID '...' not found" }
 *
 * @responseBody Error (409)
 * { "message": "Slug already exists", "data": null, "error": "A collection with slug '...' already exists" }
 */
export const updateCollection = async (req, res) => {
  console.log("> Update collection request");
  console.log("> Request params:", req.params);
  console.log("> Request body:", req.body);

  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Find existing collection
    const existingCollection = await Collection.findOne({ _id: id, deletedAt: null });

    if (!existingCollection) {
      console.log("> Collection not found:", id);
      return sendResponse(
        res,
        404,
        "Collection not found",
        null,
        `Collection with ID '${id}' not found`
      );
    }

    // Check slug uniqueness if updating slug
    if (updateData.slug && updateData.slug !== existingCollection.slug) {
      const slugExists = await Collection.findOne({
        slug: updateData.slug,
        _id: { $ne: id },
        deletedAt: null,
      });

      if (slugExists) {
        console.log("> Slug already exists:", updateData.slug);
        return sendResponse(
          res,
          409,
          "Slug already exists",
          null,
          `A collection with slug '${updateData.slug}' already exists`
        );
      }
    }

    // Update collection
    const collection = await Collection.findByIdAndUpdate(id, updateData, { new: true });

    console.log("> Collection updated:", collection._id);

    const responseData = { collection };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 200, "Collection updated successfully", responseData, null);
  } catch (error) {
    console.log("> Error updating collection:", error.message);
    return sendResponse(res, 500, "Failed to update collection", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/collections/:id/status
 * @description Toggle collection active status
 * @access Admin
 *
 * @params
 * - id: Collection ObjectId
 *
 * @requestBody
 * { "isActive": false }
 *
 * @example Request
 * PATCH /api/admin/collections/507f1f77bcf86cd799439011/status
 * Content-Type: application/json
 * { "isActive": false }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Collection status updated successfully",
 *   "data": {
 *     "collection": { "_id": "...", "isActive": false, ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Collection not found", "data": null, "error": "Collection with ID '...' not found" }
 */
export const toggleCollectionStatus = async (req, res) => {
  console.log("> Toggle collection status request");
  console.log("> Request params:", req.params);
  console.log("> Request body:", req.body);

  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const collection = await Collection.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { isActive },
      { new: true }
    );

    if (!collection) {
      console.log("> Collection not found:", id);
      return sendResponse(
        res,
        404,
        "Collection not found",
        null,
        `Collection with ID '${id}' not found`
      );
    }

    console.log("> Collection status updated:", collection._id);

    const responseData = { collection };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 200, "Collection status updated successfully", responseData, null);
  } catch (error) {
    console.log("> Error updating collection status:", error.message);
    return sendResponse(res, 500, "Failed to update collection status", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/collections/:id/featured
 * @description Toggle collection featured status
 * @access Admin
 *
 * @params
 * - id: Collection ObjectId
 *
 * @requestBody
 * { "isFeatured": true }
 *
 * @example Request
 * PATCH /api/admin/collections/507f1f77bcf86cd799439011/featured
 * Content-Type: application/json
 * { "isFeatured": true }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Collection featured status updated successfully",
 *   "data": {
 *     "collection": { "_id": "...", "isFeatured": true, ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Collection not found", "data": null, "error": "Collection with ID '...' not found" }
 */
export const toggleCollectionFeatured = async (req, res) => {
  console.log("> Toggle collection featured request");
  console.log("> Request params:", req.params);
  console.log("> Request body:", req.body);

  try {
    const { id } = req.params;
    const { isFeatured } = req.body;

    const collection = await Collection.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { isFeatured },
      { new: true }
    );

    if (!collection) {
      console.log("> Collection not found:", id);
      return sendResponse(
        res,
        404,
        "Collection not found",
        null,
        `Collection with ID '${id}' not found`
      );
    }

    console.log("> Collection featured status updated:", collection._id);

    const responseData = { collection };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(
      res,
      200,
      "Collection featured status updated successfully",
      responseData,
      null
    );
  } catch (error) {
    console.log("> Error updating collection featured status:", error.message);
    return sendResponse(
      res,
      500,
      "Failed to update collection featured status",
      null,
      error.message
    );
  }
};

/**
 * @route POST /api/admin/collections/:id/products
 * @description Add products to a manual collection
 * @access Admin
 *
 * @params
 * - id: Collection ObjectId
 *
 * @requestBody
 * {
 *   "products": [
 *     { "productId": "...", "sortOrder": 0 },
 *     { "productId": "...", "sortOrder": 1 }
 *   ]
 * }
 *
 * @example Request
 * POST /api/admin/collections/507f1f77bcf86cd799439011/products
 * Content-Type: application/json
 * { "products": [{ "productId": "..." }] }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Products added successfully",
 *   "data": {
 *     "added": 2,
 *     "skipped": 0
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (400)
 * { "message": "Invalid collection type", "data": null, "error": "Cannot add products to smart collections" }
 *
 * @responseBody Error (404)
 * { "message": "Collection not found", "data": null, "error": "Collection with ID '...' not found" }
 */
export const addProductsToCollection = async (req, res) => {
  console.log("> Add products to collection request");
  console.log("> Request params:", req.params);
  console.log("> Request body:", req.body);

  try {
    const { id } = req.params;
    const { products } = req.body;

    // Find collection
    const collection = await Collection.findOne({ _id: id, deletedAt: null });

    if (!collection) {
      console.log("> Collection not found:", id);
      return sendResponse(
        res,
        404,
        "Collection not found",
        null,
        `Collection with ID '${id}' not found`
      );
    }

    // Check collection type
    if (collection.type !== "manual") {
      console.log("> Cannot add products to smart collection");
      return sendResponse(
        res,
        400,
        "Invalid collection type",
        null,
        "Cannot add products to smart collections"
      );
    }

    // Verify all products exist
    const productIds = products.map((p) => p.productId);
    const validProducts = await Product.find({
      _id: { $in: productIds },
      deletedAt: null,
    }).select("_id");

    const validProductIds = new Set(validProducts.map((p) => p._id.toString()));

    const invalidIds = productIds.filter((id) => !validProductIds.has(id));
    if (invalidIds.length > 0) {
      console.log("> Invalid product IDs:", invalidIds);
      return sendResponse(
        res,
        400,
        "Invalid product IDs",
        null,
        `Product IDs not found: ${invalidIds.join(", ")}`
      );
    }

    // Check for existing products in collection
    const existingProducts = await CollectionProduct.find({
      collection: id,
      product: { $in: productIds },
    }).select("product");

    const existingProductIds = new Set(existingProducts.map((cp) => cp.product.toString()));

    // Get current max sort order
    const lastProduct = await CollectionProduct.findOne({ collection: id })
      .sort({ sortOrder: -1 })
      .select("sortOrder");

    let nextSortOrder = lastProduct ? lastProduct.sortOrder + 1 : 0;

    // Prepare new products
    const newProducts = [];
    let skipped = 0;

    for (const item of products) {
      if (existingProductIds.has(item.productId)) {
        skipped++;
        continue;
      }

      newProducts.push({
        collection: id,
        product: item.productId,
        sortOrder: item.sortOrder !== undefined ? item.sortOrder : nextSortOrder++,
      });
    }

    if (newProducts.length > 0) {
      await CollectionProduct.insertMany(newProducts);
    }

    console.log(`> Added ${newProducts.length} products, skipped ${skipped}`);

    const responseData = { added: newProducts.length, skipped };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 201, "Products added successfully", responseData, null);
  } catch (error) {
    console.log("> Error adding products:", error.message);
    return sendResponse(res, 500, "Failed to add products", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/collections/:id/products/reorder
 * @description Reorder products in a manual collection
 * @access Admin
 *
 * @params
 * - id: Collection ObjectId
 *
 * @requestBody
 * {
 *   "products": [
 *     { "productId": "...", "sortOrder": 0 },
 *     { "productId": "...", "sortOrder": 1 }
 *   ]
 * }
 *
 * @example Request
 * PATCH /api/admin/collections/507f1f77bcf86cd799439011/products/reorder
 * Content-Type: application/json
 * { "products": [{ "productId": "...", "sortOrder": 0 }] }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Products reordered successfully",
 *   "data": { "modifiedCount": 3 },
 *   "error": null
 * }
 *
 * @responseBody Error (400)
 * { "message": "Invalid collection type", "data": null, "error": "Cannot reorder products in smart collections" }
 *
 * @responseBody Error (404)
 * { "message": "Collection not found", "data": null, "error": "Collection with ID '...' not found" }
 */
export const reorderCollectionProducts = async (req, res) => {
  console.log("> Reorder collection products request");
  console.log("> Request params:", req.params);
  console.log("> Request body:", req.body);

  try {
    const { id } = req.params;
    const { products } = req.body;

    // Find collection
    const collection = await Collection.findOne({ _id: id, deletedAt: null });

    if (!collection) {
      console.log("> Collection not found:", id);
      return sendResponse(
        res,
        404,
        "Collection not found",
        null,
        `Collection with ID '${id}' not found`
      );
    }

    // Check collection type
    if (collection.type !== "manual") {
      console.log("> Cannot reorder products in smart collection");
      return sendResponse(
        res,
        400,
        "Invalid collection type",
        null,
        "Cannot reorder products in smart collections"
      );
    }

    // Verify all products are in collection
    const productIds = products.map((p) => p.productId);
    const existingProducts = await CollectionProduct.find({
      collection: id,
      product: { $in: productIds },
    }).select("product");

    if (existingProducts.length !== productIds.length) {
      console.log("> Some products not in collection");
      return sendResponse(
        res,
        400,
        "Invalid product IDs",
        null,
        "Some products are not in this collection"
      );
    }

    // Update sort orders
    const bulkOps = products.map((item) => ({
      updateOne: {
        filter: { collection: id, product: item.productId },
        update: { sortOrder: item.sortOrder },
      },
    }));

    const result = await CollectionProduct.bulkWrite(bulkOps);
    console.log("> Reorder result:", result.modifiedCount);

    const responseData = { modifiedCount: result.modifiedCount };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 200, "Products reordered successfully", responseData, null);
  } catch (error) {
    console.log("> Error reordering products:", error.message);
    return sendResponse(res, 500, "Failed to reorder products", null, error.message);
  }
};

/**
 * @route DELETE /api/admin/collections/:id/products/:productId
 * @description Remove a product from a manual collection
 * @access Admin
 *
 * @params
 * - id: Collection ObjectId
 * - productId: Product ObjectId
 *
 * @example Request
 * DELETE /api/admin/collections/507f1f77bcf86cd799439011/products/507f1f77bcf86cd799439012
 *
 * @responseBody Success (200)
 * {
 *   "message": "Product removed successfully",
 *   "data": { "removed": true },
 *   "error": null
 * }
 *
 * @responseBody Error (400)
 * { "message": "Invalid collection type", "data": null, "error": "Cannot remove products from smart collections" }
 *
 * @responseBody Error (404)
 * { "message": "Product not in collection", "data": null, "error": "This product is not in this collection" }
 */
export const removeProductFromCollection = async (req, res) => {
  console.log("> Remove product from collection request");
  console.log("> Request params:", req.params);

  try {
    const { id, productId } = req.params;

    // Find collection
    const collection = await Collection.findOne({ _id: id, deletedAt: null });

    if (!collection) {
      console.log("> Collection not found:", id);
      return sendResponse(
        res,
        404,
        "Collection not found",
        null,
        `Collection with ID '${id}' not found`
      );
    }

    // Check collection type
    if (collection.type !== "manual") {
      console.log("> Cannot remove products from smart collection");
      return sendResponse(
        res,
        400,
        "Invalid collection type",
        null,
        "Cannot remove products from smart collections"
      );
    }

    // Remove product from collection
    const result = await CollectionProduct.findOneAndDelete({
      collection: id,
      product: productId,
    });

    if (!result) {
      console.log("> Product not in collection");
      return sendResponse(
        res,
        404,
        "Product not in collection",
        null,
        "This product is not in this collection"
      );
    }

    console.log("> Product removed from collection");

    const responseData = { removed: true };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 200, "Product removed successfully", responseData, null);
  } catch (error) {
    console.log("> Error removing product:", error.message);
    return sendResponse(res, 500, "Failed to remove product", null, error.message);
  }
};

/**
 * @route DELETE /api/admin/collections/:id
 * @description Soft delete a collection
 * @access Admin
 *
 * @params
 * - id: Collection ObjectId
 *
 * @example Request
 * DELETE /api/admin/collections/507f1f77bcf86cd799439011
 *
 * @responseBody Success (200)
 * {
 *   "message": "Collection deleted successfully",
 *   "data": {
 *     "collection": { "_id": "...", "deletedAt": "2024-01-01T00:00:00.000Z", ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Collection not found", "data": null, "error": "Collection with ID '...' not found" }
 */
export const deleteCollection = async (req, res) => {
  console.log("> Delete collection request");
  console.log("> Request params:", req.params);

  try {
    const { id } = req.params;

    // Find and soft delete
    const collection = await Collection.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );

    if (!collection) {
      console.log("> Collection not found:", id);
      return sendResponse(
        res,
        404,
        "Collection not found",
        null,
        `Collection with ID '${id}' not found`
      );
    }

    // Also delete collection products for manual collections
    if (collection.type === "manual") {
      await CollectionProduct.deleteMany({ collection: id });
      console.log("> Deleted collection products");
    }

    console.log("> Collection deleted:", collection._id);

    const responseData = { collection };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 200, "Collection deleted successfully", responseData, null);
  } catch (error) {
    console.log("> Error deleting collection:", error.message);
    return sendResponse(res, 500, "Failed to delete collection", null, error.message);
  }
};

/**
 * @route GET /api/catalog/admin/collections/:id/products
 * @description Get products in a collection by collection ID (admin)
 * @access Admin
 *
 * @params
 * - id: Collection ObjectId
 *
 * @query
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 *
 * @example Request
 * GET /api/catalog/admin/collections/507f1f77bcf86cd799439011/products?page=1&limit=20
 *
 * @responseBody Success (200)
 * {
 *   "message": "Collection products fetched successfully",
 *   "data": {
 *     "collection": { "_id": "...", "name": "Summer Sale", "slug": "summer-sale", "type": "manual" },
 *     "products": [
 *       {
 *         "_id": "...",
 *         "name": "Product Name",
 *         "slug": "product-slug",
 *         "sku": "SKU-001",
 *         "status": "active",
 *         "brand": { "_id": "...", "name": "Brand Name" },
 *         "primaryImage": { "url": "https://...", "altText": "..." },
 *         "pricing": { "mrp": 999, "salePrice": 799, "discountPercent": 20 },
 *         "sortOrder": 0
 *       }
 *     ],
 *     "pagination": { "page": 1, "limit": 20, "total": 50, "totalPages": 3, "hasNextPage": true, "hasPrevPage": false }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Collection not found", "data": null, "error": "Collection with ID '...' not found" }
 */
export const getCollectionProductsAdmin = async (req, res) => {
  console.log("> Get collection products admin request");
  console.log("> Request params:", req.params);
  console.log("> Request query:", req.query);

  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Find collection (admin can see any collection, including inactive)
    const collection = await Collection.findOne({
      _id: id,
      deletedAt: null,
    }).select("name slug type rules rulesMatch");

    if (!collection) {
      console.log("> Collection not found:", id);
      return sendResponse(
        res,
        404,
        "Collection not found",
        null,
        `Collection with ID '${id}' not found`
      );
    }

    let products = [];
    let total = 0;

    if (collection.type === "smart") {
      // Smart collection: query products based on rules
      const query = buildSmartCollectionQuery(collection.rules, collection.rulesMatch);
      // Admin sees all products, not just active ones
      query.deletedAt = null;

      total = await Product.countDocuments(query);
      products = await Product.find(query)
        .select("name slug sku status shortDescription tags isFeatured isBestseller isNewArrival")
        .populate("brand", "name slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);
    } else {
      // Manual collection: get products from CollectionProduct
      total = await CollectionProduct.countDocuments({ collection: collection._id });

      const collectionProducts = await CollectionProduct.find({ collection: collection._id })
        .sort({ sortOrder: 1 })
        .skip(skip)
        .limit(limitNum)
        .populate({
          path: "product",
          match: { deletedAt: null }, // Admin sees all statuses (draft, active, archived)
          select: "name slug sku status shortDescription tags isFeatured isBestseller isNewArrival brand",
          populate: { path: "brand", select: "name slug" },
        });

      // Include sortOrder in product data for admin
      products = collectionProducts
        .filter((cp) => cp.product !== null)
        .map((cp) => ({
          ...cp.product.toObject(),
          sortOrder: cp.sortOrder,
        }));
    }

    // Enrich products with images and pricing
    const enrichedProducts = await enrichProducts(products);

    const totalPages = Math.ceil(total / limitNum);

    console.log(`> Found ${products.length} products in collection`);

    const responseData = {
      collection: {
        _id: collection._id,
        name: collection.name,
        slug: collection.slug,
        type: collection.type,
      },
      products: enrichedProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 200, "Collection products fetched successfully", responseData, null);
  } catch (error) {
    console.log("> Error fetching collection products:", error.message);
    return sendResponse(res, 500, "Failed to fetch collection products", null, error.message);
  }
};
