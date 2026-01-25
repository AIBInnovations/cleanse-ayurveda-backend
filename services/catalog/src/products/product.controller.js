import Product from "../../models/product.model.js";
import ProductVariant from "../../models/product-variant.model.js";
import ProductMedia from "../../models/product-media.model.js";
import ProductIngredient from "../../models/product-ingredient.model.js";
import ProductCategory from "../../models/product-category.model.js";
import RelatedProduct from "../../models/related-product.model.js";
import Category from "../../models/category.model.js";
import Brand from "../../models/brand.model.js";
import Bundle from "../../models/bundle.model.js";
import BundleItem from "../../models/bundle-item.model.js";
import { sendResponse } from "@shared/utils";
import { generateSlug, generateUniqueSlug } from "../../services/slug.service.js";
import { parsePagination, buildPaginationMeta } from "../../services/pagination.service.js";
import { buildSortQuery } from "../../services/query.service.js";
import * as inventoryService from "../../services/inventory-integration.service.js";

/**
 * Get product IDs by category slug (includes subcategories)
 * @param {string} categorySlug - Category slug
 * @returns {Promise<Array>} Array of product IDs
 */
const getProductIdsByCategory = async (categorySlug) => {
  const category = await Category.findOne({
    slug: categorySlug,
    isActive: true,
    deletedAt: null,
  }).lean();

  if (!category) return [];

  const categoryIds = [category._id];

  const subcategories = await Category.find({
    path: { $regex: `^${category.path}/` },
    isActive: true,
    deletedAt: null,
  })
    .select("_id")
    .lean();

  categoryIds.push(...subcategories.map((c) => c._id));

  const productCategories = await ProductCategory.find({
    category: { $in: categoryIds },
  })
    .select("product")
    .lean();

  return [...new Set(productCategories.map((pc) => pc.product.toString()))];
};

/**
 * @route GET /api/products
 * @description List products with filters (consumer PLP)
 * @access Public
 *
 * @queryParams
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 50)
 * - search: Search term
 * - category: Category slug
 * - brand: Brand ID
 * - minPrice, maxPrice: Price range filter
 * - skinType: Skin type filter (single or array)
 * - concerns: Concerns filter (single or array)
 * - tags: Tags filter (single or array)
 * - isFeatured, isBestseller, isNewArrival: Boolean flags
 * - sortBy: Sort field (name, createdAt, price)
 * - order: Sort order (asc, desc)
 *
 * @responseBody Success (200)
 * {
 *   "message": "Products fetched successfully",
 *   "data": {
 *     "products": [...],
 *     "pagination": { "total": 100, "page": 1, "limit": 20, "totalPages": 5, "hasNextPage": true, "hasPrevPage": false }
 *   },
 *   "error": null
 * }
 */
export const listProducts = async (req, res) => {
  console.log("> GET /api/products");
  console.log("> Query:", req.query);

  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { status: "active", deletedAt: null };

    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    if (req.query.category) {
      const productIds = await getProductIdsByCategory(req.query.category);
      if (productIds.length === 0) {
        return sendResponse(res, 200, "Products fetched successfully", {
          products: [],
          pagination: buildPaginationMeta(0, page, limit),
        }, null);
      }
      filter._id = { $in: productIds };
    }

    if (req.query.brand) {
      filter.brand = req.query.brand;
    }

    if (req.query.skinType) {
      const skinTypes = Array.isArray(req.query.skinType)
        ? req.query.skinType
        : [req.query.skinType];
      filter["attributes.skinType"] = { $in: skinTypes };
    }

    if (req.query.concerns) {
      const concerns = Array.isArray(req.query.concerns)
        ? req.query.concerns
        : [req.query.concerns];
      filter["attributes.concerns"] = { $in: concerns };
    }

    if (req.query.tags) {
      const tags = Array.isArray(req.query.tags)
        ? req.query.tags
        : [req.query.tags];
      filter.tags = { $in: tags };
    }

    if (req.query.isFeatured === "true") filter.isFeatured = true;
    if (req.query.isBestseller === "true") filter.isBestseller = true;
    if (req.query.isNewArrival === "true") filter.isNewArrival = true;

    const sortOptions = buildSortQuery(
      req.query,
      { name: "name", createdAt: "createdAt" },
      "createdAt",
      "desc"
    );

    const [products, total] = await Promise.all([
      Product.find(filter)
        .select("name slug shortDescription tags isFeatured isBestseller isNewArrival brand attributes")
        .populate("brand", "name slug")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    const productIds = products.map((p) => p._id);

    const [primaryMedia, defaultVariants] = await Promise.all([
      ProductMedia.find({
        product: { $in: productIds },
        isPrimary: true,
        deletedAt: null,
      })
        .select("product url altText")
        .lean(),
      ProductVariant.find({
        product: { $in: productIds },
        isDefault: true,
        isActive: true,
        deletedAt: null,
      })
        .select("product mrp salePrice discountPercent")
        .lean(),
    ]);

    const mediaMap = new Map(primaryMedia.map((m) => [m.product.toString(), m]));
    const variantMap = new Map(defaultVariants.map((v) => [v.product.toString(), v]));

    const enrichedProducts = products.map((product) => {
      const media = mediaMap.get(product._id.toString());
      const variant = variantMap.get(product._id.toString());

      return {
        ...product,
        primaryImage: media ? { url: media.url, altText: media.altText } : null,
        pricing: variant
          ? {
              mrp: variant.mrp,
              salePrice: variant.salePrice,
              discountPercent: variant.discountPercent,
            }
          : null,
      };
    });

    const pagination = buildPaginationMeta(total, page, limit);

    console.log(`> Found ${products.length} of ${total} products`);
    return sendResponse(res, 200, "Products fetched successfully", {
      products: enrichedProducts,
      pagination,
    }, null);
  } catch (error) {
    console.log("> Error fetching products:", error.message);
    return sendResponse(res, 500, "Failed to fetch products", null, error.message);
  }
};

/**
 * @route GET /api/products/:slug
 * @description Get product detail (consumer PDP)
 * @access Public
 *
 * @params
 * - slug: Product slug
 *
 * @responseBody Success (200)
 * {
 *   "message": "Product fetched successfully",
 *   "data": {
 *     "product": {
 *       "_id": "...",
 *       "name": "Aloe Face Wash",
 *       "slug": "aloe-face-wash",
 *       "description": "...",
 *       "shortDescription": "...",
 *       "benefits": [...],
 *       "howToUse": "...",
 *       "brand": { "_id": "...", "name": "...", "slug": "..." },
 *       "productType": "simple",
 *       "tags": [...],
 *       "attributes": { "skinType": [...], "concerns": [...] },
 *       "seo": {...},
 *       "ratingSummary": { "average": 4.5, "count": 120 },
 *       "primaryImage": { "url": "...", "altText": "..." },
 *       "pricing": { "mrp": 499, "salePrice": 399, "discountPercent": 20 },
 *       "categories": [...]
 *     }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with slug 'xyz' not found" }
 */
export const getProductBySlug = async (req, res) => {
  const { slug } = req.params;
  console.log(`> GET /api/products/${slug}`);

  try {
    const product = await Product.findOne({
      slug,
      status: "active",
      deletedAt: null,
    })
      .populate("brand", "name slug logo")
      .lean();

    if (!product) {
      console.log(`> Product not found: ${slug}`);
      return sendResponse(res, 404, "Product not found", null, `Product with slug '${slug}' not found`);
    }

    const [primaryMedia, defaultVariant, categories, bundleItems] = await Promise.all([
      ProductMedia.findOne({
        product: product._id,
        isPrimary: true,
        deletedAt: null,
      })
        .select("url altText")
        .lean(),
      ProductVariant.findOne({
        product: product._id,
        isDefault: true,
        isActive: true,
        deletedAt: null,
      })
        .select("mrp salePrice discountPercent")
        .lean(),
      ProductCategory.find({ product: product._id })
        .populate("category", "name slug")
        .select("category isPrimary")
        .lean(),
      BundleItem.find({ product: product._id })
        .select("bundle")
        .lean(),
    ]);

    // Fetch active bundles if product is in any bundles
    let bundles = [];
    if (bundleItems.length > 0) {
      const now = new Date();
      const bundleIds = bundleItems.map((item) => item.bundle);

      bundles = await Bundle.find({
        _id: { $in: bundleIds },
        isActive: true,
        deletedAt: null,
        $or: [{ validFrom: null }, { validFrom: { $lte: now } }],
      })
        .where({
          $or: [{ validTo: null }, { validTo: { $gte: now } }],
        })
        .select("name slug description image originalPrice finalPrice savings validTo")
        .lean();
    }

    const enrichedProduct = {
      ...product,
      primaryImage: primaryMedia ? { url: primaryMedia.url, altText: primaryMedia.altText } : null,
      pricing: defaultVariant
        ? {
            mrp: defaultVariant.mrp,
            salePrice: defaultVariant.salePrice,
            discountPercent: defaultVariant.discountPercent,
          }
        : null,
      categories: categories.map((pc) => ({
        ...pc.category,
        isPrimary: pc.isPrimary,
      })),
      bundles,
    };

    console.log(`> Product found: ${product.name}, bundles: ${bundles.length}`);
    return sendResponse(res, 200, "Product fetched successfully", { product: enrichedProduct }, null);
  } catch (error) {
    console.log("> Error fetching product:", error.message);
    return sendResponse(res, 500, "Failed to fetch product", null, error.message);
  }
};

/**
 * @route GET /api/products/:slug/variants
 * @description Get product variants (consumer)
 * @access Public
 *
 * @params
 * - slug: Product slug
 *
 * @responseBody Success (200)
 * {
 *   "message": "Variants fetched successfully",
 *   "data": {
 *     "variants": [
 *       { "_id": "...", "name": "50ml", "sku": "ALO-FW-50", "mrp": 299, "salePrice": 249, "discountPercent": 17, "weight": 50, "isDefault": true }
 *     ]
 *   },
 *   "error": null
 * }
 */
export const getProductVariants = async (req, res) => {
  const { slug } = req.params;
  console.log(`> GET /api/products/${slug}/variants`);

  try {
    const product = await Product.findOne({
      slug,
      status: "active",
      deletedAt: null,
    })
      .select("_id name")
      .lean();

    if (!product) {
      console.log(`> Product not found: ${slug}`);
      return sendResponse(res, 404, "Product not found", null, `Product with slug '${slug}' not found`);
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
 * @route GET /api/products/:slug/media
 * @description Get product media (consumer)
 * @access Public
 *
 * @params
 * - slug: Product slug
 *
 * @responseBody Success (200)
 * {
 *   "message": "Media fetched successfully",
 *   "data": {
 *     "media": [
 *       { "_id": "...", "type": "image", "url": "...", "altText": "...", "isPrimary": true, "sortOrder": 0 }
 *     ]
 *   },
 *   "error": null
 * }
 */
export const getProductMedia = async (req, res) => {
  const { slug } = req.params;
  console.log(`> GET /api/products/${slug}/media`);

  try {
    const product = await Product.findOne({
      slug,
      status: "active",
      deletedAt: null,
    })
      .select("_id name")
      .lean();

    if (!product) {
      console.log(`> Product not found: ${slug}`);
      return sendResponse(res, 404, "Product not found", null, `Product with slug '${slug}' not found`);
    }

    const media = await ProductMedia.find({
      product: product._id,
      deletedAt: null,
    })
      .select("type url altText isPrimary sortOrder variant metadata")
      .populate("variant", "name sku")
      .sort({ isPrimary: -1, sortOrder: 1 })
      .lean();

    console.log(`> Found ${media.length} media items for ${product.name}`);
    return sendResponse(res, 200, "Media fetched successfully", { media }, null);
  } catch (error) {
    console.log("> Error fetching media:", error.message);
    return sendResponse(res, 500, "Failed to fetch media", null, error.message);
  }
};

/**
 * @route GET /api/products/:slug/ingredients
 * @description Get product ingredients (consumer)
 * @access Public
 *
 * @params
 * - slug: Product slug
 *
 * @responseBody Success (200)
 * {
 *   "message": "Ingredients fetched successfully",
 *   "data": {
 *     "ingredients": [
 *       { "_id": "...", "ingredient": { "_id": "...", "name": "Aloe Vera", "slug": "aloe-vera", "benefits": [...] }, "percentage": 20, "isKeyIngredient": true }
 *     ]
 *   },
 *   "error": null
 * }
 */
export const getProductIngredients = async (req, res) => {
  const { slug } = req.params;
  console.log(`> GET /api/products/${slug}/ingredients`);

  try {
    const product = await Product.findOne({
      slug,
      status: "active",
      deletedAt: null,
    })
      .select("_id name")
      .lean();

    if (!product) {
      console.log(`> Product not found: ${slug}`);
      return sendResponse(res, 404, "Product not found", null, `Product with slug '${slug}' not found`);
    }

    const ingredients = await ProductIngredient.find({ product: product._id })
      .populate("ingredient", "name slug benefits image")
      .select("ingredient percentage isKeyIngredient sortOrder")
      .sort({ isKeyIngredient: -1, sortOrder: 1 })
      .lean();

    console.log(`> Found ${ingredients.length} ingredients for ${product.name}`);
    return sendResponse(res, 200, "Ingredients fetched successfully", { ingredients }, null);
  } catch (error) {
    console.log("> Error fetching ingredients:", error.message);
    return sendResponse(res, 500, "Failed to fetch ingredients", null, error.message);
  }
};

/**
 * @route GET /api/products/:slug/related
 * @description Get related products (consumer)
 * @access Public
 *
 * @params
 * - slug: Product slug
 *
 * @queryParams
 * - type: Relation type (crossSell, upSell, frequentlyBoughtTogether)
 * - limit: Max results (default: 10, max: 20)
 *
 * @responseBody Success (200)
 * {
 *   "message": "Related products fetched successfully",
 *   "data": {
 *     "related": {
 *       "crossSell": [...],
 *       "upSell": [...],
 *       "frequentlyBoughtTogether": [...]
 *     }
 *   },
 *   "error": null
 * }
 */
export const getProductRelated = async (req, res) => {
  const { slug } = req.params;
  const { type, limit = 10 } = req.query;
  console.log(`> GET /api/products/${slug}/related`);
  console.log("> Query:", req.query);

  try {
    const product = await Product.findOne({
      slug,
      status: "active",
      deletedAt: null,
    })
      .select("_id name")
      .lean();

    if (!product) {
      console.log(`> Product not found: ${slug}`);
      return sendResponse(res, 404, "Product not found", null, `Product with slug '${slug}' not found`);
    }

    const filter = { product: product._id };
    if (type) {
      filter.relationType = type;
    }

    const relatedProducts = await RelatedProduct.find(filter)
      .populate({
        path: "relatedProduct",
        match: { status: "active", deletedAt: null },
        select: "name slug shortDescription isFeatured isBestseller isNewArrival",
        populate: { path: "brand", select: "name slug" },
      })
      .sort({ relationType: 1, sortOrder: 1 })
      .limit(parseInt(limit, 10))
      .lean();

    const validRelated = relatedProducts.filter((rp) => rp.relatedProduct);

    const relatedIds = validRelated.map((rp) => rp.relatedProduct._id);
    const [primaryMedia, defaultVariants] = await Promise.all([
      ProductMedia.find({
        product: { $in: relatedIds },
        isPrimary: true,
        deletedAt: null,
      })
        .select("product url altText")
        .lean(),
      ProductVariant.find({
        product: { $in: relatedIds },
        isDefault: true,
        isActive: true,
        deletedAt: null,
      })
        .select("product mrp salePrice discountPercent")
        .lean(),
    ]);

    const mediaMap = new Map(primaryMedia.map((m) => [m.product.toString(), m]));
    const variantMap = new Map(defaultVariants.map((v) => [v.product.toString(), v]));

    const grouped = {
      crossSell: [],
      upSell: [],
      frequentlyBoughtTogether: [],
    };

    validRelated.forEach((rp) => {
      const productId = rp.relatedProduct._id.toString();
      const media = mediaMap.get(productId);
      const variant = variantMap.get(productId);

      const enrichedProduct = {
        ...rp.relatedProduct,
        primaryImage: media ? { url: media.url, altText: media.altText } : null,
        pricing: variant
          ? {
              mrp: variant.mrp,
              salePrice: variant.salePrice,
              discountPercent: variant.discountPercent,
            }
          : null,
      };

      grouped[rp.relationType].push(enrichedProduct);
    });

    console.log(`> Found related products for ${product.name}: crossSell=${grouped.crossSell.length}, upSell=${grouped.upSell.length}, fbt=${grouped.frequentlyBoughtTogether.length}`);
    return sendResponse(res, 200, "Related products fetched successfully", { related: grouped }, null);
  } catch (error) {
    console.log("> Error fetching related products:", error.message);
    return sendResponse(res, 500, "Failed to fetch related products", null, error.message);
  }
};

/**
 * @route GET /api/admin/products
 * @description List all products with filters (admin)
 * @access Admin
 *
 * @queryParams
 * - page, limit, search, status, productType, brand, category
 * - isFeatured, isBestseller, isNewArrival
 * - sortBy, order
 *
 * @responseBody Success (200)
 * {
 *   "message": "Products fetched successfully",
 *   "data": {
 *     "products": [...],
 *     "pagination": { ... }
 *   },
 *   "error": null
 * }
 */
export const listAllProducts = async (req, res) => {
  console.log("> GET /api/admin/products");
  console.log("> Query:", req.query);

  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { deletedAt: null };

    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.productType) {
      filter.productType = req.query.productType;
    }

    if (req.query.brand) {
      filter.brand = req.query.brand;
    }

    if (req.query.category) {
      const productIds = await getProductIdsByCategory(req.query.category);
      if (productIds.length > 0) {
        filter._id = { $in: productIds };
      } else {
        filter._id = { $in: [] };
      }
    }

    if (req.query.isFeatured !== undefined) {
      filter.isFeatured = req.query.isFeatured === "true";
    }
    if (req.query.isBestseller !== undefined) {
      filter.isBestseller = req.query.isBestseller === "true";
    }
    if (req.query.isNewArrival !== undefined) {
      filter.isNewArrival = req.query.isNewArrival === "true";
    }

    const sortOptions = buildSortQuery(
      req.query,
      { name: "name", createdAt: "createdAt", updatedAt: "updatedAt", status: "status" },
      "createdAt",
      "desc"
    );

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("brand", "name slug")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    console.log(`> Found ${products.length} of ${total} products`);
    return sendResponse(res, 200, "Products fetched successfully", { products, pagination }, null);
  } catch (error) {
    console.log("> Error fetching products:", error.message);
    return sendResponse(res, 500, "Failed to fetch products", null, error.message);
  }
};

/**
 * @route POST /api/admin/products
 * @description Create a new product (admin)
 * @access Admin
 *
 * @requestBody
 * {
 *   "name": "Aloe Face Wash",
 *   "description": "...",
 *   "shortDescription": "...",
 *   "benefits": ["Hydrating", "Soothing"],
 *   "howToUse": "...",
 *   "brand": "507f1f77bcf86cd799439011",
 *   "productType": "simple",
 *   "status": "draft",
 *   "isFeatured": false,
 *   "isBestseller": false,
 *   "isNewArrival": true,
 *   "tags": ["face wash", "aloe"],
 *   "attributes": { "skinType": ["oily", "combination"], "concerns": ["acne"] },
 *   "seo": { "title": "...", "description": "...", "keywords": [] },
 *   "hsnCode": "33049990"
 * }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Product created successfully",
 *   "data": { "product": { "_id": "...", "name": "Aloe Face Wash", "slug": "aloe-face-wash", ... } },
 *   "error": null
 * }
 *
 * @responseBody Error (409)
 * { "message": "Product already exists", "data": null, "error": "A product with name 'Aloe Face Wash' already exists" }
 */
export const createProduct = async (req, res) => {
  console.log("> POST /api/admin/products");
  console.log("> Body:", req.body);

  try {
    const {
      name,
      slug: providedSlug,
      sku,
      description,
      shortDescription,
      benefits,
      howToUse,
      brand,
      productType,
      status,
      isFeatured,
      isBestseller,
      isNewArrival,
      tags,
      attributes,
      seo,
      hsnCode,
    } = req.body;

    const existingProduct = await Product.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
      deletedAt: null,
    });

    if (existingProduct) {
      console.log(`> Product already exists: ${name}`);
      return sendResponse(res, 409, "Product already exists", null, `A product with name '${name}' already exists`);
    }

    if (brand) {
      const brandExists = await Brand.findOne({ _id: brand, deletedAt: null });
      if (!brandExists) {
        console.log(`> Brand not found: ${brand}`);
        return sendResponse(res, 404, "Brand not found", null, `Brand with ID '${brand}' not found`);
      }
    }

    // Use provided slug or generate one
    let slug;
    if (providedSlug) {
      slug = providedSlug;
    } else {
      const baseSlug = generateSlug(name);
      slug = await generateUniqueSlug(baseSlug, Product);
    }

    const product = new Product({
      name,
      slug,
      sku,
      description: description || null,
      shortDescription: shortDescription || null,
      benefits: benefits || [],
      howToUse: howToUse || null,
      brand: brand || null,
      productType: productType || "simple",
      status: status || "draft",
      isFeatured: isFeatured || false,
      isBestseller: isBestseller || false,
      isNewArrival: isNewArrival || false,
      tags: tags || [],
      attributes: attributes || { skinType: [], concerns: [] },
      seo: seo || { title: null, description: null, keywords: [] },
      hsnCode: hsnCode || null,
    });

    await product.save();

    console.log(`> Product created: ${product.name} (${product._id})`);

    // Create inventory record (non-blocking)
    // Note: This creates a basic inventory record for the product
    // Variant-specific inventory will be created when variants are added
    inventoryService.createInventoryRecord(product._id.toString(), null, 0, 10)
      .then((result) => {
        if (result.success) {
          console.log(`> Inventory record created for product ${product._id}`);
        } else {
          console.log(`> Warning: Inventory record creation failed (non-blocking): ${result.error}`);
        }
      })
      .catch((error) => {
        console.log(`> Warning: Inventory service call failed (non-blocking): ${error.message}`);
      });

    return sendResponse(res, 201, "Product created successfully", { product }, null);
  } catch (error) {
    console.log("> Error creating product:", error.message);
    return sendResponse(res, 500, "Failed to create product", null, error.message);
  }
};

/**
 * @route GET /api/admin/products/:id
 * @description Get product by ID (admin)
 * @access Admin
 *
 * @params
 * - id: Product ObjectId
 *
 * @responseBody Success (200)
 * {
 *   "message": "Product fetched successfully",
 *   "data": { "product": { "_id": "...", "name": "...", ... } },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 */
export const getProductById = async (req, res) => {
  const { id } = req.params;
  console.log(`> GET /api/admin/products/${id}`);

  try {
    const product = await Product.findOne({ _id: id, deletedAt: null })
      .populate("brand", "name slug logo")
      .lean();

    if (!product) {
      console.log(`> Product not found: ${id}`);
      return sendResponse(res, 404, "Product not found", null, `Product with ID '${id}' not found`);
    }

    console.log(`> Product found: ${product.name}`);
    return sendResponse(res, 200, "Product fetched successfully", { product }, null);
  } catch (error) {
    console.log("> Error fetching product:", error.message);
    return sendResponse(res, 500, "Failed to fetch product", null, error.message);
  }
};

/**
 * @route PUT /api/admin/products/:id
 * @description Update product (admin)
 * @access Admin
 *
 * @params
 * - id: Product ObjectId
 *
 * @requestBody
 * { "name": "Updated Name", "description": "Updated description", ... }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Product updated successfully",
 *   "data": { "product": { "_id": "...", "name": "Updated Name", ... } },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Product not found", "data": null, "error": "Product with ID '...' not found" }
 *
 * @responseBody Error (409)
 * { "message": "Product name already exists", "data": null, "error": "A product with name '...' already exists" }
 */
export const updateProduct = async (req, res) => {
  const { id } = req.params;
  console.log(`> PUT /api/admin/products/${id}`);
  console.log("> Body:", req.body);

  try {
    const product = await Product.findOne({ _id: id, deletedAt: null });

    if (!product) {
      console.log(`> Product not found: ${id}`);
      return sendResponse(res, 404, "Product not found", null, `Product with ID '${id}' not found`);
    }

    const {
      name,
      description,
      shortDescription,
      benefits,
      howToUse,
      brand,
      productType,
      status,
      isFeatured,
      isBestseller,
      isNewArrival,
      tags,
      attributes,
      seo,
      hsnCode,
      version,
    } = req.body;

    // Optimistic locking: Check version if provided
    if (version !== undefined && version !== product.version) {
      console.log(`> Version mismatch: expected ${product.version}, got ${version}`);
      return sendResponse(
        res,
        409,
        "Product has been modified by another user",
        { currentVersion: product.version },
        `Version conflict: The product has been updated by another user. Please refresh and try again.`
      );
    }

    if (name && name !== product.name) {
      const existingProduct = await Product.findOne({
        name: { $regex: `^${name}$`, $options: "i" },
        _id: { $ne: id },
        deletedAt: null,
      });

      if (existingProduct) {
        console.log(`> Product name already exists: ${name}`);
        return sendResponse(res, 409, "Product name already exists", null, `A product with name '${name}' already exists`);
      }

      product.name = name;
      product.slug = await generateUniqueSlug(generateSlug(name), Product, id);
    }

    if (brand !== undefined) {
      if (brand) {
        const brandExists = await Brand.findOne({ _id: brand, deletedAt: null });
        if (!brandExists) {
          console.log(`> Brand not found: ${brand}`);
          return sendResponse(res, 404, "Brand not found", null, `Brand with ID '${brand}' not found`);
        }
      }
      product.brand = brand || null;
    }

    if (description !== undefined) product.description = description;
    if (shortDescription !== undefined) product.shortDescription = shortDescription;
    if (benefits !== undefined) product.benefits = benefits;
    if (howToUse !== undefined) product.howToUse = howToUse;
    if (productType !== undefined) product.productType = productType;

    // Track if status changed to archived for inventory service call
    const oldStatus = product.status;
    const statusChangedToArchived = status !== undefined && status === "archived" && oldStatus !== "archived";

    if (status !== undefined) product.status = status;
    if (isFeatured !== undefined) product.isFeatured = isFeatured;
    if (isBestseller !== undefined) product.isBestseller = isBestseller;
    if (isNewArrival !== undefined) product.isNewArrival = isNewArrival;
    if (tags !== undefined) product.tags = tags;
    if (attributes !== undefined) product.attributes = attributes;
    if (seo !== undefined) product.seo = seo;
    if (hsnCode !== undefined) product.hsnCode = hsnCode;

    await product.save();

    // Archive inventory if product status changed to archived (non-blocking)
    if (statusChangedToArchived) {
      console.log(`> Product status changed to archived, archiving inventory`);
      inventoryService.archiveInventoryRecord(product._id.toString())
        .then((result) => {
          if (result.success) {
            console.log(`> Inventory archived for product ${product._id}`);
          } else {
            console.log(`> Warning: Inventory archive failed (non-blocking): ${result.error}`);
          }
        })
        .catch((error) => {
          console.log(`> Warning: Inventory service call failed (non-blocking): ${error.message}`);
        });
    }

    console.log(`> Product updated: ${product.name}`);
    return sendResponse(res, 200, "Product updated successfully", { product }, null);
  } catch (error) {
    console.log("> Error updating product:", error.message);

    // Handle version conflict error from mongoose
    if (error.name === "VersionError") {
      return sendResponse(
        res,
        409,
        "Product has been modified by another user",
        null,
        "Version conflict: The product has been updated by another user. Please refresh and try again."
      );
    }

    return sendResponse(res, 500, "Failed to update product", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/products/:id/status
 * @description Update product status (admin)
 * @access Admin
 *
 * @params
 * - id: Product ObjectId
 *
 * @requestBody
 * { "status": "active" }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Product status updated successfully",
 *   "data": { "product": { "_id": "...", "name": "...", "status": "active", ... } },
 *   "error": null
 * }
 */
export const updateProductStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  console.log(`> PATCH /api/admin/products/${id}/status`);
  console.log("> Body:", req.body);

  try {
    const product = await Product.findOne({ _id: id, deletedAt: null });

    if (!product) {
      console.log(`> Product not found: ${id}`);
      return sendResponse(res, 404, "Product not found", null, `Product with ID '${id}' not found`);
    }

    product.status = status;
    await product.save();

    console.log(`> Product status updated: ${product.name} -> ${status}`);
    return sendResponse(res, 200, "Product status updated successfully", { product }, null);
  } catch (error) {
    console.log("> Error updating product status:", error.message);
    return sendResponse(res, 500, "Failed to update product status", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/products/:id/flags
 * @description Update product flags (admin)
 * @access Admin
 *
 * @params
 * - id: Product ObjectId
 *
 * @requestBody
 * { "isFeatured": true, "isBestseller": false, "isNewArrival": true }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Product flags updated successfully",
 *   "data": { "product": { "_id": "...", "name": "...", "isFeatured": true, ... } },
 *   "error": null
 * }
 */
export const updateProductFlags = async (req, res) => {
  const { id } = req.params;
  const { isFeatured, isBestseller, isNewArrival } = req.body;
  console.log(`> PATCH /api/admin/products/${id}/flags`);
  console.log("> Body:", req.body);

  try {
    const product = await Product.findOne({ _id: id, deletedAt: null });

    if (!product) {
      console.log(`> Product not found: ${id}`);
      return sendResponse(res, 404, "Product not found", null, `Product with ID '${id}' not found`);
    }

    if (isFeatured !== undefined) product.isFeatured = isFeatured;
    if (isBestseller !== undefined) product.isBestseller = isBestseller;
    if (isNewArrival !== undefined) product.isNewArrival = isNewArrival;

    await product.save();

    console.log(`> Product flags updated: ${product.name}`);
    return sendResponse(res, 200, "Product flags updated successfully", { product }, null);
  } catch (error) {
    console.log("> Error updating product flags:", error.message);
    return sendResponse(res, 500, "Failed to update product flags", null, error.message);
  }
};

/**
 * @route POST /api/admin/products/:id/duplicate
 * @description Duplicate a product (admin)
 * @access Admin
 *
 * @params
 * - id: Product ObjectId
 *
 * @requestBody
 * { "name": "Duplicated Product Name" }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Product duplicated successfully",
 *   "data": { "product": { "_id": "...", "name": "Duplicated Product Name", ... } },
 *   "error": null
 * }
 */
export const duplicateProduct = async (req, res) => {
  const { id } = req.params;
  const { name: newName } = req.body;
  console.log(`> POST /api/admin/products/${id}/duplicate`);
  console.log("> Body:", req.body);

  try {
    const original = await Product.findOne({ _id: id, deletedAt: null }).lean();

    if (!original) {
      console.log(`> Product not found: ${id}`);
      return sendResponse(res, 404, "Product not found", null, `Product with ID '${id}' not found`);
    }

    const name = newName || `${original.name} (Copy)`;
    const baseSlug = generateSlug(name);
    const slug = await generateUniqueSlug(baseSlug, Product);

    const duplicateData = {
      ...original,
      _id: undefined,
      name,
      slug,
      status: "draft",
      createdAt: undefined,
      updatedAt: undefined,
      ratingSummary: { average: 0, count: 0 },
    };

    const product = new Product(duplicateData);
    await product.save();

    console.log(`> Product duplicated: ${original.name} -> ${product.name} (${product._id})`);
    return sendResponse(res, 201, "Product duplicated successfully", { product }, null);
  } catch (error) {
    console.log("> Error duplicating product:", error.message);
    return sendResponse(res, 500, "Failed to duplicate product", null, error.message);
  }
};

/**
 * @route DELETE /api/admin/products/:id
 * @description Soft delete product (admin)
 * @access Admin
 *
 * @params
 * - id: Product ObjectId
 *
 * @responseBody Success (200)
 * {
 *   "message": "Product deleted successfully",
 *   "data": { "product": { "_id": "...", "name": "...", "deletedAt": "2024-01-01T00:00:00Z", ... } },
 *   "error": null
 * }
 */
export const deleteProduct = async (req, res) => {
  const { id } = req.params;
  console.log(`> DELETE /api/admin/products/${id}`);

  try {
    const product = await Product.findOne({ _id: id, deletedAt: null });

    if (!product) {
      console.log(`> Product not found: ${id}`);
      return sendResponse(res, 404, "Product not found", null, `Product with ID '${id}' not found`);
    }

    product.deletedAt = new Date();
    product.status = "archived";
    await product.save();

    console.log(`> Product deleted: ${product.name}`);
    return sendResponse(res, 200, "Product deleted successfully", { product }, null);
  } catch (error) {
    console.log("> Error deleting product:", error.message);
    return sendResponse(res, 500, "Failed to delete product", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/products/bulk-update
 * @description Bulk update products (admin)
 * @access Admin
 *
 * @requestBody
 * {
 *   "productIds": ["id1", "id2", "id3"],
 *   "updates": { "status": "active", "isFeatured": true }
 * }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Products updated successfully",
 *   "data": { "modifiedCount": 3 },
 *   "error": null
 * }
 */
export const bulkUpdateProducts = async (req, res) => {
  console.log("> PATCH /api/admin/products/bulk-update");
  console.log("> Body:", req.body);

  try {
    const { productIds, updates } = req.body;

    if (updates.brand) {
      const brandExists = await Brand.findOne({ _id: updates.brand, deletedAt: null });
      if (!brandExists) {
        console.log(`> Brand not found: ${updates.brand}`);
        return sendResponse(res, 404, "Brand not found", null, `Brand with ID '${updates.brand}' not found`);
      }
    }

    const result = await Product.updateMany(
      { _id: { $in: productIds }, deletedAt: null },
      { $set: updates }
    );

    console.log(`> Bulk updated ${result.modifiedCount} products`);
    return sendResponse(res, 200, "Products updated successfully", { modifiedCount: result.modifiedCount }, null);
  } catch (error) {
    console.log("> Error bulk updating products:", error.message);
    return sendResponse(res, 500, "Failed to bulk update products", null, error.message);
  }
};

/**
 * @route GET /api/admin/products/bulk-export
 * @description Export products as JSON (admin)
 * @access Admin
 *
 * @queryParams
 * - status: Filter by status
 * - brand: Filter by brand
 *
 * @responseBody Success (200)
 * {
 *   "message": "Products exported successfully",
 *   "data": {
 *     "products": [...],
 *     "exportedAt": "2024-01-01T00:00:00Z",
 *     "count": 100
 *   },
 *   "error": null
 * }
 */
export const bulkExportProducts = async (req, res) => {
  console.log("> GET /api/admin/products/bulk-export");
  console.log("> Query:", req.query);

  try {
    const filter = { deletedAt: null };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.brand) {
      filter.brand = req.query.brand;
    }

    const products = await Product.find(filter)
      .populate("brand", "name slug")
      .lean();

    console.log(`> Exported ${products.length} products`);
    return sendResponse(res, 200, "Products exported successfully", {
      products,
      exportedAt: new Date().toISOString(),
      count: products.length,
    }, null);
  } catch (error) {
    console.log("> Error exporting products:", error.message);
    return sendResponse(res, 500, "Failed to export products", null, error.message);
  }
};

/**
 * @route POST /api/admin/products/bulk-import
 * @description Bulk import products (admin)
 * @access Admin
 *
 * @requestBody
 * {
 *   "products": [
 *     { "name": "Product 1", "description": "...", "brand": "...", ... },
 *     { "name": "Product 2", ... }
 *   ]
 * }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Products imported successfully",
 *   "data": {
 *     "created": 5,
 *     "failed": 1,
 *     "errors": [{ "index": 3, "name": "Product 4", "error": "Product already exists" }]
 *   },
 *   "error": null
 * }
 */
export const bulkImportProducts = async (req, res) => {
  console.log("> POST /api/admin/products/bulk-import");
  console.log("> Body: products array with", req.body.products?.length, "items");

  try {
    const { products: productsData } = req.body;

    if (!productsData || !Array.isArray(productsData) || productsData.length === 0) {
      return sendResponse(res, 400, "Validation failed", null, "Products array is required");
    }

    if (productsData.length > 100) {
      return sendResponse(res, 400, "Validation failed", null, "Cannot import more than 100 products at once");
    }

    const results = { created: 0, failed: 0, errors: [] };

    for (let i = 0; i < productsData.length; i++) {
      const data = productsData[i];

      try {
        if (!data.name) {
          results.failed++;
          results.errors.push({ index: i, name: data.name || "Unknown", error: "Product name is required" });
          continue;
        }

        const existingProduct = await Product.findOne({
          name: { $regex: `^${data.name}$`, $options: "i" },
          deletedAt: null,
        });

        if (existingProduct) {
          results.failed++;
          results.errors.push({ index: i, name: data.name, error: "Product already exists" });
          continue;
        }

        const baseSlug = generateSlug(data.name);
        const slug = await generateUniqueSlug(baseSlug, Product);

        const product = new Product({
          name: data.name,
          slug,
          sku: data.sku,
          description: data.description || null,
          shortDescription: data.shortDescription || null,
          benefits: data.benefits || [],
          howToUse: data.howToUse || null,
          brand: data.brand || null,
          productType: data.productType || "simple",
          status: data.status || "draft",
          isFeatured: data.isFeatured || false,
          isBestseller: data.isBestseller || false,
          isNewArrival: data.isNewArrival || false,
          tags: data.tags || [],
          attributes: data.attributes || { skinType: [], concerns: [] },
          seo: data.seo || { title: null, description: null, keywords: [] },
          hsnCode: data.hsnCode || null,
        });

        await product.save();
        results.created++;
      } catch (err) {
        results.failed++;
        results.errors.push({ index: i, name: data.name || "Unknown", error: err.message });
      }
    }

    console.log(`> Bulk import completed: created=${results.created}, failed=${results.failed}`);
    return sendResponse(res, 200, "Products imported successfully", results, null);
  } catch (error) {
    console.log("> Error bulk importing products:", error.message);
    return sendResponse(res, 500, "Failed to bulk import products", null, error.message);
  }
};

/**
 * @route POST /api/products/metadata
 * @description Get metadata for multiple products (for Order service)
 * @access Public
 *
 * @requestBody
 * { "productIds": ["id1", "id2", "id3"] }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Products metadata retrieved successfully",
 *   "data": {
 *     "products": [
 *       { "_id": "...", "name": "...", "slug": "...", "sku": "...", "productType": "simple" }
 *     ]
 *   }
 * }
 */
export const getProductsMetadata = async (req, res) => {
  const { productIds } = req.body;
  console.log("> POST /api/products/metadata");
  console.log("> Product IDs:", productIds?.length);

  try {
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return sendResponse(res, 400, "Validation failed", null, "productIds array is required");
    }

    const products = await Product.find({
      _id: { $in: productIds },
      deletedAt: null,
    })
      .select("_id name slug sku productType status")
      .lean();

    console.log(`> Found ${products.length} products`);
    return sendResponse(res, 200, "Products metadata retrieved successfully", { products }, null);
  } catch (error) {
    console.log("> Error fetching products metadata:", error.message);
    return sendResponse(res, 500, "Failed to fetch products metadata", null, error.message);
  }
};

/**
 * @route POST /api/variants/bulk
 * @description Get variants for multiple products (for Order service)
 * @access Public
 *
 * @requestBody
 * { "variantIds": ["id1", "id2", "id3"] }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Variants retrieved successfully",
 *   "data": {
 *     "variants": [
 *       { "_id": "...", "product": "...", "sku": "...", "name": "...", "options": {...} }
 *     ]
 *   }
 * }
 */
export const getBulkVariants = async (req, res) => {
  const { variantIds } = req.body;
  console.log("> POST /api/variants/bulk");
  console.log("> Variant IDs:", variantIds?.length);

  try {
    if (!variantIds || !Array.isArray(variantIds) || variantIds.length === 0) {
      return sendResponse(res, 400, "Validation failed", null, "variantIds array is required");
    }

    const variants = await ProductVariant.find({
      _id: { $in: variantIds },
      deletedAt: null,
    })
      .populate("product", "name slug")
      .lean();

    console.log(`> Found ${variants.length} variants`);
    return sendResponse(res, 200, "Variants retrieved successfully", { variants }, null);
  } catch (error) {
    console.log("> Error fetching variants:", error.message);
    return sendResponse(res, 500, "Failed to fetch variants", null, error.message);
  }
};

/**
 * @route GET /api/products/:id/availability
 * @description Check if a product is available for purchase
 * @access Public
 *
 * @params
 * - id: Product ObjectId
 *
 * @responseBody Success (200)
 * {
 *   "message": "Product availability checked",
 *   "data": {
 *     "available": true,
 *     "product": { "_id": "...", "name": "...", "status": "active" }
 *   }
 * }
 */
export const getProductAvailability = async (req, res) => {
  const { id } = req.params;
  console.log(`> GET /api/products/${id}/availability`);

  try {
    const product = await Product.findOne({
      _id: id,
      deletedAt: null,
    })
      .select("_id name slug sku status productType")
      .lean();

    if (!product) {
      console.log(`> Product not found: ${id}`);
      return sendResponse(res, 404, "Product not found", null, `Product with ID '${id}' not found`);
    }

    const available = product.status === "active";

    console.log(`> Product availability: ${available}`);
    return sendResponse(res, 200, "Product availability checked", { available, product }, null);
  } catch (error) {
    console.log("> Error checking product availability:", error.message);
    return sendResponse(res, 500, "Failed to check product availability", null, error.message);
  }
};

export default {
  listProducts,
  getProductBySlug,
  getProductVariants,
  getProductMedia,
  getProductIngredients,
  getProductRelated,
  listAllProducts,
  createProduct,
  getProductById,
  updateProduct,
  updateProductStatus,
  updateProductFlags,
  duplicateProduct,
  deleteProduct,
  bulkUpdateProducts,
  bulkExportProducts,
  bulkImportProducts,
  getProductsMetadata,
  getBulkVariants,
  getProductAvailability,
};
