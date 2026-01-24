import { sendResponse, HTTP_STATUS } from "@shared/utils";
import TierDiscount from "../../models/tierDiscount.model.js";

/**
 * @route GET /api/admin/tier-discounts
 * @description Get all tier discounts with pagination and filters
 * @access Admin
 * @requestQuery {
 *   page: number,
 *   limit: number,
 *   isActive: boolean,
 *   type: string (cart_value|cart_quantity)
 * }
 * @responseBody {
 *   tierDiscounts: array,
 *   pagination: { page, limit, total, totalPages }
 * }
 */
export const getAllTierDiscounts = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive, type } = req.query;

    console.log(`> GET /api/admin/tier-discounts - Query:`, { page, limit, isActive, type });

    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (type) filter.type = type;

    const skip = (page - 1) * limit;

    const [tierDiscounts, total] = await Promise.all([
      TierDiscount.find(filter)
        .populate("createdById", "fullName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      TierDiscount.countDocuments(filter),
    ]);

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    };

    console.log(`> Found ${tierDiscounts.length} tier discounts`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Tier discounts retrieved successfully",
      { tierDiscounts, pagination },
      null
    );
  } catch (error) {
    console.log(`> Error fetching tier discounts: ${error.message}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch tier discounts",
      null,
      error.message
    );
  }
};

/**
 * @route POST /api/admin/tier-discounts
 * @description Create a new tier discount with levels
 * @access Admin
 * @requestBody {
 *   name: string (required),
 *   description: string,
 *   type: string (cart_value|cart_quantity, required),
 *   levels: array (required) [
 *     {
 *       min: number (required),
 *       max: number,
 *       discountType: string (percentage|fixed_amount, required),
 *       discountValue: number (required),
 *       badge: string
 *     }
 *   ],
 *   isActive: boolean,
 *   startsAt: date,
 *   endsAt: date
 * }
 * @responseBody { tierDiscount: object }
 */
export const createTierDiscount = async (req, res) => {
  try {
    const tierDiscountData = {
      ...req.body,
      createdById: req.adminId,
    };

    console.log(`> POST /api/admin/tier-discounts - Creating:`, tierDiscountData.name);
    console.log(`> Levels count: ${tierDiscountData.levels?.length || 0}`);

    const tierDiscount = await TierDiscount.create(tierDiscountData);
    await tierDiscount.populate("createdById", "fullName email");

    console.log(`> Tier discount created with ID: ${tierDiscount._id}`);

    return sendResponse(
      res,
      HTTP_STATUS.CREATED,
      "Tier discount created successfully",
      { tierDiscount },
      null
    );
  } catch (error) {
    console.log(`> Error creating tier discount: ${error.message}`);

    if (error.code === 11000) {
      return sendResponse(
        res,
        HTTP_STATUS.CONFLICT,
        "Tier discount with this name already exists",
        null,
        error.message
      );
    }

    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create tier discount",
      null,
      error.message
    );
  }
};

/**
 * @route GET /api/admin/tier-discounts/:id
 * @description Get single tier discount details with levels
 * @access Admin
 * @responseBody { tierDiscount: object }
 */
export const getTierDiscountById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`> GET /api/admin/tier-discounts/${id}`);

    const tierDiscount = await TierDiscount.findById(id).populate(
      "createdById",
      "fullName email"
    );

    if (!tierDiscount) {
      console.log(`> Tier discount not found: ${id}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Tier discount not found",
        null,
        "No tier discount found with the provided ID"
      );
    }

    console.log(`> Tier discount found: ${tierDiscount.name}`);
    console.log(`> Levels count: ${tierDiscount.levels.length}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Tier discount retrieved successfully",
      { tierDiscount },
      null
    );
  } catch (error) {
    console.log(`> Error fetching tier discount: ${error.message}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch tier discount",
      null,
      error.message
    );
  }
};

/**
 * @route PUT /api/admin/tier-discounts/:id
 * @description Update tier discount including levels
 * @access Admin
 * @requestBody {
 *   name: string,
 *   description: string,
 *   type: string,
 *   levels: array,
 *   isActive: boolean,
 *   startsAt: date,
 *   endsAt: date
 * }
 * @responseBody { tierDiscount: object }
 */
export const updateTierDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log(`> PUT /api/admin/tier-discounts/${id} - Updating with:`, Object.keys(updateData));
    if (updateData.levels) {
      console.log(`> New levels count: ${updateData.levels.length}`);
    }

    const tierDiscount = await TierDiscount.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("createdById", "fullName email");

    if (!tierDiscount) {
      console.log(`> Tier discount not found: ${id}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Tier discount not found",
        null,
        "No tier discount found with the provided ID"
      );
    }

    console.log(`> Tier discount updated: ${tierDiscount.name}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Tier discount updated successfully",
      { tierDiscount },
      null
    );
  } catch (error) {
    console.log(`> Error updating tier discount: ${error.message}`);

    if (error.code === 11000) {
      return sendResponse(
        res,
        HTTP_STATUS.CONFLICT,
        "Tier discount with this name already exists",
        null,
        error.message
      );
    }

    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update tier discount",
      null,
      error.message
    );
  }
};

/**
 * @route DELETE /api/admin/tier-discounts/:id
 * @description Delete tier discount
 * @access Admin
 * @responseBody { message: string }
 */
export const deleteTierDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`> DELETE /api/admin/tier-discounts/${id}`);

    const tierDiscount = await TierDiscount.findByIdAndDelete(id);

    if (!tierDiscount) {
      console.log(`> Tier discount not found: ${id}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Tier discount not found",
        null,
        "No tier discount found with the provided ID"
      );
    }

    console.log(`> Tier discount deleted: ${tierDiscount.name}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Tier discount deleted successfully",
      { deletedId: id },
      null
    );
  } catch (error) {
    console.log(`> Error deleting tier discount: ${error.message}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to delete tier discount",
      null,
      error.message
    );
  }
};

export default {
  getAllTierDiscounts,
  createTierDiscount,
  getTierDiscountById,
  updateTierDiscount,
  deleteTierDiscount,
};
