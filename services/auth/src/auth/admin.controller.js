import bcrypt from "bcryptjs";
import Admin from "../../models/admin.model.js";
import Session from "../../models/session.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
} from "../../services/token.service.js";
import { logAdminAction } from "../../services/audit.service.js";
import { sendResponse } from "@shared/utils";
import { extractDeviceInfo } from "../../utils/helpers.js";
import {
  HTTP_STATUS,
  AUDIT_ACTION,
  ENTITY_TYPE,
  ADMIN_STATUS,
  SESSION_USER_TYPE,
} from "../../utils/constants.js";

/**
 * @route POST /api/admin/auth/login
 * @description Admin login with email and password
 * @access Public
 *
 * @requestBody application/json
 * { "email": "admin@example.com", "password": "password123" }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Login successful",
 *   "data": {
 *     "admin": { "_id": "...", "email": "admin@example.com", ... },
 *     "role": { "_id": "...", "name": "super_admin", ... },
 *     "accessToken": "...",
 *     "refreshToken": "...",
 *     "forcePasswordChange": false
 *   }
 * }
 *
 * @responseBody Error (401) - Invalid credentials
 * { "message": "Invalid credentials", "data": null, "error": "..." }
 *
 * @responseBody Error (403) - Account suspended
 * { "message": "Account suspended", "data": null, "error": "..." }
 */
export const login = async (req, res) => {
  console.log("> Admin login request received");
  console.log("> Request body:", {
    email: req.body.email,
    password: req.body.password ? "[REDACTED]" : undefined,
  });

  try {
    const { email, password } = req.body;

    // Find admin by email
    const admin = await Admin.findOne({ email: email.toLowerCase() }).populate("roleId");

    if (!admin) {
      console.log(`Admin not found: ${email}`);
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid credentials",
        null,
        "Invalid email or password"
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      console.log(`Invalid password for admin: ${admin._id}`);
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid credentials",
        null,
        "Invalid email or password"
      );
    }

    // Check admin status
    if (admin.status === ADMIN_STATUS.SUSPENDED) {
      console.log(`Admin suspended: ${admin._id}`);
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Account suspended",
        null,
        "Your admin account has been suspended. Please contact super admin."
      );
    }

    // Create session
    const deviceInfo = extractDeviceInfo(req);
    const accessToken = generateAccessToken({
      userId: admin._id.toString(),
      userType: SESSION_USER_TYPE.ADMIN,
      roleId: admin.roleId?._id?.toString(),
    });

    const { token: refreshToken, expiresAt } = generateRefreshToken({
      userId: admin._id.toString(),
      userType: SESSION_USER_TYPE.ADMIN,
      sessionId: null,
    });

    const session = await Session.create({
      userId: admin._id,
      userModel: "Admin",
      userType: SESSION_USER_TYPE.ADMIN,
      accessToken,
      refreshToken,
      refreshTokenExpiresAt: expiresAt,
      deviceInfo,
      isActive: true,
      lastActivityAt: new Date(),
      expiresAt,
    });

    console.log(`Admin session created: ${session._id}`);

    // Update lastLoginAt
    await Admin.findByIdAndUpdate(admin._id, { lastLoginAt: new Date() });

    // Log audit
    await logAdminAction(
      admin._id.toString(),
      AUDIT_ACTION.ADMIN_LOGIN,
      ENTITY_TYPE.ADMIN,
      admin._id.toString(),
      req,
      null
    );

    // Prepare response (exclude sensitive fields)
    const adminResponse = {
      _id: admin._id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      status: admin.status,
      forcePasswordChange: admin.forcePasswordChange,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
    };

    const roleResponse = admin.roleId
      ? {
          _id: admin.roleId._id,
          name: admin.roleId.name,
          description: admin.roleId.description,
          permissions: admin.roleId.permissions,
        }
      : null;

    console.log("> Admin login successful");
    console.log("> Response admin:", adminResponse);

    return sendResponse(res, HTTP_STATUS.OK, "Login successful", {
      admin: adminResponse,
      role: roleResponse,
      accessToken,
      refreshToken,
      forcePasswordChange: admin.forcePasswordChange,
    });
  } catch (error) {
    console.log(`Admin login error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Login failed",
      null,
      error.message
    );
  }
};

/**
 * @route POST /api/admin/auth/logout
 * @description Admin logout and invalidate session
 * @access Private (admin authenticated)
 *
 * @responseBody Success (200)
 * { "message": "Logout successful", "data": null }
 */
export const logout = async (req, res) => {
  console.log("> Admin logout request received");
  console.log("> Admin ID:", req.adminId?.toString());

  try {
    // Invalidate current session
    const session = await Session.findOneAndUpdate(
      { accessToken: req.accessToken, isActive: true },
      { isActive: false },
      { new: true }
    );

    if (!session) {
      console.log("Admin session not found or already logged out");
    } else {
      console.log(`Admin session invalidated: ${session._id}`);
    }

    // Log audit
    await logAdminAction(
      req.adminId.toString(),
      AUDIT_ACTION.ADMIN_LOGOUT,
      ENTITY_TYPE.SESSION,
      session?._id?.toString() || "unknown",
      req,
      null
    );

    console.log("> Admin logout successful");

    return sendResponse(res, HTTP_STATUS.OK, "Logout successful", null);
  } catch (error) {
    console.log(`Admin logout error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Logout failed",
      null,
      error.message
    );
  }
};

/**
 * @route POST /api/admin/auth/change-password
 * @description Change admin password
 * @access Private (admin authenticated)
 *
 * @requestBody application/json
 * { "currentPassword": "oldPassword", "newPassword": "newPassword123" }
 *
 * @responseBody Success (200)
 * { "message": "Password changed successfully", "data": null }
 *
 * @responseBody Error (401) - Invalid current password
 * { "message": "Invalid current password", "data": null, "error": "..." }
 */
export const changePassword = async (req, res) => {
  console.log("> Admin change password request received");
  console.log("> Admin ID:", req.adminId?.toString());

  try {
    const { currentPassword, newPassword } = req.body;

    // Get admin with password hash
    const admin = await Admin.findById(req.adminId);
    if (!admin) {
      console.log("Admin not found");
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Admin not found",
        null,
        "Admin account not found"
      );
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!isPasswordValid) {
      console.log(`Invalid current password for admin: ${admin._id}`);
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid current password",
        null,
        "Current password is incorrect"
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update admin password and clear forcePasswordChange if set
    await Admin.findByIdAndUpdate(admin._id, {
      passwordHash,
      forcePasswordChange: false,
    });

    console.log(`Password changed for admin: ${admin._id}`);

    // Invalidate all other sessions (keep current session)
    const result = await Session.updateMany(
      { userId: admin._id, isActive: true, _id: { $ne: req.sessionId } },
      { isActive: false }
    );

    console.log(`Invalidated ${result.modifiedCount} other sessions`);

    // Log audit
    await logAdminAction(
      admin._id.toString(),
      AUDIT_ACTION.ADMIN_PASSWORD_CHANGED,
      ENTITY_TYPE.ADMIN,
      admin._id.toString(),
      req,
      null,
      null,
      { otherSessionsInvalidated: result.modifiedCount }
    );

    console.log("> Admin password changed successfully");

    return sendResponse(res, HTTP_STATUS.OK, "Password changed successfully", null);
  } catch (error) {
    console.log(`Admin change password error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Password change failed",
      null,
      error.message
    );
  }
};

/**
 * @route POST /api/admin/auth/password/request-reset
 * @description Request admin password reset (generates reset token)
 * @access Public
 *
 * @requestBody application/json
 * { "email": "admin@example.com" }
 *
 * @responseBody Success (200)
 * { "message": "Password reset initiated", "data": null }
 *
 * Note: Returns success even if email not found (prevent enumeration)
 * In production, this would send an email with reset link
 */
export const requestPasswordReset = async (req, res) => {
  console.log("> Admin request password reset received");
  console.log("> Request body:", { email: req.body.email });

  try {
    const { email } = req.body;

    // Find admin by email
    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (admin) {
      console.log(`Admin found for password reset: ${admin._id}`);

      // Generate reset token
      const { token, expiresAt } = generatePasswordResetToken(admin._id.toString());

      // Store reset token in admin record
      await Admin.findByIdAndUpdate(admin._id, {
        passwordResetToken: token,
        passwordResetExpiresAt: expiresAt,
      });

      console.log(`Password reset token generated for admin: ${admin._id}`);

      // TODO: In production, send email with reset link
      // For now, we just log the token (should be removed in production)
      console.log(`Reset token (DEV ONLY): ${token}`);
    } else {
      console.log("Admin not found for password reset (silent)");
    }

    // Always return success to prevent email enumeration
    console.log("> Password reset initiated");

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Password reset initiated",
      { message: "If an account exists with this email, a reset link will be sent" },
      null
    );
  } catch (error) {
    console.log(`Admin request password reset error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Password reset request failed",
      null,
      error.message
    );
  }
};

/**
 * @route POST /api/admin/auth/password/reset
 * @description Reset admin password using reset token
 * @access Public
 *
 * @requestBody application/json
 * { "token": "resetToken...", "newPassword": "newPassword123" }
 *
 * @responseBody Success (200)
 * { "message": "Password reset successful", "data": null }
 *
 * @responseBody Error (401) - Invalid or expired token
 * { "message": "Invalid or expired token", "data": null, "error": "..." }
 */
export const resetPassword = async (req, res) => {
  console.log("> Admin reset password request received");
  console.log("> Request body:", {
    token: req.body.token ? "[REDACTED]" : undefined,
    newPassword: req.body.newPassword ? "[REDACTED]" : undefined,
  });

  try {
    const { token, newPassword } = req.body;

    // Verify reset token
    const decoded = verifyPasswordResetToken(token);
    if (!decoded) {
      console.log("Invalid or expired reset token");
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid or expired token",
        null,
        "Password reset token is invalid or has expired"
      );
    }

    // Find admin by ID and verify token matches
    const admin = await Admin.findOne({
      _id: decoded.adminId,
      passwordResetToken: token,
    });

    if (!admin) {
      console.log("Admin not found or token mismatch");
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid or expired token",
        null,
        "Password reset token is invalid or has expired"
      );
    }

    // Check if token is expired
    if (admin.passwordResetExpiresAt < new Date()) {
      console.log("Reset token expired");
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Token expired",
        null,
        "Password reset token has expired. Please request a new one."
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update admin password and clear reset token
    await Admin.findByIdAndUpdate(admin._id, {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      forcePasswordChange: false,
    });

    console.log(`Password reset for admin: ${admin._id}`);

    // Invalidate all existing sessions
    const result = await Session.updateMany(
      { userId: admin._id, isActive: true },
      { isActive: false }
    );

    console.log(`Invalidated ${result.modifiedCount} sessions`);

    // Log audit
    await logAdminAction(
      admin._id.toString(),
      AUDIT_ACTION.ADMIN_PASSWORD_RESET,
      ENTITY_TYPE.ADMIN,
      admin._id.toString(),
      req,
      null,
      null,
      { sessionsInvalidated: result.modifiedCount }
    );

    console.log("> Admin password reset successful");

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Password reset successful",
      { message: "Password has been reset. Please login with your new password." },
      null
    );
  } catch (error) {
    console.log(`Admin reset password error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Password reset failed",
      null,
      error.message
    );
  }
};

export default {
  login,
  logout,
  changePassword,
  requestPasswordReset,
  resetPassword,
};
