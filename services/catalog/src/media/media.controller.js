import ProductMedia from "../../models/product-media.model.js";
import Product from "../../models/product.model.js";
import ProductVariant from "../../models/product-variant.model.js";
import { storageService } from "@shared/providers";
import { sendResponse } from "@shared/utils";

/**
 * Consumer Controllers
 */

/**
 * @route GET /api/products/:productSlug/media
 * @description Get all active media for a product (consumer view)
 * @access Public
 *
 * @params
 * - productSlug: Product slug
 *
 * @example Request
 * GET /api/products/aloe-face-wash/media
 *
 * @responseBody Success (200)
 * {
 *   "message": "Product media fetched successfully",
 *   "data": {
 *     "media": [
 *       { "_id": "...", "type": "image", "url": "https://...", "altText": "Front view", "isPrimary": true, "sortOrder": 0 },
 *       { "_id": "...", "type": "image", "url": "https://...", "altText": "Side view", "isPrimary": false, "sortOrder": 1 }
 *     ]
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with slug 'xyz' not found" }
 */
export const getProductMedia = async (req, res) => {
  console.log("> Get product media request");
  console.log("> Request params:", req.params);

  try {
    const { productSlug } = req.params;

    // Find product by slug
    const product = await Product.findOne({
      slug: productSlug,
      status: "active",
      deletedAt: null,
    }).select("_id");

    if (!product) {
      console.log("> Product not found:", productSlug);
      return sendResponse(
        res,
        404,
        "Product not found",
        null,
        `Product with slug '${productSlug}' not found`
      );
    }

    // Fetch media for the product
    const media = await ProductMedia.find({
      product: product._id,
      deletedAt: null,
    })
      .select("type url altText isPrimary sortOrder variant")
      .sort({ sortOrder: 1, createdAt: 1 });

    console.log(`> Found ${media.length} media items`);

    const responseData = { media };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 200, "Product media fetched successfully", responseData, null);
  } catch (error) {
    console.log("> Error fetching product media:", error.message);
    return sendResponse(res, 500, "Failed to fetch product media", null, error.message);
  }
};

/**
 * Admin Controllers
 */

/**
 * @route GET /api/admin/products/:productId/media
 * @description List all media for a product (admin view)
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @example Request
 * GET /api/admin/products/507f1f77bcf86cd799439011/media
 *
 * @responseBody Success (200)
 * {
 *   "message": "Product media fetched successfully",
 *   "data": {
 *     "product": { "_id": "...", "name": "Aloe Face Wash", "slug": "aloe-face-wash" },
 *     "media": [
 *       {
 *         "_id": "...",
 *         "type": "image",
 *         "url": "https://...",
 *         "publicId": "products/abc123",
 *         "altText": "Front view",
 *         "isPrimary": true,
 *         "sortOrder": 0,
 *         "variant": null,
 *         "metadata": { "width": 800, "height": 600, "format": "jpg", "bytes": 12345 },
 *         "createdAt": "...",
 *         "updatedAt": "..."
 *       }
 *     ]
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
export const listProductMediaAdmin = async (req, res) => {
  console.log("> List product media admin request");
  console.log("> Request params:", req.params);

  try {
    const { productId } = req.params;

    // Find product
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

    // Fetch all media for the product
    const media = await ProductMedia.find({
      product: productId,
      deletedAt: null,
    })
      .populate("variant", "name sku")
      .sort({ sortOrder: 1, createdAt: 1 });

    console.log(`> Found ${media.length} media items`);

    const responseData = { product, media };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 200, "Product media fetched successfully", responseData, null);
  } catch (error) {
    console.log("> Error fetching product media:", error.message);
    return sendResponse(res, 500, "Failed to fetch product media", null, error.message);
  }
};

/**
 * @route POST /api/admin/products/:productId/media
 * @description Upload/add media to a product
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @requestBody
 * {
 *   "variantId": null,
 *   "type": "image",
 *   "url": "https://res.cloudinary.com/.../image.jpg",
 *   "publicId": "products/abc123",
 *   "altText": "Product front view",
 *   "isPrimary": true,
 *   "sortOrder": 0,
 *   "metadata": { "width": 800, "height": 600, "format": "jpg", "bytes": 12345 }
 * }
 *
 * @example Request
 * POST /api/admin/products/507f1f77bcf86cd799439011/media
 * Content-Type: application/json
 * { "type": "image", "url": "https://...", "isPrimary": true }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Media uploaded successfully",
 *   "data": {
 *     "media": { "_id": "...", "type": "image", "url": "https://...", "isPrimary": true, ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
export const uploadProductMedia = async (req, res) => {
  console.log("> Upload product media request");
  console.log("> Request params:", req.params);
  console.log("> Request body:", req.body);

  try {
    const { productId } = req.params;
    const { variantId, type, url, publicId, altText, isPrimary, sortOrder, metadata } = req.body;

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

    // Verify variant exists if provided
    if (variantId) {
      const variant = await ProductVariant.findOne({
        _id: variantId,
        product: productId,
        deletedAt: null,
      }).select("_id");

      if (!variant) {
        console.log("> Variant not found:", variantId);
        return sendResponse(
          res,
          404,
          "Variant not found",
          null,
          `Variant with ID '${variantId}' not found for this product`
        );
      }
    }

    // If setting as primary, unset other primary media for same product/variant combo
    if (isPrimary) {
      const updateFilter = { product: productId, deletedAt: null };
      if (variantId) {
        updateFilter.variant = variantId;
      } else {
        updateFilter.variant = null;
      }

      await ProductMedia.updateMany(updateFilter, { isPrimary: false });
      console.log("> Reset other primary media");
    }

    // Get next sort order if not provided
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined || finalSortOrder === null) {
      const lastMedia = await ProductMedia.findOne({
        product: productId,
        deletedAt: null,
      })
        .sort({ sortOrder: -1 })
        .select("sortOrder");

      finalSortOrder = lastMedia ? lastMedia.sortOrder + 1 : 0;
    }

    // Create media record
    const media = await ProductMedia.create({
      product: productId,
      variant: variantId || null,
      type,
      url,
      publicId: publicId || null,
      altText: altText || null,
      isPrimary: isPrimary || false,
      sortOrder: finalSortOrder,
      metadata: metadata || {},
    });

    console.log("> Media created:", media._id);

    const responseData = { media };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 201, "Media uploaded successfully", responseData, null);
  } catch (error) {
    console.log("> Error uploading media:", error.message);
    return sendResponse(res, 500, "Failed to upload media", null, error.message);
  }
};

/**
 * @route POST /api/admin/products/:productId/media/bulk
 * @description Bulk upload media to a product
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @requestBody
 * {
 *   "media": [
 *     { "type": "image", "url": "https://...", "publicId": "...", "altText": "Image 1", "isPrimary": true, "sortOrder": 0 },
 *     { "type": "image", "url": "https://...", "publicId": "...", "altText": "Image 2", "sortOrder": 1 }
 *   ]
 * }
 *
 * @example Request
 * POST /api/admin/products/507f1f77bcf86cd799439011/media/bulk
 * Content-Type: application/json
 * { "media": [{ "type": "image", "url": "https://..." }] }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Media uploaded successfully",
 *   "data": {
 *     "media": [{ "_id": "...", "type": "image", "url": "https://...", ... }],
 *     "count": 2
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
export const bulkUploadMedia = async (req, res) => {
  console.log("> Bulk upload media request");
  console.log("> Request params:", req.params);
  console.log("> Request body:", req.body);

  try {
    const { productId } = req.params;
    const { media: mediaItems } = req.body;

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

    // Get current max sort order
    const lastMedia = await ProductMedia.findOne({
      product: productId,
      deletedAt: null,
    })
      .sort({ sortOrder: -1 })
      .select("sortOrder");

    let nextSortOrder = lastMedia ? lastMedia.sortOrder + 1 : 0;

    // Collect all variant IDs to verify
    const variantIds = mediaItems
      .filter((item) => item.variantId)
      .map((item) => item.variantId);

    if (variantIds.length > 0) {
      const variants = await ProductVariant.find({
        _id: { $in: variantIds },
        product: productId,
        deletedAt: null,
      }).select("_id");

      const validVariantIds = new Set(variants.map((v) => v._id.toString()));

      const invalidVariants = variantIds.filter((id) => !validVariantIds.has(id));
      if (invalidVariants.length > 0) {
        console.log("> Invalid variant IDs:", invalidVariants);
        return sendResponse(
          res,
          400,
          "Invalid variant IDs",
          null,
          `Variant IDs not found: ${invalidVariants.join(", ")}`
        );
      }
    }

    // Check for primary media items - only one can be primary per variant/null combo
    const primaryItems = mediaItems.filter((item) => item.isPrimary);
    const primaryByVariant = {};
    for (const item of primaryItems) {
      const key = item.variantId || "null";
      if (primaryByVariant[key]) {
        console.log("> Multiple primary items for same variant");
        return sendResponse(
          res,
          400,
          "Invalid primary settings",
          null,
          "Only one media item can be primary per variant"
        );
      }
      primaryByVariant[key] = true;
    }

    // Unset existing primary media for variants that will have new primary
    for (const variantKey of Object.keys(primaryByVariant)) {
      const updateFilter = { product: productId, deletedAt: null };
      if (variantKey === "null") {
        updateFilter.variant = null;
      } else {
        updateFilter.variant = variantKey;
      }
      await ProductMedia.updateMany(updateFilter, { isPrimary: false });
    }

    // Prepare media documents
    const mediaDocuments = mediaItems.map((item, index) => ({
      product: productId,
      variant: item.variantId || null,
      type: item.type,
      url: item.url,
      publicId: item.publicId || null,
      altText: item.altText || null,
      isPrimary: item.isPrimary || false,
      sortOrder: item.sortOrder !== undefined ? item.sortOrder : nextSortOrder + index,
      metadata: item.metadata || {},
    }));

    // Insert all media
    const createdMedia = await ProductMedia.insertMany(mediaDocuments);
    console.log(`> Created ${createdMedia.length} media items`);

    const responseData = { media: createdMedia, count: createdMedia.length };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 201, "Media uploaded successfully", responseData, null);
  } catch (error) {
    console.log("> Error bulk uploading media:", error.message);
    return sendResponse(res, 500, "Failed to upload media", null, error.message);
  }
};

/**
 * @route PUT /api/admin/media/:id
 * @description Update media details (alt text, sort order)
 * @access Admin
 *
 * @params
 * - id: Media ObjectId
 *
 * @requestBody
 * {
 *   "altText": "Updated alt text",
 *   "sortOrder": 2
 * }
 *
 * @example Request
 * PUT /api/admin/media/507f1f77bcf86cd799439011
 * Content-Type: application/json
 * { "altText": "Product image front view" }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Media updated successfully",
 *   "data": {
 *     "media": { "_id": "...", "altText": "Updated alt text", "sortOrder": 2, ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Media not found", "data": null, "error": "Media with ID '...' not found" }
 */
export const updateMedia = async (req, res) => {
  console.log("> Update media request");
  console.log("> Request params:", req.params);
  console.log("> Request body:", req.body);

  try {
    const { id } = req.params;
    const { altText, sortOrder } = req.body;

    // Build update object
    const updateData = {};
    if (altText !== undefined) updateData.altText = altText || null;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    // Find and update media
    const media = await ProductMedia.findOneAndUpdate(
      { _id: id, deletedAt: null },
      updateData,
      { new: true }
    );

    if (!media) {
      console.log("> Media not found:", id);
      return sendResponse(res, 404, "Media not found", null, `Media with ID '${id}' not found`);
    }

    console.log("> Media updated:", media._id);

    const responseData = { media };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 200, "Media updated successfully", responseData, null);
  } catch (error) {
    console.log("> Error updating media:", error.message);
    return sendResponse(res, 500, "Failed to update media", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/media/:id/primary
 * @description Set media as primary for its product/variant
 * @access Admin
 *
 * @params
 * - id: Media ObjectId
 *
 * @example Request
 * PATCH /api/admin/media/507f1f77bcf86cd799439011/primary
 *
 * @responseBody Success (200)
 * {
 *   "message": "Primary media set successfully",
 *   "data": {
 *     "media": { "_id": "...", "isPrimary": true, ... }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Media not found", "data": null, "error": "Media with ID '...' not found" }
 */
export const setPrimaryMedia = async (req, res) => {
  console.log("> Set primary media request");
  console.log("> Request params:", req.params);

  try {
    const { id } = req.params;

    // Find the media item
    const media = await ProductMedia.findOne({ _id: id, deletedAt: null });

    if (!media) {
      console.log("> Media not found:", id);
      return sendResponse(res, 404, "Media not found", null, `Media with ID '${id}' not found`);
    }

    // Unset other primary media for same product/variant combo
    const updateFilter = {
      product: media.product,
      deletedAt: null,
      _id: { $ne: id },
    };

    if (media.variant) {
      updateFilter.variant = media.variant;
    } else {
      updateFilter.variant = null;
    }

    await ProductMedia.updateMany(updateFilter, { isPrimary: false });
    console.log("> Reset other primary media");

    // Set this media as primary
    media.isPrimary = true;
    await media.save();

    console.log("> Media set as primary:", media._id);

    const responseData = { media };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 200, "Primary media set successfully", responseData, null);
  } catch (error) {
    console.log("> Error setting primary media:", error.message);
    return sendResponse(res, 500, "Failed to set primary media", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/products/:productId/media/reorder
 * @description Reorder media for a product
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @requestBody
 * {
 *   "media": [
 *     { "id": "media1Id", "sortOrder": 0 },
 *     { "id": "media2Id", "sortOrder": 1 },
 *     { "id": "media3Id", "sortOrder": 2 }
 *   ]
 * }
 *
 * @example Request
 * PATCH /api/admin/products/507f1f77bcf86cd799439011/media/reorder
 * Content-Type: application/json
 * { "media": [{ "id": "...", "sortOrder": 0 }, { "id": "...", "sortOrder": 1 }] }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Media reordered successfully",
 *   "data": { "modifiedCount": 3 },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
export const reorderMedia = async (req, res) => {
  console.log("> Reorder media request");
  console.log("> Request params:", req.params);
  console.log("> Request body:", req.body);

  try {
    const { productId } = req.params;
    const { media: mediaItems } = req.body;

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

    // Verify all media IDs belong to this product
    const mediaIds = mediaItems.map((item) => item.id);
    const existingMedia = await ProductMedia.find({
      _id: { $in: mediaIds },
      product: productId,
      deletedAt: null,
    }).select("_id");

    if (existingMedia.length !== mediaIds.length) {
      console.log("> Some media IDs not found for this product");
      return sendResponse(
        res,
        400,
        "Invalid media IDs",
        null,
        "Some media items do not belong to this product"
      );
    }

    // Update sort orders
    const bulkOps = mediaItems.map((item) => ({
      updateOne: {
        filter: { _id: item.id, product: productId },
        update: { sortOrder: item.sortOrder },
      },
    }));

    const result = await ProductMedia.bulkWrite(bulkOps);
    console.log("> Reorder result:", result.modifiedCount);

    const responseData = { modifiedCount: result.modifiedCount };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 200, "Media reordered successfully", responseData, null);
  } catch (error) {
    console.log("> Error reordering media:", error.message);
    return sendResponse(res, 500, "Failed to reorder media", null, error.message);
  }
};

/**
 * @route DELETE /api/admin/media/:id
 * @description Soft delete media and optionally remove from cloud storage
 * @access Admin
 *
 * @params
 * - id: Media ObjectId
 *
 * @query
 * - deleteFromCloud: boolean (default: false) - Also delete from Cloudinary
 *
 * @example Request
 * DELETE /api/admin/media/507f1f77bcf86cd799439011?deleteFromCloud=true
 *
 * @responseBody Success (200)
 * {
 *   "message": "Media deleted successfully",
 *   "data": {
 *     "media": { "_id": "...", "deletedAt": "2024-01-01T00:00:00.000Z", ... },
 *     "cloudDeleted": true
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Media not found", "data": null, "error": "Media with ID '...' not found" }
 */
export const deleteMedia = async (req, res) => {
  console.log("> Delete media request");
  console.log("> Request params:", req.params);
  console.log("> Request query:", req.query);

  try {
    const { id } = req.params;
    const deleteFromCloud = req.query.deleteFromCloud === "true";

    // Find the media item
    const media = await ProductMedia.findOne({ _id: id, deletedAt: null });

    if (!media) {
      console.log("> Media not found:", id);
      return sendResponse(res, 404, "Media not found", null, `Media with ID '${id}' not found`);
    }

    let cloudDeleted = false;

    // Delete from cloud storage if requested and publicId exists
    if (deleteFromCloud && media.publicId) {
      try {
        const resourceType = media.type === "video" ? "video" : "image";
        await storageService.deleteFile(media.publicId, resourceType);
        cloudDeleted = true;
        console.log("> Deleted from cloud:", media.publicId);
      } catch (cloudError) {
        console.log("> Cloud delete error:", cloudError.message);
        // Continue with soft delete even if cloud delete fails
      }
    }

    // Soft delete the media record
    media.deletedAt = new Date();
    await media.save();

    console.log("> Media soft deleted:", media._id);

    const responseData = { media, cloudDeleted };
    console.log("> Response:", JSON.stringify(responseData, null, 2));
    return sendResponse(res, 200, "Media deleted successfully", responseData, null);
  } catch (error) {
    console.log("> Error deleting media:", error.message);
    return sendResponse(res, 500, "Failed to delete media", null, error.message);
  }
};
