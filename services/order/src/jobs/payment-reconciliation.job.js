import { Payment } from "../../models/payment.model.js";
import { Order } from "../../models/order.model.js";
import Razorpay from "razorpay";

/**
 * Payment Reconciliation Job
 * Reconciles payment status with Razorpay for pending payments
 * Runs every 4 hours
 */
export async function paymentReconciliationJob() {
  try {
    console.log("> Running payment reconciliation job...");

    // Initialize Razorpay client
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    // Get reconciliation window from environment (default: check payments from last 48 hours)
    const reconciliationWindowHours = parseInt(process.env.PAYMENT_RECONCILIATION_WINDOW_HOURS) || 48;
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - reconciliationWindowHours);

    console.log(`> Reconciling payments created after ${windowStart.toISOString()}`);

    // Find pending payments that need reconciliation
    const pendingPayments = await Payment.find({
      status: { $in: ["pending", "processing"] },
      createdAt: { $gte: windowStart },
      gatewayPaymentId: { $ne: null }
    }).limit(100); // Process max 100 payments per run

    if (pendingPayments.length === 0) {
      console.log("> No pending payments found for reconciliation");
      return { success: true, reconciledCount: 0 };
    }

    console.log(`> Found ${pendingPayments.length} pending payments to reconcile`);

    let reconciledCount = 0;
    let updatedCount = 0;
    let errors = 0;

    for (const payment of pendingPayments) {
      try {
        // Fetch payment status from Razorpay
        const razorpayPayment = await razorpay.payments.fetch(payment.gatewayPaymentId);

        console.log(
          `> Payment ${payment.gatewayPaymentId}: Local status = ${payment.status}, Razorpay status = ${razorpayPayment.status}`
        );

        // Check if status needs to be updated
        let needsUpdate = false;
        let newStatus = payment.status;

        if (razorpayPayment.status === "captured" && payment.status !== "paid") {
          newStatus = "paid";
          needsUpdate = true;
        } else if (razorpayPayment.status === "failed" && payment.status !== "failed") {
          newStatus = "failed";
          needsUpdate = true;
        } else if (razorpayPayment.status === "refunded" && payment.status !== "refunded") {
          newStatus = "refunded";
          needsUpdate = true;
        }

        if (needsUpdate) {
          // Update payment status
          payment.status = newStatus;
          payment.paidAt = razorpayPayment.captured_at ? new Date(razorpayPayment.captured_at * 1000) : null;
          await payment.save();

          console.log(`> Updated payment ${payment.gatewayPaymentId} status from ${payment.status} to ${newStatus}`);

          // Update order payment status if needed
          const order = await Order.findById(payment.orderId);
          if (order) {
            if (newStatus === "paid" && order.paymentStatus !== "paid") {
              order.paymentStatus = "paid";
              await order.save();
              console.log(`> Updated order ${order.orderNumber} payment status to paid`);
            } else if (newStatus === "failed" && order.paymentStatus !== "failed") {
              order.paymentStatus = "failed";
              await order.save();
              console.log(`> Updated order ${order.orderNumber} payment status to failed`);
            }
          }

          updatedCount++;
        }

        reconciledCount++;
      } catch (itemError) {
        console.error(`> Error reconciling payment ${payment.gatewayPaymentId}:`, itemError);
        errors++;
      }
    }

    console.log("> Payment reconciliation job completed");
    console.log(`> Payments reconciled: ${reconciledCount}, Updated: ${updatedCount}, Errors: ${errors}`);

    return {
      success: true,
      reconciledCount,
      updatedCount,
      errors
    };
  } catch (error) {
    console.error("> Error in payment reconciliation job:", error);
    return { success: false, error: error.message };
  }
}
