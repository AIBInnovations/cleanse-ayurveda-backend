# Inventory Service - Implementation Plan

## Executive Summary

The Inventory Service will manage all stock levels, warehouse operations, inventory reservations, and stock adjustments for the e-commerce platform. This service will run on port 3005 and integrate with the Catalog Service for product data, Order & Payment Service for stock reservations, and potentially a future Shipping Service for fulfillment operations.

Service Port: 3005
Total Entities: 4
Total Modules: 5
Total Features: Approximately 35

---

## Service Overview

### Purpose

The Inventory Service is responsible for tracking product availability across multiple warehouses, managing stock levels, reserving inventory during checkout, handling stock adjustments, and providing real-time stock availability information to consumers and admin users.

### Key Responsibilities

Track stock levels by product variant and warehouse location. Reserve inventory when items are added to cart or during checkout. Convert reservations to sales when orders are placed. Release expired or abandoned reservations automatically. Record all stock adjustments with audit trail. Support multiple warehouses with priority-based fulfillment. Provide low-stock and out-of-stock alerts. Enable backorder functionality per SKU. Support stock transfers between warehouses.

### Integration Points

Catalog Service: Read product and variant information for inventory tracking. Order & Payment Service: Receive reservation requests when carts are created and convert reservations when orders are placed. Shipping Service (future): Coordinate warehouse selection for order fulfillment. Admin Service: Provide inventory data for admin dashboards and reporting.

---

## Architecture and Structure

### Directory Structure

The service will follow the standard microservice structure:

services/inventory/
- index.js: Entry point with env-loader and database connection
- index.route.js: Main router aggregating all feature routes
- package.json: Service dependencies and scripts
- .env: PORT configuration only
- config/express.config.js: Express application setup with CORS and middleware
- models/: Mongoose schemas for all entities
- src/stock-check/: Consumer stock availability features
- src/warehouses/: Warehouse management features
- src/inventory-management/: Admin inventory operations
- src/reservations/: Reservation lifecycle management
- src/adjustments/: Stock adjustment tracking
- scripts/: Seed data and utility scripts

### Technology Stack

Runtime: Node.js with ES6 modules
Framework: Express.js
Database: MongoDB via @shared/config
Validation: Joi schemas with @shared/middlewares
Response Format: sendResponse from @shared/utils
File Structure: ES6 imports with .js extensions
Logging: console.log with prefix conventions

### Shared Package Dependencies

The service will use the following shared packages:

@shared/config: Database connection and configuration
@shared/utils: sendResponse utility and HTTP_STATUS constants
@shared/middlewares: validate middleware for request validation
@shared/env-loader: Automatic environment variable loading
@shared/providers: For any future storage needs

---

## Entity Models

### Warehouses Entity

Purpose: Store warehouse location information and fulfillment priority.

Fields to implement:
- id: MongoDB ObjectId, primary key
- code: String, unique warehouse code for identification
- name: String, human-readable warehouse name
- address: JSON object containing full address details
- isActive: Boolean, whether warehouse is operational
- isDefault: Boolean, designate default warehouse for fulfillment
- priority: Number, order of preference for fulfillment routing
- createdAt: Timestamp, auto-generated
- updatedAt: Timestamp, auto-updated

Indexes needed:
- code: Unique index for fast lookup
- isActive: Index for filtering operational warehouses
- priority: Index for fulfillment routing queries
- Compound index on isActive and priority for fulfillment logic

Validation rules:
- code must be unique and alphanumeric
- name is required
- address must contain required fields: line1, city, state, pincode, country
- priority must be positive integer
- Only one warehouse can be default at a time

### Inventory Entity

Purpose: Track stock levels for each product variant in each warehouse.

Fields to implement:
- id: MongoDB ObjectId, primary key
- productId: String, reference to products collection in Catalog Service
- variantId: String, reference to product_variants in Catalog Service
- sku: String, unique SKU for this variant
- warehouseId: ObjectId, reference to warehouses collection
- qtyOnHand: Number, physical stock quantity
- qtyReserved: Number, quantity reserved in active carts or checkouts
- qtyAvailable: Number, calculated field: qtyOnHand minus qtyReserved
- lowStockThreshold: Number, trigger point for low stock alerts
- allowBackorder: Boolean, whether to accept orders when out of stock
- status: String enum, calculated from quantities: in_stock, low_stock, out_of_stock
- updatedAt: Timestamp, auto-updated on every change

Indexes needed:
- sku: Unique index for fast SKU lookup
- productId: Index for product-level queries
- variantId: Index for variant-level queries
- warehouseId: Index for warehouse-specific operations
- status: Index for filtering by availability
- Compound index on productId and warehouseId
- Compound index on variantId and warehouseId
- Compound index on status and warehouseId

Validation rules:
- sku must be unique across all warehouses
- productId and variantId must exist in Catalog Service
- warehouseId must exist in warehouses collection
- qtyOnHand cannot be negative
- qtyReserved cannot exceed qtyOnHand
- lowStockThreshold must be positive or zero
- status must be one of: in_stock, low_stock, out_of_stock

Business logic:
- qtyAvailable is always calculated as qtyOnHand minus qtyReserved, never stored
- status is calculated: out_of_stock if qtyAvailable is zero, low_stock if qtyAvailable is below lowStockThreshold, otherwise in_stock
- updatedAt should be updated on every stock change for audit purposes

### Inventory Reservations Entity

Purpose: Track temporary stock holds during cart and checkout processes.

Fields to implement:
- id: MongoDB ObjectId, primary key
- inventoryId: ObjectId, reference to inventory collection
- cartId: String, reference to carts in Order & Payment Service
- orderId: String, reference to orders when reservation is converted
- quantity: Number, amount of stock reserved
- status: String enum, reservation lifecycle state
- expiresAt: Timestamp, when this reservation automatically releases
- createdAt: Timestamp, when reservation was created
- updatedAt: Timestamp, last status change

Status enum values:
- active: Reservation is currently holding stock
- released: Reservation was cancelled and stock returned
- converted: Reservation was converted to order
- expired: Reservation timed out and stock was auto-released

Indexes needed:
- inventoryId: Index for inventory-specific queries
- cartId: Index for cart-specific lookups
- orderId: Index for order-specific lookups
- status: Index for filtering active reservations
- expiresAt: Index for expiration cleanup job
- Compound index on inventoryId and status
- Compound index on status and expiresAt for cleanup

Validation rules:
- inventoryId must exist in inventory collection
- Either cartId or orderId must be present, not both initially
- quantity must be positive
- expiresAt must be in the future for active reservations
- status transitions must follow: active to released, active to converted, active to expired

Business logic:
- Create reservation with active status when item added to cart
- Set expiresAt based on configured TTL, typically 15-30 minutes
- Background job should scan for expired reservations and auto-release
- When order is placed, update status to converted and set orderId
- When cart is abandoned or item removed, update status to released
- Released or expired reservations should decrement qtyReserved in inventory

### Inventory Adjustments Entity

Purpose: Audit trail for all stock quantity changes with reasons.

Fields to implement:
- id: MongoDB ObjectId, primary key
- inventoryId: ObjectId, reference to inventory collection
- type: String enum, reason category for adjustment
- qtyChange: Number, delta applied to stock, can be positive or negative
- qtyBefore: Number, snapshot of qtyOnHand before adjustment
- qtyAfter: Number, snapshot of qtyOnHand after adjustment
- reason: String, human-readable explanation for adjustment
- referenceType: String enum, what triggered this adjustment
- referenceId: String, ID of related entity if applicable
- adjustedById: ObjectId, admin user who made adjustment or system
- createdAt: Timestamp, when adjustment was made

Type enum values:
- restock: Receiving new stock from supplier
- sale: Stock reduced due to order fulfillment
- return: Stock added back from customer return
- damage: Stock removed due to damaged goods
- correction: Manual correction of inventory count

Reference type enum values:
- order: Adjustment related to order fulfillment
- return: Adjustment from customer return
- manual: Admin manual adjustment
- system: System-initiated adjustment

Indexes needed:
- inventoryId: Index for inventory history queries
- type: Index for filtering by adjustment type
- referenceType and referenceId: Compound index for tracing related records
- adjustedById: Index for admin audit queries
- createdAt: Index for time-based queries and reporting

Validation rules:
- inventoryId must exist in inventory collection
- qtyChange cannot be zero
- qtyBefore and qtyAfter must match the actual change
- reason is required for all adjustments
- adjustedById is required for manual adjustments
- referenceId is required when referenceType is order or return

Business logic:
- Every change to inventory qtyOnHand must create an adjustment record
- Adjustment record is immutable once created
- qtyBefore and qtyAfter provide verification that adjustment was applied correctly
- System adjustments have adjustedById set to system user or null

---

## Module Implementation Details

### Module 4.1: Stock Check Module

Purpose: Provide real-time stock availability information to consumers.

Consumer Features to Implement:

Feature: View stock availability on PDP
Endpoint: GET /api/stock/check/:variantId
Description: Return stock status for a specific product variant across all warehouses or specific warehouse.
Request: Query parameter warehouseId optional for specific warehouse check.
Response: Object containing sku, status enum, isAvailable boolean, qtyAvailable if in stock, lowStockWarning boolean, allowBackorder boolean.
Logic: Aggregate inventory records for the variant across requested warehouses. Calculate total available quantity. Determine overall status. Return lowStockWarning if any warehouse shows low stock.

Feature: View in-stock or out-of-stock badge
Endpoint: Same as above, consumed by frontend for badge display.
Response: Include status field that frontend maps to badge colors and text.

Feature: View low-stock warning with Only X left message
Endpoint: Same as above.
Response: Include qtyAvailable in response when status is low_stock.
Logic: Only show exact quantity when below lowStockThreshold to create urgency.

Feature: Check stock before add to cart
Endpoint: POST /api/stock/check/bulk
Description: Check availability for multiple variants at once for cart operations.
Request: Body contains array of objects with variantId and requestedQty.
Response: Array of availability results for each variant including available boolean and reason if unavailable.
Logic: Validate each variant has sufficient qtyAvailable for requested quantity. Consider existing reservations.

Feature: Stock validation at checkout
Endpoint: POST /api/stock/validate/checkout
Description: Validate entire cart contents are available before proceeding to payment.
Request: Body contains cartId and array of items with variantId and quantity.
Response: Object with allAvailable boolean, unavailableItems array if any items are out of stock.
Logic: Check all items simultaneously. Lock check with reservation creation to prevent race conditions. Return specific items that failed validation.

Admin Features to Implement:

Feature: View inventory dashboard
Endpoint: GET /api/admin/inventory/dashboard
Description: Overview of inventory health metrics.
Response: Object containing totalSkus, inStockCount, lowStockCount, outOfStockCount, totalValue, topLowStockItems array.
Logic: Aggregate inventory collection grouped by status. Calculate totals. Identify top priority low stock items based on sales velocity if available.

Feature: View stock levels by product or SKU
Endpoint: GET /api/admin/inventory
Description: List all inventory records with filtering and pagination.
Request: Query parameters for productId, warehouseId, status, sku, page, limit, sortBy, sortOrder.
Response: Paginated list of inventory records with full details including warehouse name, product name.
Logic: Query inventory with filters. Populate warehouse and product details. Support sorting by various fields.

Feature: View low-stock items
Endpoint: GET /api/admin/inventory/low-stock
Description: Filter for items below their low stock threshold.
Request: Query parameters for warehouseId, page, limit.
Response: Paginated list of inventory records where status is low_stock.
Logic: Filter inventory where qtyAvailable is less than lowStockThreshold and greater than zero.

Feature: View out-of-stock items
Endpoint: GET /api/admin/inventory/out-of-stock
Description: Filter for items with zero available quantity.
Request: Query parameters for warehouseId, page, limit.
Response: Paginated list of inventory records where status is out_of_stock.
Logic: Filter inventory where qtyAvailable is zero.

Feature: Export inventory report
Endpoint: GET /api/admin/inventory/export
Description: Generate CSV export of inventory data.
Request: Query parameters for filters same as list endpoint, format defaults to csv.
Response: CSV file download with all inventory records matching filters.
Logic: Query inventory with filters. Transform to CSV format. Stream response with appropriate content-type header.

### Module 4.2: Warehouses Module

Purpose: Manage warehouse locations and configurations.

Admin Features to Implement:

Feature: View all warehouses
Endpoint: GET /api/admin/warehouses
Description: List all warehouse locations with filtering.
Request: Query parameters for isActive, page, limit.
Response: Paginated list of warehouse records with inventory summary counts.
Logic: Query warehouses collection. For each warehouse, aggregate inventory to show total SKUs and total stock quantity.

Feature: Create new warehouse
Endpoint: POST /api/admin/warehouses
Description: Add a new warehouse location.
Request: Body contains code, name, address object, isActive, isDefault, priority.
Response: Created warehouse object with generated id.
Validation: code must be unique, name required, address must have all required fields, priority must be positive integer.
Logic: If isDefault is true, unset default flag on all other warehouses first. Create warehouse record. Return created record.

Feature: Edit warehouse details
Endpoint: PUT /api/admin/warehouses/:id
Description: Update warehouse information.
Request: Body contains fields to update: name, address, isActive, isDefault, priority.
Response: Updated warehouse object.
Validation: Cannot change code after creation. If setting isDefault to true, must unset on others.
Logic: Find warehouse by id. Validate changes. If setting as default, update other warehouses. Update record. Return updated record.

Feature: Set warehouse address
Endpoint: Same as edit warehouse, address is part of updatable fields.

Feature: Set default warehouse
Endpoint: PUT /api/admin/warehouses/:id/set-default
Description: Mark specific warehouse as default for fulfillment.
Request: No body required.
Response: Updated warehouse object.
Logic: Unset isDefault on all warehouses. Set isDefault to true for specified warehouse. Return updated warehouse.

Feature: Set warehouse priority for fulfillment
Endpoint: Same as edit warehouse, priority is updatable field.
Logic: Priority determines order in which warehouses are checked for fulfillment. Lower number means higher priority.

Feature: Activate or deactivate warehouse
Endpoint: PATCH /api/admin/warehouses/:id/status
Description: Toggle warehouse operational status.
Request: Body contains isActive boolean.
Response: Updated warehouse object.
Validation: Cannot deactivate warehouse if it is the only active warehouse. Cannot deactivate if it has active inventory reservations.
Logic: Validate constraints. Update isActive. Return updated record.

Feature: Delete warehouse
Endpoint: DELETE /api/admin/warehouses/:id
Description: Remove warehouse from system.
Response: Success message.
Validation: Cannot delete warehouse if it has any inventory records. Cannot delete if it is default warehouse.
Logic: Check for related inventory records. Reject if found. Delete warehouse. Return success response.

### Module 4.3: Inventory Management Module

Purpose: Enable admin users to manage stock levels and configurations.

Admin Features to Implement:

Feature: Update stock quantity
Endpoint: PUT /api/admin/inventory/:id/quantity
Description: Manually adjust stock quantity for specific inventory record.
Request: Body contains qtyChange number and reason string.
Response: Updated inventory record and created adjustment record.
Validation: qtyChange cannot result in negative qtyOnHand. Reason is required.
Logic: Calculate new qtyOnHand. Create adjustment record with type correction and qtyBefore and qtyAfter. Update inventory qtyOnHand. Recalculate qtyAvailable and status. Return updated inventory and adjustment records.

Feature: Bulk update stock via CSV
Endpoint: POST /api/admin/inventory/bulk-update
Description: Upload CSV file to update multiple inventory records.
Request: Multipart form with CSV file. CSV columns: sku, warehouseCode, qtyChange, reason.
Response: Object with successCount, failureCount, errors array with row details.
Validation: Each row must have valid sku, warehouseCode, numeric qtyChange, and reason.
Logic: Parse CSV file. For each row, find inventory by sku and warehouse. Validate data. Create adjustment record. Update inventory. Collect results. Return summary with any errors.

Feature: Set low stock threshold per SKU
Endpoint: PUT /api/admin/inventory/:id/threshold
Description: Configure when low stock alerts trigger.
Request: Body contains lowStockThreshold number.
Response: Updated inventory record.
Validation: lowStockThreshold must be positive or zero.
Logic: Update lowStockThreshold. Recalculate status based on new threshold. Return updated record.

Feature: Set reorder point
Extension: Include reorderPoint field in inventory model.
Endpoint: PUT /api/admin/inventory/:id/reorder-point
Description: Configure automatic reorder trigger point.
Request: Body contains reorderPoint number.
Response: Updated inventory record.
Logic: This is a configuration field for future purchase order automation. Update reorderPoint. Return updated record.

Feature: Enable or disable backorder per SKU
Endpoint: PATCH /api/admin/inventory/:id/backorder
Description: Toggle whether orders can be accepted when out of stock.
Request: Body contains allowBackorder boolean.
Response: Updated inventory record.
Logic: Update allowBackorder field. Return updated record.

Feature: Set backorder limit
Extension: Include backorderLimit field in inventory model.
Endpoint: PUT /api/admin/inventory/:id/backorder-limit
Description: Configure maximum negative inventory allowed for backorders.
Request: Body contains backorderLimit number.
Response: Updated inventory record.
Validation: backorderLimit must be positive or zero.
Logic: This limits how many units can be backordered. Update backorderLimit. Return updated record.

Feature: View inventory by warehouse
Endpoint: GET /api/admin/inventory
Description: Same as stock check list endpoint with warehouseId filter.

Feature: Transfer stock between warehouses
Endpoint: POST /api/admin/inventory/transfer
Description: Move stock from one warehouse to another.
Request: Body contains fromWarehouseId, toWarehouseId, variantId, quantity, reason.
Response: Object with updated inventory records for both warehouses and created adjustment records.
Validation: fromWarehouse must have sufficient qtyAvailable. Both warehouses must exist and be active. quantity must be positive.
Logic: Find inventory records for variant in both warehouses. Validate sufficient stock in source. Create inventory record in destination if not exists. Create adjustment record for source with type correction and negative qtyChange. Create adjustment record for destination with positive qtyChange. Update both inventory records. Return both updated records and adjustments.

### Module 4.4: Reservations Module

Purpose: Manage temporary stock holds during shopping and checkout.

System Features to Implement:

Feature: Reserve stock when item added to cart
Endpoint: POST /api/reservations
Description: Create reservation to hold stock for cart item.
Request: Body contains cartId, variantId, quantity, warehouseId optional.
Response: Created reservation object.
Validation: Inventory must have sufficient qtyAvailable. quantity must be positive.
Logic: Find inventory for variant in specified or default warehouse. Check qtyAvailable is sufficient. Create reservation with status active and expiresAt based on configured TTL. Increment inventory qtyReserved atomically. Return created reservation.

Feature: Reserve stock during checkout
Endpoint: POST /api/reservations/checkout
Description: Create or extend reservations for all cart items at checkout.
Request: Body contains cartId and items array with variantId and quantity.
Response: Object with reservations array and allReserved boolean.
Logic: For each item, find or create reservation. Extend expiresAt for checkout TTL which is longer than cart TTL. Validate all items can be reserved. If any fail, release all and return failure. Return all reservation records.

Feature: Convert reservation to sale on order placement
Endpoint: POST /api/reservations/convert
Description: Finalize reservations when order is confirmed.
Request: Body contains cartId and orderId.
Response: Updated reservations array.
Validation: Reservations must exist and be in active status. orderId must be provided.
Logic: Find all active reservations for cartId. Update status to converted. Set orderId. Decrement inventory qtyReserved. Decrement inventory qtyOnHand. Create adjustment records with type sale and referenceType order. Return updated reservations.

Feature: Auto-release expired reservations
Endpoint: Background job, not HTTP endpoint.
Description: Scheduled task that releases expired reservations.
Logic: Query reservations where status is active and expiresAt is less than current time. For each expired reservation, update status to expired. Decrement inventory qtyReserved atomically. Create adjustment record if needed. This job should run every minute or use TTL indexes on MongoDB.

Feature: Release reservation on cart abandonment
Endpoint: DELETE /api/reservations/cart/:cartId
Description: Release all reservations for a cart.
Request: cartId in URL parameter.
Response: Object with releasedCount number.
Logic: Find all active reservations for cartId. Update status to released. Decrement inventory qtyReserved for each atomically. Return count of released reservations.

Admin Features to Implement:

Feature: View active reservations
Endpoint: GET /api/admin/reservations
Description: List all reservations with filtering.
Request: Query parameters for status, inventoryId, cartId, orderId, page, limit.
Response: Paginated list of reservation records with populated inventory and cart details.
Logic: Query reservations with filters. Populate related records. Return paginated results.

Feature: Manually release reservation
Endpoint: DELETE /api/admin/reservations/:id
Description: Admin force-release of a reservation.
Request: Reservation id in URL.
Response: Updated reservation object.
Validation: Reservation must be in active status.
Logic: Update reservation status to released. Decrement inventory qtyReserved. Create adjustment record. Return updated reservation.

Feature: Configure reservation TTL
Endpoint: PUT /api/admin/settings/reservation-ttl
Description: Set expiration time for cart and checkout reservations.
Request: Body contains cartTTL in minutes and checkoutTTL in minutes.
Response: Updated settings object.
Validation: Both TTL values must be positive integers. checkoutTTL should be longer than cartTTL.
Logic: Update system settings for reservation TTL. These values are used when creating new reservations.

### Module 4.5: Stock Adjustments Module

Purpose: Track and audit all inventory quantity changes.

Admin Features to Implement:

Feature: Record stock restock
Endpoint: POST /api/admin/adjustments/restock
Description: Record receiving stock from supplier.
Request: Body contains inventoryId, quantity, reason, referenceId optional for purchase order.
Response: Created adjustment record and updated inventory.
Validation: quantity must be positive. inventoryId must exist. reason is required.
Logic: Find inventory by id. Calculate new qtyOnHand. Create adjustment with type restock, qtyBefore, qtyAfter, qtyChange. Update inventory qtyOnHand. Recalculate qtyAvailable and status. Return adjustment and updated inventory.

Feature: Record damage or loss
Endpoint: POST /api/admin/adjustments/damage
Description: Record stock removed due to damage or loss.
Request: Body contains inventoryId, quantity, reason.
Response: Created adjustment record and updated inventory.
Validation: quantity must be positive. Resulting qtyOnHand cannot be negative. reason is required.
Logic: Find inventory. Validate sufficient stock. Calculate new qtyOnHand. Create adjustment with type damage and negative qtyChange. Update inventory. Return adjustment and updated inventory.

Feature: Record stock correction
Endpoint: POST /api/admin/adjustments/correction
Description: Manual correction for inventory discrepancies.
Request: Body contains inventoryId, qtyChange positive or negative, reason.
Response: Created adjustment record and updated inventory.
Validation: inventoryId must exist. reason is required. Resulting qtyOnHand cannot be negative.
Logic: Find inventory. Calculate new qtyOnHand. Create adjustment with type correction. Update inventory. Return adjustment and updated inventory.

Feature: Add adjustment reason and notes
Implementation: reason field is required for all adjustments. notes field can be added as optional text field for additional context.

Feature: View adjustment history
Endpoint: GET /api/admin/adjustments
Description: List all stock adjustments with filtering.
Request: Query parameters for inventoryId, type, referenceType, adjustedById, startDate, endDate, page, limit.
Response: Paginated list of adjustment records with populated inventory and admin details.
Logic: Query adjustments with filters. Support date range filtering. Populate related records. Return paginated results.

Feature: View adjustment audit trail
Endpoint: GET /api/admin/adjustments/inventory/:inventoryId
Description: Full history of changes for specific inventory record.
Request: inventoryId in URL, query parameters for startDate, endDate.
Response: Chronological list of all adjustments for the inventory record.
Logic: Query adjustments filtered by inventoryId. Sort by createdAt descending. Return full history.

Feature: Export adjustment report
Endpoint: GET /api/admin/adjustments/export
Description: Generate CSV export of adjustment data.
Request: Query parameters for filters same as list endpoint, format defaults to csv.
Response: CSV file download with adjustment records.
Logic: Query adjustments with filters. Transform to CSV format. Stream response with appropriate content-type header.

---

## API Endpoints Summary

### Consumer Endpoints

Stock Check:
- GET /api/stock/check/:variantId - Check availability for specific variant
- POST /api/stock/check/bulk - Check multiple variants at once
- POST /api/stock/validate/checkout - Validate entire cart before checkout

Reservations:
- POST /api/reservations - Create reservation for cart item
- POST /api/reservations/checkout - Reserve all items at checkout
- POST /api/reservations/convert - Convert reservations to sale
- DELETE /api/reservations/cart/:cartId - Release cart reservations

### Admin Endpoints

Warehouses:
- GET /api/admin/warehouses - List all warehouses
- POST /api/admin/warehouses - Create new warehouse
- PUT /api/admin/warehouses/:id - Update warehouse details
- PUT /api/admin/warehouses/:id/set-default - Set as default warehouse
- PATCH /api/admin/warehouses/:id/status - Activate or deactivate
- DELETE /api/admin/warehouses/:id - Delete warehouse

Inventory Management:
- GET /api/admin/inventory - List inventory with filters
- GET /api/admin/inventory/dashboard - Inventory overview metrics
- GET /api/admin/inventory/low-stock - Filter low stock items
- GET /api/admin/inventory/out-of-stock - Filter out of stock items
- GET /api/admin/inventory/export - Export inventory report
- PUT /api/admin/inventory/:id/quantity - Update stock quantity
- POST /api/admin/inventory/bulk-update - Bulk update via CSV
- PUT /api/admin/inventory/:id/threshold - Set low stock threshold
- PUT /api/admin/inventory/:id/reorder-point - Set reorder point
- PATCH /api/admin/inventory/:id/backorder - Enable or disable backorder
- PUT /api/admin/inventory/:id/backorder-limit - Set backorder limit
- POST /api/admin/inventory/transfer - Transfer stock between warehouses

Reservations:
- GET /api/admin/reservations - List reservations with filters
- DELETE /api/admin/reservations/:id - Manually release reservation
- PUT /api/admin/settings/reservation-ttl - Configure TTL settings

Adjustments:
- POST /api/admin/adjustments/restock - Record restock
- POST /api/admin/adjustments/damage - Record damage or loss
- POST /api/admin/adjustments/correction - Record correction
- GET /api/admin/adjustments - List all adjustments
- GET /api/admin/adjustments/inventory/:inventoryId - Adjustment history for SKU
- GET /api/admin/adjustments/export - Export adjustment report

Health Check:
- GET /api/health - Service health check

---

## Implementation Phases

### Phase 1: Week 1 - Foundation and Core Models

Task: Set up service structure using create-service script.
Details: Run create-service.py script with service name inventory and port 3005. Verify package.json has all shared dependencies. Confirm index.js loads env-loader first.

Task: Implement all four entity models.
Details: Create warehouses.model.js with validation for unique code and default warehouse logic. Create inventory.model.js with compound indexes and virtual fields for qtyAvailable and status. Create inventoryReservation.model.js with status enum and expiration logic. Create inventoryAdjustment.model.js with type and referenceType enums. Add all indexes specified in entity model section.

Task: Create validation schemas for all entities.
Details: Create Joi schemas for each entity covering create and update operations. Include proper validation for enums, required fields, and business rules like priority must be positive.

Task: Implement health check endpoint.
Details: Create basic route in index.route.js returning status ok. Test service starts on port 3005 and responds to health check.

### Phase 2: Week 2 - Warehouses and Basic Inventory

Task: Implement Warehouses Module completely.
Details: Create warehouses.controller.js with all CRUD operations. Create warehouses.route.js with all endpoints. Implement default warehouse toggle logic ensuring only one is default. Implement activate and deactivate with validation checks. Test all warehouse operations.

Task: Implement basic inventory records creation.
Details: Create inventory.controller.js with create and read operations. Create inventory.route.js. Implement logic to create inventory records when new product variants are added via integration or seed script. Test creating inventory for multiple warehouses.

Task: Implement inventory dashboard and list endpoints.
Details: Create dashboard aggregation query for metrics. Implement list endpoint with filtering by productId, warehouseId, status. Implement pagination. Test dashboard shows correct counts.

### Phase 3: Week 3 - Stock Check and Consumer Features

Task: Implement Stock Check Module consumer endpoints.
Details: Create stock-check.controller.js with all consumer endpoints. Implement variant availability check aggregating across warehouses. Implement bulk check for multiple variants. Implement checkout validation endpoint. Create stock-check.route.js. Test all stock check scenarios including low stock and out of stock.

Task: Implement status calculation logic.
Details: Add middleware or model methods to calculate inventory status from qtyAvailable and lowStockThreshold. Ensure status updates automatically when quantities change. Test status transitions.

Task: Implement low stock and out of stock filter endpoints.
Details: Add filtered list endpoints to inventory controller. Test filtering shows correct items based on status.

### Phase 4: Week 4 - Reservations System

Task: Implement Reservations Module create and release.
Details: Create reservations.controller.js with create, release, and convert endpoints. Implement atomic operations to increment and decrement qtyReserved in inventory. Implement TTL-based expiration timestamps. Create reservations.route.js. Test reservation creation and release flows.

Task: Implement reservation conversion to sale.
Details: Create convert endpoint that updates reservation status, decrements qtyReserved and qtyOnHand, creates adjustment records. Test order placement flow end-to-end with reservations.

Task: Implement expiration cleanup job.
Details: Create background job in scripts/cleanup-reservations.js that runs periodically. Query expired reservations and release them. Test expiration job correctly releases stock. Consider using MongoDB TTL indexes for automatic expiration.

Task: Implement admin reservation management.
Details: Add admin list and manual release endpoints. Test admin can view and release reservations.

### Phase 5: Week 5 - Inventory Management Operations

Task: Implement stock quantity update endpoints.
Details: Add update quantity endpoint with adjustment record creation. Implement atomic operations to prevent race conditions. Test manual quantity adjustments create proper audit trail.

Task: Implement threshold and backorder configuration.
Details: Add endpoints for setting lowStockThreshold, reorderPoint, allowBackorder, backorderLimit. Test these configurations affect stock check responses appropriately.

Task: Implement bulk update via CSV.
Details: Add CSV upload endpoint using multer middleware from shared packages. Parse CSV rows. Validate each row. Process updates in transaction if possible. Return detailed results with success and failure counts. Test bulk update with various CSV formats.

Task: Implement stock transfer between warehouses.
Details: Add transfer endpoint with validation for sufficient stock. Create adjustment records for both warehouses. Update inventory atomically for both locations. Test transfer updates both warehouse stocks correctly.

### Phase 6: Week 6 - Adjustments and Audit Trail

Task: Implement Stock Adjustments Module endpoints.
Details: Create adjustments.controller.js with restock, damage, and correction endpoints. Each endpoint creates adjustment record and updates inventory. Create adjustments.route.js. Test all adjustment types.

Task: Implement adjustment history and audit trail.
Details: Add list adjustments endpoint with filtering. Add inventory-specific history endpoint. Test history shows complete audit trail chronologically.

Task: Implement export functionality for inventory and adjustments.
Details: Add CSV export endpoints for inventory and adjustments. Transform query results to CSV format. Stream response with proper headers. Test exports include all filtered data.

Task: Add adjustment validations and constraints.
Details: Ensure adjustments cannot create negative inventory except for backorders. Validate reasons are provided. Test validation prevents invalid adjustments.

### Phase 7: Week 7 - Integration and Testing

Task: Create integration with Catalog Service.
Details: Add endpoints or listeners to create inventory records when products and variants are added in Catalog Service. Test inventory records are created for new products. This may require message queue integration in future.

Task: Create integration with Order & Payment Service.
Details: Add webhooks or endpoints for order placement to trigger reservation conversion. Test order placement correctly converts reservations and adjusts stock. This may require message queue integration in future.

Task: Create seed data script.
Details: Create scripts/seed.js to populate warehouses and inventory for testing. Include sample products from Catalog Service. Test seed script creates realistic data.

Task: End-to-end testing of all flows.
Details: Test complete cart to order flow with reservations. Test low stock alerts trigger correctly. Test admin operations maintain data consistency. Test concurrent operations handle race conditions. Test expiration job runs correctly.

### Phase 8: Week 8 - Performance and Documentation

Task: Add caching for frequently accessed data.
Details: Consider caching stock availability for high-traffic products using Redis if available. Cache warehouse list. Implement cache invalidation on updates.

Task: Optimize database queries and indexes.
Details: Review query performance. Add missing indexes. Use explain to identify slow queries. Optimize aggregation pipelines.

Task: Add API documentation.
Details: Document all endpoints with request and response examples. Add JSDoc comments to controllers with complete route paths. Create Postman collection for manual testing.

Task: Create deployment documentation.
Details: Document environment variables required. Document database indexes that must be created. Document background jobs that must be scheduled. Document integration points with other services.

---

## Dependencies and Integrations

### Internal Service Dependencies

Catalog Service: Required for product and variant information. Inventory service needs to query or receive product data to validate productId and variantId. Integration approach: Direct database read or API calls for validation. Future: Message queue subscription for product created events.

Order & Payment Service: Required for reservation lifecycle. Order service triggers reservation creation when cart is updated and reservation conversion when order is placed. Integration approach: API calls from Order service to Inventory service. Future: Message queue for order events.

Shipping Service: Future integration for fulfillment. Shipping service will need to know which warehouse to fulfill orders from and confirm stock reduction. Integration approach: Future message queue or API calls.

Admin Service: Future integration for dashboard widgets. Admin dashboard may display inventory metrics and alerts. Integration approach: API calls from Admin service to fetch dashboard data.

### External Dependencies

MongoDB: Database for all inventory data. Requires indexes specified in entity models. Requires atomic operations for reservation increment and decrement.

Redis: Optional for caching stock availability and warehouse data. Reduces database load for high-traffic stock checks.

Message Queue: Future requirement for event-driven architecture. RabbitMQ or Redis pub/sub for product created events, order placed events, and stock alerts.

Background Job Scheduler: Required for reservation expiration cleanup. Can use node-cron, bull queue, or MongoDB TTL indexes.

### Package Dependencies

All shared packages: @shared/config, @shared/utils, @shared/middlewares, @shared/env-loader.

Additional dependencies to add: multer for CSV upload, csv-parser for parsing CSV files, json2csv for CSV export.

---

## Security Considerations

### Authentication and Authorization

All admin endpoints must require authentication. Use JWT middleware from shared packages to verify admin tokens. Validate admin has appropriate permissions for inventory operations using role-based access control.

Consumer endpoints for stock check are public read-only. Reservation endpoints should validate cartId belongs to authenticated user if user is logged in. For guest carts, validate cartId from session.

### Input Validation

All POST, PUT, PATCH endpoints must use Joi validation middleware. Validate all numeric inputs are within acceptable ranges. Validate SKU and warehouse codes match expected formats. Sanitize reason text fields to prevent injection attacks.

### Race Condition Prevention

Use atomic operations for all qtyReserved and qtyOnHand updates. Use MongoDB findOneAndUpdate with increment operators. Consider implementing optimistic locking with version field for critical updates. Ensure reservation creation and inventory update happen atomically.

### Audit Trail Integrity

Adjustment records are immutable once created. Do not allow updates or deletes on adjustment records. All inventory changes must create corresponding adjustment record. Validate qtyBefore and qtyAfter match actual inventory state.

### Rate Limiting

Implement rate limiting on consumer stock check endpoints to prevent abuse. Limit bulk check endpoint to reasonable number of items per request. Consider rate limiting CSV uploads to prevent resource exhaustion.

---

## Testing Strategy

### Unit Tests

Test warehouse model validation rules. Test inventory status calculation logic. Test reservation expiration date calculation. Test adjustment record creation with correct qtyBefore and qtyAfter values.

### Integration Tests

Test warehouse creation and retrieval. Test inventory creation for new products. Test stock check returns correct availability. Test reservation creation increments qtyReserved. Test reservation release decrements qtyReserved. Test order conversion decrements qtyOnHand and creates adjustment. Test stock transfer updates both warehouses correctly. Test bulk CSV update processes all rows.

### End-to-End Tests

Test complete shopping flow: product view shows in stock, add to cart creates reservation, proceed to checkout extends reservation, place order converts reservation and adjusts inventory. Test stock becomes unavailable after last unit is sold. Test low stock warning appears when threshold is crossed. Test backorder allows ordering when out of stock if enabled. Test admin can adjust inventory and see adjustment history.

### Performance Tests

Test stock check endpoint handles high concurrent requests. Test bulk check with 50-100 items in cart. Test reservation cleanup job processes thousands of expired reservations efficiently. Test CSV bulk update with 10000 rows completes in reasonable time.

### Manual Testing

Use Postman collection to test all endpoints. Verify response formats match specification. Test error handling with invalid inputs. Test concurrent operations do not cause data inconsistencies. Verify audit trail captures all changes correctly.

---

## Configuration Requirements

### Environment Variables

Service-specific in services/inventory/.env:
- PORT=3005

Shared configuration in root .env:
- MONGODB_URI: Database connection string
- JWT_SECRET: For admin authentication
- RESERVATION_CART_TTL: Default 15 minutes
- RESERVATION_CHECKOUT_TTL: Default 30 minutes

### System Settings

These should be stored in database settings collection for runtime configuration:
- reservationCartTTL: Minutes before cart reservation expires
- reservationCheckoutTTL: Minutes before checkout reservation expires
- defaultWarehouseId: Default warehouse for new inventory records
- lowStockAlertEnabled: Whether to send alerts for low stock
- backorderGlobalEnabled: Global toggle for backorder functionality

---

## Error Handling

### Error Response Format

All errors must use sendResponse utility from @shared/utils. Include appropriate HTTP status codes. Provide clear error messages for users and detailed error information in development environment only.

### Common Error Scenarios

Insufficient stock: Return 400 Bad Request with message indicating variant is out of stock or insufficient quantity available.

Warehouse not found: Return 404 Not Found with message indicating warehouse does not exist.

Inventory record not found: Return 404 Not Found with specific SKU and warehouse information.

Reservation expired: Return 410 Gone with message that reservation has expired and cart should be refreshed.

Invalid adjustment: Return 400 Bad Request indicating why adjustment cannot be applied such as would result in negative inventory.

Concurrent update conflict: Return 409 Conflict if optimistic locking detects concurrent modification.

CSV validation errors: Return 400 Bad Request with detailed array of row-level errors.

---

## Performance Optimization

### Database Optimization

Create all specified compound indexes. Use projection to return only needed fields in list queries. Use aggregation pipeline for dashboard metrics instead of multiple queries. Consider read replicas for stock check queries if traffic is high.

### Caching Strategy

Cache warehouse list in Redis with 1 hour TTL. Cache stock availability for top products with 5 minute TTL. Invalidate cache on inventory updates. Use cache-aside pattern for stock checks.

### Query Optimization

Use lean queries when full Mongoose documents are not needed. Limit population of related documents to necessary fields only. Paginate all list endpoints to prevent large result sets. Use cursor-based pagination for exports.

### Background Job Optimization

Run expiration cleanup every 5 minutes or use MongoDB TTL index for automatic cleanup. Batch reservation releases in transactions. Process adjustments asynchronously if volume is high. Consider using job queue for CSV processing.

---

## Monitoring and Alerts

### Metrics to Track

Stock check endpoint response time. Reservation creation success and failure rates. Number of active reservations. Number of expired reservations cleaned up. Inventory adjustment frequency by type. Low stock item count. Out of stock item count. Cache hit and miss rates.

### Alerts to Configure

Alert when any SKU goes out of stock. Alert when low stock threshold is crossed for critical products. Alert when reservation expiration job fails. Alert when stock check response time exceeds threshold. Alert when adjustment creates negative inventory. Alert when reservation conversion fails.

### Logging Strategy

Log all inventory quantity changes with before and after values. Log all reservation state transitions. Log all failed validation attempts. Log slow queries exceeding threshold. Use structured logging with request ID for tracing. Do not log sensitive data like user IDs in public logs.

---

## Future Enhancements

### Planned Features

Real-time stock synchronization with external warehouse management systems. Automated purchase order generation when stock reaches reorder point. Predictive stock level recommendations based on sales velocity. Multi-warehouse fulfillment routing based on proximity to customer. Lot and batch tracking for products with expiration dates. Serial number tracking for high-value items. Barcode scanning integration for stock adjustments. Mobile app for warehouse staff to manage inventory.

### Scalability Considerations

Consider sharding inventory collection by warehouse for horizontal scaling. Use read replicas for stock check queries. Implement distributed locks using Redis for critical operations. Consider event sourcing for adjustment history if volume grows. Separate read and write models for high traffic scenarios.

### Integration Improvements

Implement message queue for asynchronous event-driven architecture. Subscribe to product created events to auto-create inventory records. Publish stock level changed events for other services. Subscribe to order events instead of synchronous API calls. Implement webhook system for external integrations.

---

## Conclusion

This implementation plan provides a comprehensive roadmap for building the Inventory Service. The phased approach ensures core functionality is delivered first while allowing for iterative improvements. Focus should be on data consistency, atomic operations, and comprehensive audit trails given the critical nature of inventory management. Integration with Catalog and Order services is essential but should be designed to allow for future evolution to message-based architecture. Testing must cover race conditions and concurrent operations thoroughly to prevent inventory discrepancies. Following this plan should result in a production-ready Inventory Service that meets all requirements specified in the ERD and features documentation.

## File Locations Reference

Models:
- e:\AIB\Cleanse Ayurveda\microservices\services\inventory\models\warehouse.model.js
- e:\AIB\Cleanse Ayurveda\microservices\services\inventory\models\inventory.model.js
- e:\AIB\Cleanse Ayurveda\microservices\services\inventory\models\inventoryReservation.model.js
- e:\AIB\Cleanse Ayurveda\microservices\services\inventory\models\inventoryAdjustment.model.js

Controllers:
- e:\AIB\Cleanse Ayurveda\microservices\services\inventory\src\stock-check\stock-check.controller.js
- e:\AIB\Cleanse Ayurveda\microservices\services\inventory\src\warehouses\warehouses.controller.js
- e:\AIB\Cleanse Ayurveda\microservices\services\inventory\src\inventory-management\inventory-management.controller.js
- e:\AIB\Cleanse Ayurveda\microservices\services\inventory\src\reservations\reservations.controller.js
- e:\AIB\Cleanse Ayurveda\microservices\services\inventory\src\adjustments\adjustments.controller.js

Routes:
- e:\AIB\Cleanse Ayurveda\microservices\services\inventory\index.route.js
- e:\AIB\Cleanse Ayurveda\microservices\services\inventory\src\stock-check\stock-check.route.js
- e:\AIB\Cleanse Ayurveda\microservices\services\inventory\src\warehouses\warehouses.route.js
- e:\AIB\Cleanse Ayurveda\microservices\services\inventory\src\inventory-management\inventory-management.route.js
- e:\AIB\Cleanse Ayurveda\microservices\services\inventory\src\reservations\reservations.route.js
- e:\AIB\Cleanse Ayurveda\microservices\services\inventory\src\adjustments\adjustments.route.js

Configuration:
- e:\AIB\Cleanse Ayurveda\microservices\services\inventory\index.js
- e:\AIB\Cleanse Ayurveda\microservices\services\inventory\package.json
- e:\AIB\Cleanse Ayurveda\microservices\services\inventory\config\express.config.js
- e:\AIB\Cleanse Ayurveda\microservices\services\inventory\.env

Scripts:
- e:\AIB\Cleanse Ayurveda\microservices\services\inventory\scripts\seed.js
- e:\AIB\Cleanse Ayurveda\microservices\services\inventory\scripts\cleanup-reservations.js
