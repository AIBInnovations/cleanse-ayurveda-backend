import { Router } from "express";
import { sendResponse } from "@shared/utils";
import stockCheckRoutes from "./src/stock-check/stock-check.route.js";
import warehousesRoutes from "./src/warehouses/warehouses.route.js";
import inventoryManagementRoutes from "./src/inventory-management/inventory-management.route.js";
import reservationsRoutes from "./src/reservations/reservations.route.js";
import adjustmentsRoutes from "./src/adjustments/adjustments.route.js";

const router = Router();

/**
 * @route GET /api/health
 * @description Health check endpoint
 */
router.get("/health", (req, res) => {
  sendResponse(res, 200, "Server is running", { status: "ok" }, null);
});

router.use("/stock", stockCheckRoutes);
router.use("/admin/warehouses", warehousesRoutes);
router.use("/admin/inventory", inventoryManagementRoutes);
router.use("/reservations", reservationsRoutes);
router.use("/admin/adjustments", adjustmentsRoutes);

export default router;
