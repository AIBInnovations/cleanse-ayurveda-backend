import { Router } from "express";
import { validate } from "@shared/middlewares";
import {
  createWarehouseSchema,
  updateWarehouseSchema,
  statusSchema,
} from "./warehouses.validation.js";
import {
  getAllWarehouses,
  createWarehouse,
  updateWarehouse,
  setDefaultWarehouse,
  updateWarehouseStatus,
  deleteWarehouse,
} from "./warehouses.controller.js";

const router = Router();

router.get("/", getAllWarehouses);
router.post("/", validate(createWarehouseSchema), createWarehouse);
router.put("/:id", validate(updateWarehouseSchema), updateWarehouse);
router.put("/:id/set-default", setDefaultWarehouse);
router.patch("/:id/status", validate(statusSchema), updateWarehouseStatus);
router.delete("/:id", deleteWarehouse);

export default router;
