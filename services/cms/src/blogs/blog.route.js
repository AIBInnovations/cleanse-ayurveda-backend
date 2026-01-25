import express from "express";
import { validate } from "@shared/middlewares";
import blogController from "./blog.controller.js";
import {
  createBlogSchema,
  updateBlogSchema,
  getBlogByIdSchema,
  getBlogBySlugSchema,
  consumerListQuerySchema,
  adminListQuerySchema,
} from "./blog.validator.js";

const consumerRouter = express.Router();
const adminRouter = express.Router();

// ============================================================
// CONSUMER ROUTES (Public)
// ============================================================

// GET /blogs - List published blogs
consumerRouter.get("/", validate(consumerListQuerySchema), blogController.listPublishedBlogs);

// GET /blogs/featured - List featured blogs (limit 5)
consumerRouter.get("/featured", blogController.listFeaturedBlogs);

// GET /blogs/:slug - Get blog by slug (increments view_count)
consumerRouter.get("/:slug", validate(getBlogBySlugSchema), blogController.getBlogBySlug);

// GET /blogs/:slug/related - Get related blogs (same category/tags)
consumerRouter.get("/:slug/related", validate(getBlogBySlugSchema), blogController.getRelatedBlogs);

// ============================================================
// ADMIN ROUTES (Protected)
// ============================================================

// GET /admin/blogs - List all blogs
adminRouter.get("/", validate(adminListQuerySchema), blogController.listAllBlogs);

// POST /admin/blogs - Create new blog
adminRouter.post("/", validate(createBlogSchema), blogController.createBlog);

// GET /admin/blogs/:id - Get blog by ID
adminRouter.get("/:id", validate(getBlogByIdSchema), blogController.getBlogById);

// PUT /admin/blogs/:id - Update blog
adminRouter.put("/:id", validate(updateBlogSchema), blogController.updateBlog);

// PATCH /admin/blogs/:id/publish - Publish blog
adminRouter.patch("/:id/publish", validate(getBlogByIdSchema), blogController.publishBlog);

// PATCH /admin/blogs/:id/unpublish - Unpublish blog (set to draft)
adminRouter.patch("/:id/unpublish", validate(getBlogByIdSchema), blogController.unpublishBlog);

// PATCH /admin/blogs/:id/feature - Mark as featured
adminRouter.patch("/:id/feature", validate(getBlogByIdSchema), blogController.featureBlog);

// PATCH /admin/blogs/:id/unfeature - Remove featured status
adminRouter.patch("/:id/unfeature", validate(getBlogByIdSchema), blogController.unfeatureBlog);

// DELETE /admin/blogs/:id - Delete blog
adminRouter.delete("/:id", validate(getBlogByIdSchema), blogController.deleteBlog);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
