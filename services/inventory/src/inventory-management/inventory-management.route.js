import { Router } from "express";
import { validate, uploadSingle } from "@shared/middlewares";
import {
  createInventorySchema,
  updateQuantitySchema,
  setThresholdSchema,
  setReorderPointSchema,
  setBackorderSchema,
  setBackorderLimitSchema,
  transferStockSchema,
} from "./inventory-management.validation.js";
import {
  createInventory,
  updateQuantity,
  setLowStockThreshold,
  setReorderPoint,
  setBackorder,
  setBackorderLimit,
  transferStock,
} from "./inventory-management.controller.js";
import { bulkUpdateStock } from "./bulk-update.controller.js";

const router = Router();

router.post("/", validate(createInventorySchema), createInventory);
router.put("/:id/quantity", validate(updateQuantitySchema), updateQuantity);
router.put("/:id/threshold", validate(setThresholdSchema), setLowStockThreshold);
router.put("/:id/reorder-point", validate(setReorderPointSchema), setReorderPoint);
router.patch("/:id/backorder", validate(setBackorderSchema), setBackorder);
router.put("/:id/backorder-limit", validate(setBackorderLimitSchema), setBackorderLimit);
router.post("/transfer", validate(transferStockSchema), transferStock);
router.post("/bulk-update", uploadSingle, bulkUpdateStock);

export default router;
