import express from "express";
import { validate } from "@shared/middlewares";
import popupController from "./popup.controller.js";
import {
  createPopupSchema,
  updatePopupSchema,
  getPopupByIdSchema,
  consumerQuerySchema,
  adminListQuerySchema,
  subscribeNewsletterSchema,
  trackPopupEventSchema,
  getPopupStatsSchema,
} from "./popup.validator.js";

const consumerRouter = express.Router();
const adminRouter = express.Router();

// ============================================================
// CONSUMER ROUTES (Public)
// ============================================================

// GET /popups - Get active popups for current page
consumerRouter.get("/", validate(consumerQuerySchema), popupController.getActivePopups);

// POST /popups/:id/subscribe - Subscribe to newsletter via popup
consumerRouter.post("/:id/subscribe", validate(subscribeNewsletterSchema), popupController.subscribeNewsletter);

// POST /popups/:id/impression - Track popup impression
consumerRouter.post("/:id/impression", validate(trackPopupEventSchema), popupController.trackImpression);

// POST /popups/:id/click - Track popup CTA click
consumerRouter.post("/:id/click", validate(trackPopupEventSchema), popupController.trackClick);

// ============================================================
// ADMIN ROUTES (Protected)
// ============================================================

// GET /admin/popups - List all popups
adminRouter.get("/", validate(adminListQuerySchema), popupController.listAllPopups);

// POST /admin/popups - Create new popup
adminRouter.post("/", validate(createPopupSchema), popupController.createPopup);

// GET /admin/popups/:id/stats - Get popup conversion statistics
adminRouter.get("/:id/stats", validate(getPopupStatsSchema), popupController.getPopupStats);

// GET /admin/popups/:id - Get popup by ID
adminRouter.get("/:id", validate(getPopupByIdSchema), popupController.getPopupById);

// PUT /admin/popups/:id - Update popup
adminRouter.put("/:id", validate(updatePopupSchema), popupController.updatePopup);

// PATCH /admin/popups/:id/activate - Activate popup
adminRouter.patch("/:id/activate", validate(getPopupByIdSchema), popupController.activatePopup);

// PATCH /admin/popups/:id/deactivate - Deactivate popup
adminRouter.patch("/:id/deactivate", validate(getPopupByIdSchema), popupController.deactivatePopup);

// DELETE /admin/popups/:id - Delete popup
adminRouter.delete("/:id", validate(getPopupByIdSchema), popupController.deletePopup);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
