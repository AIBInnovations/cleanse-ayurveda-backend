import { Router } from "express";
import { validate } from "@shared/middlewares";
import {
  restockSchema,
  damageSchema,
  correctionSchema,
} from "./adjustments.validation.js";
import {
  recordRestock,
  recordDamage,
  recordCorrection,
  getAdjustments,
  getInventoryAdjustmentHistory,
} from "./adjustments.controller.js";
import { exportAdjustmentReport } from "./export.controller.js";

const router = Router();

router.post("/restock", validate(restockSchema), recordRestock);
router.post("/damage", validate(damageSchema), recordDamage);
router.post("/correction", validate(correctionSchema), recordCorrection);
router.get("/", getAdjustments);
router.get("/inventory/:inventoryId", getInventoryAdjustmentHistory);
router.get("/export", exportAdjustmentReport);

export default router;
