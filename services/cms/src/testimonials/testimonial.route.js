import express from "express";
import { validate } from "@shared/middlewares";
import testimonialController from "./testimonial.controller.js";
import {
  createTestimonialSchema,
  updateTestimonialSchema,
  getTestimonialByIdSchema,
  reorderTestimonialsSchema,
  consumerQuerySchema,
  adminListQuerySchema,
} from "./testimonial.validator.js";

const consumerRouter = express.Router();
const adminRouter = express.Router();

// ============================================================
// CONSUMER ROUTES (Public)
// ============================================================

// GET /testimonials - Get active testimonials
consumerRouter.get("/", validate(consumerQuerySchema), testimonialController.getActiveTestimonials);

// GET /testimonials/featured - Get featured testimonials
consumerRouter.get("/featured", testimonialController.getFeaturedTestimonials);

// ============================================================
// ADMIN ROUTES (Protected)
// ============================================================

// GET /admin/testimonials - List all testimonials
adminRouter.get("/", validate(adminListQuerySchema), testimonialController.listAllTestimonials);

// PATCH /admin/testimonials/reorder - Reorder testimonials (before :id routes)
adminRouter.patch("/reorder", validate(reorderTestimonialsSchema), testimonialController.reorderTestimonials);

// POST /admin/testimonials - Create new testimonial
adminRouter.post("/", validate(createTestimonialSchema), testimonialController.createTestimonial);

// GET /admin/testimonials/:id - Get testimonial by ID
adminRouter.get("/:id", validate(getTestimonialByIdSchema), testimonialController.getTestimonialById);

// PUT /admin/testimonials/:id - Update testimonial
adminRouter.put("/:id", validate(updateTestimonialSchema), testimonialController.updateTestimonial);

// PATCH /admin/testimonials/:id/activate - Activate testimonial
adminRouter.patch("/:id/activate", validate(getTestimonialByIdSchema), testimonialController.activateTestimonial);

// PATCH /admin/testimonials/:id/deactivate - Deactivate testimonial
adminRouter.patch("/:id/deactivate", validate(getTestimonialByIdSchema), testimonialController.deactivateTestimonial);

// PATCH /admin/testimonials/:id/feature - Toggle featured status
adminRouter.patch("/:id/feature", validate(getTestimonialByIdSchema), testimonialController.toggleFeatured);

// DELETE /admin/testimonials/:id - Delete testimonial
adminRouter.delete("/:id", validate(getTestimonialByIdSchema), testimonialController.deleteTestimonial);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
