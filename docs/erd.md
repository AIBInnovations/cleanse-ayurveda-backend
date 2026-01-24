//
// CLEANSE AYURVEDA - DATA MODEL (SIMPLIFIED)
// E-commerce Platform | MERN + AWS | 8 Microservices
// ~70 Entities | All Relationships Defined
//

//
// SERVICE 1: USER & AUTH SERVICE (Blue)
//

users [icon: user, color: blue] {
id string pk
email string unique
phone string unique
password_hash string
first_name string
last_name string
avatar_url string
email_verified boolean
phone_verified boolean
status string // active, suspended, deleted
preferences json // {language, currency}
marketing_consent json // {email, sms, whatsapp, push}
last_login_at timestamp
created_at timestamp
updated_at timestamp
}

addresses [icon: map-pin, color: blue] {
id string pk
user_id string
type string // shipping, billing
label string // home, office
name string
phone string
line1 string
line2 string
landmark string
city string
state string
pincode string
country string
is_default boolean
created_at timestamp
updated_at timestamp
}

user_sessions [icon: key, color: blue] {
id string pk
user_id string
token string unique
device_info json
is_active boolean
expires_at timestamp
created_at timestamp
}

otp_requests [icon: lock, color: blue] {
id string pk
user_id string
identifier string
identifier_type string // email, phone
otp_code string
purpose string // login, verify, reset
attempts int
is_verified boolean
expires_at timestamp
created_at timestamp
}

admin_users [icon: shield, color: blue] {
id string pk
email string unique
password_hash string
first_name string
last_name string
phone string
role_id string
status string // active, suspended
mfa_enabled boolean
last_login_at timestamp
created_by_id string
created_at timestamp
updated_at timestamp
}

roles [icon: users, color: blue] {
id string pk
name string unique
display_name string
permissions json // ["products.write", "orders.read", "refunds.approve"]
is_system boolean
is_active boolean
created_at timestamp
}

audit_logs [icon: activity, color: blue] {
id string pk
actor_type string // admin, system
actor_id string
action string
entity_type string
entity_id string
changes json // {before, after}
ip_address string
created_at timestamp
}

//
// SERVICE 2: CATALOG SERVICE (Purple)
//

brands [icon: award, color: purple] {
id string pk
slug string unique
name string
description string
logo {
  url string
  public_id string
}
is_active boolean
deleted_at timestamp
created_at timestamp
updated_at timestamp
}

ingredients [icon: droplet, color: purple] {
id string pk
slug string unique
name string
scientific_name string
description text
benefits json // Array of benefit strings
image {
  url string
  public_id string
}
is_active boolean
deleted_at timestamp
created_at timestamp
updated_at timestamp
}

products [icon: package, color: purple] {
id string pk
sku string unique
slug string unique
name string
short_description string
description text
benefits json // Array of benefit strings
how_to_use text
product_type string // simple, variable, bundle
brand_id string
status string // draft, active, archived
is_featured boolean
is_bestseller boolean
is_new_arrival boolean
is_taxable boolean
hsn_code string
weight decimal
tags json
attributes json // {skin_type: [], concerns: []}
seo json // {title, description, keywords}
rating_summary json // {average: decimal, count: int}
created_by_id string
deleted_at timestamp
created_at timestamp
updated_at timestamp
}

product_variants [icon: layers, color: purple] {
id string pk
product_id string
sku string unique
name string
variant_type string // Simplified: "100ml", "50ml" (for single option)
option_values json // Complex: {size: "100ml", flavor: "mint"} (for multi-option)
mrp decimal
sale_price decimal
cost_price decimal
discount_percent decimal
weight decimal
barcode string
is_default boolean
is_active boolean // Or status enum if multiple states needed
sort_order int
deleted_at timestamp
created_at timestamp
updated_at timestamp
}

product_media [icon: image, color: purple] {
id string pk
product_id string
variant_id string
type string // image, video
url string
public_id string
thumbnail_url string
alt_text string
is_primary boolean
sort_order int
metadata json // {width, height, format, bytes}
deleted_at timestamp
created_at timestamp
updated_at timestamp
}

product_ingredients [icon: link, color: purple] {
id string pk
product_id string
ingredient_id string
percentage decimal
is_key_ingredient boolean
sort_order int
created_at timestamp
updated_at timestamp
}

categories [icon: folder, color: purple] {
id string pk
parent_id string
slug string unique
name string
description text
level int // Hierarchy depth (0 for root)
path string // Materialized path for tree queries
image {
  url string
  public_id string
}
banner {
  url string
  public_id string
}
is_active boolean
show_in_menu boolean
seo json
sort_order int
deleted_at timestamp
created_at timestamp
updated_at timestamp
}

product_categories [icon: link, color: purple] {
id string pk
product_id string
category_id string
is_primary boolean
created_at timestamp
updated_at timestamp
}

collections [icon: grid, color: purple] {
id string pk
slug string unique
name string
description text
type string // manual, smart
rules json // Array of rule objects: [{field, operator, value}]
rules_match string // all, any (for smart collections)
image {
  url string
  public_id string
}
banner {
  url string
  public_id string
}
is_active boolean
is_featured boolean
seo json
sort_order int
created_by_id string
deleted_at timestamp
created_at timestamp
updated_at timestamp
}

collection_products [icon: link, color: purple] {
id string pk
collection_id string
product_id string
sort_order int
created_at timestamp
updated_at timestamp
}

bundles [icon: gift, color: purple] {
id string pk
product_id string // Optional: Link to product if bundle is product-based
slug string unique
name string
description string
image {
  url string
  public_id string
}
pricing_type string // fixed_price, percentage_off
fixed_price decimal // When pricing_type = fixed_price
percentage_off decimal // When pricing_type = percentage_off
original_price decimal // Calculated: sum of item prices
final_price decimal // Calculated: based on pricing_type
savings decimal // Calculated: original_price - final_price
is_active boolean
start_date timestamp
end_date timestamp
created_by_id string
deleted_at timestamp
created_at timestamp
updated_at timestamp
}

bundle_items [icon: package, color: purple] {
id string pk
bundle_id string
product_id string
variant_id string
quantity int
sort_order int
created_at timestamp
updated_at timestamp
}

related_products [icon: git-merge, color: purple] {
id string pk
product_id string
related_product_id string
relation_type string // cross_sell, upsell, frequently_bought
sort_order int
created_at timestamp
updated_at timestamp
}

//
// SERVICE 3: PRICING & PROMOTIONS SERVICE (Orange)
//

coupons [icon: percent, color: orange] {
id string pk
code string unique
name string
description string
type string // percentage, fixed_amount, free_shipping
value decimal
max_discount decimal
min_order_value decimal
usage_limit_total int
usage_limit_per_user int
usage_count int
applies_to string // all, specific_products, specific_collections
applicable_ids json
excluded_ids json
customer_eligibility string // all, first_order, specific_segments
is_stackable boolean
is_auto_apply boolean
is_active boolean
starts_at timestamp
ends_at timestamp
created_by_id string
created_at timestamp
updated_at timestamp
}

coupon_usage [icon: check-circle, color: orange] {
id string pk
coupon_id string
user_id string
order_id string
discount_amount decimal
used_at timestamp
}

automatic_discounts [icon: zap, color: orange] {
id string pk
name string
type string // percentage, fixed_amount
value decimal
min_order_value decimal
applies_to string // cart, specific_products
applicable_ids json
priority int
is_active boolean
starts_at timestamp
ends_at timestamp
created_by_id string
created_at timestamp
}

tier_discounts [icon: layers, color: orange] {
id string pk
name string
type string // cart_value, cart_quantity
levels json // [{min, max, discount_type, discount_value, badge}]
is_active boolean
starts_at timestamp
ends_at timestamp
created_by_id string
created_at timestamp
}

free_gift_rules [icon: gift, color: orange] {
id string pk
name string
trigger_type string // cart_value, product_purchase
trigger_value decimal
trigger_product_ids json
gift_product_id string
gift_variant_id string
gift_quantity int
is_active boolean
starts_at timestamp
ends_at timestamp
created_by_id string
created_at timestamp
}

//
// SERVICE 4: INVENTORY SERVICE (Red)
//

warehouses [icon: home, color: red] {
id string pk
code string unique
name string
address json
is_active boolean
is_default boolean
priority int
created_at timestamp
}

inventory [icon: box, color: red] {
id string pk
product_id string
variant_id string
sku string unique
warehouse_id string
qty_on_hand int
qty_reserved int
qty_available int
low_stock_threshold int
allow_backorder boolean
status string // in_stock, low_stock, out_of_stock
updated_at timestamp
}

inventory_reservations [icon: lock, color: red] {
id string pk
inventory_id string
cart_id string
order_id string
quantity int
status string // active, released, converted, expired
expires_at timestamp
created_at timestamp
}

inventory_adjustments [icon: edit, color: red] {
id string pk
inventory_id string
type string // restock, sale, return, damage, correction
qty_change int
qty_before int
qty_after int
reason string
reference_type string // order, return, manual
reference_id string
adjusted_by_id string
created_at timestamp
}

//
// SERVICE 5: ORDER & PAYMENT SERVICE (Green)
//

carts [icon: shopping-cart, color: green] {
id string pk
user_id string
session_id string
status string // active, abandoned, converted
currency string
subtotal decimal
discount_total decimal
shipping_total decimal
tax_total decimal
grand_total decimal
item_count int
applied_coupons json
applied_discounts json
free_gifts json
source string // web, mobile
converted_order_id string
expires_at timestamp
created_at timestamp
updated_at timestamp
}

cart_items [icon: package, color: green] {
id string pk
cart_id string
product_id string
variant_id string
bundle_id string
quantity int
unit_price decimal
unit_mrp decimal
line_discount decimal
line_total decimal
is_free_gift boolean
gift_rule_id string
added_at timestamp
}

checkout_sessions [icon: credit-card, color: green] {
id string pk
cart_id string
user_id string
status string // initiated, address_entered, payment_pending, completed, failed
email string
phone string
shipping_address_id string
shipping_address_snapshot json
billing_address_snapshot json
shipping_method_id string
shipping_method_snapshot json
totals_snapshot json
is_gift_order boolean
gift_message string
expires_at timestamp
created_at timestamp
updated_at timestamp
}

orders [icon: file-text, color: green] {
id string pk
order_number string unique
user_id string
checkout_session_id string
status string // pending, confirmed, processing, shipped, delivered, cancelled, returned
payment_status string // pending, paid, failed, refunded
fulfillment_status string // unfulfilled, partially_fulfilled, fulfilled
email string
phone string
currency string
subtotal decimal
discount_total decimal
shipping_total decimal
tax_total decimal
grand_total decimal
paid_amount decimal
refunded_amount decimal
shipping_address_snapshot json
billing_address_snapshot json
shipping_method_snapshot json
applied_coupons_snapshot json
is_gift_order boolean
gift_message string
customer_notes string
internal_notes string
source string
cancellation_reason string
cancelled_by_id string
cancelled_at timestamp
confirmed_at timestamp
shipped_at timestamp
delivered_at timestamp
created_at timestamp
updated_at timestamp
}

order_items [icon: package, color: green] {
id string pk
order_id string
product_id string
variant_id string
bundle_id string
sku string
name string
image_url string
quantity int
quantity_fulfilled int
quantity_returned int
quantity_refunded int
unit_price decimal
unit_mrp decimal
line_discount decimal
line_tax decimal
line_total decimal
hsn_code string
is_free_gift boolean
fulfillment_status string
created_at timestamp
}

order_status_history [icon: clock, color: green] {
id string pk
order_id string
from_status string
to_status string
status_type string // order, payment, fulfillment
notes string
changed_by_type string // system, admin, customer
changed_by_id string
created_at timestamp
}

payments [icon: credit-card, color: green] {
id string pk
order_id string
idempotency_key string unique
gateway string // razorpay
gateway_order_id string
gateway_payment_id string
method string // upi, card, netbanking, wallet, cod
method_details json
status string // pending, authorized, captured, failed, refunded
currency string
amount decimal
captured_amount decimal
refunded_amount decimal
fee decimal
error_message string
gateway_response json
captured_at timestamp
created_at timestamp
updated_at timestamp
}

refunds [icon: rotate-ccw, color: green] {
id string pk
order_id string
payment_id string
refund_number string unique
gateway_refund_id string
type string // full, partial
reason string
status string // pending, processing, completed, failed
amount decimal
items json // [{order_item_id, qty, amount}]
initiated_by_type string // customer, admin
initiated_by_id string
approved_by_id string
notes string
processed_at timestamp
created_at timestamp
updated_at timestamp
}

returns [icon: corner-up-left, color: green] {
id string pk
order_id string
user_id string
return_number string unique
status string // requested, approved, rejected, received, completed
reason string
items json // [{order_item_id, qty, reason, condition, images}]
customer_notes string
admin_notes string
inspection_status string
inspection_notes string
refund_id string
approved_by_id string
completed_at timestamp
created_at timestamp
updated_at timestamp
}

invoices [icon: file-text, color: green] {
id string pk
order_id string
invoice_number string unique
type string // sale, credit_note
status string // draft, issued
totals json // {subtotal, discount, shipping, tax, grand_total}
billing_address_snapshot json
tax_summary json
gstin string
pdf_url string
issued_at timestamp
created_by_id string
created_at timestamp
}

//
// SERVICE 6: SHIPPING SERVICE (Yellow)
//

shipping_zones [icon: map, color: yellow] {
id string pk
name string
countries json
states json
pincodes json
is_default boolean
is_active boolean
priority int
created_at timestamp
}

carriers [icon: truck, color: yellow] {
id string pk
code string unique // shiprocket, delhivery
name string
tracking_url_template string
api_credentials json
is_active boolean
supports_cod boolean
created_at timestamp
}

shipping_methods [icon: truck, color: yellow] {
id string pk
zone_id string
carrier_id string
name string
display_name string
type string // flat_rate, free, weight_based
base_rate decimal
per_kg_rate decimal
free_above decimal
estimated_days_min int
estimated_days_max int
is_cod_available boolean
cod_fee decimal
is_active boolean
sort_order int
created_at timestamp
}

pincode_serviceability [icon: map-pin, color: yellow] {
id string pk
pincode string unique
city string
state string
is_serviceable boolean
is_cod_available boolean
delivery_days int
zone_id string
updated_at timestamp
}

shipments [icon: package, color: yellow] {
id string pk
order_id string
shipment_number string unique
carrier_id string
tracking_number string
awb_number string
status string // pending, picked_up, in_transit, delivered, rto
shipping_method_id string
estimated_delivery date
actual_delivery_date date
weight decimal
delivery_address_snapshot json
shipping_label_url string
tracking_events json // [{status, location, timestamp}]
cod_amount decimal
cod_remitted boolean
created_by_id string
created_at timestamp
updated_at timestamp
}

shipment_items [icon: package, color: yellow] {
id string pk
shipment_id string
order_item_id string
product_id string
variant_id string
quantity int
}

//
// SERVICE 7: CONTENT & CMS SERVICE (Pink)
//

pages [icon: file-text, color: pink] {
id string pk
slug string unique
title string
content text
page_type string // static, policy
status string // draft, published
is_system boolean
author_id string
seo json
published_at timestamp
created_at timestamp
updated_at timestamp
}

blog_categories [icon: folder, color: pink] {
id string pk
slug string unique
name string
parent_id string
is_active boolean
sort_order int
created_at timestamp
}

blogs [icon: edit-3, color: pink] {
id string pk
slug string unique
title string
excerpt string
content text
status string // draft, published
author_id string
author_name string
featured_image_url string
category_id string
tags json
is_featured boolean
view_count int
seo json
published_at timestamp
created_at timestamp
updated_at timestamp
}

banners [icon: image, color: pink] {
id string pk
name string
placement string // hero, top_strip, mid_page
title string
subtitle string
cta_text string
cta_url string
image_desktop_url string
image_mobile_url string
target_pages json
is_active boolean
priority int
starts_at timestamp
ends_at timestamp
created_by_id string
created_at timestamp
}

popups [icon: maximize-2, color: pink] {
id string pk
name string
type string // newsletter, promo, exit_intent
title string
content text
image_url string
cta_text string
cta_url string
trigger_type string // time_delay, exit_intent
trigger_value string
frequency string // once, session, daily
target_pages json
is_active boolean
starts_at timestamp
ends_at timestamp
created_by_id string
created_at timestamp
}

navigation_menus [icon: menu, color: pink] {
id string pk
location string unique // main_header, footer
name string
items json // [{title, url, children: [...]}]
is_active boolean
created_at timestamp
updated_at timestamp
}

faqs [icon: help-circle, color: pink] {
id string pk
category string
question string
answer text
sort_order int
is_active boolean
created_at timestamp
}

media_library [icon: image, color: pink] {
id string pk
filename string
url string
thumbnail_url string
mime_type string
file_size int
alt_text string
folder string
uploaded_by_id string
created_at timestamp
}

//
// SERVICE 8: ENGAGEMENT SERVICE (Teal)
//

reviews [icon: star, color: teal] {
id string pk
product_id string
user_id string
order_id string
order_item_id string
rating int
title string
content text
images json
is_verified_purchase boolean
status string // pending, approved, rejected
is_featured boolean
helpful_count int
admin_response string
admin_response_by_id string
moderated_by_id string
moderated_at timestamp
created_at timestamp
updated_at timestamp
}

review_votes [icon: thumbs-up, color: teal] {
id string pk
review_id string
user_id string
vote_type string // helpful, not_helpful
created_at timestamp
}

wishlists [icon: heart, color: teal] {
id string pk
user_id string
items json // [{product_id, variant_id, added_at}]
updated_at timestamp
}

loyalty_tiers [icon: layers, color: teal] {
id string pk
name string // bronze, silver, gold
min_points int
min_spend decimal
points_multiplier decimal
benefits json
sort_order int
is_active boolean
created_at timestamp
}

loyalty_accounts [icon: award, color: teal] {
id string pk
user_id string
tier_id string
points_balance int
points_earned_lifetime int
points_redeemed_lifetime int
current_year_spend decimal
last_activity_at timestamp
created_at timestamp
updated_at timestamp
}

loyalty_transactions [icon: repeat, color: teal] {
id string pk
user_id string
loyalty_account_id string
type string // earn, redeem, expire, adjust
points int
balance_after int
reference_type string // order, signup, review, referral
reference_id string
description string
created_by_id string
created_at timestamp
}

loyalty_rules [icon: settings, color: teal] {
id string pk
name string
rule_type string // earn, redeem
action_type string // purchase, signup, review, referral
points_value int
min_order_value decimal
is_active boolean
created_by_id string
created_at timestamp
}

referrals [icon: share-2, color: teal] {
id string pk
referrer_user_id string
referrer_code string unique
referee_user_id string
referee_email string
status string // pending, signed_up, converted, rewarded
referee_first_order_id string
referrer_reward_points int
referee_reward_points int
rewards_issued boolean
created_at timestamp
updated_at timestamp
}

store_credits [icon: credit-card, color: teal] {
id string pk
user_id string
balance decimal
currency string
lifetime_earned decimal
lifetime_used decimal
updated_at timestamp
}

store_credit_transactions [icon: repeat, color: teal] {
id string pk
user_id string
store_credit_id string
type string // credit, debit
amount decimal
balance_after decimal
reference_type string // refund, reward, order
reference_id string
description string
created_by_id string
created_at timestamp
}

notification_templates [icon: file-text, color: teal] {
id string pk
code string unique
name string
category string // transactional, marketing
channels json // ["email", "sms", "whatsapp"]
templates json // {email: {subject, body}, sms: {body}, ...}
variables json
is_active boolean
created_at timestamp
}

notifications [icon: bell, color: teal] {
id string pk
template_id string
user_id string
channel string // email, sms, whatsapp, push
recipient string
content json // {subject, body}
reference_type string // order, shipment
reference_id string
status string // pending, sent, delivered, failed
sent_at timestamp
created_at timestamp
}

//
// SYSTEM CONFIG (Gray)
//

settings [icon: settings, color: gray] {
id string pk
group string
key string
value text
updated_by_id string
updated_at timestamp
}

tax_rates [icon: percent, color: gray] {
id string pk
name string
rate decimal
country string
states json
hsn_codes json
is_active boolean
created_at timestamp
}

payment_methods_config [icon: credit-card, color: gray] {
id string pk
code string unique
name string
gateway string
type string // upi, card, cod
is_active boolean
settings json
display_order int
created_at timestamp
}

customer_segments [icon: users, color: gray] {
id string pk
name string
type string // static, dynamic
rules json
user_ids json // for static
customer_count int
is_active boolean
created_by_id string
created_at timestamp
}

analytics_events [icon: bar-chart-2, color: gray] {
id string pk
event_type string // page_view, add_to_cart, purchase
user_id string
session_id string
properties json
device_info json
created_at timestamp
}

//
// RELATIONSHIPS
//

// User & Auth
addresses.user_id > users.id
user_sessions.user_id > users.id
otp_requests.user_id > users.id
admin_users.role_id > roles.id
admin_users.created_by_id > admin_users.id

// Catalog
products.brand_id > brands.id
products.created_by_id > admin_users.id
product_variants.product_id > products.id
product_media.product_id > products.id
product_media.variant_id > product_variants.id
product_ingredients.product_id > products.id
product_ingredients.ingredient_id > ingredients.id
categories.parent_id > categories.id
product_categories.product_id > products.id
product_categories.category_id > categories.id
collections.created_by_id > admin_users.id
collection_products.collection_id > collections.id
collection_products.product_id > products.id
bundles.product_id > products.id
bundles.created_by_id > admin_users.id
bundle_items.bundle_id > bundles.id
bundle_items.product_id > products.id
bundle_items.variant_id > product_variants.id
related_products.product_id > products.id
related_products.related_product_id > products.id

// Pricing & Promotions
coupons.created_by_id > admin_users.id
coupon_usage.coupon_id > coupons.id
coupon_usage.user_id > users.id
coupon_usage.order_id > orders.id
automatic_discounts.created_by_id > admin_users.id
tier_discounts.created_by_id > admin_users.id
free_gift_rules.gift_product_id > products.id
free_gift_rules.gift_variant_id > product_variants.id
free_gift_rules.created_by_id > admin_users.id

// Inventory
inventory.product_id > products.id
inventory.variant_id > product_variants.id
inventory.warehouse_id > warehouses.id
inventory_reservations.inventory_id > inventory.id
inventory_reservations.cart_id > carts.id
inventory_reservations.order_id > orders.id
inventory_adjustments.inventory_id > inventory.id
inventory_adjustments.adjusted_by_id > admin_users.id

// Order & Payment
carts.user_id > users.id
carts.converted_order_id > orders.id
cart_items.cart_id > carts.id
cart_items.product_id > products.id
cart_items.variant_id > product_variants.id
cart_items.bundle_id > bundles.id
cart_items.gift_rule_id > free_gift_rules.id
checkout_sessions.cart_id > carts.id
checkout_sessions.user_id > users.id
checkout_sessions.shipping_address_id > addresses.id
checkout_sessions.shipping_method_id > shipping_methods.id
orders.user_id > users.id
orders.checkout_session_id > checkout_sessions.id
orders.cancelled_by_id > admin_users.id
order_items.order_id > orders.id
order_items.product_id > products.id
order_items.variant_id > product_variants.id
order_items.bundle_id > bundles.id
order_status_history.order_id > orders.id
payments.order_id > orders.id
refunds.order_id > orders.id
refunds.payment_id > payments.id
refunds.approved_by_id > admin_users.id
returns.order_id > orders.id
returns.user_id > users.id
returns.refund_id > refunds.id
returns.approved_by_id > admin_users.id
invoices.order_id > orders.id
invoices.created_by_id > admin_users.id

// Shipping
shipping_methods.zone_id > shipping_zones.id
shipping_methods.carrier_id > carriers.id
pincode_serviceability.zone_id > shipping_zones.id
shipments.order_id > orders.id
shipments.carrier_id > carriers.id
shipments.shipping_method_id > shipping_methods.id
shipments.created_by_id > admin_users.id
shipment_items.shipment_id > shipments.id
shipment_items.order_item_id > order_items.id
shipment_items.product_id > products.id
shipment_items.variant_id > product_variants.id

// Content & CMS
pages.author_id > admin_users.id
blog_categories.parent_id > blog_categories.id
blogs.author_id > admin_users.id
blogs.category_id > blog_categories.id
banners.created_by_id > admin_users.id
popups.created_by_id > admin_users.id
media_library.uploaded_by_id > admin_users.id

// Engagement
reviews.product_id > products.id
reviews.user_id > users.id
reviews.order_id > orders.id
reviews.order_item_id > order_items.id
reviews.admin_response_by_id > admin_users.id
reviews.moderated_by_id > admin_users.id
review_votes.review_id > reviews.id
review_votes.user_id > users.id
wishlists.user_id > users.id
loyalty_accounts.user_id > users.id
loyalty_accounts.tier_id > loyalty_tiers.id
loyalty_transactions.user_id > users.id
loyalty_transactions.loyalty_account_id > loyalty_accounts.id
loyalty_transactions.created_by_id > admin_users.id
loyalty_rules.created_by_id > admin_users.id
referrals.referrer_user_id > users.id
referrals.referee_user_id > users.id
referrals.referee_first_order_id > orders.id
store_credits.user_id > users.id
store_credit_transactions.user_id > users.id
store_credit_transactions.store_credit_id > store_credits.id
store_credit_transactions.created_by_id > admin_users.id
notifications.template_id > notification_templates.id
notifications.user_id > users.id

// System
settings.updated_by_id > admin_users.id
customer_segments.created_by_id > admin_users.id
analytics_events.user_id > users.id
