import { CartItem } from "../models/index.js";
import * as pricingService from "./pricing-integration.service.js";
import * as catalogService from "./catalog-integration.service.js";

/**
 * Validate cart item prices against current pricing
 * Detects price changes and updates cart items accordingly
 * @param {object} cart - Cart document
 * @returns {Promise<object>} Validation result with price changes
 */
export const validateCartPrices = async (cart) => {
  try {
    console.log(`> Validating prices for cart: ${cart._id}`);

    // Get all cart items
    const cartItems = await CartItem.find({ cartId: cart._id });

    if (cartItems.length === 0) {
      return {
        success: true,
        hasChanges: false,
        priceChanges: [],
        message: "No items to validate"
      };
    }

    // Get variant IDs for bulk price lookup
    const variantIds = cartItems.map(item => item.variantId);

    // Determine user identifier (userId or sessionId)
    const identifier = cart.userId || cart.sessionId;

    // Fetch current prices from pricing service
    const pricesResult = await pricingService.bulkGetPrices(variantIds, identifier);

    if (!pricesResult.success || !pricesResult.data?.data?.prices) {
      console.log("> Warning: Unable to fetch current prices");
      return {
        success: false,
        hasChanges: false,
        priceChanges: [],
        error: "Unable to fetch current prices"
      };
    }

    const currentPrices = pricesResult.data.data.prices;
    const priceChanges = [];
    const PRICE_TOLERANCE = 0.01; // Allow 1 paisa difference due to rounding

    // Check each item for price changes
    for (const item of cartItems) {
      const currentPrice = currentPrices[item.variantId];

      if (!currentPrice) {
        console.log(`> Warning: No current price found for variant ${item.variantId}`);
        continue;
      }

      const priceDifference = Math.abs(currentPrice.finalPrice - item.unitPrice);

      // Check if price has changed significantly
      if (priceDifference > PRICE_TOLERANCE) {
        console.log(`> Price change detected for variant ${item.variantId}: ${item.unitPrice} -> ${currentPrice.finalPrice}`);

        // Update item with new price
        const oldPrice = item.unitPrice;
        item.unitPrice = currentPrice.finalPrice;
        item.unitMrp = currentPrice.mrp || currentPrice.finalPrice;
        item.lineTotal = item.quantity * currentPrice.finalPrice;
        item.lineDiscount = currentPrice.discount || 0;

        // Mark price as changed
        item.priceChanged = true;
        item.priceChangeDetails = {
          oldPrice,
          newPrice: currentPrice.finalPrice,
          changedAt: new Date()
        };

        // Update price snapshot
        item.priceSnapshot = {
          unitPrice: currentPrice.finalPrice,
          unitMrp: currentPrice.mrp || currentPrice.finalPrice,
          capturedAt: new Date(),
          discountPercent: currentPrice.discountPercent || 0
        };

        await item.save();

        // Add to changes array
        priceChanges.push({
          itemId: item._id.toString(),
          variantId: item.variantId,
          productId: item.productId,
          oldPrice,
          newPrice: currentPrice.finalPrice,
          difference: currentPrice.finalPrice - oldPrice,
          percentageChange: ((currentPrice.finalPrice - oldPrice) / oldPrice * 100).toFixed(2),
          quantity: item.quantity,
          totalDifference: (currentPrice.finalPrice - oldPrice) * item.quantity
        });
      }
    }

    console.log(`> Price validation completed: ${priceChanges.length} changes detected`);

    return {
      success: true,
      hasChanges: priceChanges.length > 0,
      priceChanges,
      message: priceChanges.length > 0
        ? `${priceChanges.length} price changes detected`
        : "All prices are up to date"
    };
  } catch (error) {
    console.log(`> Error validating cart prices: ${error.message}`);
    return {
      success: false,
      hasChanges: false,
      priceChanges: [],
      error: error.message
    };
  }
};

/**
 * Validate product and variant availability
 * Detects deleted/archived products
 * @param {object} cart - Cart document
 * @returns {Promise<object>} Validation result with deleted items
 */
export const validateProductAvailability = async (cart) => {
  try {
    console.log(`> Validating product availability for cart: ${cart._id}`);

    // Get all cart items
    const cartItems = await CartItem.find({ cartId: cart._id });

    if (cartItems.length === 0) {
      return {
        success: true,
        hasDeletedItems: false,
        deletedItems: [],
        message: "No items to validate"
      };
    }

    const deletedItems = [];

    // Check each item for product/variant existence
    for (const item of cartItems) {
      // Fetch product and variant from catalog service
      const productResult = await catalogService.getProductVariant(
        item.productId,
        item.variantId
      );

      let productExists = true;
      let variantExists = true;

      if (!productResult.success) {
        // Product or variant not found
        console.log(`> Product/variant not found: ${item.productId}/${item.variantId}`);
        productExists = false;
        variantExists = false;

        deletedItems.push({
          itemId: item._id.toString(),
          variantId: item.variantId,
          productId: item.productId,
          quantity: item.quantity,
          reason: "Product no longer available"
        });
      } else {
        // Check if product is archived or variant is inactive
        const product = productResult.data?.product;
        const variant = productResult.data?.variant;

        if (product?.status === "archived" || product?.status === "draft") {
          console.log(`> Product archived/draft: ${item.productId}`);
          productExists = false;

          deletedItems.push({
            itemId: item._id.toString(),
            variantId: item.variantId,
            productId: item.productId,
            quantity: item.quantity,
            reason: `Product is ${product.status}`
          });
        }

        if (variant?.status === "inactive" || !variant) {
          console.log(`> Variant inactive or missing: ${item.variantId}`);
          variantExists = false;

          if (productExists) {
            // Only add if not already added due to product status
            deletedItems.push({
              itemId: item._id.toString(),
              variantId: item.variantId,
              productId: item.productId,
              quantity: item.quantity,
              reason: "Variant is no longer available"
            });
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
    }

    console.log(`> Availability validation completed: ${deletedItems.length} unavailable items`);

    return {
      success: true,
      hasDeletedItems: deletedItems.length > 0,
      deletedItems,
      message: deletedItems.length > 0
        ? `${deletedItems.length} items are no longer available`
        : "All items are available"
    };
  } catch (error) {
    console.log(`> Error validating product availability: ${error.message}`);
    return {
      success: false,
      hasDeletedItems: false,
      deletedItems: [],
      error: error.message
    };
  }
};

/**
 * Full cart validation - checks both prices and availability
 * @param {object} cart - Cart document
 * @returns {Promise<object>} Complete validation result
 */
export const validateCart = async (cart) => {
  try {
    console.log(`> Running full validation for cart: ${cart._id}`);

    // Run both validations in parallel
    const [priceValidation, availabilityValidation] = await Promise.all([
      validateCartPrices(cart),
      validateProductAvailability(cart)
    ]);

    const hasIssues = priceValidation.hasChanges || availabilityValidation.hasDeletedItems;

    return {
      success: true,
      hasIssues,
      priceValidation,
      availabilityValidation,
      warnings: generateWarnings(priceValidation, availabilityValidation)
    };
  } catch (error) {
    console.log(`> Error in full cart validation: ${error.message}`);
    return {
      success: false,
      hasIssues: false,
      error: error.message
    };
  }
};

/**
 * Generate user-friendly warnings based on validation results
 * @param {object} priceValidation - Price validation results
 * @param {object} availabilityValidation - Availability validation results
 * @returns {Array} Array of warning objects
 */
const generateWarnings = (priceValidation, availabilityValidation) => {
  const warnings = [];

  // Price change warnings
  if (priceValidation.hasChanges) {
    const priceIncreases = priceValidation.priceChanges.filter(c => c.difference > 0);
    const priceDecreases = priceValidation.priceChanges.filter(c => c.difference < 0);

    if (priceIncreases.length > 0) {
      const totalIncrease = priceIncreases.reduce((sum, c) => sum + c.totalDifference, 0);
      warnings.push({
        type: "PRICE_INCREASE",
        severity: "medium",
        message: `${priceIncreases.length} item(s) increased in price by ₹${totalIncrease.toFixed(2)}`,
        affectedItemIds: priceIncreases.map(c => c.itemId)
      });
    }

    if (priceDecreases.length > 0) {
      const totalDecrease = Math.abs(priceDecreases.reduce((sum, c) => sum + c.totalDifference, 0));
      warnings.push({
        type: "PRICE_DECREASE",
        severity: "low",
        message: `${priceDecreases.length} item(s) decreased in price by ₹${totalDecrease.toFixed(2)}`,
        affectedItemIds: priceDecreases.map(c => c.itemId)
      });
    }
  }

  // Availability warnings
  if (availabilityValidation.hasDeletedItems) {
    warnings.push({
      type: "ITEMS_UNAVAILABLE",
      severity: "high",
      message: `${availabilityValidation.deletedItems.length} item(s) are no longer available and need to be removed`,
      affectedItemIds: availabilityValidation.deletedItems.map(i => i.itemId)
    });
  }

  return warnings;
};

export default {
  validateCartPrices,
  validateProductAvailability,
  validateCart
};
