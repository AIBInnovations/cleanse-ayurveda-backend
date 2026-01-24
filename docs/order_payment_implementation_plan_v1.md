# Order & Payment Service - Implementation Plan

**Date:** 2026-01-17
**Service Port:** 3003
**Status:** Ready for Implementation

## Executive Summary

This document outlines the complete implementation plan for the Order & Payment Service, which manages shopping carts, checkout sessions, order lifecycle, payments, refunds, returns, and invoicing. The service will implement 12 entities, 7 modules, and approximately 90 features across consumer and admin functionality.

**Implementation Scope:**
- 12 Database entities with full ERD compliance
- 7 Feature modules with complete CRUD operations
- 90+ API endpoints for consumer and admin use
- Integration with Inventory, Pricing, Catalog, Shipping, and Auth services
- Payment gateway integration (Razorpay)
- PDF generation for invoices
- Audit trail and status history tracking

---

## 1. Database Schema Implementation

### 1.1 Carts Entity

**ERD Specification (lines 479-499):**

Fields to implement:
- id: MongoDB _id (ObjectId, auto-generated)
- user_id: String (external reference to users.id from Auth Service)
- session_id: String (for guest carts, indexed)
- status: String enum (active, abandoned, converted) with index
- currency: String (default: INR)
- subtotal: Decimal (calculated from cart items)
- discount_total: Decimal (from applied coupons and discounts)
- shipping_total: Decimal (from selected shipping method)
- tax_total: Decimal (calculated based on tax rates)
- grand_total: Decimal (subtotal - discount_total + shipping_total + tax_total)
- item_count: Number (count of cart_items)
- applied_coupons: JSON array (coupon codes and discount amounts)
- applied_discounts: JSON array (automatic discounts applied)
- free_gifts: JSON array (free gift items added)
- source: String enum (web, mobile)
- converted_order_id: String (reference to orders.id when converted)
- expires_at: Date (TTL for cart expiration, indexed)
- created_at: Timestamp (auto)
- updated_at: Timestamp (auto)

**Indexes:**
- user_id (for user cart lookup)
- session_id (for guest cart lookup)
- status (for abandoned cart queries)
- expires_at (for cleanup operations)
- Compound: status + expires_at (for abandoned cart cleanup)

**Virtual Fields:**
- None required

**Business Rules:**
- One active cart per user
- Guest carts merge with user cart on login
- Carts expire after configurable period (default: 7 days)
- Status transitions: active to abandoned (on expiry), active to converted (on order placement)

---

### 1.2 Cart Items Entity

**ERD Specification (lines 501-515):**

Fields to implement:
- id: MongoDB _id (ObjectId)
- cart_id: ObjectId (reference to carts._id, indexed)
- product_id: String (external reference to products.id)
- variant_id: String (external reference to product_variants.id)
- bundle_id: String (external reference to bundles.id, optional)
- quantity: Number (min: 1)
- unit_price: Decimal (sale price at time of add)
- unit_mrp: Decimal (MRP at time of add)
- line_discount: Decimal (item-level discount)
- line_total: Decimal (unit_price multiplied by quantity minus line_discount)
- is_free_gift: Boolean (default: false)
- gift_rule_id: String (reference to free_gift_rules.id if free gift)
- added_at: Timestamp

**Indexes:**
- cart_id (for cart item lookup)
- Compound: cart_id + product_id + variant_id (prevent duplicate items)

**Business Rules:**
- Each cart item represents unique product-variant combination
- Prices snapshot at time of adding to cart
- Free gifts cannot be modified or removed manually
- Validate stock availability before adding

---

### 1.3 Checkout Sessions Entity

**ERD Specification (lines 517-535):**

Fields to implement:
- id: MongoDB _id (ObjectId)
- cart_id: ObjectId (reference to carts._id, indexed)
- user_id: String (external reference, indexed)
- status: String enum (initiated, address_entered, payment_pending, completed, failed) with index
- email: String
- phone: String
- shipping_address_id: String (reference to addresses.id)
- shipping_address_snapshot: JSON (full address object)
- billing_address_snapshot: JSON (full address object, optional if same as shipping)
- shipping_method_id: String (reference to shipping_methods.id)
- shipping_method_snapshot: JSON (shipping method details)
- totals_snapshot: JSON (subtotal, discount, shipping, tax, grand_total)
- is_gift_order: Boolean (default: false)
- gift_message: String (optional, max 500 chars)
- expires_at: Date (checkout session TTL, default 30 minutes)
- created_at: Timestamp
- updated_at: Timestamp

**Indexes:**
- cart_id (unique, one session per cart)
- user_id (for user checkout history)
- status (for analytics)
- expires_at (for cleanup)

**Business Rules:**
- Session created when checkout starts
- Expires after 30 minutes of inactivity
- Snapshots address and shipping method to preserve data
- Status progression: initiated to address_entered to payment_pending to completed
- Failed status if payment fails or session expires

---

### 1.4 Orders Entity

**ERD Specification (lines 537-572):**

Fields to implement:
- id: MongoDB _id (ObjectId)
- order_number: String (unique, human-readable, e.g., ORD-2026-001234)
- user_id: String (external reference, indexed)
- checkout_session_id: ObjectId (reference to checkout_sessions._id)
- status: String enum (pending, confirmed, processing, shipped, delivered, cancelled, returned) with index
- payment_status: String enum (pending, paid, failed, refunded) with index
- fulfillment_status: String enum (unfulfilled, partially_fulfilled, fulfilled) with index
- email: String (indexed for search)
- phone: String (indexed for search)
- currency: String
- subtotal: Decimal
- discount_total: Decimal
- shipping_total: Decimal
- tax_total: Decimal
- grand_total: Decimal
- paid_amount: Decimal
- refunded_amount: Decimal (default: 0)
- shipping_address_snapshot: JSON
- billing_address_snapshot: JSON
- shipping_method_snapshot: JSON
- applied_coupons_snapshot: JSON
- is_gift_order: Boolean
- gift_message: String
- customer_notes: String
- internal_notes: String (admin only)
- source: String (web, mobile)
- cancellation_reason: String (optional)
- cancelled_by_id: String (user_id or admin_user_id)
- cancelled_at: Timestamp (optional)
- confirmed_at: Timestamp (optional)
- shipped_at: Timestamp (optional)
- delivered_at: Timestamp (optional)
- created_at: Timestamp
- updated_at: Timestamp

**Indexes:**
- order_number (unique)
- user_id (for customer order history)
- status (for order filtering)
- payment_status (for payment reports)
- fulfillment_status (for fulfillment tracking)
- email (for search)
- phone (for search)
- created_at (for date range queries)
- Compound: user_id + created_at (for user order history sorted by date)
- Compound: status + created_at (for admin order listing)

**Business Rules:**
- Order number generated sequentially with format ORD-YYYY-NNNNNN
- Order created after successful payment (or COD confirmation)
- Status transitions tracked in order_status_history
- Cancellation only allowed before shipment unless explicitly allowed
- Refunded amount cannot exceed paid amount

---

### 1.5 Order Items Entity

**ERD Specification (lines 574-596):**

Fields to implement:
- id: MongoDB _id (ObjectId)
- order_id: ObjectId (reference to orders._id, indexed)
- product_id: String (external reference)
- variant_id: String (external reference)
- bundle_id: String (external reference, optional)
- sku: String (snapshot from inventory)
- name: String (product name snapshot)
- image_url: String (product image snapshot)
- quantity: Number
- quantity_fulfilled: Number (default: 0)
- quantity_returned: Number (default: 0)
- quantity_refunded: Number (default: 0)
- unit_price: Decimal
- unit_mrp: Decimal
- line_discount: Decimal
- line_tax: Decimal
- line_total: Decimal
- hsn_code: String (for tax calculation)
- is_free_gift: Boolean
- fulfillment_status: String enum (pending, partially_fulfilled, fulfilled, returned)
- created_at: Timestamp

**Indexes:**
- order_id (for order item lookup)
- product_id (for product sales analytics)
- sku (for inventory reconciliation)

**Business Rules:**
- All product details snapshotted to preserve historical data
- Quantity fulfilled tracked for partial shipments
- Fulfillment status calculated based on quantity_fulfilled vs quantity
- Line tax calculated per item based on HSN code and customer location

---

### 1.6 Order Status History Entity

**ERD Specification (lines 598-608):**

Fields to implement:
- id: MongoDB _id (ObjectId)
- order_id: ObjectId (reference to orders._id, indexed)
- from_status: String
- to_status: String
- status_type: String enum (order, payment, fulfillment)
- notes: String (optional, reason for change)
- changed_by_type: String enum (system, admin, customer)
- changed_by_id: String (user_id or admin_user_id, optional)
- created_at: Timestamp

**Indexes:**
- order_id + created_at (for order timeline)
- Compound: order_id + status_type (for specific status type history)

**Immutable Design:**
- No updated_at field
- Records never updated, only created
- Complete audit trail of all status changes

**Business Rules:**
- Entry created for every status change
- System-generated for automated status changes
- Admin or customer initiated for manual changes
- Maintains complete audit trail

---

### 1.7 Payments Entity

**ERD Specification (lines 610-630):**

Fields to implement:
- id: MongoDB _id (ObjectId)
- order_id: ObjectId (reference to orders._id, indexed)
- idempotency_key: String (unique, for preventing duplicate payments)
- gateway: String (razorpay for now)
- gateway_order_id: String (Razorpay order ID, indexed)
- gateway_payment_id: String (Razorpay payment ID, indexed)
- method: String enum (upi, card, netbanking, wallet, cod)
- method_details: JSON (card last 4 digits, UPI ID, bank name, etc.)
- status: String enum (pending, authorized, captured, failed, refunded) with index
- currency: String
- amount: Decimal (order total)
- captured_amount: Decimal (actual captured amount)
- refunded_amount: Decimal (default: 0)
- fee: Decimal (payment gateway fee)
- error_message: String (if payment failed)
- gateway_response: JSON (complete webhook response)
- captured_at: Timestamp (optional)
- created_at: Timestamp
- updated_at: Timestamp

**Indexes:**
- order_id (for order payment lookup)
- idempotency_key (unique, prevent duplicates)
- gateway_order_id (for webhook processing)
- gateway_payment_id (for reconciliation)
- status (for payment reports)
- created_at (for financial reports)

**Business Rules:**
- Idempotency key ensures single payment per order attempt
- COD payments marked as pending, captured on delivery
- Online payments: pending to authorized to captured
- Failed payments allow retry with new payment record
- Refunds tracked but do not change original payment status

---

### 1.8 Refunds Entity

**ERD Specification (lines 632-650):**

Fields to implement:
- id: MongoDB _id (ObjectId)
- order_id: ObjectId (reference to orders._id, indexed)
- payment_id: ObjectId (reference to payments._id, indexed)
- refund_number: String (unique, format: REF-YYYY-NNNNNN)
- gateway_refund_id: String (Razorpay refund ID)
- type: String enum (full, partial)
- reason: String (required)
- status: String enum (pending, processing, completed, failed) with index
- amount: Decimal (refund amount)
- items: JSON array (order_item_id, qty, amount for each item)
- initiated_by_type: String enum (customer, admin)
- initiated_by_id: String (user_id or admin_user_id)
- approved_by_id: String (admin_user_id, optional)
- notes: String (admin notes)
- processed_at: Timestamp (optional)
- created_at: Timestamp
- updated_at: Timestamp

**Indexes:**
- order_id (for order refund lookup)
- payment_id (for payment refund tracking)
- refund_number (unique)
- status (for refund processing queue)
- created_at (for refund reports)

**Business Rules:**
- Refund number generated sequentially
- Customer-initiated refunds require admin approval
- Admin can process refund immediately
- Full refund returns entire order amount
- Partial refund specifies items and quantities
- Refund amount cannot exceed paid amount minus previous refunds

---

### 1.9 Returns Entity

**ERD Specification (lines 652-669):**

Fields to implement:
- id: MongoDB _id (ObjectId)
- order_id: ObjectId (reference to orders._id, indexed)
- user_id: String (external reference, indexed)
- return_number: String (unique, format: RET-YYYY-NNNNNN)
- status: String enum (requested, approved, rejected, received, completed) with index
- reason: String (required, e.g., damaged, wrong item, not satisfied)
- items: JSON array (order_item_id, qty, reason, condition, images for each item)
- customer_notes: String
- admin_notes: String
- inspection_status: String enum (pending, pass, fail)
- inspection_notes: String
- refund_id: ObjectId (reference to refunds._id, optional)
- approved_by_id: String (admin_user_id)
- completed_at: Timestamp (optional)
- created_at: Timestamp
- updated_at: Timestamp

**Indexes:**
- order_id (for order return lookup)
- user_id (for customer return history)
- return_number (unique)
- status (for return processing queue)
- created_at (for return analytics)

**Business Rules:**
- Return request initiated by customer
- Admin approves or rejects with reason
- RMA number (return_number) generated on approval
- Return marked as received when package arrives
- Inspection determines pass or fail
- Refund processed only after inspection pass
- Return window configurable per product category

---

### 1.10 Invoices Entity

**ERD Specification (lines 671-685):**

Fields to implement:
- id: MongoDB _id (ObjectId)
- order_id: ObjectId (reference to orders._id, indexed)
- invoice_number: String (unique, format: INV-YYYY-NNNNNN)
- type: String enum (sale, credit_note)
- status: String enum (draft, issued) with index
- totals: JSON (subtotal, discount, shipping, tax, grand_total breakdown)
- billing_address_snapshot: JSON
- tax_summary: JSON (CGST, SGST, IGST breakdown by HSN code)
- gstin: String (customer GSTIN if B2B)
- pdf_url: String (S3 or Cloudinary URL to generated PDF)
- issued_at: Timestamp (optional, when invoice is finalized)
- created_by_id: String (admin_user_id)
- created_at: Timestamp

**Indexes:**
- order_id (for order invoice lookup)
- invoice_number (unique)
- type (for filtering)
- issued_at (for financial reports)

**Immutable Design:**
- No updated_at field
- Once issued, invoice cannot be modified
- Credit notes created for adjustments

**Business Rules:**
- Invoice generated automatically on order confirmation
- Draft status until officially issued
- Credit notes issued for returns and refunds
- PDF generated using template with all tax details
- Sequential numbering for compliance

---

## 2. Module Implementation Plan

### 2.1 Cart Module

**File Structure:**
- services/order/models/cart.model.js
- services/order/models/cartItem.model.js
- services/order/src/cart/cart.controller.js
- services/order/src/cart/cart.validation.js
- services/order/src/cart/cart.route.js

**Consumer Features (14 features):**

**Add product to cart:**
- Endpoint: POST /api/cart/items
- Validate product and variant exist via Catalog Service lookup
- Check stock availability via Inventory Service
- Check if item already in cart (update quantity instead of duplicate)
- Create inventory reservation via Inventory Service
- Calculate line total with current pricing
- Update cart totals
- Return updated cart with all items

**Update item quantity:**
- Endpoint: PUT /api/cart/items/:itemId
- Validate new quantity against stock availability
- Update inventory reservation quantity
- Recalculate line total
- Update cart totals
- Return updated cart

**Remove item from cart:**
- Endpoint: DELETE /api/cart/items/:itemId
- Release inventory reservation
- Remove cart item record
- Update cart totals
- If cart empty, mark status as abandoned
- Return updated cart

**View cart summary:**
- Endpoint: GET /api/cart
- Populate cart items with current product details
- Calculate real-time totals
- Apply automatic discounts from Pricing Service
- Return cart with items and totals breakdown

**View line item details:**
- Include in cart summary response
- Show product name, image, variant details
- Show unit price, quantity, line discount, line total
- Show stock availability status

**View totals breakdown:**
- Calculate subtotal from all line totals
- Apply coupon discounts
- Apply automatic discounts
- Calculate shipping (if method selected)
- Calculate tax based on customer location and HSN codes
- Show grand total

**Apply coupon code:**
- Endpoint: POST /api/cart/coupons
- Validate coupon via Pricing Service
- Check coupon eligibility (minimum order, product applicability, usage limits)
- Apply discount to cart
- Store coupon in applied_coupons array
- Recalculate totals
- Return updated cart with discount details

**View applied discounts:**
- Include in cart summary
- Show coupon discounts separately
- Show automatic discounts with names and amounts
- Show total discount amount

**View free gifts:**
- Check free gift rules via Pricing Service
- Auto-add qualifying free gifts as cart items with is_free_gift flag
- Remove free gifts if conditions no longer met
- Display free gift items distinctly in cart

**Save for later:**
- Endpoint: POST /api/cart/items/:itemId/save-later
- Move item to separate saved_items collection
- Release inventory reservation
- Remove from cart
- Update totals

**Move to wishlist:**
- Endpoint: POST /api/cart/items/:itemId/move-wishlist
- Call Engagement Service to add to wishlist
- Remove from cart
- Release inventory reservation
- Update totals

**Merge guest cart on login:**
- Triggered automatically on user login
- Fetch guest cart by session_id
- Fetch user cart by user_id
- Merge items (combine quantities if duplicate products)
- Transfer inventory reservations to user cart
- Mark guest cart as converted
- Return merged cart

**View cross-sell recommendations:**
- Endpoint: GET /api/cart/recommendations
- Get product IDs from cart items
- Fetch related products (cross-sell) from Catalog Service
- Filter out products already in cart
- Return recommended products

**Mini cart in header:**
- Endpoint: GET /api/cart/mini
- Return minimal cart data: item count, grand total
- Lightweight response for header display
- No full item details

**Admin Features (4 features):**

**View abandoned carts:**
- Endpoint: GET /api/admin/carts/abandoned
- Filter carts with status abandoned
- Filter by date range, user, total value
- Paginate results
- Show user info, cart value, items count, abandoned date

**View cart details:**
- Endpoint: GET /api/admin/carts/:cartId
- Return full cart with items
- Show user details
- Show applied coupons and discounts
- Show creation and last update timestamps

**View abandonment analytics:**
- Endpoint: GET /api/admin/carts/analytics
- Calculate abandonment rate
- Show total abandoned cart value
- Show average cart value
- Group by time period
- Show top abandoned products

**Configure cart expiry:**
- Endpoint: PUT /api/admin/carts/settings
- Set cart expiry duration
- Update system configuration
- Apply to new carts going forward

**Background Jobs:**
- Cart cleanup: Mark expired carts as abandoned, release reservations
- Auto-apply discounts: Check and apply automatic discounts periodically
- Free gift sync: Add/remove free gifts based on cart value changes

---

### 2.2 Checkout Module

**File Structure:**
- services/order/models/checkoutSession.model.js
- services/order/src/checkout/checkout.controller.js
- services/order/src/checkout/checkout.validation.js
- services/order/src/checkout/checkout.route.js

**Consumer Features (12 features):**

**Start checkout process:**
- Endpoint: POST /api/checkout/start
- Validate cart has items and is active
- Validate stock availability for all items
- Create checkout session with cart reference
- Extend inventory reservations to checkout TTL (30 min)
- Set status to initiated
- Return checkout session with cart details

**Enter/select shipping address:**
- Endpoint: PUT /api/checkout/:sessionId/shipping-address
- Validate address format
- Check pincode serviceability via Shipping Service
- Store address reference and snapshot
- Update session status to address_entered
- Return updated session

**Enter/select billing address:**
- Endpoint: PUT /api/checkout/:sessionId/billing-address
- Validate address format
- If same as shipping, copy snapshot
- Store address snapshot
- Return updated session

**Select shipping method:**
- Endpoint: PUT /api/checkout/:sessionId/shipping-method
- Get available shipping methods via Shipping Service for address
- Validate selected method is available
- Calculate shipping cost
- Store shipping method reference and snapshot
- Update cart shipping_total
- Recalculate grand total
- Return updated session with totals

**View shipping rates and ETA:**
- Endpoint: GET /api/checkout/:sessionId/shipping-methods
- Call Shipping Service with destination address
- Return available methods with rates and ETAs
- Filter by weight, COD availability

**Select payment method:**
- Endpoint: PUT /api/checkout/:sessionId/payment-method
- Validate payment method is enabled
- If COD, validate COD availability for pincode
- Store selected payment method
- Return available payment options

**View order summary before payment:**
- Endpoint: GET /api/checkout/:sessionId/summary
- Return complete checkout session
- Include cart items with details
- Include totals breakdown
- Include shipping and billing addresses
- Include shipping method
- Include payment method
- Include applied coupons and discounts

**Add gift message:**
- Endpoint: PUT /api/checkout/:sessionId/gift-message
- Validate message length (max 500 chars)
- Set is_gift_order to true
- Store gift message
- Return updated session

**Add order notes:**
- Endpoint: PUT /api/checkout/:sessionId/notes
- Store customer notes
- Return updated session

**Accept terms and conditions:**
- Validation in place order endpoint
- Require terms_accepted boolean in request

**Guest checkout:**
- Allow checkout without user login
- Require email and phone in checkout session
- Create guest cart with session_id
- Process order as guest user
- Send order confirmation to email

**Resume abandoned checkout:**
- Endpoint: GET /api/checkout/resume/:sessionId
- Check if session not expired
- Validate cart still active
- Return session for continuation
- If expired, create new session from cart

**Admin Features (2 features):**

**View checkout sessions:**
- Endpoint: GET /api/admin/checkouts
- Filter by status, date, user
- Show cart value, customer, status, timestamps
- Paginate results

**View checkout abandonment at each step:**
- Endpoint: GET /api/admin/checkouts/funnel
- Calculate drop-off at each step
- Show initiated vs address_entered vs payment_pending vs completed
- Calculate conversion rate
- Group by time period

**Background Jobs:**
- Checkout session cleanup: Expire sessions after TTL, release reservations
- Abandoned checkout reminders: Email customers with incomplete checkouts

---

### 2.3 Orders Module

**File Structure:**
- services/order/models/order.model.js
- services/order/models/orderItem.model.js
- services/order/models/orderStatusHistory.model.js
- services/order/src/orders/orders.controller.js
- services/order/src/orders/orders.validation.js
- services/order/src/orders/orders.route.js

**Consumer Features (9 features):**

**Place order:**
- Endpoint: POST /api/orders
- Validate checkout session completed
- Validate payment authorized (or COD)
- Generate unique order number
- Create order from checkout session data
- Copy all snapshots (address, shipping, totals, coupons)
- Create order items from cart items
- Convert inventory reservations to sale via Inventory Service
- Update cart status to converted
- Create order status history entry
- Trigger invoice generation
- Send order confirmation email
- Return order details

**View order confirmation:**
- Endpoint: GET /api/orders/:orderNumber/confirmation
- Return order with items
- Include payment details
- Include shipping details
- Include estimated delivery date

**View order history:**
- Endpoint: GET /api/orders
- Filter by user_id
- Sort by created_at descending
- Paginate results
- Return order list with summary info

**View order details:**
- Endpoint: GET /api/orders/:orderNumber
- Populate order items with product details
- Include status history
- Include payment information
- Include shipment tracking if available
- Return complete order details

**Track order status:**
- Endpoint: GET /api/orders/:orderNumber/tracking
- Return current status
- Return status history with timestamps
- Return shipment tracking info if shipped
- Return estimated delivery date

**View order timeline:**
- Endpoint: GET /api/orders/:orderNumber/timeline
- Return chronological status history
- Include order placed, confirmed, shipped, delivered timestamps
- Include payment status changes
- Format as timeline events

**Cancel order:**
- Endpoint: POST /api/orders/:orderNumber/cancel
- Validate order not yet shipped
- Validate cancellation allowed by policy
- Require cancellation reason
- Update order status to cancelled
- Create status history entry
- Initiate refund if paid
- Release inventory back to stock via Inventory Service
- Send cancellation confirmation email
- Return updated order

**Reorder from past order:**
- Endpoint: POST /api/orders/:orderNumber/reorder
- Fetch original order items
- Validate products still active
- Check stock availability
- Create new cart with items
- Return cart for review and checkout

**Download invoice:**
- Endpoint: GET /api/orders/:orderNumber/invoice
- Fetch invoice record
- Return PDF URL if already generated
- Generate PDF if not exists
- Return PDF download link

**Admin Features (13 features):**

**View all orders:**
- Endpoint: GET /api/admin/orders
- Support filtering by status, payment_status, fulfillment_status, date range, source
- Support sorting by date, total, status
- Paginate results
- Return order list with customer info

**Filter orders:**
- Include in view all orders endpoint
- Filter by order status
- Filter by date range
- Filter by customer (user_id, email, phone)
- Filter by payment status
- Filter by fulfillment status

**Search orders:**
- Endpoint: GET /api/admin/orders/search
- Search by order number (exact match)
- Search by email (partial match)
- Search by phone (partial match)
- Return matching orders

**View order details and timeline:**
- Endpoint: GET /api/admin/orders/:orderId
- Return complete order with items
- Include customer details
- Include payment details
- Include shipment details
- Include status history
- Include internal notes

**Update order status:**
- Endpoint: PUT /api/admin/orders/:orderId/status
- Validate status transition is allowed
- Update order status
- Create status history entry with admin_id
- Trigger status-based actions (email, inventory update)
- Return updated order

**Add internal notes:**
- Endpoint: POST /api/admin/orders/:orderId/notes
- Append to internal_notes field
- Include timestamp and admin name
- Return updated order

**Add order tags:**
- Endpoint: POST /api/admin/orders/:orderId/tags
- Support custom tags for organization
- Allow multiple tags
- Use for filtering and reporting

**Cancel order with reason:**
- Endpoint: POST /api/admin/orders/:orderId/cancel
- Validate cancellation allowed
- Require cancellation reason
- Store cancelled_by_id as admin
- Update status to cancelled
- Create status history
- Process refund if applicable
- Return updated order

**Create manual order:**
- Endpoint: POST /api/admin/orders/manual
- Allow admin to create order on behalf of customer
- Select customer or enter guest details
- Add items manually
- Set custom pricing if needed
- Select payment method (often COD or bank transfer)
- Generate order normally
- Mark source as admin

**Edit order:**
- Endpoint: PUT /api/admin/orders/:orderId
- Limited editing: shipping address, customer notes
- Cannot edit items or pricing after confirmation
- Create audit entry
- Return updated order

**Export orders:**
- Endpoint: GET /api/admin/orders/export
- Filter by date range, status, etc.
- Generate CSV with order details
- Include customer, items, totals, status
- Stream CSV response

**Bulk update orders:**
- Endpoint: POST /api/admin/orders/bulk-update
- Support bulk status updates
- Upload CSV with order IDs and new status
- Validate each update
- Process in batch
- Return success and error counts

---

### 2.4 Payments Module

**File Structure:**
- services/order/models/payment.model.js
- services/order/src/payments/payments.controller.js
- services/order/src/payments/razorpay.service.js
- services/order/src/payments/payments.validation.js
- services/order/src/payments/payments.route.js
- services/order/src/payments/webhooks.controller.js

**Consumer Features (7 features):**

**Pay via UPI:**
- Integrated in payment method selection
- Create Razorpay order
- Return payment options with UPI enabled
- Handle payment callback
- Update payment status on success

**Pay via credit/debit card:**
- Integrated in payment method selection
- Create Razorpay order
- Return Razorpay checkout with card options
- Store card last 4 digits in method_details
- Handle payment callback

**Pay via net banking:**
- Integrated in payment method selection
- Create Razorpay order with netbanking
- Store bank name in method_details
- Handle payment callback

**Pay via wallet:**
- Integrated in payment method selection
- Support wallets available via Razorpay
- Store wallet name in method_details
- Handle payment callback

**Cash on Delivery:**
- Endpoint: POST /api/payments/cod
- Validate COD available for pincode
- Calculate COD fee if applicable
- Create payment record with status pending
- Create order with payment_status pending
- COD amount stored for tracking
- Mark as captured on delivery confirmation

**Retry failed payment:**
- Endpoint: POST /api/payments/:paymentId/retry
- Check if previous payment failed
- Create new payment record with same order
- Generate new Razorpay order
- Return new payment details for retry

**View payment status:**
- Endpoint: GET /api/payments/:paymentId
- Return payment record with status
- Include gateway response
- Show captured amount
- Show refunded amount if any

**Admin Features (6 features):**

**View all transactions:**
- Endpoint: GET /api/admin/payments
- Filter by status, method, date range, order
- Show payment details with order info
- Paginate results

**View payment details:**
- Endpoint: GET /api/admin/payments/:paymentId
- Return complete payment record
- Include gateway response
- Include order details
- Show all status transitions

**View payment gateway response:**
- Include raw gateway_response JSON
- Show for debugging and reconciliation

**Handle payment webhooks:**
- Endpoint: POST /api/webhooks/razorpay
- Verify webhook signature
- Extract payment status
- Update payment record
- Update order payment_status
- Send confirmation email on success
- Idempotency handling to prevent duplicate processing

**Reconcile payments:**
- Endpoint: POST /api/admin/payments/reconcile
- Fetch payment data from Razorpay API
- Compare with local records
- Identify discrepancies
- Mark reconciled payments
- Generate reconciliation report

**Export transaction report:**
- Endpoint: GET /api/admin/payments/export
- Filter by date range, status, method
- Generate CSV with payment details
- Include gateway fees
- Include settlement info

**Payment Integration:**
- Use Razorpay SDK for payment processing
- Store credentials in environment variables
- Create service wrapper for Razorpay API calls
- Handle all payment methods via single integration
- Webhook endpoint for asynchronous updates

---

### 2.5 Refunds Module

**File Structure:**
- services/order/models/refund.model.js
- services/order/src/refunds/refunds.controller.js
- services/order/src/refunds/refunds.validation.js
- services/order/src/refunds/refunds.route.js

**Consumer Features (4 features):**

**Request refund:**
- Endpoint: POST /api/refunds
- Validate order is eligible for refund (paid, not already refunded)
- Require refund reason
- Create refund record with status pending
- Set initiated_by_type as customer
- Notify admin of refund request
- Return refund details with request confirmation

**Select refund reason:**
- Include in request refund endpoint
- Provide predefined reasons dropdown
- Allow custom reason text
- Store reason in refund record

**Track refund status:**
- Endpoint: GET /api/refunds/:refundId
- Return refund record with current status
- Include approval/rejection reason if any
- Show processing timeline

**View refund history:**
- Endpoint: GET /api/refunds
- Filter by user_id
- Show all refund requests
- Include order details
- Sort by date descending

**Admin Features (10 features):**

**View refund requests:**
- Endpoint: GET /api/admin/refunds
- Filter by status (pending, processing, completed, failed)
- Filter by date range
- Show customer info, order info, amount, reason
- Paginate results

**Approve/reject refund:**
- Endpoint: POST /api/admin/refunds/:refundId/approve
- Endpoint: POST /api/admin/refunds/:refundId/reject
- Validate refund is in pending status
- Update status to processing or rejected
- Store approved_by_id
- Add admin notes
- Trigger refund processing if approved
- Notify customer

**Process full refund:**
- Endpoint: POST /api/admin/refunds/:refundId/process
- Validate payment record exists
- Calculate full order amount
- Create Razorpay refund via API
- Update refund status to processing
- Store gateway_refund_id
- Update order refunded_amount
- Create status history entry
- Notify customer

**Process partial refund:**
- Endpoint: POST /api/admin/refunds/:refundId/process-partial
- Specify items and quantities to refund
- Calculate partial amount based on items
- Create Razorpay refund for partial amount
- Update refund record with items array
- Update order refunded_amount
- Create status history
- Notify customer

**Refund to original payment method:**
- Default behavior for online payments
- Use Razorpay refund API
- Refund processes to original card/UPI/wallet
- Track refund status via webhook

**Refund to store credit:**
- Endpoint: POST /api/admin/refunds/:refundId/store-credit
- Create store credit via Engagement Service
- Mark refund as completed
- No gateway processing needed
- Update order refunded_amount

**Refund to bank account:**
- For COD orders
- Endpoint: POST /api/admin/refunds/:refundId/bank-transfer
- Collect bank account details from customer
- Process manual bank transfer
- Mark refund as processing
- Update to completed after transfer confirmation

**Add refund notes:**
- Endpoint: POST /api/admin/refunds/:refundId/notes
- Append admin notes
- Track reason for decisions
- Include in refund record

**View refund audit trail:**
- Endpoint: GET /api/admin/refunds/:refundId/history
- Show all status changes
- Include timestamps
- Include admin actions
- Show processing attempts

**Webhook handling:**
- Endpoint: POST /api/webhooks/razorpay/refund
- Receive refund status updates from Razorpay
- Update refund status to completed or failed
- Notify customer of completion

---

### 2.6 Returns Module

**File Structure:**
- services/order/models/return.model.js
- services/order/src/returns/returns.controller.js
- services/order/src/returns/returns.validation.js
- services/order/src/returns/returns.route.js

**Consumer Features (7 features):**

**Initiate return request:**
- Endpoint: POST /api/returns
- Validate order is eligible for return (delivered, within return window)
- Require return reason
- Create return record with status requested
- Store user_id
- Notify admin
- Return return details with RMA pending

**Select items to return:**
- Include in initiate endpoint
- Support returning subset of order items
- Specify quantity for each item
- Store in items array

**Select return reason:**
- Provide predefined reasons
- Allow per-item reason
- Store reason per item in items array

**Upload images:**
- Endpoint: POST /api/returns/:returnId/images
- For damage or defect claims
- Upload to Cloudinary
- Store URLs in items array
- Associate with specific items

**Add return notes:**
- Include customer notes field in initiate endpoint
- Store customer explanation
- Max length validation

**Track return status:**
- Endpoint: GET /api/returns/:returnId
- Return return record with status
- Show RMA number if approved
- Show pickup schedule if arranged
- Show inspection results if completed

**View RMA number:**
- Generated on approval
- Displayed in return details
- Used for return package labeling
- Format: RET-YYYY-NNNNNN

**Admin Features (9 features):**

**View all returns:**
- Endpoint: GET /api/admin/returns
- Filter by status, date range, order
- Show customer info, order info, items, reason
- Paginate results

**Approve/reject return:**
- Endpoint: POST /api/admin/returns/:returnId/approve
- Endpoint: POST /api/admin/returns/:returnId/reject
- Validate return is in requested status
- Update status to approved or rejected
- Generate RMA number on approval
- Store approved_by_id
- Add admin notes with reason
- Notify customer

**Generate RMA number:**
- Automatic on approval
- Sequential format: RET-YYYY-NNNNNN
- Unique per return
- Used for tracking

**Schedule pickup:**
- Endpoint: POST /api/admin/returns/:returnId/schedule-pickup
- Integrate with Shipping Service for reverse logistics
- Create pickup request with carrier
- Store pickup date and time
- Notify customer with pickup details

**Mark as received:**
- Endpoint: PUT /api/admin/returns/:returnId/received
- Update status to received
- Store received timestamp
- Trigger inspection process

**Inspect returned items:**
- Endpoint: POST /api/admin/returns/:returnId/inspect
- Record inspection findings
- Set inspection_status (pass/fail)
- Add inspection_notes
- Upload inspection images if needed

**Update inspection status:**
- Include in inspect endpoint
- Pass: proceed with refund
- Fail: reject refund, explain reason to customer

**Process refund for return:**
- Endpoint: POST /api/admin/returns/:returnId/refund
- Validate inspection passed
- Create refund record linked to return
- Calculate refund amount based on returned items
- Deduct shipping costs if policy requires
- Process via refunds module
- Update return status to completed
- Return inventory to stock via Inventory Service

**Add admin notes:**
- Endpoint: POST /api/admin/returns/:returnId/notes
- Track admin comments
- Document inspection findings
- Store rejection reasons

**Business Rules:**
- Return window: configurable per product category (default 7-30 days)
- Return shipping: customer pays unless product defect
- Inspection required for all returns
- Refund only after inspection pass
- Inventory returned to stock after inspection

---

### 2.7 Invoices Module

**File Structure:**
- services/order/models/invoice.model.js
- services/order/src/invoices/invoices.controller.js
- services/order/src/invoices/pdf-generator.service.js
- services/order/src/invoices/invoices.validation.js
- services/order/src/invoices/invoices.route.js

**Consumer Features (2 features):**

**View invoice:**
- Endpoint: GET /api/invoices/order/:orderNumber
- Fetch invoice record for order
- Return invoice details
- Include PDF URL if generated
- Show totals breakdown
- Show tax summary

**Download invoice PDF:**
- Endpoint: GET /api/invoices/:invoiceNumber/download
- Check if PDF already generated
- If not, generate PDF on demand
- Upload PDF to Cloudinary
- Store pdf_url in invoice record
- Return PDF download URL
- Set content-disposition header for download

**Admin Features (7 features):**

**Generate invoice:**
- Endpoint: POST /api/admin/invoices
- Automatically triggered on order confirmation
- Generate unique invoice number (INV-YYYY-NNNNNN)
- Set type as sale
- Store totals breakdown
- Store billing address snapshot
- Calculate tax summary by HSN code
- Include CGST, SGST, IGST based on state
- Store GSTIN if customer provided
- Mark as draft initially
- Mark as issued when order confirmed

**Generate credit note:**
- Endpoint: POST /api/admin/invoices/credit-note
- Create for returns and refunds
- Set type as credit_note
- Calculate credit amount
- Reference original invoice
- Sequential credit note number format

**Customize invoice template:**
- Endpoint: PUT /api/admin/invoices/template
- Store template configuration in settings
- Allow logo upload
- Configure header text, footer, terms
- Store GST registration details
- Configure tax display format

**Add GSTIN to invoice:**
- For B2B orders
- Collect GSTIN during checkout if provided
- Validate GSTIN format
- Include in invoice PDF
- Show GST-compliant format

**Email invoice to customer:**
- Endpoint: POST /api/admin/invoices/:invoiceNumber/email
- Generate PDF if not exists
- Send via notification service
- Attach PDF
- Send to order email
- Log email sent

**Bulk download invoices:**
- Endpoint: POST /api/admin/invoices/bulk-download
- Filter by date range, order IDs
- Generate all PDFs if not exist
- Create ZIP archive
- Return ZIP download link

**View tax summary:**
- Endpoint: GET /api/admin/invoices/tax-summary
- Filter by date range
- Aggregate tax collected by type (CGST, SGST, IGST)
- Group by HSN code
- Calculate totals
- Return tax report for filing

**PDF Generation Service:**
- Use library like pdfkit or puppeteer
- Template-based generation
- Include company logo and details
- Include invoice number and date
- Include billing address
- Include item table with HSN, quantity, rate, tax, amount
- Include tax summary table
- Include payment details
- Include terms and conditions
- Generate QR code for UPI payment if pending
- Upload to Cloudinary
- Return URL

---

## 3. Service Integration Requirements

### 3.1 Inventory Service Integration

**Cart Module:**
- Check stock availability before adding items
- Create inventory reservations on add to cart
- Update reservation quantity on cart update
- Release reservations on item removal
- Release reservations on cart expiry

**Checkout Module:**
- Extend reservations to checkout TTL
- Validate stock before order placement

**Orders Module:**
- Convert reservations to sale on order creation
- Update inventory quantities
- Create inventory adjustments for sales
- Return inventory on order cancellation
- Return inventory on approved returns

**API Endpoints to Call:**
- GET /api/stock/check/:variantId - Check availability
- POST /api/reservations - Create reservation
- PUT /api/reservations/:id - Update reservation quantity
- DELETE /api/reservations/:id - Release reservation
- POST /api/reservations/convert - Convert to sale
- POST /api/admin/adjustments/return - Return stock

---

### 3.2 Pricing & Promotions Service Integration

**Cart Module:**
- Fetch automatic discounts applicable to cart
- Validate coupon codes
- Calculate coupon discount
- Check free gift rules eligibility
- Apply tier discounts based on cart value

**Checkout Module:**
- Snapshot applied coupons and discounts
- Validate coupons still valid at checkout

**Orders Module:**
- Store coupon usage via Pricing Service
- Record discount redemption

**API Endpoints to Call:**
- POST /api/coupons/validate - Validate coupon
- GET /api/automatic-discounts/apply - Get auto discounts
- GET /api/tier-discounts/calculate - Calculate tier discount
- GET /api/free-gifts/eligible - Check free gift eligibility
- POST /api/coupons/usage - Record coupon usage

---

### 3.3 Catalog Service Integration

**Cart Module:**
- Fetch product details for cart items
- Validate product and variant exist
- Get product images, names, SKUs
- Get cross-sell recommendations

**Orders Module:**
- Snapshot product details in order items
- Validate products still active for reorder

**API Endpoints to Call:**
- GET /api/products/:productId - Get product details
- GET /api/products/:productId/variants/:variantId - Get variant details
- GET /api/products/:productId/related - Get related products
- POST /api/products/batch - Get multiple products in one call

---

### 3.4 Shipping Service Integration

**Checkout Module:**
- Validate pincode serviceability
- Fetch available shipping methods for address
- Get shipping rates
- Get estimated delivery dates

**Orders Module:**
- Create shipment on order fulfillment
- Get tracking information
- Handle shipment status updates

**Returns Module:**
- Schedule return pickup
- Create return shipment

**API Endpoints to Call:**
- GET /api/pincode/:pincode/serviceability - Check deliverability
- POST /api/shipping-methods/calculate - Get rates for address
- POST /api/shipments - Create shipment
- GET /api/shipments/:id/tracking - Get tracking info
- POST /api/shipments/return-pickup - Schedule pickup

---

### 3.5 Auth Service Integration

**All Modules:**
- Authenticate user requests via JWT
- Get user details for orders
- Validate admin users for admin endpoints
- Log admin actions in audit trail

**Cart Module:**
- Merge guest cart on login

**API Endpoints to Call:**
- GET /api/users/:userId - Get user details
- GET /api/admin/users/:adminId - Get admin details
- POST /api/audit-logs - Create audit entry

---

### 3.6 Engagement Service Integration

**Cart Module:**
- Move items to wishlist

**Orders Module:**
- Issue loyalty points on order completion
- Redeem loyalty points at checkout
- Issue store credits for refunds
- Deduct store credits from order total
- Send order notifications

**Returns Module:**
- Send return request notifications

**API Endpoints to Call:**
- POST /api/wishlist/add - Add to wishlist
- POST /api/loyalty/earn - Issue points
- POST /api/loyalty/redeem - Redeem points
- POST /api/store-credits/issue - Issue credits
- POST /api/store-credits/deduct - Deduct credits
- POST /api/notifications/send - Send notification

---

## 4. External Service Integration

### 4.1 Razorpay Payment Gateway

**Setup:**
- Create Razorpay account
- Get API keys (key_id, key_secret)
- Store in environment variables
- Configure webhook URL
- Verify webhook signatures

**Integration Points:**
- Create order before payment
- Process payment via Razorpay Checkout
- Handle payment callbacks
- Process refunds via API
- Receive webhook notifications
- Reconcile settlements

**Libraries:**
- razorpay npm package
- crypto for signature verification

---

### 4.2 PDF Generation

**Options:**
- pdfkit: Node.js library for PDF generation
- puppeteer: Headless Chrome for HTML to PDF
- wkhtmltopdf: Command-line tool

**Implementation:**
- Create HTML template for invoice
- Populate with order data
- Generate PDF
- Upload to Cloudinary
- Store URL in database

---

## 5. Data Validation Strategy

**Validation Layers:**

**Schema Level:**
- Mongoose schema validation
- Required fields enforcement
- Type validation
- Enum validation
- Min/max constraints

**Route Level:**
- Joi validation middleware
- Request body validation
- Query parameter validation
- Path parameter validation

**Business Logic Level:**
- Stock availability validation
- Price calculation validation
- Status transition validation
- Policy compliance validation

**Validation Files Structure:**
Each module has validation file with Joi schemas:
- createSchema for POST endpoints
- updateSchema for PUT endpoints
- querySchema for GET with query params

---

## 6. Error Handling Strategy

**Error Types:**

**Validation Errors:**
- Return 400 Bad Request
- Include field-specific error messages
- Use Joi validation results

**Not Found Errors:**
- Return 404 Not Found
- Clear message about missing resource

**Business Logic Errors:**
- Return 400 Bad Request
- Explain why operation not allowed
- Example: Cannot cancel shipped order

**External Service Errors:**
- Return 502 Bad Gateway
- Log full error for debugging
- Generic message to user
- Implement retry logic

**Database Errors:**
- Return 500 Internal Server Error
- Log full error
- Generic message to user

**All errors use sendResponse utility:**
- Consistent response format
- Proper HTTP status codes
- Error logged with context

---

## 7. Background Jobs and Scheduled Tasks

**Cart Cleanup Job:**
- Frequency: Every 10 minutes
- Task: Mark expired carts as abandoned
- Release inventory reservations
- Update cart status

**Checkout Session Cleanup:**
- Frequency: Every 5 minutes
- Task: Expire old checkout sessions
- Release extended reservations
- Update session status to failed

**Order Status Sync:**
- Frequency: Every hour
- Task: Sync shipment status from Shipping Service
- Update order status based on shipment
- Send delivery notifications

**Payment Reconciliation:**
- Frequency: Daily
- Task: Reconcile payments with Razorpay
- Identify discrepancies
- Generate report for manual review

**Invoice Generation:**
- Triggered: On order confirmation
- Async job to generate PDF
- Upload to Cloudinary
- Update invoice record

**Abandoned Cart Email:**
- Frequency: Daily
- Task: Find carts abandoned 24 hours ago
- Send reminder email via Engagement Service
- Track email sent to avoid duplicates

**Implementation:**
- Use node-cron for scheduling
- Create scripts/scheduled-jobs.js
- Import job functions from modules
- Log job execution and results

---

## 8. Testing Strategy

**Unit Tests:**
- Test individual controller functions
- Mock database calls
- Mock external service calls
- Test validation schemas
- Test business logic functions

**Integration Tests:**
- Test complete API endpoints
- Use test database
- Test module interactions
- Test external service mocks

**End-to-End Tests:**
- Test complete user flows
- Cart to checkout to order
- Payment processing
- Order cancellation
- Return and refund process

**Load Tests:**
- Test concurrent cart operations
- Test high order volume
- Test payment webhook handling
- Test PDF generation under load

**Manual Testing Scenarios:**
- Add items to cart, apply coupon, checkout
- Guest checkout flow
- Multiple payment method tests
- Order cancellation before shipment
- Full return and refund flow
- Partial refund flow
- Invoice generation and download

---

## 9. Security Considerations

**Authentication:**
- JWT validation on all protected endpoints
- User-specific data access control
- Admin role verification for admin endpoints

**Authorization:**
- Users can only access own carts and orders
- Admin access to all data
- Role-based permissions for admin actions

**Data Protection:**
- Never store full card details
- Store only masked data in method_details
- Encrypt sensitive fields if needed
- PCI DSS compliance for payment handling

**API Security:**
- Rate limiting on all endpoints
- Request size limits
- Webhook signature verification
- Idempotency key validation

**Input Validation:**
- Joi schemas on all inputs
- Sanitize user input
- Prevent injection attacks
- Validate file uploads

**Audit Trail:**
- Log all admin actions
- Track order status changes
- Track payment status changes
- Immutable audit records

---

## 10. Performance Optimization

**Database Optimization:**
- Proper indexing on all foreign keys
- Compound indexes for common queries
- Pagination on all list endpoints
- Lean queries where possible
- Selective field population

**Caching Strategy:**
- Cache product details from Catalog Service
- Cache shipping methods for pincodes
- Cache discount rules
- Use Redis for session data
- TTL-based cache invalidation

**Query Optimization:**
- Avoid N+1 queries
- Use aggregation for analytics
- Batch operations where possible
- Limit population depth

**Response Optimization:**
- Return only required fields
- Paginate large lists
- Compress responses
- Use ETags for caching

---

## 11. Monitoring and Logging

**Application Logging:**
- Log all requests with context
- Log external service calls
- Log errors with stack traces
- Use consistent log format
- Prefix logs with module name

**Metrics to Track:**
- Cart abandonment rate
- Checkout completion rate
- Average order value
- Payment success rate
- Refund rate
- Return rate
- Order processing time

**Alerts:**
- Payment failures spike
- High cart abandonment
- Database connection issues
- External service downtime
- Queue backlog

**Health Checks:**
- /api/health endpoint
- Check database connectivity
- Check external service connectivity
- Return service status

---

## 12. Deployment Plan

**Phase 1: Models and Database Setup**
- Create all 10 model files
- Define schemas with validation
- Set up indexes
- Test database connections
- Seed test data

**Phase 2: Cart Module**
- Implement cart controllers
- Implement cart validation
- Implement cart routes
- Test cart operations
- Test inventory integration

**Phase 3: Checkout Module**
- Implement checkout controllers
- Implement checkout validation
- Implement checkout routes
- Test checkout flow
- Test shipping integration

**Phase 4: Orders Module**
- Implement order controllers
- Implement order validation
- Implement order routes
- Test order creation
- Test status management

**Phase 5: Payments Module**
- Implement payment controllers
- Integrate Razorpay SDK
- Implement webhook handler
- Test payment flows
- Test all payment methods

**Phase 6: Refunds Module**
- Implement refund controllers
- Implement refund validation
- Implement refund routes
- Test refund processing
- Test gateway refunds

**Phase 7: Returns Module**
- Implement return controllers
- Implement return validation
- Implement return routes
- Test return flow
- Test return-refund integration

**Phase 8: Invoices Module**
- Implement invoice controllers
- Implement PDF generation
- Implement invoice routes
- Test invoice generation
- Test PDF download

**Phase 9: Background Jobs**
- Implement scheduled tasks
- Test cart cleanup
- Test checkout cleanup
- Test payment reconciliation
- Set up cron jobs

**Phase 10: Testing and Documentation**
- Write comprehensive tests
- Document all API endpoints
- Create Postman collection
- Create deployment guide
- Create troubleshooting guide

---

## 13. API Documentation Structure

**For Each Endpoint Document:**
- Full route path
- HTTP method
- Authentication required
- Request headers
- Request body schema
- Query parameters
- Path parameters
- Success response format
- Error response format
- Example requests
- Example responses
- Business rules
- Related endpoints

**Documentation Locations:**
- README.md in service root
- JSDoc comments on controllers
- Postman collection export
- API documentation site (optional)

---

## 14. Migration and Rollback Plan

**Database Migrations:**
- Version control schema changes
- Create migration scripts
- Test on staging environment
- Backup before production migration
- Rollback plan for each migration

**Code Deployment:**
- Deploy to staging first
- Run automated tests
- Manual smoke testing
- Deploy to production
- Monitor for errors
- Rollback procedure if needed

**Data Integrity:**
- Validate data after migration
- Check foreign key relationships
- Verify calculated fields
- Test critical user flows

---

## 15. Success Criteria

**Functional Completeness:**
- All 12 entities implemented
- All 90 features working
- All API endpoints documented
- All validations in place

**Performance:**
- Cart operations under 200ms
- Checkout flow under 500ms
- Order creation under 1s
- Payment processing under 3s
- List endpoints under 300ms

**Reliability:**
- 99.9 percent uptime
- Zero data loss
- All transactions atomic
- Complete audit trail

**Integration:**
- All service integrations working
- Razorpay integration stable
- PDF generation reliable
- Webhooks processing correctly

**Security:**
- No security vulnerabilities
- PCI DSS compliance
- All inputs validated
- Audit trail complete

**Documentation:**
- Complete API documentation
- Setup guide written
- Deployment guide written
- Troubleshooting guide written

---

## 16. Post-Implementation Tasks

**Monitoring Setup:**
- Configure application monitoring
- Set up error tracking
- Configure performance monitoring
- Set up uptime monitoring

**Analytics Setup:**
- Track cart abandonment
- Track checkout funnel
- Track payment methods
- Track refund reasons
- Track return reasons

**Optimization:**
- Analyze slow queries
- Optimize hot paths
- Add caching where needed
- Tune database indexes

**Maintenance:**
- Regular backup verification
- Log rotation setup
- Database cleanup jobs
- Performance monitoring

---

**End of Implementation Plan**
