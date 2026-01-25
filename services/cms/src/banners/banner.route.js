import express from "express";
import { validate } from "@shared/middlewares";
import bannerController from "./banner.controller.js";
import {
  createBannerSchema,
  updateBannerSchema,
  getBannerByIdSchema,
  reorderBannersSchema,
  consumerQuerySchema,
  adminListQuerySchema,
} from "./banner.validator.js";

const consumerRouter = express.Router();
const adminRouter = express.Router();

// ============================================================
// CONSUMER ROUTES (Public)
// ============================================================

// GET /banners - Get active banners
consumerRouter.get("/", validate(consumerQuerySchema), bannerController.getActiveBanners);

// ============================================================
// ADMIN ROUTES (Protected)
// ============================================================

// GET /admin/banners - List all banners
adminRouter.get("/", validate(adminListQuerySchema), bannerController.listAllBanners);

// PATCH /admin/banners/reorder - Reorder banners by priority (before :id routes)
adminRouter.patch("/reorder", validate(reorderBannersSchema), bannerController.reorderBanners);

// POST /admin/banners - Create new banner
adminRouter.post("/", validate(createBannerSchema), bannerController.createBanner);

// GET /admin/banners/:id - Get banner by ID
adminRouter.get("/:id", validate(getBannerByIdSchema), bannerController.getBannerById);

// PUT /admin/banners/:id - Update banner
adminRouter.put("/:id", validate(updateBannerSchema), bannerController.updateBanner);

// PATCH /admin/banners/:id/activate - Activate banner
adminRouter.patch("/:id/activate", validate(getBannerByIdSchema), bannerController.activateBanner);

// PATCH /admin/banners/:id/deactivate - Deactivate banner
adminRouter.patch("/:id/deactivate", validate(getBannerByIdSchema), bannerController.deactivateBanner);

// DELETE /admin/banners/:id - Delete banner
adminRouter.delete("/:id", validate(getBannerByIdSchema), bannerController.deleteBanner);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
