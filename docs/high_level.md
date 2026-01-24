Cleanse Ayurveda

Final Microservices & Functional Modules
Consistent with the simplified data model (~70 entities)

1. User & Auth Service
Module
Consumer Functions
Admin Functions
Authentication
Login (email/phone + OTP), logout, password reset
Admin login, MFA
Registration
Signup, email/phone verification
Create admin users
Sessions
Token refresh, device management
View active sessions, force logout
OTP Management
Request OTP, verify OTP
—
Profile
View/edit profile, preferences, consents
View customer profiles
Addresses
Add/edit/delete addresses, set default
View customer addresses
Roles & Permissions
—
Create/edit roles, assign permissions
Audit Logs
—
View audit trail, filter by action/entity

Entities: users, addresses, user_sessions, otp_requests, admin_users, roles, audit_logs

2. Catalog Service
Module
Consumer Functions
Admin Functions
Products
Browse, view PDP, search
Create/edit/delete products, bulk import
Variants
View variants, check availability
Create/edit variants, pricing
Product Media
View images/videos
Upload/reorder/delete media
Ingredients
View ingredient breakdown
Manage ingredient library, map to products
Brands
Filter by brand
Create/edit brands
Categories
Browse categories, filter
Create/edit category hierarchy
Collections
Browse collections
Create manual/smart collections
Bundles
View bundle deals
Create/edit bundles, set pricing
Related Products
View cross-sell/upsell
Configure related product rules
Search
Full-text search, typeahead, filters
—

Entities: brands, ingredients, products, product_variants, product_media, product_ingredients, categories, product_categories, collections, collection_products, bundles, bundle_items, related_products

3. Pricing & Promotions Service
Module
Consumer Functions
Admin Functions
Coupons
Apply/remove coupon, validate
Create/edit coupons, set rules, usage limits
Coupon Usage
—
View usage reports, track abuse
Automatic Discounts
Auto-apply eligible discounts
Create/edit auto-discount rules
Tier Discounts
View tier progress, unlock discounts
Configure tier levels and rewards
Free Gifts
View eligible gifts, select gift
Configure gift rules, triggers
Price Calculation
Get computed prices with all discounts
—

Entities: coupons, coupon_usage, automatic_discounts, tier_discounts, free_gift_rules

4. Inventory Service
Module
Consumer Functions
Admin Functions
Stock Check
Check availability, low-stock badge
View stock levels
Warehouses
—
Create/edit warehouses
Inventory Management
—
Update stock, bulk adjustments
Reservations
Reserve stock during checkout
View reservations, manual release
Adjustments
—
Record adjustments (restock, damage, correction)
Alerts
—
View low-stock alerts (derived from status)

Entities: warehouses, inventory, inventory_reservations, inventory_adjustments

5. Order & Payment Service
Module
Consumer Functions
Admin Functions
Cart
Create/update cart, add/remove items
View abandoned carts
Cart Items
Update quantities, apply gifts
—
Checkout
Start checkout, enter address, select shipping
—
Orders
Place order, view history, track
List/filter orders, update status
Order Items
View order details
View line items, fulfillment status
Order Status
Track status changes
Update status, add notes
Payments
Initiate payment, retry
View transactions, reconciliation
Refunds
Request refund
Process refunds, approve/reject
Returns
Initiate return, track RMA
Manage returns, inspect, approve
Invoices
Download invoice
Generate invoices, send to customer

Entities: carts, cart_items, checkout_sessions, orders, order_items, order_status_history, payments, refunds, returns, invoices

6. Shipping Service
Module
Consumer Functions
Admin Functions
Pincode Check
Check serviceability, COD availability
Update pincode data
Shipping Zones
—
Create/edit zones
Shipping Methods
View available methods, rates, ETA
Configure methods, rates
Carriers
—
Configure carrier integrations
Shipments
Track shipment status
Create shipment, print label, update status
Shipment Items
—
View items per shipment
Tracking
View tracking events
Receive carrier webhooks

Entities: shipping_zones, carriers, shipping_methods, pincode_serviceability, shipments, shipment_items

7. Content & CMS Service
Module
Consumer Functions
Admin Functions
Pages
View static pages (Our Story, policies)
Create/edit pages, publish/unpublish
Blogs
List posts, read articles
Author posts, manage drafts, publish
Blog Categories
Filter by category
Create/edit categories
Banners
View hero, promotional banners
Create/edit banners, schedule, target
Popups
View popups (newsletter, promo)
Create/edit popups, triggers, frequency
Navigation
Render menus
Configure header/footer menus
FAQs
View FAQs by category
Create/edit FAQs
Media Library
—
Upload/manage media assets

Entities: pages, blog_categories, blogs, banners, popups, navigation_menus, faqs, media_library

8. Engagement Service
Module
Consumer Functions
Admin Functions
Reviews
Submit review, view reviews, vote
Moderate reviews, approve/reject, respond
Review Votes
Mark helpful/not helpful
View vote stats
Wishlists
Add/remove items, view wishlist
—
Loyalty Tiers
View tier status, benefits
Configure tiers
Loyalty Accounts
View points balance, history
Adjust points, view accounts
Loyalty Transactions
Earn/redeem points
View transactions, manual adjustments
Loyalty Rules
—
Configure earn/redeem rules
Referrals
Generate code, share, track rewards
View referrals, fraud detection
Store Credits
View balance, use at checkout
Issue credits, adjustments
Store Credit Transactions
View history
View all transactions
Notification Templates
—
Create/edit templates
Notifications
Receive notifications
View logs, resend failed

Entities: reviews, review_votes, wishlists, loyalty_tiers, loyalty_accounts, loyalty_transactions, loyalty_rules, referrals, store_credits, store_credit_transactions, notification_templates, notifications

9. System Config (Shared/Distributed)
Module
Admin Functions
Settings
Store-wide settings (general, checkout, tax)
Tax Rates
Configure tax rates by region/HSN
Payment Methods Config
Enable/disable payment methods, set limits
Customer Segments
Create static/dynamic segments
Analytics Events
View events (read-only, for dashboards)

Entities: settings, tax_rates, payment_methods_config, customer_segments, analytics_events

Summary Table
#
Microservice
Entities
Consumer Modules
Admin Modules
1
User & Auth
7
6
8
2
Catalog
14
7
10
3
Pricing & Promotions
5
5
6
4
Inventory
4
2
6
5
Order & Payment
12
10
12
6
Shipping
6
4
7
7
Content & CMS
8
5
8
8
Engagement
13
9
12
9
System Config
5
—
5
Total
—
~70
~48
~74


This is now fully consistent with the simplified data model. Want me to create an API endpoint list for any specific service?

