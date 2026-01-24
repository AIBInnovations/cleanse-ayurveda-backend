import { CheckoutSession } from "../../models/checkoutSession.model.js";
import { CHECKOUT_STATUS } from "../../utils/constants.js";

/**
 * Checkout Session Expiry Job
 * Marks expired checkout sessions as expired
 * Runs every hour
 */
export async function checkoutExpiryJob() {
  try {
    console.log("> Running checkout session expiry job...");

    const now = new Date();

    // Find checkout sessions in progress that have expired
    const expiredSessions = await CheckoutSession.find({
      status: {
        $in: [
          CHECKOUT_STATUS.INITIATED,
          CHECKOUT_STATUS.ADDRESS_ENTERED,
          CHECKOUT_STATUS.PAYMENT_PENDING
        ]
      },
      expiresAt: { $lt: now }
    });

    if (expiredSessions.length === 0) {
      console.log("> No expired checkout sessions found");
      return { success: true, expiredCount: 0 };
    }

    console.log(`> Found ${expiredSessions.length} expired checkout sessions`);

    // Update sessions to expired status
    const updateResult = await CheckoutSession.updateMany(
      {
        status: {
          $in: [
            CHECKOUT_STATUS.INITIATED,
            CHECKOUT_STATUS.ADDRESS_ENTERED,
            CHECKOUT_STATUS.PAYMENT_PENDING
          ]
        },
        expiresAt: { $lt: now }
      },
      {
        $set: { status: CHECKOUT_STATUS.EXPIRED }
      }
    );

    console.log(`> Marked ${updateResult.modifiedCount} sessions as expired`);
    console.log("> Checkout session expiry job completed successfully");

    return {
      success: true,
      expiredCount: updateResult.modifiedCount
    };
  } catch (error) {
    console.error("> Error in checkout session expiry job:", error);
    return { success: false, error: error.message };
  }
}
