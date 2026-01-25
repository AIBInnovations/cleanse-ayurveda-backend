import { Router } from "express";
import {
  getActiveTiers,
  getMyTier,
  listTiers,
  createTier,
  getTierById,
  updateTier,
  activateTier,
  deactivateTier,
  deleteTier,
} from "./loyalty-tier.controller.js";
import { validate } from "@shared/middlewares";
import { authenticateUser, authenticateAdmin } from "@shared/auth-middleware";
import {
  createTierSchema,
  updateTierSchema,
  tierIdParamSchema,
  listTiersAdminSchema,
} from "./loyalty-tier.validation.js";

const consumerRouter = Router();
const adminRouter = Router();

/**
 * Consumer Routes
 */

/**
 * @route GET /api/loyalty/tiers
 * @description Get active loyalty tiers
 * @access Public
 */
consumerRouter.get("/", getActiveTiers);

/**
 * @route GET /api/loyalty/tiers/my-tier
 * @description Get user's current tier
 * @access Auth
 */
consumerRouter.get("/my-tier", authenticateUser, getMyTier);

/**
 * Admin Routes
 */

// Apply admin authentication to all admin routes
adminRouter.use(authenticateAdmin);

/**
 * @route GET /api/admin/loyalty/tiers
 * @description List all tiers
 * @access Admin
 */
adminRouter.get("/", validate(listTiersAdminSchema), listTiers);

/**
 * @route POST /api/admin/loyalty/tiers
 * @description Create a loyalty tier
 * @access Admin
 */
adminRouter.post("/", validate(createTierSchema), createTier);

/**
 * @route GET /api/admin/loyalty/tiers/:id
 * @description Get tier by ID
 * @access Admin
 */
adminRouter.get("/:id", validate(tierIdParamSchema), getTierById);

/**
 * @route PUT /api/admin/loyalty/tiers/:id
 * @description Update a tier
 * @access Admin
 */
adminRouter.put("/:id", validate(updateTierSchema), updateTier);

/**
 * @route PATCH /api/admin/loyalty/tiers/:id/activate
 * @description Activate a tier
 * @access Admin
 */
adminRouter.patch("/:id/activate", validate(tierIdParamSchema), activateTier);

/**
 * @route PATCH /api/admin/loyalty/tiers/:id/deactivate
 * @description Deactivate a tier
 * @access Admin
 */
adminRouter.patch("/:id/deactivate", validate(tierIdParamSchema), deactivateTier);

/**
 * @route DELETE /api/admin/loyalty/tiers/:id
 * @description Delete a tier
 * @access Admin
 */
adminRouter.delete("/:id", validate(tierIdParamSchema), deleteTier);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
