import { Router } from "express";
import { createGuestSession, refreshGuestSession } from "./guest.controller.js";
import { sendGuestPhoneOTP, confirmGuestPhone, getGuestPhoneStatus } from "./guest-phone-verification.controller.js";

const router = Router();

/**
 * @route POST /api/auth/guest
 * @description Create a new guest session
 * @access Public
 */
router.post("/", createGuestSession);

/**
 * @route POST /api/auth/guest/refresh
 * @description Refresh guest session tokens
 * @access Public
 */
router.post("/refresh", refreshGuestSession);

/**
 * @route POST /api/auth/guest/verify-phone
 * @description Send OTP for guest phone verification
 * @access Public
 */
router.post("/verify-phone", sendGuestPhoneOTP);

/**
 * @route POST /api/auth/guest/confirm-phone
 * @description Confirm guest phone with Firebase ID token
 * @access Public
 */
router.post("/confirm-phone", confirmGuestPhone);

/**
 * @route GET /api/auth/guest/phone-status
 * @description Get phone verification status for guest
 * @access Public
 */
router.get("/phone-status", getGuestPhoneStatus);

export default router;
