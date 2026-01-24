import { Cart, CartItem } from "../models/index.js";
import { CART_STATUS } from "../utils/constants.js";

/**
 * Migrate guest cart to user account after registration/login
 * @param {string} guestSessionId - Guest session ID (used as cart sessionId)
 * @param {string} userId - New user ID after registration
 * @returns {Promise<object>} Migration result
 */
export const migrateGuestCartToUser = async (guestSessionId, userId) => {
  try {
    console.log(`> Starting cart migration from guest ${guestSessionId} to user ${userId}`);

    // Find guest cart
    const guestCart = await Cart.findOne({
      sessionId: guestSessionId,
      userType: "guest",
      status: CART_STATUS.ACTIVE
    });

    // If no guest cart, nothing to migrate
    if (!guestCart) {
      console.log("> No active guest cart found, skipping migration");
      return {
        success: true,
        migrated: false,
        message: "No guest cart to migrate"
      };
    }

    // Find user cart
    const userCart = await Cart.findOne({
      userId,
      userType: "registered",
      status: CART_STATUS.ACTIVE
    });

    // Get guest cart items
    const guestItems = await CartItem.find({ cartId: guestCart._id });

    if (guestItems.length === 0) {
      console.log("> Guest cart is empty, deleting cart");
      await Cart.findByIdAndDelete(guestCart._id);
      return {
        success: true,
        migrated: false,
        message: "Guest cart was empty"
      };
    }

    // Scenario 1: No user cart exists - convert guest cart to user cart
    if (!userCart) {
      console.log("> No existing user cart, converting guest cart to user cart");

      guestCart.userId = userId;
      guestCart.sessionId = null;
      guestCart.userType = "registered";
      await guestCart.save();

      console.log(`> Successfully converted guest cart to user cart with ${guestItems.length} items`);

      return {
        success: true,
        migrated: true,
        itemCount: guestItems.length,
        message: `Migrated ${guestItems.length} items from guest cart`
      };
    }

    // Scenario 2: User cart exists - merge items
    console.log("> Existing user cart found, merging items");

    const userItems = await CartItem.find({ cartId: userCart._id });
    const userItemsMap = new Map();

    // Create map of user cart items by variantId for quick lookup
    for (const item of userItems) {
      userItemsMap.set(item.variantId, item);
    }

    let itemsMerged = 0;
    let itemsAdded = 0;

    for (const guestItem of guestItems) {
      const existingUserItem = userItemsMap.get(guestItem.variantId);

      if (existingUserItem) {
        // Matching variant found - combine quantities
        console.log(`> Merging variant ${guestItem.variantId}: combining quantities`);

        existingUserItem.quantity += guestItem.quantity;

        // Use the newer price (guest item price is likely more recent)
        const guestItemTime = guestItem.priceSnapshot?.capturedAt || guestItem.addedAt;
        const userItemTime = existingUserItem.priceSnapshot?.capturedAt || existingUserItem.addedAt;

        if (guestItemTime > userItemTime) {
          existingUserItem.unitPrice = guestItem.unitPrice;
          existingUserItem.unitMrp = guestItem.unitMrp;
          existingUserItem.lineDiscount = guestItem.lineDiscount;
          existingUserItem.priceSnapshot = guestItem.priceSnapshot;
          existingUserItem.productStatus = guestItem.productStatus;
        }

        existingUserItem.lineTotal = existingUserItem.quantity * existingUserItem.unitPrice;
        await existingUserItem.save();

        itemsMerged++;
      } else {
        // No matching variant - add to user cart
        console.log(`> Adding variant ${guestItem.variantId} to user cart`);

        await CartItem.create({
          cartId: userCart._id,
          productId: guestItem.productId,
          variantId: guestItem.variantId,
          bundleId: guestItem.bundleId,
          quantity: guestItem.quantity,
          unitPrice: guestItem.unitPrice,
          unitMrp: guestItem.unitMrp,
          lineDiscount: guestItem.lineDiscount,
          lineTotal: guestItem.lineTotal,
          isFreeGift: guestItem.isFreeGift,
          giftRuleId: guestItem.giftRuleId,
          priceSnapshot: guestItem.priceSnapshot,
          productStatus: guestItem.productStatus,
          priceChanged: guestItem.priceChanged,
          priceChangeDetails: guestItem.priceChangeDetails,
          customization: guestItem.customization
        });

        itemsAdded++;
      }
    }

    // Delete guest cart items
    await CartItem.deleteMany({ cartId: guestCart._id });

    // Delete guest cart
    await Cart.findByIdAndDelete(guestCart._id);

    // Recalculate user cart totals
    const allUserItems = await CartItem.find({ cartId: userCart._id });

    let subtotal = 0;
    let itemCount = 0;

    for (const item of allUserItems) {
      subtotal += item.lineTotal;
      itemCount += item.quantity;
    }

    userCart.subtotal = subtotal;
    userCart.itemCount = itemCount;

    // Recalculate discount if coupons applied
    if (userCart.appliedCoupons && userCart.appliedCoupons.length > 0) {
      const totalCouponDiscount = userCart.appliedCoupons.reduce(
        (sum, coupon) => sum + (coupon.discountAmount || 0),
        0
      );
      userCart.discountTotal = totalCouponDiscount;
    }

    // Calculate grand total
    userCart.grandTotal = userCart.subtotal - userCart.discountTotal + userCart.shippingTotal + userCart.taxTotal;

    await userCart.save();

    console.log(`> Cart migration completed: ${itemsMerged} items merged, ${itemsAdded} items added`);

    return {
      success: true,
      migrated: true,
      itemCount: guestItems.length,
      itemsMerged,
      itemsAdded,
      message: `Successfully migrated ${guestItems.length} items (${itemsMerged} merged, ${itemsAdded} added)`
    };
  } catch (error) {
    console.log(`> Error migrating cart: ${error.message}`);
    console.log(error.stack);
    return {
      success: false,
      migrated: false,
      error: error.message
    };
  }
};

export default {
  migrateGuestCartToUser
};
