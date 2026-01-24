# @shared/auth-middleware

Shared authentication middleware for all Cleanse Ayurveda microservices.

## Features

- JWT token validation
- User authentication
- Admin authentication
- Optional authentication (for public/private routes)
- Role-based access control (RBAC)
- Service-to-service authentication

## Installation

This package is part of the monorepo workspace. Add it to your service's package.json:

```json
{
  "dependencies": {
    "@shared/auth-middleware": "workspace:*"
  }
}
```

## Usage

### Basic User Authentication

Protect routes that require user authentication:

```javascript
import { authenticateUser } from "@shared/auth-middleware";

router.get("/profile", authenticateUser, profileController.getProfile);
```

### Admin Authentication

Protect routes that require admin access:

```javascript
import { authenticateAdmin } from "@shared/auth-middleware";

router.get("/admin/users", authenticateAdmin, adminController.listUsers);
```

### Optional Authentication

For routes that work with or without authentication:

```javascript
import { optionalAuth } from "@shared/auth-middleware";

router.get("/products", optionalAuth, productController.listProducts);
```

### Role-Based Access Control

Check for specific permissions:

```javascript
import { authenticateAdmin, requirePermission } from "@shared/auth-middleware";

router.post(
  "/admin/products",
  authenticateAdmin,
  requirePermission("products.create"),
  productController.create
);

// Multiple permissions (user needs at least one)
router.delete(
  "/admin/products/:id",
  authenticateAdmin,
  requirePermission(["products.delete", "products.manage"]),
  productController.delete
);
```

### Service-to-Service Authentication

Protect internal service endpoints:

```javascript
import { authenticateService } from "@shared/auth-middleware";

router.post("/internal/inventory/reserve", authenticateService, inventoryController.reserve);
```

## Request Object Properties

After successful authentication, these properties are available on the request object:

- `req.userId` - User ID from JWT token
- `req.userType` - User type (consumer/admin)
- `req.accessToken` - The JWT token itself
- `req.user` - User object with userId and userType
- `req.adminId` - Admin ID (only for admin authentication)
- `req.serviceId` - Service ID (only for service authentication)
- `req.isServiceRequest` - Boolean indicating service-to-service request

## Environment Variables

Required environment variables:

- `JWT_ACCESS_SECRET` - Secret for verifying JWT access tokens
- `SERVICE_API_KEY_<SERVICE_NAME>` - API keys for service-to-service auth (e.g., SERVICE_API_KEY_CATALOG)

## Token Format

The middleware expects JWT tokens in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Service Authentication

Services must include these headers for service-to-service calls:

```
X-API-Key: <service_api_key>
X-Service-ID: <service_name>
```

## Notes

- This middleware only validates JWT tokens and does not query the database
- Services should load the full user object from database if needed
- All authentication failures are logged for security monitoring
- Tokens must be signed with JWT_ACCESS_SECRET to be valid
