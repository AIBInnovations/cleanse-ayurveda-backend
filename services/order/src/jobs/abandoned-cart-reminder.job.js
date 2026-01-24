import { Cart } from "../../models/cart.model.js";
import { CartItem } from "../../models/cartItem.model.js";
import { sendEmail } from "../../services/engagement-integration.service.js";
import { getUserById } from "../../services/user-integration.service.js";

/**
 * Abandoned Cart Reminder Job
 * Sends reminder emails for abandoned carts
 * Runs every 6 hours
 */
export async function abandonedCartReminderJob() {
  try {
    console.log("> Running abandoned cart reminder job...");

    // Get abandoned cart threshold from environment (default: 24 hours)
    const abandonedThresholdHours = parseInt(process.env.ABANDONED_CART_THRESHOLD_HOURS) || 24;
    const reminderWindowHours = parseInt(process.env.ABANDONED_CART_REMINDER_WINDOW_HOURS) || 72; // 3 days

    const now = new Date();
    const abandonedAfter = new Date(now.getTime() - abandonedThresholdHours * 60 * 60 * 1000);
    const abandonedBefore = new Date(now.getTime() - reminderWindowHours * 60 * 60 * 1000);

    console.log(
      `> Looking for carts abandoned between ${abandonedBefore.toISOString()} and ${abandonedAfter.toISOString()}`
    );

    // Find abandoned carts that haven't been reminded yet
    const abandonedCarts = await Cart.find({
      updatedAt: {
        $gte: abandonedBefore,
        $lte: abandonedAfter
      },
      reminderSent: { $ne: true }
    }).limit(100); // Process max 100 carts per run

    if (abandonedCarts.length === 0) {
      console.log("> No abandoned carts found for reminder");
      return { success: true, remindersSent: 0 };
    }

    console.log(`> Found ${abandonedCarts.length} abandoned carts`);

    let remindersSent = 0;
    let errors = 0;

    for (const cart of abandonedCarts) {
      try {
        // Get cart items
        const cartItems = await CartItem.find({ cartId: cart._id.toString() });

        if (cartItems.length === 0) {
          console.log(`> Cart ${cart._id} has no items, skipping`);
          continue;
        }

        // Get user details
        const user = await getUserById(cart.userId);

        if (!user || !user.email) {
          console.log(`> User ${cart.userId} not found or has no email, skipping cart ${cart._id}`);
          continue;
        }

        // Send reminder email
        const emailData = {
          to: user.email,
          subject: "You left items in your cart - Complete your purchase!",
          template: "abandoned-cart",
          context: {
            userName: user.name || "Customer",
            cartItemsCount: cartItems.length,
            cartTotal: cart.totalPrice,
            cartItems: cartItems.slice(0, 3).map((item) => ({
              productName: item.productName,
              quantity: item.quantity,
              price: item.price
            })),
            cartUrl: `${process.env.FRONTEND_URL}/cart`
          }
        };

        await sendEmail(emailData);

        // Mark cart as reminded
        cart.reminderSent = true;
        cart.reminderSentAt = new Date();
        await cart.save();

        remindersSent++;
        console.log(`> Sent reminder for cart ${cart._id} to ${user.email}`);
      } catch (itemError) {
        console.error(`> Error processing cart ${cart._id}:`, itemError);
        errors++;
      }
    }

    console.log("> Abandoned cart reminder job completed");
    console.log(`> Reminders sent: ${remindersSent}, Errors: ${errors}`);

    return {
      success: true,
      remindersSent,
      errors
    };
  } catch (error) {
    console.error("> Error in abandoned cart reminder job:", error);
    return { success: false, error: error.message };
  }
}
