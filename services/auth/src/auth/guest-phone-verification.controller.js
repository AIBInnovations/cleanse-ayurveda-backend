import { sendResponse } from "@shared/utils";
import { HTTP_STATUS } from "../utils/constants.js";
import Session from "../models/session.model.js";

/**
 * Send OTP to guest's phone for verification
 * @route POST /api/auth/guest/verify-phone
 * @access Public (but requires guest session token)
 *
 * Note: Actual OTP sending is done on the client side using Firebase Authentication
 * This endpoint is for recording the phone number associated with the guest session
 */
export const sendGuestPhoneOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    const guestId = req.guestId; // From auth middleware

    if (!phone) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Phone number is required",
        null,
        "Missing phone number in request body"
      );
    }

    if (!guestId) {
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Guest session required",
        null,
        "Valid guest session token is required"
      );
    }

    console.log(`> Recording phone for guest verification: ${guestId}`);

    // Find guest session
    const session = await Session.findOne({
      guestId,
      userType: "guest",
      isActive: true
    });

    if (!session) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Guest session not found",
        null,
        "Invalid or expired guest session"
      );
    }

    // Store the phone number (not verified yet)
    session.metadata = session.metadata || {};
    session.metadata.pendingPhone = phone;
    session.metadata.phoneVerificationInitiatedAt = new Date();
    await session.save();

    console.log(`> Phone OTP verification initiated for guest: ${guestId}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Phone verification initiated",
      {
        phone,
        message: "Please verify the OTP sent to your phone"
      },
      null
    );
  } catch (error) {
    console.log(`> Error initiating phone verification: ${error.message}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to initiate phone verification",
      null,
      error.message
    );
  }
};

/**
 * Verify OTP and associate phone with guest session
 * @route POST /api/auth/guest/confirm-phone
 * @access Public (but requires guest session token)
 *
 * Note: Actual OTP verification is done on the client side using Firebase Authentication
 * This endpoint confirms that the phone was verified and associates it with the guest session
 */
export const confirmGuestPhone = async (req, res) => {
  try {
    const { phone, firebaseIdToken } = req.body;
    const guestId = req.guestId; // From auth middleware

    if (!phone || !firebaseIdToken) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Phone and Firebase ID token are required",
        null,
        "Missing required fields in request body"
      );
    }

    if (!guestId) {
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Guest session required",
        null,
        "Valid guest session token is required"
      );
    }

    console.log(`> Confirming phone verification for guest: ${guestId}`);

    // Find guest session
    const session = await Session.findOne({
      guestId,
      userType: "guest",
      isActive: true
    });

    if (!session) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Guest session not found",
        null,
        "Invalid or expired guest session"
      );
    }

    // Verify the phone matches what was initiated
    if (session.metadata?.pendingPhone !== phone) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Phone number mismatch",
        null,
        "The phone number does not match the one used for verification"
      );
    }

    // TODO: Optionally verify firebaseIdToken with Firebase Admin SDK here
    // For now, we trust the client-side verification

    // Update session with verified phone
    session.metadata = session.metadata || {};
    session.metadata.verifiedPhone = phone;
    session.metadata.phoneVerifiedAt = new Date();
    delete session.metadata.pendingPhone;
    delete session.metadata.phoneVerificationInitiatedAt;
    await session.save();

    console.log(`> Phone verified successfully for guest: ${guestId}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Phone verified successfully",
      {
        phone,
        verified: true,
        verifiedAt: session.metadata.phoneVerifiedAt
      },
      null
    );
  } catch (error) {
    console.log(`> Error confirming phone verification: ${error.message}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to confirm phone verification",
      null,
      error.message
    );
  }
};

/**
 * Get guest phone verification status
 * @route GET /api/auth/guest/phone-status
 * @access Public (but requires guest session token)
 */
export const getGuestPhoneStatus = async (req, res) => {
  try {
    const guestId = req.guestId; // From auth middleware

    if (!guestId) {
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Guest session required",
        null,
        "Valid guest session token is required"
      );
    }

    // Find guest session
    const session = await Session.findOne({
      guestId,
      userType: "guest",
      isActive: true
    });

    if (!session) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Guest session not found",
        null,
        "Invalid or expired guest session"
      );
    }

    const phoneVerified = !!session.metadata?.verifiedPhone;
    const phone = session.metadata?.verifiedPhone || session.metadata?.pendingPhone || null;

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Phone status retrieved",
      {
        phoneVerified,
        phone,
        verifiedAt: session.metadata?.phoneVerifiedAt || null
      },
      null
    );
  } catch (error) {
    console.log(`> Error getting phone status: ${error.message}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to get phone status",
      null,
      error.message
    );
  }
};

export default {
  sendGuestPhoneOTP,
  confirmGuestPhone,
  getGuestPhoneStatus
};
