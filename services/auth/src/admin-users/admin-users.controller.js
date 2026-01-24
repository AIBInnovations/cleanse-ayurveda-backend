import bcrypt from "bcryptjs";
import crypto from "crypto";
import Admin from "../../models/admin.model.js";
import Role from "../../models/role.model.js";
import Session from "../../models/session.model.js";
import { logAdminAction } from "../../services/audit.service.js";
import { sendResponse } from "@shared/utils";
import {
  HTTP_STATUS,
  AUDIT_ACTION,
  ENTITY_TYPE,
  ADMIN_STATUS,
  SESSION_USER_TYPE,
} from "../../utils/constants.js";

/**
 * Generate a random password
 * @param {number} length - Password length
 * @returns {string} Random password
 */
const generateRandomPassword = (length = 16) => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

/**
 * @route POST /api/admin/users
 * @description Create a new admin user
 * @access Private (admin authenticated, requires admins.manage)
 *
 * @requestBody application/json
 * { "email": "newadmin@example.com", "firstName": "John", "lastName": "Doe", "roleId": "MongoDB ObjectId", "initialPassword": "optional" }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Admin created successfully",
 *   "data": {
 *     "admin": { "_id": "...", "email": "newadmin@example.com", "firstName": "John", "lastName": "Doe", "status": "active", "forcePasswordChange": true },
 *     "role": { "_id": "...", "name": "catalog_manager" }
 *   }
 * }
 *
 * @responseBody Error (409)
 * { "message": "Email already exists", "data": null, "error": "An admin with this email already exists" }
 */
export const createAdmin = async (req, res) => {
  console.log("> Create admin request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Request body:", {
    email: req.body.email,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    roleId: req.body.roleId,
    initialPassword: req.body.initialPassword ? "[REDACTED]" : undefined,
  });

  try {
    const { email, firstName, lastName, phone, roleId, initialPassword } = req.body;

    // Check if email already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      console.log(`Email already exists: ${email}`);
      return sendResponse(
        res,
        HTTP_STATUS.CONFLICT,
        "Email already exists",
        null,
        "An admin with this email already exists"
      );
    }

    // Validate role exists
    const role = await Role.findById(roleId);
    if (!role) {
      console.log(`Role not found: ${roleId}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Role not found",
        null,
        "The specified role does not exist"
      );
    }

    // Generate password if not provided
    const password = initialPassword || generateRandomPassword();

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create admin
    const admin = await Admin.create({
      email: email.toLowerCase(),
      firstName,
      lastName,
      phone: phone || null,
      roleId,
      passwordHash,
      status: ADMIN_STATUS.ACTIVE,
      forcePasswordChange: true,
      createdById: req.adminId,
    });

    console.log(`Admin created: ${admin._id}`);

    // Log password to console in dev mode
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV] Initial password for ${email}: ${password}`);
    }

    // Log audit
    await logAdminAction(
      req.adminId.toString(),
      AUDIT_ACTION.ADMIN_CREATED,
      ENTITY_TYPE.ADMIN,
      admin._id.toString(),
      req,
      null,
      { email: admin.email, firstName: admin.firstName, lastName: admin.lastName, roleId: roleId }
    );

    // Prepare response
    const adminResponse = {
      _id: admin._id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      status: admin.status,
      forcePasswordChange: admin.forcePasswordChange,
      createdAt: admin.createdAt,
    };

    const roleResponse = {
      _id: role._id,
      name: role.name,
      description: role.description,
    };

    console.log("> Response admin:", { _id: admin._id, email: admin.email });

    return sendResponse(res, HTTP_STATUS.CREATED, "Admin created successfully", {
      admin: adminResponse,
      role: roleResponse,
    });
  } catch (error) {
    console.log(`Create admin error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create admin",
      null,
      error.message
    );
  }
};

/**
 * @route GET /api/admin/users
 * @description Get all admins with role info (paginated)
 * @access Private (admin authenticated, requires admins.view)
 *
 * @query { query?: string, email?: string, roleId?: string, status?: "active"|"suspended", page?: number, limit?: number }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Admins fetched successfully",
 *   "data": {
 *     "admins": [
 *       { "_id": "...", "email": "admin@example.com", "firstName": "...", "lastName": "...", "status": "active", "role": { "_id": "...", "name": "..." } }
 *     ],
 *     "pagination": { "page": 1, "limit": 20, "total": 50, "totalPages": 3, "hasNextPage": true, "hasPrevPage": false }
 *   }
 * }
 */
export const getAdmins = async (req, res) => {
  console.log("> Get admins request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Query:", req.query);

  try {
    const { query, email, roleId, status, page, limit } = req.query;

    // Build filter
    const filter = {};

    if (query) {
      filter.$or = [
        { firstName: { $regex: query, $options: "i" } },
        { lastName: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ];
    }

    if (email) {
      filter.email = { $regex: email, $options: "i" };
    }

    if (roleId) {
      filter.roleId = roleId;
    }

    if (status) {
      filter.status = status;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const total = await Admin.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    // Fetch admins
    const admins = await Admin.find(filter)
      .select("email firstName lastName status createdAt lastLoginAt roleId")
      .populate("roleId", "name description")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Format response
    const formattedAdmins = admins.map((admin) => ({
      _id: admin._id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      status: admin.status,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
      role: admin.roleId
        ? {
            _id: admin.roleId._id,
            name: admin.roleId.name,
            description: admin.roleId.description,
          }
        : null,
    }));

    console.log(`> Found ${admins.length} admins (total: ${total})`);
    console.log("> Response admins:", formattedAdmins.map((a) => ({ _id: a._id, email: a.email })));

    return sendResponse(res, HTTP_STATUS.OK, "Admins fetched successfully", {
      admins: formattedAdmins,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.log(`Get admins error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch admins",
      null,
      error.message
    );
  }
};

/**
 * @route GET /api/admin/users/:adminId
 * @description Get a single admin by ID
 * @access Private (admin authenticated, requires admins.view)
 *
 * @params { adminId: "MongoDB ObjectId" }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Admin fetched successfully",
 *   "data": {
 *     "admin": { "_id": "...", "email": "admin@example.com", "firstName": "...", "lastName": "...", "status": "active", "role": { "_id": "...", "name": "...", "permissions": [...] } }
 *   }
 * }
 *
 * @responseBody Error (404)
 * { "message": "Admin not found", "data": null, "error": "Admin with given ID does not exist" }
 */
export const getAdmin = async (req, res) => {
  console.log("> Get admin request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Target Admin ID:", req.params.adminId);

  try {
    const { adminId } = req.params;

    const admin = await Admin.findById(adminId)
      .select("email firstName lastName status createdAt lastLoginAt forcePasswordChange roleId")
      .populate("roleId", "name description permissions");

    if (!admin) {
      console.log(`Admin not found: ${adminId}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Admin not found",
        null,
        "Admin with given ID does not exist"
      );
    }

    const adminResponse = {
      _id: admin._id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      status: admin.status,
      forcePasswordChange: admin.forcePasswordChange,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
      role: admin.roleId
        ? {
            _id: admin.roleId._id,
            name: admin.roleId.name,
            description: admin.roleId.description,
            permissions: admin.roleId.permissions,
          }
        : null,
    };

    console.log("> Response admin:", { _id: admin._id, email: admin.email });

    return sendResponse(res, HTTP_STATUS.OK, "Admin fetched successfully", { admin: adminResponse });
  } catch (error) {
    console.log(`Get admin error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch admin",
      null,
      error.message
    );
  }
};

/**
 * @route PATCH /api/admin/users/:adminId
 * @description Update an admin's details
 * @access Private (admin authenticated, requires admins.manage)
 *
 * @params { adminId: "MongoDB ObjectId" }
 *
 * @requestBody application/json
 * { "firstName": "Updated", "lastName": "Name", "roleId": "MongoDB ObjectId" }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Admin updated successfully",
 *   "data": {
 *     "admin": { "_id": "...", "email": "...", "firstName": "Updated", "lastName": "Name", ... }
 *   }
 * }
 *
 * @responseBody Error (404)
 * { "message": "Admin not found", "data": null, "error": "Admin with given ID does not exist" }
 */
export const updateAdmin = async (req, res) => {
  console.log("> Update admin request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Target Admin ID:", req.params.adminId);
  console.log("> Request body:", req.body);

  try {
    const { adminId } = req.params;
    const { firstName, lastName, roleId } = req.body;

    const admin = await Admin.findById(adminId);

    if (!admin) {
      console.log(`Admin not found: ${adminId}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Admin not found",
        null,
        "Admin with given ID does not exist"
      );
    }

    // If roleId is provided, validate it exists
    if (roleId) {
      const role = await Role.findById(roleId);
      if (!role) {
        console.log(`Role not found: ${roleId}`);
        return sendResponse(
          res,
          HTTP_STATUS.NOT_FOUND,
          "Role not found",
          null,
          "The specified role does not exist"
        );
      }
    }

    const previousState = {
      firstName: admin.firstName,
      lastName: admin.lastName,
      roleId: admin.roleId?.toString(),
    };

    // Update admin
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (roleId) updateData.roleId = roleId;

    const updatedAdmin = await Admin.findByIdAndUpdate(adminId, updateData, { new: true })
      .select("email firstName lastName status createdAt lastLoginAt roleId")
      .populate("roleId", "name description");

    console.log(`Admin updated: ${adminId}`);

    // Log audit
    await logAdminAction(
      req.adminId.toString(),
      AUDIT_ACTION.ADMIN_UPDATED,
      ENTITY_TYPE.ADMIN,
      adminId,
      req,
      previousState,
      { firstName: updatedAdmin.firstName, lastName: updatedAdmin.lastName, roleId: updatedAdmin.roleId?._id?.toString() }
    );

    const adminResponse = {
      _id: updatedAdmin._id,
      email: updatedAdmin.email,
      firstName: updatedAdmin.firstName,
      lastName: updatedAdmin.lastName,
      status: updatedAdmin.status,
      lastLoginAt: updatedAdmin.lastLoginAt,
      createdAt: updatedAdmin.createdAt,
      role: updatedAdmin.roleId
        ? {
            _id: updatedAdmin.roleId._id,
            name: updatedAdmin.roleId.name,
            description: updatedAdmin.roleId.description,
          }
        : null,
    };

    console.log("> Response admin:", { _id: updatedAdmin._id, email: updatedAdmin.email });

    return sendResponse(res, HTTP_STATUS.OK, "Admin updated successfully", { admin: adminResponse });
  } catch (error) {
    console.log(`Update admin error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update admin",
      null,
      error.message
    );
  }
};

/**
 * @route PATCH /api/admin/users/:adminId/role
 * @description Assign a new role to an admin
 * @access Private (admin authenticated, requires admins.manage)
 *
 * @params { adminId: "MongoDB ObjectId" }
 *
 * @requestBody application/json
 * { "roleId": "MongoDB ObjectId" }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Role assigned successfully",
 *   "data": {
 *     "admin": { "_id": "...", "email": "...", "role": { "_id": "...", "name": "new_role" } }
 *   }
 * }
 *
 * @responseBody Error (404)
 * { "message": "Admin not found", "data": null, "error": "Admin with given ID does not exist" }
 */
export const assignRole = async (req, res) => {
  console.log("> Assign role request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Target Admin ID:", req.params.adminId);
  console.log("> Request body:", req.body);

  try {
    const { adminId } = req.params;
    const { roleId } = req.body;

    const admin = await Admin.findById(adminId);

    if (!admin) {
      console.log(`Admin not found: ${adminId}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Admin not found",
        null,
        "Admin with given ID does not exist"
      );
    }

    // Validate role exists
    const role = await Role.findById(roleId);
    if (!role) {
      console.log(`Role not found: ${roleId}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Role not found",
        null,
        "The specified role does not exist"
      );
    }

    const previousRoleId = admin.roleId?.toString();

    // Update role
    admin.roleId = roleId;
    await admin.save();

    console.log(`Role assigned to admin: ${adminId}`);

    // Log audit
    await logAdminAction(
      req.adminId.toString(),
      AUDIT_ACTION.ADMIN_ROLE_CHANGED,
      ENTITY_TYPE.ADMIN,
      adminId,
      req,
      { roleId: previousRoleId },
      { roleId: roleId }
    );

    const adminResponse = {
      _id: admin._id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      status: admin.status,
      role: {
        _id: role._id,
        name: role.name,
        description: role.description,
      },
    };

    console.log("> Response admin:", { _id: admin._id, email: admin.email, role: role.name });

    return sendResponse(res, HTTP_STATUS.OK, "Role assigned successfully", { admin: adminResponse });
  } catch (error) {
    console.log(`Assign role error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to assign role",
      null,
      error.message
    );
  }
};

/**
 * @route POST /api/admin/users/:adminId/suspend
 * @description Suspend an admin account
 * @access Private (admin authenticated, requires admins.manage)
 *
 * @params { adminId: "MongoDB ObjectId" }
 *
 * @responseBody Success (200)
 * { "message": "Admin suspended successfully", "data": { "sessionsInvalidated": 2 } }
 *
 * @responseBody Error (400)
 * { "message": "Cannot suspend yourself", "data": null, "error": "You cannot suspend your own account" }
 *
 * @responseBody Error (409)
 * { "message": "Admin already suspended", "data": null, "error": "This admin is already suspended" }
 */
export const suspendAdmin = async (req, res) => {
  console.log("> Suspend admin request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Target Admin ID:", req.params.adminId);

  try {
    const { adminId } = req.params;

    // Cannot suspend yourself
    if (adminId === req.adminId.toString()) {
      console.log("Admin tried to suspend themselves");
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot suspend yourself",
        null,
        "You cannot suspend your own account"
      );
    }

    const admin = await Admin.findById(adminId);

    if (!admin) {
      console.log(`Admin not found: ${adminId}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Admin not found",
        null,
        "Admin with given ID does not exist"
      );
    }

    // Check if already suspended
    if (admin.status === ADMIN_STATUS.SUSPENDED) {
      console.log(`Admin already suspended: ${adminId}`);
      return sendResponse(
        res,
        HTTP_STATUS.CONFLICT,
        "Admin already suspended",
        null,
        "This admin is already suspended"
      );
    }

    // Update status
    admin.status = ADMIN_STATUS.SUSPENDED;
    await admin.save();

    console.log(`Admin suspended: ${adminId}`);

    // Invalidate all sessions
    const result = await Session.updateMany(
      { userId: adminId, userType: SESSION_USER_TYPE.ADMIN, isActive: true },
      { isActive: false }
    );

    console.log(`Invalidated ${result.modifiedCount} sessions`);

    // Log audit
    await logAdminAction(
      req.adminId.toString(),
      AUDIT_ACTION.ADMIN_SUSPENDED,
      ENTITY_TYPE.ADMIN,
      adminId,
      req,
      { status: ADMIN_STATUS.ACTIVE },
      { status: ADMIN_STATUS.SUSPENDED },
      { sessionsInvalidated: result.modifiedCount }
    );

    return sendResponse(res, HTTP_STATUS.OK, "Admin suspended successfully", {
      sessionsInvalidated: result.modifiedCount,
    });
  } catch (error) {
    console.log(`Suspend admin error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to suspend admin",
      null,
      error.message
    );
  }
};

/**
 * @route POST /api/admin/users/:adminId/reactivate
 * @description Reactivate a suspended admin account
 * @access Private (admin authenticated, requires admins.manage)
 *
 * @params { adminId: "MongoDB ObjectId" }
 *
 * @responseBody Success (200)
 * { "message": "Admin reactivated successfully", "data": null }
 *
 * @responseBody Error (409)
 * { "message": "Admin is not suspended", "data": null, "error": "This admin is not suspended" }
 */
export const reactivateAdmin = async (req, res) => {
  console.log("> Reactivate admin request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Target Admin ID:", req.params.adminId);

  try {
    const { adminId } = req.params;

    const admin = await Admin.findById(adminId);

    if (!admin) {
      console.log(`Admin not found: ${adminId}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Admin not found",
        null,
        "Admin with given ID does not exist"
      );
    }

    // Check if actually suspended
    if (admin.status !== ADMIN_STATUS.SUSPENDED) {
      console.log(`Admin is not suspended: ${adminId}`);
      return sendResponse(
        res,
        HTTP_STATUS.CONFLICT,
        "Admin is not suspended",
        null,
        "This admin is not suspended"
      );
    }

    // Update status
    admin.status = ADMIN_STATUS.ACTIVE;
    await admin.save();

    console.log(`Admin reactivated: ${adminId}`);

    // Log audit
    await logAdminAction(
      req.adminId.toString(),
      AUDIT_ACTION.ADMIN_REACTIVATED,
      ENTITY_TYPE.ADMIN,
      adminId,
      req,
      { status: ADMIN_STATUS.SUSPENDED },
      { status: ADMIN_STATUS.ACTIVE }
    );

    return sendResponse(res, HTTP_STATUS.OK, "Admin reactivated successfully", null);
  } catch (error) {
    console.log(`Reactivate admin error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to reactivate admin",
      null,
      error.message
    );
  }
};

export default {
  createAdmin,
  getAdmins,
  getAdmin,
  updateAdmin,
  assignRole,
  suspendAdmin,
  reactivateAdmin,
};
