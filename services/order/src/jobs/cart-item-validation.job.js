import { Cart, CartItem } from "../../models/index.js";
import { CART_STATUS } from "../../utils/constants.js";
import * as catalogService from "../../services/catalog-integration.service.js";

/**
 * Cart Item Validation Job
 * Validates that products and variants in cart items still exist
 * Updates productStatus flags for each item
 * Runs every 6 hours
 */
export async function cartItemValidationJob() {
  try {
    console.log("> Running cart item validation job...");

    // Find all active carts
    const activeCarts = await Cart.find({
      status: CART_STATUS.ACTIVE
    });

    if (activeCarts.length === 0) {
      console.log("> No active carts found");
      return { success: true, validatedCarts: 0, validatedItems: 0, invalidItems: 0 };
    }

    console.log(`> Found ${activeCarts.length} active carts to validate`);

    let validatedItemsCount = 0;
    let invalidItemsCount = 0;

    // Process each cart
    for (const cart of activeCarts) {
      // Get all items for this cart
      const cartItems = await CartItem.find({ cartId: cart._id });

      if (cartItems.length === 0) {
        continue;
      }

      // Validate each item
      for (const item of cartItems) {
        try {
          // Call catalog service to check if product and variant exist
          const productResult = await catalogService.getProductVariant(
            item.productId,
            item.variantId
          );

          let productExists = true;
          let variantExists = true;

          if (!productResult.success) {
            // Product or variant not found
            console.log(`> Item ${item._id}: Product/variant not found (${item.productId}/${item.variantId})`);
            productExists = false;
            variantExists = false;
            invalidItemsCount++;
          } else {
            // Check if product is archived or variant is inactive
            const product = productResult.data?.product;
            const variant = productResult.data?.variant;

            if (product?.status === "archived" || product?.status === "draft") {
              console.log(`> Item ${item._id}: Product is ${product.status} (${item.productId})`);
              productExists = false;
              invalidItemsCount++;
            }

            if (variant?.status === "inactive" || !variant) {
              console.log(`> Item ${item._id}: Variant inactive or missing (${item.variantId})`);
              variantExists = false;
              if (productExists) {
                invalidItemsCount++;
              }
            }
          }

          // Update product status
          item.productStatus = {
            productExists,
            variantExists,
            lastCheckedAt: new Date()
          };

          await item.save();
          validatedItemsCount++;
        } catch (itemError) {
          console.log(`> Error validating item ${item._id}: ${itemError.message}`);
          // Continue with next item even if this one fails
        }
      }
    }

    console.log(`> Cart item validation job completed: ${validatedItemsCount} items validated, ${invalidItemsCount} items marked as unavailable`);

    return {
      success: true,
      validatedCarts: activeCarts.length,
      validatedItems: validatedItemsCount,
      invalidItems: invalidItemsCount
    };
  } catch (error) {
    console.error("> Error in cart item validation job:", error);
    return { success: false, error: error.message };
  }
}
