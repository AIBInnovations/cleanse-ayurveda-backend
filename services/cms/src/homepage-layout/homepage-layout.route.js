import express from "express";
import { validate } from "@shared/middlewares";
import homepageLayoutController from "./homepage-layout.controller.js";
import {
  updateLayoutSchema,
  getLayoutVersionsQuerySchema,
} from "./homepage-layout.validator.js";

const consumerRouter = express.Router();
const adminRouter = express.Router();

// ============================================================
// CONSUMER ROUTES (Public)
// ============================================================

// GET /homepage-layout - Get active layout with sections
consumerRouter.get("/", homepageLayoutController.getActiveLayout);

// ============================================================
// ADMIN ROUTES (Protected)
// ============================================================

// GET /admin/homepage-layout/versions - Get all layout versions
adminRouter.get(
  "/versions",
  validate(getLayoutVersionsQuerySchema),
  homepageLayoutController.getLayoutVersions
);

// GET /admin/homepage-layout - Get current layout
adminRouter.get("/", homepageLayoutController.getLayout);

// PUT /admin/homepage-layout - Update layout
adminRouter.put(
  "/",
  validate(updateLayoutSchema),
  homepageLayoutController.updateLayout
);

// POST /admin/homepage-layout/publish - Publish layout
adminRouter.post("/publish", homepageLayoutController.publishLayout);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
