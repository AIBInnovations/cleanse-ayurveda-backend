# **1\. User & Auth Service**

Handles all authentication, user management, admin access control, and audit logging.

**Entities:** users, addresses, user\_sessions, otp\_requests, admin\_users, roles, audit\_logs

## **1.1 Authentication Module**

### **Consumer Features**

* Login via email/phone with OTP verification  
* Login via email/phone with password  
* Social login (Google, Facebook) \- optional  
* Logout from current device  
* Logout from all devices  
* Password reset via OTP  
* Remember me / persistent sessions

### **Admin Features**

* Admin login with email/password  
* Multi-factor authentication (MFA) setup  
* MFA verification on login  
* Admin password reset  
* Force password change on first login

## **1.2 Registration Module**

### **Consumer Features**

* Sign up with email and password  
* Sign up with phone and OTP  
* Email verification via OTP/link  
* Phone verification via OTP  
* Guest to registered user conversion  
* Terms & conditions acceptance  
* Marketing consent collection

### **Admin Features**

* Create new admin user  
* Assign role to admin user  
* Set initial password for admin  
* Bulk admin user creation via CSV

## **1.3 Session Management Module**

### **Consumer Features**

* View active sessions  
* Token refresh (silent re-authentication)  
* Device information tracking  
* Terminate specific session

### **Admin Features**

* View all active admin sessions  
* Force logout specific admin  
* Force logout all admins (emergency)  
* Session timeout configuration  
* IP-based session restrictions

## **1.4 OTP Management Module**

### **Consumer Features**

* Request OTP for login  
* Request OTP for registration  
* Request OTP for password reset  
* Request OTP for email/phone verification  
* Verify OTP  
* Resend OTP (with rate limiting)

### **Admin Features**

* Configure OTP expiry duration  
* Configure max OTP attempts  
* Configure rate limiting rules  
* View OTP request logs

## **1.5 Profile Management Module**

### **Consumer Features**

* View profile information  
* Edit first name, last name  
* Change email (with verification)  
* Change phone (with verification)  
* Upload/change avatar  
* Set language preference  
* Set currency preference  
* Manage marketing consents  
* Delete account request

### **Admin Features**

* Search customers by email/phone/name  
* View customer profile details  
* View customer order history  
* Suspend customer account  
* Reactivate customer account  
* Add internal notes to customer  
* Export customer data (GDPR)

## **1.6 Address Management Module**

### **Consumer Features**

* Add new address  
* Edit existing address  
* Delete address  
* Set default shipping address  
* Set default billing address  
* Label addresses (Home, Office, Other)  
* Pincode validation  
* Auto-fill city/state from pincode

### **Admin Features**

* View customer addresses  
* Verify address validity  
* Flag suspicious addresses

## **1.7 Roles & Permissions Module**

### **Admin Features**

* View all roles  
* Create new role  
* Edit role name and description  
* Assign permissions to role  
* Remove permissions from role  
* Delete custom role  
* Protect system roles from deletion  
* Assign role to admin user  
* Change admin user role  
* View admins by role

**Default Roles:** Super Admin, Catalog Manager, Order Manager, Marketing Manager, Support Agent, Finance

## **1.8 Audit Logs Module**

### **Admin Features**

* View all audit logs  
* Filter by admin user  
* Filter by action type (create, update, delete)  
* Filter by entity type (product, order, customer)  
* Filter by date range  
* View before/after changes  
* Export audit logs  
* Configure retention period  
* Real-time audit stream (optional)

# **2\. Catalog Service**

Manages all product information, variants, categories, collections, bundles, and search functionality.

**Entities:** brands, ingredients, products, product\_variants, product\_media, product\_ingredients, categories, product\_categories, collections, collection\_products, bundles, bundle\_items, related\_products

## **2.1 Products Module**

### **Consumer Features**

* View product listing page (PLP)  
* View product detail page (PDP)  
* View product images and videos  
* View product description and benefits  
* View how-to-use instructions  
* View product ratings and reviews summary  
* View pricing (MRP, sale price, discount %)  
* View stock availability status  
* Filter products by attributes  
* Sort products (price, rating, newest, bestselling)  
* Pagination / infinite scroll

### **Admin Features**

* View all products with filters  
* Create new product (simple/variable)  
* Edit product details  
* Set product status (draft/active/archived)  
* Mark as featured/bestseller/new arrival  
* Set product tags  
* Set product attributes (skin type, concern)  
* Configure SEO metadata (title, description, keywords)  
* Set HSN code for tax  
* Duplicate product  
* Delete product (soft delete)  
* Bulk import products via CSV  
* Bulk export products  
* Bulk update products

## **2.2 Product Variants Module**

### **Consumer Features**

* View available variants (size, flavor)  
* Select variant before add to cart  
* View variant-specific pricing  
* View variant availability  
* View variant-specific images

### **Admin Features**

* Add variants to product  
* Edit variant details (name, SKU, barcode)  
* Set variant pricing (MRP, sale price, cost price)  
* Set variant weight  
* Set default variant  
* Activate/deactivate variant  
* Reorder variants  
* Delete variant

## **2.3 Product Media Module**

### **Consumer Features**

* View product image gallery  
* Zoom on product images  
* View product videos  
* Swipe through images on mobile

### **Admin Features**

* Upload product images  
* Upload product videos  
* Set primary image  
* Reorder media  
* Set alt text for images  
* Associate media with specific variant  
* Delete media  
* Bulk upload images

## **2.4 Ingredients Module**

### **Consumer Features**

* View ingredients list on PDP  
* View key ingredients highlighted  
* View ingredient benefits  
* View ingredient percentage (if available)  
* Filter products by ingredient

### **Admin Features**

* View ingredient library  
* Add new ingredient  
* Edit ingredient details  
* Upload ingredient image  
* Map ingredients to products  
* Set ingredient percentage  
* Mark as key ingredient  
* Reorder ingredients  
* Delete ingredient

## **2.5 Brands Module**

### **Consumer Features**

* View brand on product page  
* Filter products by brand

### **Admin Features**

* View all brands  
* Create new brand  
* Edit brand details  
* Upload brand logo  
* Activate/deactivate brand  
* Delete brand

## **2.6 Categories Module**

### **Consumer Features**

* Browse products by category  
* View category hierarchy in navigation  
* View category banner and description  
* Filter within category

### **Admin Features**

* View category tree  
* Create new category  
* Create subcategory  
* Edit category details  
* Upload category image/banner  
* Set SEO metadata  
* Show/hide in menu  
* Reorder categories  
* Assign products to category  
* Set primary category for product  
* Delete category

## **2.7 Collections Module**

### **Consumer Features**

* View collection page  
* Browse featured collections  
* View collection banner and description

### **Admin Features**

* View all collections  
* Create manual collection  
* Create smart collection with rules  
* Configure smart collection rules (by tag, type, price)  
* Edit collection details  
* Upload collection image/banner  
* Set SEO metadata  
* Mark as featured  
* Add/remove products from manual collection  
* Reorder products in collection  
* Activate/deactivate collection  
* Delete collection

## **2.8 Bundles Module**

### **Consumer Features**

* View bundle deals  
* View included products in bundle  
* View bundle savings  
* Add bundle to cart

### **Admin Features**

* View all bundles  
* Create new bundle  
* Add products to bundle  
* Set bundle pricing type (fixed price / percentage off)  
* Set bundle price  
* Set bundle validity dates  
* Activate/deactivate bundle  
* Delete bundle

## **2.9 Related Products Module**

### **Consumer Features**

* View cross-sell products on PDP  
* View upsell products on PDP  
* View frequently bought together  
* Quick add related product to cart

### **Admin Features**

* Configure cross-sell products  
* Configure upsell products  
* Configure frequently bought together  
* Reorder related products  
* Remove related product mapping

## **2.10 Search Module**

### **Consumer Features**

* Full-text product search  
* Search typeahead / autocomplete  
* Search suggestions  
* Typo tolerance  
* Synonym matching (acne \= pimple)  
* Faceted search (filters)  
* Search within category  
* Recent searches  
* No results suggestions

### **Admin Features**

* Configure search synonyms  
* View search analytics  
* View top search terms  
* View zero-result searches

# **3\. Pricing & Promotions Service**

Manages all pricing rules, discount codes, automatic promotions, tier-based discounts, and free gift rules.

**Entities:** coupons, coupon\_usage, automatic\_discounts, tier\_discounts, free\_gift\_rules

## **3.1 Coupons Module**

### **Consumer Features**

* Enter coupon code at cart/checkout  
* Apply coupon to order  
* Remove applied coupon  
* View coupon discount breakdown  
* View validation errors (expired, invalid, minimum not met)  
* View available coupons in account  
* Auto-suggest best coupon

### **Admin Features**

* View all coupons  
* Create new coupon  
* Set coupon code  
* Set discount type (percentage, fixed amount, free shipping)  
* Set discount value  
* Set maximum discount cap  
* Set minimum order value  
* Set total usage limit  
* Set per-user usage limit  
* Set applicable products/collections  
* Set excluded products/collections  
* Set customer eligibility (all, first order, specific segments)  
* Enable stackability with other discounts  
* Enable auto-apply  
* Set validity dates (start/end)  
* Activate/deactivate coupon  
* View coupon usage report  
* Export coupon usage data  
* Delete coupon

## **3.2 Automatic Discounts Module**

### **Consumer Features**

* View auto-applied discounts in cart  
* View discount breakdown  
* View progress to next discount tier

### **Admin Features**

* View all automatic discounts  
* Create automatic discount  
* Set discount type and value  
* Set minimum order value trigger  
* Set applicable products/collections  
* Set priority (when multiple apply)  
* Enable stackability  
* Set validity dates  
* Activate/deactivate  
* Delete automatic discount

## **3.3 Tier Discounts Module**

### **Consumer Features**

* View tier progress bar in cart  
* View current tier discount  
* View amount needed for next tier  
* View tier badge (e.g., Save 10%, Best Value)

### **Admin Features**

* View all tier discounts  
* Create tier discount scheme  
* Set tier type (cart value or quantity)  
* Configure tier levels (min, max, discount)  
* Set badge text for each tier  
* Set validity dates  
* Activate/deactivate  
* Delete tier discount

## **3.4 Free Gift Rules Module**

### **Consumer Features**

* View free gift eligibility in cart  
* View progress to unlock free gift  
* Auto-add free gift to cart when eligible  
* Select from multiple gift options (if available)

### **Admin Features**

* View all free gift rules  
* Create free gift rule  
* Set trigger type (cart value or product purchase)  
* Set trigger value/products  
* Select gift product and variant  
* Set gift quantity  
* Set validity dates  
* Activate/deactivate  
* Delete free gift rule

## **3.5 Price Calculation Module**

### **Consumer Features**

* View calculated price with all applicable discounts  
* View line-item discounts  
* View cart-level discounts  
* View total savings

# **4\. Inventory Service**

Manages stock levels, warehouse operations, inventory reservations, and stock adjustments.

**Entities:** warehouses, inventory, inventory\_reservations, inventory\_adjustments

## **4.1 Stock Check Module**

### **Consumer Features**

* View stock availability on PDP  
* View in-stock / out-of-stock badge  
* View low-stock warning (Only X left)  
* Check stock before add to cart  
* Stock validation at checkout

### **Admin Features**

* View inventory dashboard  
* View stock levels by product/SKU  
* View low-stock items  
* View out-of-stock items  
* Export inventory report

## **4.2 Warehouses Module**

### **Admin Features**

* View all warehouses  
* Create new warehouse  
* Edit warehouse details  
* Set warehouse address  
* Set default warehouse  
* Set warehouse priority for fulfillment  
* Activate/deactivate warehouse  
* Delete warehouse

## **4.3 Inventory Management Module**

### **Admin Features**

* Update stock quantity  
* Bulk update stock via CSV  
* Set low stock threshold per SKU  
* Set reorder point  
* Enable/disable backorder per SKU  
* Set backorder limit  
* View inventory by warehouse  
* Transfer stock between warehouses

## **4.4 Reservations Module**

### **System Features**

* Reserve stock when item added to cart  
* Reserve stock during checkout  
* Convert reservation to sale on order placement  
* Auto-release expired reservations  
* Release reservation on cart abandonment

### **Admin Features**

* View active reservations  
* Manually release reservation  
* Configure reservation TTL

## **4.5 Stock Adjustments Module**

### **Admin Features**

* Record stock restock  
* Record damage/loss  
* Record stock correction  
* Add adjustment reason and notes  
* View adjustment history  
* View adjustment audit trail  
* Export adjustment report

# **5\. Order & Payment Service**

Manages shopping carts, checkout process, order lifecycle, payments, refunds, and returns.

**Entities:** carts, cart\_items, checkout\_sessions, orders, order\_items, order\_status\_history, payments, refunds, returns, invoices

## **5.1 Cart Module**

### **Consumer Features**

* Add product to cart  
* Update item quantity  
* Remove item from cart  
* View cart summary  
* View line item details  
* View totals breakdown (subtotal, discount, shipping, tax, total)  
* Apply coupon code  
* View applied discounts  
* View free gifts  
* Save for later  
* Move to wishlist  
* Merge guest cart on login  
* View cross-sell recommendations  
* Mini cart in header

### **Admin Features**

* View abandoned carts  
* View cart details  
* View abandonment analytics  
* Configure cart expiry

## **5.2 Checkout Module**

### **Consumer Features**

* Start checkout process  
* Enter/select shipping address  
* Enter/select billing address  
* Select shipping method  
* View shipping rates and ETA  
* Select payment method  
* View order summary before payment  
* Add gift message (gift orders)  
* Add order notes  
* Accept terms and conditions  
* Guest checkout  
* Resume abandoned checkout

### **Admin Features**

* View checkout sessions  
* View checkout abandonment at each step

## **5.3 Orders Module**

### **Consumer Features**

* Place order  
* View order confirmation  
* View order history  
* View order details  
* Track order status  
* View order timeline  
* Cancel order (before shipment)  
* Reorder from past order  
* Download invoice

### **Admin Features**

* View all orders  
* Filter orders by status, date, customer  
* Search orders by order number, email, phone  
* View order details and timeline  
* Update order status  
* Add internal notes  
* Add order tags  
* Cancel order with reason  
* Create manual order  
* Edit order (limited)  
* Export orders  
* Bulk update orders

## **5.4 Payments Module**

### **Consumer Features**

* Pay via UPI  
* Pay via credit/debit card  
* Pay via net banking  
* Pay via wallet  
* Cash on Delivery (COD)  
* Retry failed payment  
* View payment status

### **Admin Features**

* View all transactions  
* View payment details  
* View payment gateway response  
* Handle payment webhooks  
* Reconcile payments  
* Export transaction report

## **5.5 Refunds Module**

### **Consumer Features**

* Request refund  
* Select refund reason  
* Track refund status  
* View refund history

### **Admin Features**

* View refund requests  
* Approve/reject refund  
* Process full refund  
* Process partial refund  
* Refund to original payment method  
* Refund to store credit  
* Refund to bank account (COD)  
* Add refund notes  
* View refund audit trail

## **5.6 Returns Module**

### **Consumer Features**

* Initiate return request  
* Select items to return  
* Select return reason  
* Upload images (for damage claims)  
* Add return notes  
* Track return status  
* View RMA number

### **Admin Features**

* View all returns  
* Approve/reject return  
* Generate RMA number  
* Schedule pickup  
* Mark as received  
* Inspect returned items  
* Update inspection status (pass/fail)  
* Process refund for return  
* Add admin notes

## **5.7 Invoices Module**

### **Consumer Features**

* View invoice  
* Download invoice PDF

### **Admin Features**

* Generate invoice  
* Generate credit note  
* Customize invoice template  
* Add GSTIN to invoice  
* Email invoice to customer  
* Bulk download invoices  
* View tax summary

# **6\. Shipping Service**

Manages shipping zones, rates, carrier integrations, shipment creation, and tracking.

**Entities:** shipping\_zones, carriers, shipping\_methods, pincode\_serviceability, shipments, shipment\_items

## **6.1 Pincode Serviceability Module**

### **Consumer Features**

* Check delivery availability by pincode  
* View estimated delivery date  
* Check COD availability  
* Auto-fill city/state from pincode

### **Admin Features**

* View pincode database  
* Update pincode serviceability  
* Bulk import pincodes  
* Mark pincode as serviceable/non-serviceable  
* Enable/disable COD per pincode

## **6.2 Shipping Zones Module**

### **Admin Features**

* View all shipping zones  
* Create shipping zone  
* Edit zone details  
* Add countries/states to zone  
* Add pincode ranges to zone  
* Set zone priority  
* Set default zone  
* Activate/deactivate zone

## **6.3 Shipping Methods Module**

### **Consumer Features**

* View available shipping methods  
* View shipping rates  
* View estimated delivery time  
* Select shipping method

### **Admin Features**

* View all shipping methods  
* Create shipping method  
* Set rate type (flat, free, weight-based)  
* Set base rate  
* Set per-kg rate  
* Set free shipping threshold  
* Set estimated delivery days  
* Enable/disable COD  
* Set COD fee  
* Assign to zone  
* Assign carrier

## **6.4 Carriers Module**

### **Admin Features**

* View carrier integrations  
* Configure Shiprocket integration  
* Configure Delhivery integration  
* Set API credentials  
* Test carrier connection  
* Activate/deactivate carrier

## **6.5 Shipments Module**

### **Consumer Features**

* Track shipment status  
* View tracking number  
* View tracking events  
* View estimated delivery  
* Click to track on carrier website

### **Admin Features**

* View all shipments  
* Create shipment for order  
* Select items to ship  
* Generate shipping label  
* Print shipping label  
* Schedule pickup  
* Update shipment status manually  
* Handle carrier webhook updates  
* Mark as delivered  
* Handle RTO (return to origin)  
* Track COD remittance

# **7\. Content & CMS Service**

Manages static pages, blog posts, banners, popups, navigation, FAQs, and media assets.

**Entities:** pages, blog\_categories, blogs, banners, popups, navigation\_menus, faqs, media\_library

## **7.1 Static Pages Module**

### **Consumer Features**

* View About Us page  
* View Contact Us page  
* View Privacy Policy  
* View Terms & Conditions  
* View Return Policy  
* View Shipping Policy

### **Admin Features**

* View all pages  
* Create new page  
* Edit page content (rich text editor)  
* Set page URL slug  
* Configure SEO metadata  
* Publish/unpublish page  
* Schedule page publish  
* Delete page (non-system)  
* Protect system pages from deletion

## **7.2 Blog Module**

### **Consumer Features**

* View blog listing  
* Filter blogs by category  
* View featured posts  
* Read blog post  
* View related posts  
* Share post on social media

### **Admin Features**

* View all posts  
* Create blog post  
* Edit post content (rich text editor)  
* Upload featured image  
* Set category and tags  
* Configure SEO metadata  
* Mark as featured  
* Save as draft  
* Publish post  
* Schedule post  
* Manage blog categories  
* Delete post

## **7.3 Banners Module**

### **Consumer Features**

* View hero banner on homepage  
* View promotional strip banner  
* Click CTA to navigate  
* Dismiss dismissible banners

### **Admin Features**

* View all banners  
* Create banner  
* Set banner placement (hero, top strip, mid-page)  
* Upload desktop and mobile images  
* Set title, subtitle, CTA  
* Set target pages  
* Set priority  
* Schedule banner (start/end date)  
* Activate/deactivate  
* View impression/click stats  
* Delete banner

## **7.4 Popups Module**

### **Consumer Features**

* View promotional popup  
* View newsletter signup popup  
* View exit intent popup  
* Close popup  
* Submit newsletter form

### **Admin Features**

* View all popups  
* Create popup  
* Set popup type (promo, newsletter, exit intent)  
* Set trigger (time delay, scroll, exit intent)  
* Set display frequency  
* Set target pages  
* Configure content and CTA  
* Add discount code  
* Schedule popup  
* View conversion stats

## **7.5 Navigation Module**

### **Consumer Features**

* View header navigation  
* View mega menu  
* View footer links  
* View mobile navigation

### **Admin Features**

* View navigation menus  
* Configure header menu  
* Configure footer menus  
* Add/edit/remove menu items  
* Create nested menu items  
* Link to pages, categories, collections  
* Reorder menu items

## **7.6 FAQs Module**

### **Consumer Features**

* View FAQs by category  
* Expand/collapse FAQ answers  
* Search FAQs

### **Admin Features**

* View all FAQs  
* Create FAQ  
* Edit FAQ  
* Set FAQ category  
* Reorder FAQs  
* Activate/deactivate  
* Delete FAQ

## **7.7 Media Library Module**

### **Admin Features**

* View all media assets  
* Upload images  
* Upload videos  
* Organize by folders  
* Search media  
* Set alt text  
* Copy media URL  
* Delete media

# **8\. Engagement Service**

Manages reviews, wishlists, loyalty program, referrals, store credits, and notifications.

**Entities:** reviews, review\_votes, wishlists, loyalty\_tiers, loyalty\_accounts, loyalty\_transactions, loyalty\_rules, referrals, store\_credits, store\_credit\_transactions, notification\_templates, notifications

## **8.1 Reviews Module**

### **Consumer Features**

* View product reviews  
* View average rating  
* Filter reviews by rating  
* Filter reviews with images  
* Sort reviews (newest, helpful)  
* Submit review (verified purchase)  
* Rate product (1-5 stars)  
* Write review title and content  
* Upload review images  
* Mark review as helpful  
* Report inappropriate review

### **Admin Features**

* View all reviews  
* Filter by status (pending, approved, rejected)  
* Approve review  
* Reject review with reason  
* Mark as featured  
* Respond to review  
* Handle reported reviews  
* Delete review  
* Export reviews

## **8.2 Wishlists Module**

### **Consumer Features**

* Add product to wishlist  
* Remove from wishlist  
* View wishlist  
* Move to cart from wishlist  
* Enable price drop alerts

## **8.3 Loyalty Program Module**

### **Consumer Features**

* View loyalty points balance  
* View current tier  
* View tier benefits  
* View progress to next tier  
* View points history  
* Earn points on purchase  
* Redeem points at checkout  
* View points value

### **Admin Features**

* Configure loyalty tiers  
* Configure earn rules  
* Configure redeem rules  
* Set points value  
* View loyalty accounts  
* Adjust customer points  
* View points transactions  
* Export loyalty report

## **8.4 Referrals Module**

### **Consumer Features**

* Get unique referral code  
* Share referral link  
* View referral status  
* View referral rewards  
* Track successful referrals

### **Admin Features**

* Configure referrer rewards  
* Configure referee rewards  
* View all referrals  
* Detect referral fraud  
* Mark referral as fraudulent  
* Export referral report

## **8.5 Store Credits Module**

### **Consumer Features**

* View store credit balance  
* View credit history  
* Use credits at checkout

### **Admin Features**

* View customer store credits  
* Issue store credit  
* Deduct store credit  
* View transaction history

## **8.6 Notifications Module**

### **Consumer Features**

* Receive order confirmation email  
* Receive shipping notification  
* Receive delivery notification  
* Receive promotional notifications  
* Manage notification preferences

### **Admin Features**

* View notification templates  
* Create notification template  
* Edit template content  
* Configure channels (email, SMS, WhatsApp)  
* View notification logs  
* View delivery status  
* Resend failed notifications

# **9\. Summary**

| \# | Microservice | Entities | Modules | Features |
| :---: | ----- | :---: | :---: | :---: |
| 1 | User & Auth | 7 | 8 | \~70 |
| 2 | Catalog | 14 | 10 | \~100 |
| 3 | Pricing & Promotions | 5 | 5 | \~50 |
| 4 | Inventory | 4 | 5 | \~35 |
| 5 | Order & Payment | 12 | 7 | \~90 |
| 6 | Shipping | 6 | 5 | \~45 |
| 7 | Content & CMS | 8 | 7 | \~55 |
| 8 | Engagement | 13 | 6 | \~60 |
|  | **TOTAL** | **\~70** | **53** | **\~505** |

*Document End*