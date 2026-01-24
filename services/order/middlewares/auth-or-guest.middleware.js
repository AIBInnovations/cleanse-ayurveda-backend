import { sendResponse, HTTP_STATUS } from "@shared/utils";

/**
 * Middleware to authenticate user or guest from gateway headers
 * Reads x-user-id, x-guest-id, and x-user-type headers set by gateway
 */
export const requireAuthOrGuest = (req, res, next) => {
  try {
    // Extract headers forwarded by gateway
    const userId = req.headers["x-user-id"];
    const guestId = req.headers["x-guest-id"];
    const userType = req.headers["x-user-type"];

    // Require either userId or guestId
    if (!userId && !guestId) {
      console.log("> Authentication required: No user ID or guest ID provided");
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Authentication required",
        null,
        "No authentication credentials provided"
      );
    }

    // Attach to request object
    req.userId = userId || null;
    req.guestId = guestId || null;
    req.userType = userType || (guestId ? "guest" : "consumer");

    // For backward compatibility with existing code using req.user
    if (userId) {
      req.user = { id: userId };
    }

    console.log(`> Authenticated ${userType || "user"}:`, userId || guestId);
    next();
  } catch (error) {
    console.log("> Error in auth or guest middleware:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Authentication error",
      null,
      error.message
    );
  }
};

export default requireAuthOrGuest;
