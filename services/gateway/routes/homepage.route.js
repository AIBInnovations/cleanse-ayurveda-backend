import express from "express";
import homepageController from "../controllers/homepage.controller.js";

const router = express.Router();

/**
 * GET /api/homepage
 * Public endpoint - No authentication required
 * Aggregates homepage data from CMS and Catalog services
 */
router.get("/", homepageController.getHomepage);

export default router;
