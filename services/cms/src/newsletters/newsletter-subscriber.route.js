import express from "express";
import { validate } from "@shared/middlewares";
import newsletterController from "./newsletter-subscriber.controller.js";
import {
  subscribeSchema,
  unsubscribeSchema,
  adminListQuerySchema,
  getSubscriberByIdSchema,
  deleteSubscriberSchema,
} from "./newsletter-subscriber.validator.js";

const consumerRouter = express.Router();
const adminRouter = express.Router();

// ============================================================
// CONSUMER ROUTES (Public)
// ============================================================

// POST /newsletters/subscribe - Subscribe to newsletter
consumerRouter.post("/subscribe", validate(subscribeSchema), newsletterController.subscribe);

// POST /newsletters/unsubscribe - Unsubscribe from newsletter
consumerRouter.post("/unsubscribe", validate(unsubscribeSchema), newsletterController.unsubscribe);

// ============================================================
// ADMIN ROUTES (Protected)
// ============================================================

// GET /admin/newsletters/subscribers - List all subscribers
adminRouter.get("/subscribers", validate(adminListQuerySchema), newsletterController.listAllSubscribers);

// GET /admin/newsletters/stats - Get newsletter statistics
adminRouter.get("/stats", newsletterController.getStats);

// GET /admin/newsletters/subscribers/:id - Get subscriber by ID
adminRouter.get("/subscribers/:id", validate(getSubscriberByIdSchema), newsletterController.getSubscriberById);

// DELETE /admin/newsletters/subscribers/:id - Delete subscriber
adminRouter.delete("/subscribers/:id", validate(deleteSubscriberSchema), newsletterController.deleteSubscriber);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
