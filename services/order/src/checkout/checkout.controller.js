import { sendResponse, HTTP_STATUS } from "@shared/utils";
import { Cart, CartItem, CheckoutSession, Order, OrderItem, Payment } from "../../models/index.js";
import {
  CART_STATUS,
  CHECKOUT_STATUS,
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  CHECKOUT_EXPIRY_MINUTES,
  INVENTORY_RESERVATION_MINUTES
} from "../../utils/constants.js";
import * as inventoryService from "../../services/inventory-integration.service.js";
import * as shippingService from "../../services/shipping-integration.service.js";
import * as catalogService from "../../services/catalog-integration.service.js";
import * as pricingService from "../../services/pricing-integration.service.js";
import { calculateCartTotals } from "../../services/totals-calculator.service.js";
import { createAddressSnapshot, createOrderItemSnapshot } from "../../services/snapshot.service.js";
import { generateOrderNumber } from "../../services/order-number.service.js";

/**
 * Initiate checkout from cart
 * @route POST /api/checkout
 * @access Private (Consumer or Guest)
 */
export const initiateCheckout = async (req, res) => {
  try {
    // Determine if user is logged in or guest
    const isGuest = req.userType === "guest";
    const identifier = isGuest ? req.guestId : req.userId;
    const identifierField = isGuest ? "sessionId" : "userId";

    const { cartId } = req.body;

    console.log(`> Initiating checkout for ${isGuest ? "guest" : "user"}:`, identifier);

    // Build query based on user type
    const cartQuery = {
      [identifierField]: identifier,
      status: CART_STATUS.ACTIVE
    };

    if (cartId) {
      cartQuery._id = cartId;
    }

    let cart = await Cart.findOne(cartQuery);

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
        "Cannot checkout with empty cart",
        null,
        null
      );
    }

    for (const item of items) {
      const stockCheck = await inventoryService.checkStock(item.variantId, item.quantity);
      if (!stockCheck.success || !stockCheck.data.available) {
        return sendResponse(
          res,
          HTTP_STATUS.BAD_REQUEST,
          `Item ${item.variantId} is out of stock`,
          null,
          null
        );
      }
    }

    // Check for existing checkout session based on user type
    const existingSessionQuery = {
      [identifierField]: identifier,
      status: { $in: [CHECKOUT_STATUS.INITIATED, CHECKOUT_STATUS.ADDRESS_ENTERED, CHECKOUT_STATUS.PAYMENT_PENDING] }
    };

    const existingSession = await CheckoutSession.findOne(existingSessionQuery);

    if (existingSession) {
      console.log("> Returning existing checkout session");
      return sendResponse(
        res,
        HTTP_STATUS.OK,
        "Checkout session already exists",
        existingSession,
        null
      );
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CHECKOUT_EXPIRY_MINUTES);

    // Create checkout session data based on user type
    const checkoutSessionData = {
      [identifierField]: identifier,
      userType: isGuest ? "guest" : "registered",
      phoneVerified: !isGuest, // Guests need phone verification, logged-in users already have verified phone
      cartId: cart._id,
      status: CHECKOUT_STATUS.INITIATED,
      currency: cart.currency,
      subtotal: cart.subtotal,
      discountTotal: cart.discountTotal,
      itemCount: cart.itemCount,
      appliedCoupons: cart.appliedCoupons,
      appliedDiscounts: cart.appliedDiscounts,
      expiresAt
    };

    const checkoutSession = await CheckoutSession.create(checkoutSessionData);

    console.log("> Creating inventory reservations");
    const reservationPromises = items.map(item =>
      inventoryService.createReservation(
        cart._id.toString(),
        item.variantId,
        item.quantity
      )
    );

    await Promise.all(reservationPromises);

    return sendResponse(
      res,
      HTTP_STATUS.CREATED,
      "Checkout initiated successfully",
      checkoutSession,
      null
    );
  } catch (error) {
    console.log("> Error initiating checkout:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to initiate checkout",
      null,
      error.message
    );
  }
};

/**
 * Update shipping address
 * @route PUT /api/checkout/:sessionId/shipping-address
 * @access Private (Consumer or Guest)
 */
export const updateShippingAddress = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { shippingAddress } = req.body;

    // Determine if user is logged in or guest
    const isGuest = req.userType === "guest";
    const identifier = isGuest ? req.guestId : req.userId;
    const identifierField = isGuest ? "sessionId" : "userId";

    console.log(`> Updating shipping address for ${isGuest ? "guest" : "user"} session:`, sessionId);

    // Build query based on user type
    const sessionQuery = {
      _id: sessionId,
      [identifierField]: identifier
    };

    const session = await CheckoutSession.findOne(sessionQuery);

    if (!session) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Checkout session not found",
        null,
        null
      );
    }

    if (session.status === CHECKOUT_STATUS.COMPLETED || session.status === CHECKOUT_STATUS.FAILED) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot update address for completed or failed checkout",
        null,
        null
      );
    }

    const shippingMethods = await shippingService.getShippingMethods(
      shippingAddress.pincode,
      session.subtotal
    );

    session.shippingAddress = createAddressSnapshot(shippingAddress);
    session.status = CHECKOUT_STATUS.ADDRESS_ENTERED;
    session.availableShippingMethods = shippingMethods.success ? shippingMethods.data : [];

    await session.save();

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Shipping address updated successfully",
      session,
      null
    );
  } catch (error) {
    console.log("> Error updating shipping address:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update shipping address",
      null,
      error.message
    );
  }
};

/**
 * Update billing address
 * @route PUT /api/checkout/:sessionId/billing-address
 * @access Private (Consumer or Guest)
 */
export const updateBillingAddress = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { billingAddress, sameAsShipping } = req.body;

    // Determine if user is logged in or guest
    const isGuest = req.userType === "guest";
    const identifier = isGuest ? req.guestId : req.userId;
    const identifierField = isGuest ? "sessionId" : "userId";

    console.log(`> Updating billing address for ${isGuest ? "guest" : "user"} session:`, sessionId);

    // Build query based on user type
    const sessionQuery = {
      _id: sessionId,
      [identifierField]: identifier
    };

    const session = await CheckoutSession.findOne(sessionQuery);

    if (!session) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Checkout session not found",
        null,
        null
      );
    }

    if (session.status === CHECKOUT_STATUS.COMPLETED || session.status === CHECKOUT_STATUS.FAILED) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot update address for completed or failed checkout",
        null,
        null
      );
    }

    if (sameAsShipping) {
      if (!session.shippingAddress) {
        return sendResponse(
          res,
          HTTP_STATUS.BAD_REQUEST,
          "Shipping address must be set first",
          null,
          null
        );
      }
      session.billingAddress = session.shippingAddress;
    } else {
      session.billingAddress = createAddressSnapshot(billingAddress);
    }

    await session.save();

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Billing address updated successfully",
      session,
      null
    );
  } catch (error) {
    console.log("> Error updating billing address:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update billing address",
      null,
      error.message
    );
  }
};

/**
 * Select shipping method
 * @route PUT /api/checkout/:sessionId/shipping-method
 * @access Private (Consumer or Guest)
 */
export const selectShippingMethod = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { shippingMethodId, shippingCost, estimatedDeliveryDays } = req.body;

    // Determine if user is logged in or guest
    const isGuest = req.userType === "guest";
    const identifier = isGuest ? req.guestId : req.userId;
    const identifierField = isGuest ? "sessionId" : "userId";

    console.log(`> Selecting shipping method for ${isGuest ? "guest" : "user"} session:`, sessionId);

    // Build query based on user type
    const sessionQuery = {
      _id: sessionId,
      [identifierField]: identifier
    };

    const session = await CheckoutSession.findOne(sessionQuery);

    if (!session) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Checkout session not found",
        null,
        null
      );
    }

    if (!session.shippingAddress) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Shipping address must be set first",
        null,
        null
      );
    }

    session.shippingMethod = {
      methodId: shippingMethodId,
      cost: shippingCost,
      estimatedDeliveryDays: estimatedDeliveryDays || null
    };
    session.shippingTotal = shippingCost;

    // Calculate tax by calling pricing service
    const taxableAmount = session.subtotal - session.discountTotal + session.shippingTotal;
    const taxResult = await pricingService.calculateTax({
      amount: taxableAmount,
      state: session.shippingAddress?.state,
      country: session.shippingAddress?.country || "IN"
    });

    let taxTotal = 0;
    let taxBreakdown = null;

    if (taxResult.success && taxResult.data?.data) {
      const taxData = taxResult.data.data;
      taxTotal = taxData.taxAmount || 0;
      taxBreakdown = {
        taxAmount: taxData.taxAmount,
        taxRate: taxData.taxRate,
        taxableAmount: taxData.taxableAmount,
        cgst: taxData.breakdown?.cgst,
        sgst: taxData.breakdown?.sgst
      };
      console.log(`> Tax calculated via pricing service: ${taxTotal} (${taxData.taxRate}%)`);
    } else {
      // Fallback to 18% default GST if pricing service fails
      const defaultTaxRate = 18;
      taxTotal = Math.round((taxableAmount * defaultTaxRate / 100) * 100) / 100;
      taxBreakdown = {
        taxAmount: taxTotal,
        taxRate: defaultTaxRate,
        taxableAmount: taxableAmount,
        cgst: Math.round((taxTotal / 2) * 100) / 100,
        sgst: Math.round((taxTotal / 2) * 100) / 100
      };
      console.log(`> Warning: Pricing service unavailable, using fallback ${defaultTaxRate}% tax: ${taxTotal}`);
    }

    session.taxTotal = taxTotal;
    session.taxBreakdown = taxBreakdown;
    session.grandTotal = session.subtotal - session.discountTotal + session.shippingTotal + taxTotal;
    session.status = CHECKOUT_STATUS.PAYMENT_PENDING;

    await session.save();

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Shipping method selected successfully",
      session,
      null
    );
  } catch (error) {
    console.log("> Error selecting shipping method:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to select shipping method",
      null,
      error.message
    );
  }
};

/**
 * Complete checkout and create order
 * @route POST /api/checkout/:sessionId/complete
 * @access Private (Consumer or Guest)
 */
export const completeCheckout = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { paymentMethod, notes } = req.body;

    // Determine if user is logged in or guest
    const isGuest = req.userType === "guest";
    const identifier = isGuest ? req.guestId : req.userId;
    const identifierField = isGuest ? "sessionId" : "userId";

    console.log(`> Completing checkout for ${isGuest ? "guest" : "user"} session:`, sessionId);

    // Build query based on user type
    const sessionQuery = {
      _id: sessionId,
      [identifierField]: identifier
    };

    const session = await CheckoutSession.findOne(sessionQuery);

    if (!session) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Checkout session not found",
        null,
        null
      );
    }

    if (session.status !== CHECKOUT_STATUS.PAYMENT_PENDING) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Checkout is not ready for completion",
        null,
        null
      );
    }

    if (!session.shippingAddress || !session.billingAddress || !session.shippingMethod) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Missing required checkout information",
        null,
        null
      );
    }

    // Validate applied coupons before order creation
    if (session.appliedCoupons && session.appliedCoupons.length > 0) {
      console.log(`> Validating ${session.appliedCoupons.length} applied coupons`);

      const invalidCoupons = [];
      const validCoupons = [];

      for (const couponCode of session.appliedCoupons) {
        const validationResult = await pricingService.validateCoupon(
          couponCode,
          userId,
          { subtotal: session.subtotal, items: [] }
        );

        if (!validationResult.success || !validationResult.data?.data?.valid) {
          invalidCoupons.push({
            code: couponCode,
            reason: validationResult.data?.data?.reason || "Coupon is no longer valid"
          });
        } else {
          validCoupons.push(couponCode);
        }
      }

      if (invalidCoupons.length > 0) {
        console.log(`> Found ${invalidCoupons.length} invalid/expired coupons`);

        // Update session with only valid coupons
        session.appliedCoupons = validCoupons;

        // Recalculate totals without expired coupons
        // For now, just remove the discount - in a real scenario, you'd need to recalculate through pricing service
        if (validCoupons.length === 0) {
          session.discountTotal = 0;
          session.grandTotal = session.subtotal + session.shippingTotal + session.taxTotal;
        }

        session.status = CHECKOUT_STATUS.PAYMENT_PENDING;
        await session.save();

        return sendResponse(
          res,
          HTTP_STATUS.CONFLICT,
          "Some coupons are no longer valid. Totals have been updated.",
          {
            invalidCoupons,
            newTotals: {
              subtotal: session.subtotal,
              discountTotal: session.discountTotal,
              shippingTotal: session.shippingTotal,
              taxTotal: session.taxTotal,
              grandTotal: session.grandTotal
            },
            message: "Please review the updated totals and proceed again."
          },
          "COUPON_EXPIRED"
        );
      }

      console.log("> All coupons validated successfully");
    }

    const cart = await Cart.findById(session.cartId);
    const cartItems = await CartItem.find({ cartId: session.cartId }).lean();

    if (!cart || cartItems.length === 0) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cart not found or empty",
        null,
        null
      );
    }

    // Validate prices before order creation
    console.log("> Validating current prices for all cart items");
    const variantIds = cartItems.map(item => item.variantId);
    const pricesResult = await pricingService.bulkGetPrices(variantIds, identifier);

    if (pricesResult.success && pricesResult.data?.data?.prices) {
      const currentPrices = pricesResult.data.data.prices;
      const priceChanges = [];

      for (const item of cartItems) {
        const currentPrice = currentPrices[item.variantId];
        if (currentPrice && currentPrice.finalPrice !== item.unitPrice) {
          priceChanges.push({
            variantId: item.variantId,
            productId: item.productId,
            oldPrice: item.unitPrice,
            newPrice: currentPrice.finalPrice,
            quantity: item.quantity,
            priceDifference: currentPrice.finalPrice - item.unitPrice
          });
        }
      }

      if (priceChanges.length > 0) {
        console.log(`> Price changes detected for ${priceChanges.length} items`);
        session.status = CHECKOUT_STATUS.FAILED;
        session.failureReason = "Price changes detected";
        await session.save();

        const totalPriceDifference = priceChanges.reduce((sum, change) =>
          sum + (change.priceDifference * change.quantity), 0
        );

        return sendResponse(
          res,
          HTTP_STATUS.CONFLICT,
          "Price changes detected. Please review your cart and try again.",
          {
            priceChanges,
            totalPriceDifference,
            message: "One or more items in your cart have changed in price. Please review and proceed again."
          },
          "PRICE_CHANGE_DETECTED"
        );
      }

      console.log("> All prices validated successfully");
    } else {
      console.log("> Warning: Unable to validate prices, proceeding with order");
    }

    // Re-validate stock availability before order creation
    console.log("> Re-validating stock availability for all cart items");
    const outOfStockItems = [];

    for (const item of cartItems) {
      const stockCheck = await inventoryService.checkStock(item.variantId, item.quantity);
      if (!stockCheck.success || !stockCheck.data?.available) {
        outOfStockItems.push({
          variantId: item.variantId,
          productId: item.productId,
          requestedQuantity: item.quantity,
          availableQuantity: stockCheck.data?.availableQuantity || 0
        });
      }
    }

    if (outOfStockItems.length > 0) {
      console.log(`> Out of stock items detected: ${outOfStockItems.length}`);

      // Release all inventory reservations
      await inventoryService.releaseReservations(cart._id.toString());

      session.status = CHECKOUT_STATUS.FAILED;
      session.failureReason = "Items out of stock";
      await session.save();

      return sendResponse(
        res,
        HTTP_STATUS.CONFLICT,
        "Some items are no longer available. Please update your cart.",
        {
          outOfStockItems,
          message: "One or more items in your cart are no longer available in the requested quantity."
        },
        "OUT_OF_STOCK"
      );
    }

    console.log("> All items in stock, proceeding with order creation");

    const orderNumber = await generateOrderNumber();

    // Prepare order data based on user type
    const orderData = {
      orderNumber,
      status: ORDER_STATUS.PENDING,
      paymentStatus: PAYMENT_STATUS.PENDING,
      shippingAddressSnapshot: session.shippingAddress,
      billingAddressSnapshot: session.billingAddress,
      shippingMethodSnapshot: session.shippingMethod,
      appliedCouponsSnapshot: session.appliedCoupons,
      appliedDiscountsSnapshot: session.appliedDiscounts,
      currency: session.currency,
      subtotal: session.subtotal,
      discountTotal: session.discountTotal,
      shippingTotal: session.shippingTotal,
      taxTotal: session.taxTotal,
      grandTotal: session.grandTotal,
      itemCount: session.itemCount,
      notes: notes || ""
    };

    if (isGuest) {
      // For guest orders
      orderData.guestSessionId = identifier;
      orderData.orderType = "guest";
      orderData.userId = null;

      // Extract guest info from shipping address
      orderData.guestInfo = {
        firstName: session.shippingAddress?.firstName || "",
        lastName: session.shippingAddress?.lastName || "",
        email: session.shippingAddress?.email || "",
        phone: session.shippingAddress?.phone || ""
      };
    } else {
      // For registered user orders
      orderData.userId = identifier;
      orderData.orderType = "registered";
      orderData.guestSessionId = null;
      orderData.guestInfo = null;
    }

    const order = await Order.create(orderData);

    const productPromises = cartItems.map(item =>
      catalogService.getProductVariant(item.productId, item.variantId)
    );
    const productResults = await Promise.all(productPromises);

    const orderItemsData = cartItems.map((item, index) => {
      const productData = productResults[index].success ? productResults[index].data : {};
      return createOrderItemSnapshot(item, productData, order._id);
    });

    await OrderItem.insertMany(orderItemsData);

    const conversionResult = await inventoryService.convertReservationsToSale(
      cart._id.toString(),
      order._id.toString()
    );

    if (!conversionResult.success) {
      console.log("> Failed to convert inventory reservations");
    }

    // Record coupon usage for all applied coupons
    if (session.appliedCoupons && session.appliedCoupons.length > 0) {
      console.log(`> Recording usage for ${session.appliedCoupons.length} coupons`);

      for (const couponCode of session.appliedCoupons) {
        try {
          const usageResult = await pricingService.recordCouponUsage(
            couponCode,
            identifier,
            order._id.toString()
          );

          if (usageResult.success) {
            console.log(`> Successfully recorded usage for coupon: ${couponCode}`);
          } else {
            console.log(`> Warning: Failed to record usage for coupon ${couponCode}: ${usageResult.error}`);
          }
        } catch (error) {
          console.log(`> Warning: Error recording coupon usage for ${couponCode}: ${error.message}`);
        }
      }
    }

    const idempotencyKey = `payment-${identifier}-${order._id}-${Date.now()}`;

    const razorpayOrder = await createRazorpayOrder(order, idempotencyKey);

    if (!razorpayOrder.success) {
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Failed to create payment",
        null,
        razorpayOrder.error
      );
    }

    const payment = await Payment.create({
      orderId: order._id,
      idempotencyKey,
      gateway: "razorpay",
      gatewayOrderId: razorpayOrder.data.id,
      method: paymentMethod,
      status: PAYMENT_STATUS.INITIATED,
      amount: Math.round(order.grandTotal * 100),
      currency: order.currency
    });

    cart.status = CART_STATUS.CONVERTED;
    cart.convertedOrderId = order._id;
    await cart.save();

    session.status = CHECKOUT_STATUS.COMPLETED;
    session.orderId = order._id;
    await session.save();

    return sendResponse(
      res,
      HTTP_STATUS.CREATED,
      "Order created successfully",
      {
        order,
        payment: {
          razorpayOrderId: razorpayOrder.data.id,
          amount: payment.amount,
          currency: payment.currency,
          keyId: process.env.RAZORPAY_KEY_ID
        }
      },
      null
    );
  } catch (error) {
    console.log("> Error completing checkout:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to complete checkout",
      null,
      error.message
    );
  }
};

/**
 * Get checkout session
 * @route GET /api/checkout/:sessionId
 * @access Private (Consumer or Guest)
 */
export const getCheckoutSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Determine if user is logged in or guest
    const isGuest = req.userType === "guest";
    const identifier = isGuest ? req.guestId : req.userId;
    const identifierField = isGuest ? "sessionId" : "userId";

    console.log(`> Getting checkout session for ${isGuest ? "guest" : "user"}:`, sessionId);

    // Build query based on user type
    const sessionQuery = {
      _id: sessionId,
      [identifierField]: identifier
    };

    const session = await CheckoutSession.findOne(sessionQuery).lean();

    if (!session) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Checkout session not found",
        null,
        null
      );
    }

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Checkout session retrieved successfully",
      session,
      null
    );
  } catch (error) {
    console.log("> Error getting checkout session:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve checkout session",
      null,
      error.message
    );
  }
};

/**
 * Cancel checkout session
 * @route DELETE /api/checkout/:sessionId
 * @access Private (Consumer or Guest)
 */
export const cancelCheckout = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Determine if user is logged in or guest
    const isGuest = req.userType === "guest";
    const identifier = isGuest ? req.guestId : req.userId;
    const identifierField = isGuest ? "sessionId" : "userId";

    console.log(`> Canceling checkout session for ${isGuest ? "guest" : "user"}:`, sessionId);

    // Build query based on user type
    const sessionQuery = {
      _id: sessionId,
      [identifierField]: identifier
    };

    const session = await CheckoutSession.findOne(sessionQuery);

    if (!session) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Checkout session not found",
        null,
        null
      );
    }

    if (session.status === CHECKOUT_STATUS.COMPLETED) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot cancel completed checkout",
        null,
        null
      );
    }

    const cart = await Cart.findById(session.cartId);
    if (cart) {
      await inventoryService.releaseReservations(cart._id.toString());
    }

    session.status = CHECKOUT_STATUS.FAILED;
    await session.save();

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Checkout cancelled successfully",
      null,
      null
    );
  } catch (error) {
    console.log("> Error canceling checkout:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to cancel checkout",
      null,
      error.message
    );
  }
};

/**
 * Get checkout session by ID (admin)
 * @route GET /api/admin/checkout/:sessionId
 * @access Private (Admin)
 */
export const getCheckoutById = async (req, res) => {
  try {
    const { sessionId } = req.params;

    console.log("> Getting checkout session by ID:", sessionId);

    const session = await CheckoutSession.findById(sessionId).lean();

    if (!session) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Checkout session not found",
        null,
        null
      );
    }

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Checkout session retrieved successfully",
      session,
      null
    );
  } catch (error) {
    console.log("> Error getting checkout by ID:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve checkout session",
      null,
      error.message
    );
  }
};

/**
 * Get expired checkout sessions (admin)
 * @route GET /api/admin/checkout/expired
 * @access Private (Admin)
 */
export const getExpiredCheckouts = async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    console.log("> Getting expired checkout sessions");

    const query = {
      status: { $in: [CHECKOUT_STATUS.INITIATED, CHECKOUT_STATUS.ADDRESS_ENTERED, CHECKOUT_STATUS.PAYMENT_PENDING] },
      expiresAt: { $lt: new Date() }
    };

    if (startDate) {
      query.createdAt = { ...query.createdAt, $gte: new Date(startDate) };
    }

    if (endDate) {
      query.createdAt = { ...query.createdAt, $lte: new Date(endDate) };
    }

    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      CheckoutSession.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      CheckoutSession.countDocuments(query)
    ]);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Expired checkout sessions retrieved successfully",
      {
        sessions,
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
    console.log("> Error getting expired checkouts:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve expired checkouts",
      null,
      error.message
    );
  }
};

/**
 * Helper function to create Razorpay order
 * @param {Object} order - Order object
 * @param {string} idempotencyKey - Idempotency key
 * @returns {Promise<Object>} Razorpay order response
 */
const createRazorpayOrder = async (order, idempotencyKey) => {
  // Payment bypass mode - when true, returns mock Razorpay order without calling actual API
  const PAYMENT_BYPASS_MODE = process.env.PAYMENT_BYPASS_MODE === "true" || true; // Default to true until Razorpay is configured

  if (PAYMENT_BYPASS_MODE) {
    console.log("> Payment bypass mode: Simulating Razorpay order creation");
    const mockOrderId = `order_${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

    return {
      success: true,
      data: {
        id: mockOrderId,
        entity: "order",
        amount: Math.round(order.grandTotal * 100),
        amount_paid: 0,
        amount_due: Math.round(order.grandTotal * 100),
        currency: order.currency,
        receipt: order.orderNumber,
        status: "created",
        attempts: 0,
        notes: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          idempotencyKey,
          bypassMode: "true"
        },
        created_at: Math.floor(Date.now() / 1000)
      }
    };
  }

  try {
    const Razorpay = (await import("razorpay")).default;

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.grandTotal * 100),
      currency: order.currency,
      receipt: order.orderNumber,
      notes: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        idempotencyKey
      }
    });

    return { success: true, data: razorpayOrder };
  } catch (error) {
    console.log("> Error creating Razorpay order:", error.message);
    return { success: false, error: error.message };
  }
};
