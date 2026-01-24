import { sendResponse } from "@shared/utils";
import { HTTP_STATUS } from "../../utils/constants.js";
import * as cartMigrationService from "../../services/cart-migration.service.js";

/**
 * Internal endpoint to migrate guest cart to user account
 * @route POST /api/internal/cart/migrate
 * @access Internal (requires internal service key)
 *
 * This endpoint is called by the auth service after user registration/login
 * when a guest session is converted to a registered user session
 */
export const migrateGuestCart = async (req, res) => {
  try {
    const { guestSessionId, userId } = req.body;

    // Verify internal service key
    const internalKey = req.headers["x-internal-service-key"];
    const expectedKey = process.env.INTERNAL_SERVICE_KEY;

    if (!expectedKey || internalKey !== expectedKey) {
      console.log("> Unauthorized internal service call");
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Unauthorized",
        null,
        "Invalid internal service key"
      );
    }

    if (!guestSessionId || !userId) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Missing required parameters",
        null,
        "Both guestSessionId and userId are required"
      );
    }

    console.log(`> Internal cart migration request: guest ${guestSessionId} -> user ${userId}`);

    const result = await cartMigrationService.migrateGuestCartToUser(guestSessionId, userId);

    if (!result.success) {
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Cart migration failed",
        null,
        result.error
      );
    }

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      result.message,
      {
        migrated: result.migrated,
        itemCount: result.itemCount || 0,
        itemsMerged: result.itemsMerged || 0,
        itemsAdded: result.itemsAdded || 0
      },
      null
    );
  } catch (error) {
    console.log(`> Error in cart migration endpoint: ${error.message}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to process cart migration",
      null,
      error.message
    );
  }
};

export default {
  migrateGuestCart
};
