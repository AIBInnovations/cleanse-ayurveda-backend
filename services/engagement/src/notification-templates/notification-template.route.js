import { Router } from "express";
import {
  listTemplates,
  createTemplate,
  getTemplateById,
  updateTemplate,
  activateTemplate,
  deactivateTemplate,
  deleteTemplate,
  previewTemplate,
} from "./notification-template.controller.js";
import { validate } from "@shared/middlewares";
import { authenticateAdmin } from "@shared/auth-middleware";
import {
  createTemplateSchema,
  updateTemplateSchema,
  templateIdParamSchema,
  listTemplatesSchema,
  previewTemplateSchema,
} from "./notification-template.validation.js";

const adminRouter = Router();

// Apply admin authentication to all routes
adminRouter.use(authenticateAdmin);

/**
 * @route GET /api/admin/notification-templates
 * @description List all notification templates
 * @access Admin
 */
adminRouter.get("/", validate(listTemplatesSchema), listTemplates);

/**
 * @route POST /api/admin/notification-templates
 * @description Create a notification template
 * @access Admin
 */
adminRouter.post("/", validate(createTemplateSchema), createTemplate);

/**
 * @route GET /api/admin/notification-templates/:id
 * @description Get template by ID
 * @access Admin
 */
adminRouter.get("/:id", validate(templateIdParamSchema), getTemplateById);

/**
 * @route PUT /api/admin/notification-templates/:id
 * @description Update a template
 * @access Admin
 */
adminRouter.put("/:id", validate(updateTemplateSchema), updateTemplate);

/**
 * @route PATCH /api/admin/notification-templates/:id/activate
 * @description Activate a template
 * @access Admin
 */
adminRouter.patch("/:id/activate", validate(templateIdParamSchema), activateTemplate);

/**
 * @route PATCH /api/admin/notification-templates/:id/deactivate
 * @description Deactivate a template
 * @access Admin
 */
adminRouter.patch("/:id/deactivate", validate(templateIdParamSchema), deactivateTemplate);

/**
 * @route DELETE /api/admin/notification-templates/:id
 * @description Delete a template
 * @access Admin
 */
adminRouter.delete("/:id", validate(templateIdParamSchema), deleteTemplate);

/**
 * @route POST /api/admin/notification-templates/:id/preview
 * @description Preview a template with variables
 * @access Admin
 */
adminRouter.post("/:id/preview", validate(previewTemplateSchema), previewTemplate);

export default {
  admin: adminRouter,
};
