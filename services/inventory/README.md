# Inventory Service

The Inventory Service manages all stock levels, warehouse operations, inventory reservations, and stock adjustments for the e-commerce platform.

## Service Information

- Port: 3005
- Entities: 4 (warehouses, inventory, inventory_reservations, inventory_adjustments)
- Modules: 5
- Features: 35 (including bulk CSV updates and export reports)

## Getting Started

### Installation

```bash
cd "e:/AIB/Cleanse Ayurveda/microservices"
pnpm install
```

### Running the Service

```bash
pnpm --filter inventory-service dev
```

### Seed Data

```bash
pnpm --filter inventory-service seed
```

### Cleanup Expired Reservations

```bash
pnpm --filter inventory-service cleanup
```

## API Endpoints

### Health Check

```
GET /api/health
```

Returns service health status.

### Stock Check Module (Consumer)

#### Check Stock Availability

```
GET /api/stock/check/:variantId?warehouseId=optional
```

Check stock availability for a specific variant.

Response:
- sku: SKU code
- status: in_stock, low_stock, or out_of_stock
- isAvailable: boolean
- qtyAvailable: number (only shown for low_stock)
- lowStockWarning: boolean
- allowBackorder: boolean

#### Bulk Stock Check

```
POST /api/stock/check/bulk
Body: {
  items: [{ variantId, requestedQty }],
  warehouseId: optional
}
```

Check availability for multiple variants at once.

#### Validate Checkout

```
POST /api/stock/validate/checkout
Body: {
  cartId: string,
  items: [{ variantId, quantity }]
}
```

Validate entire cart before proceeding to payment.

### Stock Check Module (Admin)

#### Get Inventory Dashboard

```
GET /api/stock/admin/dashboard
```

Get overview metrics including total SKUs, stock counts by status, and top low-stock items.

#### List Inventory

```
GET /api/stock/admin?productId=&warehouseId=&status=&sku=&page=1&limit=20&sortBy=updatedAt&sortOrder=desc
```

List all inventory records with filtering and pagination.

#### Get Low Stock Items

```
GET /api/stock/admin/low-stock?warehouseId=&page=1&limit=20
```

Filter inventory items below their low stock threshold.

#### Get Out of Stock Items

```
GET /api/stock/admin/out-of-stock?warehouseId=&page=1&limit=20
```

Filter inventory items with zero available quantity.

#### Export Inventory Report

```
GET /api/stock/admin/export?productId=&warehouseId=&status=&sku=
```

Export inventory report as CSV file with all stock levels and calculated fields.

### Warehouses Module (Admin)

#### List All Warehouses

```
GET /api/admin/warehouses?isActive=&page=1&limit=20
```

Get all warehouse locations with inventory summary.

#### Create Warehouse

```
POST /api/admin/warehouses
Body: {
  code: string (uppercase),
  name: string,
  address: {
    line1: string,
    line2: string,
    landmark: string,
    city: string,
    state: string,
    pincode: string,
    country: string
  },
  isActive: boolean,
  isDefault: boolean,
  priority: number
}
```

Create a new warehouse location.

#### Update Warehouse

```
PUT /api/admin/warehouses/:id
Body: {
  name: string,
  address: object,
  isActive: boolean,
  isDefault: boolean,
  priority: number
}
```

Update warehouse details.

#### Set Default Warehouse

```
PUT /api/admin/warehouses/:id/set-default
```

Mark specific warehouse as default for fulfillment.

#### Update Warehouse Status

```
PATCH /api/admin/warehouses/:id/status
Body: {
  isActive: boolean
}
```

Activate or deactivate warehouse.

#### Delete Warehouse

```
DELETE /api/admin/warehouses/:id
```

Remove warehouse from system (only if no inventory exists).

### Inventory Management Module (Admin)

#### Create Inventory Record

```
POST /api/admin/inventory
Body: {
  productId: string,
  variantId: string,
  sku: string (uppercase),
  warehouseId: string,
  qtyOnHand: number,
  lowStockThreshold: number,
  allowBackorder: boolean,
  reorderPoint: number,
  backorderLimit: number
}
```

Create new inventory record.

#### Update Quantity

```
PUT /api/admin/inventory/:id/quantity
Body: {
  qtyChange: number (positive or negative),
  reason: string
}
```

Manually adjust stock quantity. Creates audit trail.

#### Set Low Stock Threshold

```
PUT /api/admin/inventory/:id/threshold
Body: {
  lowStockThreshold: number
}
```

Configure when low stock alerts trigger.

#### Set Reorder Point

```
PUT /api/admin/inventory/:id/reorder-point
Body: {
  reorderPoint: number
}
```

Configure automatic reorder trigger point.

#### Enable/Disable Backorder

```
PATCH /api/admin/inventory/:id/backorder
Body: {
  allowBackorder: boolean
}
```

Toggle whether orders can be accepted when out of stock.

#### Set Backorder Limit

```
PUT /api/admin/inventory/:id/backorder-limit
Body: {
  backorderLimit: number
}
```

Configure maximum negative inventory allowed for backorders.

#### Transfer Stock

```
POST /api/admin/inventory/transfer
Body: {
  fromWarehouseId: string,
  toWarehouseId: string,
  variantId: string,
  quantity: number,
  reason: string
}
```

Move stock from one warehouse to another.

#### Bulk Update Stock

```
POST /api/admin/inventory/bulk-update
Content-Type: multipart/form-data
Body: {
  file: CSV file
}
```

Bulk update stock quantities via CSV upload. CSV format: sku, warehouseCode, qtyChange, reason.

### Reservations Module (System)

#### Create Reservation

```
POST /api/reservations
Body: {
  cartId: string,
  variantId: string,
  quantity: number,
  warehouseId: string (optional)
}
```

Create reservation to hold stock for cart item. Expires in 15 minutes.

#### Create Checkout Reservations

```
POST /api/reservations/checkout
Body: {
  cartId: string,
  items: [{ variantId, quantity }]
}
```

Create or extend reservations for all cart items. Expires in 30 minutes.

#### Convert Reservations to Sale

```
POST /api/reservations/convert
Body: {
  cartId: string,
  orderId: string
}
```

Finalize reservations when order is confirmed. Updates inventory and creates adjustments.

#### Release Cart Reservations

```
DELETE /api/reservations/cart/:cartId
```

Release all reservations for a cart (on abandonment or item removal).

### Reservations Module (Admin)

#### List Reservations

```
GET /api/reservations/admin?status=&inventoryId=&cartId=&orderId=&page=1&limit=20
```

List all reservations with filtering.

#### Manually Release Reservation

```
DELETE /api/reservations/admin/:id
```

Admin force-release of a reservation.

### Adjustments Module (Admin)

#### Record Restock

```
POST /api/admin/adjustments/restock
Body: {
  inventoryId: string,
  quantity: number,
  reason: string,
  referenceId: string (optional)
}
```

Record receiving stock from supplier.

#### Record Damage/Loss

```
POST /api/admin/adjustments/damage
Body: {
  inventoryId: string,
  quantity: number,
  reason: string
}
```

Record stock removed due to damage or loss.

#### Record Correction

```
POST /api/admin/adjustments/correction
Body: {
  inventoryId: string,
  qtyChange: number (positive or negative),
  reason: string
}
```

Manual correction for inventory discrepancies.

#### List Adjustments

```
GET /api/admin/adjustments?inventoryId=&type=&referenceType=&adjustedById=&startDate=&endDate=&page=1&limit=20
```

List all stock adjustments with filtering.

#### Get Adjustment History

```
GET /api/admin/adjustments/inventory/:inventoryId?startDate=&endDate=
```

Full history of changes for specific inventory record.

#### Export Adjustment Report

```
GET /api/admin/adjustments/export?inventoryId=&type=&referenceType=&adjustedById=&startDate=&endDate=
```

Export adjustment history as CSV file with all audit trail information.

## Data Models

### Warehouse

- code: Unique warehouse identifier
- name: Warehouse name
- address: Full address object
- isActive: Operational status
- isDefault: Default warehouse flag
- priority: Fulfillment preference order

### Inventory

- productId: Reference to product
- variantId: Reference to variant
- sku: Unique SKU identifier
- warehouseId: Reference to warehouse
- qtyOnHand: Physical stock quantity
- qtyReserved: Quantity reserved in carts
- qtyAvailable: Virtual field (qtyOnHand - qtyReserved)
- status: Virtual field (in_stock, low_stock, out_of_stock)
- lowStockThreshold: Alert trigger point
- allowBackorder: Accept orders when out of stock
- reorderPoint: Purchase order trigger
- backorderLimit: Maximum negative inventory

### Inventory Reservation

- inventoryId: Reference to inventory
- cartId: Reference to cart
- orderId: Reference to order (when converted)
- quantity: Reserved amount
- status: active, released, converted, expired
- expiresAt: Automatic expiration time

### Inventory Adjustment

- inventoryId: Reference to inventory
- type: restock, sale, return, damage, correction
- qtyChange: Delta applied to stock
- qtyBefore: Snapshot before adjustment
- qtyAfter: Snapshot after adjustment
- reason: Human-readable explanation
- referenceType: order, return, manual, system
- referenceId: Related entity ID
- adjustedById: Admin user who made adjustment

## Business Rules

### Reservation TTLs

- Cart reservations: 15 minutes
- Checkout reservations: 30 minutes

### Stock Status Calculation

- Out of Stock: qtyAvailable equals 0
- Low Stock: qtyAvailable is less than or equal to lowStockThreshold
- In Stock: qtyAvailable is greater than lowStockThreshold

### Warehouse Priority

Warehouses are selected for fulfillment based on:
1. isActive status
2. priority value (lower number = higher priority)
3. isDefault flag

### Atomic Operations

All inventory quantity changes use atomic operations to prevent race conditions:
- Reservation creation increments qtyReserved
- Reservation release decrements qtyReserved
- Order conversion decrements both qtyReserved and qtyOnHand

## Integration Points

### Catalog Service

Inventory service needs product and variant IDs from Catalog Service to validate inventory records.

### Order & Payment Service

Order service triggers:
- Reservation creation when cart is updated
- Reservation conversion when order is placed
- Reservation release on cart abandonment

### Shipping Service (Future)

Shipping service will query inventory for warehouse selection and confirm stock reduction.

## Background Jobs

### Reservation Cleanup

Run periodically to release expired reservations:

```bash
pnpm --filter inventory-service cleanup
```

Recommended: Schedule this to run every 5 minutes via cron or task scheduler.

Alternative: Use MongoDB TTL indexes for automatic expiration.

## Security Considerations

- All admin endpoints should be protected with JWT authentication
- Consumer stock check endpoints are public read-only
- Reservation endpoints should validate cart ownership
- Input validation is enforced via Joi schemas
- Atomic operations prevent race conditions

## Performance Optimization

- Compound indexes on frequently queried fields
- Virtual fields calculated on-demand
- Pagination on all list endpoints
- Lean queries for read-only operations
- Warehouse priority caching recommended

## Error Handling

All endpoints return consistent response format:

Success:
```json
{
  "message": "Success message",
  "data": { ... },
  "error": null
}
```

Error:
```json
{
  "message": "Error message",
  "data": null,
  "error": "Error details"
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request (validation error, insufficient stock)
- 404: Not Found
- 409: Conflict (concurrent update)
- 500: Internal Server Error

## Testing

### Manual Testing

Use the seed script to populate test data:

```bash
pnpm --filter inventory-service seed
```

Test endpoints using curl or Postman:

```bash
curl http://localhost:3005/api/health
curl http://localhost:3005/api/stock/check/VAR001
curl http://localhost:3005/api/admin/warehouses
```

### Test Scenarios

1. Add item to cart - creates reservation
2. Remove item from cart - releases reservation
3. Complete checkout - converts reservation to sale
4. Cart expires - cleanup job releases reservation
5. Manual stock adjustment - creates audit trail
6. Transfer between warehouses - updates both locations

## Monitoring

Key metrics to track:
- Stock check endpoint response time
- Reservation creation success rate
- Active reservation count
- Expired reservation count
- Low stock item count
- Out of stock item count

## Troubleshooting

### Service won't start

Check MongoDB connection in root .env file.

### Duplicate index warnings

These have been resolved. If you see them, check that field-level indexes and schema.index() don't duplicate.

### Reservations not expiring

Run the cleanup script manually or set up scheduled job.

### Stock discrepancies

Check adjustment history for audit trail. Use correction endpoint to fix discrepancies.
