import Wishlist from "../../models/wishlist.model.js";
import { sendResponse } from "@shared/utils";
import { parsePagination, buildPaginationMeta } from "../../services/pagination.service.js";

/**
 * @route GET /api/wishlist
 * @description Get user's wishlist
 * @access Auth
 */
export const getWishlist = async (req, res) => {
  const userId = req.user._id;
  console.log(`> GET /api/wishlist for user ${userId}`);

  try {
    const { page, limit, skip } = parsePagination(req.query);

    let wishlist = await Wishlist.findOne({ user: userId })
      .populate({
        path: "items.product",
        select: "name slug shortDescription status",
        match: { status: "active", deletedAt: null },
      })
      .populate({
        path: "items.variant",
        select: "name sku mrp salePrice discountPercent isActive",
        match: { isActive: true, deletedAt: null },
      })
      .lean();

    if (!wishlist) {
      console.log(`> No wishlist found for user ${userId}, returning empty`);
      return sendResponse(res, 200, "Wishlist fetched successfully", {
        items: [],
        pagination: buildPaginationMeta(0, page, limit),
      }, null);
    }

    // Filter out items where product was not populated (deleted/inactive products)
    const validItems = wishlist.items.filter((item) => item.product !== null);

    // Apply pagination to items
    const total = validItems.length;
    const paginatedItems = validItems.slice(skip, skip + limit);

    const pagination = buildPaginationMeta(total, page, limit);

    console.log(`> Wishlist has ${total} items`);
    return sendResponse(res, 200, "Wishlist fetched successfully", {
      items: paginatedItems,
      pagination,
    }, null);
  } catch (error) {
    console.log("> Error fetching wishlist:", error.message);
    return sendResponse(res, 500, "Failed to fetch wishlist", null, error.message);
  }
};

/**
 * @route POST /api/wishlist/items
 * @description Add item to wishlist
 * @access Auth
 */
export const addItem = async (req, res) => {
  const userId = req.user._id;
  const { productId, variantId } = req.body;
  console.log(`> POST /api/wishlist/items for user ${userId}`);

  try {
    let wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      // Create new wishlist
      wishlist = new Wishlist({
        user: userId,
        items: [],
      });
    }

    // Check if product already in wishlist
    const existingItem = wishlist.items.find(
      (item) => item.product.toString() === productId
    );

    if (existingItem) {
      console.log(`> Product ${productId} already in wishlist`);
      return sendResponse(res, 409, "Item already in wishlist", null, "This product is already in your wishlist");
    }

    // Add new item
    wishlist.items.push({
      product: productId,
      variant: variantId || null,
      addedAt: new Date(),
    });

    await wishlist.save();

    console.log(`> Item added to wishlist: ${productId}`);
    return sendResponse(res, 201, "Item added to wishlist", {
      item: wishlist.items[wishlist.items.length - 1],
      totalItems: wishlist.items.length,
    }, null);
  } catch (error) {
    console.log("> Error adding item to wishlist:", error.message);
    return sendResponse(res, 500, "Failed to add item to wishlist", null, error.message);
  }
};

/**
 * @route DELETE /api/wishlist/items/:productId
 * @description Remove item from wishlist
 * @access Auth
 */
export const removeItem = async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.params;
  console.log(`> DELETE /api/wishlist/items/${productId} for user ${userId}`);

  try {
    const wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      console.log(`> Wishlist not found for user ${userId}`);
      return sendResponse(res, 404, "Wishlist not found", null, "Wishlist not found");
    }

    const initialLength = wishlist.items.length;
    wishlist.items = wishlist.items.filter(
      (item) => item.product.toString() !== productId
    );

    if (wishlist.items.length === initialLength) {
      console.log(`> Product ${productId} not in wishlist`);
      return sendResponse(res, 404, "Item not found", null, "This product is not in your wishlist");
    }

    await wishlist.save();

    console.log(`> Item removed from wishlist: ${productId}`);
    return sendResponse(res, 200, "Item removed from wishlist", {
      totalItems: wishlist.items.length,
    }, null);
  } catch (error) {
    console.log("> Error removing item from wishlist:", error.message);
    return sendResponse(res, 500, "Failed to remove item from wishlist", null, error.message);
  }
};

/**
 * @route DELETE /api/wishlist
 * @description Clear entire wishlist
 * @access Auth
 */
export const clearWishlist = async (req, res) => {
  const userId = req.user._id;
  console.log(`> DELETE /api/wishlist for user ${userId}`);

  try {
    const result = await Wishlist.findOneAndUpdate(
      { user: userId },
      { $set: { items: [] } },
      { new: true }
    );

    if (!result) {
      console.log(`> Wishlist not found for user ${userId}`);
      return sendResponse(res, 404, "Wishlist not found", null, "Wishlist not found");
    }

    console.log(`> Wishlist cleared for user ${userId}`);
    return sendResponse(res, 200, "Wishlist cleared successfully", null, null);
  } catch (error) {
    console.log("> Error clearing wishlist:", error.message);
    return sendResponse(res, 500, "Failed to clear wishlist", null, error.message);
  }
};

/**
 * @route GET /api/wishlist/check/:productId
 * @description Check if product is in wishlist
 * @access Auth
 */
export const checkItem = async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.params;
  console.log(`> GET /api/wishlist/check/${productId}`);

  try {
    const wishlist = await Wishlist.findOne({
      user: userId,
      "items.product": productId,
    });

    const inWishlist = !!wishlist;

    console.log(`> Product ${productId} in wishlist: ${inWishlist}`);
    return sendResponse(res, 200, "Check completed", { inWishlist }, null);
  } catch (error) {
    console.log("> Error checking wishlist:", error.message);
    return sendResponse(res, 500, "Failed to check wishlist", null, error.message);
  }
};

export default {
  getWishlist,
  addItem,
  removeItem,
  clearWishlist,
  checkItem,
};
