import User from "../../models/user.model.js";
import Session from "../../models/session.model.js";
import { logUserAction, logAdminAction } from "../../services/audit.service.js";
import { verifyFirebaseIdToken } from "../../services/otp.service.js";
import { storageService } from "@shared/providers";
const { uploadFile, deleteFile } = storageService;
import { sendResponse } from "@shared/utils";
import {
  HTTP_STATUS,
  AUDIT_ACTION,
  ENTITY_TYPE,
  SESSION_USER_TYPE,
} from "../../utils/constants.js";

//
// CONSUMER PROFILE CONTROLLERS
//

/**
 * @route GET /api/profile
 * @description Get current user profile
 * @access Private (consumer authenticated)
 *
 * @responseBody Success (200)
 * {
 *   "message": "Profile retrieved successfully",
 *   "data": {
 *     "profile": {
 *       "_id": "...",
 *       "phone": "+919876543210",
 *       "email": "user@example.com",
 *       "emailVerified": true,
 *       "phoneVerified": true,
 *       "firstName": "John",
 *       "lastName": "Doe",
 *       "avatar": "https://...",
 *       "preferences": { "language": "en", "currency": "INR" },
 *       "marketingConsent": { "email": false, "sms": false, "whatsapp": false, "push": false },
 *       "status": "active",
 *       "createdAt": "2024-01-01T00:00:00.000Z"
 *     }
 *   }
 * }
 */
export const getProfile = async (req, res) => {
  console.log("> Get profile request received");
  console.log("> User ID:", req.userId?.toString());

  try {
    const user = await User.findById(req.userId).select(
      "-passwordHash -internalNotes -deletionRequestedAt",
    );

    if (!user) {
      console.log("User not found");
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "User not found",
        null,
        "User profile could not be found",
      );
    }

    console.log(`> Profile retrieved for user: ${user._id}`);

    return sendResponse(res, HTTP_STATUS.OK, "Profile retrieved successfully", {
      profile: {
        _id: user._id,
        phone: user.phone,
        email: user.email,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        preferences: user.preferences,
        marketingConsent: user.marketingConsent,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.log(`Get profile error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve profile",
      null,
      error.message,
    );
  }
};

/**
 * @route PATCH /api/profile
 * @description Update current user profile
 * @access Private (consumer authenticated)
 *
 * @requestBody
 * {
 *   "firstName": "John",
 *   "lastName": "Doe",
 *   "preferences": { "language": "en", "currency": "INR" },
 *   "marketingConsent": { "email": true, "sms": false, "whatsapp": true, "push": false }
 * }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Profile updated successfully",
 *   "data": { "profile": { ... } }
 * }
 */
export const updateProfile = async (req, res) => {
  console.log("> Update profile request received");
  console.log("> User ID:", req.userId?.toString());
  console.log("> Update data:", JSON.stringify(req.body));

  try {
    const updateData = {};

    // Handle simple string fields
    if (req.body.firstName !== undefined) {
      updateData.firstName = req.body.firstName;
    }
    if (req.body.lastName !== undefined) {
      updateData.lastName = req.body.lastName;
    }

    // Handle nested preferences object
    if (req.body.preferences !== undefined) {
      updateData.preferences = {};
      if (req.body.preferences.language !== undefined) {
        updateData["preferences.language"] = req.body.preferences.language;
      }
      if (req.body.preferences.currency !== undefined) {
        updateData["preferences.currency"] = req.body.preferences.currency;
      }
    }

    // Handle nested marketingConsent object
    if (req.body.marketingConsent !== undefined) {
      if (req.body.marketingConsent.email !== undefined) {
        updateData["marketingConsent.email"] = req.body.marketingConsent.email;
      }
      if (req.body.marketingConsent.sms !== undefined) {
        updateData["marketingConsent.sms"] = req.body.marketingConsent.sms;
      }
      if (req.body.marketingConsent.whatsapp !== undefined) {
        updateData["marketingConsent.whatsapp"] =
          req.body.marketingConsent.whatsapp;
      }
      if (req.body.marketingConsent.push !== undefined) {
        updateData["marketingConsent.push"] = req.body.marketingConsent.push;
      }
    }

    if (Object.keys(updateData).length === 0) {
      console.log("No valid fields to update");
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "No valid fields to update",
        null,
        "Provide at least one field to update",
      );
    }

    const user = await User.findByIdAndUpdate(req.userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-passwordHash -internalNotes -deletionRequestedAt");

    if (!user) {
      console.log("User not found");
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "User not found",
        null,
        "User profile could not be found",
      );
    }

    console.log(`> Profile updated for user: ${user._id}`);

    await logUserAction(
      req.userId.toString(),
      AUDIT_ACTION.USER_PROFILE_UPDATED,
      ENTITY_TYPE.USER,
      req.userId.toString(),
      req,
      { updatedFields: Object.keys(updateData) },
    );

    return sendResponse(res, HTTP_STATUS.OK, "Profile updated successfully", {
      profile: {
        _id: user._id,
        phone: user.phone,
        email: user.email,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        preferences: user.preferences,
        marketingConsent: user.marketingConsent,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.log(`Update profile error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update profile",
      null,
      error.message,
    );
  }
};

/**
 * @route POST /api/profile/email/change
 * @description Change user email (sets emailVerified to false)
 * @access Private (consumer authenticated)
 *
 * @requestBody
 * { "newEmail": "newemail@example.com" }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Email updated successfully",
 *   "data": { "email": "newemail@example.com", "emailVerified": false }
 * }
 *
 * @responseBody Error (409)
 * { "message": "Email already in use", "data": null, "error": "..." }
 */
export const changeEmail = async (req, res) => {
  console.log("> Change email request received");
  console.log("> User ID:", req.userId?.toString());
  console.log("> New email:", req.body.newEmail);

  try {
    const { newEmail } = req.body;

    // Check if email is already in use
    const existingUser = await User.findOne({
      email: newEmail,
      _id: { $ne: req.userId },
    });

    if (existingUser) {
      console.log(`Email already in use: ${newEmail}`);
      return sendResponse(
        res,
        HTTP_STATUS.CONFLICT,
        "Email already in use",
        null,
        "This email address is already registered",
      );
    }

    // Get current email for audit
    const currentUser = await User.findById(req.userId);
    const previousEmail = currentUser?.email;

    // Update email and set emailVerified to false
    const user = await User.findByIdAndUpdate(
      req.userId,
      { email: newEmail, emailVerified: false },
      { new: true },
    );

    if (!user) {
      console.log("User not found");
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "User not found",
        null,
        "User could not be found",
      );
    }

    console.log(`> Email changed for user: ${user._id}`);

    await logUserAction(
      req.userId.toString(),
      AUDIT_ACTION.USER_EMAIL_CHANGED,
      ENTITY_TYPE.USER,
      req.userId.toString(),
      req,
      { previousEmail, newEmail },
    );

    return sendResponse(res, HTTP_STATUS.OK, "Email updated successfully", {
      email: user.email,
      emailVerified: user.emailVerified,
    });
  } catch (error) {
    console.log(`Change email error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to change email",
      null,
      error.message,
    );
  }
};

/**
 * @route POST /api/profile/phone/change
 * @description Request phone number change (client initiates Firebase OTP)
 * @access Private (consumer authenticated)
 *
 * @requestBody
 * { "newPhone": "+919876543210" }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Phone change initiated",
 *   "data": { "newPhone": "+919876543210" }
 * }
 *
 * @responseBody Error (409)
 * { "message": "Phone number already in use", "data": null, "error": "..." }
 */
export const requestPhoneChange = async (req, res) => {
  console.log("> Request phone change received");
  console.log("> User ID:", req.userId?.toString());
  console.log("> New phone:", req.body.newPhone);

  try {
    const { newPhone } = req.body;

    // Check if phone is already in use
    const existingUser = await User.findOne({
      phone: newPhone,
      _id: { $ne: req.userId },
    });

    if (existingUser) {
      console.log(`Phone number already in use: ${newPhone}`);
      return sendResponse(
        res,
        HTTP_STATUS.CONFLICT,
        "Phone number already in use",
        null,
        "This phone number is already registered",
      );
    }

    console.log(`> Phone change initiated for new number: ${newPhone}`);

    // Client will initiate Firebase OTP flow
    return sendResponse(res, HTTP_STATUS.OK, "Phone change initiated", {
      newPhone,
    });
  } catch (error) {
    console.log(`Request phone change error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to initiate phone change",
      null,
      error.message,
    );
  }
};

/**
 * @route POST /api/profile/phone/verify
 * @description Verify phone change with Firebase ID token
 * @access Private (consumer authenticated)
 *
 * @requestBody
 * { "firebaseIdToken": "..." }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Phone number updated successfully",
 *   "data": { "phone": "+919876543210", "phoneVerified": true }
 * }
 *
 * @responseBody Error (409)
 * { "message": "Phone number already in use", "data": null, "error": "..." }
 */
export const verifyPhoneChange = async (req, res) => {
  console.log("> Verify phone change request received");
  console.log("> User ID:", req.userId?.toString());

  try {
    const { firebaseIdToken } = req.body;

    // Verify Firebase ID token
    const decodedToken = await verifyFirebaseIdToken(firebaseIdToken);
    const newPhone = decodedToken.phone_number;

    if (!newPhone) {
      console.log("No phone number in Firebase token");
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Invalid token",
        null,
        "Phone number not found in token",
      );
    }

    // Check if phone is already in use
    const existingUser = await User.findOne({
      phone: newPhone,
      _id: { $ne: req.userId },
    });

    if (existingUser) {
      console.log(`Phone number already in use: ${newPhone}`);
      return sendResponse(
        res,
        HTTP_STATUS.CONFLICT,
        "Phone number already in use",
        null,
        "This phone number is already registered",
      );
    }

    // Get previous phone for audit
    const currentUser = await User.findById(req.userId);
    const previousPhone = currentUser?.phone;

    // Update phone and set phoneVerified to true
    const user = await User.findByIdAndUpdate(
      req.userId,
      { phone: newPhone, phoneVerified: true },
      { new: true },
    );

    if (!user) {
      console.log("User not found");
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "User not found",
        null,
        "User could not be found",
      );
    }

    console.log(`> Phone updated for user: ${user._id}`);

    await logUserAction(
      req.userId.toString(),
      AUDIT_ACTION.USER_PHONE_CHANGED,
      ENTITY_TYPE.USER,
      req.userId.toString(),
      req,
      { previousPhone, newPhone },
    );

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Phone number updated successfully",
      {
        phone: user.phone,
        phoneVerified: user.phoneVerified,
      },
    );
  } catch (error) {
    console.log(`Verify phone change error: ${error.message}`);
    console.log(error.stack);

    if (error.code === "auth/id-token-expired") {
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Token expired",
        null,
        "Firebase token has expired",
      );
    }

    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to verify phone change",
      null,
      error.message,
    );
  }
};

/**
 * @route POST /api/profile/avatar
 * @description Upload user avatar
 * @access Private (consumer authenticated)
 *
 * @requestBody multipart/form-data
 * - file: Image file (jpeg, png, webp)
 *
 * @responseBody Success (200)
 * {
 *   "message": "Avatar uploaded successfully",
 *   "data": { "avatar": "https://..." }
 * }
 */
export const uploadAvatar = async (req, res) => {
  console.log("> Upload avatar request received");
  console.log("> User ID:", req.userId?.toString());

  try {
    if (!req.files || req.files.length === 0) {
      console.log("No file provided");
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "No file provided",
        null,
        "Please upload an image file",
      );
    }

    const file = req.files[0];

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.mimetype)) {
      console.log(`Invalid file type: ${file.mimetype}`);
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Invalid file type",
        null,
        "Only JPEG, PNG, WebP, and GIF images are allowed",
      );
    }

    // Upload to storage
    const uploadResult = await uploadFile(file.buffer, {
      folder: "avatars",
      resourceType: "image",
    });

    // Get current avatar for cleanup
    const currentUser = await User.findById(req.userId);
    const previousAvatar = currentUser?.avatar;

    // Update user avatar
    const user = await User.findByIdAndUpdate(
      req.userId,
      { avatar: uploadResult.url },
      { new: true },
    );

    if (!user) {
      console.log("User not found");
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "User not found",
        null,
        "User could not be found",
      );
    }

    // Delete previous avatar if exists
    if (previousAvatar) {
      try {
        // Extract public ID from URL
        const urlParts = previousAvatar.split("/");
        const publicIdWithExt = urlParts.slice(-2).join("/");
        const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");
        await deleteFile(publicId, "image");
        console.log(`> Previous avatar deleted: ${publicId}`);
      } catch (deleteError) {
        console.log(`Failed to delete previous avatar: ${deleteError.message}`);
      }
    }

    console.log(`> Avatar uploaded for user: ${user._id}`);

    await logUserAction(
      req.userId.toString(),
      AUDIT_ACTION.USER_AVATAR_UPDATED,
      ENTITY_TYPE.USER,
      req.userId.toString(),
      req,
      { avatarUrl: uploadResult.url },
    );

    return sendResponse(res, HTTP_STATUS.OK, "Avatar uploaded successfully", {
      avatar: user.avatar,
    });
  } catch (error) {
    console.log(`Upload avatar error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to upload avatar",
      null,
      error.message,
    );
  }
};

/**
 * @route DELETE /api/profile/avatar
 * @description Remove user avatar
 * @access Private (consumer authenticated)
 *
 * @responseBody Success (200)
 * { "message": "Avatar removed successfully", "data": null }
 */
export const removeAvatar = async (req, res) => {
  console.log("> Remove avatar request received");
  console.log("> User ID:", req.userId?.toString());

  try {
    const user = await User.findById(req.userId);

    if (!user) {
      console.log("User not found");
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "User not found",
        null,
        "User could not be found",
      );
    }

    if (!user.avatar) {
      console.log("No avatar to remove");
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "No avatar to remove",
        null,
        "User does not have an avatar",
      );
    }

    // Delete from storage
    try {
      const urlParts = user.avatar.split("/");
      const publicIdWithExt = urlParts.slice(-2).join("/");
      const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");
      await deleteFile(publicId, "image");
      console.log(`> Avatar deleted from storage: ${publicId}`);
    } catch (deleteError) {
      console.log(
        `Failed to delete avatar from storage: ${deleteError.message}`,
      );
    }

    // Update user
    await User.findByIdAndUpdate(req.userId, { avatar: null });

    console.log(`> Avatar removed for user: ${user._id}`);

    await logUserAction(
      req.userId.toString(),
      AUDIT_ACTION.USER_AVATAR_REMOVED,
      ENTITY_TYPE.USER,
      req.userId.toString(),
      req,
    );

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Avatar removed successfully",
      null,
    );
  } catch (error) {
    console.log(`Remove avatar error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to remove avatar",
      null,
      error.message,
    );
  }
};

/**
 * @route POST /api/profile/delete-request
 * @description Request account deletion (soft delete with 30-day grace period)
 * @access Private (consumer authenticated)
 *
 * @requestBody
 * { "confirmation": "DELETE" }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Account deletion requested",
 *   "data": { "deletionRequestedAt": "2024-01-01T00:00:00.000Z" }
 * }
 */
export const requestAccountDeletion = async (req, res) => {
  console.log("> Request account deletion received");
  console.log("> User ID:", req.userId?.toString());

  try {
    const user = await User.findById(req.userId);

    if (!user) {
      console.log("User not found");
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "User not found",
        null,
        "User could not be found",
      );
    }

    if (user.deletionRequestedAt) {
      console.log("Deletion already requested");
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Deletion already requested",
        { deletionRequestedAt: user.deletionRequestedAt },
        "Account deletion has already been requested",
      );
    }

    const deletionRequestedAt = new Date();

    await User.findByIdAndUpdate(req.userId, { deletionRequestedAt });

    console.log(`> Account deletion requested for user: ${user._id}`);

    await logUserAction(
      req.userId.toString(),
      AUDIT_ACTION.ACCOUNT_DELETION_REQUESTED,
      ENTITY_TYPE.USER,
      req.userId.toString(),
      req,
      { deletionRequestedAt },
    );

    return sendResponse(res, HTTP_STATUS.OK, "Account deletion requested", {
      deletionRequestedAt,
    });
  } catch (error) {
    console.log(`Request account deletion error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to request account deletion",
      null,
      error.message,
    );
  }
};

/**
 * @route POST /api/profile/delete-cancel
 * @description Cancel account deletion request
 * @access Private (consumer authenticated)
 *
 * @responseBody Success (200)
 * { "message": "Account deletion cancelled", "data": null }
 *
 * @responseBody Error (400)
 * { "message": "No deletion request to cancel", "data": null, "error": "..." }
 */
export const cancelAccountDeletion = async (req, res) => {
  console.log("> Cancel account deletion received");
  console.log("> User ID:", req.userId?.toString());

  try {
    const user = await User.findById(req.userId);

    if (!user) {
      console.log("User not found");
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "User not found",
        null,
        "User could not be found",
      );
    }

    if (!user.deletionRequestedAt) {
      console.log("No deletion request to cancel");
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "No deletion request to cancel",
        null,
        "Account deletion has not been requested",
      );
    }

    await User.findByIdAndUpdate(req.userId, { deletionRequestedAt: null });

    console.log(`> Account deletion cancelled for user: ${user._id}`);

    await logUserAction(
      req.userId.toString(),
      AUDIT_ACTION.ACCOUNT_DELETION_CANCELLED,
      ENTITY_TYPE.USER,
      req.userId.toString(),
      req,
    );

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Account deletion cancelled",
      null,
    );
  } catch (error) {
    console.log(`Cancel account deletion error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to cancel account deletion",
      null,
      error.message,
    );
  }
};

//
// ADMIN CUSTOMER MANAGEMENT CONTROLLERS
//

/**
 * @route GET /api/profile/admin/customers
 * @description Search and list customers with pagination
 * @access Private (admin authenticated, requires customers.view)
 *
 * @query
 * - query: Search term for name/email/phone
 * - email: Filter by email
 * - phone: Filter by phone
 * - status: Filter by status (active/suspended/deleted)
 * - page: Page number (default 1)
 * - limit: Items per page (default 20, max 100)
 *
 * @responseBody Success (200)
 * {
 *   "message": "Customers retrieved successfully",
 *   "data": {
 *     "customers": [...],
 *     "pagination": { "page": 1, "limit": 20, "total": 100, "pages": 5 }
 *   }
 * }
 */
export const searchCustomers = async (req, res) => {
  console.log("> Search customers request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Query params:", JSON.stringify(req.query));

  try {
    const { query, email, phone, status, page = 1, limit = 20 } = req.query;

    const filter = {};

    // Text search on name/email/phone
    if (query) {
      filter.$or = [
        { firstName: { $regex: query, $options: "i" } },
        { lastName: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { phone: { $regex: query, $options: "i" } },
      ];
    }

    if (email) {
      filter.email = { $regex: email, $options: "i" };
    }

    if (phone) {
      filter.phone = { $regex: phone, $options: "i" };
    }

    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      User.find(filter)
        .select("-passwordHash -internalNotes")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limit);

    console.log(`> Found ${customers.length} customers (total: ${total})`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Customers retrieved successfully",
      {
        customers,
        pagination: { page: Number(page), limit: Number(limit), total, pages },
      },
    );
  } catch (error) {
    console.log(`Search customers error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to search customers",
      null,
      error.message,
    );
  }
};

/**
 * @route GET /api/profile/admin/customers/:customerId
 * @description Get customer profile by ID
 * @access Private (admin authenticated, requires customers.view)
 *
 * @param {string} customerId - Customer ID
 *
 * @responseBody Success (200)
 * {
 *   "message": "Customer retrieved successfully",
 *   "data": { "customer": { ... } }
 * }
 */
export const getCustomerProfile = async (req, res) => {
  console.log("> Get customer profile request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Customer ID:", req.params.customerId);

  try {
    const { customerId } = req.params;

    const customer = await User.findById(customerId).select("-passwordHash");

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

    console.log(`> Customer retrieved: ${customer._id}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Customer retrieved successfully",
      {
        customer,
      },
    );
  } catch (error) {
    console.log(`Get customer profile error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve customer",
      null,
      error.message,
    );
  }
};

/**
 * @route POST /api/profile/admin/customers/:customerId/suspend
 * @description Suspend a customer account
 * @access Private (admin authenticated, requires customers.manage)
 *
 * @param {string} customerId - Customer ID
 *
 * @requestBody
 * { "status": "suspended", "reason": "Fraudulent activity" }
 *
 * @responseBody Success (200)
 * { "message": "Customer suspended successfully", "data": null }
 */
export const suspendCustomer = async (req, res) => {
  console.log("> Suspend customer request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Customer ID:", req.params.customerId);
  console.log("> Reason:", req.body.reason);

  try {
    const { customerId } = req.params;
    const { reason } = req.body;

    const customer = await User.findById(customerId);

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

    if (customer.status === "suspended") {
      console.log("Customer already suspended");
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Customer already suspended",
        null,
        "Customer is already suspended",
      );
    }

    // Suspend customer
    await User.findByIdAndUpdate(customerId, { status: "suspended" });

    // Invalidate all sessions
    await Session.updateMany(
      {
        userId: customerId,
        userType: SESSION_USER_TYPE.CONSUMER,
        isActive: true,
      },
      { isActive: false },
    );

    console.log(`> Customer suspended: ${customerId}`);

    await logAdminAction(
      req.adminId.toString(),
      AUDIT_ACTION.CUSTOMER_SUSPENDED,
      ENTITY_TYPE.USER,
      customerId,
      req,
      { status: customer.status },
      { status: "suspended" },
      { reason },
    );

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Customer suspended successfully",
      null,
    );
  } catch (error) {
    console.log(`Suspend customer error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to suspend customer",
      null,
      error.message,
    );
  }
};

/**
 * @route POST /api/profile/admin/customers/:customerId/reactivate
 * @description Reactivate a suspended customer account
 * @access Private (admin authenticated, requires customers.manage)
 *
 * @param {string} customerId - Customer ID
 *
 * @responseBody Success (200)
 * { "message": "Customer reactivated successfully", "data": null }
 */
export const reactivateCustomer = async (req, res) => {
  console.log("> Reactivate customer request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Customer ID:", req.params.customerId);

  try {
    const { customerId } = req.params;

    const customer = await User.findById(customerId);

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

    if (customer.status === "active") {
      console.log("Customer already active");
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Customer already active",
        null,
        "Customer is already active",
      );
    }

    if (customer.status === "deleted") {
      console.log("Cannot reactivate deleted customer");
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot reactivate deleted account",
        null,
        "Deleted accounts cannot be reactivated",
      );
    }

    // Reactivate customer
    await User.findByIdAndUpdate(customerId, { status: "active" });

    console.log(`> Customer reactivated: ${customerId}`);

    await logAdminAction(
      req.adminId.toString(),
      AUDIT_ACTION.CUSTOMER_REACTIVATED,
      ENTITY_TYPE.USER,
      customerId,
      req,
      { status: customer.status },
      { status: "active" },
    );

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Customer reactivated successfully",
      null,
    );
  } catch (error) {
    console.log(`Reactivate customer error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to reactivate customer",
      null,
      error.message,
    );
  }
};

/**
 * @route POST /api/profile/admin/customers/:customerId/notes
 * @description Add internal note to customer
 * @access Private (admin authenticated, requires customers.manage)
 *
 * @param {string} customerId - Customer ID
 *
 * @requestBody
 * { "note": "Customer reported issue with order #123" }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Note added successfully",
 *   "data": { "note": { ... } }
 * }
 */
export const addCustomerNote = async (req, res) => {
  console.log("> Add customer note request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Customer ID:", req.params.customerId);
  console.log("> Note:", req.body.note);

  try {
    const { customerId } = req.params;
    const { note } = req.body;

    const customer = await User.findById(customerId);

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

    const noteEntry = {
      note,
      addedBy: req.adminId,
      addedAt: new Date(),
    };

    await User.findByIdAndUpdate(customerId, {
      $push: { internalNotes: noteEntry },
    });

    console.log(`> Note added to customer: ${customerId}`);

    await logAdminAction(
      req.adminId.toString(),
      AUDIT_ACTION.CUSTOMER_NOTE_ADDED,
      ENTITY_TYPE.USER,
      customerId,
      req,
      null,
      null,
      { notePreview: note.substring(0, 100) },
    );

    return sendResponse(res, HTTP_STATUS.OK, "Note added successfully", {
      note: noteEntry,
    });
  } catch (error) {
    console.log(`Add customer note error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to add note",
      null,
      error.message,
    );
  }
};

/**
 * @route GET /api/profile/admin/customers/:customerId/export
 * @description Export all customer data (GDPR compliance)
 * @access Private (admin authenticated, requires customers.export)
 *
 * @param {string} customerId - Customer ID
 *
 * @responseBody Success (200)
 * {
 *   "message": "Customer data exported successfully",
 *   "data": {
 *     "profile": { ... },
 *     "addresses": [...],
 *     "sessions": [...],
 *     "exportedAt": "..."
 *   }
 * }
 */
export const exportCustomerData = async (req, res) => {
  console.log("> Export customer data request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Customer ID:", req.params.customerId);

  try {
    const { customerId } = req.params;

    // Import Address model here to avoid circular dependency
    const Address = (await import("../../models/address.model.js")).default;
    const Audit = (await import("../../models/audit.model.js")).default;

    const [customer, addresses, sessions, auditLogs] = await Promise.all([
      User.findById(customerId).select("-passwordHash"),
      Address.find({ userId: customerId }),
      Session.find({
        userId: customerId,
        userType: SESSION_USER_TYPE.CONSUMER,
      }),
      Audit.find({ actorId: customerId, actorType: "consumer" })
        .sort({ createdAt: -1 })
        .limit(100),
    ]);

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

    console.log(`> Customer data exported: ${customerId}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Customer data exported successfully",
      {
        profile: customer,
        addresses,
        sessions: sessions.map((s) => ({
          _id: s._id,
          deviceInfo: s.deviceInfo,
          isActive: s.isActive,
          createdAt: s.createdAt,
          lastActivityAt: s.lastActivityAt,
        })),
        auditLogs,
        exportedAt: new Date().toISOString(),
      },
    );
  } catch (error) {
    console.log(`Export customer data error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to export customer data",
      null,
      error.message,
    );
  }
};

/**
 * @route GET /api/profile/admin
 * @description Get current admin profile
 * @access Private (admin authenticated)
 */
export const getAdminProfile = async (req, res) => {
  console.log("> Get admin profile request received");
  console.log("> Admin ID:", req.userId?.toString());

  try {
    const Admin = (await import("../../models/admin.model.js")).default;
    const admin = await Admin.findById(req.userId)
      .select("-passwordHash -twoFactorSecret")
      .populate("role", "name permissions");

    if (!admin) {
      console.log("Admin not found");
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Admin not found",
        null,
        "Admin profile could not be found",
      );
    }

    console.log(`> Profile retrieved for admin: ${admin._id}`);

    return sendResponse(res, HTTP_STATUS.OK, "Admin profile retrieved successfully", {
      admin: {
        _id: admin._id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        phone: admin.phone,
        avatar: admin.avatar,
        role: admin.role,
        status: admin.status,
        forcePasswordChange: admin.forcePasswordChange,
        lastLoginAt: admin.lastLoginAt,
        createdAt: admin.createdAt,
      },
    });
  } catch (error) {
    console.log(`Get admin profile error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve admin profile",
      null,
      error.message,
    );
  }
};

export default {
  // Consumer
  getProfile,
  updateProfile,
  changeEmail,
  requestPhoneChange,
  verifyPhoneChange,
  uploadAvatar,
  removeAvatar,
  requestAccountDeletion,
  cancelAccountDeletion,
  // Admin
  getAdminProfile,
  searchCustomers,
  getCustomerProfile,
  suspendCustomer,
  reactivateCustomer,
  addCustomerNote,
  exportCustomerData,
};
