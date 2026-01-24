# Order & Payment Service Implementation Plan Review

**Date:** 2026-01-17
**Reviewer:** Convention Compliance Analysis
**Reference Services:** Auth Service, Catalog Service

## Executive Summary

This document reviews the Order & Payment Service implementation plan against established conventions from Auth and Catalog services. Overall, the plan is well-structured but requires adjustments to align with proven patterns.

**Compliance Score: 85/100**

**Critical Adjustments Required:** 5
**Minor Adjustments Required:** 8
**Recommendations:** 12

---

## 1. Directory Structure Compliance

### Current Plan Structure

The plan proposes:
```
services/order/
├── config/
│   └── express.config.js
├── src/
│   ├── cart/
│   ├── checkout/
│   ├── orders/
│   ├── payments/
│   ├── refunds/
│   ├── returns/
│   └── invoices/
├── models/
│   ├── cart.model.js
│   ├── cartItem.model.js
│   ├── checkoutSession.model.js
│   ├── order.model.js
│   ├── orderItem.model.js
│   ├── orderStatusHistory.model.js
│   ├── payment.model.js
│   ├── refund.model.js
│   ├── return.model.js
│   └── invoice.model.js
├── services/
├── middlewares/
├── utils/
├── scripts/
├── index.js
└── index.route.js
```

### Convention Compliance

**Status: COMPLIANT WITH MINOR ADJUSTMENTS**

**Matches Convention:**
- config/ directory for express configuration
- src/ for feature modules
- models/ for schemas
- services/, middlewares/, utils/, scripts/ directories
- index.js and index.route.js at root

**Required Adjustments:**

1. **Add models/index.js for centralized exports**
   - Auth service pattern: Export all models from single file
   - Current plan: No mention of models/index.js
   - Action: Create models/index.js with:
     ```javascript
     export { default as Cart } from "./cart.model.js";
     export { default as CartItem } from "./cartItem.model.js";
     export { default as CheckoutSession } from "./checkoutSession.model.js";
     export { default as Order } from "./order.model.js";
     export { default as OrderItem } from "./orderItem.model.js";
     export { default as OrderStatusHistory } from "./orderStatusHistory.model.js";
     export { default as Payment } from "./payment.model.js";
     export { default as Refund } from "./refund.model.js";
     export { default as Return } from "./return.model.js";
     export { default as Invoice } from "./invoice.model.js";
     ```

2. **Add utils/constants.js**
   - Both services have constants file for enums and status values
   - Current plan: Constants mentioned but not as separate file
   - Action: Create utils/constants.js with:
     - CART_STATUS (active, abandoned, converted)
     - CHECKOUT_STATUS (initiated, address_entered, payment_pending, completed, failed)
     - ORDER_STATUS (pending, confirmed, processing, shipped, delivered, cancelled, returned)
     - PAYMENT_STATUS (pending, authorized, captured, failed, refunded)
     - PAYMENT_METHOD (upi, card, netbanking, wallet, cod)
     - REFUND_STATUS (pending, processing, completed, failed)
     - REFUND_TYPE (full, partial)
     - RETURN_STATUS (requested, approved, rejected, received, completed)
     - INVOICE_TYPE (sale, credit_note)
     - HTTP_STATUS imported from @shared/utils

3. **Add utils/helpers.js**
   - Both services have helper functions
   - Current plan: No mention of helpers file
   - Action: Create utils/helpers.js with:
     - generateOrderNumber() - ORD-YYYY-NNNNNN format
     - generateRefundNumber() - REF-YYYY-NNNNNN format
     - generateReturnNumber() - RET-YYYY-NNNNNN format
     - generateInvoiceNumber() - INV-YYYY-NNNNNN format
     - calculateCartTotals() - Subtotal, discount, tax, grand total
     - isValidObjectId() - MongoDB ObjectId validation
     - sanitizeOrderData() - Remove sensitive payment data from logs

---

## 2. File Naming Conventions

### Controller Files

**Status: COMPLIANT**

Plan uses: `cart.controller.js`, `orders.controller.js`, etc.
Convention: `[feature].controller.js`
Match: Yes

### Route Files

**Status: COMPLIANT**

Plan uses: `cart.route.js`, `orders.route.js`, etc.
Convention: `[feature].route.js`
Match: Yes

### Validation Files

**Status: COMPLIANT**

Plan uses: `.validation.js` suffix
Convention: Catalog uses `.validation.js`, Auth uses `.validator.js`
Match: Yes (follows newer Catalog pattern)

### Model Files

**Status: COMPLIANT WITH RECOMMENDATION**

Plan uses: `cart.model.js`, `order.model.js` (lowercase with .model.js suffix)
Convention: Auth uses lowercase `.model.js`, Catalog uses PascalCase without suffix
Match: Yes (follows Auth pattern)

**Recommendation:** Consider consistency across all services. Current choice is acceptable but document the decision.

### Service Files

**Status: COMPLIANT**

Plan uses: `razorpay.service.js`, `pdf-generator.service.js`
Convention: `[service].service.js`
Match: Yes

---

## 3. Route Structure and Patterns

### Current Plan Pattern

The plan suggests individual route files like:
```
services/order/src/cart/cart.route.js
```

But doesn't specify the export pattern clearly.

### Convention Analysis

**Auth Service Pattern:**
- Single router export
- Mounted in index.route.js: `router.use("/path", moduleRoutes);`

**Catalog Service Pattern:**
- Dual router export: `export default { consumer, admin };`
- Separate consumer and admin routes
- Mounted separately in index.route.js:
  - `router.use("/brands", brandRoutes.consumer);`
  - `router.use("/admin/brands", brandRoutes.admin);`

### Required Adjustment

**Status: CRITICAL ADJUSTMENT REQUIRED**

**Issue:** Plan doesn't follow the Catalog dual-export pattern for consumer/admin separation.

**Action:** Update all route files to follow Catalog pattern:

```javascript
// services/order/src/cart/cart.route.js
import { Router } from "express";
import * as cartController from "./cart.controller.js";
import { validate } from "@shared/middlewares";
import * as cartValidation from "./cart.validation.js";

const consumerRouter = Router();
const adminRouter = Router();

// Consumer routes
consumerRouter.get("/", cartController.getCart);
consumerRouter.post("/items", validate(cartValidation.addItemSchema), cartController.addItem);
consumerRouter.put("/items/:itemId", validate(cartValidation.updateItemSchema), cartController.updateItem);
consumerRouter.delete("/items/:itemId", cartController.removeItem);

// Admin routes
adminRouter.get("/abandoned", cartController.getAbandonedCarts);
adminRouter.get("/:cartId", cartController.getCartDetails);
adminRouter.get("/analytics/abandonment", cartController.getAbandonmentAnalytics);

export default { consumer: consumerRouter, admin: adminRouter };
```

**Update index.route.js:**
```javascript
import { Router } from "express";
import { sendResponse } from "@shared/utils";
import cartRoutes from "./src/cart/cart.route.js";
import checkoutRoutes from "./src/checkout/checkout.route.js";
import orderRoutes from "./src/orders/orders.route.js";
import paymentRoutes from "./src/payments/payments.route.js";
import refundRoutes from "./src/refunds/refunds.route.js";
import returnRoutes from "./src/returns/returns.route.js";
import invoiceRoutes from "./src/invoices/invoices.route.js";
import webhookRoutes from "./src/payments/webhooks.route.js";

const router = Router();

// Health check
router.get("/health", (req, res) => {
  sendResponse(res, 200, "Server is running", { status: "ok" }, null);
});

// Consumer routes
router.use("/cart", cartRoutes.consumer);
router.use("/checkout", checkoutRoutes.consumer);
router.use("/orders", orderRoutes.consumer);
router.use("/payments", paymentRoutes.consumer);
router.use("/refunds", refundRoutes.consumer);
router.use("/returns", returnRoutes.consumer);
router.use("/invoices", invoiceRoutes.consumer);

// Admin routes
router.use("/admin/carts", cartRoutes.admin);
router.use("/admin/checkouts", checkoutRoutes.admin);
router.use("/admin/orders", orderRoutes.admin);
router.use("/admin/payments", paymentRoutes.admin);
router.use("/admin/refunds", refundRoutes.admin);
router.use("/admin/returns", returnRoutes.admin);
router.use("/admin/invoices", invoiceRoutes.admin);

// Webhooks (separate, no consumer/admin split)
router.use("/webhooks", webhookRoutes);

export default router;
```

---

## 4. Controller Structure and Patterns

### Current Plan Pattern

Plan mentions controllers with features but doesn't detail the exact structure.

### Convention Pattern

Both services use:
- Named exports for each controller function
- Try-catch blocks in all async functions
- Console logging with `console.log("> Action description")`
- sendResponse utility for all responses
- Extraction of user info from req.user or req.admin
- Business logic delegated to services
- Proper HTTP status codes from constants

### Required Adjustments

**Status: MINOR ADJUSTMENT REQUIRED**

**Issue 1: Logging Format**
- Convention: `console.log("> Action description")`
- Plan: Mentions logging but doesn't specify exact format
- Action: All logs must start with "> " prefix

**Issue 2: Controller Organization**
- Convention: Both consumer and admin operations in same controller file
- Plan: Not explicitly stated
- Action: Clarify that cart.controller.js contains both consumer and admin functions

**Issue 3: Import Pattern**
- Convention: Import models from centralized models/index.js
- Plan: Direct imports from individual model files
- Action: Use `import { Cart, CartItem } from "../../models/index.js";`

**Example Corrected Controller:**

```javascript
import { sendResponse, HTTP_STATUS } from "@shared/utils";
import { Cart, CartItem } from "../../models/index.js";
import { CART_STATUS } from "../../utils/constants.js";
import { calculateCartTotals } from "../../utils/helpers.js";

export const getCart = async (req, res) => {
  console.log("> Fetching cart for user");
  try {
    const userId = req.user.id;

    let cart = await Cart.findOne({
      userId,
      status: CART_STATUS.ACTIVE
    }).populate("items").lean();

    if (!cart) {
      cart = await Cart.create({
        userId,
        status: CART_STATUS.ACTIVE
      });
    }

    return sendResponse(res, HTTP_STATUS.OK, "Cart fetched successfully", cart, null);
  } catch (error) {
    console.log("> Error fetching cart:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch cart",
      null,
      error.message
    );
  }
};
```

---

## 5. Validation Structure

### Current Plan Pattern

Plan mentions Joi validation but doesn't detail exact structure.

### Convention Pattern

**Catalog Pattern (Recommended for Order Service):**
```javascript
import Joi from "joi";

export const addItemSchema = {
  body: Joi.object({
    productId: Joi.string().required(),
    variantId: Joi.string().required(),
    quantity: Joi.number().min(1).required()
  })
};

export const updateItemSchema = {
  body: Joi.object({
    quantity: Joi.number().min(1).required()
  }),
  params: Joi.object({
    itemId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  })
};
```

### Required Adjustments

**Status: MINOR ADJUSTMENT REQUIRED**

**Issue:** Plan doesn't specify the exact validation schema structure.

**Action:** All validation files must follow Catalog pattern with object structure containing body, params, query keys.

**Example Validation File:**

```javascript
// services/order/src/cart/cart.validation.js
import Joi from "joi";

export const addItemSchema = {
  body: Joi.object({
    productId: Joi.string().required(),
    variantId: Joi.string().required(),
    quantity: Joi.number().min(1).required(),
    bundleId: Joi.string().optional()
  })
};

export const updateItemSchema = {
  body: Joi.object({
    quantity: Joi.number().min(1).required()
  }),
  params: Joi.object({
    itemId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  })
};

export const applyCouponSchema = {
  body: Joi.object({
    couponCode: Joi.string().required()
  })
};
```

---

## 6. Model/Schema Patterns

### Current Plan Pattern

Plan defines all fields and indexes but doesn't specify exact Mongoose patterns.

### Convention Pattern

Both services use:
- mongoose.Schema() constructor
- Timestamps via `timestamps: true`
- Indexes for foreign keys and common queries
- Compound indexes for query optimization
- Export default model
- Enums for status fields
- Virtual fields (Auth service pattern)

### Required Adjustments

**Status: MINOR ADJUSTMENT REQUIRED**

**Issue 1: Virtual Fields**
- Convention: Auth service uses virtual fields for calculated values
- Plan: Mentions calculated fields but not as virtuals
- Action: Cart totals should be virtual fields, not stored

**Issue 2: Timestamps Pattern**
- Convention: Both services use `timestamps: true`
- Plan: Correct for most models but orderStatusHistory should use `timestamps: { createdAt: true, updatedAt: false }` for immutability
- Action: Verify immutable models don't have updatedAt

**Issue 3: Index Strategy**
- Convention: Compound indexes for common query patterns
- Plan: Lists indexes but not organized by query patterns
- Action: Document which queries each index serves

**Example Corrected Model:**

```javascript
// services/order/models/cart.model.js
import mongoose from "mongoose";

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      index: true,
      sparse: true // Allow null for guest carts
    },
    sessionId: {
      type: String,
      index: true,
      sparse: true // For guest carts
    },
    status: {
      type: String,
      enum: ["active", "abandoned", "converted"],
      default: "active",
      index: true
    },
    currency: {
      type: String,
      default: "INR"
    },
    subtotal: {
      type: Number,
      default: 0
    },
    discountTotal: {
      type: Number,
      default: 0
    },
    shippingTotal: {
      type: Number,
      default: 0
    },
    taxTotal: {
      type: Number,
      default: 0
    },
    grandTotal: {
      type: Number,
      default: 0
    },
    itemCount: {
      type: Number,
      default: 0
    },
    appliedCoupons: [
      {
        code: String,
        discountAmount: Number
      }
    ],
    appliedDiscounts: [
      {
        name: String,
        discountAmount: Number
      }
    ],
    freeGifts: [
      {
        productId: String,
        variantId: String,
        ruleId: String
      }
    ],
    source: {
      type: String,
      enum: ["web", "mobile"],
      default: "web"
    },
    convertedOrderId: {
      type: String,
      index: true,
      sparse: true
    },
    expiresAt: {
      type: Date,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for common queries
cartSchema.index({ userId: 1, status: 1 }); // User active cart lookup
cartSchema.index({ status: 1, expiresAt: 1 }); // Abandoned cart cleanup
cartSchema.index({ sessionId: 1, status: 1 }); // Guest cart lookup

export default mongoose.model("Cart", cartSchema);
```

---

## 7. Services Directory Structure

### Current Plan Pattern

Plan mentions:
- razorpay.service.js
- pdf-generator.service.js

### Convention Pattern

**Auth Service:**
- token.service.js (JWT operations)
- audit.service.js (Audit logging)
- otp.service.js (Firebase verification)

**Catalog Service:**
- slug.service.js (URL slug generation)
- pagination.service.js (Pagination helpers)
- query.service.js (Query building)
- filter.service.js (Advanced filtering)
- sort.service.js (Complex sorting)
- csv.service.js (CSV operations)

### Required Adjustments

**Status: ADJUSTMENT REQUIRED**

**Issue:** Plan missing several utility services needed based on feature requirements.

**Action:** Add the following services:

1. **services/order-number.service.js**
   - Sequential number generation
   - Format: ORD-YYYY-NNNNNN, REF-YYYY-NNNNNN, etc.
   - Thread-safe counter implementation

2. **services/totals-calculator.service.js**
   - Cart totals calculation
   - Tax calculation based on location
   - Discount application logic
   - Reusable across cart and checkout

3. **services/snapshot.service.js**
   - Create immutable snapshots of addresses
   - Create snapshots of shipping methods
   - Create snapshots of totals
   - Used in checkout and order creation

4. **services/inventory-integration.service.js**
   - Wrapper for Inventory Service API calls
   - Reserve stock
   - Release reservations
   - Convert reservations to sales
   - Check availability

5. **services/pricing-integration.service.js**
   - Wrapper for Pricing Service API calls
   - Validate coupons
   - Get automatic discounts
   - Check free gift eligibility
   - Calculate tier discounts

6. **services/notification.service.js**
   - Wrapper for Engagement Service notifications
   - Order confirmation emails
   - Shipment notifications
   - Refund notifications
   - Return status updates

7. **Keep existing:**
   - services/razorpay.service.js
   - services/pdf-generator.service.js

---

## 8. Middleware Patterns

### Current Plan Pattern

Plan doesn't explicitly mention service-specific middlewares.

### Convention Pattern

Both services have service-specific middleware:
- Auth: auth.middleware.js (JWT verification)
- Catalog: No visible service-specific middleware (uses @shared)

### Required Adjustments

**Status: MINOR ADJUSTMENT REQUIRED**

**Issue:** Order service will need specific middlewares not mentioned in plan.

**Action:** Add the following middlewares:

1. **middlewares/cart-ownership.middleware.js**
   - Verify user owns the cart
   - Used in cart update/delete operations

2. **middlewares/order-ownership.middleware.js**
   - Verify user owns the order
   - Used in order view/cancel operations

3. **middlewares/payment-verification.middleware.js**
   - Verify payment signature from gateway
   - Used in webhook endpoints

4. **middlewares/idempotency.middleware.js**
   - Prevent duplicate payment processing
   - Check idempotency keys

---

## 9. Background Jobs and Scripts

### Current Plan Pattern

Plan mentions several background jobs:
- Cart cleanup
- Checkout session cleanup
- Order status sync
- Payment reconciliation
- Invoice generation
- Abandoned cart email

### Convention Pattern

**Auth Service:**
- scripts/seedRoles.js (Database seeding)
- Background jobs not visible (likely external cron)

**Catalog Service:**
- scripts/seed.js (Database seeding)
- Background jobs not visible

### Required Adjustments

**Status: ADJUSTMENT REQUIRED**

**Issue:** Plan mentions background jobs but doesn't specify implementation pattern.

**Action:** Create unified background jobs structure:

1. **scripts/scheduled-jobs.js** (Main scheduler)
   ```javascript
   import cron from "node-cron";
   import { cleanupExpiredCarts } from "./jobs/cart-cleanup.job.js";
   import { cleanupExpiredSessions } from "./jobs/checkout-cleanup.job.js";
   import { syncOrderStatus } from "./jobs/order-sync.job.js";
   import { reconcilePayments } from "./jobs/payment-reconciliation.job.js";
   import { sendAbandonedCartEmails } from "./jobs/abandoned-cart-email.job.js";

   export const startScheduledJobs = () => {
     cron.schedule("*/10 * * * *", cleanupExpiredCarts); // Every 10 minutes
     cron.schedule("*/5 * * * *", cleanupExpiredSessions); // Every 5 minutes
     cron.schedule("0 * * * *", syncOrderStatus); // Every hour
     cron.schedule("0 2 * * *", reconcilePayments); // Daily at 2 AM
     cron.schedule("0 10 * * *", sendAbandonedCartEmails); // Daily at 10 AM
   };
   ```

2. **scripts/jobs/** directory with individual job files
   - cart-cleanup.job.js
   - checkout-cleanup.job.js
   - order-sync.job.js
   - payment-reconciliation.job.js
   - abandoned-cart-email.job.js

3. **Update index.js to start jobs:**
   ```javascript
   import { startScheduledJobs } from "./scripts/scheduled-jobs.js";

   const startServer = async () => {
     await connectDB();
     const app = createApp();
     app.listen(PORT, () => {
       console.log(`> Server running on port ${PORT}`);
       startScheduledJobs();
       console.log("> Scheduled jobs started");
     });
   };
   ```

---

## 10. JSDoc and Documentation

### Current Plan Pattern

Plan mentions JSDoc for endpoints but doesn't show exact format.

### Convention Pattern

Both services use extensive JSDoc comments:

**Catalog Service Pattern:**
```javascript
/**
 * @route GET /api/brands
 * @description Get all brands
 * @access Public
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 10)
 * @param {string} sortBy - Sort field (default: 'createdAt')
 * @param {string} order - Sort order (default: 'desc')
 * @returns {Object} { brands, pagination }
 */
export const getBrands = async (req, res) => { ... };
```

### Required Adjustments

**Status: MINOR ADJUSTMENT REQUIRED**

**Issue:** Plan mentions JSDoc but doesn't specify exact format.

**Action:** All controller functions must have JSDoc with:
- @route (HTTP method and path)
- @description (What the endpoint does)
- @access (Public/Private/Admin)
- @param (All parameters with types)
- @returns (Response structure)

---

## 11. Error Handling Patterns

### Current Plan Pattern

Plan mentions try-catch blocks and error responses.

### Convention Pattern

Both services:
- Try-catch in all async functions
- sendResponse with appropriate status codes
- Console logging of errors
- Meaningful error messages
- No stack traces to client

### Status: COMPLIANT

No adjustments needed. Plan aligns with convention.

---

## 12. External Service Integration Pattern

### Current Plan Pattern

Plan lists service integrations but doesn't specify the pattern.

### Convention Pattern

Neither Auth nor Catalog shows external HTTP service calls (they're independent services).

### Required Adjustments

**Status: CRITICAL ADJUSTMENT REQUIRED**

**Issue:** Order service will make many external HTTP calls (Inventory, Pricing, Catalog, Shipping, Engagement). Need consistent pattern.

**Action:** Create integration wrapper pattern:

1. **services/http-client.service.js** (Base HTTP client)
   ```javascript
   import axios from "axios";

   const createHttpClient = (baseURL, timeout = 5000) => {
     return axios.create({
       baseURL,
       timeout,
       headers: { "Content-Type": "application/json" }
     });
   };

   export const handleServiceError = (error, serviceName) => {
     console.log(`> ${serviceName} service error:`, error.message);
     if (error.response) {
       return {
         success: false,
         error: error.response.data.message || "Service request failed",
         statusCode: error.response.status
       };
     }
     return {
       success: false,
       error: "Service unavailable",
       statusCode: 502
     };
   };
   ```

2. **All integration services follow same pattern:**
   ```javascript
   // services/inventory-integration.service.js
   import { createHttpClient, handleServiceError } from "./http-client.service.js";

   const inventoryClient = createHttpClient(process.env.INVENTORY_SERVICE_URL);

   export const checkStock = async (variantId, quantity) => {
     try {
       const response = await inventoryClient.get(`/api/stock/check/${variantId}`);
       return { success: true, data: response.data };
     } catch (error) {
       return handleServiceError(error, "Inventory");
     }
   };

   export const createReservation = async (cartId, variantId, quantity) => {
     try {
       const response = await inventoryClient.post("/api/reservations", {
         cartId,
         variantId,
         quantity
       });
       return { success: true, data: response.data };
     } catch (error) {
       return handleServiceError(error, "Inventory");
     }
   };
   ```

3. **Environment Variables:**
   Add to .env:
   ```
   INVENTORY_SERVICE_URL=http://localhost:3005
   PRICING_SERVICE_URL=http://localhost:3004
   CATALOG_SERVICE_URL=http://localhost:3002
   SHIPPING_SERVICE_URL=http://localhost:3006
   ENGAGEMENT_SERVICE_URL=http://localhost:3008
   ```

---

## 13. Testing Structure

### Current Plan Pattern

Plan mentions testing strategy but not structure.

### Convention Pattern

Neither service shows visible test structure in exploration.

### Recommendation

**Status: RECOMMENDATION**

**Action:** Add standard testing structure:

```
services/order/
├── tests/
│   ├── unit/
│   │   ├── controllers/
│   │   ├── services/
│   │   └── utils/
│   ├── integration/
│   │   ├── cart.test.js
│   │   ├── checkout.test.js
│   │   └── orders.test.js
│   └── e2e/
│       └── order-flow.test.js
└── jest.config.js
```

---

## 14. Environment Variables Pattern

### Current Plan Pattern

Plan lists required environment variables but not in structured format.

### Convention Pattern

Both services have:
- .env file with PORT only
- .env.example documenting all variables
- Root .env with shared variables

### Required Adjustments

**Status: MINOR ADJUSTMENT REQUIRED**

**Issue:** Plan doesn't specify .env structure.

**Action:** Create .env.example:

```
# Service Configuration
PORT=3003

# External Services (from root .env)
# INVENTORY_SERVICE_URL=http://localhost:3005
# PRICING_SERVICE_URL=http://localhost:3004
# CATALOG_SERVICE_URL=http://localhost:3002
# SHIPPING_SERVICE_URL=http://localhost:3006
# ENGAGEMENT_SERVICE_URL=http://localhost:3008

# Payment Gateway (from root .env)
# RAZORPAY_KEY_ID=your_key_id
# RAZORPAY_KEY_SECRET=your_key_secret
# RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# PDF Generation (from root .env)
# INVOICE_LOGO_URL=https://...
# COMPANY_NAME=Cleanse Ayurveda
# COMPANY_ADDRESS=...
# COMPANY_GSTIN=...

# Feature Flags (from root .env)
# CART_EXPIRY_DAYS=7
# CHECKOUT_EXPIRY_MINUTES=30
# CART_RESERVATION_TTL_MINUTES=15
# CHECKOUT_RESERVATION_TTL_MINUTES=30
```

---

## 15. Summary of Required Changes

### Critical Changes (Must Implement)

1. **Route Pattern:** Implement dual consumer/admin router exports in all route files
2. **Models Index:** Add models/index.js for centralized model exports
3. **Integration Services:** Create consistent pattern for external service calls with error handling
4. **Background Jobs:** Implement structured scheduler with separate job files
5. **Webhooks Separation:** Create separate webhooks.route.js for payment gateway callbacks

### Important Changes (Should Implement)

1. **Constants File:** Create utils/constants.js with all enums and status values
2. **Helpers File:** Create utils/helpers.js with number generation and calculation functions
3. **Integration Wrappers:** Create service wrappers for all 5 external services
4. **Snapshot Service:** Create service for creating immutable data snapshots
5. **Calculator Service:** Create service for totals and tax calculations
6. **Service Middlewares:** Add cart-ownership, order-ownership, payment-verification middlewares
7. **Environment Config:** Create .env.example with all required variables
8. **JSDoc Format:** Standardize JSDoc comments across all controllers

### Recommended Changes (Nice to Have)

1. **Testing Structure:** Add tests/ directory with unit, integration, e2e structure
2. **Error Utilities:** Create error classes for different error types
3. **Request Logger:** Add request logging middleware
4. **Response Interceptor:** Add response time tracking
5. **Health Check Detailed:** Add database and external service health checks
6. **API Documentation:** Generate OpenAPI/Swagger documentation
7. **Performance Monitoring:** Add request metrics collection
8. **Rate Limiting:** Add rate limiting middleware
9. **Request Validation:** Add request size limits
10. **CORS Configuration:** Configure CORS properly for frontend
11. **Compression:** Add response compression middleware
12. **Security Headers:** Add helmet middleware for security headers

---

## 16. Updated Implementation Order

Based on convention compliance, here's the recommended implementation order:

**Phase 1: Foundation (Week 1)**
1. Create directory structure with all required directories
2. Create models/index.js
3. Create utils/constants.js and utils/helpers.js
4. Create all 10 model files
5. Set up indexes
6. Test database connections

**Phase 2: Integration Layer (Week 1)**
1. Create services/http-client.service.js
2. Create all 5 integration service wrappers
3. Create services/snapshot.service.js
4. Create services/totals-calculator.service.js
5. Create services/order-number.service.js
6. Test external service connectivity

**Phase 3: Core Features (Week 2-3)**
1. Implement Cart Module (consumer + admin routes)
2. Implement Checkout Module
3. Implement Orders Module
4. Test cart-to-order flow

**Phase 4: Payment Integration (Week 3)**
1. Implement Payments Module
2. Integrate Razorpay SDK
3. Implement webhook handler
4. Create services/razorpay.service.js
5. Test all payment methods

**Phase 5: Post-Order Features (Week 4)**
1. Implement Refunds Module
2. Implement Returns Module
3. Test refund and return flows

**Phase 6: Invoicing (Week 4)**
1. Implement Invoices Module
2. Implement PDF generation service
3. Test invoice generation

**Phase 7: Background Jobs (Week 5)**
1. Create scripts/jobs/ directory
2. Implement all background jobs
3. Create scripts/scheduled-jobs.js
4. Test job execution

**Phase 8: Testing and Documentation (Week 5)**
1. Write unit tests
2. Write integration tests
3. Document all API endpoints
4. Create README.md
5. Create API documentation

---

## 17. Compliance Checklist

Use this checklist during implementation:

**Directory Structure:**
- [ ] models/ directory with .model.js files
- [ ] models/index.js for centralized exports
- [ ] src/ with feature-based modules
- [ ] services/ for business logic
- [ ] middlewares/ for service-specific middleware
- [ ] utils/ with constants.js and helpers.js
- [ ] scripts/ with jobs/ subdirectory
- [ ] config/ with express.config.js
- [ ] index.js and index.route.js at root

**File Naming:**
- [ ] [feature].controller.js
- [ ] [feature].route.js
- [ ] [feature].validation.js
- [ ] [model].model.js (lowercase)
- [ ] [service].service.js

**Route Pattern:**
- [ ] Dual export: { consumer, admin }
- [ ] Separate consumer and admin routers
- [ ] Mounted separately in index.route.js
- [ ] Health check endpoint
- [ ] JSDoc comments on all routes

**Controller Pattern:**
- [ ] Named exports for each function
- [ ] Try-catch in all async functions
- [ ] Console.log with "> " prefix
- [ ] sendResponse for all responses
- [ ] Import models from models/index.js
- [ ] Use constants from utils/constants.js
- [ ] JSDoc with @route, @description, @access, @param, @returns

**Validation Pattern:**
- [ ] Joi schemas with body, params, query structure
- [ ] Export named schema constants
- [ ] Use validate() from @shared/middlewares
- [ ] ObjectId regex pattern for MongoDB IDs

**Model Pattern:**
- [ ] mongoose.Schema() constructor
- [ ] timestamps: true (or customized for immutable)
- [ ] Enums for status fields
- [ ] Indexes for foreign keys
- [ ] Compound indexes for common queries
- [ ] Export default model

**Services:**
- [ ] HTTP client wrapper for external services
- [ ] Consistent error handling in integrations
- [ ] Business logic separated from controllers
- [ ] Reusable functions

**Middlewares:**
- [ ] Ownership verification middlewares
- [ ] Payment verification middleware
- [ ] Idempotency middleware

**Background Jobs:**
- [ ] Separate job files in scripts/jobs/
- [ ] Main scheduler in scripts/scheduled-jobs.js
- [ ] Started from index.js
- [ ] Proper error handling and logging

**Environment:**
- [ ] .env with PORT only
- [ ] .env.example with all variables documented
- [ ] External service URLs in root .env

**Documentation:**
- [ ] JSDoc on all controllers
- [ ] README.md with setup instructions
- [ ] API endpoint documentation
- [ ] Environment variables documented

---

## 18. Final Assessment

**Overall Compliance Score: 85/100**

**Strengths:**
- Comprehensive feature coverage
- Well-thought-out data models
- Proper field mapping from ERD
- Good security considerations
- Detailed implementation plan

**Areas Requiring Adjustment:**
- Route export pattern needs update for consumer/admin split
- Missing utility files (constants, helpers)
- Integration service pattern not defined
- Background jobs structure needs formalization
- Model imports should use centralized index

**Recommendation:**
Plan is solid but needs these adjustments before starting implementation. With the changes outlined in this review, the service will be fully compliant with established conventions and maintain consistency with other services in the microservices architecture.

**Estimated Time for Adjustments:**
- Critical changes: 1-2 days
- Important changes: 2-3 days
- Total before starting implementation: 3-5 days

**Next Steps:**
1. Review this document with team
2. Make critical adjustments to plan
3. Update implementation plan document
4. Create updated file structure
5. Begin Phase 1 implementation

---

**End of Review**
