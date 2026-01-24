import { Router } from "express";
import {
  getProfile,
  updateProfile,
  changeEmail,
  requestPhoneChange,
  verifyPhoneChange,
  uploadAvatar,
  removeAvatar,
  requestAccountDeletion,
  cancelAccountDeletion,
  getAdminProfile,
  searchCustomers,
  getCustomerProfile,
  suspendCustomer,
  reactivateCustomer,
  addCustomerNote,
  exportCustomerData,
} from "./profile.controller.js";
import {
  updateProfileSchema,
  changeEmailSchema,
  changePhoneSchema,
  verifyPhoneSchema,
  deleteAccountSchema,
  searchCustomersSchema,
  customerIdParamSchema,
  updateCustomerStatusSchema,
  addCustomerNoteSchema,
  validate,
  validateParams,
  validateQuery,
} from "./profile.validator.js";
import {
  authenticateUser,
  verifyActiveSession,
} from "../../middlewares/auth.middleware.js";
import { authenticateAdmin } from "../../middlewares/admin.middleware.js";
import { requirePermission } from "../../middlewares/rbac.middleware.js";
import { uploadAny } from "@shared/middlewares";
import { PERMISSIONS } from "../../utils/constants.js";

const router = Router();

//
// CONSUMER PROFILE ROUTES
//

/**
 * @route GET /api/profile
 * @description Get current user profile
 * @access Private (consumer authenticated)
 */
router.get("/", authenticateUser, verifyActiveSession, getProfile);

/**
 * @route PATCH /api/profile
 * @description Update current user profile
 * @access Private (consumer authenticated)
 */
router.patch(
  "/",
  authenticateUser,
  verifyActiveSession,
  validate(updateProfileSchema),
  updateProfile,
);

/**
 * @route POST /api/profile/email/change
 * @description Change user email
 * @access Private (consumer authenticated)
 */
router.post(
  "/email/change",
  authenticateUser,
  verifyActiveSession,
  validate(changeEmailSchema),
  changeEmail,
);

/**
 * @route POST /api/profile/phone/change
 * @description Request phone number change
 * @access Private (consumer authenticated)
 */
router.post(
  "/phone/change",
  authenticateUser,
  verifyActiveSession,
  validate(changePhoneSchema),
  requestPhoneChange,
);

/**
 * @route POST /api/profile/phone/verify
 * @description Verify phone change with Firebase ID token
 * @access Private (consumer authenticated)
 */
router.post(
  "/phone/verify",
  authenticateUser,
  verifyActiveSession,
  validate(verifyPhoneSchema),
  verifyPhoneChange,
);

/**
 * @route POST /api/profile/avatar
 * @description Upload user avatar
 * @access Private (consumer authenticated)
 */
router.post(
  "/avatar",
  authenticateUser,
  verifyActiveSession,
  uploadAny,
  uploadAvatar,
);

/**
 * @route DELETE /api/profile/avatar
 * @description Remove user avatar
 * @access Private (consumer authenticated)
 */
router.delete("/avatar", authenticateUser, verifyActiveSession, removeAvatar);

/**
 * @route POST /api/profile/delete-request
 * @description Request account deletion
 * @access Private (consumer authenticated)
 */
router.post(
  "/delete-request",
  authenticateUser,
  verifyActiveSession,
  validate(deleteAccountSchema),
  requestAccountDeletion,
);

/**
 * @route POST /api/profile/delete-cancel
 * @description Cancel account deletion request
 * @access Private (consumer authenticated)
 */
router.post(
  "/delete-cancel",
  authenticateUser,
  verifyActiveSession,
  cancelAccountDeletion,
);

//
// ADMIN PROFILE ROUTES
//

/**
 * @route GET /api/profile/admin
 * @description Get current admin profile
 * @access Private (admin authenticated)
 */
router.get("/admin", authenticateAdmin, getAdminProfile);

//
// ADMIN CUSTOMER MANAGEMENT ROUTES
//

/**
 * @route GET /api/profile/admin/customers
 * @description Search and list customers
 * @access Private (admin authenticated, requires customers.view)
 */
router.get(
  "/admin/customers",
  authenticateAdmin,
  requirePermission(PERMISSIONS.CUSTOMERS_VIEW),
  validateQuery(searchCustomersSchema),
  searchCustomers,
);

/**
 * @route GET /api/profile/admin/customers/:customerId
 * @description Get customer profile by ID
 * @access Private (admin authenticated, requires customers.view)
 */
router.get(
  "/admin/customers/:customerId",
  authenticateAdmin,
  requirePermission(PERMISSIONS.CUSTOMERS_VIEW),
  validateParams(customerIdParamSchema),
  getCustomerProfile,
);

/**
 * @route POST /api/profile/admin/customers/:customerId/suspend
 * @description Suspend a customer account
 * @access Private (admin authenticated, requires customers.manage)
 */
router.post(
  "/admin/customers/:customerId/suspend",
  authenticateAdmin,
  requirePermission(PERMISSIONS.CUSTOMERS_MANAGE),
  validateParams(customerIdParamSchema),
  validate(updateCustomerStatusSchema),
  suspendCustomer,
);

/**
 * @route POST /api/profile/admin/customers/:customerId/reactivate
 * @description Reactivate a suspended customer
 * @access Private (admin authenticated, requires customers.manage)
 */
router.post(
  "/admin/customers/:customerId/reactivate",
  authenticateAdmin,
  requirePermission(PERMISSIONS.CUSTOMERS_MANAGE),
  validateParams(customerIdParamSchema),
  reactivateCustomer,
);

/**
 * @route POST /api/profile/admin/customers/:customerId/notes
 * @description Add internal note to customer
 * @access Private (admin authenticated, requires customers.manage)
 */
router.post(
  "/admin/customers/:customerId/notes",
  authenticateAdmin,
  requirePermission(PERMISSIONS.CUSTOMERS_MANAGE),
  validateParams(customerIdParamSchema),
  validate(addCustomerNoteSchema),
  addCustomerNote,
);

/**
 * @route GET /api/profile/admin/customers/:customerId/export
 * @description Export all customer data (GDPR)
 * @access Private (admin authenticated, requires customers.export)
 */
router.get(
  "/admin/customers/:customerId/export",
  authenticateAdmin,
  requirePermission(PERMISSIONS.CUSTOMERS_EXPORT),
  validateParams(customerIdParamSchema),
  exportCustomerData,
);

export default router;
