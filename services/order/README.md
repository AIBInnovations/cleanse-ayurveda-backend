# Order & Payment Service

The Order & Payment Service is a comprehensive microservice that handles all e-commerce order management operations including shopping cart, checkout, orders, payments, refunds, returns, and invoicing.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Background Jobs](#background-jobs)
- [Models](#models)
- [Integration Services](#integration-services)
- [Error Handling](#error-handling)
- [Testing](#testing)

## Features

### Core Modules

1. **Shopping Cart**
   - Add, update, remove items
   - Real-time price calculations
   - Stock availability checks
   - Abandoned cart tracking

2. **Checkout**
   - Session-based checkout
   - Address validation
   - Payment method selection
   - Order creation

3. **Orders**
   - Order management and tracking
   - Status updates (pending → confirmed → processing → shipped → delivered)
   - Order history and filtering
   - Order cancellation

4. **Payments**
   - Razorpay integration
   - Payment verification
   - Webhook handling
   - Refund processing

5. **Refunds**
   - Item-level refund requests
   - Approval workflow
   - Multiple refund methods (original payment, bank transfer, store credit)
   - Razorpay refund processing

6. **Returns**
   - Return request with image upload
   - Approval and rejection workflow
   - Pickup scheduling
   - Quality inspection
   - Inventory tracking

7. **Invoices**
   - Automatic invoice generation
   - PDF generation with professional layout
   - Email delivery
   - Invoice regeneration

### Additional Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Validation**: Comprehensive Joi validation for all endpoints
- **Background Jobs**: Automated tasks using node-cron
- **Email Notifications**: Integration with engagement service
- **Payment Gateway**: Razorpay integration with webhook support
- **Inventory Management**: Real-time stock tracking
- **Multi-Service Integration**: User, Product, and Engagement services

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Validation**: Joi
- **Payment Gateway**: Razorpay
- **PDF Generation**: PDFKit
- **Task Scheduling**: node-cron
- **Authentication**: JWT

## Project Structure

```
services/order/
├── src/
│   ├── cart/
│   │   ├── cart.controller.js
│   │   ├── cart.route.js
│   │   └── cart.validation.js
│   ├── checkout/
│   │   ├── checkout.controller.js
│   │   ├── checkout.route.js
│   │   └── checkout.validation.js
│   ├── orders/
│   │   ├── orders.controller.js
│   │   ├── orders.route.js
│   │   └── orders.validation.js
│   ├── payments/
│   │   ├── payments.controller.js
│   │   ├── payments.route.js
│   │   └── payments.validation.js
│   ├── refunds/
│   │   ├── refunds.controller.js
│   │   ├── refunds.route.js
│   │   └── refunds.validation.js
│   ├── returns/
│   │   ├── returns.controller.js
│   │   ├── returns.route.js
│   │   └── returns.validation.js
│   ├── invoices/
│   │   ├── invoices.controller.js
│   │   ├── invoices.route.js
│   │   └── invoices.validation.js
│   ├── models/
│   │   ├── Cart.model.js
│   │   ├── CartItem.model.js
│   │   ├── CheckoutSession.model.js
│   │   ├── Order.model.js
│   │   ├── OrderItem.model.js
│   │   ├── Payment.model.js
│   │   ├── Refund.model.js
│   │   ├── RefundItem.model.js
│   │   ├── Return.model.js
│   │   ├── ReturnItem.model.js
│   │   └── Invoice.model.js
│   ├── integrations/
│   │   ├── user.service.js
│   │   ├── product.service.js
│   │   └── engagement.service.js
│   ├── jobs/
│   │   ├── cart-cleanup.job.js
│   │   ├── checkout-expiry.job.js
│   │   ├── abandoned-cart-reminder.job.js
│   │   ├── order-auto-confirm.job.js
│   │   ├── payment-reconciliation.job.js
│   │   ├── auto-invoice-generation.job.js
│   │   └── job-scheduler.js
│   └── config/
│       └── database.js
├── index.js
├── index.route.js
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- MongoDB 5+
- Razorpay account (for payment gateway)

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment variables (see [Environment Variables](#environment-variables))

3. Start the service:
```bash
# Development
pnpm --filter order-service dev

# Production
pnpm --filter order-service start
```

The service will run on `http://localhost:3003`

### Health Check

```bash
curl http://localhost:3003/api/health
```

## Environment Variables

Create a `.env` file in the service root:

```env
# Server
PORT=3003
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/order-service

# JWT
JWT_SECRET=your-jwt-secret

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# Service URLs
USER_SERVICE_URL=http://localhost:3001
PRODUCT_SERVICE_URL=http://localhost:3002
ENGAGEMENT_SERVICE_URL=http://localhost:3004
FRONTEND_URL=http://localhost:3000

# Job Configuration
CART_EXPIRY_DAYS=30
ABANDONED_CART_THRESHOLD_HOURS=24
ABANDONED_CART_REMINDER_WINDOW_HOURS=72
ORDER_AUTO_CONFIRM_HOURS=6
PAYMENT_RECONCILIATION_WINDOW_HOURS=48
REFUND_WINDOW_DAYS=7
RETURN_WINDOW_DAYS=7

# Timezone
TZ=Asia/Kolkata
```

## API Documentation

### Base URL
```
http://localhost:3003/api
```

### Authentication
Most endpoints require JWT authentication via the `Authorization` header:
```
Authorization: Bearer <token>
```

---

## Cart APIs

### Consumer Routes

#### Add Item to Cart
```http
POST /api/cart
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "string",
  "variantId": "string",
  "quantity": 1
}
```

#### Get Cart
```http
GET /api/cart
Authorization: Bearer <token>
```

#### Update Cart Item
```http
PUT /api/cart/:cartItemId
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 2
}
```

#### Remove Cart Item
```http
DELETE /api/cart/:cartItemId
Authorization: Bearer <token>
```

#### Clear Cart
```http
DELETE /api/cart
Authorization: Bearer <token>
```

### Admin Routes

#### Get All Carts
```http
GET /api/admin/cart?page=1&limit=20&userId=xxx
Authorization: Bearer <admin-token>
```

#### Get Cart Statistics
```http
GET /api/admin/cart/stats?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <admin-token>
```

---

## Checkout APIs

### Consumer Routes

#### Initiate Checkout
```http
POST /api/checkout
Authorization: Bearer <token>
Content-Type: application/json

{
  "shippingAddress": {
    "addressLine1": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postalCode": "400001",
    "country": "India"
  },
  "billingAddress": { /* same structure */ },
  "paymentMethod": "razorpay"
}
```

#### Get Checkout Session
```http
GET /api/checkout/:sessionId
Authorization: Bearer <token>
```

#### Update Shipping Address
```http
PUT /api/checkout/:sessionId/shipping-address
Authorization: Bearer <token>
Content-Type: application/json

{
  "shippingAddress": { /* address object */ }
}
```

#### Apply Coupon
```http
POST /api/checkout/:sessionId/apply-coupon
Authorization: Bearer <token>
Content-Type: application/json

{
  "couponCode": "SAVE20"
}
```

#### Complete Checkout
```http
POST /api/checkout/:sessionId/complete
Authorization: Bearer <token>
```

---

## Order APIs

### Consumer Routes

#### Get My Orders
```http
GET /api/orders?page=1&limit=20&status=delivered
Authorization: Bearer <token>
```

#### Get Order by ID
```http
GET /api/orders/:orderId
Authorization: Bearer <token>
```

#### Cancel Order
```http
POST /api/orders/:orderId/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Changed my mind"
}
```

### Admin Routes

#### Get All Orders
```http
GET /api/admin/orders?page=1&limit=20&status=pending&userId=xxx
Authorization: Bearer <admin-token>
```

#### Get Order Statistics
```http
GET /api/admin/orders/stats?startDate=2024-01-01&groupBy=month
Authorization: Bearer <admin-token>
```

#### Update Order Status
```http
PUT /api/admin/orders/:orderId/status
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "status": "shipped",
  "notes": "Shipped via Blue Dart"
}
```

#### Assign Order
```http
POST /api/admin/orders/:orderId/assign
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "assignedTo": "admin-user-id"
}
```

---

## Payment APIs

### Consumer Routes

#### Verify Payment Signature
```http
POST /api/payments/verify-signature
Authorization: Bearer <token>
Content-Type: application/json

{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_xxx"
}
```

### Webhook Routes (No Authentication)

#### Razorpay Webhook
```http
POST /api/webhooks/razorpay
X-Razorpay-Signature: <signature>
Content-Type: application/json

{
  "event": "payment.captured",
  "payload": { /* payment data */ }
}
```

### Admin Routes

#### Get All Payments
```http
GET /api/admin/payments?page=1&status=paid
Authorization: Bearer <admin-token>
```

#### Get Payment Statistics
```http
GET /api/admin/payments/stats?groupBy=day
Authorization: Bearer <admin-token>
```

#### Refund Payment
```http
POST /api/admin/payments/:paymentId/refund
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "amount": 1000,
  "reason": "Product defective",
  "notes": "Full refund"
}
```

---

## Refund APIs

### Consumer Routes

#### Request Refund
```http
POST /api/refunds
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "order_id",
  "items": [
    {
      "orderItemId": "item_id",
      "quantity": 1,
      "reason": "damaged"
    }
  ],
  "description": "Product arrived damaged",
  "refundMethod": "original_payment_method"
}
```

#### Get My Refunds
```http
GET /api/refunds?page=1&status=approved
Authorization: Bearer <token>
```

#### Cancel Refund
```http
POST /api/refunds/:refundId/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Issue resolved"
}
```

### Admin Routes

#### Get All Refunds
```http
GET /api/admin/refunds?page=1&status=pending
Authorization: Bearer <admin-token>
```

#### Approve Refund
```http
POST /api/admin/refunds/:refundId/approve
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "approvedAmount": 1000,
  "notes": "Approved for full refund"
}
```

#### Process Refund
```http
POST /api/admin/refunds/:refundId/process
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "transactionId": "txn_xxx",
  "notes": "Refund processed via Razorpay"
}
```

---

## Return APIs

### Consumer Routes

#### Request Return
```http
POST /api/returns
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "order_id",
  "items": [
    {
      "orderItemId": "item_id",
      "quantity": 1,
      "reason": "wrong_item"
    }
  ],
  "description": "Received wrong product",
  "images": ["https://example.com/image1.jpg"]
}
```

#### Get My Returns
```http
GET /api/returns?page=1&status=pickup_scheduled
Authorization: Bearer <token>
```

### Admin Routes

#### Schedule Pickup
```http
POST /api/admin/returns/:returnId/schedule-pickup
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "pickupDate": "2024-12-25T10:00:00Z",
  "pickupTimeSlot": "morning",
  "courierPartner": "Blue Dart",
  "trackingNumber": "BD123456"
}
```

#### Inspect Return
```http
POST /api/admin/returns/:returnId/inspect
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "inspectionStatus": "accepted",
  "inspectionNotes": "Products received in good condition"
}
```

---

## Invoice APIs

### Consumer Routes

#### Get My Invoices
```http
GET /api/invoices?page=1
Authorization: Bearer <token>
```

#### Get Invoice by Order
```http
GET /api/invoices/order/:orderId
Authorization: Bearer <token>
```

#### Download Invoice PDF
```http
GET /api/invoices/:invoiceId/download
Authorization: Bearer <token>
```

### Admin Routes

#### Generate Invoice
```http
POST /api/admin/invoices/generate/:orderId
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "includeShippingCharges": true,
  "includeDiscounts": true,
  "notes": "Invoice for delivered order"
}
```

#### Send Invoice Email
```http
POST /api/admin/invoices/:invoiceId/send-email
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "recipientEmail": "customer@example.com",
  "subject": "Your Invoice",
  "message": "Please find attached your invoice"
}
```

---

## Background Jobs

The service runs automated background jobs using node-cron:

### Job Schedule

| Job | Schedule | Description |
|-----|----------|-------------|
| Cart Cleanup | Daily at 2:00 AM | Removes carts older than 30 days |
| Checkout Expiry | Every hour | Marks expired checkout sessions |
| Abandoned Cart Reminder | Every 6 hours | Sends reminder emails for abandoned carts |
| Order Auto-Confirmation | Every 2 hours | Auto-confirms paid pending orders |
| Payment Reconciliation | Every 4 hours | Reconciles payment status with Razorpay |
| Auto Invoice Generation | Every 6 hours | Generates invoices for delivered orders |

### Job Configuration

Configure job behavior via environment variables:
- `CART_EXPIRY_DAYS` - Days before cart cleanup (default: 30)
- `ABANDONED_CART_THRESHOLD_HOURS` - Hours before cart is considered abandoned (default: 24)
- `ORDER_AUTO_CONFIRM_HOURS` - Hours before auto-confirming orders (default: 6)
- `PAYMENT_RECONCILIATION_WINDOW_HOURS` - Hours to look back for reconciliation (default: 48)

---

## Models

### Cart
- userId, totalItems, totalPrice, reminderSent, reminderSentAt

### CartItem
- cartId, productId, variantId, productName, variantName, quantity, price, lineTotal, sku, images

### CheckoutSession
- sessionId, userId, cartId, items, shippingAddress, billingAddress, paymentMethod, subtotal, tax, shippingCharges, discount, total, status, expiresAt

### Order
- orderNumber, userId, customerName, customerEmail, customerPhone, shippingAddress, billingAddress, items, subtotal, tax, shippingCharges, discount, totalAmount, paymentMethod, paymentStatus, status, tracking

### OrderItem
- orderId, productId, variantId, productName, variantName, quantity, unitPrice, lineDiscount, lineTax, lineTotal, sku, images, quantityRefunded, quantityReturned

### Payment
- orderId, userId, amount, currency, gatewayOrderId, gatewayPaymentId, paymentMethod, status, refundedAmount, paidAt

### Refund
- refundNumber, orderId, userId, refundAmount, approvedAmount, refundMethod, bankDetails, status, items

### Return
- returnNumber, orderId, userId, items, description, images, pickupAddress, pickupDate, pickupTimeSlot, status, inspectionNotes

### Invoice
- invoiceNumber, orderId, userId, customerName, customerEmail, items, subtotal, totalTax, totalDiscount, shippingCharges, total, generatedBy

---

## Integration Services

### User Service
- `getUserById(userId)` - Get user details

### Product Service
- `getProductById(productId)` - Get product details
- `getVariantById(productId, variantId)` - Get variant details
- `checkStockAvailability(productId, variantId, quantity)` - Check stock
- `reserveStock(items)` - Reserve stock for checkout
- `releaseStock(items)` - Release reserved stock

### Engagement Service
- `sendEmail(emailData)` - Send emails

---

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "message": "Error description",
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Detailed error message"
  }
}
```

Common error codes:
- `NOT_FOUND` - Resource not found
- `ACCESS_DENIED` - Insufficient permissions
- `INVALID_STATUS` - Invalid status transition
- `STOCK_UNAVAILABLE` - Insufficient stock
- `PAYMENT_FAILED` - Payment processing failed
- `SERVER_ERROR` - Internal server error

---

## Testing

### Manual Testing

1. Start all required services (User, Product, Engagement, Order)
2. Use Postman or similar tool
3. Import the API collection (if available)
4. Test endpoints in order:
   - Create cart → Add items → Checkout → Complete order → Verify payment

### Testing Background Jobs

Manually trigger jobs via the scheduler:

```javascript
import { triggerJob } from './src/jobs/job-scheduler.js';

// Trigger specific job
const result = await triggerJob('cart-cleanup');
console.log(result);
```

---

## Support

For issues or questions:
- Check the logs: `pnpm logs`
- Review environment variables
- Verify service integrations
- Check MongoDB connection

---

## License

Proprietary - Cleanse Ayurveda
