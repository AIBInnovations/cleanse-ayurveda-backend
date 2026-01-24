import ProductCategory from "../../models/product-category.model.js";
import Product from "../../models/product.model.js";
import Category from "../../models/category.model.js";
import { sendResponse } from "@shared/utils";

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
export const listProductCategories = async (req, res) => {
  console.log("> List product categories request");
  console.log("> Request params:", req.params);

  try {
    const { productId } = req.params;

    // Verify product exists
    const product = await Product.findOne({
      _id: productId,
      deletedAt: null,
    }).select("name slug");

    if (!product) {
      console.log("> Product not found:", productId);
      return sendResponse(
        res,
        404,
        "Product not found",
        null,
        `Product with ID '${productId}' not found`
      );
    }

    // Fetch assigned categories
    const categories = await ProductCategory.find({ product: productId })
      .populate("category", "name slug description level path image isActive")
      .sort({ isPrimary: -1, createdAt: 1 });

    console.log(`> Found ${categories.length} assigned categories`);

    const responseData = { product, categories, count: categories.length };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 200, "Product categories fetched successfully", responseData, null);
  } catch (error) {
    console.log("> Error fetching product categories:", error.message);
    return sendResponse(res, 500, "Failed to fetch product categories", null, error.message);
  }
};

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
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 *
 * @responseBody Error (409)
 * { "message": "Category already assigned", "data": null, "error": "This category is already assigned to this product" }
 */
export const assignCategoryToProduct = async (req, res) => {
  console.log("> Assign category to product request");
  console.log("> Request params:", req.params);
  console.log("> Request body:", req.body);

  try {
    const { productId } = req.params;
    const { categoryId, isPrimary } = req.body;

    // Verify product exists
    const product = await Product.findOne({
      _id: productId,
      deletedAt: null,
    }).select("_id");

    if (!product) {
      console.log("> Product not found:", productId);
      return sendResponse(
        res,
        404,
        "Product not found",
        null,
        `Product with ID '${productId}' not found`
      );
    }

    // Verify category exists
    const category = await Category.findOne({
      _id: categoryId,
      deletedAt: null,
    }).select("_id name slug");

    if (!category) {
      console.log("> Category not found:", categoryId);
      return sendResponse(
        res,
        404,
        "Category not found",
        null,
        `Category with ID '${categoryId}' not found`
      );
    }

    // Check if mapping already exists
    const existingMapping = await ProductCategory.findOne({
      product: productId,
      category: categoryId,
    });

    if (existingMapping) {
      console.log("> Category already assigned");
      return sendResponse(
        res,
        409,
        "Category already assigned",
        null,
        "This category is already assigned to this product"
      );
    }

    // If setting as primary, unset other primary categories for this product
    if (isPrimary) {
      await ProductCategory.updateMany(
        { product: productId },
        { isPrimary: false }
      );
      console.log("> Reset other primary categories");
    }

    // Create mapping
    const mapping = await ProductCategory.create({
      product: productId,
      category: categoryId,
      isPrimary: isPrimary || false,
    });

    // Populate category details for response
    await mapping.populate("category", "name slug description level path image");

    console.log("> Mapping created:", mapping._id);

    const responseData = { mapping };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 201, "Category assigned successfully", responseData, null);
  } catch (error) {
    console.log("> Error assigning category:", error.message);
    return sendResponse(res, 500, "Failed to assign category", null, error.message);
  }
};

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
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
export const bulkAssignCategories = async (req, res) => {
  console.log("> Bulk assign categories request");
  console.log("> Request params:", req.params);
  console.log("> Request body:", req.body);

  try {
    const { productId } = req.params;
    const { categories } = req.body;

    // Verify product exists
    const product = await Product.findOne({
      _id: productId,
      deletedAt: null,
    }).select("_id");

    if (!product) {
      console.log("> Product not found:", productId);
      return sendResponse(
        res,
        404,
        "Product not found",
        null,
        `Product with ID '${productId}' not found`
      );
    }

    // Get all category IDs to verify
    const categoryIds = categories.map((item) => item.categoryId);

    // Verify all categories exist
    const validCategories = await Category.find({
      _id: { $in: categoryIds },
      deletedAt: null,
    }).select("_id");

    const validCategoryIds = new Set(validCategories.map((c) => c._id.toString()));

    const invalidIds = categoryIds.filter((id) => !validCategoryIds.has(id));
    if (invalidIds.length > 0) {
      console.log("> Invalid category IDs:", invalidIds);
      return sendResponse(
        res,
        400,
        "Invalid category IDs",
        null,
        `Category IDs not found: ${invalidIds.join(", ")}`
      );
    }

    // Check for existing mappings
    const existingMappings = await ProductCategory.find({
      product: productId,
      category: { $in: categoryIds },
    }).select("category");

    const existingCategoryIds = new Set(existingMappings.map((m) => m.category.toString()));

    // Check for multiple primary categories in request
    const primaryCategories = categories.filter((item) => item.isPrimary);
    if (primaryCategories.length > 1) {
      console.log("> Multiple primary categories specified");
      return sendResponse(
        res,
        400,
        "Invalid primary settings",
        null,
        "Only one category can be set as primary"
      );
    }

    // If setting a primary, unset existing primary categories
    if (primaryCategories.length === 1) {
      await ProductCategory.updateMany(
        { product: productId },
        { isPrimary: false }
      );
      console.log("> Reset existing primary categories");
    }

    // Prepare documents for new mappings only
    const newMappings = [];
    let skipped = 0;

    for (const item of categories) {
      if (existingCategoryIds.has(item.categoryId)) {
        skipped++;
        continue;
      }

      newMappings.push({
        product: productId,
        category: item.categoryId,
        isPrimary: item.isPrimary || false,
      });
    }

    if (newMappings.length === 0) {
      console.log("> All categories already assigned");
      return sendResponse(
        res,
        200,
        "All categories already assigned",
        { mappings: [], count: 0, skipped },
        null
      );
    }

    // Insert new mappings
    const createdMappings = await ProductCategory.insertMany(newMappings);

    // Populate category details
    const populatedMappings = await ProductCategory.find({
      _id: { $in: createdMappings.map((m) => m._id) },
    }).populate("category", "name slug description level path image");

    console.log(`> Created ${createdMappings.length} mappings, skipped ${skipped}`);

    const responseData = {
      mappings: populatedMappings,
      count: populatedMappings.length,
      skipped,
    };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 201, "Categories assigned successfully", responseData, null);
  } catch (error) {
    console.log("> Error bulk assigning categories:", error.message);
    return sendResponse(res, 500, "Failed to assign categories", null, error.message);
  }
};

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
export const setPrimaryCategory = async (req, res) => {
  console.log("> Set primary category request");
  console.log("> Request params:", req.params);

  try {
    const { productId, categoryId } = req.params;

    // Find the mapping
    const mapping = await ProductCategory.findOne({
      product: productId,
      category: categoryId,
    });

    if (!mapping) {
      console.log("> Mapping not found");
      return sendResponse(
        res,
        404,
        "Mapping not found",
        null,
        "This category is not assigned to this product"
      );
    }

    // Unset other primary categories for this product
    await ProductCategory.updateMany(
      { product: productId, _id: { $ne: mapping._id } },
      { isPrimary: false }
    );
    console.log("> Reset other primary categories");

    // Set this mapping as primary
    mapping.isPrimary = true;
    await mapping.save();

    // Populate category details for response
    await mapping.populate("category", "name slug description level path image");

    console.log("> Primary category set:", mapping._id);

    const responseData = { mapping };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 200, "Primary category set successfully", responseData, null);
  } catch (error) {
    console.log("> Error setting primary category:", error.message);
    return sendResponse(res, 500, "Failed to set primary category", null, error.message);
  }
};

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
export const removeCategoryFromProduct = async (req, res) => {
  console.log("> Remove category from product request");
  console.log("> Request params:", req.params);

  try {
    const { productId, categoryId } = req.params;

    // Find and delete mapping
    const mapping = await ProductCategory.findOneAndDelete({
      product: productId,
      category: categoryId,
    });

    if (!mapping) {
      console.log("> Mapping not found");
      return sendResponse(
        res,
        404,
        "Mapping not found",
        null,
        "This category is not assigned to this product"
      );
    }

    console.log("> Mapping removed:", mapping._id);

    const responseData = { mapping };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 200, "Category removed successfully", responseData, null);
  } catch (error) {
    console.log("> Error removing category:", error.message);
    return sendResponse(res, 500, "Failed to remove category", null, error.message);
  }
};
