import crypto from "crypto";
import Session from "../models/session.model.js";
import { generateAccessToken, generateRefreshToken, calculateExpiryDate } from "./token.service.js";

const GUEST_TOKEN_EXPIRY = "72h"; // 72 hours matching cart expiry

/**
 * Create a new guest session
 * @param {object} deviceInfo - Device information
 * @returns {Promise<object>} Session data with tokens
 */
export const createGuestSession = async (deviceInfo) => {
  try {
    // Generate unique guest ID
    const guestId = crypto.randomUUID();

    // Generate tokens with guest user type
    const accessToken = generateAccessToken({
      userId: guestId,
      userType: "guest"
    });

    const { token: refreshToken, expiresAt: refreshTokenExpiresAt } = generateRefreshToken(
      {
        userId: guestId,
        userType: "guest",
        sessionId: null // Will be set after session creation
      },
      false
    );

    // Calculate expiry date (72 hours)
    const expiresAt = calculateExpiryDate(GUEST_TOKEN_EXPIRY);

    // Create session record
    const session = await Session.create({
      guestId,
      userId: null,
      userModel: "Guest",
      userType: "guest",
      accessToken,
      refreshToken,
      refreshTokenExpiresAt,
      deviceInfo,
      isActive: true,
      lastActivityAt: new Date(),
      expiresAt
    });

    console.log(`> Guest session created: ${session._id}, guestId: ${guestId}`);

    return {
      success: true,
      session: {
        sessionId: session._id.toString(),
        guestId,
        accessToken,
        refreshToken,
        expiresAt,
        userType: "guest"
      }
    };
  } catch (error) {
    console.log(`> Error creating guest session: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get guest session by guest ID
 * @param {string} guestId - Guest ID
 * @returns {Promise<object>} Session data
 */
export const getGuestSession = async (guestId) => {
  try {
    const session = await Session.findOne({
      guestId,
      userType: "guest",
      isActive: true
    });

    if (!session) {
      return {
        success: false,
        error: "Guest session not found"
      };
    }

    return {
      success: true,
      session
    };
  } catch (error) {
    console.log(`> Error getting guest session: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Validate guest JWT token
 * @param {string} token - JWT access token
 * @returns {Promise<object>} Validation result
 */
export const validateGuestSession = async (token) => {
  try {
    const session = await Session.findOne({
      accessToken: token,
      userType: "guest",
      isActive: true
    });

    if (!session) {
      return {
        success: false,
        error: "Invalid guest session"
      };
    }

    // Check expiry
    if (session.expiresAt < new Date()) {
      session.isActive = false;
      await session.save();

      return {
        success: false,
        error: "Guest session expired"
      };
    }

    // Update last activity
    session.lastActivityAt = new Date();
    await session.save();

    return {
      success: true,
      session: {
        sessionId: session._id.toString(),
        guestId: session.guestId,
        userType: "guest"
      }
    };
  } catch (error) {
    console.log(`> Error validating guest session: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Upgrade guest session to registered user session
 * @param {string} guestId - Guest ID
 * @param {string} userId - New user ID
 * @param {string} userModel - User model name (User/Admin)
 * @returns {Promise<object>} Result
 */
export const upgradeGuestToUser = async (guestId, userId, userModel = "User") => {
  try {
    const session = await Session.findOne({
      guestId,
      userType: "guest",
      isActive: true
    });

    if (!session) {
      return {
        success: false,
        error: "Guest session not found"
      };
    }

    // Deactivate old guest session
    session.isActive = false;
    await session.save();

    console.log(`> Guest session upgraded: ${guestId} -> ${userId}`);

    return {
      success: true,
      oldSessionId: session._id.toString()
    };
  } catch (error) {
    console.log(`> Error upgrading guest to user: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Cleanup expired guest sessions (for background job)
 * @returns {Promise<object>} Cleanup result
 */
export const cleanupExpiredGuestSessions = async () => {
  try {
    const now = new Date();

    // Find expired guest sessions
    const expiredSessions = await Session.find({
      userType: "guest",
      isActive: true,
      expiresAt: { $lt: now }
    });

    if (expiredSessions.length === 0) {
      console.log("> No expired guest sessions to cleanup");
      return {
        success: true,
        cleanedCount: 0
      };
    }

    // Mark as inactive
    const result = await Session.updateMany(
      {
        userType: "guest",
        isActive: true,
        expiresAt: { $lt: now }
      },
      {
        isActive: false
      }
    );

    console.log(`> Cleaned up ${result.modifiedCount} expired guest sessions`);

    return {
      success: true,
      cleanedCount: result.modifiedCount
    };
  } catch (error) {
    console.log(`> Error cleaning up guest sessions: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Refresh guest session token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<object>} New tokens
 */
export const refreshGuestSession = async (refreshToken) => {
  try {
    const session = await Session.findOne({
      refreshToken,
      userType: "guest",
      isActive: true
    });

    if (!session) {
      return {
        success: false,
        error: "Invalid refresh token"
      };
    }

    // Check refresh token expiry
    if (session.refreshTokenExpiresAt < new Date()) {
      session.isActive = false;
      await session.save();

      return {
        success: false,
        error: "Refresh token expired"
      };
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken({
      userId: session.guestId,
      userType: "guest"
    });

    const { token: newRefreshToken, expiresAt: newRefreshTokenExpiresAt } = generateRefreshToken(
      {
        userId: session.guestId,
        userType: "guest",
        sessionId: session._id.toString()
      },
      false
    );

    // Update session
    session.accessToken = newAccessToken;
    session.refreshToken = newRefreshToken;
    session.refreshTokenExpiresAt = newRefreshTokenExpiresAt;
    session.lastActivityAt = new Date();
    await session.save();

    console.log(`> Guest session refreshed: ${session.guestId}`);

    return {
      success: true,
      session: {
        sessionId: session._id.toString(),
        guestId: session.guestId,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: session.expiresAt,
        userType: "guest"
      }
    };
  } catch (error) {
    console.log(`> Error refreshing guest session: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  createGuestSession,
  getGuestSession,
  validateGuestSession,
  upgradeGuestToUser,
  cleanupExpiredGuestSessions,
  refreshGuestSession
};
