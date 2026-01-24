import { sendResponse, HTTP_STATUS } from "@shared/utils";
import { Cart, CartItem } from "../../models/index.js";
import { CART_STATUS, CART_EXPIRY_HOURS, MAX_CART_ITEMS } from "../../utils/constants.js";
import * as inventoryService from "../../services/inventory-integration.service.js";
import * as pricingService from "../../services/pricing-integration.service.js";
import * as catalogService from "../../services/catalog-integration.service.js";
import { calculateCartTotals } from "../../services/totals-calculator.service.js";
import * as cartValidationService from "../../services/cart-validation.service.js";

/**
 * Get or create user's active cart
 * @route GET /api/cart
 * @access Private (Consumer or Guest)
 */
export const getCart = async (req, res) => {
  try {
    // Determine if user is logged in or guest
    const isGuest = req.userType === "guest";
    const identifier = isGuest ? req.guestId : req.userId;
    const identifierField = isGuest ? "sessionId" : "userId";

    console.log(`> Getting cart for ${isGuest ? "guest" : "user"}:`, identifier);

    // Build query based on user type
    const query = {
      [identifierField]: identifier,
      status: CART_STATUS.ACTIVE
    };

    let cart = await Cart.findOne(query);

    if (!cart) {
      console.log(`> Creating new cart for ${isGuest ? "guest" : "user"}`);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + CART_EXPIRY_HOURS);

      cart = await Cart.create({
        [identifierField]: identifier,
        userType: isGuest ? "guest" : "registered",
        status: CART_STATUS.ACTIVE,
        expiresAt
      });
    }

    // Initialize validation results
    let validationResult = {
      success: true,
      hasIssues: false,
      priceValidation: { success: true, hasChanges: false, priceChanges: [] },
      availabilityValidation: { success: true, hasDeletedItems: false, deletedItems: [] },
      warnings: []
    };

    // Run validation only if cart has items
    const itemCount = await CartItem.countDocuments({ cartId: cart._id });

    if (itemCount > 0) {
      console.log(`> Validating cart with ${itemCount} items`);

      // Run cart validation for price changes and product availability
      validationResult = await cartValidationService.validateCart(cart);

      // If validation failed, log warning but continue
      if (!validationResult.success) {
        console.log(`> Warning: Cart validation had errors: ${validationResult.error}`);
      }
    }

    // Refresh cart and items after validation (prices may have been updated)
    cart = await Cart.findById(cart._id);
    const items = await CartItem.find({ cartId: cart._id }).lean();

    const cartWithItems = {
      ...cart.toObject(),
      items,
      validation: {
        hasIssues: validationResult.hasIssues,
        priceChanges: validationResult.priceValidation.priceChanges,
        deletedItems: validationResult.availabilityValidation.deletedItems,
        warnings: validationResult.warnings
      }
    };

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Cart retrieved successfully",
      cartWithItems,
      null
    );
  } catch (error) {
    console.log("> Error getting cart:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve cart",
      null,
      error.message
    );
  }
};

/**
 * Add item to cart
 * @route POST /api/cart/items
 * @access Private (Consumer or Guest)
 */
export const addItem = async (req, res) => {
  try {
    const { productId, variantId, quantity, customization } = req.body;

    // Determine if user is logged in or guest
    const isGuest = req.userType === "guest";
    const identifier = isGuest ? req.guestId : req.userId;
    const identifierField = isGuest ? "sessionId" : "userId";

    console.log(`> Adding item to cart for ${isGuest ? "guest" : "user"}:`, { productId, variantId, quantity });

    // Build query based on user type
    const query = {
      [identifierField]: identifier,
      status: CART_STATUS.ACTIVE
    };

    let cart = await Cart.findOne(query);

    if (!cart) {
      console.log("> Creating new cart");
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + CART_EXPIRY_HOURS);

      cart = await Cart.create({
        [identifierField]: identifier,
        userType: isGuest ? "guest" : "registered",
        status: CART_STATUS.ACTIVE,
        expiresAt
      });
    }

    const existingItemsCount = await CartItem.countDocuments({ cartId: cart._id });
    if (existingItemsCount >= MAX_CART_ITEMS) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Cannot add more than ${MAX_CART_ITEMS} items to cart`,
        null,
        null
      );
    }

    const stockCheck = await inventoryService.checkStock(variantId, quantity);
    if (!stockCheck.success || !stockCheck.data.available) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        stockCheck.data?.message || "Product is out of stock",
        null,
        null
      );
    }

    const productData = await catalogService.getProductVariant(productId, variantId);
    if (!productData.success) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Product not found",
        null,
        null
      );
    }

    const pricingData = await pricingService.getVariantPrice(variantId, quantity);
    if (!pricingData.success) {
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Failed to fetch pricing information",
        null,
        null
      );
    }

    const existingItem = await CartItem.findOne({
      cartId: cart._id,
      variantId
    });

    // Prepare price snapshot
    const priceSnapshot = {
      unitPrice: pricingData.data.finalPrice,
      unitMrp: pricingData.data.mrp || pricingData.data.finalPrice,
      capturedAt: new Date(),
      discountPercent: pricingData.data.discountPercent || 0
    };

    // Prepare product status
    const productStatus = {
      productExists: true,
      variantExists: true,
      lastCheckedAt: new Date()
    };

    if (existingItem) {
      console.log("> Updating existing cart item");
      existingItem.quantity += quantity;
      existingItem.unitPrice = pricingData.data.finalPrice;
      existingItem.unitMrp = pricingData.data.mrp || pricingData.data.finalPrice;
      existingItem.lineTotal = existingItem.quantity * existingItem.unitPrice;
      existingItem.lineDiscount = pricingData.data.discount || 0;
      existingItem.priceSnapshot = priceSnapshot;
      existingItem.productStatus = productStatus;
      await existingItem.save();
    } else {
      console.log("> Creating new cart item");
      await CartItem.create({
        cartId: cart._id,
        productId,
        variantId,
        quantity,
        unitPrice: pricingData.data.finalPrice,
        unitMrp: pricingData.data.mrp || pricingData.data.finalPrice,
        lineTotal: quantity * pricingData.data.finalPrice,
        lineDiscount: pricingData.data.discount || 0,
        customization: customization || {},
        priceSnapshot,
        productStatus
      });
    }

    await recalculateCartTotals(cart._id);

    const updatedCart = await Cart.findById(cart._id).lean();
    const items = await CartItem.find({ cartId: cart._id }).lean();

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Item added to cart successfully",
      { ...updatedCart, items },
      null
    );
  } catch (error) {
    console.log("> Error adding item to cart:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to add item to cart",
      null,
      error.message
    );
  }
};

/**
 * Update cart item quantity
 * @route PUT /api/cart/items/:itemId
 * @access Private (Consumer or Guest)
 */
export const updateItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity, customization } = req.body;

    // Determine if user is logged in or guest
    const isGuest = req.userType === "guest";
    const identifier = isGuest ? req.guestId : req.userId;
    const identifierField = isGuest ? "sessionId" : "userId";

    console.log(`> Updating cart item for ${isGuest ? "guest" : "user"}:`, { itemId, quantity });

    const cartItem = await CartItem.findById(itemId);
    if (!cartItem) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Cart item not found",
        null,
        null
      );
    }

    // Build query to verify cart ownership
    const query = {
      _id: cartItem.cartId,
      [identifierField]: identifier,
      status: CART_STATUS.ACTIVE
    };

    const cart = await Cart.findOne(query);

    if (!cart) {
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "You do not have access to this cart item",
        null,
        null
      );
    }

    const stockCheck = await inventoryService.checkStock(cartItem.variantId, quantity);
    if (!stockCheck.success || !stockCheck.data.available) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        stockCheck.data?.message || "Insufficient stock",
        null,
        null
      );
    }

    const pricingData = await pricingService.getVariantPrice(cartItem.variantId, quantity);
    if (!pricingData.success) {
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Failed to fetch pricing information",
        null,
        null
      );
    }

    cartItem.quantity = quantity;
    cartItem.unitPrice = pricingData.data.finalPrice;
    cartItem.unitMrp = pricingData.data.mrp || pricingData.data.finalPrice;
    cartItem.lineTotal = quantity * pricingData.data.finalPrice;
    cartItem.lineDiscount = pricingData.data.discount || 0;

    // Update price snapshot
    cartItem.priceSnapshot = {
      unitPrice: pricingData.data.finalPrice,
      unitMrp: pricingData.data.mrp || pricingData.data.finalPrice,
      capturedAt: new Date(),
      discountPercent: pricingData.data.discountPercent || 0
    };

    // Update product status
    cartItem.productStatus = {
      productExists: true,
      variantExists: true,
      lastCheckedAt: new Date()
    };

    if (customization) {
      cartItem.customization = customization;
    }

    await cartItem.save();

    await recalculateCartTotals(cart._id);

    const updatedCart = await Cart.findById(cart._id).lean();
    const items = await CartItem.find({ cartId: cart._id }).lean();

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Cart item updated successfully",
      { ...updatedCart, items },
      null
    );
  } catch (error) {
    console.log("> Error updating cart item:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update cart item",
      null,
      error.message
    );
  }
};

/**
 * Remove item from cart
 * @route DELETE /api/cart/items/:itemId
 * @access Private (Consumer or Guest)
 */
export const removeItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    // Determine if user is logged in or guest
    const isGuest = req.userType === "guest";
    const identifier = isGuest ? req.guestId : req.userId;
    const identifierField = isGuest ? "sessionId" : "userId";

    console.log(`> Removing cart item for ${isGuest ? "guest" : "user"}:`, itemId);

    const cartItem = await CartItem.findById(itemId);
    if (!cartItem) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Cart item not found",
        null,
        null
      );
    }

    // Build query to verify cart ownership
    const query = {
      _id: cartItem.cartId,
      [identifierField]: identifier,
      status: CART_STATUS.ACTIVE
    };

    const cart = await Cart.findOne(query);

    if (!cart) {
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "You do not have access to this cart item",
        null,
        null
      );
    }

    await CartItem.findByIdAndDelete(itemId);

    await recalculateCartTotals(cart._id);

    const updatedCart = await Cart.findById(cart._id).lean();
    const items = await CartItem.find({ cartId: cart._id }).lean();

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Item removed from cart successfully",
      { ...updatedCart, items },
      null
    );
  } catch (error) {
    console.log("> Error removing cart item:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to remove cart item",
      null,
      error.message
    );
  }
};

/**
 * Clear all items from cart
 * @route DELETE /api/cart/clear
 * @access Private (Consumer or Guest)
 */
export const clearCart = async (req, res) => {
  try {
    // Determine if user is logged in or guest
    const isGuest = req.userType === "guest";
    const identifier = isGuest ? req.guestId : req.userId;
    const identifierField = isGuest ? "sessionId" : "userId";

    console.log(`> Clearing cart for ${isGuest ? "guest" : "user"}:`, identifier);

    // Build query based on user type
    const query = {
      [identifierField]: identifier,
      status: CART_STATUS.ACTIVE
    };

    const cart = await Cart.findOne(query);

    if (!cart) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "No active cart found",
        null,
        null
      );
    }

    await CartItem.deleteMany({ cartId: cart._id });

    cart.subtotal = 0;
    cart.discountTotal = 0;
    cart.taxTotal = 0;
    cart.shippingTotal = 0;
    cart.grandTotal = 0;
    cart.itemCount = 0;
    cart.appliedCoupons = [];
    cart.appliedDiscounts = [];
    cart.freeGifts = [];

    await cart.save();

    const updatedCart = await Cart.findById(cart._id).lean();

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Cart cleared successfully",
      { ...updatedCart, items: [] },
      null
    );
  } catch (error) {
    console.log("> Error clearing cart:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to clear cart",
      null,
      error.message
    );
  }
};

/**
 * Apply coupon to cart
 * @route POST /api/cart/coupons
 * @access Private (Consumer or Guest)
 */
export const applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;

    // Determine if user is logged in or guest
    const isGuest = req.userType === "guest";
    const identifier = isGuest ? req.guestId : req.userId;
    const identifierField = isGuest ? "sessionId" : "userId";

    console.log(`> Applying coupon for ${isGuest ? "guest" : "user"}:`, couponCode);

    // Build query based on user type
    const query = {
      [identifierField]: identifier,
      status: CART_STATUS.ACTIVE
    };

    const cart = await Cart.findOne(query);

    if (!cart) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "No active cart found",
        null,
        null
      );
    }

    const items = await CartItem.find({ cartId: cart._id }).lean();

    if (items.length === 0) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot apply coupon to empty cart",
        null,
        null
      );
    }

    const couponValidation = await pricingService.validateCoupon(couponCode, identifier, cart.subtotal, items);

    if (!couponValidation.success) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        couponValidation.error || "Invalid coupon",
        null,
        null
      );
    }

    const alreadyApplied = cart.appliedCoupons.some(c => c.code === couponCode);
    if (alreadyApplied) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Coupon already applied",
        null,
        null
      );
    }

    cart.appliedCoupons.push({
      couponId: couponValidation.data.couponId,
      code: couponCode,
      discountAmount: couponValidation.data.discountAmount
    });

    await cart.save();

    await recalculateCartTotals(cart._id);

    const updatedCart = await Cart.findById(cart._id).lean();
    const updatedItems = await CartItem.find({ cartId: cart._id }).lean();

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Coupon applied successfully",
      { ...updatedCart, items: updatedItems },
      null
    );
  } catch (error) {
    console.log("> Error applying coupon:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to apply coupon",
      null,
      error.message
    );
  }
};

/**
 * Remove coupon from cart
 * @route DELETE /api/cart/coupons/:couponId
 * @access Private (Consumer or Guest)
 */
export const removeCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;

    // Determine if user is logged in or guest
    const isGuest = req.userType === "guest";
    const identifier = isGuest ? req.guestId : req.userId;
    const identifierField = isGuest ? "sessionId" : "userId";

    console.log(`> Removing coupon for ${isGuest ? "guest" : "user"}:`, couponId);

    // Build query based on user type
    const query = {
      [identifierField]: identifier,
      status: CART_STATUS.ACTIVE
    };

    const cart = await Cart.findOne(query);

    if (!cart) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "No active cart found",
        null,
        null
      );
    }

    const couponIndex = cart.appliedCoupons.findIndex(c => c.couponId === couponId);

    if (couponIndex === -1) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Coupon not found in cart",
        null,
        null
      );
    }

    cart.appliedCoupons.splice(couponIndex, 1);
    await cart.save();

    await recalculateCartTotals(cart._id);

    const updatedCart = await Cart.findById(cart._id).lean();
    const items = await CartItem.find({ cartId: cart._id }).lean();

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Coupon removed successfully",
      { ...updatedCart, items },
      null
    );
  } catch (error) {
    console.log("> Error removing coupon:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to remove coupon",
      null,
      error.message
    );
  }
};

/**
 * Acknowledge price changes in cart
 * @route POST /api/cart/acknowledge-changes
 * @access Private (Consumer or Guest)
 */
export const acknowledgeChanges = async (req, res) => {
  try {
    // Determine if user is logged in or guest
    const isGuest = req.userType === "guest";
    const identifier = isGuest ? req.guestId : req.userId;
    const identifierField = isGuest ? "sessionId" : "userId";

    console.log(`> Acknowledging cart changes for ${isGuest ? "guest" : "user"}:`, identifier);

    // Build query based on user type
    const query = {
      [identifierField]: identifier,
      status: CART_STATUS.ACTIVE
    };

    const cart = await Cart.findOne(query);

    if (!cart) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "No active cart found",
        null,
        null
      );
    }

    // Find all cart items with price changes
    const changedItems = await CartItem.find({
      cartId: cart._id,
      priceChanged: true
    });

    if (changedItems.length === 0) {
      return sendResponse(
        res,
        HTTP_STATUS.OK,
        "No price changes to acknowledge",
        { acknowledgedCount: 0 },
        null
      );
    }

    // Update all items with price changes
    await CartItem.updateMany(
      {
        cartId: cart._id,
        priceChanged: true
      },
      {
        $set: { priceChanged: false },
        $unset: { priceChangeDetails: "" }
      }
    );

    console.log(`> Acknowledged ${changedItems.length} price changes`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      `Price changes acknowledged for ${changedItems.length} item(s)`,
      { acknowledgedCount: changedItems.length },
      null
    );
  } catch (error) {
    console.log("> Error acknowledging price changes:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to acknowledge price changes",
      null,
      error.message
    );
  }
};

/**
 * Remove deleted/unavailable items from cart
 * @route DELETE /api/cart/deleted-items
 * @access Private (Consumer or Guest)
 */
export const removeDeletedItems = async (req, res) => {
  try {
    // Determine if user is logged in or guest
    const isGuest = req.userType === "guest";
    const identifier = isGuest ? req.guestId : req.userId;
    const identifierField = isGuest ? "sessionId" : "userId";

    console.log(`> Removing deleted items from cart for ${isGuest ? "guest" : "user"}:`, identifier);

    // Build query based on user type
    const query = {
      [identifierField]: identifier,
      status: CART_STATUS.ACTIVE
    };

    const cart = await Cart.findOne(query);

    if (!cart) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "No active cart found",
        null,
        null
      );
    }

    // Find and delete items where product or variant doesn't exist
    const deletedResult = await CartItem.deleteMany({
      cartId: cart._id,
      $or: [
        { "productStatus.productExists": false },
        { "productStatus.variantExists": false }
      ]
    });

    const removedCount = deletedResult.deletedCount || 0;

    if (removedCount > 0) {
      // Recalculate cart totals after removing items
      await recalculateCartTotals(cart._id);
      console.log(`> Removed ${removedCount} unavailable items from cart`);
    } else {
      console.log("> No unavailable items to remove");
    }

    // Get updated cart and items
    const updatedCart = await Cart.findById(cart._id).lean();
    const items = await CartItem.find({ cartId: cart._id }).lean();

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      removedCount > 0
        ? `Removed ${removedCount} unavailable item(s) from cart`
        : "No unavailable items to remove",
      { ...updatedCart, items, removedCount },
      null
    );
  } catch (error) {
    console.log("> Error removing deleted items:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to remove deleted items",
      null,
      error.message
    );
  }
};

/**
 * Get abandoned carts (admin)
 * @route GET /api/admin/cart/abandoned
 * @access Private (Admin)
 */
export const getAbandonedCarts = async (req, res) => {
  try {
    const { page = 1, limit = 20, minValue, maxValue, startDate, endDate } = req.query;

    console.log("> Getting abandoned carts");

    const query = { status: CART_STATUS.ABANDONED };

    if (minValue) {
      query.grandTotal = { ...query.grandTotal, $gte: parseFloat(minValue) };
    }

    if (maxValue) {
      query.grandTotal = { ...query.grandTotal, $lte: parseFloat(maxValue) };
    }

    if (startDate) {
      query.updatedAt = { ...query.updatedAt, $gte: new Date(startDate) };
    }

    if (endDate) {
      query.updatedAt = { ...query.updatedAt, $lte: new Date(endDate) };
    }

    const skip = (page - 1) * limit;

    const [carts, total] = await Promise.all([
      Cart.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Cart.countDocuments(query)
    ]);

    const cartsWithItems = await Promise.all(
      carts.map(async (cart) => {
        const items = await CartItem.find({ cartId: cart._id }).lean();
        return { ...cart, items };
      })
    );

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Abandoned carts retrieved successfully",
      {
        carts: cartsWithItems,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      },
      null
    );
  } catch (error) {
    console.log("> Error getting abandoned carts:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve abandoned carts",
      null,
      error.message
    );
  }
};

/**
 * Get cart by ID (admin)
 * @route GET /api/admin/cart/:cartId
 * @access Private (Admin)
 */
export const getCartById = async (req, res) => {
  try {
    const { cartId } = req.params;

    console.log("> Getting cart by ID:", cartId);

    const cart = await Cart.findById(cartId).lean();

    if (!cart) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Cart not found",
        null,
        null
      );
    }

    const items = await CartItem.find({ cartId: cart._id }).lean();

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Cart retrieved successfully",
      { ...cart, items },
      null
    );
  } catch (error) {
    console.log("> Error getting cart by ID:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve cart",
      null,
      error.message
    );
  }
};

/**
 * Delete cart (admin)
 * @route DELETE /api/admin/cart/:cartId
 * @access Private (Admin)
 */
export const deleteCart = async (req, res) => {
  try {
    const { cartId } = req.params;

    console.log("> Deleting cart:", cartId);

    const cart = await Cart.findById(cartId);

    if (!cart) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Cart not found",
        null,
        null
      );
    }

    await CartItem.deleteMany({ cartId: cart._id });
    await Cart.findByIdAndDelete(cartId);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Cart deleted successfully",
      null,
      null
    );
  } catch (error) {
    console.log("> Error deleting cart:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to delete cart",
      null,
      error.message
    );
  }
};

/**
 * Helper function to recalculate cart totals
 * @param {string} cartId - Cart ID
 * @param {number} maxRetries - Maximum number of retries on version conflict
 */
const recalculateCartTotals = async (cartId, maxRetries = 3) => {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const cart = await Cart.findById(cartId);
      if (!cart) {
        throw new Error("Cart not found");
      }

      const currentVersion = cart.version;
      const items = await CartItem.find({ cartId }).lean();

      const totals = calculateCartTotals(
        { items, appliedCoupons: cart.appliedCoupons, appliedDiscounts: cart.appliedDiscounts },
        cart.shippingTotal || 0,
        0,
        false
      );

      cart.subtotal = totals.subtotal;
      cart.discountTotal = totals.discountTotal;
      cart.taxTotal = totals.taxTotal;
      cart.grandTotal = totals.grandTotal;
      cart.itemCount = totals.itemCount;

      // Check if cart was modified by another process before saving
      const versionCheck = await Cart.findOne({ _id: cartId, version: currentVersion });
      if (!versionCheck) {
        retries++;
        console.log(`> Cart version mismatch, retrying... (${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 100 * retries)); // Exponential backoff
        continue;
      }

      await cart.save();
      return; // Success
    } catch (error) {
      if (error.name === "VersionError" || error.message.includes("version")) {
        retries++;
        console.log(`> Cart version conflict, retrying... (${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 100 * retries)); // Exponential backoff

        if (retries >= maxRetries) {
          throw new Error("Cart was modified by another process. Please refresh and try again.");
        }
      } else {
        console.log("> Error recalculating cart totals:", error.message);
        throw error;
      }
    }
  }

  throw new Error("Failed to update cart after multiple retries");
};
