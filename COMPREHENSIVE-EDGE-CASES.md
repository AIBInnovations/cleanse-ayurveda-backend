# COMPREHENSIVE EDGE CASES AND TEST SCENARIOS
## Cleanse Ayurveda E-Commerce Platform

---

## PART 1: CUSTOMER-FACING SCENARIOS

### 1.1 USER REGISTRATION AND AUTHENTICATION

#### Basic Registration Flows
- User registers with phone number only, no email provided
- User registers with email only, no phone provided
- User registers with both phone and email
- User attempts registration with already registered phone number
- User attempts registration with already registered email
- User provides invalid phone number format
- User provides invalid email format
- Phone number changes after registration
- Email changes after registration

#### Firebase OTP Authentication
- User requests OTP for login
- OTP expires before user enters it
- User enters wrong OTP code
- User requests multiple OTPs in quick succession
- User requests OTP, then tries password login
- Firebase service unavailable during OTP generation
- OTP arrives delayed by several minutes
- User has no internet connectivity after requesting OTP
- Phone number not registered but tries OTP login
- Phone number verification status changes mid-session

#### Password Authentication
- User sets up password authentication in addition to OTP
- User forgets password and requests reset
- Password reset token expires before use
- User clicks reset link multiple times
- User changes password while logged in from another device
- Password reset requested but user remembers old password
- Minimum password strength not met
- Password contains special characters that need escaping
- User copies password with trailing spaces
- Password change forced by admin

#### Session Management
- User logs in from multiple devices simultaneously
- User logs in from same device, different browsers
- Session expires while user is actively browsing
- Session expires while user is filling checkout form
- Access token expires during API call
- Refresh token expires, needs re-authentication
- User logs out from one device, other sessions remain
- User requests emergency logout from all devices
- Session hijacking attempt detected
- User clears browser cookies mid-session
- Remember me option selected vs not selected
- Session TTL cleanup delays
- Device info missing or malformed in session

#### Account Status and Lifecycle
- User account suspended by admin while logged in
- User account suspended while having active orders
- User requests account deletion
- User requests account deletion with pending orders
- User requests account deletion with pending refunds
- Terms and conditions updated, user must re-accept
- Privacy policy updated, user must re-acknowledge
- User marketing consent changes
- User opts out of all communications
- User profile incomplete, tries to checkout
- User verification status incomplete
- User with unverified email tries email-based features
- User with unverified phone tries SMS notifications

---

### 1.2 BROWSING AND PRODUCT DISCOVERY

#### Product Listing
- User views empty product list (no products published)
- User views product list with one product
- User views product list with 1000+ products
- User scrolls through paginated product list
- User reaches last page of products
- Product added to catalog while user browsing
- Product removed from catalog while user browsing
- Product price changes while user viewing list
- Product goes out of stock while user viewing list
- Product featured status changes during browsing
- Product archived while user on product listing page
- User applies filters, no products match
- User searches, no results found
- User searches with special characters in query

#### Product Details
- User views product with no images
- User views product with broken image links
- User views product with no description
- User views product with very long description
- User views product with no variants
- User views product with single variant
- User views product with 50+ variants
- User views product that just went out of stock
- User views product with incorrect price display
- Product deleted while user on detail page
- Product status changes to draft while viewing
- Product brand deleted while viewing product
- Product category deleted while viewing product
- User refreshes page, price has changed
- Rating and review count out of sync

#### Search and Filtering
- User searches for product name
- User searches with typos
- User searches with partial product name
- User searches with SKU
- User applies single filter
- User applies multiple filters simultaneously
- User clears filters
- User applies filter with zero results
- Search index out of sync with database
- Search service unavailable
- Special characters in search query
- Search query exceeds maximum length
- User searches for deleted products
- Search results cached, shows stale data

#### Categories and Collections
- User browses category with no products
- User browses nested categories
- User browses category, all products out of stock
- Category image missing or broken
- User views collection that expired
- Collection rules changed, products no longer match
- Parent category deleted, child categories orphaned
- Category slug collision
- User navigates deep category tree

#### Brands
- User views brand with no products
- User views brand page, brand logo missing
- Brand deactivated while user browsing
- Brand deleted, products still associated

---

### 1.3 SHOPPING CART

#### Adding Items to Cart
- User adds first item to empty cart
- User adds same variant twice (quantity should increase)
- User adds 50th item to cart (at limit)
- User attempts to add 51st item (should fail)
- User adds item with quantity 1
- User adds item with quantity 999 (maximum)
- User attempts to add item with quantity 1000 (should fail)
- User adds out of stock item
- User adds item with only 2 in stock, requests 5
- User adds item, product deleted before checkout
- User adds item, product archived before checkout
- User adds variant, variant deleted before checkout
- User adds variant, variant deactivated before checkout
- User adds bundle product
- User adds free gift manually (should fail)
- Product price changes after adding to cart
- Product goes out of stock after adding to cart

#### Cart Operations
- User views empty cart
- User updates item quantity to higher value
- User updates item quantity to lower value
- User updates quantity to 0 (should remove item)
- User updates quantity to 1000 (should fail)
- User removes single item from cart
- User removes last item from cart
- User clears entire cart
- Multiple cart operations in quick succession
- User has multiple tabs, modifies cart in both
- Cart modified by another session (multi-device scenario)
- Cart updated while checkout in progress

#### Cart Totals and Calculations
- Cart subtotal calculation with multiple items
- Cart with mixed regular and discounted items
- Line total precision errors (floating point)
- Grand total calculation mismatch
- Currency conversion scenarios
- Very small amounts (0.01) in cart
- Very large amounts in cart
- Cart with only free items
- Cart total exactly at minimum order value
- Cart total just below minimum order value

#### Cart Persistence and Expiry
- User logs out, cart persists
- User logs back in, cart restored
- Cart expires after 72 hours of inactivity
- Cart expires during active checkout session
- User adds items, waits 71 hours, adds more items (TTL reset)
- Cart status changes to abandoned
- Abandoned cart recovery flow
- Cart deleted manually vs auto-expired
- Guest cart without user session
- Guest cart session expires
- Guest logs in, cart should merge
- Multiple carts for same user (should prevent)

#### Cart Stock Validation
- Item in cart goes out of stock
- Item in cart stock reduced but still available
- Item in cart backorder status changes
- Reserved quantity exceeds available quantity
- Warehouse deactivated, item in cart from that warehouse
- Multi-warehouse scenario, stock split across warehouses

---

### 1.4 COUPONS AND DISCOUNTS

#### Coupon Application
- User applies valid coupon code
- User applies expired coupon
- User applies coupon not yet valid (future start date)
- User applies invalid coupon code
- User applies already used coupon (per-user limit reached)
- User applies coupon at total usage limit
- Coupon code case sensitivity (should be case-insensitive)
- Coupon code with leading/trailing spaces
- Cart subtotal below minimum order value for coupon
- Coupon max discount cap applied
- First order coupon applied to returning customer
- Customer segment coupon applied to non-eligible customer

#### Coupon Types
- Percentage discount coupon (10% off)
- Fixed amount discount coupon (100 Rs off)
- Free shipping coupon
- Coupon with 100% discount (free order)
- Coupon discount exceeds cart subtotal

#### Coupon Eligibility and Rules
- Coupon applies to specific products only
- Coupon excludes specific products
- Coupon applies to specific collections
- Product in cart not eligible for coupon
- All products in cart excluded from coupon
- Coupon applies to cart but no eligible items
- Coupon product eligibility changes during checkout
- Collection membership changes, affects coupon

#### Stackable Coupons
- User applies multiple stackable coupons
- User attempts to apply non-stackable coupon with existing coupon
- User applies three or more coupons
- Coupon priority conflicts
- Total discount exceeds cart value with stacked coupons

#### Auto-Applied Coupons
- Auto-apply coupon triggers on cart value threshold
- Multiple auto-apply coupons trigger simultaneously
- Auto-apply coupon conflicts with manual coupon
- Auto-apply coupon priority ordering

#### Coupon Removal
- User removes applied coupon
- Coupon removed, cart total recalculated
- Coupon deactivated by admin while in use
- Coupon deleted while in active cart
- Coupon expiry during checkout

#### Coupon Usage Tracking
- Coupon usage count incremented correctly
- Concurrent coupon applications at usage limit
- Usage count out of sync with actual uses
- Per-user usage limit enforcement
- Total usage limit enforcement

---

### 1.5 AUTOMATIC DISCOUNTS AND PROMOTIONS

#### Automatic Discount Application
- Cart meets automatic discount criteria
- Multiple automatic discounts eligible
- Automatic discount with higher priority applied first
- Automatic discount combined with manual coupon
- Automatic discount on specific products
- Automatic discount on specific collections
- Automatic discount removed when criteria not met
- Automatic discount scheduled start time
- Automatic discount scheduled end time
- Discount amount calculation errors

#### Tier Discounts
- Cart value reaches tier threshold
- Higher tier threshold reached, discount upgrades
- Cart value drops below tier threshold
- Quantity-based tier discounts
- Value-based tier discounts
- Tier discount combined with other promotions

#### Free Gift Rules
- Cart meets free gift criteria
- Free gift automatically added
- User cannot manually remove free gift
- Multiple free gifts eligible
- Free gift out of stock
- Free gift variant changes
- Cart drops below threshold, gift removed
- Gift item counted in quantity but not price

---

### 1.6 CHECKOUT PROCESS

#### Checkout Initiation
- User initiates checkout with empty cart
- User initiates checkout from cart page
- User initiates checkout from product page (buy now)
- Multiple checkout sessions initiated
- Previous checkout session still active
- Checkout session expires before completion
- User navigates away during checkout
- User closes browser during checkout
- Cart modified after checkout initiation

#### Address Management During Checkout
- User has no saved addresses, must add new
- User selects existing shipping address
- User adds new shipping address during checkout
- User edits address during checkout
- User deletes address during checkout (should fail if in use)
- Billing address same as shipping
- Billing address different from shipping
- Address validation fails (invalid pincode)
- Address marked as unverified
- Address marked as flagged/suspicious
- Multiple default addresses conflict
- Address format validation for different countries
- Very long address fields
- Special characters in address
- Landmark field too long

#### Shipping Method Selection
- No shipping methods available for address
- Single shipping method available
- Multiple shipping methods available
- User selects cheapest shipping
- User selects fastest shipping
- Shipping cost changes after method selection
- Shipping method unavailable after selection
- Address change requires shipping method re-selection
- Flat rate shipping
- Weight-based shipping calculation
- Pincode-based serviceability check fails

#### Order Review
- User reviews order summary
- User sees applied discounts
- User sees applied coupons
- User sees tax breakdown (CGST/SGST/IGST)
- User sees shipping charges
- Grand total calculation verification
- Order review with gift order option
- Gift message added (character limit)
- Gift message with special characters
- Customer notes added
- Terms and conditions checkbox unchecked

#### Payment Method Selection
- User selects credit card payment
- User selects debit card payment
- User selects UPI payment
- User selects net banking
- User selects wallet payment
- User selects Cash on Delivery
- COD not available for high-value orders
- COD not available for certain pincodes
- Payment method unavailable
- Payment gateway selection

---

### 1.7 PAYMENT PROCESSING

#### Payment Initiation
- Payment initiated successfully
- Payment gateway timeout
- Payment gateway returns error
- Idempotency key prevents duplicate payment
- User initiates payment, closes window
- User initiates payment, back button pressed
- Payment amount mismatch with order total
- Currency mismatch
- Payment method details invalid
- Card declined
- Insufficient balance
- Bank server unavailable
- Payment pending state

#### Payment Completion
- Payment captured successfully
- Payment authorized but not captured
- Partial payment capture
- Payment success but webhook delayed
- Payment success but order not confirmed
- Payment failed, order reverted to pending
- Payment failed, inventory released
- Payment cancelled by user
- Payment timeout after 15 minutes
- Multiple payment attempts for same order

#### Payment Webhook Handling
- Webhook received on time
- Webhook received with delay (hours later)
- Duplicate webhook received
- Webhook signature verification fails
- Webhook for cancelled payment
- Webhook for refunded payment
- Webhook order not found
- Webhook received out of sequence

#### Cash on Delivery
- COD selected as payment method
- COD order confirmation process
- COD order amount within limit
- COD order amount exceeds limit
- COD unavailable for customer location
- COD unavailable for product type
- COD payment collection on delivery
- COD payment failed on delivery

---

### 1.8 ORDER MANAGEMENT

#### Order Placement
- Order placed successfully
- Order number generation
- Order confirmation email sent
- Order confirmation SMS sent
- Order without email (SMS only)
- Order without phone (email only)
- Order placed with guest checkout
- Order placed by authenticated user
- Order placed with saved payment method
- Order placed with new payment method

#### Order Status Tracking
- Order status: Pending
- Order status: Confirmed
- Order status: Processing
- Order status: Shipped
- Order status: Out for Delivery
- Order status: Delivered
- Order status: Cancelled
- Order status: Returned
- Order status: Refunded
- Order status transition validation
- Invalid status transition attempt
- Status rollback attempt

#### Order Modifications
- User attempts to modify confirmed order (should fail)
- User attempts to cancel pending order
- User attempts to cancel confirmed order
- User attempts to cancel processing order
- User attempts to cancel shipped order (should fail)
- Order cancellation reason required
- Cancellation after order dispatched
- Partial order cancellation (split orders)

#### Order Delivery
- Order delivered successfully
- Delivery confirmation without shipment (should fail)
- Delivery delayed beyond estimated date
- Delivery attempted but failed
- Delivery rescheduled
- Delivery address unreachable
- Customer not available for delivery
- Delivery signature capture

#### Order Invoicing
- Invoice generated on order confirmation
- Invoice sent to customer email
- Invoice PDF download
- Invoice with GST breakdown
- Credit note for returns
- Invoice for partial refund
- Invoice cancellation
- Duplicate invoice generation

#### Multiple Order Scenarios
- User has no orders
- User has single order
- User has multiple orders
- User views order history
- User filters orders by status
- User filters orders by date range
- User searches orders by order number
- User exports order history
- Order list pagination
- Order details for specific order

---

### 1.9 RETURNS AND REFUNDS

#### Return Request Initiation
- User requests return within 7-day window
- User requests return on day 8 (should fail)
- User requests return at exactly 7 days 23:59:59
- User requests return for undelivered order (should fail)
- User requests return for cancelled order (should fail)
- User requests partial return (some items)
- User requests full return (all items)
- User provides return reason
- User uploads return item images
- User provides return notes
- Return request without order delivery (should fail)

#### Return Item Selection
- User selects all items for return
- User selects single item from multi-item order
- User returns same item multiple times (should fail)
- User return quantity exceeds ordered quantity (should fail)
- User return quantity exceeds delivered quantity (should fail)
- Item not eligible for return (non-returnable category)
- Item damaged during use, return requested
- Item opened/used, return policy violation

#### Return Approval/Rejection
- Admin approves return request
- Admin rejects return request with reason
- Automatic return approval based on rules
- Return approval after inspection
- Return rejected due to quality check failure
- Return approved partially (some items rejected)

#### Return Pickup
- Pickup scheduled successfully
- Pickup date and time slot selection
- Pickup address same as delivery address
- Pickup address different from delivery address
- Pickup attempted but customer unavailable
- Pickup rescheduled
- Pickup cancelled by customer
- Pickup failed multiple times

#### Return in Transit and Receipt
- Return picked up, in transit to warehouse
- Return tracking number generated
- Return received at warehouse
- Return received with damaged items
- Return received with missing items
- Return received with wrong items
- Return received after long delay

#### Return Inspection
- Quality inspection passed
- Quality inspection failed
- Item condition does not match description
- Item not original product
- Item tags removed
- Item packaging missing
- Inspection notes recorded

#### Refund Processing
- Refund initiated after inspection approval
- Refund to original payment method
- Refund to wallet
- Refund to bank account
- Refund processing time (5 days)
- Refund amount calculation for partial returns
- Refund includes shipping cost
- Refund excludes shipping cost
- Refund for COD orders
- Refund gateway failure
- Refund marked as completed
- Refund marked as failed

#### Return Cancellation
- User cancels return before pickup
- User cancels return after pickup (should fail)
- Admin cancels return request
- Automatic return cancellation after timeout

---

### 1.10 INVENTORY AND STOCK

#### Stock Availability
- Product in stock, available for purchase
- Product low stock warning displayed
- Product out of stock, cannot add to cart
- Product backorder allowed, can order despite zero stock
- Product backorder limit reached
- Backorder not allowed for product
- Stock level updates in real-time
- Stock reserved during checkout
- Stock reservation expires after 30 minutes
- Stock released on cart abandonment
- Stock deducted on order confirmation
- Stock restored on order cancellation
- Stock restored on return completion

#### Stock Validation During Purchase
- User adds item to cart, stock available
- User proceeds to checkout, stock still available
- User completes payment, stock still available
- Concurrent users competing for last item
- Stock depleted between cart and checkout
- Stock depleted between checkout and payment
- Stock validation race condition
- Inventory reservation conflicts

#### Low Stock Alerts
- Stock drops below threshold
- Admin notified of low stock
- Low stock badge shown on product page
- Reorder point reached
- Automatic reorder triggered (if configured)

#### Multi-Warehouse Inventory
- Item available in multiple warehouses
- Item available in single warehouse only
- Warehouse selection based on customer location
- Warehouse out of stock, check other warehouses
- Split fulfillment across warehouses (not currently supported)
- Warehouse deactivation, inventory transfer needed

---

### 1.11 NOTIFICATIONS AND COMMUNICATIONS

#### Order-Related Emails
- Order confirmation email
- Order shipped email with tracking
- Order out for delivery email
- Order delivered email
- Order cancelled email
- Return approved email
- Refund initiated email
- Refund completed email
- Payment failed email

#### Order-Related SMS
- Order confirmation SMS
- Order shipped SMS with tracking link
- Order delivered SMS
- OTP for phone verification
- OTP for login

#### Marketing Communications
- Promotional email campaigns
- Abandoned cart reminder email
- Product recommendation email
- Seasonal sale announcements
- User opted out of marketing emails
- User opted in only for SMS
- User opted in only for email
- User unsubscribe link clicked

#### Notification Preferences
- User opts in to all notifications
- User opts out of all notifications
- User opts out of marketing, keeps transactional
- User changes notification preferences mid-order
- Notification preferences applied retroactively

#### Notification Failures
- Email service unavailable (graceful degradation)
- SMS service unavailable (graceful degradation)
- Invalid email address, email bounces
- Invalid phone number, SMS fails
- Email marked as spam
- Notification delayed by hours
- Duplicate notifications sent

---

### 1.12 CUSTOMER PROFILE AND PREFERENCES

#### Profile Management
- User views profile information
- User updates first name
- User updates last name
- User updates email address
- Email address already in use (should fail)
- User updates phone number
- Phone number already in use (should fail)
- User uploads profile avatar
- User removes profile avatar
- User updates language preference
- User updates currency preference

#### Privacy and Data
- User requests data export
- User views data usage policy
- User requests account deletion
- Account deletion with pending orders
- Account deletion with completed orders
- Deleted account data retention policy
- User data anonymization on deletion

#### Marketing Preferences
- User subscribes to newsletter
- User unsubscribes from newsletter
- User opts in to SMS marketing
- User opts out of SMS marketing
- User opts in to WhatsApp updates
- User opts out of WhatsApp updates
- User opts in to push notifications
- User opts out of push notifications

---

### 1.13 SPECIAL SCENARIOS

#### Gift Orders
- User marks order as gift
- User adds gift message
- Gift message character limit (500)
- Gift message with special characters
- Gift message with emojis
- Gift receipt (hide prices)
- Gift wrapping option
- Gift order notification to sender only

#### Bulk/Wholesale Orders
- User adds large quantity (100+ units)
- Bulk pricing tier applied
- Wholesale customer discount
- Minimum order quantity for wholesale

#### Subscription/Recurring Orders
- User subscribes to monthly delivery
- Subscription payment processing
- Subscription delivery scheduling
- Subscription pause
- Subscription cancellation
- Subscription item out of stock handling
- Subscription payment failure retry

#### International Orders
- Customer shipping address in different country
- Currency conversion for international payment
- International shipping rates
- Customs duty calculation
- International return policy
- Cross-border payment restrictions

---

## PART 2: ADMIN-FACING SCENARIOS

### 2.1 ADMIN AUTHENTICATION AND ACCESS

#### Admin Login
- Admin logs in with email and password
- Admin login with incorrect password
- Admin login with non-existent email
- Admin account suspended, cannot login
- Admin force password change on first login
- Admin password reset request
- Admin password reset token expiry
- Multiple failed login attempts
- Admin session management across devices
- Admin session expiry during operation

#### Role-Based Access Control
- Super admin with all permissions
- Catalog manager with product permissions only
- Order manager with order permissions only
- Marketing manager with promotions permissions only
- Support agent with read-only access
- Finance manager with financial report access
- Admin attempts action without permission (should fail)
- Admin role changed mid-session
- Permission added to role mid-session
- Permission removed from role mid-session

#### Admin Account Management
- Create new admin account
- Admin creation requires creator reference
- Edit existing admin details
- Suspend admin account
- Reactivate suspended admin
- Delete admin account
- Prevent deletion of last super admin
- Admin self-modification restrictions
- Admin cannot change own role
- Admin cannot delete self
- Circular admin creation prevention

---

### 2.2 PRODUCT MANAGEMENT

#### Product Creation
- Create new simple product
- Create new variable product (with variants)
- Create new bundle product
- Product name required validation
- Product slug auto-generation
- Product slug manual override
- Product slug collision (should fail)
- Product SKU required validation
- Product SKU uniqueness validation
- Product SKU uppercase normalization
- Product description with rich text
- Product description exceeding limits
- Product without images
- Product with single image
- Product with multiple images
- Product image upload failure
- Product with video content
- Product category assignment
- Product multiple category assignment
- Primary category designation
- Product brand assignment
- Product without brand

#### Product Editing
- Edit product name
- Edit product description
- Edit product price
- Edit product SKU (should update references)
- Edit product slug (should handle redirects)
- Edit product status (draft/active/archived)
- Edit product featured flag
- Edit product tags
- Edit product SEO metadata
- Edit product attributes (skin type, concerns)
- Edit product HSN code
- Product editing conflict (simultaneous edits)

#### Product Variants
- Add variant to product
- Add multiple variants to product
- Set default variant
- Multiple default variants conflict
- Edit variant details
- Edit variant pricing
- Edit variant SKU
- Variant SKU uniqueness across products
- Delete variant
- Delete variant in active cart (should handle)
- Delete variant in pending order (should fail)
- Disable variant
- Variant inventory management
- Variant without inventory cannot be ordered

#### Product Media Management
- Upload product image
- Upload multiple images
- Set primary product image
- Reorder product images
- Delete product image
- Image file size limits
- Image format validation (JPG, PNG)
- Image dimensions validation
- Image optimization/compression
- Image CDN storage
- Broken image link handling
- Image URL expiry

#### Product Categorization
- Assign product to single category
- Assign product to multiple categories
- Set primary category
- Remove category assignment
- Category tree navigation
- Nested category assignment
- Parent category change affects child products
- Category deletion affects products

#### Product Status Management
- Publish product (draft to active)
- Unpublish product (active to draft)
- Archive product (active to archived)
- Restore archived product
- Soft delete product
- Permanently delete product (should be restricted)
- Bulk status change

#### Product Search and Filtering (Admin)
- Search products by name
- Search products by SKU
- Filter by brand
- Filter by category
- Filter by status
- Filter by stock status
- Filter by price range
- Filter by date created
- Combine multiple filters
- Export filtered results

#### Bulk Operations
- Bulk product import via CSV
- CSV validation errors
- Partial import success
- Bulk product export
- Bulk price update
- Bulk status change
- Bulk category assignment
- Bulk brand assignment
- Bulk delete (soft delete only)

---

### 2.3 CATALOG MANAGEMENT

#### Category Management
- Create root category
- Create child category
- Create nested category (multi-level)
- Category name required
- Category slug auto-generation
- Category slug uniqueness
- Category with description
- Category with image
- Category ordering/sorting
- Move category to different parent
- Delete empty category
- Delete category with products (should reassign)
- Delete category with children (should handle)
- Circular category relationship prevention

#### Brand Management
- Create new brand
- Brand name required
- Brand slug uniqueness
- Brand with logo
- Brand with description
- Brand with website URL
- Edit brand details
- Delete brand with no products
- Delete brand with products (should reassign or prevent)

#### Collection Management
- Create product collection
- Collection with manual product selection
- Collection with automatic rules
- Collection rule based on category
- Collection rule based on tags
- Collection rule based on price range
- Collection rule based on attributes
- Collection with date range validity
- Collection expired, products no longer shown
- Edit collection rules, products auto-update
- Delete collection

#### Bundle Management
- Create product bundle
- Bundle with 2 products minimum
- Bundle with multiple product variants
- Bundle pricing (sum of items vs custom)
- Bundle savings calculation
- Bundle with out of stock item
- Bundle item stock validation
- Bundle availability check
- Bundle expiry date
- Edit bundle composition
- Delete bundle with active orders

#### Ingredient Management
- Add ingredient to product
- Ingredient with scientific name
- Ingredient with common name
- Ingredient with benefits description
- Multiple ingredients per product
- Ingredient ordering/sequence
- Highlight key ingredients
- Remove ingredient from product

---

### 2.4 ORDER MANAGEMENT

#### Order Viewing and Search
- View all orders list
- Filter orders by status
- Filter orders by date range
- Filter orders by customer
- Filter orders by payment status
- Filter orders by fulfillment status
- Search by order number
- Search by customer name
- Search by customer phone
- Search by customer email
- Export orders to CSV
- Order list pagination
- Order sorting by date
- Order sorting by amount

#### Order Details
- View complete order details
- View customer information
- View shipping address
- View billing address
- View items ordered
- View payment information
- View shipment tracking
- View order timeline/history
- View applied discounts
- View tax breakdown
- View internal notes
- View customer notes

#### Order Status Management
- Confirm pending order
- Mark order as processing
- Mark order as shipped
- Mark order as delivered
- Mark order as cancelled
- Invalid status transition prevention
- Status change email notifications
- Status change with timestamp
- Status change by admin tracking
- Bulk status change for multiple orders

#### Order Modification (Admin)
- Add internal notes to order
- Edit internal notes
- Flag order for review
- Assign order to warehouse
- Assign order to fulfillment team
- Change order priority
- Split order for partial fulfillment (not supported yet)
- Merge orders (not supported yet)

#### Order Cancellation
- Cancel pending order
- Cancel confirmed order
- Cancel processing order
- Cannot cancel shipped order
- Cancellation reason required
- Refund processing on cancellation
- Inventory restoration on cancellation
- Notify customer of cancellation
- Cancellation by customer vs admin tracking

#### Order Fulfillment
- Create shipment for order
- Generate tracking number
- Update shipment status
- Add shipment notes
- Update estimated delivery date
- Mark as out for delivery
- Confirm delivery
- Failed delivery attempt
- Reschedule delivery
- Delivery proof of delivery

---

### 2.5 CUSTOMER MANAGEMENT

#### Customer Viewing
- View all customers list
- View customer details
- View customer order history
- View customer cart contents
- View customer addresses
- View customer payment methods
- View customer lifetime value
- View customer total orders
- View customer average order value
- Filter customers by registration date
- Filter customers by order count
- Filter customers by total spent
- Search customers by name
- Search customers by email
- Search customers by phone

#### Customer Account Actions
- Suspend customer account
- Reactivate customer account
- Delete customer account (should handle carefully)
- Reset customer password (admin initiated)
- Verify customer email manually
- Verify customer phone manually
- Add internal notes to customer profile
- Flag customer account
- Unflag customer account
- View customer flagging reason

#### Customer Segmentation
- Create customer segment
- Segment by order count
- Segment by total spent
- Segment by last order date
- Segment by registration date
- Segment by product purchased
- Segment by category preference
- Apply coupon to segment
- Target marketing campaign to segment

#### Customer Support Actions
- View customer support tickets (if implemented)
- Add note to customer account
- Track customer communication history
- View customer return history
- View customer refund history
- Customer credit management

---

### 2.6 INVENTORY MANAGEMENT

#### Warehouse Management
- Create new warehouse
- Warehouse with location details
- Warehouse with contact information
- Set default warehouse
- Set warehouse priority
- Activate warehouse
- Deactivate warehouse
- Transfer inventory between warehouses
- View warehouse stock levels
- Warehouse capacity management

#### Stock Management
- Add stock for product variant
- Add stock with warehouse specification
- Set initial stock quantity
- Update stock quantity
- Set low stock threshold
- Set reorder point
- Enable/disable backorders
- Set backorder limit
- View current stock level
- View reserved stock
- View available stock
- View stock value

#### Stock Adjustments
- Manual stock increase (restock)
- Manual stock decrease (shrinkage)
- Stock adjustment for damage
- Stock adjustment for return
- Stock adjustment for sale
- System stock adjustment
- Stock correction with reason
- View adjustment history
- Adjustment audit trail
- Approval workflow for adjustments (if required)

#### Stock Reservations
- View active reservations
- View reservation expiry
- Manually release reservation
- Reservation for order
- Reservation for cart
- Reservation timeout handling
- Concurrent reservation conflicts

#### Stock Alerts
- Low stock alert configuration
- Low stock email notifications
- Out of stock alert
- Backorder alert
- Negative stock alert (should not happen)
- Stock discrepancy alert

#### Inventory Reports
- Current stock levels report
- Stock movement report
- Stock valuation report
- Low stock items report
- Out of stock items report
- Dead stock report
- Inventory turnover report
- Reserved stock report
- Backorder report

---

### 2.7 PRICING AND PROMOTIONS

#### Coupon Management
- Create new coupon
- Coupon code generation
- Coupon code uniqueness validation
- Coupon name and description
- Set coupon type (percentage/fixed/free shipping)
- Set coupon value
- Set maximum discount cap
- Set minimum order value
- Set usage limit total
- Set usage limit per user
- Set coupon validity date range
- Set coupon applicability (all/specific products/collections)
- Coupon product/collection selection
- Coupon product/collection exclusion
- Set customer eligibility (all/first order/segments)
- Enable/disable coupon
- Enable coupon stacking
- Enable auto-apply
- Edit active coupon (should be careful)
- Deactivate coupon
- Delete coupon
- View coupon usage statistics
- View coupon redemption history
- Export coupon usage data

#### Automatic Discount Management
- Create automatic discount
- Discount name and description
- Set discount type
- Set discount value
- Set discount priority
- Set applicability rules
- Set product/collection scope
- Set customer eligibility
- Set date range
- Enable/disable discount
- Edit active discount
- Delete discount
- View discount application statistics

#### Tier Discount Management
- Create tier discount
- Value-based tier thresholds
- Quantity-based tier thresholds
- Multiple tier levels
- Tier discount values
- Tier applicability
- Customer segment eligibility
- Date range validity
- Edit tier discount
- Delete tier discount

#### Free Gift Rules
- Create free gift rule
- Set qualification criteria
- Set cart value threshold
- Set product/collection scope
- Select free gift products
- Multiple gift options
- Customer selection of gift (if multiple)
- Automatic gift addition
- Gift quantity limits
- Gift inventory management
- Edit gift rule
- Delete gift rule

#### Pricing Reports
- Discount usage report
- Coupon redemption report
- Promotion effectiveness report
- Revenue impact analysis
- Average discount per order
- Discount by product/category
- Discount by customer segment

---

### 2.8 FINANCIAL MANAGEMENT

#### Payment Management
- View all payments
- View payment details
- View payment gateway response
- Filter by payment status
- Filter by payment method
- Filter by date range
- View failed payments
- View pending payments
- Refund payment
- Partial refund processing
- View refund status
- View refund history

#### Invoice Management
- Generate invoice for order
- Regenerate invoice
- View invoice PDF
- Download invoice
- Send invoice to customer
- Create credit note for return
- Cancel invoice
- View invoice list
- Filter invoices by date
- Export invoices
- GST compliance reporting

#### Financial Reports
- Sales report by date
- Sales report by product
- Sales report by category
- Sales report by brand
- Revenue report
- Tax collected report
- Payment method breakdown
- Refund report
- Pending payment report
- Order value distribution
- Average order value trend
- Customer lifetime value report

#### Settlement and Reconciliation
- Daily settlement report
- Gateway reconciliation
- Payment gateway fees report
- Transaction reconciliation
- Dispute management
- Chargeback handling

---

### 2.9 RETURNS AND REFUNDS MANAGEMENT

#### Return Request Management
- View all return requests
- View pending return requests
- View approved returns
- View rejected returns
- View completed returns
- Filter by return status
- Filter by return date
- Filter by customer
- Search by order number
- Search by return number

#### Return Request Actions
- Approve return request
- Reject return request with reason
- Schedule pickup
- Update pickup status
- Mark return as received
- Conduct quality inspection
- Approve/reject after inspection
- Add inspection notes
- Add admin notes
- View return images uploaded by customer

#### Refund Processing
- Initiate refund for approved return
- Process full refund
- Process partial refund
- Refund amount calculation
- Refund shipping charges option
- Select refund method
- Update refund status
- Track refund processing
- Mark refund as completed
- Handle refund failure
- Retry failed refund

#### Return Reports
- Return rate by product
- Return rate by category
- Return reasons analysis
- Return processing time
- Refund processing time
- Quality rejection rate
- Pickup failure rate

---

### 2.10 REPORTING AND ANALYTICS

#### Sales Analytics
- Daily sales dashboard
- Weekly sales trends
- Monthly sales comparison
- Year-over-year growth
- Sales by product
- Sales by category
- Sales by brand
- Sales by region
- Best selling products
- Worst selling products
- Revenue trends
- Order volume trends

#### Customer Analytics
- New customer registrations
- Customer acquisition rate
- Customer retention rate
- Customer churn rate
- Repeat purchase rate
- Customer lifetime value
- Customer segmentation analysis
- Geographic distribution
- Device/platform usage

#### Product Analytics
- Product views
- Add to cart rate
- Cart abandonment rate
- Conversion rate by product
- Product performance by category
- Inventory turnover
- Dead stock identification
- Low performing products

#### Marketing Analytics
- Coupon redemption rate
- Discount effectiveness
- Campaign performance
- Email open rates
- Click-through rates
- Abandoned cart recovery rate
- Return on marketing spend

#### Operational Reports
- Order fulfillment time
- Shipping performance
- Delivery success rate
- Return rate
- Refund rate
- Customer support metrics
- Inventory health

---

### 2.11 CONTENT AND MEDIA MANAGEMENT

#### Media Library
- View all media files
- Upload new media
- Bulk upload media
- Delete media
- Media file size limits
- Media format validation
- Media organization/folders
- Media search
- Media tags
- Unused media cleanup

#### SEO Management
- Product SEO metadata
- Category SEO metadata
- Meta title optimization
- Meta description optimization
- Keyword management
- URL structure management
- Canonical URL handling
- Sitemap generation
- Robots.txt management

---

### 2.12 SYSTEM ADMINISTRATION

#### Settings Management
- General settings
- Store information
- Contact details
- Tax settings (GST rates)
- Shipping settings
- Payment gateway configuration
- Email templates
- SMS templates
- Notification settings
- Return policy settings
- Refund policy settings
- Terms and conditions
- Privacy policy

#### User and Permission Management
- View all admins
- Create admin user
- Edit admin details
- Assign role to admin
- Change admin status
- Force password change
- View admin activity log
- Create custom role
- Edit role permissions
- Delete role (if no users assigned)
- Permission matrix management

#### Audit Logging
- View audit logs
- Filter by user
- Filter by action type
- Filter by date range
- Filter by resource type
- Export audit logs
- Audit log retention policy

#### System Health
- Service health checks
- Database connection status
- External service status
- API response times
- Error rate monitoring
- Disk space monitoring
- Background job status

---

### 2.13 EDGE CASES IN ADMIN OPERATIONS

#### Data Integrity
- SKU collision across products
- Duplicate order numbers (should never happen)
- Missing order address snapshots
- Order total mismatch with items
- Payment amount mismatch with order
- Inventory quantity going negative
- Reserved quantity exceeding available
- Refund amount exceeding payment
- Multiple default variants
- Multiple default addresses
- Orphaned cart items
- Orphaned order items
- Session cleanup failures

#### Concurrent Operations
- Multiple admins editing same product
- Multiple admins processing same order
- Simultaneous coupon usage limit reached
- Concurrent stock adjustments
- Simultaneous order status changes
- Race condition in bulk operations
- Lock timeout in inventory updates

#### Bulk Operation Failures
- Bulk import with validation errors
- Partial bulk operation success
- Bulk delete with dependent records
- Bulk status change with invalid transitions
- Large file upload timeout
- Memory limits in bulk processing

#### Permission Conflicts
- Admin role changed during active session
- Permission removed while performing action
- Admin suspended while logged in
- Last super admin cannot be removed
- Admin attempting unauthorized operation

#### System Failures
- Database connection loss
- External service timeout
- Payment gateway unavailable
- Email service failure
- SMS service failure
- CDN/storage service failure
- Background job failure
- Cache invalidation issues

---

## PART 3: CRITICAL EDGE CASES

### 3.1 TIMING AND EXPIRY

- Cart expires exactly at checkout payment stage
- Checkout session expires one second before payment completion
- Inventory reservation expires during payment processing
- Coupon expires between cart and checkout
- OTP expires one second before user enters it
- Password reset token expires during password change
- Session expires during form submission
- Access token expires mid-API call
- Return window expires at midnight on 7th day
- Subscription renewal fails due to expired card

### 3.2 RACE CONDITIONS

- Two users reserve last item simultaneously
- Multiple coupons reach usage limit at same time
- Concurrent cart updates from different devices
- Simultaneous order status updates by different admins
- Parallel inventory adjustments causing negative stock
- Refresh token used concurrently from multiple sessions
- Multiple checkout sessions for same cart
- Concurrent refund requests for same order
- Multiple returns for same order items
- Simultaneous default address assignments

### 3.3 DATA CORRUPTION

- Product deleted while in active cart
- Variant deleted while in pending order
- Category deleted, products become uncategorized
- Brand deleted, products become brand-less
- Address deleted while referenced in order
- Warehouse deleted with active inventory
- Coupon deleted while in active cart
- Payment method removed while payment processing
- Admin deleted who created audit logs
- Circular references in category tree

### 3.4 PAYMENT EDGE CASES

- Payment captured but order not updated
- Order confirmed but payment pending
- Double payment due to retry
- Refund initiated but gateway fails
- Partial refund exceeds available amount
- Currency conversion errors
- Amount mismatch due to floating point precision
- Gateway webhook received hours late
- Gateway webhook received out of order
- Payment for already cancelled order

### 3.5 INVENTORY EDGE CASES

- Negative stock due to adjustment error
- Reserved quantity never released
- Stock deducted without reservation
- Backorder limit exceeded
- Multi-warehouse stock sync delay
- Inventory transfer in transit lost
- Stock added to deactivated warehouse
- Low stock alert not triggered
- Stock discrepancy between systems
- Inventory count mismatch with orders

### 3.6 ORDER LIFECYCLE EDGE CASES

- Order placed but never confirmed
- Order confirmed but never processed
- Order processed but never shipped
- Order shipped but never delivered
- Order delivered but marked as pending
- Status rollback after progression
- Status skipped (pending to shipped directly)
- Multiple simultaneous status changes
- Order modification after shipment
- Cancellation after delivery

### 3.7 CART AND CHECKOUT EDGE CASES

- Cart with 50 items at maximum limit
- Cart with zero priced items only
- Cart total goes negative due to discounts
- Cart currency changes mid-session
- Guest cart not merged on login
- Multiple active carts for same user
- Cart item price changes drastically during checkout
- All cart items go out of stock simultaneously
- Free gift eligibility changes between cart and checkout
- Shipping method unavailable after selection

### 3.8 COUPON AND PROMOTION EDGE CASES

- Coupon code with special characters
- Coupon discount exceeds cart value
- Multiple auto-apply coupons conflict
- Stackable coupons exceed total cart value
- Coupon applies to no items in cart
- First order coupon for repeat customer
- Customer segment changes during checkout
- Coupon usage count out of sync
- Coupon deactivated mid-checkout
- Percentage discount calculation precision errors

### 3.9 USER AND SESSION EDGE CASES

- User registers with space in phone number
- User email case sensitivity issues
- Multiple devices login simultaneously
- Session expires during payment submission
- Force password change bypassed
- User deletion with pending orders
- User account suspended during checkout
- Terms acceptance timestamp missing
- Marketing consent retroactive change
- Phone number change breaks OTP flow

### 3.10 RETURNS AND REFUNDS EDGE CASES

- Return requested at exactly 7 days
- Return for order not yet delivered
- Return quantity exceeds shipped quantity
- Return for cancelled order
- Refund amount precision errors
- Partial refund splits shipping charges
- Refund to closed bank account
- Return inspection fails after approval
- Multiple return requests for same items
- Return item different from shipped item

---

## PART 4: BUSINESS LOGIC VALIDATION

### 4.1 Price Validation
- Product MRP must be greater than sale price
- Variant sale price cannot exceed product MRP
- Discount percentage cannot exceed 100%
- Coupon max discount cannot be negative
- Cart total cannot be negative
- Shipping charges cannot be negative
- Tax calculation must be accurate
- Refund cannot exceed paid amount
- Free items must have zero price

### 4.2 Quantity Validation
- Cart item quantity: 1-999 range
- Maximum 50 items per cart
- Order quantity must match cart quantity
- Fulfilled quantity cannot exceed ordered quantity
- Returned quantity cannot exceed fulfilled quantity
- Refunded quantity cannot exceed returned quantity
- Stock quantity cannot be negative
- Reserved quantity cannot exceed available quantity
- Backorder quantity cannot exceed backorder limit

### 4.3 Status Validation
- Order status must follow state machine
- Payment status must follow state machine
- Return status must follow state machine
- Refund status must follow state machine
- Checkout status must follow state machine
- Invalid status transitions must be prevented
- Status cannot rollback (except specific cases)
- Concurrent status changes must be handled

### 4.4 Date Validation
- Order date must be before delivery date
- Return request date must be within return window
- Coupon start date must be before end date
- Session expiry must be after creation
- Return window is 7 days from delivery
- Refund processing takes up to 7 days
- OTP valid for 10 minutes
- Password reset token valid for 1 hour

### 4.5 Relationship Validation
- Product must belong to at least one category
- Order must reference valid user
- Order items must reference valid order
- Cart items must reference valid cart
- Variant must belong to valid product
- Inventory must reference valid variant
- Address must belong to valid user
- Session must belong to valid user

---

## PART 5: SECURITY AND COMPLIANCE

### 5.1 Authentication Security
- Password minimum 8 characters
- Password must contain special characters
- Prevent weak passwords (123456, password)
- Lock account after multiple failed attempts
- Force password change on first login
- Prevent password reuse
- Secure password reset flow
- OTP rate limiting
- Session token expiry
- Refresh token rotation

### 5.2 Authorization Security
- RBAC permission checking
- Resource ownership validation
- Admin cannot access other admin's data without permission
- User can only access own orders
- User can only modify own addresses
- Guest user restrictions
- API endpoint authorization
- Prevent privilege escalation

### 5.3 Data Security
- Sensitive data encryption at rest
- Payment data tokenization
- PCI DSS compliance for payments
- GDPR compliance for user data
- User data export capability
- User data deletion on request
- Audit logging for sensitive operations
- Secure file upload validation

### 5.4 Input Validation
- SQL injection prevention
- XSS attack prevention
- CSRF token validation
- Path traversal prevention
- Command injection prevention
- Email format validation
- Phone format validation
- Address format validation
- File type validation
- File size limits

### 5.5 Rate Limiting
- API rate limiting per user
- Login attempt rate limiting
- OTP request rate limiting
- Password reset rate limiting
- Cart update rate limiting
- Order placement rate limiting
- Search query rate limiting
- Prevent DDoS attacks

---

## PART 6: INTEGRATION EDGE CASES

### 6.1 Catalog Integration
- Order service fetches product details from catalog
- Product price changed after order placement
- Product deleted after order placement
- Product unavailable when order processing
- Variant details mismatch
- Product search index out of sync
- Category hierarchy changes
- Bundle composition changes

### 6.2 Inventory Integration
- Order service reserves inventory
- Reservation timeout not released
- Stock deduction fails after payment
- Stock restoration fails after cancellation
- Multi-warehouse inventory unavailable
- Inventory service timeout
- Inventory adjustment conflicts
- Stock sync delays

### 6.3 Pricing Integration
- Order service calculates cart pricing
- Coupon validation at checkout
- Discount calculation mismatch
- Tax calculation errors
- Pricing service unavailable
- Price cache stale
- Promotion rules changed mid-checkout
- Free gift rule evaluation delays

### 6.4 Payment Gateway Integration
- Gateway timeout during payment
- Gateway returns ambiguous status
- Webhook signature validation fails
- Duplicate webhook handling
- Gateway service unavailable
- Currency mismatch
- Amount mismatch
- Idempotency key conflicts
- Settlement delays

### 6.5 Notification Service Integration
- Email service unavailable (graceful degradation)
- SMS service unavailable (graceful degradation)
- Notification queue overflow
- Template rendering errors
- Recipient address invalid
- Email bounce handling
- SMS delivery failure
- Notification retry logic

### 6.6 Shipping Service Integration
- Shipping calculation errors
- Serviceability check failures
- Tracking number generation delays
- Carrier API unavailable
- Shipping status webhook delays
- Address validation failures
- Pickup scheduling conflicts
- Delivery failure scenarios

---

## PART 7: COMPLEX MULTI-STEP SCENARIOS

### 7.1 Complete Customer Journey
1. User registers with phone and email
2. User verifies email via OTP
3. User browses product catalog
4. User applies filters (category, price range)
5. User views product details
6. User adds product variant to cart
7. User applies coupon code
8. User adds more items to cart
9. Cart reaches 10 items
10. User reviews cart and sees pricing breakdown
11. User initiates checkout
12. User adds new shipping address
13. User validates address for serviceability
14. User selects shipping method
15. User reviews order summary
16. User selects payment method
17. User completes payment
18. Payment captured successfully
19. Order confirmed and inventory deducted
20. User receives order confirmation email
21. Admin processes order
22. Order shipped with tracking
23. User tracks shipment
24. Order delivered successfully
25. User initiates return within 7 days
26. Return approved and pickup scheduled
27. Return picked up and received at warehouse
28. Quality inspection passed
29. Refund initiated
30. Refund completed, user receives amount

### 7.2 Admin Complete Workflow
1. Admin logs in
2. Admin creates new product category
3. Admin creates new brand
4. Admin creates new product with variants
5. Admin uploads product images
6. Admin assigns category and brand
7. Admin sets pricing for variants
8. Admin adds inventory for variants
9. Admin publishes product
10. Admin creates coupon for promotion
11. Admin monitors incoming orders
12. Admin confirms new order
13. Admin processes order and prepares shipment
14. Admin generates shipment and tracking
15. Admin marks order as shipped
16. Admin handles return request
17. Admin schedules pickup
18. Admin receives returned item
19. Admin conducts quality inspection
20. Admin approves refund
21. Admin processes refund
22. Admin generates reports for sales analysis
23. Admin reviews customer feedback
24. Admin adjusts inventory based on low stock alerts
25. Admin creates new promotion campaign

### 7.3 Edge Case Complex Scenarios

#### Scenario A: Cart Price Change During Checkout
1. User adds 5 items to cart
2. Total shows Rs. 2500
3. User initiates checkout
4. Admin changes product price in catalog
5. User completes address entry
6. User reaches payment stage
7. System should show: Use snapshot price vs. New price?
8. User notices price difference
9. User decides to continue or abandon
10. Payment processed at snapshot price
11. Order confirmation shows price paid

#### Scenario B: Stock Depletion at Checkout
1. Last 2 items in stock
2. User A adds 2 items to cart
3. User B adds 2 items to cart (reservation succeeds)
4. User A completes checkout and payment
5. Stock deducted, now 0 available
6. User B tries to complete checkout
7. Inventory validation fails
8. User B sees out of stock error
9. User B's reservation released
10. User B's cart updated with availability status

#### Scenario C: Coupon Expiry During Checkout
1. User adds items to cart (Rs. 1500)
2. User applies coupon SAVE200 (expires in 5 minutes)
3. Cart total now Rs. 1300
4. User fills address and shipping
5. User takes 10 minutes to decide
6. Coupon expires in background
7. User proceeds to payment
8. System validates coupon, finds expired
9. Cart total recalculated to Rs. 1500
10. User sees price increase notification
11. User decides to continue or add new coupon

#### Scenario D: Return and Reorder
1. User receives order with 3 items
2. 1 item is damaged
3. User initiates return for damaged item only
4. Partial return approved
5. User sends back 1 item
6. Quality inspection confirms damage
7. Partial refund processed for 1 item
8. User reorders same item with replacement coupon
9. New order placed successfully
10. User receives replacement
11. Overall outcome: 2 original items kept, 1 replaced

#### Scenario E: Multi-Device Cart Conflict
1. User adds items to cart on mobile (5 items)
2. User switches to desktop
3. Desktop shows old cart (2 items from yesterday)
4. User adds 3 more items on desktop
5. Mobile and desktop now out of sync
6. System merges carts on next sync
7. Total 8 unique items (no duplicates)
8. Quantity increased for overlapping items
9. Cart updated on both devices
10. User proceeds to checkout from desktop

#### Scenario F: Session Expiry at Payment
1. User fills entire checkout form
2. User reviews order for 20 minutes
3. Session expires (15-minute timeout)
4. User clicks "Pay Now"
5. System detects expired session
6. User redirected to login
7. User logs in again
8. Checkout session cannot be recovered (expired)
9. User sees "Session expired, please try again"
10. User frustrated, may abandon purchase

#### Scenario G: Payment Success but Order Not Updated
1. User completes payment
2. Payment gateway captures amount
3. Gateway sends webhook to server
4. Server crashes before processing webhook
5. Payment marked as success in gateway
6. Order still shows as pending in database
7. User sees payment success but no order confirmation
8. Support team manually reconciles
9. Order status updated to confirmed
10. Inventory manually adjusted

#### Scenario H: Concurrent Admins Same Product
1. Admin A opens product edit page
2. Admin B opens same product edit page
3. Admin A changes price to Rs. 500
4. Admin A saves changes
5. Admin B changes price to Rs. 600
6. Admin B saves changes (overwrites Admin A)
7. Admin A's change lost
8. No conflict detection mechanism
9. Last write wins scenario
10. Audit log shows both changes

#### Scenario I: Bulk Import Partial Failure
1. Admin uploads CSV with 1000 products
2. System validates each row
3. Row 500 has invalid SKU (duplicate)
4. Row 750 has invalid price (negative)
5. System completes 998 successful imports
6. System reports 2 failures with details
7. Admin reviews failed rows
8. Admin fixes and re-imports failed rows
9. All 1000 products now imported
10. Audit log records bulk import operation

#### Scenario J: Multiple Return Requests
1. Order contains 5 items
2. User requests return for 2 items (first request)
3. Admin approves first return
4. User requests return for 2 more items (second request)
5. Admin approves second return
6. User keeps 1 item
7. First pickup completed
8. Second pickup completed
9. Quality inspection for all 4 returned items
10. Partial refund for 4 items processed
11. Order status: Partially returned
12. Order cannot be fully returned (1 item kept)

---

This comprehensive document covers all major edge cases, test scenarios, and workflows for both customer and admin sides of the e-commerce platform. Each scenario represents a potential point of failure or complexity that should be explicitly handled in the system design and implementation.
