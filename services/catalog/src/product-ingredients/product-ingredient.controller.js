import ProductIngredient from "../../models/product-ingredient.model.js";
import Product from "../../models/product.model.js";
import Ingredient from "../../models/ingredient.model.js";
import { sendResponse } from "@shared/utils";

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
export const listProductIngredients = async (req, res) => {
  console.log("> List product ingredients request");
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

    // Fetch mapped ingredients
    const ingredients = await ProductIngredient.find({ product: productId })
      .populate("ingredient", "name slug description benefits image isActive")
      .sort({ sortOrder: 1, createdAt: 1 });

    console.log(`> Found ${ingredients.length} mapped ingredients`);

    const responseData = { product, ingredients, count: ingredients.length };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 200, "Product ingredients fetched successfully", responseData, null);
  } catch (error) {
    console.log("> Error fetching product ingredients:", error.message);
    return sendResponse(res, 500, "Failed to fetch product ingredients", null, error.message);
  }
};

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
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 *
 * @responseBody Error (409)
 * { "message": "Ingredient already mapped", "data": null, "error": "This ingredient is already mapped to this product" }
 */
export const mapIngredientToProduct = async (req, res) => {
  console.log("> Map ingredient to product request");
  console.log("> Request params:", req.params);
  console.log("> Request body:", req.body);

  try {
    const { productId } = req.params;
    const { ingredientId, percentage, isKeyIngredient, sortOrder } = req.body;

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

    // Verify ingredient exists
    const ingredient = await Ingredient.findOne({
      _id: ingredientId,
      deletedAt: null,
    }).select("_id name slug");

    if (!ingredient) {
      console.log("> Ingredient not found:", ingredientId);
      return sendResponse(
        res,
        404,
        "Ingredient not found",
        null,
        `Ingredient with ID '${ingredientId}' not found`
      );
    }

    // Check if mapping already exists
    const existingMapping = await ProductIngredient.findOne({
      product: productId,
      ingredient: ingredientId,
    });

    if (existingMapping) {
      console.log("> Ingredient already mapped");
      return sendResponse(
        res,
        409,
        "Ingredient already mapped",
        null,
        "This ingredient is already mapped to this product"
      );
    }

    // Get next sort order if not provided
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined || finalSortOrder === null) {
      const lastMapping = await ProductIngredient.findOne({ product: productId })
        .sort({ sortOrder: -1 })
        .select("sortOrder");

      finalSortOrder = lastMapping ? lastMapping.sortOrder + 1 : 0;
    }

    // Create mapping
    const mapping = await ProductIngredient.create({
      product: productId,
      ingredient: ingredientId,
      percentage: percentage || null,
      isKeyIngredient: isKeyIngredient || false,
      sortOrder: finalSortOrder,
    });

    // Populate ingredient details for response
    await mapping.populate("ingredient", "name slug description benefits image");

    console.log("> Mapping created:", mapping._id);

    const responseData = { mapping };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 201, "Ingredient mapped successfully", responseData, null);
  } catch (error) {
    console.log("> Error mapping ingredient:", error.message);
    return sendResponse(res, 500, "Failed to map ingredient", null, error.message);
  }
};

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
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
export const bulkMapIngredients = async (req, res) => {
  console.log("> Bulk map ingredients request");
  console.log("> Request params:", req.params);
  console.log("> Request body:", req.body);

  try {
    const { productId } = req.params;
    const { ingredients } = req.body;

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

    // Get all ingredient IDs to verify
    const ingredientIds = ingredients.map((item) => item.ingredientId);

    // Verify all ingredients exist
    const validIngredients = await Ingredient.find({
      _id: { $in: ingredientIds },
      deletedAt: null,
    }).select("_id");

    const validIngredientIds = new Set(validIngredients.map((i) => i._id.toString()));

    const invalidIds = ingredientIds.filter((id) => !validIngredientIds.has(id));
    if (invalidIds.length > 0) {
      console.log("> Invalid ingredient IDs:", invalidIds);
      return sendResponse(
        res,
        400,
        "Invalid ingredient IDs",
        null,
        `Ingredient IDs not found: ${invalidIds.join(", ")}`
      );
    }

    // Check for existing mappings
    const existingMappings = await ProductIngredient.find({
      product: productId,
      ingredient: { $in: ingredientIds },
    }).select("ingredient");

    const existingIngredientIds = new Set(existingMappings.map((m) => m.ingredient.toString()));

    // Get current max sort order
    const lastMapping = await ProductIngredient.findOne({ product: productId })
      .sort({ sortOrder: -1 })
      .select("sortOrder");

    let nextSortOrder = lastMapping ? lastMapping.sortOrder + 1 : 0;

    // Prepare documents for new mappings only
    const newMappings = [];
    let skipped = 0;

    for (let i = 0; i < ingredients.length; i++) {
      const item = ingredients[i];

      if (existingIngredientIds.has(item.ingredientId)) {
        skipped++;
        continue;
      }

      newMappings.push({
        product: productId,
        ingredient: item.ingredientId,
        percentage: item.percentage || null,
        isKeyIngredient: item.isKeyIngredient || false,
        sortOrder: item.sortOrder !== undefined ? item.sortOrder : nextSortOrder++,
      });
    }

    if (newMappings.length === 0) {
      console.log("> All ingredients already mapped");
      return sendResponse(
        res,
        200,
        "All ingredients already mapped",
        { mappings: [], count: 0, skipped },
        null
      );
    }

    // Insert new mappings
    const createdMappings = await ProductIngredient.insertMany(newMappings);

    // Populate ingredient details
    const populatedMappings = await ProductIngredient.find({
      _id: { $in: createdMappings.map((m) => m._id) },
    }).populate("ingredient", "name slug description benefits image");

    console.log(`> Created ${createdMappings.length} mappings, skipped ${skipped}`);

    const responseData = {
      mappings: populatedMappings,
      count: populatedMappings.length,
      skipped,
    };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 201, "Ingredients mapped successfully", responseData, null);
  } catch (error) {
    console.log("> Error bulk mapping ingredients:", error.message);
    return sendResponse(res, 500, "Failed to map ingredients", null, error.message);
  }
};

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
 * @responseBody Error (404)
 * { "message": "Mapping not found", "data": null, "error": "No mapping found for this product and ingredient" }
 */
export const updateIngredientMapping = async (req, res) => {
  console.log("> Update ingredient mapping request");
  console.log("> Request params:", req.params);
  console.log("> Request body:", req.body);

  try {
    const { productId, ingredientId } = req.params;
    const { percentage, isKeyIngredient, sortOrder } = req.body;

    // Build update object
    const updateData = {};
    if (percentage !== undefined) updateData.percentage = percentage;
    if (isKeyIngredient !== undefined) updateData.isKeyIngredient = isKeyIngredient;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    // Find and update mapping
    const mapping = await ProductIngredient.findOneAndUpdate(
      { product: productId, ingredient: ingredientId },
      updateData,
      { new: true }
    ).populate("ingredient", "name slug description benefits image");

    if (!mapping) {
      console.log("> Mapping not found");
      return sendResponse(
        res,
        404,
        "Mapping not found",
        null,
        "No mapping found for this product and ingredient"
      );
    }

    console.log("> Mapping updated:", mapping._id);

    const responseData = { mapping };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 200, "Mapping updated successfully", responseData, null);
  } catch (error) {
    console.log("> Error updating mapping:", error.message);
    return sendResponse(res, 500, "Failed to update mapping", null, error.message);
  }
};

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
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
export const reorderProductIngredients = async (req, res) => {
  console.log("> Reorder product ingredients request");
  console.log("> Request params:", req.params);
  console.log("> Request body:", req.body);

  try {
    const { productId } = req.params;
    const { ingredients } = req.body;

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

    // Verify all mappings exist
    const ingredientIds = ingredients.map((item) => item.ingredientId);
    const existingMappings = await ProductIngredient.find({
      product: productId,
      ingredient: { $in: ingredientIds },
    }).select("ingredient");

    if (existingMappings.length !== ingredientIds.length) {
      console.log("> Some mappings not found");
      return sendResponse(
        res,
        400,
        "Invalid ingredient IDs",
        null,
        "Some ingredients are not mapped to this product"
      );
    }

    // Update sort orders
    const bulkOps = ingredients.map((item) => ({
      updateOne: {
        filter: { product: productId, ingredient: item.ingredientId },
        update: { sortOrder: item.sortOrder },
      },
    }));

    const result = await ProductIngredient.bulkWrite(bulkOps);
    console.log("> Reorder result:", result.modifiedCount);

    const responseData = { modifiedCount: result.modifiedCount };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 200, "Ingredients reordered successfully", responseData, null);
  } catch (error) {
    console.log("> Error reordering ingredients:", error.message);
    return sendResponse(res, 500, "Failed to reorder ingredients", null, error.message);
  }
};

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
export const removeIngredientMapping = async (req, res) => {
  console.log("> Remove ingredient mapping request");
  console.log("> Request params:", req.params);

  try {
    const { productId, ingredientId } = req.params;

    // Find and delete mapping
    const mapping = await ProductIngredient.findOneAndDelete({
      product: productId,
      ingredient: ingredientId,
    });

    if (!mapping) {
      console.log("> Mapping not found");
      return sendResponse(
        res,
        404,
        "Mapping not found",
        null,
        "No mapping found for this product and ingredient"
      );
    }

    console.log("> Mapping removed:", mapping._id);

    const responseData = { mapping };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 200, "Ingredient removed successfully", responseData, null);
  } catch (error) {
    console.log("> Error removing mapping:", error.message);
    return sendResponse(res, 500, "Failed to remove ingredient", null, error.message);
  }
};
