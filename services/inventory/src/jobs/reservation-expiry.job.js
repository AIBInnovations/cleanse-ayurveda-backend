import Inventory from "../../models/inventory.model.js";
import InventoryReservation from "../../models/inventoryReservation.model.js";

/**
 * Reservation Expiry Job
 * Runs every 5 minutes to release expired inventory reservations
 */
export async function reservationExpiryJob() {
  try {
    console.log("> [JOB] Starting reservation expiry job");
    const startTime = Date.now();

    // Find all active reservations that have expired
    const expiredReservations = await InventoryReservation.find({
      status: "active",
      expiresAt: { $lt: new Date() }
    });

    if (expiredReservations.length === 0) {
      console.log("> [JOB] No expired reservations found");
      return {
        success: true,
        releasedCount: 0,
        duration: Date.now() - startTime
      };
    }

    console.log(`> [JOB] Found ${expiredReservations.length} expired reservations`);

    let releasedCount = 0;
    const errors = [];

    for (const reservation of expiredReservations) {
      try {
        // Find the inventory record
        const inventory = await Inventory.findById(reservation.inventoryId);

        if (!inventory) {
          console.log(`> [JOB] Warning: Inventory ${reservation.inventoryId} not found for reservation ${reservation._id}`);
          errors.push({
            reservationId: reservation._id,
            reason: "Inventory not found"
          });
          continue;
        }

        // Decrease reserved quantity
        inventory.qtyReserved = Math.max(0, inventory.qtyReserved - reservation.quantity);
        await inventory.save();

        // Mark reservation as expired
        reservation.status = "expired";
        await reservation.save();

        releasedCount++;

        console.log(
          `> [JOB] Released reservation: ${reservation._id} | ` +
          `Inventory: ${inventory.sku} | ` +
          `Quantity: ${reservation.quantity} | ` +
          `Cart/Order: ${reservation.cartId || reservation.orderId}`
        );
      } catch (error) {
        console.log(`> [JOB] Error releasing reservation ${reservation._id}:`, error.message);
        errors.push({
          reservationId: reservation._id,
          reason: error.message
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `> [JOB] Reservation expiry job completed | ` +
      `Released: ${releasedCount}/${expiredReservations.length} | ` +
      `Duration: ${duration}ms`
    );

    return {
      success: true,
      releasedCount,
      failedCount: errors.length,
      totalProcessed: expiredReservations.length,
      errors: errors.length > 0 ? errors : undefined,
      duration
    };
  } catch (error) {
    console.log("> [JOB] Fatal error in reservation expiry job:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
