import { Router } from "express";
import {
  listRules,
  createRule,
  getRuleById,
  updateRule,
  activateRule,
  deactivateRule,
  deleteRule,
} from "./loyalty-rule.controller.js";
import { validate } from "@shared/middlewares";
import { authenticateAdmin } from "@shared/auth-middleware";
import {
  createRuleSchema,
  updateRuleSchema,
  ruleIdParamSchema,
  listRulesSchema,
} from "./loyalty-rule.validation.js";

const adminRouter = Router();

// Apply admin authentication to all routes
adminRouter.use(authenticateAdmin);

/**
 * @route GET /api/admin/loyalty/rules
 * @description List all loyalty rules
 * @access Admin
 */
adminRouter.get("/", validate(listRulesSchema), listRules);

/**
 * @route POST /api/admin/loyalty/rules
 * @description Create a loyalty rule
 * @access Admin
 */
adminRouter.post("/", validate(createRuleSchema), createRule);

/**
 * @route GET /api/admin/loyalty/rules/:id
 * @description Get rule by ID
 * @access Admin
 */
adminRouter.get("/:id", validate(ruleIdParamSchema), getRuleById);

/**
 * @route PUT /api/admin/loyalty/rules/:id
 * @description Update a rule
 * @access Admin
 */
adminRouter.put("/:id", validate(updateRuleSchema), updateRule);

/**
 * @route PATCH /api/admin/loyalty/rules/:id/activate
 * @description Activate a rule
 * @access Admin
 */
adminRouter.patch("/:id/activate", validate(ruleIdParamSchema), activateRule);

/**
 * @route PATCH /api/admin/loyalty/rules/:id/deactivate
 * @description Deactivate a rule
 * @access Admin
 */
adminRouter.patch("/:id/deactivate", validate(ruleIdParamSchema), deactivateRule);

/**
 * @route DELETE /api/admin/loyalty/rules/:id
 * @description Delete a rule
 * @access Admin
 */
adminRouter.delete("/:id", validate(ruleIdParamSchema), deleteRule);

export default {
  admin: adminRouter,
};
