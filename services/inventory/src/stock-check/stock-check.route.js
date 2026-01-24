import { Router } from "express";
import { validate } from "@shared/middlewares";
import {
  checkStockSchema,
  bulkCheckSchema,
  validateCheckoutSchema,
} from "./stock-check.validation.js";
import {
  checkStockAvailability,
  bulkCheckStock,
  validateCheckout,
  getInventoryDashboard,
  getInventoryList,
  getLowStockItems,
  getOutOfStockItems,
} from "./stock-check.controller.js";
import { exportInventoryReport } from "./export.controller.js";

const router = Router();

router.get("/check/:variantId", checkStockAvailability);
router.post("/check/bulk", validate(bulkCheckSchema), bulkCheckStock);
router.post("/validate/checkout", validate(validateCheckoutSchema), validateCheckout);

router.get("/admin/dashboard", getInventoryDashboard);
router.get("/admin", getInventoryList);
router.get("/admin/low-stock", getLowStockItems);
router.get("/admin/out-of-stock", getOutOfStockItems);
router.get("/admin/export", exportInventoryReport);

export default router;
