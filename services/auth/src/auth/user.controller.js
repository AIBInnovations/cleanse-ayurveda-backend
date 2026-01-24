import bcrypt from "bcryptjs";
import axios from "axios";
import User from "../../models/user.model.js";
import Session from "../../models/session.model.js";
import { verifyFirebaseIdToken } from "../../services/otp.service.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../services/token.service.js";
import { logUserAction } from "../../services/audit.service.js";
import { sendResponse } from "@shared/utils";
import { extractDeviceInfo, formatPhoneNumber } from "../../utils/helpers.js";
import {
  HTTP_STATUS,
  AUDIT_ACTION,
  ENTITY_TYPE,
  USER_STATUS,
  SESSION_USER_TYPE,
} from "../../utils/constants.js";

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || "http://localhost:3003";
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY;

/**
 * @route POST /api/auth/register
 * @description Register a new consumer user with Firebase phone verification
 * @access Public
 *
 * @requestBody application/json
 * {
 *   "firebaseIdToken": "eyJhbGciOiJSUzI1NiIs...",
 *   "termsAccepted": true,
 *   "firstName": "John",
 *   "lastName": "Doe",
 *   "email": "john@example.com",
 *   "marketingConsent": false
 * }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Registration successful",
 *   "data": {
 *     "user": {
 *       "_id": "...",
 *       "phone": "+919876543210",
 *       "firstName": "John",
 *       "lastName": "Doe",
 *       "email": "john@example.com",
 *       "status": "active"
 *     },
 *     "accessToken": "eyJhbGciOiJIUzI1NiIs...",
 *     "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (400) - Validation failed
 * { "message": "Validation failed", "data": null, "error": "..." }
 *
 * @responseBody Error (401) - Invalid token
 * { "message": "Invalid Firebase token", "data": null, "error": "..." }
 *
 * @responseBody Error (409) - User exists
 * { "message": "User already registered", "data": null, "error": "..." }
 */
export const register = async (req, res) => {
  console.log("> User registration request received");
  console.log("> Request body:", {
    ...req.body,
    firebaseIdToken: req.body.firebaseIdToken ? "[REDACTED]" : undefined,
  });

  try {
    const { firebaseIdToken, termsAccepted, firstName, lastName, email, marketingConsent } =
      req.body;

    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseIdToken(firebaseIdToken);
    } catch (error) {
      console.log(`Firebase token verification failed: ${error.message}`);
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid Firebase token",
        null,
        "Phone verification failed or token expired"
      );
    }

    // Extract phone number from decoded token
    const phoneNumber = decodedToken.phone_number;
    if (!phoneNumber) {
      console.log("No phone number in Firebase token");
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Invalid token",
        null,
        "Phone number not found in token"
      );
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    console.log(`Phone from token: ${formattedPhone}`);

    // Check if user already exists
    const existingUser = await User.findOne({ phone: formattedPhone });
    if (existingUser) {
      console.log(`User already exists with phone: ${formattedPhone}`);

      if (existingUser.status === USER_STATUS.ACTIVE) {
        return sendResponse(
          res,
          HTTP_STATUS.CONFLICT,
          "User already registered",
          null,
          "An account with this phone number already exists. Please login instead."
        );
      }

      if (existingUser.status === USER_STATUS.SUSPENDED) {
        return sendResponse(
          res,
          HTTP_STATUS.FORBIDDEN,
          "Account suspended",
          null,
          "Your account has been suspended. Please contact support."
        );
      }

      if (existingUser.status === USER_STATUS.DELETED) {
        return sendResponse(
          res,
          HTTP_STATUS.FORBIDDEN,
          "Account deleted",
          null,
          "This account has been deleted. Please contact support to restore."
        );
      }
    }

    // Check if email is already in use (if provided)
    if (email) {
      const emailExists = await User.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        console.log(`Email already in use: ${email}`);
        return sendResponse(
          res,
          HTTP_STATUS.CONFLICT,
          "Email already in use",
          null,
          "An account with this email already exists"
        );
      }
    }

    // Create user
    const user = await User.create({
      firebaseUid: decodedToken.uid,
      phone: formattedPhone,
      phoneVerified: true,
      firstName: firstName || null,
      lastName: lastName || null,
      email: email ? email.toLowerCase() : null,
      emailVerified: false,
      marketingConsent: marketingConsent || false,
      termsAcceptedAt: termsAccepted ? new Date() : null,
      status: USER_STATUS.ACTIVE,
    });

    console.log(`User created: ${user._id}`);

    // Create session
    const deviceInfo = extractDeviceInfo(req);
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      userType: SESSION_USER_TYPE.CONSUMER,
    });

    const { token: refreshToken, expiresAt } = generateRefreshToken({
      userId: user._id.toString(),
      userType: SESSION_USER_TYPE.CONSUMER,
      sessionId: null, // Will be updated after session creation
    });

    const session = await Session.create({
      userId: user._id,
      userModel: "User",
      userType: SESSION_USER_TYPE.CONSUMER,
      accessToken,
      refreshToken,
      refreshTokenExpiresAt: expiresAt,
      deviceInfo,
      isActive: true,
      lastActivityAt: new Date(),
      expiresAt,
    });

    console.log(`Session created: ${session._id}`);

    // Migrate guest cart if guest session exists
    const guestId = req.guestId || req.headers["x-guest-id"];
    if (guestId) {
      console.log(`> Attempting to migrate guest cart from ${guestId} to user ${user._id}`);
      try {
        const migrationResponse = await axios.post(
          `${ORDER_SERVICE_URL}/api/internal/cart/migrate`,
          {
            guestSessionId: guestId,
            userId: user._id.toString()
          },
          {
            headers: {
              "x-internal-service-key": INTERNAL_SERVICE_KEY,
              "Content-Type": "application/json"
            },
            timeout: 5000
          }
        );

        if (migrationResponse.data?.data?.migrated) {
          console.log(`> Cart migration successful: ${migrationResponse.data.data.itemCount} items migrated`);
        } else {
          console.log(`> No cart to migrate: ${migrationResponse.data?.message}`);
        }
      } catch (error) {
        // Non-blocking: log error but don't fail registration
        console.log(`> Cart migration failed (non-blocking): ${error.message}`);
      }
    }

    // Log audit
    await logUserAction(
      user._id.toString(),
      AUDIT_ACTION.USER_REGISTERED,
      ENTITY_TYPE.USER,
      user._id.toString(),
      req,
      { phone: formattedPhone }
    );

    // Prepare response (exclude sensitive fields)
    const userResponse = {
      _id: user._id,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      avatar: user.avatar,
      status: user.status,
      createdAt: user.createdAt,
    };

    console.log("> Registration successful");
    console.log("> Response user:", userResponse);

    return sendResponse(res, HTTP_STATUS.CREATED, "Registration successful", {
      user: userResponse,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.log(`Registration error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Registration failed",
      null,
      error.message
    );
  }
};

/**
 * @route POST /api/auth/login/otp
 * @description Login with Firebase phone verification (OTP)
 * @access Public
 *
 * @requestBody application/json
 * { "firebaseIdToken": "eyJhbGciOiJSUzI1NiIs..." }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Login successful",
 *   "data": {
 *     "user": { "_id": "...", "phone": "+919876543210", ... },
 *     "accessToken": "...",
 *     "refreshToken": "..."
 *   }
 * }
 *
 * @responseBody Error (401) - Invalid token
 * { "message": "Invalid Firebase token", "data": null, "error": "..." }
 *
 * @responseBody Error (404) - User not found
 * { "message": "User not registered", "data": null, "error": "..." }
 */
export const loginWithOTP = async (req, res) => {
  console.log("> Login with OTP request received");
  console.log("> Request body:", {
    firebaseIdToken: req.body.firebaseIdToken ? "[REDACTED]" : undefined,
  });

  try {
    const { firebaseIdToken } = req.body;

    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseIdToken(firebaseIdToken);
    } catch (error) {
      console.log(`Firebase token verification failed: ${error.message}`);
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid Firebase token",
        null,
        "Phone verification failed or token expired"
      );
    }

    // Extract phone number from decoded token
    const phoneNumber = decodedToken.phone_number;
    if (!phoneNumber) {
      console.log("No phone number in Firebase token");
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Invalid token",
        null,
        "Phone number not found in token"
      );
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    console.log(`Phone from token: ${formattedPhone}`);

    // Find user by phone
    const user = await User.findOne({ phone: formattedPhone });
    if (!user) {
      console.log(`User not found with phone: ${formattedPhone}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "User not registered",
        null,
        "No account found with this phone number. Please register first."
      );
    }

    // Check user status
    if (user.status === USER_STATUS.SUSPENDED) {
      console.log(`User suspended: ${user._id}`);
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Account suspended",
        null,
        "Your account has been suspended. Please contact support."
      );
    }

    if (user.status === USER_STATUS.DELETED) {
      console.log(`User deleted: ${user._id}`);
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Account deleted",
        null,
        "This account has been deleted. Please contact support to restore."
      );
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save();

    // Create session
    const deviceInfo = extractDeviceInfo(req);
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      userType: SESSION_USER_TYPE.CONSUMER,
    });

    const { token: refreshToken, expiresAt } = generateRefreshToken({
      userId: user._id.toString(),
      userType: SESSION_USER_TYPE.CONSUMER,
      sessionId: null,
    });

    const session = await Session.create({
      userId: user._id,
      userModel: "User",
      userType: SESSION_USER_TYPE.CONSUMER,
      accessToken,
      refreshToken,
      refreshTokenExpiresAt: expiresAt,
      deviceInfo,
      isActive: true,
      lastActivityAt: new Date(),
      expiresAt,
    });

    console.log(`Session created: ${session._id}`);

    // Migrate guest cart if guest session exists
    const guestId = req.guestId || req.headers["x-guest-id"];
    if (guestId) {
      console.log(`> Attempting to migrate guest cart from ${guestId} to user ${user._id}`);
      try {
        const migrationResponse = await axios.post(
          `${ORDER_SERVICE_URL}/api/internal/cart/migrate`,
          {
            guestSessionId: guestId,
            userId: user._id.toString()
          },
          {
            headers: {
              "x-internal-service-key": INTERNAL_SERVICE_KEY,
              "Content-Type": "application/json"
            },
            timeout: 5000
          }
        );

        if (migrationResponse.data?.data?.migrated) {
          console.log(`> Cart migration successful: ${migrationResponse.data.data.itemCount} items migrated`);
        } else {
          console.log(`> No cart to migrate: ${migrationResponse.data?.message}`);
        }
      } catch (error) {
        // Non-blocking: log error but don't fail login
        console.log(`> Cart migration failed (non-blocking): ${error.message}`);
      }
    }

    // Log audit
    await logUserAction(
      user._id.toString(),
      AUDIT_ACTION.USER_LOGIN,
      ENTITY_TYPE.USER,
      user._id.toString(),
      req,
      { method: "otp", phone: formattedPhone }
    );

    // Prepare response
    const userResponse = {
      _id: user._id,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      avatar: user.avatar,
      status: user.status,
      createdAt: user.createdAt,
    };

    console.log("> Login successful");
    console.log("> Response user:", userResponse);

    return sendResponse(res, HTTP_STATUS.OK, "Login successful", {
      user: userResponse,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.log(`Login error: ${error.message}`);
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
 * @route POST /api/auth/login/password
 * @description Login with phone/email and password
 * @access Public
 *
 * @requestBody application/json
 * { "phone": "+919876543210", "password": "password123" }
 * OR
 * { "email": "john@example.com", "password": "password123" }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Login successful",
 *   "data": {
 *     "user": { "_id": "...", "phone": "+919876543210", ... },
 *     "accessToken": "...",
 *     "refreshToken": "..."
 *   }
 * }
 *
 * @responseBody Error (401) - Invalid credentials
 * { "message": "Invalid credentials", "data": null, "error": "..." }
 */
export const loginWithPassword = async (req, res) => {
  console.log("> Login with password request received");
  console.log("> Request body:", {
    phone: req.body.phone || undefined,
    email: req.body.email || undefined,
    password: req.body.password ? "[REDACTED]" : undefined,
  });

  try {
    const { phone, email, password } = req.body;

    // Find user by phone or email
    let user;
    if (phone) {
      const formattedPhone = formatPhoneNumber(phone);
      user = await User.findOne({ phone: formattedPhone });
    } else if (email) {
      user = await User.findOne({ email: email.toLowerCase() });
    }

    if (!user) {
      console.log("User not found");
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid credentials",
        null,
        "Invalid phone/email or password"
      );
    }

    // Check if user has password set
    if (!user.passwordHash) {
      console.log(`User ${user._id} has no password set`);
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Password not set",
        null,
        "Password login is not enabled for this account. Please login with OTP."
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      console.log(`Invalid password for user: ${user._id}`);
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid credentials",
        null,
        "Invalid phone/email or password"
      );
    }

    // Check user status
    if (user.status === USER_STATUS.SUSPENDED) {
      console.log(`User suspended: ${user._id}`);
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Account suspended",
        null,
        "Your account has been suspended. Please contact support."
      );
    }

    if (user.status === USER_STATUS.DELETED) {
      console.log(`User deleted: ${user._id}`);
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Account deleted",
        null,
        "This account has been deleted. Please contact support to restore."
      );
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save();

    // Create session
    const deviceInfo = extractDeviceInfo(req);
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      userType: SESSION_USER_TYPE.CONSUMER,
    });

    const { token: refreshToken, expiresAt } = generateRefreshToken({
      userId: user._id.toString(),
      userType: SESSION_USER_TYPE.CONSUMER,
      sessionId: null,
    });

    const session = await Session.create({
      userId: user._id,
      userModel: "User",
      userType: SESSION_USER_TYPE.CONSUMER,
      accessToken,
      refreshToken,
      refreshTokenExpiresAt: expiresAt,
      deviceInfo,
      isActive: true,
      lastActivityAt: new Date(),
      expiresAt,
    });

    console.log(`Session created: ${session._id}`);

    // Migrate guest cart if guest session exists
    const guestId = req.guestId || req.headers["x-guest-id"];
    if (guestId) {
      console.log(`> Attempting to migrate guest cart from ${guestId} to user ${user._id}`);
      try {
        const migrationResponse = await axios.post(
          `${ORDER_SERVICE_URL}/api/internal/cart/migrate`,
          {
            guestSessionId: guestId,
            userId: user._id.toString()
          },
          {
            headers: {
              "x-internal-service-key": INTERNAL_SERVICE_KEY,
              "Content-Type": "application/json"
            },
            timeout: 5000
          }
        );

        if (migrationResponse.data?.data?.migrated) {
          console.log(`> Cart migration successful: ${migrationResponse.data.data.itemCount} items migrated`);
        } else {
          console.log(`> No cart to migrate: ${migrationResponse.data?.message}`);
        }
      } catch (error) {
        // Non-blocking: log error but don't fail login
        console.log(`> Cart migration failed (non-blocking): ${error.message}`);
      }
    }

    // Log audit
    await logUserAction(
      user._id.toString(),
      AUDIT_ACTION.USER_LOGIN,
      ENTITY_TYPE.USER,
      user._id.toString(),
      req,
      { method: "password" }
    );

    // Prepare response
    const userResponse = {
      _id: user._id,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      avatar: user.avatar,
      status: user.status,
      createdAt: user.createdAt,
    };

    console.log("> Login successful");
    console.log("> Response user:", userResponse);

    return sendResponse(res, HTTP_STATUS.OK, "Login successful", {
      user: userResponse,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.log(`Login error: ${error.message}`);
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
 * @route POST /api/auth/logout
 * @description Logout user and invalidate session
 * @access Private (authenticated)
 *
 * @requestBody application/json
 * { "refreshToken": "..." } (optional, for specific session logout)
 *
 * @responseBody Success (200)
 * { "message": "Logout successful", "data": null, "error": null }
 */
export const logout = async (req, res) => {
  console.log("> Logout request received");
  console.log("> User ID:", req.userId?.toString());

  try {
    const { refreshToken } = req.body;

    let session;
    if (refreshToken) {
      // Logout specific session by refresh token
      session = await Session.findOneAndUpdate(
        { refreshToken, userId: req.userId, isActive: true },
        { isActive: false },
        { new: true }
      );
    } else {
      // Logout current session
      session = await Session.findOneAndUpdate(
        { accessToken: req.accessToken, isActive: true },
        { isActive: false },
        { new: true }
      );
    }

    if (!session) {
      console.log("Session not found or already logged out");
    } else {
      console.log(`Session invalidated: ${session._id}`);
    }

    // Log audit
    await logUserAction(
      req.userId.toString(),
      AUDIT_ACTION.USER_LOGOUT,
      ENTITY_TYPE.SESSION,
      session?._id?.toString() || "unknown",
      req,
      null
    );

    console.log("> Logout successful");

    return sendResponse(res, HTTP_STATUS.OK, "Logout successful", null);
  } catch (error) {
    console.log(`Logout error: ${error.message}`);
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
 * @route POST /api/auth/refresh
 * @description Refresh access token using refresh token
 * @access Public
 *
 * @requestBody application/json
 * { "refreshToken": "eyJhbGciOiJIUzI1NiIs..." }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Token refreshed",
 *   "data": { "accessToken": "...", "refreshToken": "..." }
 * }
 *
 * @responseBody Error (401) - Invalid or expired token
 * { "message": "Invalid refresh token", "data": null, "error": "..." }
 */
export const refreshToken = async (req, res) => {
  console.log("> Refresh token request received");

  try {
    const { refreshToken: oldRefreshToken } = req.body;

    // Verify refresh token
    const decoded = verifyRefreshToken(oldRefreshToken);
    if (!decoded) {
      console.log("Invalid or expired refresh token");
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid refresh token",
        null,
        "Token is invalid or expired"
      );
    }

    // Find session by refresh token
    const session = await Session.findOne({
      refreshToken: oldRefreshToken,
      isActive: true,
    });

    if (!session) {
      console.log("Session not found or inactive");
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Session expired",
        null,
        "Session has been terminated. Please login again."
      );
    }

    // Check if refresh token is expired
    if (session.refreshTokenExpiresAt < new Date()) {
      console.log("Refresh token expired");
      await Session.findByIdAndUpdate(session._id, { isActive: false });
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Session expired",
        null,
        "Refresh token has expired. Please login again."
      );
    }

    // Verify user still exists and is active
    const user = await User.findById(session.userId);
    if (!user || user.status !== USER_STATUS.ACTIVE) {
      console.log("User not found or inactive");
      await Session.findByIdAndUpdate(session._id, { isActive: false });
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Account not active",
        null,
        "User account is not active"
      );
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken({
      userId: user._id.toString(),
      userType: SESSION_USER_TYPE.CONSUMER,
    });

    const { token: newRefreshToken, expiresAt } = generateRefreshToken({
      userId: user._id.toString(),
      userType: SESSION_USER_TYPE.CONSUMER,
      sessionId: session._id.toString(),
    });

    // Update session
    await Session.findByIdAndUpdate(session._id, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      refreshTokenExpiresAt: expiresAt,
      lastActivityAt: new Date(),
      expiresAt,
    });

    console.log(`Session refreshed: ${session._id}`);
    console.log("> Token refresh successful");

    return sendResponse(res, HTTP_STATUS.OK, "Token refreshed", {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.log(`Refresh token error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Token refresh failed",
      null,
      error.message
    );
  }
};

/**
 * @route POST /api/auth/password/request-reset
 * @description Request password reset (client triggers Firebase OTP)
 * @access Public
 *
 * @requestBody application/json
 * { "phone": "+919876543210" }
 *
 * @responseBody Success (200)
 * { "message": "Password reset initiated", "data": null }
 *
 * Note: Returns success even if phone not found (prevent enumeration)
 */
export const requestPasswordReset = async (req, res) => {
  console.log("> Request password reset received");
  console.log("> Request body:", { phone: req.body.phone });

  try {
    const { phone } = req.body;
    const formattedPhone = formatPhoneNumber(phone);

    // Check if user exists (but don't reveal in response)
    const user = await User.findOne({ phone: formattedPhone });
    if (user) {
      console.log(`User found for password reset: ${user._id}`);
    } else {
      console.log("User not found for password reset (silent)");
    }

    // Always return success to prevent phone enumeration
    // Client will trigger Firebase OTP independently
    console.log("> Password reset initiated");

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Password reset initiated",
      { message: "If an account exists with this phone, you can verify via OTP" },
      null
    );
  } catch (error) {
    console.log(`Request password reset error: ${error.message}`);
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
 * @route POST /api/auth/password/reset
 * @description Reset password after Firebase OTP verification
 * @access Public
 *
 * @requestBody application/json
 * { "firebaseIdToken": "...", "newPassword": "newPassword123" }
 *
 * @responseBody Success (200)
 * { "message": "Password reset successful", "data": null }
 *
 * @responseBody Error (401) - Invalid token
 * { "message": "Invalid Firebase token", "data": null, "error": "..." }
 *
 * @responseBody Error (404) - User not found
 * { "message": "User not found", "data": null, "error": "..." }
 */
export const resetPassword = async (req, res) => {
  console.log("> Reset password request received");
  console.log("> Request body:", {
    firebaseIdToken: req.body.firebaseIdToken ? "[REDACTED]" : undefined,
    newPassword: req.body.newPassword ? "[REDACTED]" : undefined,
  });

  try {
    const { firebaseIdToken, newPassword } = req.body;

    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseIdToken(firebaseIdToken);
    } catch (error) {
      console.log(`Firebase token verification failed: ${error.message}`);
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid Firebase token",
        null,
        "Phone verification failed or token expired"
      );
    }

    // Extract phone number from decoded token
    const phoneNumber = decodedToken.phone_number;
    if (!phoneNumber) {
      console.log("No phone number in Firebase token");
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Invalid token",
        null,
        "Phone number not found in token"
      );
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Find user by phone
    const user = await User.findOne({ phone: formattedPhone });
    if (!user) {
      console.log(`User not found with phone: ${formattedPhone}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "User not found",
        null,
        "No account found with this phone number"
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update user password
    await User.findByIdAndUpdate(user._id, { passwordHash });

    console.log(`Password updated for user: ${user._id}`);

    // Invalidate all existing sessions
    const result = await Session.updateMany(
      { userId: user._id, isActive: true },
      { isActive: false }
    );

    console.log(`Invalidated ${result.modifiedCount} sessions`);

    // Log audit
    await logUserAction(
      user._id.toString(),
      AUDIT_ACTION.USER_PASSWORD_RESET,
      ENTITY_TYPE.USER,
      user._id.toString(),
      req,
      { sessionsInvalidated: result.modifiedCount }
    );

    console.log("> Password reset successful");

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Password reset successful",
      { message: "Password has been reset. Please login with your new password." },
      null
    );
  } catch (error) {
    console.log(`Reset password error: ${error.message}`);
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
  register,
  loginWithOTP,
  loginWithPassword,
  logout,
  refreshToken,
  requestPasswordReset,
  resetPassword,
};
