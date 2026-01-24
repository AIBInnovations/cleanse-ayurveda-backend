import { sendResponse, HTTP_STATUS } from "@shared/utils";
import AutomaticDiscount from "../../models/automaticDiscount.model.js";

/**
 * @route GET /api/admin/automatic-discounts
 * @description Get all automatic discounts with pagination and filters
 * @access Admin
 * @requestQuery {
 *   page: number,
 *   limit: number,
 *   isActive: boolean,
 *   type: string (percentage|fixed_amount)
 * }
 * @responseBody {
 *   discounts: array,
 *   pagination: { page, limit, total, totalPages }
 * }
 */
export const getAllAutomaticDiscounts = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive, type } = req.query;

    console.log(`> GET /api/admin/automatic-discounts - Query:`, { page, limit, isActive, type });

    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (type) filter.type = type;

    const skip = (page - 1) * limit;

    const [discounts, total] = await Promise.all([
      AutomaticDiscount.find(filter)
        .populate("createdById", "fullName email")
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AutomaticDiscount.countDocuments(filter),
    ]);

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    };

    console.log(`> Found ${discounts.length} automatic discounts`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Automatic discounts retrieved successfully",
      { discounts, pagination },
      null
    );
  } catch (error) {
    console.log(`> Error fetching automatic discounts: ${error.message}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch automatic discounts",
      null,
      error.message
    );
  }
};

/**
 * @route POST /api/admin/automatic-discounts
 * @description Create a new automatic discount
 * @access Admin
 * @requestBody {
 *   name: string (required),
 *   description: string,
 *   type: string (percentage|fixed_amount, required),
 *   value: number (required, min 0),
 *   maxDiscount: number,
 *   minOrderValue: number,
 *   appliesTo: string (cart|specific_products|specific_collections),
 *   applicableIds: array of strings,
 *   priority: number,
 *   isStackable: boolean,
 *   isActive: boolean,
 *   startsAt: date,
 *   endsAt: date
 * }
 * @responseBody { discount: object }
 */
export const createAutomaticDiscount = async (req, res) => {
  try {
    const discountData = {
      ...req.body,
      createdById: req.adminId,
    };

    console.log(`> POST /api/admin/automatic-discounts - Creating:`, discountData.name);

    const discount = await AutomaticDiscount.create(discountData);
    await discount.populate("createdById", "fullName email");

    console.log(`> Automatic discount created with ID: ${discount._id}`);

    return sendResponse(
      res,
      HTTP_STATUS.CREATED,
      "Automatic discount created successfully",
      { discount },
      null
    );
  } catch (error) {
    console.log(`> Error creating automatic discount: ${error.message}`);

    if (error.code === 11000) {
      return sendResponse(
        res,
        HTTP_STATUS.CONFLICT,
        "Automatic discount with this name already exists",
        null,
        error.message
      );
    }

    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create automatic discount",
      null,
      error.message
    );
  }
};

/**
 * @route GET /api/admin/automatic-discounts/:id
 * @description Get single automatic discount details
 * @access Admin
 * @responseBody { discount: object }
 */
export const getAutomaticDiscountById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`> GET /api/admin/automatic-discounts/${id}`);

    const discount = await AutomaticDiscount.findById(id).populate(
      "createdById",
      "fullName email"
    );

    if (!discount) {
      console.log(`> Automatic discount not found: ${id}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Automatic discount not found",
        null,
        "No automatic discount found with the provided ID"
      );
    }

    console.log(`> Automatic discount found: ${discount.name}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Automatic discount retrieved successfully",
      { discount },
      null
    );
  } catch (error) {
    console.log(`> Error fetching automatic discount: ${error.message}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch automatic discount",
      null,
      error.message
    );
  }
};

/**
 * @route PUT /api/admin/automatic-discounts/:id
 * @description Update automatic discount
 * @access Admin
 * @requestBody {
 *   name: string,
 *   description: string,
 *   type: string,
 *   value: number,
 *   maxDiscount: number,
 *   minOrderValue: number,
 *   appliesTo: string,
 *   applicableIds: array,
 *   priority: number,
 *   isStackable: boolean,
 *   isActive: boolean,
 *   startsAt: date,
 *   endsAt: date
 * }
 * @responseBody { discount: object }
 */
export const updateAutomaticDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log(`> PUT /api/admin/automatic-discounts/${id} - Updating with:`, Object.keys(updateData));

    const discount = await AutomaticDiscount.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("createdById", "fullName email");

    if (!discount) {
      console.log(`> Automatic discount not found: ${id}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Automatic discount not found",
        null,
        "No automatic discount found with the provided ID"
      );
    }

    console.log(`> Automatic discount updated: ${discount.name}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Automatic discount updated successfully",
      { discount },
      null
    );
  } catch (error) {
    console.log(`> Error updating automatic discount: ${error.message}`);

    if (error.code === 11000) {
      return sendResponse(
        res,
        HTTP_STATUS.CONFLICT,
        "Automatic discount with this name already exists",
        null,
        error.message
      );
    }

    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update automatic discount",
      null,
      error.message
    );
  }
};

/**
 * @route DELETE /api/admin/automatic-discounts/:id
 * @description Delete automatic discount
 * @access Admin
 * @responseBody { message: string }
 */
export const deleteAutomaticDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`> DELETE /api/admin/automatic-discounts/${id}`);

    const discount = await AutomaticDiscount.findByIdAndDelete(id);

    if (!discount) {
      console.log(`> Automatic discount not found: ${id}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Automatic discount not found",
        null,
        "No automatic discount found with the provided ID"
      );
    }

    console.log(`> Automatic discount deleted: ${discount.name}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Automatic discount deleted successfully",
      { deletedId: id },
      null
    );
  } catch (error) {
    console.log(`> Error deleting automatic discount: ${error.message}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to delete automatic discount",
      null,
      error.message
    );
  }
};

export default {
  getAllAutomaticDiscounts,
  createAutomaticDiscount,
  getAutomaticDiscountById,
  updateAutomaticDiscount,
  deleteAutomaticDiscount,
};
