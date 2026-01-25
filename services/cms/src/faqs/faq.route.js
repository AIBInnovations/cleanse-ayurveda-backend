import express from "express";
import { validate } from "@shared/middlewares";
import faqController from "./faq.controller.js";
import {
  createFaqSchema,
  updateFaqSchema,
  getFaqByIdSchema,
  reorderFaqsSchema,
  consumerQuerySchema,
  adminListQuerySchema,
} from "./faq.validator.js";

const consumerRouter = express.Router();
const adminRouter = express.Router();

// ============================================================
// CONSUMER ROUTES (Public)
// ============================================================

// GET /faqs - Get all active FAQs
consumerRouter.get("/", validate(consumerQuerySchema), faqController.getActiveFaqs);

// GET /faqs/categories - Get FAQ categories with counts
consumerRouter.get("/categories", faqController.getFaqCategories);

// ============================================================
// ADMIN ROUTES (Protected)
// ============================================================

// GET /admin/faqs - List all FAQs
adminRouter.get("/", validate(adminListQuerySchema), faqController.listAllFaqs);

// PATCH /admin/faqs/reorder - Bulk reorder FAQs (before :id routes)
adminRouter.patch("/reorder", validate(reorderFaqsSchema), faqController.reorderFaqs);

// POST /admin/faqs - Create new FAQ
adminRouter.post("/", validate(createFaqSchema), faqController.createFaq);

// GET /admin/faqs/:id - Get FAQ by ID
adminRouter.get("/:id", validate(getFaqByIdSchema), faqController.getFaqById);

// PUT /admin/faqs/:id - Update FAQ
adminRouter.put("/:id", validate(updateFaqSchema), faqController.updateFaq);

// PATCH /admin/faqs/:id/activate - Activate FAQ
adminRouter.patch("/:id/activate", validate(getFaqByIdSchema), faqController.activateFaq);

// PATCH /admin/faqs/:id/deactivate - Deactivate FAQ
adminRouter.patch("/:id/deactivate", validate(getFaqByIdSchema), faqController.deactivateFaq);

// DELETE /admin/faqs/:id - Delete FAQ
adminRouter.delete("/:id", validate(getFaqByIdSchema), faqController.deleteFaq);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
