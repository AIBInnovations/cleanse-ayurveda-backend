import express from "express";
import { validate } from "@shared/middlewares";
import homepageSectionController from "./homepage-section.controller.js";
import {
  createSectionSchema,
  updateSectionSchema,
  getSectionByIdSchema,
  getSectionByNameSchema,
  deleteSectionSchema,
  toggleSectionSchema,
  listSectionsQuerySchema,
} from "./homepage-section.validator.js";

const consumerRouter = express.Router();
const adminRouter = express.Router();

// ============================================================
// CONSUMER ROUTES (Public)
// ============================================================

// GET /homepage-sections - Get active sections
consumerRouter.get(
  "/",
  validate(listSectionsQuerySchema),
  homepageSectionController.getActiveSections
);

// ============================================================
// ADMIN ROUTES (Protected)
// ============================================================

// GET /admin/homepage-sections - List all sections
adminRouter.get(
  "/",
  validate(listSectionsQuerySchema),
  homepageSectionController.listAllSections
);

// GET /admin/homepage-sections/by-name/:name - Get section by name (before :id route)
adminRouter.get(
  "/by-name/:name",
  validate(getSectionByNameSchema),
  homepageSectionController.getSectionByName
);

// POST /admin/homepage-sections - Create new section
adminRouter.post(
  "/",
  validate(createSectionSchema),
  homepageSectionController.createSection
);

// GET /admin/homepage-sections/:id - Get section by ID
adminRouter.get(
  "/:id",
  validate(getSectionByIdSchema),
  homepageSectionController.getSectionById
);

// PUT /admin/homepage-sections/:id - Update section
adminRouter.put(
  "/:id",
  validate(updateSectionSchema),
  homepageSectionController.updateSection
);

// PATCH /admin/homepage-sections/:id/activate - Activate section
adminRouter.patch(
  "/:id/activate",
  validate(toggleSectionSchema),
  homepageSectionController.activateSection
);

// PATCH /admin/homepage-sections/:id/deactivate - Deactivate section
adminRouter.patch(
  "/:id/deactivate",
  validate(toggleSectionSchema),
  homepageSectionController.deactivateSection
);

// DELETE /admin/homepage-sections/:id - Delete section
adminRouter.delete(
  "/:id",
  validate(deleteSectionSchema),
  homepageSectionController.deleteSection
);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
