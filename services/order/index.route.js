import { Router } from "express";
import { sendResponse } from "@shared/utils";
import * as cartRoutes from "./src/cart/cart.route.js";
import * as checkoutRoutes from "./src/checkout/checkout.route.js";
import * as ordersRoutes from "./src/orders/orders.route.js";
import * as paymentsRoutes from "./src/payments/payments.route.js";
import * as refundsRoutes from "./src/refunds/refunds.route.js";
import * as returnsRoutes from "./src/returns/returns.route.js";
import * as invoicesRoutes from "./src/invoices/invoices.route.js";

const router = Router();

/**
 * @route GET /api/health
 * @description Health check endpoint
 */
router.get("/health", (req, res) => {
  sendResponse(res, 200, "Server is running", { status: "ok" }, null);
});

/**
 * Webhook Routes (No Authentication)
 */
router.use("/webhooks", paymentsRoutes.webhook);

/**
 * Consumer Routes
 */
router.use("/cart", cartRoutes.consumer);
router.use("/checkout", checkoutRoutes.consumer);
router.use("/orders", ordersRoutes.consumer);
router.use("/payments", paymentsRoutes.consumer);
router.use("/refunds", refundsRoutes.consumer);
router.use("/returns", returnsRoutes.consumer);
router.use("/invoices", invoicesRoutes.consumer);

/**
 * Admin Routes
 */
router.use("/admin/cart", cartRoutes.admin);
router.use("/admin/checkout", checkoutRoutes.admin);
router.use("/admin/orders", ordersRoutes.admin);
router.use("/admin/payments", paymentsRoutes.admin);
router.use("/admin/refunds", refundsRoutes.admin);
router.use("/admin/returns", returnsRoutes.admin);
router.use("/admin/invoices", invoicesRoutes.admin);

export default router;
