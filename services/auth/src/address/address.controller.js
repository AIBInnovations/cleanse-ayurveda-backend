import Address from "../../models/address.model.js";
import User from "../../models/user.model.js";
import { logUserAction, logAdminAction } from "../../services/audit.service.js";
import { sendResponse } from "@shared/utils";
import {
  HTTP_STATUS,
  AUDIT_ACTION,
  ENTITY_TYPE,
} from "../../utils/constants.js";

//
// CONSUMER ADDRESS CONTROLLERS
//

/**
 * @route GET /api/addresses
 * @description Get all addresses for current user
 * @access Private (consumer authenticated)
 *
 * @responseBody Success (200)
 * {
 *   "message": "Addresses retrieved successfully",
 *   "data": {
 *     "addresses": [...],
 *     "total": 3
 *   }
 * }
 */
export const getAddresses = async (req, res) => {
  console.log("> Get addresses request received");
  console.log("> User ID:", req.userId?.toString());

  try {
    const addresses = await Address.find({ userId: req.userId }).sort({
      createdAt: -1,
    });

    console.log(`> Found ${addresses.length} addresses`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Addresses retrieved successfully",
      {
        addresses,
        total: addresses.length,
      },
    );
  } catch (error) {
    console.log(`Get addresses error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve addresses",
      null,
      error.message,
    );
  }
};

/**
 * @route GET /api/addresses/:addressId
 * @description Get a single address by ID
 * @access Private (consumer authenticated)
 *
 * @param {string} addressId - Address ID
 *
 * @responseBody Success (200)
 * {
 *   "message": "Address retrieved successfully",
 *   "data": { "address": { ... } }
 * }
 */
export const getAddress = async (req, res) => {
  console.log("> Get address request received");
  console.log("> User ID:", req.userId?.toString());
  console.log("> Address ID:", req.params.addressId);

  try {
    const { addressId } = req.params;

    const address = await Address.findOne({
      _id: addressId,
      userId: req.userId,
    });

    if (!address) {
      console.log(`Address not found or not owned: ${addressId}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Address not found",
        null,
        "Address not found or does not belong to you",
      );
    }

    console.log(`> Address retrieved: ${address._id}`);

    return sendResponse(res, HTTP_STATUS.OK, "Address retrieved successfully", {
      address,
    });
  } catch (error) {
    console.log(`Get address error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve address",
      null,
      error.message,
    );
  }
};

/**
 * @route POST /api/addresses
 * @description Create a new address
 * @access Private (consumer authenticated)
 *
 * @requestBody
 * {
 *   "fullName": "John Doe",
 *   "phone": "+919876543210",
 *   "addressLine1": "123 Main Street",
 *   "addressLine2": "Apt 4B",
 *   "city": "Mumbai",
 *   "state": "Maharashtra",
 *   "pincode": "400001",
 *   "country": "India",
 *   "landmark": "Near Central Park",
 *   "label": "Home",
 *   "isDefaultShipping": true,
 *   "isDefaultBilling": false
 * }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Address created successfully",
 *   "data": { "address": { ... } }
 * }
 */
export const createAddress = async (req, res) => {
  console.log("> Create address request received");
  console.log("> User ID:", req.userId?.toString());
  console.log("> Address data:", JSON.stringify(req.body));

  try {
    const { isDefaultShipping, isDefaultBilling, ...addressData } = req.body;

    // If setting as default, unset other defaults first
    if (isDefaultShipping) {
      await Address.updateMany(
        { userId: req.userId, isDefaultShipping: true },
        { isDefaultShipping: false },
      );
    }

    if (isDefaultBilling) {
      await Address.updateMany(
        { userId: req.userId, isDefaultBilling: true },
        { isDefaultBilling: false },
      );
    }

    const address = await Address.create({
      userId: req.userId,
      ...addressData,
      isDefaultShipping: isDefaultShipping || false,
      isDefaultBilling: isDefaultBilling || false,
    });

    console.log(`> Address created: ${address._id}`);

    await logUserAction(
      req.userId.toString(),
      AUDIT_ACTION.ADDRESS_CREATED,
      ENTITY_TYPE.ADDRESS,
      address._id.toString(),
      req,
      { city: address.city, pincode: address.pincode },
    );

    return sendResponse(
      res,
      HTTP_STATUS.CREATED,
      "Address created successfully",
      {
        address,
      },
    );
  } catch (error) {
    console.log(`Create address error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create address",
      null,
      error.message,
    );
  }
};

/**
 * @route PATCH /api/addresses/:addressId
 * @description Update an address
 * @access Private (consumer authenticated)
 *
 * @param {string} addressId - Address ID
 *
 * @requestBody (all fields optional)
 * {
 *   "fullName": "John Doe",
 *   "phone": "+919876543210",
 *   ...
 * }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Address updated successfully",
 *   "data": { "address": { ... } }
 * }
 */
export const updateAddress = async (req, res) => {
  console.log("> Update address request received");
  console.log("> User ID:", req.userId?.toString());
  console.log("> Address ID:", req.params.addressId);
  console.log("> Update data:", JSON.stringify(req.body));

  try {
    const { addressId } = req.params;
    const { isDefaultShipping, isDefaultBilling, ...updateData } = req.body;

    // Verify ownership
    const existingAddress = await Address.findOne({
      _id: addressId,
      userId: req.userId,
    });

    if (!existingAddress) {
      console.log(`Address not found or not owned: ${addressId}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Address not found",
        null,
        "Address not found or does not belong to you",
      );
    }

    // Handle default flags
    if (isDefaultShipping !== undefined) {
      if (isDefaultShipping) {
        await Address.updateMany(
          {
            userId: req.userId,
            isDefaultShipping: true,
            _id: { $ne: addressId },
          },
          { isDefaultShipping: false },
        );
      }
      updateData.isDefaultShipping = isDefaultShipping;
    }

    if (isDefaultBilling !== undefined) {
      if (isDefaultBilling) {
        await Address.updateMany(
          {
            userId: req.userId,
            isDefaultBilling: true,
            _id: { $ne: addressId },
          },
          { isDefaultBilling: false },
        );
      }
      updateData.isDefaultBilling = isDefaultBilling;
    }

    const address = await Address.findByIdAndUpdate(addressId, updateData, {
      new: true,
      runValidators: true,
    });

    console.log(`> Address updated: ${address._id}`);

    await logUserAction(
      req.userId.toString(),
      AUDIT_ACTION.ADDRESS_UPDATED,
      ENTITY_TYPE.ADDRESS,
      addressId,
      req,
      { updatedFields: Object.keys(req.body) },
    );

    return sendResponse(res, HTTP_STATUS.OK, "Address updated successfully", {
      address,
    });
  } catch (error) {
    console.log(`Update address error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update address",
      null,
      error.message,
    );
  }
};

/**
 * @route DELETE /api/addresses/:addressId
 * @description Delete an address
 * @access Private (consumer authenticated)
 *
 * @param {string} addressId - Address ID
 *
 * @responseBody Success (200)
 * { "message": "Address deleted successfully", "data": null }
 */
export const deleteAddress = async (req, res) => {
  console.log("> Delete address request received");
  console.log("> User ID:", req.userId?.toString());
  console.log("> Address ID:", req.params.addressId);

  try {
    const { addressId } = req.params;

    // Verify ownership
    const address = await Address.findOne({
      _id: addressId,
      userId: req.userId,
    });

    if (!address) {
      console.log(`Address not found or not owned: ${addressId}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Address not found",
        null,
        "Address not found or does not belong to you",
      );
    }

    await Address.findByIdAndDelete(addressId);

    console.log(`> Address deleted: ${addressId}`);

    await logUserAction(
      req.userId.toString(),
      AUDIT_ACTION.ADDRESS_DELETED,
      ENTITY_TYPE.ADDRESS,
      addressId,
      req,
      { city: address.city, pincode: address.pincode },
    );

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Address deleted successfully",
      null,
    );
  } catch (error) {
    console.log(`Delete address error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to delete address",
      null,
      error.message,
    );
  }
};

/**
 * @route PATCH /api/addresses/:addressId/default-shipping
 * @description Set address as default shipping
 * @access Private (consumer authenticated)
 *
 * @param {string} addressId - Address ID
 *
 * @responseBody Success (200)
 * { "message": "Default shipping address updated", "data": { "address": { ... } } }
 */
export const setDefaultShipping = async (req, res) => {
  console.log("> Set default shipping request received");
  console.log("> User ID:", req.userId?.toString());
  console.log("> Address ID:", req.params.addressId);

  try {
    const { addressId } = req.params;

    // Verify ownership
    const address = await Address.findOne({
      _id: addressId,
      userId: req.userId,
    });

    if (!address) {
      console.log(`Address not found or not owned: ${addressId}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Address not found",
        null,
        "Address not found or does not belong to you",
      );
    }

    // Unset other defaults
    await Address.updateMany(
      { userId: req.userId, isDefaultShipping: true },
      { isDefaultShipping: false },
    );

    // Set this as default
    const updatedAddress = await Address.findByIdAndUpdate(
      addressId,
      { isDefaultShipping: true },
      { new: true },
    );

    console.log(`> Default shipping set: ${addressId}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Default shipping address updated",
      {
        address: updatedAddress,
      },
    );
  } catch (error) {
    console.log(`Set default shipping error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update default shipping",
      null,
      error.message,
    );
  }
};

/**
 * @route PATCH /api/addresses/:addressId/default-billing
 * @description Set address as default billing
 * @access Private (consumer authenticated)
 *
 * @param {string} addressId - Address ID
 *
 * @responseBody Success (200)
 * { "message": "Default billing address updated", "data": { "address": { ... } } }
 */
export const setDefaultBilling = async (req, res) => {
  console.log("> Set default billing request received");
  console.log("> User ID:", req.userId?.toString());
  console.log("> Address ID:", req.params.addressId);

  try {
    const { addressId } = req.params;

    // Verify ownership
    const address = await Address.findOne({
      _id: addressId,
      userId: req.userId,
    });

    if (!address) {
      console.log(`Address not found or not owned: ${addressId}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Address not found",
        null,
        "Address not found or does not belong to you",
      );
    }

    // Unset other defaults
    await Address.updateMany(
      { userId: req.userId, isDefaultBilling: true },
      { isDefaultBilling: false },
    );

    // Set this as default
    const updatedAddress = await Address.findByIdAndUpdate(
      addressId,
      { isDefaultBilling: true },
      { new: true },
    );

    console.log(`> Default billing set: ${addressId}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Default billing address updated",
      {
        address: updatedAddress,
      },
    );
  } catch (error) {
    console.log(`Set default billing error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update default billing",
      null,
      error.message,
    );
  }
};

/**
 * @route POST /api/addresses/validate-pincode
 * @description Validate pincode and get city/state info
 * @access Public (no authentication required)
 *
 * @requestBody
 * { "pincode": "400001" }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Pincode validated successfully",
 *   "data": {
 *     "pincode": "400001",
 *     "city": "Mumbai",
 *     "state": "Maharashtra",
 *     "country": "India"
 *   }
 * }
 *
 * @note This is a placeholder. Integrate with actual pincode API for production.
 */
export const validatePincode = async (req, res) => {
  console.log("> Validate pincode request received");
  console.log("> Pincode:", req.body.pincode);

  try {
    const { pincode } = req.body;

    // Placeholder response - integrate with actual pincode API
    // Example: India Post API, Google Maps Geocoding, etc.
    const pincodeData = {
      pincode,
      city: null,
      state: null,
      country: "India",
      isValid: true,
    };

    // For demo purposes, provide some sample data for known pincodes
    const samplePincodes = {
      400001: { city: "Mumbai", state: "Maharashtra" },
      110001: { city: "New Delhi", state: "Delhi" },
      560001: { city: "Bangalore", state: "Karnataka" },
      600001: { city: "Chennai", state: "Tamil Nadu" },
      700001: { city: "Kolkata", state: "West Bengal" },
    };

    if (samplePincodes[pincode]) {
      pincodeData.city = samplePincodes[pincode].city;
      pincodeData.state = samplePincodes[pincode].state;
    }

    console.log(`> Pincode validation result:`, JSON.stringify(pincodeData));

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Pincode validated successfully",
      pincodeData,
    );
  } catch (error) {
    console.log(`Validate pincode error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to validate pincode",
      null,
      error.message,
    );
  }
};

//
// ADMIN ADDRESS MANAGEMENT CONTROLLERS
//

/**
 * @route GET /api/addresses/admin/customers/:customerId/addresses
 * @description Get all addresses for a customer
 * @access Private (admin authenticated, requires customers.addresses)
 *
 * @param {string} customerId - Customer ID
 *
 * @responseBody Success (200)
 * {
 *   "message": "Customer addresses retrieved successfully",
 *   "data": {
 *     "customer": { "_id": "...", "firstName": "...", ... },
 *     "addresses": [...],
 *     "total": 3
 *   }
 * }
 */
export const getCustomerAddresses = async (req, res) => {
  console.log("> Get customer addresses request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Customer ID:", req.params.customerId);

  try {
    const { customerId } = req.params;

    // Verify customer exists
    const customer = await User.findById(customerId).select(
      "firstName lastName email phone",
    );

    if (!customer) {
      console.log(`Customer not found: ${customerId}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Customer not found",
        null,
        "Customer could not be found",
      );
    }

    const addresses = await Address.find({ userId: customerId }).sort({
      createdAt: -1,
    });

    console.log(
      `> Found ${addresses.length} addresses for customer: ${customerId}`,
    );

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Customer addresses retrieved successfully",
      {
        customer,
        addresses,
        total: addresses.length,
      },
    );
  } catch (error) {
    console.log(`Get customer addresses error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve customer addresses",
      null,
      error.message,
    );
  }
};

/**
 * @route PATCH /api/addresses/admin/addresses/:addressId/flag
 * @description Flag an address as suspicious
 * @access Private (admin authenticated, requires customers.addresses)
 *
 * @param {string} addressId - Address ID
 *
 * @requestBody
 * { "reason": "Address appears to be fraudulent" }
 *
 * @responseBody Success (200)
 * { "message": "Address flagged successfully", "data": { "address": { ... } } }
 */
export const flagAddress = async (req, res) => {
  console.log("> Flag address request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Address ID:", req.params.addressId);
  console.log("> Reason:", req.body.reason);

  try {
    const { addressId } = req.params;
    const { reason } = req.body;

    const address = await Address.findById(addressId);

    if (!address) {
      console.log(`Address not found: ${addressId}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Address not found",
        null,
        "Address could not be found",
      );
    }

    const updatedAddress = await Address.findByIdAndUpdate(
      addressId,
      { isFlagged: true, flagReason: reason },
      { new: true },
    );

    console.log(`> Address flagged: ${addressId}`);

    await logAdminAction(
      req.adminId.toString(),
      AUDIT_ACTION.ADDRESS_FLAGGED,
      ENTITY_TYPE.ADDRESS,
      addressId,
      req,
      { isFlagged: address.isFlagged, flagReason: address.flagReason },
      { isFlagged: true, flagReason: reason },
      { customerId: address.userId.toString() },
    );

    return sendResponse(res, HTTP_STATUS.OK, "Address flagged successfully", {
      address: updatedAddress,
    });
  } catch (error) {
    console.log(`Flag address error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to flag address",
      null,
      error.message,
    );
  }
};

/**
 * @route PATCH /api/addresses/admin/addresses/:addressId/verify
 * @description Mark an address as verified
 * @access Private (admin authenticated, requires customers.addresses)
 *
 * @param {string} addressId - Address ID
 *
 * @responseBody Success (200)
 * { "message": "Address verified successfully", "data": { "address": { ... } } }
 */
export const verifyAddress = async (req, res) => {
  console.log("> Verify address request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Address ID:", req.params.addressId);

  try {
    const { addressId } = req.params;

    const address = await Address.findById(addressId);

    if (!address) {
      console.log(`Address not found: ${addressId}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Address not found",
        null,
        "Address could not be found",
      );
    }

    const updatedAddress = await Address.findByIdAndUpdate(
      addressId,
      { isVerified: true, isFlagged: false, flagReason: null },
      { new: true },
    );

    console.log(`> Address verified: ${addressId}`);

    await logAdminAction(
      req.adminId.toString(),
      AUDIT_ACTION.ADDRESS_VERIFIED,
      ENTITY_TYPE.ADDRESS,
      addressId,
      req,
      { isVerified: address.isVerified, isFlagged: address.isFlagged },
      { isVerified: true, isFlagged: false },
      { customerId: address.userId.toString() },
    );

    return sendResponse(res, HTTP_STATUS.OK, "Address verified successfully", {
      address: updatedAddress,
    });
  } catch (error) {
    console.log(`Verify address error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to verify address",
      null,
      error.message,
    );
  }
};

export default {
  // Consumer
  getAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultShipping,
  setDefaultBilling,
  validatePincode,
  // Admin
  getCustomerAddresses,
  flagAddress,
  verifyAddress,
};
