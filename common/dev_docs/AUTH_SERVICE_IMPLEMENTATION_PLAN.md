# User and Auth Service - Implementation Plan

## Overview

Standalone microservice handling authentication, user management, admin access control, and audit logging. Uses Express.js, MongoDB (Mongoose), Firebase Admin SDK for phone OTP, and JWT for session management.

---

## Implementation Status Legend

| Status | Meaning |
|--------|---------|
| [x] | Implemented |
| [~] | Partially implemented / Modified approach |
| [-] | Skipped (not needed) |
| [ ] | Not yet implemented |

---

## Implementation Progress Summary

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 | [x] Complete | All models, middlewares, services, utilities created |
| Phase 2 | [~] Modified | OTP endpoints skipped (Firebase handles); Registration implemented |
| Phase 3 | [x] Complete | Consumer login/logout, password reset, admin auth implemented |
| Phase 4 | [x] Complete | Consumer and admin session management implemented |
| Phase 5 | [x] Complete | Profile and address management implemented |
| Phase 6 | [x] Complete | Roles and admin user management implemented |
| Phase 7 | [x] Complete | Audit logs, health checks, and route integration implemented |

---

## Technology Stack

- Runtime: Node.js with ES Modules
- Framework: Express.js v5
- Database: MongoDB with Mongoose ODM
- OTP Provider: Firebase Admin SDK (phone OTP)
- Email Provider: Nodemailer (future: email verification)
- Validation: Joi
- Auth Strategy: JWT (access + refresh tokens)
- Access Control: RBAC + ABAC hybrid

## Entity Models

Seven core entities required:
- [x] users (consumer accounts)
- [x] addresses (user addresses)
- [x] user_sessions (active sessions, tokens, device info)
- [~] otp_requests (created but NOT USED - Firebase handles OTP lifecycle)
- [x] admin_users (admin accounts)
- [x] roles (RBAC roles with permissions)
- [x] audit_logs (action tracking)

## Folder Structure

```
src/
  auth/
    user.controller.js     [x] Created (updated Phase 3)
    user.route.js          [x] Created (updated Phase 3)
    user.validator.js      [x] Created (updated Phase 3)
    admin.controller.js    [x] Created (Phase 3)
    admin.route.js         [x] Created (Phase 3)
    admin.validator.js     [x] Created (Phase 3)
  session/
    session.controller.js  [x] Created (Phase 4)
    session.route.js       [x] Created (Phase 4)
    session.validator.js   [x] Created (Phase 4)
  otp/
    otp.controller.js      [-] SKIPPED - Firebase handles OTP
    otp.route.js           [-] SKIPPED - Firebase handles OTP
    otp.validator.js       [-] SKIPPED - Firebase handles OTP
  profile/
    profile.controller.js  [x] Created (Phase 5)
    profile.route.js       [x] Created (Phase 5)
    profile.validator.js   [x] Created (Phase 5)
  address/
    address.controller.js  [x] Created (Phase 5)
    address.route.js       [x] Created (Phase 5)
    address.validator.js   [x] Created (Phase 5)
  admin-users/
    admin-users.controller.js  [x] Created (Phase 6)
    admin-users.route.js       [x] Created (Phase 6)
    admin-users.validator.js   [x] Created (Phase 6)
  roles/
    roles.controller.js    [x] Created (Phase 6)
    roles.route.js         [x] Created (Phase 6)
    roles.validator.js     [x] Created (Phase 6)
  audit/
    audit.controller.js    [x] Created (Phase 7)
    audit.route.js         [x] Created (Phase 7)
    audit.validator.js     [x] Created (Phase 7)
models/
  user.model.js            [x] Created
  address.model.js         [x] Created
  session.model.js         [x] Created
  otp.model.js             [~] Created but NOT USED
  admin.model.js           [x] Created
  role.model.js            [x] Created
  audit.model.js           [x] Created
middlewares/
  auth.middleware.js       [x] Created
  admin.middleware.js      [x] Created
  rbac.middleware.js       [x] Created
  validation.middleware.js [ ] Not created (using inline validate in user.validator.js)
  rateLimit.middleware.js  [x] Created
  errorHandler.middleware.js [x] Created
services/
  token.service.js         [x] Created
  otp.service.js           [~] Created (simplified - only Firebase token verification)
  email.service.js         [ ] Pending (future)
  audit.service.js         [x] Created
utils/
  response.utils.js        [x] Existed
  constants.js             [x] Created
  helpers.js               [x] Created
```

---

# PHASE 1: Foundation and Core Models [x] COMPLETE

## Prompt 1.1: Base Models and Utilities [x]

Create foundational models and utility functions.

### Tasks

1. [x] Create `models/user.model.js`
   - Fields: firebaseUid, phone (unique, indexed), email (sparse unique), emailVerified, phoneVerified, firstName, lastName, avatar, passwordHash (nullable for OTP-only users), languagePreference, currencyPreference, marketingConsent, termsAcceptedAt, status (active/suspended/deleted), deletionRequestedAt, createdAt, updatedAt
   - Index on phone, email, firebaseUid
   - Pre-save hook for updatedAt

2. [x] Create `models/address.model.js`
   - Fields: userId (ref), label (Home/Office/Other), fullName, phone, addressLine1, addressLine2, city, state, pincode, country (default: India), landmark, isDefaultShipping, isDefaultBilling, isVerified, isFlagged, createdAt, updatedAt
   - Index on userId, pincode

3. [x] Create `models/session.model.js`
   - Fields: userId (ref), userType (consumer/admin), accessToken, refreshToken, refreshTokenExpiresAt, deviceInfo (object: deviceId, deviceType, os, browser, ip, userAgent), isActive, lastActivityAt, createdAt, expiresAt
   - Index on userId, refreshToken, isActive
   - TTL index on expiresAt

4. [~] Create `models/otp.model.js` - CREATED BUT NOT USED
   - **NOTE**: Firebase Client SDK handles OTP sending, verification, rate limiting, and expiry
   - This model was created but is NOT USED in the current implementation
   - May be useful for future email OTP functionality

5. [x] Create `models/admin.model.js`
   - Fields: email (unique), passwordHash, firstName, lastName, roleId (ref), status (active/suspended), forcePasswordChange, lastLoginAt, createdAt, updatedAt
   - Index on email, roleId

6. [x] Create `models/role.model.js`
   - Fields: name (unique), description, permissions (array of strings), isSystemRole, createdAt, updatedAt
   - Index on name
   - Default roles to seed: super_admin, catalog_manager, order_manager, marketing_manager, support_agent, finance

7. [x] Create `models/audit.model.js`
   - Fields: actorId, actorType (consumer/admin/system), action, entityType, entityId, previousState (object), newState (object), metadata (object), ip, userAgent, createdAt
   - Index on actorId, action, entityType, createdAt

8. [x] Create `utils/constants.js`
   - OTP purposes, user statuses, admin statuses, session types, audit actions, default permissions per role

9. [x] Create `services/audit.service.js`
   - Function: logAction(actorId, actorType, action, entityType, entityId, previousState, newState, metadata, req)
   - Extract IP and userAgent from req

10. [~] Update `middlewares/validate.middleware.js`
    - **DIFFERENT APPROACH**: Instead of a separate middleware file, validation is done inline in `user.validator.js` with a `validate(schema)` middleware factory

---

## Prompt 1.2: Token and Auth Middleware [x]

Create JWT token service and authentication middleware.

### Tasks

1. [x] Add dependencies to package.json
   - jsonwebtoken, bcryptjs

2. [x] Create `services/token.service.js`
   - generateAccessToken(payload) - short-lived (15m)
   - generateRefreshToken(payload) - long-lived (7d or 30d for remember me)
   - verifyAccessToken(token)
   - verifyRefreshToken(token)
   - Constants: ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY, REMEMBER_ME_EXPIRY

3. [x] Create `middlewares/auth.middleware.js`
   - authenticateUser - verify access token, attach user to req
   - optionalAuth - attach user if token present, continue if not
   - Extract token from Authorization header (Bearer scheme)

4. [x] Create `middlewares/admin.middleware.js`
   - authenticateAdmin - verify access token, check userType is admin, attach admin to req
   - checkForcePasswordChange - block if admin.forcePasswordChange is true (except password change endpoint)

5. [x] Create `middlewares/rbac.middleware.js`
   - requirePermission(permission) - check if admin role has permission
   - requireAnyPermission([permissions]) - check if admin has any of the permissions
   - requireAllPermissions([permissions]) - check if admin has all permissions

6. [x] Create `middlewares/rateLimit.middleware.js`
   - otpRateLimit - limit OTP requests per identifier (e.g., 5 per 10 minutes)
   - loginRateLimit - limit login attempts per IP
   - Use in-memory store initially, note for Redis upgrade in production

---

# PHASE 2: OTP and Registration Module [~] MODIFIED

## Prompt 2.1: OTP Service and Controller [-] SKIPPED

**SKIPPED - Firebase handles all OTP functionality**

Firebase Client SDK handles:
- Sending OTP to phone numbers via SMS
- Rate limiting OTP requests
- OTP verification
- Attempt counting and lockouts
- OTP expiry

### Original Tasks (NOT IMPLEMENTED)

1. [-] Create `services/otp.service.js` with full OTP tracking
   - **ACTUALLY IMPLEMENTED**: Simplified version with only `verifyFirebaseIdToken()` and `getFirebaseUser()`

2. [-] Create `src/otp/otp.validator.js` - NOT NEEDED

3. [-] Create `src/otp/otp.controller.js` - NOT NEEDED

4. [-] Create `src/otp/otp.route.js` - NOT NEEDED

5. [-] Register routes in index.route.js under /api/otp - NOT NEEDED

### What Was Actually Implemented

**`services/otp.service.js`** - Simplified version:
```javascript
// Only these two functions:
- verifyFirebaseIdToken(idToken) // Verify Firebase ID token after client OTP verification
- getFirebaseUser(uid)           // Get Firebase user record by UID
```

---

## Prompt 2.2: User Registration [x] IMPLEMENTED

Implement consumer registration with phone + OTP.

### Tasks

1. [x] Create `src/auth/user.validator.js`
   - registerSchema - firebaseIdToken (required), termsAccepted (boolean, required true)
   - Nested schema for optional profile: firstName, lastName, email, marketingConsent
   - **NOTE**: Phone is NOT in request body - it's extracted from the verified Firebase ID token

2. [x] Create `src/auth/user.controller.js`
   - register
     - Validate firebaseIdToken using Firebase Admin
     - Extract phone from decoded token
     - Check if user exists with this phone
     - If exists and active, return error (already registered)
     - Create user record
     - Create session with tokens
     - Log audit: USER_REGISTERED
     - Return user data and tokens
   - Note: Terms must be accepted

3. [x] Create `src/auth/user.route.js`
   - POST /register - register

4. [x] Update index.route.js to include auth routes under /api/auth

### Implementation Details

**Flow**:
1. Client verifies phone with Firebase (OTP sent/verified by Firebase SDK)
2. Client receives Firebase ID token
3. Client sends ID token to our `/api/auth/register` endpoint
4. Server verifies token with Firebase Admin SDK
5. Server creates user record and session
6. Server returns our JWT tokens for API access

---

# PHASE 3: Authentication Module [x] COMPLETE

## Prompt 3.1: Consumer Login and Logout [x]

Implement consumer authentication flows.

### Tasks

1. [x] Update `src/auth/user.validator.js`
   - loginWithOTPSchema - firebaseIdToken (required)
   - loginWithPasswordSchema - phone/email (one required), password (required)
   - logoutSchema - refreshToken (optional, for specific session logout)
   - refreshTokenSchema - refreshToken (required)

2. [x] Update `src/auth/user.controller.js`
   - loginWithOTP
     - Verify firebaseIdToken
     - Find user by phone
     - If not found, return error (not registered)
     - If suspended, return error
     - Extract device info from req
     - Create new session
     - Log audit: USER_LOGIN
     - Return user and tokens
   - loginWithPassword
     - Find user by phone or email
     - Verify password hash
     - If invalid, return error (note: failed attempts tracking skipped for simplicity)
     - Create session
     - Return user and tokens
   - logout
     - If refreshToken provided, invalidate specific session
     - Else invalidate current session (from access token)
     - Log audit: USER_LOGOUT
   - refreshToken
     - Validate refresh token
     - Find session by refreshToken
     - If expired or inactive, return error
     - Generate new access token
     - Rotate refresh token
     - Update session lastActivityAt
     - Return new tokens

3. [x] Update `src/auth/user.route.js`
   - POST /login/otp - loginWithOTP
   - POST /login/password - loginWithPassword
   - POST /logout - logout (authenticated)
   - POST /refresh - refreshToken

---

## Prompt 3.2: Password Reset [x]

Implement password reset flow for consumers.

### Tasks

1. [x] Update `src/auth/user.validator.js`
   - requestPasswordResetSchema - phone (required)
   - resetPasswordSchema - firebaseIdToken (required), newPassword (required, min 8 chars)

2. [x] Update `src/auth/user.controller.js`
   - requestPasswordReset
     - Find user by phone
     - If not found, return generic success (prevent enumeration)
     - Client triggers OTP via Firebase (no server action needed)
     - Return success
   - resetPassword
     - Verify firebaseIdToken
     - Extract phone, find user
     - Hash new password
     - Update user passwordHash
     - Invalidate all existing sessions
     - Log audit: USER_PASSWORD_RESET
     - Return success

3. [x] Update `src/auth/user.route.js`
   - POST /password/request-reset - requestPasswordReset
   - POST /password/reset - resetPassword

---

## Prompt 3.3: Admin Authentication [x]

Implement admin login, logout, and password management.

### Tasks

1. [x] Create `src/auth/admin.validator.js`
   - loginSchema - email (required), password (required)
   - changePasswordSchema - currentPassword (required), newPassword (required)
   - forceChangePasswordSchema - newPassword (required)
   - requestPasswordResetSchema - email (required)
   - resetPasswordSchema - token (required), newPassword (required)

2. [x] Create `src/auth/admin.controller.js`
   - login
     - Find admin by email
     - Verify password
     - If invalid, return error
     - If suspended, return error
     - Create session (userType: admin)
     - Update lastLoginAt
     - Log audit: ADMIN_LOGIN
     - Return admin (without password), role, tokens, forcePasswordChange flag
   - logout
     - Invalidate session
     - Log audit: ADMIN_LOGOUT
   - changePassword
     - Verify current password
     - Hash new password
     - Update admin
     - If forcePasswordChange was true, set to false
     - Invalidate other sessions
     - Log audit: ADMIN_PASSWORD_CHANGED
   - requestPasswordReset
     - Find admin by email
     - Generate reset token (store in DB with expiry)
     - TODO: Send email with reset link (placeholder - logs token in dev)
     - Return success
   - resetPassword
     - Verify reset token
     - Hash new password
     - Update admin
     - Invalidate all sessions
     - Log audit: ADMIN_PASSWORD_RESET

3. [x] Create `src/auth/admin.route.js`
   - POST /login - login
   - POST /logout - logout (admin authenticated)
   - POST /change-password - changePassword (admin authenticated)
   - POST /password/request-reset - requestPasswordReset
   - POST /password/reset - resetPassword

4. [x] Update index.route.js to include /api/admin/auth

---

# PHASE 4: Session Management Module [x] COMPLETE

## Prompt 4.1: Consumer Session Management [x]

Implement consumer session features.

### Tasks

1. [x] Create `src/session/session.validator.js`
   - terminateSessionSchema - sessionId (required)

2. [x] Create `src/session/session.controller.js`
   - getActiveSessions
     - Find all active sessions for current user
     - Return array with device info, lastActivityAt, createdAt
     - Mark current session
   - terminateSession
     - Verify session belongs to current user
     - Set isActive to false
     - Log audit: SESSION_TERMINATED
   - terminateAllOtherSessions
     - Invalidate all sessions except current
     - Log audit: ALL_SESSIONS_TERMINATED
   - getCurrentSession
     - Return current session details

3. [x] Create `src/session/session.route.js`
   - GET / - getActiveSessions (authenticated)
   - GET /current - getCurrentSession (authenticated)
   - DELETE /:sessionId - terminateSession (authenticated)
   - DELETE /all/others - terminateAllOtherSessions (authenticated)

4. [x] Register routes in index.route.js under /api/sessions

---

## Prompt 4.2: Admin Session Management [x]

Implement admin session features.

### Tasks

1. [x] Update `src/session/session.validator.js`
   - adminTerminateSessionSchema - sessionId (required)

2. [x] Update `src/session/session.controller.js`
   - getAdminActiveSessions
     - Find all active admin sessions
     - Requires permission: sessions.view
   - forceLogoutAdmin
     - Find session by ID
     - Invalidate session
     - Log audit: ADMIN_FORCE_LOGOUT
     - Requires permission: sessions.manage
   - forceLogoutAllAdmins
     - Invalidate all admin sessions except super_admin making request
     - Log audit: EMERGENCY_LOGOUT_ALL_ADMINS
     - Requires permission: sessions.emergency
   - [-] SKIPPED: getSessionConfig / updateSessionConfig
     - **Reason**: No system config model exists. Session timeouts are controlled via JWT_ACCESS_EXPIRY and JWT_REFRESH_EXPIRY environment variables.

3. [x] Add admin routes to session.route.js (prefixed, admin authenticated)
   - GET /admin - getAdminActiveSessions
   - DELETE /admin/:sessionId - forceLogoutAdmin
   - DELETE /admin/all/emergency - forceLogoutAllAdmins

---

# PHASE 5: Profile and Address Management [x] COMPLETE

## Prompt 5.1: Consumer Profile Management [x]

Implement consumer profile features.

### Tasks

1. [x] Create `src/profile/profile.validator.js`
   - updateProfileSchema - firstName, lastName, languagePreference, currencyPreference, marketingConsent (all optional)
   - changeEmailSchema - newEmail (required, valid email)
   - changePhoneSchema - newPhone (required, valid format)
   - verifyPhoneSchema - firebaseIdToken (required)
   - uploadAvatarSchema - file validation via multer
   - deleteAccountSchema - confirmation (required, must be string "DELETE")

2. [x] Create `src/profile/profile.controller.js`
   - getProfile - return current user profile
   - updateProfile - update allowed fields, log audit
   - changeEmail
     - Validate new email not taken
     - Update email directly, set emailVerified=false
     - Log audit: EMAIL_CHANGED
     - **NOTE**: Email verification via OTP is skipped (nodemailer not implemented)
     - Future: Add email verification flow when nodemailer is ready
   - requestPhoneChange
     - Validate new phone not taken
     - Return success (client initiates Firebase OTP flow)
   - verifyPhoneChange
     - Verify firebaseIdToken
     - Extract new phone from token
     - Update phone, set phoneVerified true
     - Log audit: PHONE_CHANGED
   - uploadAvatar
     - Use cloudinary service (already exists)
     - Update user avatar URL
   - removeAvatar
     - Delete from cloudinary
     - Set avatar to null
   - requestAccountDeletion
     - Set deletionRequestedAt
     - Schedule actual deletion (soft delete for 30 days)
     - Log audit: ACCOUNT_DELETION_REQUESTED
   - cancelAccountDeletion
     - Clear deletionRequestedAt
     - Log audit: ACCOUNT_DELETION_CANCELLED

3. [x] Create `src/profile/profile.route.js`
   - GET / - getProfile (authenticated)
   - PATCH / - updateProfile (authenticated)
   - POST /email/change - changeEmail (authenticated)
   - POST /phone/change - requestPhoneChange (authenticated)
   - POST /phone/verify - verifyPhoneChange (authenticated)
   - POST /avatar - uploadAvatar (authenticated, multer)
   - DELETE /avatar - removeAvatar (authenticated)
   - POST /delete-request - requestAccountDeletion (authenticated)
   - POST /delete-cancel - cancelAccountDeletion (authenticated)

4. [x] Register routes under /api/profile

---

## Prompt 5.2: Admin Profile Management (Customer View) [x]

Implement admin features for managing customer profiles.

### Tasks

1. [x] Update `src/profile/profile.validator.js`
   - searchCustomersSchema - query (optional), email, phone, status, page, limit
   - customerIdParamSchema - customerId
   - updateCustomerStatusSchema - status (active/suspended), reason
   - addCustomerNoteSchema - note (required)

2. [x] Update `src/profile/profile.controller.js`
   - searchCustomers
     - Search by email, phone, name (partial match)
     - Paginate results
     - Requires permission: customers.view
   - getCustomerProfile
     - Get full profile by ID
     - Include order count, total spent (placeholder for cross-service call)
     - Requires permission: customers.view
   - suspendCustomer
     - Update status to suspended
     - Invalidate all sessions
     - Log audit: CUSTOMER_SUSPENDED
     - Requires permission: customers.manage
   - reactivateCustomer
     - Update status to active
     - Log audit: CUSTOMER_REACTIVATED
     - Requires permission: customers.manage
   - addCustomerNote
     - Add internal note (store in separate notes array or sub-collection)
     - Log audit: CUSTOMER_NOTE_ADDED
     - Requires permission: customers.manage
   - exportCustomerData
     - Generate JSON export of all customer data (GDPR)
     - Include profile, addresses, sessions, audit logs
     - Requires permission: customers.export

3. [x] Add admin routes to profile.route.js
   - GET /admin/customers - searchCustomers
   - GET /admin/customers/:customerId - getCustomerProfile
   - POST /admin/customers/:customerId/suspend - suspendCustomer
   - POST /admin/customers/:customerId/reactivate - reactivateCustomer
   - POST /admin/customers/:customerId/notes - addCustomerNote
   - GET /admin/customers/:customerId/export - exportCustomerData

---

## Prompt 5.3: Address Management [x]

Implement consumer and admin address features.

### Tasks

1. [x] Create `src/address/address.validator.js`
   - createAddressSchema - fullName, phone, addressLine1, addressLine2 (optional), city, state, pincode, country (optional), landmark (optional), label (optional), isDefaultShipping (optional), isDefaultBilling (optional)
   - updateAddressSchema - same as create, all optional
   - addressIdParamSchema - addressId

2. [x] Create `src/address/address.controller.js`
   - getAddresses - list all addresses for current user
   - getAddress - get single address by ID (verify ownership)
   - createAddress
     - Validate pincode (future: external API)
     - If isDefaultShipping, unset other defaults
     - If isDefaultBilling, unset other defaults
     - Create address
     - Log audit: ADDRESS_CREATED
   - updateAddress
     - Verify ownership
     - Handle default flags
     - Update address
     - Log audit: ADDRESS_UPDATED
   - deleteAddress
     - Verify ownership
     - Delete address
     - Log audit: ADDRESS_DELETED
   - setDefaultShipping
     - Unset other defaults
     - Set this as default shipping
   - setDefaultBilling
     - Unset other defaults
     - Set this as default billing
   - validatePincode
     - Call external pincode API (placeholder)
     - Return city, state auto-fill data

3. [x] Create `src/address/address.route.js`
   - GET / - getAddresses (authenticated)
   - GET /:addressId - getAddress (authenticated)
   - POST / - createAddress (authenticated)
   - PATCH /:addressId - updateAddress (authenticated)
   - DELETE /:addressId - deleteAddress (authenticated)
   - PATCH /:addressId/default-shipping - setDefaultShipping (authenticated)
   - PATCH /:addressId/default-billing - setDefaultBilling (authenticated)
   - POST /validate-pincode - validatePincode (authenticated)

4. [x] Admin address features (add to address.controller.js)
   - getCustomerAddresses - get all addresses for a customer
   - flagAddress - mark address as suspicious
   - verifyAddress - mark as verified
   - Requires permission: customers.addresses

5. [x] Add admin routes
   - GET /admin/customers/:customerId/addresses - getCustomerAddresses
   - PATCH /admin/addresses/:addressId/flag - flagAddress
   - PATCH /admin/addresses/:addressId/verify - verifyAddress

6. [x] Register routes under /api/addresses

---

# PHASE 6: Roles, Permissions, and Admin Management [x] COMPLETE

## Prompt 6.1: Roles and Permissions Module [x]

Implement RBAC role management.

### Tasks

1. [x] Create `src/roles/roles.validator.js`
   - createRoleSchema - name (required, unique), description (optional), permissions (array of strings)
   - updateRoleSchema - name (optional), description (optional), permissions (optional)
   - roleIdParamSchema - roleId
   - assignPermissionsSchema - permissions (array, required)

2. [x] Create `utils/permissions.js` (in constants.js)
   - **NOTE**: Permissions are defined in `utils/constants.js` as `PERMISSIONS` object
   - Group by module: customers.view, customers.manage, customers.export, orders.view, orders.manage, products.view, products.manage, roles.view, roles.manage, admins.view, admins.manage, settings.view, settings.manage, audit.view, sessions.view, sessions.manage, sessions.emergency

3. [x] Create `src/roles/roles.controller.js`
   - getAllRoles
     - Return all roles with permissions
     - Requires permission: roles.view
   - getRole
     - Get single role by ID
     - Requires permission: roles.view
   - createRole
     - Validate permissions are valid
     - Create role (isSystemRole: false)
     - Log audit: ROLE_CREATED
     - Requires permission: roles.manage
   - updateRole
     - Check not a system role (or only update description)
     - Update role
     - Log audit: ROLE_UPDATED
     - Requires permission: roles.manage
   - deleteRole
     - Check not a system role
     - Check no admins assigned to role
     - Delete role
     - Log audit: ROLE_DELETED
     - Requires permission: roles.manage
   - assignPermissions
     - Validate permissions
     - Replace role permissions
     - Log audit: ROLE_PERMISSIONS_UPDATED
     - Requires permission: roles.manage
   - removePermissions
     - Remove specific permissions from role
     - Log audit: ROLE_PERMISSIONS_UPDATED
     - Requires permission: roles.manage
   - getAdminsByRole
     - List all admins with this role
     - Requires permission: roles.view

4. [x] Create `src/roles/roles.route.js`
   - GET / - getAllRoles (admin authenticated)
   - GET /:roleId - getRole (admin authenticated)
   - POST / - createRole (admin authenticated)
   - PATCH /:roleId - updateRole (admin authenticated)
   - DELETE /:roleId - deleteRole (admin authenticated)
   - PUT /:roleId/permissions - assignPermissions (admin authenticated)
   - DELETE /:roleId/permissions - removePermissions (admin authenticated)
   - GET /:roleId/admins - getAdminsByRole (admin authenticated)

5. [x] Register routes under /api/admin/roles

---

## Prompt 6.2: Admin User Management [x]

Implement admin user CRUD and role assignment.

### Tasks

1. [x] Create `src/admin-users/admin-users.validator.js`
   - createAdminSchema - email (required), firstName (required), lastName (required), roleId (required), initialPassword (optional, will be auto-generated if not provided)
   - updateAdminSchema - firstName, lastName, roleId (all optional)
   - adminIdParamSchema - adminId (required, valid MongoDB ObjectId)
   - assignRoleSchema - roleId (required)
   - searchAdminsSchema - query, email, roleId, status, page, limit

2. [x] Create `src/admin-users/admin-users.controller.js`
   - createAdmin
     - Validate email unique
     - Generate initial password if not provided
     - Hash password
     - Create admin with forcePasswordChange: true
     - Log password to console in dev (email placeholder for production)
     - Log audit: ADMIN_CREATED
     - Requires permission: admins.manage
   - getAdmins
     - List all admins with role info
     - Paginate results
     - Requires permission: admins.view
   - getAdmin
     - Get single admin by ID
     - Requires permission: admins.view
   - updateAdmin
     - Update allowed fields
     - Log audit: ADMIN_UPDATED
     - Requires permission: admins.manage
   - assignRole
     - Update admin roleId
     - Log audit: ADMIN_ROLE_CHANGED
     - Requires permission: admins.manage
   - suspendAdmin
     - Update status to suspended
     - Invalidate all sessions
     - Log audit: ADMIN_SUSPENDED
     - Requires permission: admins.manage
   - reactivateAdmin
     - Update status to active
     - Log audit: ADMIN_REACTIVATED
     - Requires permission: admins.manage
   - [-] SKIPPED: bulkCreateAdmins
     - **Reason**: CSV parsing adds complexity. Create admins one by one for now.
     - **Future**: Add bulk import if needed

3. [x] Create `src/admin-users/admin-users.route.js`
   - GET / - getAdmins
   - GET /:adminId - getAdmin
   - POST / - createAdmin
   - PATCH /:adminId - updateAdmin
   - PATCH /:adminId/role - assignRole
   - POST /:adminId/suspend - suspendAdmin
   - POST /:adminId/reactivate - reactivateAdmin

4. [x] Register routes in index.route.js under /api/admin/users

---

# PHASE 7: Audit Logs and Final Integration [x] COMPLETE

## Prompt 7.1: Audit Logs Module [x]

Implement audit log viewing for admins.

### Tasks

1. [x] Create `src/audit/audit.validator.js`
   - queryAuditLogsSchema - actorId, actorType, action, entityType, entityId, startDate, endDate, page, limit
   - entityParamsSchema - entityType, entityId
   - actorParamsSchema - actorType, actorId
   - paginationSchema - page, limit

2. [x] Create `src/audit/audit.controller.js`
   - getAuditLogs
     - Filter by query params
     - Paginate results
     - Sort by createdAt desc
     - Requires permission: audit.view
   - getAuditLogsByEntity
     - Get all logs for specific entity (user, admin, order, etc.)
     - Requires permission: audit.view
   - getAuditLogsByActor
     - Get all logs by specific actor
     - Requires permission: audit.view

3. [x] Create `src/audit/audit.route.js`
   - GET / - getAuditLogs (admin authenticated)
   - GET /entity/:entityType/:entityId - getAuditLogsByEntity (admin authenticated)
   - GET /actor/:actorType/:actorId - getAuditLogsByActor (admin authenticated)

4. [x] Register routes under /api/admin/audit

---

## Prompt 7.2: Database Seeding and Initial Setup [x] COMPLETE

Create database seeding scripts.

### Tasks

1. [x] Create `scripts/seed.js`
   - Seed default roles with permissions:
     - super_admin: all permissions
     - catalog_manager: products.view, products.manage
     - order_manager: orders.view, orders.manage, customers.view
     - marketing_manager: products.view, customers.view
     - support_agent: customers.view, orders.view
     - finance: orders.view, customers.view
   - Create initial super_admin user if not exists
   - Log seeding results

2. [x] Create `scripts/seedRoles.js`
   - Standalone script to seed only roles
   - Idempotent (check if exists before creating)
   - **ADDED**: Updates system role permissions if changed

3. [x] Update package.json scripts
   - Add "seed": "node scripts/seed.js"
   - Add "seed:roles": "node scripts/seedRoles.js"

---

## Prompt 7.3: Route Integration and Health Checks [x] COMPLETE

Finalize route integration and add health checks.

### Tasks

1. [x] Update `index.route.js`
   - Import and register all route modules:
     - [x] /api/auth (user auth)
     - [x] /api/admin/auth (admin auth) - **DONE in Phase 3**
     - [-] /api/otp (SKIPPED - Firebase handles)
     - [x] /api/sessions - **DONE in Phase 4**
     - [x] /api/profile - **DONE in Phase 5**
     - [x] /api/addresses - **DONE in Phase 5**
     - [x] /api/admin/users (admin user management) - **DONE in Phase 6**
     - [x] /api/admin/roles - **DONE in Phase 6**
     - [x] /api/admin/audit - **DONE in Phase 7**

2. [x] Update health check endpoint
   - Add database connectivity check (MongoDB readyState)
   - Add Firebase connectivity check (Firebase Admin app status)
   - Return detailed status with services breakdown

3. [x] Create `middlewares/errorHandler.middleware.js`
   - Global error handler
   - Log errors with console.log
   - Return standardized error response

4. [x] Update `config/express.config.js`
   - Add error handler middleware
   - Add request logging middleware

---

## Prompt 7.4: Environment Variables and Documentation [x] COMPLETE

Document required environment variables.

### Tasks

1. [x] Create `.env.example`
   - PORT
   - NODE_ENV
   - MONGODB_URL
   - JWT_ACCESS_SECRET
   - JWT_REFRESH_SECRET
   - JWT_ACCESS_EXPIRY
   - JWT_REFRESH_EXPIRY
   - JWT_REMEMBER_ME_EXPIRY
   - FIREBASE_* (existing)
   - CLOUDINARY_* (existing)
   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (future)
   - INITIAL_ADMIN_EMAIL
   - INITIAL_ADMIN_PASSWORD

2. [x] Update constants and config files to use environment variables

---

# API Route Summary

## Consumer Routes

```
[x] POST   /api/auth/register
[x] POST   /api/auth/login/otp
[x] POST   /api/auth/login/password
[x] POST   /api/auth/logout
[x] POST   /api/auth/refresh
[x] POST   /api/auth/password/request-reset
[x] POST   /api/auth/password/reset

[-] POST   /api/otp/request          (SKIPPED - Firebase handles)
[-] POST   /api/otp/verify           (SKIPPED - Firebase handles)
[-] POST   /api/otp/resend           (SKIPPED - Firebase handles)

[x] GET    /api/sessions
[x] GET    /api/sessions/current
[x] DELETE /api/sessions/:sessionId
[x] DELETE /api/sessions/all/others

[x] GET    /api/profile
[x] PATCH  /api/profile
[x] POST   /api/profile/email/change
[x] POST   /api/profile/phone/change
[x] POST   /api/profile/phone/verify
[x] POST   /api/profile/avatar
[x] DELETE /api/profile/avatar
[x] POST   /api/profile/delete-request
[x] POST   /api/profile/delete-cancel

[x] GET    /api/addresses
[x] GET    /api/addresses/:addressId
[x] POST   /api/addresses
[x] PATCH  /api/addresses/:addressId
[x] DELETE /api/addresses/:addressId
[x] PATCH  /api/addresses/:addressId/default-shipping
[x] PATCH  /api/addresses/:addressId/default-billing
[x] POST   /api/addresses/validate-pincode
```

## Admin Routes

```
[x] POST   /api/admin/auth/login
[x] POST   /api/admin/auth/logout
[x] POST   /api/admin/auth/change-password
[x] POST   /api/admin/auth/password/request-reset
[x] POST   /api/admin/auth/password/reset

[x] GET    /api/admin/users
[x] GET    /api/admin/users/:adminId
[x] POST   /api/admin/users
[x] PATCH  /api/admin/users/:adminId
[x] PATCH  /api/admin/users/:adminId/role
[x] POST   /api/admin/users/:adminId/suspend
[x] POST   /api/admin/users/:adminId/reactivate

[x] GET    /api/admin/roles
[x] GET    /api/admin/roles/:roleId
[x] POST   /api/admin/roles
[x] PATCH  /api/admin/roles/:roleId
[x] DELETE /api/admin/roles/:roleId
[x] PUT    /api/admin/roles/:roleId/permissions
[x] DELETE /api/admin/roles/:roleId/permissions
[x] GET    /api/admin/roles/:roleId/admins

[x] GET    /api/sessions/admin
[x] DELETE /api/sessions/admin/:sessionId
[x] DELETE /api/sessions/admin/all/emergency

[x] GET    /api/profile/admin/customers
[x] GET    /api/profile/admin/customers/:customerId
[x] POST   /api/profile/admin/customers/:customerId/suspend
[x] POST   /api/profile/admin/customers/:customerId/reactivate
[x] POST   /api/profile/admin/customers/:customerId/notes
[x] GET    /api/profile/admin/customers/:customerId/export

[x] GET    /api/addresses/admin/customers/:customerId/addresses
[x] PATCH  /api/addresses/admin/addresses/:addressId/flag
[x] PATCH  /api/addresses/admin/addresses/:addressId/verify

[x] GET    /api/admin/audit
[x] GET    /api/admin/audit/entity/:entityType/:entityId
[x] GET    /api/admin/audit/actor/:actorType/:actorId
```

---

# Implementation Notes

## Key Decisions Made

### OTP Handling (Phase 2)
- **Decision**: Skip all OTP endpoints and OTP tracking in database
- **Reason**: Firebase Client SDK handles OTP sending, verification, rate limiting, attempt counting, and expiry
- **What we do**: Only verify Firebase ID token on server after client completes OTP flow
- **Impact**: Simplified architecture, fewer endpoints, no OTP-related DB operations

### Validation Middleware (Phase 1)
- **Decision**: Use inline `validate(schema)` in validator files instead of separate middleware
- **Reason**: Keeps validation logic co-located with schemas, simpler imports
- **Location**: Each module's validator.js exports both schemas and validate middleware

### Consumer Password Login (Phase 3)
- **Decision**: Implement optional password login for consumers
- **Reason**: Users may want to set a password for convenience after initial OTP registration
- **Flow**: Users can login with OTP (Firebase) or password (if set)
- **Note**: Failed attempts tracking skipped for simplicity (can be added later)

### Admin Password Reset (Phase 3)
- **Decision**: Use JWT-based reset tokens stored in DB (placeholder for email)
- **Reason**: Email service (nodemailer) is future implementation
- **Current behavior**: Reset token is logged to console in development
- **Production TODO**: Send email with reset link using nodemailer

### Session Config (Phase 4)
- **Decision**: Skip getSessionConfig / updateSessionConfig endpoints
- **Reason**: No system config model exists. Session timeouts are controlled via JWT_ACCESS_EXPIRY and JWT_REFRESH_EXPIRY environment variables.

### Email Change Flow (Phase 5)
- **Decision**: Simplify email change - update email directly and set emailVerified=false
- **Reason**: Email OTP verification requires nodemailer which is not implemented yet
- **Impact**: Removed /api/profile/email/verify route. Email is unverified until future verification flow is added.

### Bulk Admin Creation (Phase 6)
- **Decision**: Skip bulkCreateAdmins endpoint (CSV upload)
- **Reason**: CSV parsing adds complexity. Use individual createAdmin calls for now.
- **Future**: Add bulk import if the need arises

### Admin User Management Routes (Phase 6)
- **Decision**: Mount admin user management at /api/admin/users (not /api/admin/auth/users)
- **Reason**: Cleaner URL structure - auth routes handle authentication, user routes handle CRUD

## Future Compatibility

- Email OTP/Password login: Add email-based OTP service using nodemailer when needed
- One-tap login: Add Google/Apple OAuth providers as separate auth strategies
- Multi-factor authentication: Add TOTP support for admin accounts

## ABAC Implementation

For attribute-based access control beyond RBAC:
- Add resource ownership checks in controllers (user can only access own data)
- Add attribute conditions in middleware (e.g., admin can only manage lower-tier roles)
- Store additional access conditions in role permissions as objects instead of strings when needed

## Security Considerations

- Hash all passwords with bcryptjs (cost factor 12)
- [-] Hash OTPs before storing (SKIPPED - Firebase handles OTP)
- Implement rate limiting on all auth endpoints
- Use HTTP-only secure cookies for refresh tokens in production
- Validate all inputs with Joi before processing
- Sanitize outputs to prevent data leakage
- Log security-relevant events to audit log

## Cross-Service Communication

This service will expose internal endpoints for:
- User validation (for other services to verify tokens)
- User data retrieval (for order service, etc.)
- Permission checking (for API gateway)

These internal endpoints should be protected by service-to-service authentication (API keys or mTLS) and not exposed publicly.

---

# Files Created Summary

## Phase 1 Files
- `models/user.model.js`
- `models/address.model.js`
- `models/session.model.js`
- `models/otp.model.js` (created but not used)
- `models/admin.model.js`
- `models/role.model.js`
- `models/audit.model.js`
- `utils/constants.js`
- `utils/helpers.js`
- `services/token.service.js`
- `services/audit.service.js`
- `middlewares/auth.middleware.js`
- `middlewares/admin.middleware.js`
- `middlewares/rbac.middleware.js`
- `middlewares/rateLimit.middleware.js`
- `middlewares/errorHandler.middleware.js`
- `scripts/seed.js`
- `scripts/seedRoles.js`
- `.env.example`

## Phase 2 Files
- `services/otp.service.js` (simplified - Firebase token verification only)
- `src/auth/user.validator.js`
- `src/auth/user.controller.js`
- `src/auth/user.route.js`
- Updated `index.route.js`

## Phase 3 Files
- Updated `src/auth/user.validator.js` (added login/logout/refresh/password-reset schemas)
- Updated `src/auth/user.controller.js` (added loginWithOTP, loginWithPassword, logout, refreshToken, requestPasswordReset, resetPassword)
- Updated `src/auth/user.route.js` (added consumer auth routes)
- `src/auth/admin.validator.js` (login, changePassword, password reset schemas)
- `src/auth/admin.controller.js` (login, logout, changePassword, requestPasswordReset, resetPassword)
- `src/auth/admin.route.js` (admin auth routes)
- Updated `index.route.js` (added /api/admin/auth)

## Phase 4 Files
- `src/session/session.validator.js` (terminateSession, adminTerminateSession schemas)
- `src/session/session.controller.js` (getActiveSessions, getCurrentSession, terminateSession, terminateAllOtherSessions, getAdminActiveSessions, forceLogoutAdmin, forceLogoutAllAdmins)
- `src/session/session.route.js` (consumer and admin session routes)
- Updated `index.route.js` (added /api/sessions)

## Phase 5 Files
- `src/profile/profile.validator.js` (updateProfile, changeEmail, changePhone, verifyPhone, deleteAccount, searchCustomers, customerIdParam, updateCustomerStatus, addCustomerNote schemas)
- `src/profile/profile.controller.js` (getProfile, updateProfile, changeEmail, requestPhoneChange, verifyPhoneChange, uploadAvatar, removeAvatar, requestAccountDeletion, cancelAccountDeletion, searchCustomers, getCustomerProfile, suspendCustomer, reactivateCustomer, addCustomerNote, exportCustomerData)
- `src/profile/profile.route.js` (consumer profile and admin customer management routes)
- `src/address/address.validator.js` (createAddress, updateAddress, addressIdParam, validatePincode, customerAddressParam, flagAddress schemas)
- `src/address/address.controller.js` (getAddresses, getAddress, createAddress, updateAddress, deleteAddress, setDefaultShipping, setDefaultBilling, validatePincode, getCustomerAddresses, flagAddress, verifyAddress)
- `src/address/address.route.js` (consumer address and admin address management routes)
- Updated `index.route.js` (added /api/profile and /api/addresses)

## Phase 6 Files
- `src/roles/roles.validator.js` (createRole, updateRole, roleIdParam, assignPermissions, removePermissions schemas)
- `src/roles/roles.controller.js` (getAllRoles, getRole, createRole, updateRole, deleteRole, assignPermissions, removePermissions, getAdminsByRole)
- `src/roles/roles.route.js` (role management routes)
- `src/admin-users/admin-users.validator.js` (createAdmin, updateAdmin, adminIdParam, assignRole, searchAdmins schemas)
- `src/admin-users/admin-users.controller.js` (createAdmin, getAdmins, getAdmin, updateAdmin, assignRole, suspendAdmin, reactivateAdmin)
- `src/admin-users/admin-users.route.js` (admin user management routes)
- Updated `index.route.js` (added /api/admin/roles and /api/admin/users)

## Phase 7 Files
- `src/audit/audit.validator.js` (queryAuditLogs, entityParams, actorParams, pagination schemas)
- `src/audit/audit.controller.js` (getAuditLogs, getAuditLogsByEntity, getAuditLogsByActor)
- `src/audit/audit.route.js` (audit log routes)
- Updated `index.route.js` (added /api/admin/audit, enhanced health check with DB and Firebase status)
