import Coupon from "../../models/coupon.model.js";
import CouponUsage from "../../models/couponUsage.model.js";
import { validateCoupon } from "../../services/coupon.service.js";
import { sendResponse } from "@shared/utils";
import { HTTP_STATUS } from "../../utils/constants.js";

/**
 * @route POST /api/coupons/validate
 * @description Validate coupon code for consumer
 * @access Public
 *
 * @requestBody application/json
 * {
 *   "code": "SAVE20",
 *   "cartSubtotal": 1000
 * }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Coupon is valid",
 *   "data": {
 *     "valid": true,
 *     "coupon": { ... }
 *   },
 *   "error": null
 * }
 */
export const validateCouponCode = async (req, res) => {
  console.log("> Validate coupon request received");
  console.log("> Request body:", req.body);

  try {
    const { code, cartSubtotal } = req.body;
    const userId = req.userId || null;

    const cartData = { subtotal: cartSubtotal };
    const result = await validateCoupon(code, userId, cartData);

    if (result.valid) {
      return sendResponse(
        res,
        HTTP_STATUS.OK,
        "Coupon is valid",
        result,
        null
      );
    } else {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Coupon validation failed",
        { valid: false },
        result.error
      );
    }
  } catch (error) {
    console.log(`> Error validating coupon: ${error.message}`);
    console.log(`> Stack: ${error.stack}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Error validating coupon",
      null,
      error.message
    );
  }
};

/**
 * @route GET /api/admin/coupons
 * @description List all coupons with pagination and filters
 * @access Admin
 *
 * @queryParams
 * page: number (default: 1)
 * limit: number (default: 20)
 * isActive: boolean
 * type: string
 *
 * @responseBody Success (200)
 * {
 *   "message": "Coupons retrieved successfully",
 *   "data": {
 *     "coupons": [ ... ],
 *     "pagination": {
 *       "total": 100,
 *       "page": 1,
 *       "limit": 20,
 *       "totalPages": 5
 *     }
 *   },
 *   "error": null
 * }
 */
export const getAllCoupons = async (req, res) => {
  console.log("> Get all coupons request received");
  console.log("> Query params:", req.query);

  try {
    const { page = 1, limit = 20, isActive, type } = req.query;

    const query = { deletedAt: null };

    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    if (type) {
      query.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [coupons, total] = await Promise.all([
      Coupon.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("createdById", "firstName lastName email"),
      Coupon.countDocuments(query),
    ]);

    const pagination = {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    };

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Coupons retrieved successfully",
      { coupons, pagination },
      null
    );
  } catch (error) {
    console.log(`> Error getting coupons: ${error.message}`);
    console.log(`> Stack: ${error.stack}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Error retrieving coupons",
      null,
      error.message
    );
  }
};

/**
 * @route POST /api/admin/coupons
 * @description Create new coupon
 * @access Admin
 *
 * @requestBody application/json
 * {
 *   "code": "SAVE20",
 *   "name": "20% Off Sale",
 *   "type": "percentage",
 *   "value": 20,
 *   "startsAt": "2024-01-01",
 *   "endsAt": "2024-12-31"
 * }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Coupon created successfully",
 *   "data": { ... },
 *   "error": null
 * }
 */
export const createCoupon = async (req, res) => {
  console.log("> Create coupon request received");
  console.log("> Request body:", req.body);

  try {
    const couponData = {
      ...req.body,
      code: req.body.code.toUpperCase(),
      createdById: req.adminId,
    };

    const coupon = await Coupon.create(couponData);

    console.log(`> Coupon created: ${coupon.code}`);
    return sendResponse(
      res,
      HTTP_STATUS.CREATED,
      "Coupon created successfully",
      coupon,
      null
    );
  } catch (error) {
    console.log(`> Error creating coupon: ${error.message}`);
    console.log(`> Stack: ${error.stack}`);

    if (error.code === 11000) {
      return sendResponse(
        res,
        HTTP_STATUS.CONFLICT,
        "Coupon code already exists",
        null,
        "A coupon with this code already exists"
      );
    }

    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Error creating coupon",
      null,
      error.message
    );
  }
};

/**
 * @route GET /api/admin/coupons/:id
 * @description Get single coupon details
 * @access Admin
 *
 * @responseBody Success (200)
 * {
 *   "message": "Coupon retrieved successfully",
 *   "data": { ... },
 *   "error": null
 * }
 */
export const getCouponById = async (req, res) => {
  console.log("> Get coupon by ID request received");
  console.log("> Coupon ID:", req.params.id);

  try {
    const coupon = await Coupon.findOne({
      _id: req.params.id,
      deletedAt: null,
    }).populate("createdById", "firstName lastName email");

    if (!coupon) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Coupon not found",
        null,
        "Coupon does not exist or has been deleted"
      );
    }

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Coupon retrieved successfully",
      coupon,
      null
    );
  } catch (error) {
    console.log(`> Error getting coupon: ${error.message}`);
    console.log(`> Stack: ${error.stack}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Error retrieving coupon",
      null,
      error.message
    );
  }
};

/**
 * @route PUT /api/admin/coupons/:id
 * @description Update coupon
 * @access Admin
 *
 * @requestBody application/json
 * {
 *   "name": "Updated name",
 *   "isActive": false
 * }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Coupon updated successfully",
 *   "data": { ... },
 *   "error": null
 * }
 */
export const updateCoupon = async (req, res) => {
  console.log("> Update coupon request received");
  console.log("> Coupon ID:", req.params.id);
  console.log("> Request body:", req.body);

  try {
    // Don't allow code to be changed
    if (req.body.code) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot update coupon code",
        null,
        "Coupon code cannot be modified"
      );
    }

    const coupon = await Coupon.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate("createdById", "firstName lastName email");

    if (!coupon) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Coupon not found",
        null,
        "Coupon does not exist or has been deleted"
      );
    }

    console.log(`> Coupon updated: ${coupon.code}`);
    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Coupon updated successfully",
      coupon,
      null
    );
  } catch (error) {
    console.log(`> Error updating coupon: ${error.message}`);
    console.log(`> Stack: ${error.stack}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Error updating coupon",
      null,
      error.message
    );
  }
};

/**
 * @route DELETE /api/admin/coupons/:id
 * @description Soft delete coupon
 * @access Admin
 *
 * @responseBody Success (200)
 * {
 *   "message": "Coupon deleted successfully",
 *   "data": null,
 *   "error": null
 * }
 */
export const deleteCoupon = async (req, res) => {
  console.log("> Delete coupon request received");
  console.log("> Coupon ID:", req.params.id);

  try {
    const coupon = await Coupon.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true }
    );

    if (!coupon) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Coupon not found",
        null,
        "Coupon does not exist or has already been deleted"
      );
    }

    console.log(`> Coupon deleted: ${coupon.code}`);
    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Coupon deleted successfully",
      null,
      null
    );
  } catch (error) {
    console.log(`> Error deleting coupon: ${error.message}`);
    console.log(`> Stack: ${error.stack}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Error deleting coupon",
      null,
      error.message
    );
  }
};

/**
 * @route GET /api/admin/coupons/:id/usage
 * @description Get coupon usage report
 * @access Admin
 *
 * @responseBody Success (200)
 * {
 *   "message": "Usage report retrieved successfully",
 *   "data": {
 *     "totalUsage": 150,
 *     "uniqueUsers": 120,
 *     "totalDiscount": 15000,
 *     "recentUsage": [ ... ]
 *   },
 *   "error": null
 * }
 */
export const getCouponUsage = async (req, res) => {
  console.log("> Get coupon usage request received");
  console.log("> Coupon ID:", req.params.id);

  try {
    const coupon = await Coupon.findOne({
      _id: req.params.id,
      deletedAt: null,
    });

    if (!coupon) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Coupon not found",
        null,
        "Coupon does not exist or has been deleted"
      );
    }

    const [totalUsage, uniqueUsers, discountStats, recentUsage] = await Promise.all([
      CouponUsage.countDocuments({ couponId: req.params.id }),
      CouponUsage.distinct("userId", { couponId: req.params.id }),
      CouponUsage.aggregate([
        { $match: { couponId: coupon._id } },
        {
          $group: {
            _id: null,
            totalDiscount: { $sum: "$discountAmount" },
          },
        },
      ]),
      CouponUsage.find({ couponId: req.params.id })
        .sort({ usedAt: -1 })
        .limit(10)
        .populate("userId", "firstName lastName phone")
        .populate("orderId", "orderNumber"),
    ]);

    const report = {
      totalUsage,
      uniqueUsers: uniqueUsers.length,
      totalDiscount: discountStats[0]?.totalDiscount || 0,
      recentUsage,
    };

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Usage report retrieved successfully",
      report,
      null
    );
  } catch (error) {
    console.log(`> Error getting coupon usage: ${error.message}`);
    console.log(`> Stack: ${error.stack}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Error retrieving usage report",
      null,
      error.message
    );
  }
};

/**
 * @route POST /api/coupons/usage/validate
 * @description Validate if user can use a coupon (check usage limits)
 * @access Public
 *
 * @requestBody application/json
 * {
 *   "code": "SAVE20",
 *   "userId": "user_id"
 * }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Coupon usage validation successful",
 *   "data": {
 *     "canUse": true,
 *     "remainingUses": 2
 *   }
 * }
 */
export const validateCouponUsage = async (req, res) => {
  console.log("> Validate coupon usage request received");
  console.log("> Request body:", req.body);

  try {
    const { code, userId } = req.body;

    // Find coupon
    const coupon = await Coupon.findOne({ code, isActive: true, deletedAt: null });

    if (!coupon) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Coupon not found or inactive",
        { canUse: false },
        "Invalid coupon code"
      );
    }

    // Check if coupon has usage limits
    if (coupon.maxUsagePerUser) {
      const userUsageCount = await CouponUsage.countDocuments({
        couponId: coupon._id,
        userId,
      });

      if (userUsageCount >= coupon.maxUsagePerUser) {
        return sendResponse(
          res,
          HTTP_STATUS.BAD_REQUEST,
          "Coupon usage limit exceeded",
          {
            canUse: false,
            remainingUses: 0,
          },
          "You have reached the maximum usage limit for this coupon"
        );
      }

      const remainingUses = coupon.maxUsagePerUser - userUsageCount;

      return sendResponse(
        res,
        HTTP_STATUS.OK,
        "Coupon usage validation successful",
        {
          canUse: true,
          remainingUses,
        },
        null
      );
    }

    // No usage limit
    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Coupon usage validation successful",
      {
        canUse: true,
        remainingUses: -1, // Unlimited
      },
      null
    );
  } catch (error) {
    console.log(`> Error validating coupon usage: ${error.message}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Error validating coupon usage",
      null,
      error.message
    );
  }
};

export default {
  validateCouponCode,
  getAllCoupons,
  createCoupon,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  getCouponUsage,
  validateCouponUsage,
};
