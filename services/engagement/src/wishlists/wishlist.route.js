import { Router } from "express";
import {
  getWishlist,
  addItem,
  removeItem,
  clearWishlist,
  checkItem,
} from "./wishlist.controller.js";
import { validate } from "@shared/middlewares";
import { authenticateUser } from "@shared/auth-middleware";
import {
  addItemSchema,
  removeItemSchema,
  getWishlistSchema,
} from "./wishlist.validation.js";

const router = Router();

// All wishlist routes require authentication
router.use(authenticateUser);

/**
 * @route GET /api/wishlist
 * @description Get user's wishlist
 * @access Auth
 */
router.get("/", validate(getWishlistSchema), getWishlist);

/**
 * @route POST /api/wishlist/items
 * @description Add item to wishlist
 * @access Auth
 */
router.post("/items", validate(addItemSchema), addItem);

/**
 * @route DELETE /api/wishlist/items/:productId
 * @description Remove item from wishlist
 * @access Auth
 */
router.delete("/items/:productId", validate(removeItemSchema), removeItem);

/**
 * @route DELETE /api/wishlist
 * @description Clear entire wishlist
 * @access Auth
 */
router.delete("/", clearWishlist);

/**
 * @route GET /api/wishlist/check/:productId
 * @description Check if product is in wishlist
 * @access Auth
 */
router.get("/check/:productId", validate(removeItemSchema), checkItem);

export default router;
