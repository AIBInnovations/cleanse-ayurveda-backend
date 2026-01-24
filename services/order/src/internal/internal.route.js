import express from "express";
import * as cartMigrationController from "../cart/cart-migration.controller.js";

/**
 * Internal Routes
 * Base path: /api/internal
 *
 * These routes are for service-to-service communication only
 * and should NOT be exposed via the API gateway
 */
const router = express.Router();

/**
 * @route   POST /api/internal/cart/migrate
 * @desc    Migrate guest cart to user account
 * @access  Internal (requires internal service key)
 */
router.post(
  "/cart/migrate",
  cartMigrationController.migrateGuestCart
);

export default router;
