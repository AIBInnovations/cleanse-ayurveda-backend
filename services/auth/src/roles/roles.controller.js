import Role from "../../models/role.model.js";
import Admin from "../../models/admin.model.js";
import { logAdminAction } from "../../services/audit.service.js";
import { sendResponse } from "@shared/utils";
import {
  HTTP_STATUS,
  AUDIT_ACTION,
  ENTITY_TYPE,
  ALL_PERMISSIONS,
} from "../../utils/constants.js";

/**
 * @route GET /api/admin/roles
 * @description Get all roles with permissions
 * @access Private (admin authenticated, requires roles.view)
 *
 * @responseBody Success (200)
 * {
 *   "message": "Roles fetched successfully",
 *   "data": {
 *     "roles": [
 *       { "_id": "...", "name": "super_admin", "description": "Full system access", "permissions": [...], "isSystemRole": true }
 *     ]
 *   }
 * }
 */
export const getAllRoles = async (req, res) => {
  console.log("> Get all roles request received");
  console.log("> Admin ID:", req.adminId?.toString());

  try {
    const roles = await Role.find().sort({ isSystemRole: -1, name: 1 });

    console.log(`> Found ${roles.length} roles`);
    console.log("> Response roles:", roles.map((r) => ({ _id: r._id, name: r.name })));

    return sendResponse(res, HTTP_STATUS.OK, "Roles fetched successfully", { roles });
  } catch (error) {
    console.log(`Get all roles error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch roles",
      null,
      error.message
    );
  }
};

/**
 * @route GET /api/admin/roles/:roleId
 * @description Get a single role by ID
 * @access Private (admin authenticated, requires roles.view)
 *
 * @params { roleId: "MongoDB ObjectId" }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Role fetched successfully",
 *   "data": {
 *     "role": { "_id": "...", "name": "catalog_manager", "description": "...", "permissions": [...], "isSystemRole": true }
 *   }
 * }
 *
 * @responseBody Error (404)
 * { "message": "Role not found", "data": null, "error": "Role with given ID does not exist" }
 */
export const getRole = async (req, res) => {
  console.log("> Get role request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Role ID:", req.params.roleId);

  try {
    const { roleId } = req.params;

    const role = await Role.findById(roleId);

    if (!role) {
      console.log(`Role not found: ${roleId}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Role not found",
        null,
        "Role with given ID does not exist"
      );
    }

    console.log("> Response role:", { _id: role._id, name: role.name });

    return sendResponse(res, HTTP_STATUS.OK, "Role fetched successfully", { role });
  } catch (error) {
    console.log(`Get role error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch role",
      null,
      error.message
    );
  }
};

/**
 * @route POST /api/admin/roles
 * @description Create a new role
 * @access Private (admin authenticated, requires roles.manage)
 *
 * @requestBody application/json
 * { "name": "custom_role", "description": "Custom role description", "permissions": ["customers.view", "orders.view"] }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Role created successfully",
 *   "data": {
 *     "role": { "_id": "...", "name": "custom_role", "description": "...", "permissions": [...], "isSystemRole": false }
 *   }
 * }
 *
 * @responseBody Error (409)
 * { "message": "Role name already exists", "data": null, "error": "A role with this name already exists" }
 */
export const createRole = async (req, res) => {
  console.log("> Create role request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Request body:", req.body);

  try {
    const { name, description, permissions } = req.body;

    // Check if role name already exists
    const existingRole = await Role.findOne({ name: name.toLowerCase() });
    if (existingRole) {
      console.log(`Role name already exists: ${name}`);
      return sendResponse(
        res,
        HTTP_STATUS.CONFLICT,
        "Role name already exists",
        null,
        "A role with this name already exists"
      );
    }

    // Validate permissions are valid
    const invalidPermissions = permissions.filter((p) => !ALL_PERMISSIONS.includes(p));
    if (invalidPermissions.length > 0) {
      console.log(`Invalid permissions: ${invalidPermissions.join(", ")}`);
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Invalid permissions",
        null,
        `Invalid permissions: ${invalidPermissions.join(", ")}`
      );
    }

    // Create role
    const role = await Role.create({
      name: name.toLowerCase(),
      description: description || null,
      permissions,
      isSystemRole: false,
    });

    console.log(`Role created: ${role._id}`);

    // Log audit
    await logAdminAction(
      req.adminId.toString(),
      AUDIT_ACTION.ROLE_CREATED,
      ENTITY_TYPE.ROLE,
      role._id.toString(),
      req,
      null,
      { name: role.name, permissions: role.permissions }
    );

    console.log("> Response role:", { _id: role._id, name: role.name });

    return sendResponse(res, HTTP_STATUS.CREATED, "Role created successfully", { role });
  } catch (error) {
    console.log(`Create role error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create role",
      null,
      error.message
    );
  }
};

/**
 * @route PATCH /api/admin/roles/:roleId
 * @description Update a role (cannot modify system role name or permissions)
 * @access Private (admin authenticated, requires roles.manage)
 *
 * @params { roleId: "MongoDB ObjectId" }
 *
 * @requestBody application/json
 * { "name": "updated_role", "description": "Updated description", "permissions": ["customers.view"] }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Role updated successfully",
 *   "data": {
 *     "role": { "_id": "...", "name": "updated_role", "description": "...", "permissions": [...], "isSystemRole": false }
 *   }
 * }
 *
 * @responseBody Error (403)
 * { "message": "Cannot modify system role", "data": null, "error": "System roles can only have their description updated" }
 */
export const updateRole = async (req, res) => {
  console.log("> Update role request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Role ID:", req.params.roleId);
  console.log("> Request body:", req.body);

  try {
    const { roleId } = req.params;
    const { name, description, permissions } = req.body;

    const role = await Role.findById(roleId);

    if (!role) {
      console.log(`Role not found: ${roleId}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Role not found",
        null,
        "Role with given ID does not exist"
      );
    }

    // Check if trying to modify system role name or permissions
    if (role.isSystemRole && (name || permissions)) {
      console.log(`Cannot modify system role name or permissions: ${role.name}`);
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Cannot modify system role",
        null,
        "System roles can only have their description updated"
      );
    }

    // Check if new name conflicts with existing role
    if (name && name.toLowerCase() !== role.name) {
      const existingRole = await Role.findOne({ name: name.toLowerCase() });
      if (existingRole) {
        console.log(`Role name already exists: ${name}`);
        return sendResponse(
          res,
          HTTP_STATUS.CONFLICT,
          "Role name already exists",
          null,
          "A role with this name already exists"
        );
      }
    }

    // Validate permissions if provided
    if (permissions) {
      const invalidPermissions = permissions.filter((p) => !ALL_PERMISSIONS.includes(p));
      if (invalidPermissions.length > 0) {
        console.log(`Invalid permissions: ${invalidPermissions.join(", ")}`);
        return sendResponse(
          res,
          HTTP_STATUS.BAD_REQUEST,
          "Invalid permissions",
          null,
          `Invalid permissions: ${invalidPermissions.join(", ")}`
        );
      }
    }

    const previousState = {
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    };

    // Update role
    const updateData = {};
    if (name && !role.isSystemRole) updateData.name = name.toLowerCase();
    if (description !== undefined) updateData.description = description || null;
    if (permissions && !role.isSystemRole) updateData.permissions = permissions;

    const updatedRole = await Role.findByIdAndUpdate(roleId, updateData, { new: true });

    console.log(`Role updated: ${updatedRole._id}`);

    // Log audit
    await logAdminAction(
      req.adminId.toString(),
      AUDIT_ACTION.ROLE_UPDATED,
      ENTITY_TYPE.ROLE,
      role._id.toString(),
      req,
      previousState,
      { name: updatedRole.name, description: updatedRole.description, permissions: updatedRole.permissions }
    );

    console.log("> Response role:", { _id: updatedRole._id, name: updatedRole.name });

    return sendResponse(res, HTTP_STATUS.OK, "Role updated successfully", { role: updatedRole });
  } catch (error) {
    console.log(`Update role error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update role",
      null,
      error.message
    );
  }
};

/**
 * @route DELETE /api/admin/roles/:roleId
 * @description Delete a role (cannot delete system roles or roles with assigned admins)
 * @access Private (admin authenticated, requires roles.manage)
 *
 * @params { roleId: "MongoDB ObjectId" }
 *
 * @responseBody Success (200)
 * { "message": "Role deleted successfully", "data": null }
 *
 * @responseBody Error (403)
 * { "message": "Cannot delete system role", "data": null, "error": "System roles cannot be deleted" }
 *
 * @responseBody Error (409)
 * { "message": "Role has assigned admins", "data": null, "error": "Cannot delete role with 3 assigned admins. Reassign them first." }
 */
export const deleteRole = async (req, res) => {
  console.log("> Delete role request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Role ID:", req.params.roleId);

  try {
    const { roleId } = req.params;

    const role = await Role.findById(roleId);

    if (!role) {
      console.log(`Role not found: ${roleId}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Role not found",
        null,
        "Role with given ID does not exist"
      );
    }

    // Check if system role
    if (role.isSystemRole) {
      console.log(`Cannot delete system role: ${role.name}`);
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Cannot delete system role",
        null,
        "System roles cannot be deleted"
      );
    }

    // Check if any admins are assigned to this role
    const adminCount = await Admin.countDocuments({ roleId });
    if (adminCount > 0) {
      console.log(`Role has ${adminCount} assigned admins`);
      return sendResponse(
        res,
        HTTP_STATUS.CONFLICT,
        "Role has assigned admins",
        null,
        `Cannot delete role with ${adminCount} assigned admins. Reassign them first.`
      );
    }

    // Delete role
    await Role.findByIdAndDelete(roleId);

    console.log(`Role deleted: ${roleId}`);

    // Log audit
    await logAdminAction(
      req.adminId.toString(),
      AUDIT_ACTION.ROLE_DELETED,
      ENTITY_TYPE.ROLE,
      roleId,
      req,
      { name: role.name, permissions: role.permissions },
      null
    );

    return sendResponse(res, HTTP_STATUS.OK, "Role deleted successfully", null);
  } catch (error) {
    console.log(`Delete role error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to delete role",
      null,
      error.message
    );
  }
};

/**
 * @route PUT /api/admin/roles/:roleId/permissions
 * @description Replace all permissions for a role
 * @access Private (admin authenticated, requires roles.manage)
 *
 * @params { roleId: "MongoDB ObjectId" }
 *
 * @requestBody application/json
 * { "permissions": ["customers.view", "customers.manage", "orders.view"] }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Permissions updated successfully",
 *   "data": {
 *     "role": { "_id": "...", "name": "...", "permissions": [...] }
 *   }
 * }
 *
 * @responseBody Error (403)
 * { "message": "Cannot modify system role permissions", "data": null, "error": "System role permissions cannot be changed" }
 */
export const assignPermissions = async (req, res) => {
  console.log("> Assign permissions request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Role ID:", req.params.roleId);
  console.log("> Request body:", req.body);

  try {
    const { roleId } = req.params;
    const { permissions } = req.body;

    const role = await Role.findById(roleId);

    if (!role) {
      console.log(`Role not found: ${roleId}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Role not found",
        null,
        "Role with given ID does not exist"
      );
    }

    // Check if system role
    if (role.isSystemRole) {
      console.log(`Cannot modify system role permissions: ${role.name}`);
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Cannot modify system role permissions",
        null,
        "System role permissions cannot be changed"
      );
    }

    // Validate permissions
    const invalidPermissions = permissions.filter((p) => !ALL_PERMISSIONS.includes(p));
    if (invalidPermissions.length > 0) {
      console.log(`Invalid permissions: ${invalidPermissions.join(", ")}`);
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Invalid permissions",
        null,
        `Invalid permissions: ${invalidPermissions.join(", ")}`
      );
    }

    const previousPermissions = [...role.permissions];

    // Update permissions
    role.permissions = permissions;
    await role.save();

    console.log(`Permissions updated for role: ${role._id}`);

    // Log audit
    await logAdminAction(
      req.adminId.toString(),
      AUDIT_ACTION.ROLE_PERMISSIONS_UPDATED,
      ENTITY_TYPE.ROLE,
      role._id.toString(),
      req,
      { permissions: previousPermissions },
      { permissions: role.permissions }
    );

    console.log("> Response role:", { _id: role._id, name: role.name, permissions: role.permissions });

    return sendResponse(res, HTTP_STATUS.OK, "Permissions updated successfully", { role });
  } catch (error) {
    console.log(`Assign permissions error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to assign permissions",
      null,
      error.message
    );
  }
};

/**
 * @route DELETE /api/admin/roles/:roleId/permissions
 * @description Remove specific permissions from a role
 * @access Private (admin authenticated, requires roles.manage)
 *
 * @params { roleId: "MongoDB ObjectId" }
 *
 * @requestBody application/json
 * { "permissions": ["orders.manage"] }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Permissions removed successfully",
 *   "data": {
 *     "role": { "_id": "...", "name": "...", "permissions": [...] }
 *   }
 * }
 *
 * @responseBody Error (403)
 * { "message": "Cannot modify system role permissions", "data": null, "error": "System role permissions cannot be changed" }
 */
export const removePermissions = async (req, res) => {
  console.log("> Remove permissions request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Role ID:", req.params.roleId);
  console.log("> Request body:", req.body);

  try {
    const { roleId } = req.params;
    const { permissions: permissionsToRemove } = req.body;

    const role = await Role.findById(roleId);

    if (!role) {
      console.log(`Role not found: ${roleId}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Role not found",
        null,
        "Role with given ID does not exist"
      );
    }

    // Check if system role
    if (role.isSystemRole) {
      console.log(`Cannot modify system role permissions: ${role.name}`);
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Cannot modify system role permissions",
        null,
        "System role permissions cannot be changed"
      );
    }

    const previousPermissions = [...role.permissions];

    // Remove specified permissions
    role.permissions = role.permissions.filter((p) => !permissionsToRemove.includes(p));
    await role.save();

    console.log(`Permissions removed from role: ${role._id}`);

    // Log audit
    await logAdminAction(
      req.adminId.toString(),
      AUDIT_ACTION.ROLE_PERMISSIONS_UPDATED,
      ENTITY_TYPE.ROLE,
      role._id.toString(),
      req,
      { permissions: previousPermissions },
      { permissions: role.permissions }
    );

    console.log("> Response role:", { _id: role._id, name: role.name, permissions: role.permissions });

    return sendResponse(res, HTTP_STATUS.OK, "Permissions removed successfully", { role });
  } catch (error) {
    console.log(`Remove permissions error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to remove permissions",
      null,
      error.message
    );
  }
};

/**
 * @route GET /api/admin/roles/:roleId/admins
 * @description Get all admins assigned to a role
 * @access Private (admin authenticated, requires roles.view)
 *
 * @params { roleId: "MongoDB ObjectId" }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Admins fetched successfully",
 *   "data": {
 *     "admins": [
 *       { "_id": "...", "email": "admin@example.com", "firstName": "...", "lastName": "...", "status": "active" }
 *     ],
 *     "count": 2
 *   }
 * }
 *
 * @responseBody Error (404)
 * { "message": "Role not found", "data": null, "error": "Role with given ID does not exist" }
 */
export const getAdminsByRole = async (req, res) => {
  console.log("> Get admins by role request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Role ID:", req.params.roleId);

  try {
    const { roleId } = req.params;

    const role = await Role.findById(roleId);

    if (!role) {
      console.log(`Role not found: ${roleId}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Role not found",
        null,
        "Role with given ID does not exist"
      );
    }

    const admins = await Admin.find({ roleId })
      .select("email firstName lastName status createdAt lastLoginAt")
      .sort({ createdAt: -1 });

    console.log(`> Found ${admins.length} admins for role: ${role.name}`);
    console.log("> Response admins:", admins.map((a) => ({ _id: a._id, email: a.email })));

    return sendResponse(res, HTTP_STATUS.OK, "Admins fetched successfully", {
      admins,
      count: admins.length,
    });
  } catch (error) {
    console.log(`Get admins by role error: ${error.message}`);
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

export default {
  getAllRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  assignPermissions,
  removePermissions,
  getAdminsByRole,
};
