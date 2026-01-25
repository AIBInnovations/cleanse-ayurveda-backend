import { Router } from "express";
import { validate } from "@shared/middlewares";
import {
  listPublishedPages,
  getPageBySlug,
  listAllPages,
  getPageById,
  createPage,
  updatePage,
  publishPage,
  unpublishPage,
  deletePage
} from "./page.controller.js";
import {
  createPageSchema,
  updatePageSchema,
  getPageByIdSchema,
  getPageBySlugSchema,
  adminListQuerySchema,
  consumerListQuerySchema
} from "./page.validator.js";

const consumerRouter = Router();
const adminRouter = Router();

/**
 * @route GET /api/pages
 * @desc List all published pages
 * @access Public
 */
consumerRouter.get("/", validate(consumerListQuerySchema), listPublishedPages);

/**
 * @route GET /api/pages/:slug
 * @desc Get published page by slug
 * @access Public
 */
consumerRouter.get("/:slug", validate(getPageBySlugSchema), getPageBySlug);

/**
 * @route GET /api/admin/pages
 * @desc List all pages with filters
 * @access Admin
 */
adminRouter.get("/", validate(adminListQuerySchema), listAllPages);

/**
 * @route GET /api/admin/pages/:id
 * @desc Get page by ID
 * @access Admin
 */
adminRouter.get("/:id", validate(getPageByIdSchema), getPageById);

/**
 * @route POST /api/admin/pages
 * @desc Create new page
 * @access Admin
 */
adminRouter.post("/", validate(createPageSchema), createPage);

/**
 * @route PUT /api/admin/pages/:id
 * @desc Update page
 * @access Admin
 */
adminRouter.put("/:id", validate(updatePageSchema), updatePage);

/**
 * @route PATCH /api/admin/pages/:id/publish
 * @desc Publish page
 * @access Admin
 */
adminRouter.patch("/:id/publish", validate(getPageByIdSchema), publishPage);

/**
 * @route PATCH /api/admin/pages/:id/unpublish
 * @desc Unpublish page
 * @access Admin
 */
adminRouter.patch("/:id/unpublish", validate(getPageByIdSchema), unpublishPage);

/**
 * @route DELETE /api/admin/pages/:id
 * @desc Delete page
 * @access Admin
 */
adminRouter.delete("/:id", validate(getPageByIdSchema), deletePage);

export default {
  consumer: consumerRouter,
  admin: adminRouter
};
