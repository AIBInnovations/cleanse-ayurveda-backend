import express from "express";
import { validate } from "@shared/middlewares";
import navigationController from "./navigation.controller.js";
import {
  createMenuSchema,
  updateMenuSchema,
  getMenuByIdSchema,
  consumerQuerySchema,
  adminListQuerySchema,
} from "./navigation.validator.js";

const consumerRouter = express.Router();
const adminRouter = express.Router();

// ============================================================
// CONSUMER ROUTES (Public)
// ============================================================

// GET /navigation - Get all active navigation menus
consumerRouter.get("/", validate(consumerQuerySchema), navigationController.getActiveMenus);

// ============================================================
// ADMIN ROUTES (Protected)
// ============================================================

// GET /admin/navigation - List all navigation menus
adminRouter.get("/", validate(adminListQuerySchema), navigationController.listAllMenus);

// POST /admin/navigation - Create new navigation menu
adminRouter.post("/", validate(createMenuSchema), navigationController.createMenu);

// GET /admin/navigation/:id - Get navigation menu by ID
adminRouter.get("/:id", validate(getMenuByIdSchema), navigationController.getMenuById);

// PUT /admin/navigation/:id - Update navigation menu
adminRouter.put("/:id", validate(updateMenuSchema), navigationController.updateMenu);

// PATCH /admin/navigation/:id/activate - Activate navigation menu
adminRouter.patch("/:id/activate", validate(getMenuByIdSchema), navigationController.activateMenu);

// PATCH /admin/navigation/:id/deactivate - Deactivate navigation menu
adminRouter.patch("/:id/deactivate", validate(getMenuByIdSchema), navigationController.deactivateMenu);

// DELETE /admin/navigation/:id - Delete navigation menu
adminRouter.delete("/:id", validate(getMenuByIdSchema), navigationController.deleteMenu);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
