import { Router } from "express";
import {
  register,
  loginWithOTP,
  loginWithPassword,
  logout,
  refreshToken,
  requestPasswordReset,
  resetPassword,
} from "./user.controller.js";
import {
  registerSchema,
  loginWithOTPSchema,
  loginWithPasswordSchema,
  logoutSchema,
  refreshTokenSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  validate,
} from "./user.validator.js";
import { authenticateUser } from "../../middlewares/auth.middleware.js";

const router = Router();

/**
 * @route POST /api/auth/register
 * @description Register a new consumer user with Firebase phone verification
 * @access Public
 */
router.post("/register", validate(registerSchema), register);

/**
 * @route POST /api/auth/login/otp
 * @description Login with Firebase phone verification (OTP)
 * @access Public
 */
router.post("/login/otp", validate(loginWithOTPSchema), loginWithOTP);

/**
 * @route POST /api/auth/login/password
 * @description Login with phone/email and password
 * @access Public
 */
router.post("/login/password", validate(loginWithPasswordSchema), loginWithPassword);

/**
 * @route POST /api/auth/logout
 * @description Logout user and invalidate session
 * @access Private (authenticated)
 */
router.post("/logout", authenticateUser, validate(logoutSchema), logout);

/**
 * @route POST /api/auth/refresh
 * @description Refresh access token using refresh token
 * @access Public
 */
router.post("/refresh", validate(refreshTokenSchema), refreshToken);

/**
 * @route POST /api/auth/password/request-reset
 * @description Request password reset (client triggers Firebase OTP)
 * @access Public
 */
router.post("/password/request-reset", validate(requestPasswordResetSchema), requestPasswordReset);

/**
 * @route POST /api/auth/password/reset
 * @description Reset password after Firebase OTP verification
 * @access Public
 */
router.post("/password/reset", validate(resetPasswordSchema), resetPassword);

export default router;
