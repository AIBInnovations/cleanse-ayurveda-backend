import RelatedProduct from "../../models/related-product.model.js";
import Product from "../../models/product.model.js";
import ProductVariant from "../../models/product-variant.model.js";
import ProductMedia from "../../models/product-media.model.js";
import { sendResponse } from "@shared/utils";

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
    });
  }

  return enrichedProducts;
};

/**
 * Gets related products by type for a product
 * @param {string} productId - Product ID
 * @param {string} relationType - Relation type
 * @param {number} limit - Max items to return
 * @returns {Promise<Array>} - Related products
 */
const getRelatedByType = async (productId, relationType, limit) => {
  const relations = await RelatedProduct.find({
    product: productId,
    relationType,
  })
    .sort({ sortOrder: 1 })
    .limit(limit)
    .populate({
      path: "relatedProduct",
      match: { status: "active", deletedAt: null },
      select: "name slug shortDescription ratingSummary",
    });

  // Filter out null relatedProducts (inactive/deleted)
  const validRelations = relations.filter((r) => r.relatedProduct);
  const products = validRelations.map((r) => r.relatedProduct);

  return enrichProducts(products);
};

/**
 * Consumer Controllers
 */

/**
 * @route GET /api/products/:productSlug/cross-sell
 * @description Get cross-sell products for a product
 * @access Public
 *
 * @params
 * - productSlug: Product slug
 *
 * @query
 * - limit: number (default: 10, max: 20)
 *
 * @example Request
 * GET /api/products/aloe-face-wash/cross-sell?limit=5
 *
 * @responseBody Success (200)
 * {
 *   "message": "Cross-sell products fetched successfully",
 *   "data": {
 *     "products": [
 *       {
 *         "_id": "...",
 *         "name": "Aloe Toner",
 *         "slug": "aloe-toner",
 *         "shortDescription": "...",
 *         "primaryImage": { "url": "...", "altText": "..." },
 *         "pricing": { "mrp": 500, "salePrice": 450 },
 *         "ratingSummary": { "average": 4.5, "count": 100 }
 *       }
 *     ]
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with slug 'xyz' not found" }
 */
export const getCrossSellProducts = async (req, res) => {
  try {
    const { productSlug } = req.params;
    const { limit = 10 } = req.query;
    console.log("getCrossSellProducts request:", { productSlug, limit });

    const product = await Product.findOne({
      slug: productSlug,
      status: "active",
      deletedAt: null,
    });

    if (!product) {
      console.log("getCrossSellProducts error: Product not found");
      return sendResponse(
        res,
        404,
        "Product not found",
        null,
        `Product with slug '${productSlug}' not found`
      );
    }

    const products = await getRelatedByType(product._id, "crossSell", parseInt(limit));

    console.log("getCrossSellProducts response:", { count: products.length });

    return sendResponse(
      res,
      200,
      "Cross-sell products fetched successfully",
      { products },
      null
    );
  } catch (error) {
    console.log("getCrossSellProducts error:", error.message);
    return sendResponse(res, 500, "Failed to fetch cross-sell products", null, error.message);
  }
};

/**
 * @route GET /api/products/:productSlug/up-sell
 * @description Get up-sell products for a product
 * @access Public
 *
 * @params
 * - productSlug: Product slug
 *
 * @query
 * - limit: number (default: 10, max: 20)
 *
 * @example Request
 * GET /api/products/aloe-face-wash/up-sell?limit=5
 *
 * @responseBody Success (200)
 * {
 *   "message": "Up-sell products fetched successfully",
 *   "data": {
 *     "products": [
 *       {
 *         "_id": "...",
 *         "name": "Premium Aloe Face Wash",
 *         "slug": "premium-aloe-face-wash",
 *         "shortDescription": "...",
 *         "primaryImage": { "url": "...", "altText": "..." },
 *         "pricing": { "mrp": 800, "salePrice": 720 },
 *         "ratingSummary": { "average": 4.8, "count": 50 }
 *       }
 *     ]
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with slug 'xyz' not found" }
 */
export const getUpSellProducts = async (req, res) => {
  try {
    const { productSlug } = req.params;
    const { limit = 10 } = req.query;
    console.log("getUpSellProducts request:", { productSlug, limit });

    const product = await Product.findOne({
      slug: productSlug,
      status: "active",
      deletedAt: null,
    });

    if (!product) {
      console.log("getUpSellProducts error: Product not found");
      return sendResponse(
        res,
        404,
        "Product not found",
        null,
        `Product with slug '${productSlug}' not found`
      );
    }

    const products = await getRelatedByType(product._id, "upSell", parseInt(limit));

    console.log("getUpSellProducts response:", { count: products.length });

    return sendResponse(
      res,
      200,
      "Up-sell products fetched successfully",
      { products },
      null
    );
  } catch (error) {
    console.log("getUpSellProducts error:", error.message);
    return sendResponse(res, 500, "Failed to fetch up-sell products", null, error.message);
  }
};

/**
 * @route GET /api/products/:productSlug/frequently-bought
 * @description Get frequently bought together products for a product
 * @access Public
 *
 * @params
 * - productSlug: Product slug
 *
 * @query
 * - limit: number (default: 10, max: 20)
 *
 * @example Request
 * GET /api/products/aloe-face-wash/frequently-bought?limit=5
 *
 * @responseBody Success (200)
 * {
 *   "message": "Frequently bought together products fetched successfully",
 *   "data": {
 *     "products": [
 *       {
 *         "_id": "...",
 *         "name": "Aloe Moisturizer",
 *         "slug": "aloe-moisturizer",
 *         "shortDescription": "...",
 *         "primaryImage": { "url": "...", "altText": "..." },
 *         "pricing": { "mrp": 600, "salePrice": 540 },
 *         "ratingSummary": { "average": 4.6, "count": 80 }
 *       }
 *     ]
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with slug 'xyz' not found" }
 */
export const getFrequentlyBoughtTogether = async (req, res) => {
  try {
    const { productSlug } = req.params;
    const { limit = 10 } = req.query;
    console.log("getFrequentlyBoughtTogether request:", { productSlug, limit });

    const product = await Product.findOne({
      slug: productSlug,
      status: "active",
      deletedAt: null,
    });

    if (!product) {
      console.log("getFrequentlyBoughtTogether error: Product not found");
      return sendResponse(
        res,
        404,
        "Product not found",
        null,
        `Product with slug '${productSlug}' not found`
      );
    }

    const products = await getRelatedByType(
      product._id,
      "frequentlyBoughtTogether",
      parseInt(limit)
    );

    console.log("getFrequentlyBoughtTogether response:", { count: products.length });

    return sendResponse(
      res,
      200,
      "Frequently bought together products fetched successfully",
      { products },
      null
    );
  } catch (error) {
    console.log("getFrequentlyBoughtTogether error:", error.message);
    return sendResponse(
      res,
      500,
      "Failed to fetch frequently bought together products",
      null,
      error.message
    );
  }
};

/**
 * Admin Controllers
 */

/**
 * @route GET /api/admin/products/:productId/related
 * @description List all related products grouped by type
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @query
 * - relationType: string (optional, filter by type)
 *
 * @example Request
 * GET /api/admin/products/507f1f77bcf86cd799439011/related
 * GET /api/admin/products/507f1f77bcf86cd799439011/related?relationType=crossSell
 *
 * @responseBody Success (200)
 * {
 *   "message": "Related products fetched successfully",
 *   "data": {
 *     "product": { "_id": "...", "name": "Aloe Face Wash", "slug": "aloe-face-wash" },
 *     "crossSell": [
 *       { "_id": "...", "relatedProduct": {...}, "sortOrder": 0 }
 *     ],
 *     "upSell": [...],
 *     "frequentlyBoughtTogether": [...]
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
export const listRelatedProducts = async (req, res) => {
  try {
    const { productId } = req.params;
    const { relationType } = req.query;
    console.log("listRelatedProducts request:", { productId, relationType });

    const product = await Product.findOne({
      _id: productId,
      deletedAt: null,
    }).select("name slug");

    if (!product) {
      console.log("listRelatedProducts error: Product not found");
      return sendResponse(
        res,
        404,
        "Product not found",
        null,
        `Product with ID '${productId}' not found`
      );
    }

    const query = { product: productId };
    if (relationType) {
      query.relationType = relationType;
    }

    const relations = await RelatedProduct.find(query)
      .sort({ relationType: 1, sortOrder: 1 })
      .populate({
        path: "relatedProduct",
        select: "name slug status deletedAt",
      });

    // Group by relation type
    const grouped = {
      crossSell: [],
      upSell: [],
      frequentlyBoughtTogether: [],
    };

    for (const relation of relations) {
      if (relation.relatedProduct) {
        grouped[relation.relationType].push({
          _id: relation._id,
          relatedProduct: {
            _id: relation.relatedProduct._id,
            name: relation.relatedProduct.name,
            slug: relation.relatedProduct.slug,
            status: relation.relatedProduct.status,
          },
          sortOrder: relation.sortOrder,
          createdAt: relation.createdAt,
        });
      }
    }

    const response = {
      product: { _id: product._id, name: product.name, slug: product.slug },
      ...grouped,
    };

    console.log("listRelatedProducts response:", {
      crossSell: grouped.crossSell.length,
      upSell: grouped.upSell.length,
      frequentlyBoughtTogether: grouped.frequentlyBoughtTogether.length,
    });

    return sendResponse(
      res,
      200,
      "Related products fetched successfully",
      response,
      null
    );
  } catch (error) {
    console.log("listRelatedProducts error:", error.message);
    return sendResponse(res, 500, "Failed to fetch related products", null, error.message);
  }
};

/**
 * @route POST /api/admin/products/:productId/related
 * @description Add a related product
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @requestBody
 * {
 *   "relatedProductId": "507f1f77bcf86cd799439012",
 *   "relationType": "crossSell",
 *   "sortOrder": 0
 * }
 *
 * @example Request
 * POST /api/admin/products/507f1f77bcf86cd799439011/related
 * Content-Type: application/json
 * { "relatedProductId": "...", "relationType": "crossSell" }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Related product added successfully",
 *   "data": {
 *     "relation": { "_id": "...", "product": "...", "relatedProduct": "...", "relationType": "crossSell", "sortOrder": 0 }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (400)
 * { "message": "Cannot relate product to itself", "data": null, "error": "A product cannot be related to itself" }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 *
 * @responseBody Error (409)
 * { "message": "Relation already exists", "data": null, "error": "This relation already exists" }
 */
export const addRelatedProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { relatedProductId, relationType, sortOrder } = req.body;
    console.log("addRelatedProduct request:", { productId, relatedProductId, relationType });

    // Prevent self-relation
    if (productId === relatedProductId) {
      console.log("addRelatedProduct error: Cannot relate product to itself");
      return sendResponse(
        res,
        400,
        "Cannot relate product to itself",
        null,
        "A product cannot be related to itself"
      );
    }

    // Verify both products exist
    const [product, relatedProduct] = await Promise.all([
      Product.findOne({ _id: productId, deletedAt: null }),
      Product.findOne({ _id: relatedProductId, deletedAt: null }),
    ]);

    if (!product) {
      console.log("addRelatedProduct error: Product not found");
      return sendResponse(
        res,
        404,
        "Product not found",
        null,
        `Product with ID '${productId}' not found`
      );
    }

    if (!relatedProduct) {
      console.log("addRelatedProduct error: Related product not found");
      return sendResponse(
        res,
        404,
        "Related product not found",
        null,
        `Related product with ID '${relatedProductId}' not found`
      );
    }

    // Check if relation already exists
    const existingRelation = await RelatedProduct.findOne({
      product: productId,
      relatedProduct: relatedProductId,
      relationType,
    });

    if (existingRelation) {
      console.log("addRelatedProduct error: Relation already exists");
      return sendResponse(
        res,
        409,
        "Relation already exists",
        null,
        "This relation already exists"
      );
    }

    // Get next sort order if not provided
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined || finalSortOrder === 0) {
      const maxSortRelation = await RelatedProduct.findOne({
        product: productId,
        relationType,
      }).sort({ sortOrder: -1 });

      finalSortOrder = maxSortRelation ? maxSortRelation.sortOrder + 1 : 0;
    }

    const relation = new RelatedProduct({
      product: productId,
      relatedProduct: relatedProductId,
      relationType,
      sortOrder: finalSortOrder,
    });

    await relation.save();

    console.log("addRelatedProduct response:", { relationId: relation._id });

    return sendResponse(
      res,
      201,
      "Related product added successfully",
      { relation },
      null
    );
  } catch (error) {
    console.log("addRelatedProduct error:", error.message);
    return sendResponse(res, 500, "Failed to add related product", null, error.message);
  }
};

/**
 * @route POST /api/admin/products/:productId/related/bulk
 * @description Bulk add related products
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @requestBody
 * {
 *   "products": [
 *     { "relatedProductId": "...", "relationType": "crossSell", "sortOrder": 0 },
 *     { "relatedProductId": "...", "relationType": "upSell", "sortOrder": 0 }
 *   ]
 * }
 *
 * @example Request
 * POST /api/admin/products/507f1f77bcf86cd799439011/related/bulk
 * Content-Type: application/json
 * { "products": [{ "relatedProductId": "...", "relationType": "crossSell" }] }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Related products added successfully",
 *   "data": { "added": 2, "skipped": 1 },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
export const bulkAddRelatedProducts = async (req, res) => {
  try {
    const { productId } = req.params;
    const { products } = req.body;
    console.log("bulkAddRelatedProducts request:", { productId, count: products.length });

    const product = await Product.findOne({ _id: productId, deletedAt: null });

    if (!product) {
      console.log("bulkAddRelatedProducts error: Product not found");
      return sendResponse(
        res,
        404,
        "Product not found",
        null,
        `Product with ID '${productId}' not found`
      );
    }

    // Validate all related products exist
    const relatedProductIds = products.map((p) => p.relatedProductId);
    const existingProducts = await Product.find({
      _id: { $in: relatedProductIds },
      deletedAt: null,
    });

    const validProductIds = new Set(existingProducts.map((p) => p._id.toString()));

    // Get current max sort orders per type
    const sortOrderMap = {};
    for (const type of ["crossSell", "upSell", "frequentlyBoughtTogether"]) {
      const maxRelation = await RelatedProduct.findOne({
        product: productId,
        relationType: type,
      }).sort({ sortOrder: -1 });

      sortOrderMap[type] = maxRelation ? maxRelation.sortOrder + 1 : 0;
    }

    let added = 0;
    let skipped = 0;

    for (const item of products) {
      // Skip self-relation
      if (productId === item.relatedProductId) {
        skipped++;
        continue;
      }

      // Skip if product doesn't exist
      if (!validProductIds.has(item.relatedProductId)) {
        skipped++;
        continue;
      }

      // Check if relation already exists
      const existingRelation = await RelatedProduct.findOne({
        product: productId,
        relatedProduct: item.relatedProductId,
        relationType: item.relationType,
      });

      if (existingRelation) {
        skipped++;
        continue;
      }

      const relation = new RelatedProduct({
        product: productId,
        relatedProduct: item.relatedProductId,
        relationType: item.relationType,
        sortOrder:
          item.sortOrder !== undefined
            ? item.sortOrder
            : sortOrderMap[item.relationType]++,
      });

      await relation.save();
      added++;
    }

    console.log("bulkAddRelatedProducts response:", { added, skipped });

    return sendResponse(
      res,
      201,
      "Related products added successfully",
      { added, skipped },
      null
    );
  } catch (error) {
    console.log("bulkAddRelatedProducts error:", error.message);
    return sendResponse(res, 500, "Failed to add related products", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/products/:productId/related/reorder
 * @description Reorder related products of a specific type
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @requestBody
 * {
 *   "relationType": "crossSell",
 *   "products": [
 *     { "relatedProductId": "...", "sortOrder": 0 },
 *     { "relatedProductId": "...", "sortOrder": 1 }
 *   ]
 * }
 *
 * @example Request
 * PATCH /api/admin/products/507f1f77bcf86cd799439011/related/reorder
 * Content-Type: application/json
 * { "relationType": "crossSell", "products": [{ "relatedProductId": "...", "sortOrder": 0 }] }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Related products reordered successfully",
 *   "data": { "modifiedCount": 3 },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
export const reorderRelatedProducts = async (req, res) => {
  try {
    const { productId } = req.params;
    const { relationType, products } = req.body;
    console.log("reorderRelatedProducts request:", {
      productId,
      relationType,
      count: products.length,
    });

    const product = await Product.findOne({ _id: productId, deletedAt: null });

    if (!product) {
      console.log("reorderRelatedProducts error: Product not found");
      return sendResponse(
        res,
        404,
        "Product not found",
        null,
        `Product with ID '${productId}' not found`
      );
    }

    let modifiedCount = 0;

    for (const item of products) {
      const result = await RelatedProduct.updateOne(
        {
          product: productId,
          relatedProduct: item.relatedProductId,
          relationType,
        },
        { sortOrder: item.sortOrder }
      );

      if (result.modifiedCount > 0) {
        modifiedCount++;
      }
    }

    console.log("reorderRelatedProducts response:", { modifiedCount });

    return sendResponse(
      res,
      200,
      "Related products reordered successfully",
      { modifiedCount },
      null
    );
  } catch (error) {
    console.log("reorderRelatedProducts error:", error.message);
    return sendResponse(res, 500, "Failed to reorder related products", null, error.message);
  }
};

/**
 * @route DELETE /api/admin/products/:productId/related/:relatedId
 * @description Remove a related product
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 * - relatedId: Related Product ObjectId
 *
 * @query
 * - relationType: string (optional, to specify which relation type to remove)
 *
 * @example Request
 * DELETE /api/admin/products/507f1f77bcf86cd799439011/related/507f1f77bcf86cd799439012
 * DELETE /api/admin/products/507f1f77bcf86cd799439011/related/507f1f77bcf86cd799439012?relationType=crossSell
 *
 * @responseBody Success (200)
 * {
 *   "message": "Related product removed successfully",
 *   "data": { "removed": true, "deletedCount": 1 },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Relation not found", "data": null, "error": "No relation found between these products" }
 */
export const removeRelatedProduct = async (req, res) => {
  try {
    const { productId, relatedId } = req.params;
    const { relationType } = req.query;
    console.log("removeRelatedProduct request:", { productId, relatedId, relationType });

    const query = {
      product: productId,
      relatedProduct: relatedId,
    };

    if (relationType) {
      query.relationType = relationType;
    }

    const result = await RelatedProduct.deleteMany(query);

    if (result.deletedCount === 0) {
      console.log("removeRelatedProduct error: Relation not found");
      return sendResponse(
        res,
        404,
        "Relation not found",
        null,
        "No relation found between these products"
      );
    }

    console.log("removeRelatedProduct response:", { deletedCount: result.deletedCount });

    return sendResponse(
      res,
      200,
      "Related product removed successfully",
      { removed: true, deletedCount: result.deletedCount },
      null
    );
  } catch (error) {
    console.log("removeRelatedProduct error:", error.message);
    return sendResponse(res, 500, "Failed to remove related product", null, error.message);
  }
};

export default {
  getCrossSellProducts,
  getUpSellProducts,
  getFrequentlyBoughtTogether,
  listRelatedProducts,
  addRelatedProduct,
  bulkAddRelatedProducts,
  reorderRelatedProducts,
  removeRelatedProduct,
};
