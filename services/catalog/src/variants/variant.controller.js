import ProductVariant from "../../models/product-variant.model.js";
import Product from "../../models/product.model.js";
import { sendResponse } from "@shared/utils";
import * as pricingService from "../../services/pricing-integration.service.js";
import * as inventoryService from "../../services/inventory-integration.service.js";

/**
 * Calculate discount percent from MRP and sale price
 * @param {number} mrp - Maximum retail price
 * @param {number} salePrice - Sale price
 * @returns {number} Discount percentage
 */
const calculateDiscountPercent = (mrp, salePrice) => {
  if (!salePrice || salePrice >= mrp) return 0;
  return Math.round(((mrp - salePrice) / mrp) * 100);
};

/**
 * @route GET /api/products/:productSlug/variants
 * @description List active variants for a product (consumer)
 * @access Public
 *
 * @params
 * - productSlug: Product slug
 *
 * @responseBody Success (200)
 * {
 *   "message": "Variants fetched successfully",
 *   "data": {
 *     "variants": [
 *       { "_id": "...", "name": "50ml", "sku": "ALO-FW-50", "variantType": "size", "mrp": 299, "salePrice": 249, "discountPercent": 17, "weight": 50, "isDefault": true, "sortOrder": 0 }
 *     ]
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with slug 'xyz' not found" }
 */
export const listProductVariants = async (req, res) => {
  const { productSlug } = req.params;
  console.log(`> GET /api/products/${productSlug}/variants`);

  try {
    const product = await Product.findOne({
      slug: productSlug,
      status: "active",
      deletedAt: null,
    })
      .select("_id name")
      .lean();

    if (!product) {
      console.log(`> Product not found: ${productSlug}`);
      return sendResponse(res, 404, "Product not found", null, `Product with slug '${productSlug}' not found`);
    }

    const variants = await ProductVariant.find({
      product: product._id,
      isActive: true,
      deletedAt: null,
    })
      .select("name sku variantType mrp salePrice discountPercent weight isDefault sortOrder")
      .sort({ sortOrder: 1 })
      .lean();

    console.log(`> Found ${variants.length} variants for ${product.name}`);
    return sendResponse(res, 200, "Variants fetched successfully", { variants }, null);
  } catch (error) {
    console.log("> Error fetching variants:", error.message);
    return sendResponse(res, 500, "Failed to fetch variants", null, error.message);
  }
};

/**
 * @route GET /api/variants/:id
 * @description Get variant detail (consumer)
 * @access Public
 *
 * @params
 * - id: Variant ObjectId
 *
 * @responseBody Success (200)
 * {
 *   "message": "Variant fetched successfully",
 *   "data": {
 *     "variant": { "_id": "...", "name": "50ml", "sku": "ALO-FW-50", "variantType": "size", "mrp": 299, "salePrice": 249, "discountPercent": 17, "weight": 50, "isDefault": true }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Variant not found", "data": null, "error": "Variant with ID '...' not found" }
 */
export const getVariantById = async (req, res) => {
  const { id } = req.params;
  console.log(`> GET /api/variants/${id}`);

  try {
    const variant = await ProductVariant.findOne({
      _id: id,
      isActive: true,
      deletedAt: null,
    })
      .select("name sku variantType mrp salePrice discountPercent weight isDefault sortOrder")
      .populate({
        path: "product",
        match: { status: "active", deletedAt: null },
        select: "name slug",
      })
      .lean();

    if (!variant || !variant.product) {
      console.log(`> Variant not found: ${id}`);
      return sendResponse(res, 404, "Variant not found", null, `Variant with ID '${id}' not found`);
    }

    console.log(`> Variant found: ${variant.name}`);
    return sendResponse(res, 200, "Variant fetched successfully", { variant }, null);
  } catch (error) {
    console.log("> Error fetching variant:", error.message);
    return sendResponse(res, 500, "Failed to fetch variant", null, error.message);
  }
};

/**
 * @route GET /api/admin/products/:productId/variants
 * @description List all variants for a product (admin)
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @responseBody Success (200)
 * {
 *   "message": "Variants fetched successfully",
 *   "data": {
 *     "product": { "_id": "...", "name": "...", "slug": "..." },
 *     "variants": [
 *       { "_id": "...", "name": "50ml", "sku": "ALO-FW-50", "barcode": "...", "variantType": "size", "mrp": 299, "salePrice": 249, "costPrice": 150, "discountPercent": 17, "weight": 50, "isDefault": true, "isActive": true, "sortOrder": 0, "createdAt": "...", "updatedAt": "..." }
 *     ]
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
export const listProductVariantsAdmin = async (req, res) => {
  const { productId } = req.params;
  console.log(`> GET /api/admin/products/${productId}/variants`);

  try {
    const product = await Product.findOne({
      _id: productId,
      deletedAt: null,
    })
      .select("_id name slug")
      .lean();

    if (!product) {
      console.log(`> Product not found: ${productId}`);
      return sendResponse(res, 404, "Product not found", null, `Product with ID '${productId}' not found`);
    }

    const variants = await ProductVariant.find({
      product: productId,
      deletedAt: null,
    })
      .sort({ sortOrder: 1 })
      .lean();

    console.log(`> Found ${variants.length} variants for ${product.name}`);
    return sendResponse(res, 200, "Variants fetched successfully", { product, variants }, null);
  } catch (error) {
    console.log("> Error fetching variants:", error.message);
    return sendResponse(res, 500, "Failed to fetch variants", null, error.message);
  }
};

/**
 * @route POST /api/admin/products/:productId/variants
 * @description Add a variant to a product (admin)
 * @access Admin
 *
 * @params
 * - productId: Product ObjectId
 *
 * @requestBody
 * {
 *   "name": "50ml",
 *   "sku": "ALO-FW-50",
 *   "barcode": "1234567890123",
 *   "variantType": "size",
 *   "mrp": 299,
 *   "salePrice": 249,
 *   "costPrice": 150,
 *   "weight": 50,
 *   "isDefault": true,
 *   "isActive": true,
 *   "sortOrder": 0
 * }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Variant created successfully",
 *   "data": { "variant": { "_id": "...", "name": "50ml", "sku": "ALO-FW-50", ... } },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 *
 * @responseBody Error (409)
 * { "message": "SKU already exists", "data": null, "error": "A variant with SKU 'ALO-FW-50' already exists" }
 */
export const addVariant = async (req, res) => {
  const { productId } = req.params;
  console.log(`> POST /api/admin/products/${productId}/variants`);
  console.log("> Body:", req.body);

  try {
    const product = await Product.findOne({
      _id: productId,
      deletedAt: null,
    });

    if (!product) {
      console.log(`> Product not found: ${productId}`);
      return sendResponse(res, 404, "Product not found", null, `Product with ID '${productId}' not found`);
    }

    const { name, sku, barcode, variantType, mrp, salePrice, costPrice, weight, isDefault, isActive, sortOrder } = req.body;

    const existingSku = await ProductVariant.findOne({
      sku: { $regex: `^${sku}$`, $options: "i" },
      deletedAt: null,
    });

    if (existingSku) {
      console.log(`> SKU already exists: ${sku}`);
      return sendResponse(res, 409, "SKU already exists", null, `A variant with SKU '${sku}' already exists`);
    }

    const discountPercent = calculateDiscountPercent(mrp, salePrice);

    if (isDefault) {
      await ProductVariant.updateMany(
        { product: productId, deletedAt: null },
        { isDefault: false }
      );
    }

    const variant = new ProductVariant({
      product: productId,
      name,
      sku,
      barcode: barcode || null,
      variantType: variantType || null,
      mrp,
      salePrice: salePrice || null,
      costPrice: costPrice || null,
      discountPercent,
      weight: weight || null,
      isDefault: isDefault || false,
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder !== undefined ? sortOrder : 0,
    });

    await variant.save();

    console.log(`> Variant created: ${variant.name} (${variant._id})`);

    // Create pricing record (non-blocking)
    pricingService.createPricingRecord(
      variant._id.toString(),
      productId,
      mrp,
      salePrice,
      new Date()
    )
      .then((result) => {
        if (result.success) {
          console.log(`> Pricing record created for variant ${variant._id}`);
        } else {
          console.log(`> Warning: Pricing record creation failed (non-blocking): ${result.error}`);
        }
      })
      .catch((error) => {
        console.log(`> Warning: Pricing service call failed (non-blocking): ${error.message}`);
      });

    // Create inventory record (non-blocking)
    inventoryService.createInventoryRecord(productId, variant._id.toString(), variant.sku, null, 0, 10)
      .then((result) => {
        if (result.success) {
          console.log(`> Inventory record created for variant ${variant._id}`);
        } else {
          console.log(`> Warning: Inventory record creation failed (non-blocking): ${result.error}`);
        }
      })
      .catch((error) => {
        console.log(`> Warning: Inventory service call failed (non-blocking): ${error.message}`);
      });

    return sendResponse(res, 201, "Variant created successfully", { variant }, null);
  } catch (error) {
    console.log("> Error creating variant:", error.message);
    return sendResponse(res, 500, "Failed to create variant", null, error.message);
  }
};

/**
 * @route GET /api/admin/variants/:id
 * @description Get variant by ID (admin)
 * @access Admin
 *
 * @params
 * - id: Variant ObjectId
 *
 * @responseBody Success (200)
 * {
 *   "message": "Variant fetched successfully",
 *   "data": { "variant": { "_id": "...", "name": "50ml", "sku": "...", "product": { "_id": "...", "name": "...", "slug": "..." }, ... } },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Variant not found", "data": null, "error": "Variant with ID '...' not found" }
 */
export const getVariantByIdAdmin = async (req, res) => {
  const { id } = req.params;
  console.log(`> GET /api/admin/variants/${id}`);

  try {
    const variant = await ProductVariant.findOne({
      _id: id,
      deletedAt: null,
    })
      .populate("product", "name slug status")
      .lean();

    if (!variant) {
      console.log(`> Variant not found: ${id}`);
      return sendResponse(res, 404, "Variant not found", null, `Variant with ID '${id}' not found`);
    }

    console.log(`> Variant found: ${variant.name}`);
    return sendResponse(res, 200, "Variant fetched successfully", { variant }, null);
  } catch (error) {
    console.log("> Error fetching variant:", error.message);
    return sendResponse(res, 500, "Failed to fetch variant", null, error.message);
  }
};

/**
 * @route PUT /api/admin/variants/:id
 * @description Update variant (admin)
 * @access Admin
 *
 * @params
 * - id: Variant ObjectId
 *
 * @requestBody
 * {
 *   "name": "100ml",
 *   "sku": "ALO-FW-100",
 *   "mrp": 499,
 *   "salePrice": 399,
 *   ...
 * }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Variant updated successfully",
 *   "data": { "variant": { "_id": "...", "name": "100ml", ... } },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Variant not found", "data": null, "error": "Variant with ID '...' not found" }
 *
 * @responseBody Error (409)
 * { "message": "SKU already exists", "data": null, "error": "A variant with SKU '...' already exists" }
 */
export const updateVariant = async (req, res) => {
  const { id } = req.params;
  console.log(`> PUT /api/admin/variants/${id}`);
  console.log("> Body:", req.body);

  try {
    const variant = await ProductVariant.findOne({
      _id: id,
      deletedAt: null,
    });

    if (!variant) {
      console.log(`> Variant not found: ${id}`);
      return sendResponse(res, 404, "Variant not found", null, `Variant with ID '${id}' not found`);
    }

    const { name, sku, barcode, variantType, mrp, salePrice, costPrice, weight, isDefault, isActive, sortOrder } = req.body;

    if (sku && sku !== variant.sku) {
      const existingSku = await ProductVariant.findOne({
        sku: { $regex: `^${sku}$`, $options: "i" },
        _id: { $ne: id },
        deletedAt: null,
      });

      if (existingSku) {
        console.log(`> SKU already exists: ${sku}`);
        return sendResponse(res, 409, "SKU already exists", null, `A variant with SKU '${sku}' already exists`);
      }

      variant.sku = sku;
    }

    if (name !== undefined) variant.name = name;
    if (barcode !== undefined) variant.barcode = barcode;
    if (variantType !== undefined) variant.variantType = variantType;
    if (mrp !== undefined) variant.mrp = mrp;
    if (salePrice !== undefined) variant.salePrice = salePrice;
    if (costPrice !== undefined) variant.costPrice = costPrice;
    if (weight !== undefined) variant.weight = weight;
    if (sortOrder !== undefined) variant.sortOrder = sortOrder;
    if (isActive !== undefined) variant.isActive = isActive;

    variant.discountPercent = calculateDiscountPercent(variant.mrp, variant.salePrice);

    if (isDefault === true) {
      await ProductVariant.updateMany(
        { product: variant.product, _id: { $ne: id }, deletedAt: null },
        { isDefault: false }
      );
      variant.isDefault = true;
    } else if (isDefault === false) {
      variant.isDefault = false;
    }

    await variant.save();

    console.log(`> Variant updated: ${variant.name}`);
    return sendResponse(res, 200, "Variant updated successfully", { variant }, null);
  } catch (error) {
    console.log("> Error updating variant:", error.message);
    return sendResponse(res, 500, "Failed to update variant", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/variants/:id/status
 * @description Toggle variant active status (admin)
 * @access Admin
 *
 * @params
 * - id: Variant ObjectId
 *
 * @requestBody
 * { "isActive": false }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Variant status updated successfully",
 *   "data": { "variant": { "_id": "...", "name": "...", "isActive": false, ... } },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Variant not found", "data": null, "error": "Variant with ID '...' not found" }
 */
export const toggleVariantStatus = async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  console.log(`> PATCH /api/admin/variants/${id}/status`);
  console.log("> Body:", req.body);

  try {
    const variant = await ProductVariant.findOne({
      _id: id,
      deletedAt: null,
    });

    if (!variant) {
      console.log(`> Variant not found: ${id}`);
      return sendResponse(res, 404, "Variant not found", null, `Variant with ID '${id}' not found`);
    }

    variant.isActive = isActive;
    await variant.save();

    console.log(`> Variant status updated: ${variant.name} -> isActive: ${isActive}`);
    return sendResponse(res, 200, "Variant status updated successfully", { variant }, null);
  } catch (error) {
    console.log("> Error updating variant status:", error.message);
    return sendResponse(res, 500, "Failed to update variant status", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/variants/reorder
 * @description Reorder variants for a product (admin)
 * @access Admin
 *
 * @requestBody
 * {
 *   "productId": "507f1f77bcf86cd799439011",
 *   "variants": [
 *     { "id": "variant1Id", "sortOrder": 0 },
 *     { "id": "variant2Id", "sortOrder": 1 },
 *     { "id": "variant3Id", "sortOrder": 2 }
 *   ]
 * }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Variants reordered successfully",
 *   "data": { "modifiedCount": 3 },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
export const reorderVariants = async (req, res) => {
  console.log("> PATCH /api/admin/variants/reorder");
  console.log("> Body:", req.body);

  try {
    const { productId, variants } = req.body;

    const product = await Product.findOne({
      _id: productId,
      deletedAt: null,
    });

    if (!product) {
      console.log(`> Product not found: ${productId}`);
      return sendResponse(res, 404, "Product not found", null, `Product with ID '${productId}' not found`);
    }

    const bulkOps = variants.map((v) => ({
      updateOne: {
        filter: { _id: v.id, product: productId, deletedAt: null },
        update: { sortOrder: v.sortOrder },
      },
    }));

    const result = await ProductVariant.bulkWrite(bulkOps);

    console.log(`> Reordered ${result.modifiedCount} variants`);
    return sendResponse(res, 200, "Variants reordered successfully", { modifiedCount: result.modifiedCount }, null);
  } catch (error) {
    console.log("> Error reordering variants:", error.message);
    return sendResponse(res, 500, "Failed to reorder variants", null, error.message);
  }
};

/**
 * @route DELETE /api/admin/variants/:id
 * @description Soft delete variant (admin)
 * @access Admin
 *
 * @params
 * - id: Variant ObjectId
 *
 * @responseBody Success (200)
 * {
 *   "message": "Variant deleted successfully",
 *   "data": { "variant": { "_id": "...", "name": "...", "deletedAt": "2024-01-01T00:00:00Z", ... } },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Variant not found", "data": null, "error": "Variant with ID '...' not found" }
 *
 * @responseBody Error (400)
 * { "message": "Cannot delete variant", "data": null, "error": "Cannot delete the only active variant" }
 */
export const deleteVariant = async (req, res) => {
  const { id } = req.params;
  console.log(`> DELETE /api/admin/variants/${id}`);

  try {
    const variant = await ProductVariant.findOne({
      _id: id,
      deletedAt: null,
    });

    if (!variant) {
      console.log(`> Variant not found: ${id}`);
      return sendResponse(res, 404, "Variant not found", null, `Variant with ID '${id}' not found`);
    }

    const activeVariantCount = await ProductVariant.countDocuments({
      product: variant.product,
      isActive: true,
      deletedAt: null,
    });

    if (activeVariantCount === 1 && variant.isActive) {
      console.log("> Cannot delete the only active variant");
      return sendResponse(res, 400, "Cannot delete variant", null, "Cannot delete the only active variant");
    }

    variant.deletedAt = new Date();
    variant.isActive = false;
    await variant.save();

    console.log(`> Variant deleted: ${variant.name}`);
    return sendResponse(res, 200, "Variant deleted successfully", { variant }, null);
  } catch (error) {
    console.log("> Error deleting variant:", error.message);
    return sendResponse(res, 500, "Failed to delete variant", null, error.message);
  }
};

export default {
  listProductVariants,
  getVariantById,
  listProductVariantsAdmin,
  addVariant,
  getVariantByIdAdmin,
  updateVariant,
  toggleVariantStatus,
  reorderVariants,
  deleteVariant,
};
