import { Router } from "express";
import { validate } from "@shared/middlewares";
import {
  listActiveCategories,
  getCategoryBySlug,
  listAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  activateCategory,
  deactivateCategory,
  reorderCategories,
  deleteCategory
} from "./blog-category.controller.js";
import {
  createCategorySchema,
  updateCategorySchema,
  getCategoryByIdSchema,
  getCategoryBySlugSchema,
  reorderCategoriesSchema,
  deactivateCategorySchema,
  deleteCategorySchema,
  adminListQuerySchema
} from "./blog-category.validator.js";

const consumerRouter = Router();
const adminRouter = Router();

/**
 * @route GET /api/blog-categories
 * @desc List all active categories as tree
 * @access Public
 */
consumerRouter.get("/", listActiveCategories);

/**
 * @route GET /api/blog-categories/:slug
 * @desc Get category by slug
 * @access Public
 */
consumerRouter.get("/:slug", validate(getCategoryBySlugSchema), getCategoryBySlug);

/**
 * @route GET /api/admin/blog-categories
 * @desc List all categories with filters
 * @access Admin
 */
adminRouter.get("/", validate(adminListQuerySchema), listAllCategories);

/**
 * @route PATCH /api/admin/blog-categories/reorder
 * @desc Reorder categories
 * @access Admin
 */
adminRouter.patch("/reorder", validate(reorderCategoriesSchema), reorderCategories);

/**
 * @route GET /api/admin/blog-categories/:id
 * @desc Get category by ID
 * @access Admin
 */
adminRouter.get("/:id", validate(getCategoryByIdSchema), getCategoryById);

/**
 * @route POST /api/admin/blog-categories
 * @desc Create new category
 * @access Admin
 */
adminRouter.post("/", validate(createCategorySchema), createCategory);

/**
 * @route PUT /api/admin/blog-categories/:id
 * @desc Update category
 * @access Admin
 */
adminRouter.put("/:id", validate(updateCategorySchema), updateCategory);

/**
 * @route PATCH /api/admin/blog-categories/:id/activate
 * @desc Activate category
 * @access Admin
 */
adminRouter.patch("/:id/activate", validate(getCategoryByIdSchema), activateCategory);

/**
 * @route PATCH /api/admin/blog-categories/:id/deactivate
 * @desc Deactivate category
 * @access Admin
 */
adminRouter.patch("/:id/deactivate", validate(deactivateCategorySchema), deactivateCategory);

/**
 * @route DELETE /api/admin/blog-categories/:id
 * @desc Delete category
 * @access Admin
 */
adminRouter.delete("/:id", validate(deleteCategorySchema), deleteCategory);

export default {
  consumer: consumerRouter,
  admin: adminRouter
};
