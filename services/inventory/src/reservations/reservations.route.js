import { Router } from "express";
import { validate } from "@shared/middlewares";
import {
  createReservationSchema,
  checkoutReservationSchema,
  convertReservationSchema,
} from "./reservations.validation.js";
import {
  createReservation,
  checkoutReservation,
  convertReservations,
  releaseCartReservations,
  getReservations,
  releaseReservationManually,
} from "./reservations.controller.js";

const router = Router();

router.post("/", validate(createReservationSchema), createReservation);
router.post("/checkout", validate(checkoutReservationSchema), checkoutReservation);
router.post("/convert", validate(convertReservationSchema), convertReservations);
router.delete("/cart/:cartId", releaseCartReservations);

router.get("/admin", getReservations);
router.delete("/admin/:id", releaseReservationManually);

export default router;
