import { Router } from "express";
import {
  getAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultShipping,
  setDefaultBilling,
  validatePincode,
  getCustomerAddresses,
  flagAddress,
  verifyAddress,
} from "./address.controller.js";
import {
  createAddressSchema,
  updateAddressSchema,
  addressIdParamSchema,
  validatePincodeSchema,
  customerAddressParamSchema,
  flagAddressSchema,
  validate,
  validateParams,
} from "./address.validator.js";
import {
  authenticateUser,
  verifyActiveSession,
} from "../../middlewares/auth.middleware.js";
import { authenticateAdmin } from "../../middlewares/admin.middleware.js";
import { requirePermission } from "../../middlewares/rbac.middleware.js";
import { PERMISSIONS } from "../../utils/constants.js";

const router = Router();

//
// CONSUMER ADDRESS ROUTES
//

/**
 * @route GET /api/addresses
 * @description Get all addresses for current user
 * @access Private (consumer authenticated)
 */
router.get("/", authenticateUser, verifyActiveSession, getAddresses);

/**
 * @route POST /api/addresses
 * @description Create a new address
 * @access Private (consumer authenticated)
 */
router.post(
  "/",
  authenticateUser,
  verifyActiveSession,
  validate(createAddressSchema),
  createAddress,
);

/**
 * @route POST /api/addresses/validate-pincode
 * @description Validate pincode and get city/state info
 * @access Public (no authentication required for checking delivery availability)
 * @note This route must come before /:addressId to avoid matching "validate-pincode" as addressId
 */
router.post(
  "/validate-pincode",
  validate(validatePincodeSchema),
  validatePincode,
);

/**
 * @route GET /api/addresses/:addressId
 * @description Get a single address by ID
 * @access Private (consumer authenticated)
 */
router.get(
  "/:addressId",
  authenticateUser,
  verifyActiveSession,
  validateParams(addressIdParamSchema),
  getAddress,
);

/**
 * @route PATCH /api/addresses/:addressId
 * @description Update an address
 * @access Private (consumer authenticated)
 */
router.patch(
  "/:addressId",
  authenticateUser,
  verifyActiveSession,
  validateParams(addressIdParamSchema),
  validate(updateAddressSchema),
  updateAddress,
);

/**
 * @route DELETE /api/addresses/:addressId
 * @description Delete an address
 * @access Private (consumer authenticated)
 */
router.delete(
  "/:addressId",
  authenticateUser,
  verifyActiveSession,
  validateParams(addressIdParamSchema),
  deleteAddress,
);

/**
 * @route PATCH /api/addresses/:addressId/default-shipping
 * @description Set address as default shipping
 * @access Private (consumer authenticated)
 */
router.patch(
  "/:addressId/default-shipping",
  authenticateUser,
  verifyActiveSession,
  validateParams(addressIdParamSchema),
  setDefaultShipping,
);

/**
 * @route PATCH /api/addresses/:addressId/default-billing
 * @description Set address as default billing
 * @access Private (consumer authenticated)
 */
router.patch(
  "/:addressId/default-billing",
  authenticateUser,
  verifyActiveSession,
  validateParams(addressIdParamSchema),
  setDefaultBilling,
);

//
// ADMIN ADDRESS MANAGEMENT ROUTES
//

/**
 * @route GET /api/addresses/admin/customers/:customerId/addresses
 * @description Get all addresses for a customer
 * @access Private (admin authenticated, requires customers.addresses)
 */
router.get(
  "/admin/customers/:customerId/addresses",
  authenticateAdmin,
  requirePermission(PERMISSIONS.CUSTOMERS_ADDRESSES),
  validateParams(customerAddressParamSchema),
  getCustomerAddresses,
);

/**
 * @route PATCH /api/addresses/admin/addresses/:addressId/flag
 * @description Flag an address as suspicious
 * @access Private (admin authenticated, requires customers.addresses)
 */
router.patch(
  "/admin/addresses/:addressId/flag",
  authenticateAdmin,
  requirePermission(PERMISSIONS.CUSTOMERS_ADDRESSES),
  validateParams(addressIdParamSchema),
  validate(flagAddressSchema),
  flagAddress,
);

/**
 * @route PATCH /api/addresses/admin/addresses/:addressId/verify
 * @description Mark an address as verified
 * @access Private (admin authenticated, requires customers.addresses)
 */
router.patch(
  "/admin/addresses/:addressId/verify",
  authenticateAdmin,
  requirePermission(PERMISSIONS.CUSTOMERS_ADDRESSES),
  validateParams(addressIdParamSchema),
  verifyAddress,
);

export default router;
