import { sendResponse, HTTP_STATUS } from "@shared/utils";
import FreeGiftRule from "../../models/freeGiftRule.model.js";

/**
 * @route GET /api/admin/free-gift-rules
 * @description Get all free gift rules with pagination and filters
 * @access Admin
 * @requestQuery {
 *   page: number,
 *   limit: number,
 *   isActive: boolean,
 *   triggerType: string (cart_value|product_purchase)
 * }
 * @responseBody {
 *   freeGiftRules: array,
 *   pagination: { page, limit, total, totalPages }
 * }
 */
export const getAllFreeGiftRules = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive, triggerType } = req.query;

    console.log(`> GET /api/admin/free-gift-rules - Query:`, { page, limit, isActive, triggerType });

    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (triggerType) filter.triggerType = triggerType;

    const skip = (page - 1) * limit;

    const [freeGiftRules, total] = await Promise.all([
      FreeGiftRule.find(filter)
        .populate("createdById", "fullName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      FreeGiftRule.countDocuments(filter),
    ]);

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    };

    console.log(`> Found ${freeGiftRules.length} free gift rules`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Free gift rules retrieved successfully",
      { freeGiftRules, pagination },
      null
    );
  } catch (error) {
    console.log(`> Error fetching free gift rules: ${error.message}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch free gift rules",
      null,
      error.message
    );
  }
};

/**
 * @route POST /api/admin/free-gift-rules
 * @description Create a new free gift rule
 * @access Admin
 * @requestBody {
 *   name: string (required),
 *   description: string,
 *   triggerType: string (cart_value|product_purchase, required),
 *   triggerValue: number (for cart_value type),
 *   triggerProductIds: array of strings (for product_purchase type),
 *   giftProductId: string (required),
 *   giftVariantId: string,
 *   giftQuantity: number,
 *   isActive: boolean,
 *   startsAt: date,
 *   endsAt: date
 * }
 * @responseBody { freeGiftRule: object }
 */
export const createFreeGiftRule = async (req, res) => {
  try {
    const freeGiftRuleData = {
      ...req.body,
      createdById: req.adminId,
    };

    console.log(`> POST /api/admin/free-gift-rules - Creating:`, freeGiftRuleData.name);
    console.log(`> Trigger type: ${freeGiftRuleData.triggerType}`);

    const freeGiftRule = await FreeGiftRule.create(freeGiftRuleData);
    await freeGiftRule.populate("createdById", "fullName email");

    console.log(`> Free gift rule created with ID: ${freeGiftRule._id}`);

    return sendResponse(
      res,
      HTTP_STATUS.CREATED,
      "Free gift rule created successfully",
      { freeGiftRule },
      null
    );
  } catch (error) {
    console.log(`> Error creating free gift rule: ${error.message}`);

    if (error.code === 11000) {
      return sendResponse(
        res,
        HTTP_STATUS.CONFLICT,
        "Free gift rule with this name already exists",
        null,
        error.message
      );
    }

    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create free gift rule",
      null,
      error.message
    );
  }
};

/**
 * @route GET /api/admin/free-gift-rules/:id
 * @description Get single free gift rule details
 * @access Admin
 * @responseBody { freeGiftRule: object }
 */
export const getFreeGiftRuleById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`> GET /api/admin/free-gift-rules/${id}`);

    const freeGiftRule = await FreeGiftRule.findById(id).populate(
      "createdById",
      "fullName email"
    );

    if (!freeGiftRule) {
      console.log(`> Free gift rule not found: ${id}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Free gift rule not found",
        null,
        "No free gift rule found with the provided ID"
      );
    }

    console.log(`> Free gift rule found: ${freeGiftRule.name}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Free gift rule retrieved successfully",
      { freeGiftRule },
      null
    );
  } catch (error) {
    console.log(`> Error fetching free gift rule: ${error.message}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch free gift rule",
      null,
      error.message
    );
  }
};

/**
 * @route PUT /api/admin/free-gift-rules/:id
 * @description Update free gift rule
 * @access Admin
 * @requestBody {
 *   name: string,
 *   description: string,
 *   triggerType: string,
 *   triggerValue: number,
 *   triggerProductIds: array,
 *   giftProductId: string,
 *   giftVariantId: string,
 *   giftQuantity: number,
 *   isActive: boolean,
 *   startsAt: date,
 *   endsAt: date
 * }
 * @responseBody { freeGiftRule: object }
 */
export const updateFreeGiftRule = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log(`> PUT /api/admin/free-gift-rules/${id} - Updating with:`, Object.keys(updateData));

    const freeGiftRule = await FreeGiftRule.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("createdById", "fullName email");

    if (!freeGiftRule) {
      console.log(`> Free gift rule not found: ${id}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Free gift rule not found",
        null,
        "No free gift rule found with the provided ID"
      );
    }

    console.log(`> Free gift rule updated: ${freeGiftRule.name}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Free gift rule updated successfully",
      { freeGiftRule },
      null
    );
  } catch (error) {
    console.log(`> Error updating free gift rule: ${error.message}`);

    if (error.code === 11000) {
      return sendResponse(
        res,
        HTTP_STATUS.CONFLICT,
        "Free gift rule with this name already exists",
        null,
        error.message
      );
    }

    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update free gift rule",
      null,
      error.message
    );
  }
};

/**
 * @route DELETE /api/admin/free-gift-rules/:id
 * @description Delete free gift rule
 * @access Admin
 * @responseBody { message: string }
 */
export const deleteFreeGiftRule = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`> DELETE /api/admin/free-gift-rules/${id}`);

    const freeGiftRule = await FreeGiftRule.findByIdAndDelete(id);

    if (!freeGiftRule) {
      console.log(`> Free gift rule not found: ${id}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Free gift rule not found",
        null,
        "No free gift rule found with the provided ID"
      );
    }

    console.log(`> Free gift rule deleted: ${freeGiftRule.name}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Free gift rule deleted successfully",
      { deletedId: id },
      null
    );
  } catch (error) {
    console.log(`> Error deleting free gift rule: ${error.message}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to delete free gift rule",
      null,
      error.message
    );
  }
};

export default {
  getAllFreeGiftRules,
  createFreeGiftRule,
  getFreeGiftRuleById,
  updateFreeGiftRule,
  deleteFreeGiftRule,
};
