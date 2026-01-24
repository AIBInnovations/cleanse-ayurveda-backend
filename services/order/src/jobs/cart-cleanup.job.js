import { Cart } from "../../models/cart.model.js";
import { CartItem } from "../../models/cartItem.model.js";

/**
 * Cart Cleanup Job
 * Removes expired carts and their items
 * Runs daily at 2:00 AM
 */
export async function cartCleanupJob() {
  try {
    console.log("> Running cart cleanup job...");

    // Get cart expiry days from environment (default: 30 days)
    const expiryDays = parseInt(process.env.CART_EXPIRY_DAYS) || 30;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - expiryDays);

    console.log(`> Removing carts older than ${expiryDays} days (before ${expiryDate.toISOString()})`);

    // Find expired carts
    const expiredCarts = await Cart.find({
      updatedAt: { $lt: expiryDate }
    });

    if (expiredCarts.length === 0) {
      console.log("> No expired carts found");
      return { success: true, deletedCount: 0 };
    }

    console.log(`> Found ${expiredCarts.length} expired carts`);

    // Delete cart items
    const cartIds = expiredCarts.map((cart) => cart._id.toString());
    const deletedItemsResult = await CartItem.deleteMany({ cartId: { $in: cartIds } });
    console.log(`> Deleted ${deletedItemsResult.deletedCount} cart items`);

    // Delete carts
    const deletedCartsResult = await Cart.deleteMany({ _id: { $in: cartIds } });
    console.log(`> Deleted ${deletedCartsResult.deletedCount} carts`);

    console.log("> Cart cleanup job completed successfully");

    return {
      success: true,
      deletedCarts: deletedCartsResult.deletedCount,
      deletedItems: deletedItemsResult.deletedCount
    };
  } catch (error) {
    console.error("> Error in cart cleanup job:", error);
    return { success: false, error: error.message };
  }
}
