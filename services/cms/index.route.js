import { Router } from "express";
import { sendResponse } from "@shared/utils";
import { route as uploadRoutes } from "@shared/cloudinary";
import cmsRoutes from "./src/index.route.js";

const router = Router();

/**
 * @route GET /api/health
 * @description Health check endpoint
 */
router.get("/health", (req, res) => {
  sendResponse(res, 200, "CMS service is running", { status: "ok" }, null);
});

/**
 * @route /api/upload
 * @description Media upload routes
 */
router.use("/upload", uploadRoutes);

/**
 * CMS Routes
 * Consumer routes are mounted at /api/*
 * Admin routes are mounted at /api/admin/*
 * Note: Gateway strips /cms prefix, so routes here don't include /cms
 */
router.use("/", cmsRoutes.consumer);
router.use("/admin", cmsRoutes.admin);

export default router;
