import { sendResponse } from "@shared/utils";
import { HTTP_STATUS } from "../../utils/constants.js";
import * as guestSessionService from "../../services/guest-session.service.js";

/**
 * @route POST /api/auth/guest
 * @description Create a new guest session
 * @access Public
 *
 * @requestBody
 * {
 *   "deviceInfo": {
 *     "deviceId": "...",
 *     "deviceType": "mobile",
 *     "os": "iOS",
 *     "browser": "Safari",
 *     "ip": "192.168.1.1",
 *     "userAgent": "..."
 *   }
 * }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Guest session created successfully",
 *   "data": {
 *     "sessionId": "...",
 *     "guestId": "...",
 *     "accessToken": "...",
 *     "refreshToken": "...",
 *     "expiresAt": "2024-01-04T00:00:00.000Z",
 *     "userType": "guest"
 *   },
 *   "error": null
 * }
 */
export const createGuestSession = async (req, res) => {
  console.log("> POST /api/auth/guest - Create guest session");

  try {
    const deviceInfo = req.body.deviceInfo || {
      deviceId: null,
      deviceType: "web",
      os: null,
      browser: null,
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    };

    const result = await guestSessionService.createGuestSession(deviceInfo);

    if (!result.success) {
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Failed to create guest session",
        null,
        result.error
      );
    }

    console.log(`> Guest session created: ${result.session.guestId}`);

    return sendResponse(
      res,
      HTTP_STATUS.CREATED,
      "Guest session created successfully",
      result.session
    );
  } catch (error) {
    console.log(`> Error creating guest session: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create guest session",
      null,
      error.message
    );
  }
};

/**
 * @route POST /api/auth/guest/refresh
 * @description Refresh guest session tokens
 * @access Public
 *
 * @requestBody
 * {
 *   "refreshToken": "..."
 * }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Guest session refreshed successfully",
 *   "data": {
 *     "sessionId": "...",
 *     "guestId": "...",
 *     "accessToken": "...",
 *     "refreshToken": "...",
 *     "expiresAt": "2024-01-04T00:00:00.000Z",
 *     "userType": "guest"
 *   },
 *   "error": null
 * }
 */
export const refreshGuestSession = async (req, res) => {
  console.log("> POST /api/auth/guest/refresh - Refresh guest session");

  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Refresh token is required",
        null,
        "Missing refreshToken in request body"
      );
    }

    const result = await guestSessionService.refreshGuestSession(refreshToken);

    if (!result.success) {
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Failed to refresh guest session",
        null,
        result.error
      );
    }

    console.log(`> Guest session refreshed: ${result.session.guestId}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Guest session refreshed successfully",
      result.session
    );
  } catch (error) {
    console.log(`> Error refreshing guest session: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to refresh guest session",
      null,
      error.message
    );
  }
};

export default {
  createGuestSession,
  refreshGuestSession
};
