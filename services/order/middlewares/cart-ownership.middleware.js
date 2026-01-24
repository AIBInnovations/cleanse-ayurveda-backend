import { sendResponse, HTTP_STATUS } from "@shared/utils";
import { Cart, CartItem } from "../models/index.js";

/**
 * Middleware to verify cart ownership
 * Ensures user/guest can only access their own cart
 */
export const verifyCartOwnership = async (req, res, next) => {
  try {
    console.log("> Verifying cart ownership");

    // Determine if user is logged in or guest
    const isGuest = req.userType === "guest";
    const identifier = isGuest ? req.guestId : req.userId;
    const identifierField = isGuest ? "sessionId" : "userId";

    const { cartId } = req.params;

    if (!cartId) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cart ID is required",
        null,
        null
      );
    }

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

    // Verify ownership based on user type
    if (cart[identifierField] !== identifier) {
      console.log("> Cart ownership verification failed");
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "You do not have access to this cart",
        null,
        null
      );
    }

    req.cart = cart;
    next();
  } catch (error) {
    console.log("> Error verifying cart ownership:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to verify cart ownership",
      null,
      error.message
    );
  }
};

/**
 * Middleware to verify cart item ownership
 * Ensures user/guest can only modify items in their own cart
 */
export const verifyCartItemOwnership = async (req, res, next) => {
  try {
    console.log("> Verifying cart item ownership");

    // Determine if user is logged in or guest
    const isGuest = req.userType === "guest";
    const identifier = isGuest ? req.guestId : req.userId;
    const identifierField = isGuest ? "sessionId" : "userId";

    const { itemId } = req.params;

    if (!itemId) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Item ID is required",
        null,
        null
      );
    }

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

    const cart = await Cart.findById(cartItem.cartId);

    if (!cart) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Cart not found",
        null,
        null
      );
    }

    // Verify ownership based on user type
    if (cart[identifierField] !== identifier) {
      console.log("> Cart item ownership verification failed");
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "You do not have access to this cart item",
        null,
        null
      );
    }

    req.cart = cart;
    req.cartItem = cartItem;
    next();
  } catch (error) {
    console.log("> Error verifying cart item ownership:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to verify cart item ownership",
      null,
      error.message
    );
  }
};
