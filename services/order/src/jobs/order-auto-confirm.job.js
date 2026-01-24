import { Order } from "../../models/order.model.js";
import { sendEmail } from "../../services/engagement-integration.service.js";

/**
 * Order Auto-Confirmation Job
 * Auto-confirms pending orders after payment verification grace period
 * Runs every 2 hours
 */
export async function orderAutoConfirmJob() {
  try {
    console.log("> Running order auto-confirmation job...");

    // Get auto-confirm threshold from environment (default: 6 hours)
    const autoConfirmHours = parseInt(process.env.ORDER_AUTO_CONFIRM_HOURS) || 6;
    const threshold = new Date();
    threshold.setHours(threshold.getHours() - autoConfirmHours);

    console.log(`> Auto-confirming pending orders older than ${autoConfirmHours} hours (before ${threshold.toISOString()})`);

    // Find pending orders that are ready for auto-confirmation
    const pendingOrders = await Order.find({
      status: "pending",
      paymentStatus: "paid",
      createdAt: { $lt: threshold }
    });

    if (pendingOrders.length === 0) {
      console.log("> No orders found for auto-confirmation");
      return { success: true, confirmedCount: 0 };
    }

    console.log(`> Found ${pendingOrders.length} orders to auto-confirm`);

    let confirmedCount = 0;
    let errors = 0;

    for (const order of pendingOrders) {
      try {
        // Update order status
        order.status = "confirmed";
        order.confirmedAt = new Date();
        await order.save();

        console.log(`> Auto-confirmed order ${order.orderNumber}`);

        // Send confirmation email
        try {
          const emailData = {
            to: order.customerEmail,
            subject: `Order Confirmed - ${order.orderNumber}`,
            template: "order-confirmed",
            context: {
              customerName: order.customerName,
              orderNumber: order.orderNumber,
              orderTotal: order.totalAmount,
              orderUrl: `${process.env.FRONTEND_URL}/orders/${order._id}`
            }
          };

          await sendEmail(emailData);
          console.log(`> Sent confirmation email to ${order.customerEmail}`);
        } catch (emailError) {
          console.error(`> Failed to send confirmation email for order ${order.orderNumber}:`, emailError);
        }

        confirmedCount++;
      } catch (orderError) {
        console.error(`> Error auto-confirming order ${order.orderNumber}:`, orderError);
        errors++;
      }
    }

    console.log("> Order auto-confirmation job completed");
    console.log(`> Orders confirmed: ${confirmedCount}, Errors: ${errors}`);

    return {
      success: true,
      confirmedCount,
      errors
    };
  } catch (error) {
    console.error("> Error in order auto-confirmation job:", error);
    return { success: false, error: error.message };
  }
}
