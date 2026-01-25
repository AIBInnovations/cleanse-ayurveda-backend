import express from "express";
import { validate } from "@shared/middlewares";
import reelController from "./reel.controller.js";
import {
  createReelSchema,
  updateReelSchema,
  getReelByIdSchema,
  reorderReelsSchema,
  consumerQuerySchema,
  adminListQuerySchema,
} from "./reel.validator.js";

const consumerRouter = express.Router();
const adminRouter = express.Router();

// ============================================================
// CONSUMER ROUTES (Public)
// ============================================================

// GET /reels - Get active reels
consumerRouter.get("/", validate(consumerQuerySchema), reelController.getActiveReels);

// POST /reels/:id/view - Track view count
consumerRouter.post("/:id/view", validate(getReelByIdSchema), reelController.trackView);

// ============================================================
// ADMIN ROUTES (Protected)
// ============================================================

// GET /admin/reels - List all reels
adminRouter.get("/", validate(adminListQuerySchema), reelController.listAllReels);

// PATCH /admin/reels/reorder - Reorder reels (before :id routes)
adminRouter.patch("/reorder", validate(reorderReelsSchema), reelController.reorderReels);

// POST /admin/reels - Create new reel
adminRouter.post("/", validate(createReelSchema), reelController.createReel);

// GET /admin/reels/:id - Get reel by ID
adminRouter.get("/:id", validate(getReelByIdSchema), reelController.getReelById);

// PUT /admin/reels/:id - Update reel
adminRouter.put("/:id", validate(updateReelSchema), reelController.updateReel);

// PATCH /admin/reels/:id/activate - Activate reel
adminRouter.patch("/:id/activate", validate(getReelByIdSchema), reelController.activateReel);

// PATCH /admin/reels/:id/deactivate - Deactivate reel
adminRouter.patch("/:id/deactivate", validate(getReelByIdSchema), reelController.deactivateReel);

// DELETE /admin/reels/:id - Delete reel
adminRouter.delete("/:id", validate(getReelByIdSchema), reelController.deleteReel);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
