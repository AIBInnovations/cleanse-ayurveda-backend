import Bundle from "../../models/bundle.model.js";
import BundleItem from "../../models/bundle-item.model.js";
import Product from "../../models/product.model.js";
import ProductVariant from "../../models/product-variant.model.js";
import { sendResponse } from "@shared/utils";

/**
 * Generates a URL-friendly slug from a string
 * @param {string} text - Text to convert to slug
 * @returns {string} - URL-friendly slug
 */
const generateSlug = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

/**
 * Computes bundle pricing based on items and pricing type
 * @param {string} bundleId - Bundle ID
 * @param {string} pricingType - 'fixed' or 'percentageOff'
 * @param {number|null} fixedPrice - Fixed price (if pricingType is 'fixed')
 * @param {number|null} percentageOff - Percentage off (if pricingType is 'percentageOff')
 * @returns {Promise<{originalPrice: number, finalPrice: number, savings: number}>}
 */
const computeBundlePricing = async (
  bundleId,
  pricingType,
  fixedPrice,
  percentageOff
) => {
  const items = await BundleItem.find({ bundle: bundleId }).populate({
    path: "variant",
    select: "mrp salePrice isActive deletedAt",
  });

  let originalPrice = 0;

  for (const item of items) {
    let itemPrice = 0;

    if (item.variant && !item.variant.deletedAt && item.variant.isActive) {
      itemPrice = item.variant.salePrice || item.variant.mrp;
    } else {
      // If variant not specified or invalid, get default variant for product
      const defaultVariant = await ProductVariant.findOne({
        product: item.product,
        isDefault: true,
        isActive: true,
        deletedAt: null,
      });

      if (defaultVariant) {
        itemPrice = defaultVariant.salePrice || defaultVariant.mrp;
      } else {
        // Fallback to first active variant
        const firstVariant = await ProductVariant.findOne({
          product: item.product,
          isActive: true,
          deletedAt: null,
        }).sort({ sortOrder: 1 });

        if (firstVariant) {
          itemPrice = firstVariant.salePrice || firstVariant.mrp;
        }
      }
    }

    originalPrice += itemPrice * item.quantity;
  }

  let finalPrice = 0;

  if (pricingType === "fixed") {
    finalPrice = fixedPrice || 0;
  } else if (pricingType === "percentageOff") {
    finalPrice = originalPrice * (1 - (percentageOff || 0) / 100);
  }

  finalPrice = Math.round(finalPrice * 100) / 100;
  const savings = Math.round((originalPrice - finalPrice) * 100) / 100;

  return { originalPrice, finalPrice, savings };
};

/**
 * Enriches bundle items with product and variant details
 * @param {Array} items - Bundle items array
 * @returns {Promise<Array>} - Enriched items
 */
const enrichBundleItems = async (items) => {
  const enrichedItems = [];

  for (const item of items) {
    const product = await Product.findById(item.product).select(
      "name slug primaryImage"
    );

    let variant = null;
    if (item.variant) {
      variant = await ProductVariant.findById(item.variant).select(
        "name sku mrp salePrice"
      );
    } else {
      // Get default variant
      variant = await ProductVariant.findOne({
        product: item.product,
        isDefault: true,
        isActive: true,
        deletedAt: null,
      }).select("name sku mrp salePrice");

      if (!variant) {
        variant = await ProductVariant.findOne({
          product: item.product,
          isActive: true,
          deletedAt: null,
        })
          .sort({ sortOrder: 1 })
          .select("name sku mrp salePrice");
      }
    }

    const price = variant ? variant.salePrice || variant.mrp : 0;
    const itemTotal = price * item.quantity;

    enrichedItems.push({
      _id: item._id,
      product: product
        ? {
            _id: product._id,
            name: product.name,
            slug: product.slug,
            primaryImage: product.primaryImage,
          }
        : null,
      variant: variant
        ? {
            _id: variant._id,
            name: variant.name,
            sku: variant.sku,
            mrp: variant.mrp,
            salePrice: variant.salePrice,
          }
        : null,
      quantity: item.quantity,
      sortOrder: item.sortOrder,
      unitPrice: price,
      itemTotal,
    });
  }

  return enrichedItems;
};

/**
 * Consumer Controllers
 */

/**
 * @route GET /api/bundles
 * @description List active bundles within valid date range
 * @access Public
 *
 * @query
 * - limit: number (default: 20, max: 50)
 *
 * @example Request
 * GET /api/bundles?limit=10
 *
 * @responseBody Success (200)
 * {
 *   "message": "Bundles fetched successfully",
 *   "data": {
 *     "bundles": [
 *       {
 *         "_id": "...",
 *         "name": "Summer Skincare Kit",
 *         "slug": "summer-skincare-kit",
 *         "description": "...",
 *         "image": { "url": "...", "publicId": "..." },
 *         "originalPrice": 1500,
 *         "finalPrice": 1200,
 *         "savings": 300,
 *         "validTo": "2024-12-31T23:59:59.000Z"
 *       }
 *     ]
 *   },
 *   "error": null
 * }
 */
export const listBundles = async (req, res) => {
  try {
    console.log("listBundles request:", { query: req.query });

    const { limit = 20 } = req.query;
    const now = new Date();

    const query = {
      isActive: true,
      deletedAt: null,
      $or: [{ validFrom: null }, { validFrom: { $lte: now } }],
      $and: [
        {
          $or: [{ validTo: null }, { validTo: { $gte: now } }],
        },
      ],
    };

    const bundles = await Bundle.find(query)
      .select(
        "name slug description image originalPrice finalPrice savings validTo"
      )
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    console.log("listBundles response:", { count: bundles.length });

    return sendResponse(res, 200, "Bundles fetched successfully", { bundles }, null);
  } catch (error) {
    console.log("listBundles error:", error.message);
    return sendResponse(res, 500, "Failed to fetch bundles", null, error.message);
  }
};

/**
 * @route GET /api/bundles/:slug
 * @description Get bundle details with items by slug
 * @access Public
 *
 * @params
 * - slug: Bundle slug
 *
 * @example Request
 * GET /api/bundles/summer-skincare-kit
 *
 * @responseBody Success (200)
 * {
 *   "message": "Bundle fetched successfully",
 *   "data": {
 *     "bundle": {
 *       "_id": "...",
 *       "name": "Summer Skincare Kit",
 *       "slug": "summer-skincare-kit",
 *       "description": "...",
 *       "image": { "url": "...", "publicId": "..." },
 *       "originalPrice": 1500,
 *       "finalPrice": 1200,
 *       "savings": 300,
 *       "validFrom": "...",
 *       "validTo": "...",
 *       "items": [
 *         {
 *           "_id": "...",
 *           "product": { "_id": "...", "name": "...", "slug": "...", "primaryImage": {...} },
 *           "variant": { "_id": "...", "name": "...", "sku": "...", "mrp": 500, "salePrice": 450 },
 *           "quantity": 1,
 *           "unitPrice": 450,
 *           "itemTotal": 450
 *         }
 *       ]
 *     }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Bundle not found", "data": null, "error": "Bundle with slug 'xyz' not found" }
 */
export const getBundleBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    console.log("getBundleBySlug request:", { slug });

    const now = new Date();

    const bundle = await Bundle.findOne({
      slug,
      isActive: true,
      deletedAt: null,
      $or: [{ validFrom: null }, { validFrom: { $lte: now } }],
      $and: [
        {
          $or: [{ validTo: null }, { validTo: { $gte: now } }],
        },
      ],
    }).select(
      "name slug description image originalPrice finalPrice savings validFrom validTo"
    );

    if (!bundle) {
      console.log("getBundleBySlug error: Bundle not found");
      return sendResponse(
        res,
        404,
        "Bundle not found",
        null,
        `Bundle with slug '${slug}' not found`
      );
    }

    const items = await BundleItem.find({ bundle: bundle._id }).sort({
      sortOrder: 1,
    });

    const enrichedItems = await enrichBundleItems(items);

    const response = {
      ...bundle.toObject(),
      items: enrichedItems,
    };

    console.log("getBundleBySlug response:", { bundleId: bundle._id });

    return sendResponse(res, 200, "Bundle fetched successfully", { bundle: response }, null);
  } catch (error) {
    console.log("getBundleBySlug error:", error.message);
    return sendResponse(res, 500, "Failed to fetch bundle", null, error.message);
  }
};

/**
 * Admin Controllers
 */

/**
 * @route GET /api/admin/bundles
 * @description List all bundles with filters
 * @access Admin
 *
 * @query
 * - isActive: boolean
 * - search: string
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 *
 * @example Request
 * GET /api/admin/bundles?isActive=true&search=summer&page=1
 *
 * @responseBody Success (200)
 * {
 *   "message": "Bundles fetched successfully",
 *   "data": {
 *     "bundles": [...],
 *     "pagination": { "page": 1, "limit": 20, "total": 50, "totalPages": 3 }
 *   },
 *   "error": null
 * }
 */
export const listAllBundles = async (req, res) => {
  try {
    console.log("listAllBundles request:", { query: req.query });

    const { isActive, search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { deletedAt: null };

    if (typeof isActive !== "undefined") {
      query.isActive = isActive;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const [bundles, total] = await Promise.all([
      Bundle.find(query)
        .select(
          "name slug image pricingType originalPrice finalPrice savings isActive validFrom validTo createdAt"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Bundle.countDocuments(query),
    ]);

    // Get item counts for each bundle
    const bundlesWithCounts = await Promise.all(
      bundles.map(async (bundle) => {
        const itemCount = await BundleItem.countDocuments({
          bundle: bundle._id,
        });
        return {
          ...bundle.toObject(),
          itemCount,
        };
      })
    );

    const totalPages = Math.ceil(total / parseInt(limit));

    console.log("listAllBundles response:", { count: bundles.length, total });

    return sendResponse(
      res,
      200,
      "Bundles fetched successfully",
      {
        bundles: bundlesWithCounts,
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
    console.log("listAllBundles error:", error.message);
    return sendResponse(res, 500, "Failed to fetch bundles", null, error.message);
  }
};

/**
 * @route POST /api/admin/bundles
 * @description Create a new bundle
 * @access Admin
 *
 * @requestBody
 * {
 *   "name": "Summer Skincare Kit",
 *   "slug": "summer-skincare-kit",
 *   "description": "Complete skincare routine for summer",
 *   "image": { "url": "...", "publicId": "..." },
 *   "pricingType": "percentageOff",
 *   "percentageOff": 20,
 *   "validFrom": "2024-06-01",
 *   "validTo": "2024-08-31",
 *   "isActive": true
 * }
 *
 * @example Request
 * POST /api/admin/bundles
 * Content-Type: application/json
 * { "name": "Summer Skincare Kit", "pricingType": "percentageOff", "percentageOff": 20 }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Bundle created successfully",
 *   "data": {
 *     "bundle": { "_id": "...", "name": "Summer Skincare Kit", "slug": "summer-skincare-kit", ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (409)
 * { "message": "Slug already exists", "data": null, "error": "A bundle with slug 'summer-skincare-kit' already exists" }
 */
export const createBundle = async (req, res) => {
  try {
    console.log("createBundle request:", { body: req.body });

    const {
      name,
      slug,
      description,
      image,
      pricingType,
      fixedPrice,
      percentageOff,
      validFrom,
      validTo,
      isActive,
    } = req.body;

    const finalSlug = slug || generateSlug(name);

    // Check for duplicate slug
    const existingBundle = await Bundle.findOne({
      slug: finalSlug,
      deletedAt: null,
    });

    if (existingBundle) {
      console.log("createBundle error: Slug already exists");
      return sendResponse(
        res,
        409,
        "Slug already exists",
        null,
        `A bundle with slug '${finalSlug}' already exists`
      );
    }

    const bundle = new Bundle({
      name,
      slug: finalSlug,
      description: description || null,
      image: image || { url: null, publicId: null },
      pricingType,
      fixedPrice: pricingType === "fixed" ? fixedPrice : null,
      percentageOff: pricingType === "percentageOff" ? percentageOff : null,
      originalPrice: 0,
      finalPrice: pricingType === "fixed" ? fixedPrice : 0,
      savings: 0,
      validFrom: validFrom || null,
      validTo: validTo || null,
      isActive: isActive !== undefined ? isActive : true,
    });

    await bundle.save();

    console.log("createBundle response:", { bundleId: bundle._id });

    return sendResponse(
      res,
      201,
      "Bundle created successfully",
      { bundle },
      null
    );
  } catch (error) {
    console.log("createBundle error:", error.message);
    return sendResponse(res, 500, "Failed to create bundle", null, error.message);
  }
};

/**
 * @route GET /api/admin/bundles/:id
 * @description Get bundle by ID with all details
 * @access Admin
 *
 * @params
 * - id: Bundle ObjectId
 *
 * @example Request
 * GET /api/admin/bundles/507f1f77bcf86cd799439011
 *
 * @responseBody Success (200)
 * {
 *   "message": "Bundle fetched successfully",
 *   "data": {
 *     "bundle": {
 *       "_id": "...",
 *       "name": "Summer Skincare Kit",
 *       "slug": "summer-skincare-kit",
 *       "pricingType": "percentageOff",
 *       "percentageOff": 20,
 *       "originalPrice": 1500,
 *       "finalPrice": 1200,
 *       "savings": 300,
 *       "items": [...]
 *     }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Bundle not found", "data": null, "error": "Bundle with ID '...' not found" }
 */
export const getBundleById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("getBundleById request:", { id });

    const bundle = await Bundle.findOne({ _id: id, deletedAt: null });

    if (!bundle) {
      console.log("getBundleById error: Bundle not found");
      return sendResponse(
        res,
        404,
        "Bundle not found",
        null,
        `Bundle with ID '${id}' not found`
      );
    }

    const items = await BundleItem.find({ bundle: id }).sort({ sortOrder: 1 });
    const enrichedItems = await enrichBundleItems(items);

    const response = {
      ...bundle.toObject(),
      items: enrichedItems,
    };

    console.log("getBundleById response:", { bundleId: bundle._id });

    return sendResponse(res, 200, "Bundle fetched successfully", { bundle: response }, null);
  } catch (error) {
    console.log("getBundleById error:", error.message);
    return sendResponse(res, 500, "Failed to fetch bundle", null, error.message);
  }
};

/**
 * @route PUT /api/admin/bundles/:id
 * @description Update a bundle
 * @access Admin
 *
 * @params
 * - id: Bundle ObjectId
 *
 * @requestBody
 * {
 *   "name": "Updated Name",
 *   "description": "Updated description",
 *   "pricingType": "fixed",
 *   "fixedPrice": 999
 * }
 *
 * @example Request
 * PUT /api/admin/bundles/507f1f77bcf86cd799439011
 * Content-Type: application/json
 * { "name": "Winter Skincare Kit" }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Bundle updated successfully",
 *   "data": {
 *     "bundle": { "_id": "...", "name": "Winter Skincare Kit", ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Bundle not found", "data": null, "error": "Bundle with ID '...' not found" }
 *
 * @responseBody Error (409)
 * { "message": "Slug already exists", "data": null, "error": "A bundle with slug '...' already exists" }
 */
export const updateBundle = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("updateBundle request:", { id, body: req.body });

    const bundle = await Bundle.findOne({ _id: id, deletedAt: null });

    if (!bundle) {
      console.log("updateBundle error: Bundle not found");
      return sendResponse(
        res,
        404,
        "Bundle not found",
        null,
        `Bundle with ID '${id}' not found`
      );
    }

    const {
      name,
      slug,
      description,
      image,
      pricingType,
      fixedPrice,
      percentageOff,
      validFrom,
      validTo,
      isActive,
    } = req.body;

    // Check for duplicate slug if changing
    if (slug && slug !== bundle.slug) {
      const existingBundle = await Bundle.findOne({
        slug,
        _id: { $ne: id },
        deletedAt: null,
      });

      if (existingBundle) {
        console.log("updateBundle error: Slug already exists");
        return sendResponse(
          res,
          409,
          "Slug already exists",
          null,
          `A bundle with slug '${slug}' already exists`
        );
      }
    }

    // Update fields
    if (name !== undefined) bundle.name = name;
    if (slug !== undefined) bundle.slug = slug;
    if (description !== undefined) bundle.description = description;
    if (image !== undefined) bundle.image = image;
    if (pricingType !== undefined) bundle.pricingType = pricingType;
    if (fixedPrice !== undefined) bundle.fixedPrice = fixedPrice;
    if (percentageOff !== undefined) bundle.percentageOff = percentageOff;
    if (validFrom !== undefined) bundle.validFrom = validFrom;
    if (validTo !== undefined) bundle.validTo = validTo;
    if (isActive !== undefined) bundle.isActive = isActive;

    // Recompute pricing if pricing type or values changed
    if (
      pricingType !== undefined ||
      fixedPrice !== undefined ||
      percentageOff !== undefined
    ) {
      const pricing = await computeBundlePricing(
        id,
        bundle.pricingType,
        bundle.fixedPrice,
        bundle.percentageOff
      );
      bundle.originalPrice = pricing.originalPrice;
      bundle.finalPrice = pricing.finalPrice;
      bundle.savings = pricing.savings;
    }

    await bundle.save();

    console.log("updateBundle response:", { bundleId: bundle._id });

    return sendResponse(
      res,
      200,
      "Bundle updated successfully",
      { bundle },
      null
    );
  } catch (error) {
    console.log("updateBundle error:", error.message);
    return sendResponse(res, 500, "Failed to update bundle", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/bundles/:id/status
 * @description Toggle bundle active status
 * @access Admin
 *
 * @params
 * - id: Bundle ObjectId
 *
 * @requestBody
 * { "isActive": false }
 *
 * @example Request
 * PATCH /api/admin/bundles/507f1f77bcf86cd799439011/status
 * Content-Type: application/json
 * { "isActive": false }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Bundle status updated successfully",
 *   "data": {
 *     "bundle": { "_id": "...", "isActive": false, ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Bundle not found", "data": null, "error": "Bundle with ID '...' not found" }
 */
export const toggleBundleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    console.log("toggleBundleStatus request:", { id, isActive });

    const bundle = await Bundle.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { isActive },
      { new: true }
    );

    if (!bundle) {
      console.log("toggleBundleStatus error: Bundle not found");
      return sendResponse(
        res,
        404,
        "Bundle not found",
        null,
        `Bundle with ID '${id}' not found`
      );
    }

    console.log("toggleBundleStatus response:", {
      bundleId: bundle._id,
      isActive: bundle.isActive,
    });

    return sendResponse(
      res,
      200,
      "Bundle status updated successfully",
      { bundle },
      null
    );
  } catch (error) {
    console.log("toggleBundleStatus error:", error.message);
    return sendResponse(res, 500, "Failed to update bundle status", null, error.message);
  }
};

/**
 * @route POST /api/admin/bundles/:id/items
 * @description Add items to a bundle
 * @access Admin
 *
 * @params
 * - id: Bundle ObjectId
 *
 * @requestBody
 * {
 *   "items": [
 *     { "productId": "...", "variantId": "...", "quantity": 1, "sortOrder": 0 },
 *     { "productId": "...", "quantity": 2, "sortOrder": 1 }
 *   ]
 * }
 *
 * @example Request
 * POST /api/admin/bundles/507f1f77bcf86cd799439011/items
 * Content-Type: application/json
 * { "items": [{ "productId": "..." }] }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Items added successfully",
 *   "data": {
 *     "added": 2,
 *     "skipped": 0,
 *     "bundle": { "originalPrice": 1500, "finalPrice": 1200, "savings": 300 }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Bundle not found", "data": null, "error": "Bundle with ID '...' not found" }
 */
export const addBundleItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;
    console.log("addBundleItems request:", { id, itemCount: items.length });

    const bundle = await Bundle.findOne({ _id: id, deletedAt: null });

    if (!bundle) {
      console.log("addBundleItems error: Bundle not found");
      return sendResponse(
        res,
        404,
        "Bundle not found",
        null,
        `Bundle with ID '${id}' not found`
      );
    }

    // Validate products exist
    const productIds = items.map((item) => item.productId);
    const products = await Product.find({
      _id: { $in: productIds },
      deletedAt: null,
    });

    const validProductIds = new Set(products.map((p) => p._id.toString()));

    // Get current max sort order
    const maxSortItem = await BundleItem.findOne({ bundle: id })
      .sort({ sortOrder: -1 })
      .select("sortOrder");
    let nextSortOrder = maxSortItem ? maxSortItem.sortOrder + 1 : 0;

    let added = 0;
    let skipped = 0;

    for (const item of items) {
      if (!validProductIds.has(item.productId)) {
        skipped++;
        continue;
      }

      // Check if product already in bundle (with same variant if specified)
      const existingItem = await BundleItem.findOne({
        bundle: id,
        product: item.productId,
        variant: item.variantId || null,
      });

      if (existingItem) {
        skipped++;
        continue;
      }

      const bundleItem = new BundleItem({
        bundle: id,
        product: item.productId,
        variant: item.variantId || null,
        quantity: item.quantity || 1,
        sortOrder: item.sortOrder !== undefined ? item.sortOrder : nextSortOrder++,
      });

      await bundleItem.save();
      added++;
    }

    // Recompute bundle pricing
    const pricing = await computeBundlePricing(
      id,
      bundle.pricingType,
      bundle.fixedPrice,
      bundle.percentageOff
    );

    bundle.originalPrice = pricing.originalPrice;
    bundle.finalPrice = pricing.finalPrice;
    bundle.savings = pricing.savings;
    await bundle.save();

    console.log("addBundleItems response:", { added, skipped });

    return sendResponse(
      res,
      201,
      "Items added successfully",
      {
        added,
        skipped,
        bundle: {
          originalPrice: bundle.originalPrice,
          finalPrice: bundle.finalPrice,
          savings: bundle.savings,
        },
      },
      null
    );
  } catch (error) {
    console.log("addBundleItems error:", error.message);
    return sendResponse(res, 500, "Failed to add items", null, error.message);
  }
};

/**
 * @route PUT /api/admin/bundles/:id/items/:itemId
 * @description Update a bundle item
 * @access Admin
 *
 * @params
 * - id: Bundle ObjectId
 * - itemId: BundleItem ObjectId
 *
 * @requestBody
 * {
 *   "variantId": "...",
 *   "quantity": 2,
 *   "sortOrder": 1
 * }
 *
 * @example Request
 * PUT /api/admin/bundles/507f1f77bcf86cd799439011/items/507f1f77bcf86cd799439012
 * Content-Type: application/json
 * { "quantity": 3 }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Item updated successfully",
 *   "data": {
 *     "item": { "_id": "...", "quantity": 3, ... },
 *     "bundle": { "originalPrice": 1500, "finalPrice": 1200, "savings": 300 }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Bundle item not found", "data": null, "error": "Bundle item with ID '...' not found" }
 */
export const updateBundleItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { variantId, quantity, sortOrder } = req.body;
    console.log("updateBundleItem request:", { id, itemId, body: req.body });

    const bundle = await Bundle.findOne({ _id: id, deletedAt: null });

    if (!bundle) {
      console.log("updateBundleItem error: Bundle not found");
      return sendResponse(
        res,
        404,
        "Bundle not found",
        null,
        `Bundle with ID '${id}' not found`
      );
    }

    const item = await BundleItem.findOne({ _id: itemId, bundle: id });

    if (!item) {
      console.log("updateBundleItem error: Bundle item not found");
      return sendResponse(
        res,
        404,
        "Bundle item not found",
        null,
        `Bundle item with ID '${itemId}' not found`
      );
    }

    // Update fields
    if (variantId !== undefined) item.variant = variantId;
    if (quantity !== undefined) item.quantity = quantity;
    if (sortOrder !== undefined) item.sortOrder = sortOrder;

    await item.save();

    // Recompute bundle pricing
    const pricing = await computeBundlePricing(
      id,
      bundle.pricingType,
      bundle.fixedPrice,
      bundle.percentageOff
    );

    bundle.originalPrice = pricing.originalPrice;
    bundle.finalPrice = pricing.finalPrice;
    bundle.savings = pricing.savings;
    await bundle.save();

    console.log("updateBundleItem response:", { itemId: item._id });

    return sendResponse(
      res,
      200,
      "Item updated successfully",
      {
        item,
        bundle: {
          originalPrice: bundle.originalPrice,
          finalPrice: bundle.finalPrice,
          savings: bundle.savings,
        },
      },
      null
    );
  } catch (error) {
    console.log("updateBundleItem error:", error.message);
    return sendResponse(res, 500, "Failed to update item", null, error.message);
  }
};

/**
 * @route DELETE /api/admin/bundles/:id/items/:itemId
 * @description Remove an item from a bundle
 * @access Admin
 *
 * @params
 * - id: Bundle ObjectId
 * - itemId: BundleItem ObjectId
 *
 * @example Request
 * DELETE /api/admin/bundles/507f1f77bcf86cd799439011/items/507f1f77bcf86cd799439012
 *
 * @responseBody Success (200)
 * {
 *   "message": "Item removed successfully",
 *   "data": {
 *     "removed": true,
 *     "bundle": { "originalPrice": 1000, "finalPrice": 800, "savings": 200 }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Bundle item not found", "data": null, "error": "Bundle item with ID '...' not found" }
 */
export const removeBundleItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    console.log("removeBundleItem request:", { id, itemId });

    const bundle = await Bundle.findOne({ _id: id, deletedAt: null });

    if (!bundle) {
      console.log("removeBundleItem error: Bundle not found");
      return sendResponse(
        res,
        404,
        "Bundle not found",
        null,
        `Bundle with ID '${id}' not found`
      );
    }

    const item = await BundleItem.findOneAndDelete({ _id: itemId, bundle: id });

    if (!item) {
      console.log("removeBundleItem error: Bundle item not found");
      return sendResponse(
        res,
        404,
        "Bundle item not found",
        null,
        `Bundle item with ID '${itemId}' not found`
      );
    }

    // Recompute bundle pricing
    const pricing = await computeBundlePricing(
      id,
      bundle.pricingType,
      bundle.fixedPrice,
      bundle.percentageOff
    );

    bundle.originalPrice = pricing.originalPrice;
    bundle.finalPrice = pricing.finalPrice;
    bundle.savings = pricing.savings;
    await bundle.save();

    console.log("removeBundleItem response:", { removed: true });

    return sendResponse(
      res,
      200,
      "Item removed successfully",
      {
        removed: true,
        bundle: {
          originalPrice: bundle.originalPrice,
          finalPrice: bundle.finalPrice,
          savings: bundle.savings,
        },
      },
      null
    );
  } catch (error) {
    console.log("removeBundleItem error:", error.message);
    return sendResponse(res, 500, "Failed to remove item", null, error.message);
  }
};

/**
 * @route DELETE /api/admin/bundles/:id
 * @description Soft delete a bundle
 * @access Admin
 *
 * @params
 * - id: Bundle ObjectId
 *
 * @example Request
 * DELETE /api/admin/bundles/507f1f77bcf86cd799439011
 *
 * @responseBody Success (200)
 * {
 *   "message": "Bundle deleted successfully",
 *   "data": {
 *     "bundle": { "_id": "...", "deletedAt": "2024-01-01T00:00:00.000Z", ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Bundle not found", "data": null, "error": "Bundle with ID '...' not found" }
 */
export const deleteBundle = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("deleteBundle request:", { id });

    const bundle = await Bundle.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date(), isActive: false },
      { new: true }
    );

    if (!bundle) {
      console.log("deleteBundle error: Bundle not found");
      return sendResponse(
        res,
        404,
        "Bundle not found",
        null,
        `Bundle with ID '${id}' not found`
      );
    }

    console.log("deleteBundle response:", { bundleId: bundle._id });

    return sendResponse(
      res,
      200,
      "Bundle deleted successfully",
      { bundle },
      null
    );
  } catch (error) {
    console.log("deleteBundle error:", error.message);
    return sendResponse(res, 500, "Failed to delete bundle", null, error.message);
  }
};

/**
 * @route GET /api/bundles/:id/validate
 * @description Validate if a bundle is valid and available for purchase
 * @access Public
 *
 * @params
 * - id: Bundle ObjectId
 *
 * @responseBody Success (200)
 * {
 *   "message": "Bundle validation completed",
 *   "data": {
 *     "valid": true,
 *     "bundle": { "_id": "...", "name": "...", "finalPrice": 1200 },
 *     "issues": []
 *   }
 * }
 *
 * @responseBody Success with Issues (200)
 * {
 *   "message": "Bundle validation completed",
 *   "data": {
 *     "valid": false,
 *     "bundle": { "_id": "...", "name": "..." },
 *     "issues": ["Bundle is not active", "Product XYZ is out of stock"]
 *   }
 * }
 */
export const validateBundle = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`> GET /api/bundles/${id}/validate`);

    const bundle = await Bundle.findOne({
      _id: id,
      deletedAt: null,
    }).select("name slug isActive validFrom validTo pricingType originalPrice finalPrice savings");

    if (!bundle) {
      console.log("> Bundle not found");
      return sendResponse(
        res,
        404,
        "Bundle not found",
        null,
        `Bundle with ID '${id}' not found`
      );
    }

    const issues = [];
    const now = new Date();

    // Check if bundle is active
    if (!bundle.isActive) {
      issues.push("Bundle is not active");
    }

    // Check date validity
    if (bundle.validFrom && bundle.validFrom > now) {
      issues.push("Bundle is not yet valid");
    }

    if (bundle.validTo && bundle.validTo < now) {
      issues.push("Bundle has expired");
    }

    // Check bundle items
    const items = await BundleItem.find({ bundle: id });

    if (items.length === 0) {
      issues.push("Bundle has no items");
    }

    // Check if all products and variants are available
    for (const item of items) {
      const product = await Product.findOne({
        _id: item.product,
        status: "active",
        deletedAt: null,
      });

      if (!product) {
        issues.push(`Product ${item.product} is not available`);
        continue;
      }

      if (item.variant) {
        const variant = await ProductVariant.findOne({
          _id: item.variant,
          isActive: true,
          deletedAt: null,
        });

        if (!variant) {
          issues.push(`Variant ${item.variant} for product ${product.name} is not available`);
        }
      }
    }

    const valid = issues.length === 0;

    console.log(`> Bundle validation: valid=${valid}, issues=${issues.length}`);

    return sendResponse(res, 200, "Bundle validation completed", {
      valid,
      bundle: {
        _id: bundle._id,
        name: bundle.name,
        slug: bundle.slug,
        originalPrice: bundle.originalPrice,
        finalPrice: bundle.finalPrice,
        savings: bundle.savings,
      },
      issues,
    }, null);
  } catch (error) {
    console.log("> Error validating bundle:", error.message);
    return sendResponse(res, 500, "Failed to validate bundle", null, error.message);
  }
};

export default {
  listBundles,
  getBundleBySlug,
  listAllBundles,
  createBundle,
  getBundleById,
  updateBundle,
  toggleBundleStatus,
  addBundleItems,
  updateBundleItem,
  removeBundleItem,
  deleteBundle,
  validateBundle,
};
