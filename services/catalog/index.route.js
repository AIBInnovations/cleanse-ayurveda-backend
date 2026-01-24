import { Router } from "express";
import { sendResponse } from "@shared/utils";
import { route as uploadRoutes } from "@shared/cloudinary";
import brandRoutes from "./src/brands/brand.route.js";
import ingredientRoutes from "./src/ingredients/ingredient.route.js";
import categoryRoutes from "./src/categories/category.route.js";
import productRoutes from "./src/products/product.route.js";
import variantRoutes from "./src/variants/variant.route.js";
import mediaRoutes from "./src/media/media.route.js";
import productIngredientRoutes from "./src/product-ingredients/product-ingredient.route.js";
import productCategoryRoutes from "./src/product-categories/product-category.route.js";
import collectionRoutes from "./src/collections/collection.route.js";
import bundleRoutes from "./src/bundles/bundle.route.js";
import relatedProductRoutes from "./src/related-products/related-product.route.js";
import searchRoutes from "./src/search/search.route.js";

const router = Router();

/**
 * @route GET /api/health
 * @description Health check endpoint
 */
router.get("/health", (req, res) => {
  sendResponse(res, 200, "Server is running", { status: "ok" }, null);
});

/**
 * @route /api/upload
 * @description Media upload routes
 */
router.use("/upload", uploadRoutes);

/**
 * Consumer Routes
 */

/**
 * @route /api/brands
 * @description Brand routes (consumer)
 */
router.use("/brands", brandRoutes.consumer);

/**
 * @route /api/ingredients
 * @description Ingredient routes (consumer)
 */
router.use("/ingredients", ingredientRoutes.consumer);

/**
 * @route /api/categories
 * @description Category routes (consumer)
 */
router.use("/categories", categoryRoutes.consumer);

/**
 * @route /api/products
 * @description Product routes (consumer)
 */
router.use("/products", productRoutes.consumer);

/**
 * @route /api/products/:productSlug/variants
 * @description Variant routes via product slug (consumer)
 */
router.use("/products", variantRoutes.consumer);

/**
 * @route /api/variants
 * @description Direct variant access (consumer)
 */
router.use("/variants", variantRoutes.consumer);

/**
 * @route /api/products/:productSlug/media
 * @description Media routes via product slug (consumer)
 */
router.use("/products", mediaRoutes.consumer);

/**
 * @route /api/collections
 * @description Collection routes (consumer)
 */
router.use("/collections", collectionRoutes.consumer);

/**
 * @route /api/bundles
 * @description Bundle routes (consumer)
 */
router.use("/bundles", bundleRoutes.consumer);

/**
 * @route /api/products/:productSlug/cross-sell, /up-sell, /frequently-bought
 * @description Related products routes (consumer)
 */
router.use("/products", relatedProductRoutes.consumer);

/**
 * @route /api/search
 * @description Search routes (consumer)
 */
router.use("/search", searchRoutes.consumer);

/**
 * Admin Routes
 */

/**
 * @route /api/admin/brands
 * @description Brand routes (admin)
 */
router.use("/admin/brands", brandRoutes.admin);

/**
 * @route /api/admin/ingredients
 * @description Ingredient routes (admin)
 */
router.use("/admin/ingredients", ingredientRoutes.admin);

/**
 * @route /api/admin/categories
 * @description Category routes (admin)
 */
router.use("/admin/categories", categoryRoutes.admin);

/**
 * @route /api/admin/products
 * @description Product routes (admin)
 */
router.use("/admin/products", productRoutes.admin);

/**
 * @route /api/admin/products/:productId/variants
 * @description Variant routes via product ID (admin)
 */
router.use("/admin/products", variantRoutes.adminProducts);

/**
 * @route /api/admin/variants
 * @description Variant operations (admin)
 */
router.use("/admin/variants", variantRoutes.adminVariants);

/**
 * @route /api/admin/products/:productId/media
 * @description Media routes via product ID (admin)
 */
router.use("/admin/products", mediaRoutes.adminProducts);

/**
 * @route /api/admin/media
 * @description Media operations (admin)
 */
router.use("/admin/media", mediaRoutes.adminMedia);

/**
 * @route /api/admin/products/:productId/ingredients
 * @description Product-Ingredient mapping routes (admin)
 */
router.use("/admin/products", productIngredientRoutes);

/**
 * @route /api/admin/products/:productId/categories
 * @description Product-Category mapping routes (admin)
 */
router.use("/admin/products", productCategoryRoutes);

/**
 * @route /api/admin/collections
 * @description Collection routes (admin)
 */
router.use("/admin/collections", collectionRoutes.admin);

/**
 * @route /api/admin/bundles
 * @description Bundle routes (admin)
 */
router.use("/admin/bundles", bundleRoutes.admin);

/**
 * @route /api/admin/products/:productId/related
 * @description Related products routes (admin)
 */
router.use("/admin/products", relatedProductRoutes.admin);

/**
 * @route /api/admin/search
 * @description Search administration routes (admin)
 */
router.use("/admin/search", searchRoutes.admin);

export default router;
