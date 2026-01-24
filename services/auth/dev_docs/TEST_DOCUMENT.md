# Auth Microservice - Test Checklist

Base URL: `http://localhost:3000/api`

---

## 1. Health Check

- [ ] GET /health - Returns 200 with status "ok", database "connected", firebase "connected"

---

## 2. Consumer Authentication

- [ ] POST /auth/register - With firebaseIdToken + termsAccepted:true returns 201 with user and tokens
- [ ] POST /auth/login/otp - With valid firebaseIdToken returns 200 with user and tokens
- [ ] POST /auth/login/password - With phone/email + password returns 200 with tokens
- [ ] POST /auth/logout - With Bearer token returns 200, session invalidated
- [ ] POST /auth/refresh - With valid refreshToken returns 200 with new token pair
- [ ] POST /auth/password/request-reset - With phone returns 200
- [ ] POST /auth/password/reset - With firebaseIdToken + newPassword returns 200

---

## 3. Admin Authentication

- [ ] POST /admin/auth/login - With email + password returns 200 with admin and tokens
- [ ] POST /admin/auth/logout - With Bearer token returns 200
- [ ] POST /admin/auth/change-password - With currentPassword + newPassword returns 200
- [ ] POST /admin/auth/password/request-reset - With email returns 200
- [ ] POST /admin/auth/password/reset - With token + newPassword returns 200

---

## 4. Session Management

### Consumer Sessions
- [ ] GET /sessions - Returns 200 with array of active sessions
- [ ] GET /sessions/current - Returns 200 with current session details
- [ ] DELETE /sessions/:sessionId - Returns 200, target session terminated
- [ ] DELETE /sessions/all/others - Returns 200, all other sessions terminated

### Admin Sessions (requires sessions.* permissions)
- [ ] GET /sessions/admin - Returns 200 with all admin sessions
- [ ] DELETE /sessions/admin/:sessionId - Returns 200, admin session terminated
- [ ] DELETE /sessions/admin/all/emergency - Returns 200, all admin sessions terminated

---

## 5. Consumer Profile

- [ ] GET /profile - Returns 200 with user profile
- [ ] PATCH /profile - With profile fields returns 200 with updated profile
- [ ] POST /profile/email/change - With new email returns 200
- [ ] POST /profile/phone/change - With new phone returns 200, pending change created
- [ ] POST /profile/phone/verify - With firebaseIdToken returns 200, phone updated
- [ ] POST /profile/avatar - With image file returns 200 with avatar URL
- [ ] DELETE /profile/avatar - Returns 200, avatar removed
- [ ] POST /profile/delete-request - Returns 200, account marked for deletion
- [ ] POST /profile/delete-cancel - Returns 200, deletion cancelled

---

## 6. Address Management

### Consumer Addresses
- [ ] GET /addresses - Returns 200 with address array
- [ ] POST /addresses - With address fields returns 201 with new address
- [ ] GET /addresses/:addressId - Returns 200 with address
- [ ] PATCH /addresses/:addressId - Returns 200 with updated address
- [ ] DELETE /addresses/:addressId - Returns 200, address deleted
- [ ] PATCH /addresses/:addressId/default-shipping - Returns 200, set as default
- [ ] PATCH /addresses/:addressId/default-billing - Returns 200, set as default
- [ ] POST /addresses/validate-pincode - With pincode returns 200 with city/state info

### Admin Address Management (requires customers.addresses)
- [ ] GET /addresses/admin/customers/:customerId/addresses - Returns 200 with customer addresses
- [ ] PATCH /addresses/admin/addresses/:addressId/flag - With reason returns 200
- [ ] PATCH /addresses/admin/addresses/:addressId/verify - Returns 200, address verified

---

## 7. Admin Customer Management

- [ ] GET /profile/admin/customers - Returns 200 with paginated customer list (customers.view)
- [ ] GET /profile/admin/customers/:customerId - Returns 200 with customer profile (customers.view)
- [ ] POST /profile/admin/customers/:customerId/suspend - With reason returns 200 (customers.manage)
- [ ] POST /profile/admin/customers/:customerId/reactivate - Returns 200 (customers.manage)
- [ ] POST /profile/admin/customers/:customerId/notes - With note returns 201 (customers.manage)
- [ ] GET /profile/admin/customers/:customerId/export - Returns 200 with all data (customers.export)

---

## 8. Role Management

- [ ] GET /admin/roles - Returns 200 with roles array (roles.view)
- [ ] POST /admin/roles - With name + permissions returns 201 (roles.manage)
- [ ] GET /admin/roles/:roleId - Returns 200 with role details (roles.view)
- [ ] PATCH /admin/roles/:roleId - Returns 200 with updated role (roles.manage)
- [ ] DELETE /admin/roles/:roleId - Returns 200, role deleted (roles.manage)
- [ ] PUT /admin/roles/:roleId/permissions - With permissions array returns 200 (roles.manage)
- [ ] DELETE /admin/roles/:roleId/permissions - With permissions array returns 200 (roles.manage)
- [ ] GET /admin/roles/:roleId/admins - Returns 200 with admins list (roles.view)

---

## 9. Admin User Management

- [ ] GET /admin/users - Returns 200 with paginated admin list (admins.view)
- [ ] POST /admin/users - With email + name + roleId returns 201 (admins.manage)
- [ ] GET /admin/users/:adminId - Returns 200 with admin details (admins.view)
- [ ] PATCH /admin/users/:adminId - Returns 200 with updated admin (admins.manage)
- [ ] PATCH /admin/users/:adminId/role - With roleId returns 200 (admins.manage)
- [ ] POST /admin/users/:adminId/suspend - Returns 200, sessions terminated (admins.manage)
- [ ] POST /admin/users/:adminId/reactivate - Returns 200 (admins.manage)

---

## 10. Audit Logs

- [ ] GET /admin/audit - Returns 200 with paginated logs (audit.view)
- [ ] GET /admin/audit?action=USER_REGISTERED - Returns 200 filtered by action
- [ ] GET /admin/audit?startDate=X&endDate=Y - Returns 200 filtered by date range
- [ ] GET /admin/audit/entity/:entityType/:entityId - Returns 200 with entity logs (audit.view)
- [ ] GET /admin/audit/actor/:actorType/:actorId - Returns 200 with actor logs (audit.view)

---

## 11. End-to-End Flows

### Consumer Registration Flow
- [ ] Firebase OTP -> Register -> Get Profile -> Logout -> Login OTP -> Success

### Password Setup Flow
- [ ] Register -> Request Reset -> Firebase OTP -> Reset Password -> Login with Password

### Multi-Session Flow
- [ ] Login 3 devices -> List sessions (3) -> Terminate one -> Terminate all others -> Only current active

### Profile + Address Flow
- [ ] Login -> Update profile -> Add email -> Create 2 addresses -> Set defaults -> Delete one

### Admin Management Flow
- [ ] Super admin login -> Create role -> Create admin -> Assign role -> Suspend -> Reactivate

### Customer Management Flow
- [ ] Admin login -> List customers -> View details -> Add note -> Suspend -> Reactivate

### Audit Verification Flow
- [ ] Perform actions -> Query audit logs -> Verify all actions logged correctly
