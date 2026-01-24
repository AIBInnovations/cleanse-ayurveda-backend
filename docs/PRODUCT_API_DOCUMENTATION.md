# Product Management API Documentation

---

## Authentication

All admin endpoints require a Bearer token in the Authorization header.

Header: Authorization: Bearer <access_token>

The token is a JWT issued by the auth service for admin users.

---

## 1. Create a Product (Without Variant)

**Endpoint:** POST /api/admin/products

**Purpose:** Creates a new product record in the catalog. For simple products without size/color variants.

**Headers:**

    Content-Type: application/json
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NWExYjJjM2Q0ZTVmNmc3aDhpOWowazEiLCJ1c2VyVHlwZSI6ImFkbWluIiwiYWRtaW5JZCI6IjY1YTFiMmMzZDRlNWY2ZzdoOGk5ajBrMiIsImlhdCI6MTcwNTMxMjAwMCwiZXhwIjoxNzA1Mzk4NDAwfQ.sample_signature

**Request Body:**

    {
      "name": "Aloe Vera Face Wash",
      "sku": "AVFW001",
      "description": "A gentle face wash infused with pure aloe vera extract that cleanses without stripping natural oils",
      "shortDescription": "Gentle aloe face wash for daily use",
      "benefits": ["Hydrating", "Soothing", "Non-drying"],
      "howToUse": "Wet face, apply a small amount, massage gently in circular motions, rinse with water",
      "brand": "65a1b2c3d4e5f6g7h8i9j0k1",
      "productType": "simple",
      "status": "draft",
      "isFeatured": false,
      "isBestseller": false,
      "isNewArrival": true,
      "tags": ["face wash", "aloe vera", "daily care"],
      "attributes": {
        "skinType": ["oily", "combination", "normal"],
        "concerns": ["acne", "oiliness"]
      },
      "seo": {
        "title": "Aloe Vera Face Wash - Gentle Daily Cleanser",
        "description": "Shop our bestselling aloe vera face wash for gentle daily cleansing",
        "keywords": ["face wash", "aloe vera", "cleanser"]
      },
      "hsnCode": "33049990"
    }

**Response (201 Created):**

    {
      "message": "Product created successfully",
      "data": {
        "product": {
          "_id": "65a1b2c3d4e5f6g7h8i9j0k3",
          "name": "Aloe Vera Face Wash",
          "slug": "aloe-vera-face-wash",
          "sku": "AVFW001",
          "description": "A gentle face wash infused with pure aloe vera extract that cleanses without stripping natural oils",
          "shortDescription": "Gentle aloe face wash for daily use",
          "benefits": ["Hydrating", "Soothing", "Non-drying"],
          "howToUse": "Wet face, apply a small amount, massage gently in circular motions, rinse with water",
          "brand": "65a1b2c3d4e5f6g7h8i9j0k1",
          "productType": "simple",
          "status": "draft",
          "isFeatured": false,
          "isBestseller": false,
          "isNewArrival": true,
          "tags": ["face wash", "aloe vera", "daily care"],
          "attributes": {
            "skinType": ["oily", "combination", "normal"],
            "concerns": ["acne", "oiliness"]
          },
          "seo": {
            "title": "Aloe Vera Face Wash - Gentle Daily Cleanser",
            "description": "Shop our bestselling aloe vera face wash for gentle daily cleansing",
            "keywords": ["face wash", "aloe vera", "cleanser"]
          },
          "hsnCode": "33049990",
          "ratingSummary": {
            "average": 0,
            "count": 0
          },
          "deletedAt": null,
          "version": 0,
          "createdAt": "2024-01-15T10:30:00.000Z",
          "updatedAt": "2024-01-15T10:30:00.000Z"
        }
      },
      "error": null
    }

**Error Response (409 Conflict):**

    {
      "message": "Product already exists",
      "data": null,
      "error": "A product with name 'Aloe Vera Face Wash' already exists"
    }

---

## 2. Create a Product (With Variants)

Creating a product with variants is a two-step process. First create the base product, then add variants to it.

### Step 1: Create Base Product

**Endpoint:** POST /api/admin/products

**Purpose:** Creates the parent product that will hold variants.

**Headers:**

    Content-Type: application/json
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NWExYjJjM2Q0ZTVmNmc3aDhpOWowazEiLCJ1c2VyVHlwZSI6ImFkbWluIiwiYWRtaW5JZCI6IjY1YTFiMmMzZDRlNWY2ZzdoOGk5ajBrMiIsImlhdCI6MTcwNTMxMjAwMCwiZXhwIjoxNzA1Mzk4NDAwfQ.sample_signature

**Request Body:**

    {
      "name": "Neem Purifying Face Wash",
      "sku": "NPFW001",
      "description": "Deep cleansing face wash with neem extract for acne-prone skin",
      "shortDescription": "Neem face wash for acne control",
      "benefits": ["Deep Cleansing", "Anti-bacterial", "Oil Control"],
      "howToUse": "Use twice daily on wet face, massage and rinse",
      "brand": "65a1b2c3d4e5f6g7h8i9j0k1",
      "productType": "variable",
      "status": "draft",
      "isFeatured": true,
      "isBestseller": false,
      "isNewArrival": true,
      "tags": ["face wash", "neem", "acne control"],
      "attributes": {
        "skinType": ["oily", "combination"],
        "concerns": ["acne", "blackheads", "oiliness"]
      },
      "seo": {
        "title": "Neem Purifying Face Wash",
        "description": "Control acne with our neem purifying face wash",
        "keywords": ["neem face wash", "acne control"]
      },
      "hsnCode": "33049990"
    }

**Response (201 Created):**

    {
      "message": "Product created successfully",
      "data": {
        "product": {
          "_id": "65a1b2c3d4e5f6g7h8i9j0k4",
          "name": "Neem Purifying Face Wash",
          "slug": "neem-purifying-face-wash",
          "sku": "NPFW001",
          "description": "Deep cleansing face wash with neem extract for acne-prone skin",
          "shortDescription": "Neem face wash for acne control",
          "benefits": ["Deep Cleansing", "Anti-bacterial", "Oil Control"],
          "howToUse": "Use twice daily on wet face, massage and rinse",
          "brand": "65a1b2c3d4e5f6g7h8i9j0k1",
          "productType": "variable",
          "status": "draft",
          "isFeatured": true,
          "isBestseller": false,
          "isNewArrival": true,
          "tags": ["face wash", "neem", "acne control"],
          "attributes": {
            "skinType": ["oily", "combination"],
            "concerns": ["acne", "blackheads", "oiliness"]
          },
          "seo": {
            "title": "Neem Purifying Face Wash",
            "description": "Control acne with our neem purifying face wash",
            "keywords": ["neem face wash", "acne control"]
          },
          "hsnCode": "33049990",
          "ratingSummary": {
            "average": 0,
            "count": 0
          },
          "deletedAt": null,
          "version": 0,
          "createdAt": "2024-01-15T10:35:00.000Z",
          "updatedAt": "2024-01-15T10:35:00.000Z"
        }
      },
      "error": null
    }

### Step 2: Add First Variant (Default)

**Endpoint:** POST /api/admin/products/:productId/variants

**Purpose:** Adds a size/configuration variant to the product. The first variant should typically be set as default.

**Headers:**

    Content-Type: application/json
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NWExYjJjM2Q0ZTVmNmc3aDhpOWowazEiLCJ1c2VyVHlwZSI6ImFkbWluIiwiYWRtaW5JZCI6IjY1YTFiMmMzZDRlNWY2ZzdoOGk5ajBrMiIsImlhdCI6MTcwNTMxMjAwMCwiZXhwIjoxNzA1Mzk4NDAwfQ.sample_signature

**Request Body:**

    {
      "name": "50ml",
      "sku": "NPFW001-50",
      "barcode": "8901234567890",
      "variantType": "size",
      "mrp": 299,
      "salePrice": 249,
      "costPrice": 120,
      "weight": 50,
      "isDefault": true,
      "isActive": true,
      "sortOrder": 0
    }

**Response (201 Created):**

    {
      "message": "Variant created successfully",
      "data": {
        "variant": {
          "_id": "65a1b2c3d4e5f6g7h8i9j0k5",
          "product": "65a1b2c3d4e5f6g7h8i9j0k4",
          "name": "50ml",
          "sku": "NPFW001-50",
          "barcode": "8901234567890",
          "variantType": "size",
          "mrp": 299,
          "salePrice": 249,
          "costPrice": 120,
          "discountPercent": 17,
          "weight": 50,
          "isDefault": true,
          "isActive": true,
          "sortOrder": 0,
          "deletedAt": null,
          "version": 0,
          "createdAt": "2024-01-15T10:36:00.000Z",
          "updatedAt": "2024-01-15T10:36:00.000Z"
        }
      },
      "error": null
    }

### Step 3: Add Additional Variant

**Endpoint:** POST /api/admin/products/65a1b2c3d4e5f6g7h8i9j0k4/variants

**Purpose:** Adds another variant option to the same product.

**Headers:**

    Content-Type: application/json
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NWExYjJjM2Q0ZTVmNmc3aDhpOWowazEiLCJ1c2VyVHlwZSI6ImFkbWluIiwiYWRtaW5JZCI6IjY1YTFiMmMzZDRlNWY2ZzdoOGk5ajBrMiIsImlhdCI6MTcwNTMxMjAwMCwiZXhwIjoxNzA1Mzk4NDAwfQ.sample_signature

**Request Body:**

    {
      "name": "100ml",
      "sku": "NPFW001-100",
      "barcode": "8901234567891",
      "variantType": "size",
      "mrp": 499,
      "salePrice": 399,
      "costPrice": 200,
      "weight": 100,
      "isDefault": false,
      "isActive": true,
      "sortOrder": 1
    }

**Response (201 Created):**

    {
      "message": "Variant created successfully",
      "data": {
        "variant": {
          "_id": "65a1b2c3d4e5f6g7h8i9j0k6",
          "product": "65a1b2c3d4e5f6g7h8i9j0k4",
          "name": "100ml",
          "sku": "NPFW001-100",
          "barcode": "8901234567891",
          "variantType": "size",
          "mrp": 499,
          "salePrice": 399,
          "costPrice": 200,
          "discountPercent": 20,
          "weight": 100,
          "isDefault": false,
          "isActive": true,
          "sortOrder": 1,
          "deletedAt": null,
          "version": 0,
          "createdAt": "2024-01-15T10:37:00.000Z",
          "updatedAt": "2024-01-15T10:37:00.000Z"
        }
      },
      "error": null
    }

**Error Response (409 Conflict - Duplicate SKU):**

    {
      "message": "SKU already exists",
      "data": null,
      "error": "A variant with SKU 'NPFW001-100' already exists"
    }

---

## 3. How SKU Works at Backend

SKU (Stock Keeping Unit) in this system is manually provided by the admin during product or variant creation. There is no automatic SKU generation.

**Key Behaviors:**

- SKU is a required field for both products and variants
- Product SKU is stored in uppercase and must be unique across all products
- Variant SKU is trimmed and must be unique across all variants
- SKU uniqueness is checked case-insensitively (AVFW001 and avfw001 are considered duplicates)
- Each variant maintains its own independent SKU separate from the parent product
- SKU is indexed in the database for fast lookup
- When creating inventory records, the variant SKU is used as the primary identifier
- SKU can be updated on existing variants, but the system validates no duplicates exist

**Validation Flow:**

When creating a product, the system checks if any product with the same SKU exists (excluding soft-deleted records). When creating a variant, it performs a case-insensitive regex match against all existing variant SKUs.

---

## 4. How Inventory is Managed

Inventory is managed in a separate microservice and is automatically linked when products/variants are created.

**Automatic Inventory Creation:**

When a product is created, the system asynchronously creates an inventory record with initial stock of 0 and a low stock threshold of 10. When a variant is added to a product, a separate inventory record is created specifically for that variant using the variant's SKU.

**Inventory Record Structure:**

Each inventory record contains the product ID, variant ID, SKU, warehouse ID, quantity on hand, quantity reserved, low stock threshold, backorder settings, and reorder point.

**Stock Status Calculation:**

The system calculates available quantity as quantity on hand minus quantity reserved. Stock status is determined as follows: if available is 0, status is out_of_stock; if available is less than or equal to the low stock threshold, status is low_stock; otherwise status is in_stock.

### Update Stock Quantity

**Endpoint:** PUT /api/admin/inventory/:id/quantity

**Purpose:** Manually adjust stock levels with audit trail.

**Headers:**

    Content-Type: application/json
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NWExYjJjM2Q0ZTVmNmc3aDhpOWowazEiLCJ1c2VyVHlwZSI6ImFkbWluIiwiYWRtaW5JZCI6IjY1YTFiMmMzZDRlNWY2ZzdoOGk5ajBrMiIsImlhdCI6MTcwNTMxMjAwMCwiZXhwIjoxNzA1Mzk4NDAwfQ.sample_signature

**Request Body:**

    {
      "qtyChange": 100,
      "reason": "New purchase order received - PO#12345"
    }

**Response (200 OK):**

    {
      "message": "Quantity updated successfully",
      "data": {
        "inventory": {
          "_id": "65a1b2c3d4e5f6g7h8i9j0k7",
          "productId": "65a1b2c3d4e5f6g7h8i9j0k4",
          "variantId": "65a1b2c3d4e5f6g7h8i9j0k5",
          "sku": "NPFW001-50",
          "warehouseId": "65a1b2c3d4e5f6g7h8i9j0k8",
          "qtyOnHand": 100,
          "qtyReserved": 0,
          "qtyAvailable": 100,
          "status": "in_stock",
          "lowStockThreshold": 10,
          "allowBackorder": false,
          "reorderPoint": 0,
          "backorderLimit": 0,
          "createdAt": "2024-01-15T10:36:00.000Z",
          "updatedAt": "2024-01-15T11:00:00.000Z"
        },
        "adjustment": {
          "_id": "65a1b2c3d4e5f6g7h8i9j0k9",
          "inventoryId": "65a1b2c3d4e5f6g7h8i9j0k7",
          "type": "correction",
          "qtyChange": 100,
          "qtyBefore": 0,
          "qtyAfter": 100,
          "reason": "New purchase order received - PO#12345",
          "referenceType": "manual",
          "createdAt": "2024-01-15T11:00:00.000Z"
        }
      },
      "error": null
    }

### Set Low Stock Threshold

**Endpoint:** PUT /api/admin/inventory/:id/threshold

**Purpose:** Configure when low stock alerts should trigger.

**Headers:**

    Content-Type: application/json
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

**Request Body:**

    {
      "lowStockThreshold": 25
    }

**Response (200 OK):**

    {
      "message": "Low stock threshold updated successfully",
      "data": {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k7",
        "productId": "65a1b2c3d4e5f6g7h8i9j0k4",
        "variantId": "65a1b2c3d4e5f6g7h8i9j0k5",
        "sku": "NPFW001-50",
        "warehouseId": "65a1b2c3d4e5f6g7h8i9j0k8",
        "qtyOnHand": 100,
        "qtyReserved": 0,
        "lowStockThreshold": 25,
        "allowBackorder": false,
        "reorderPoint": 0,
        "backorderLimit": 0
      },
      "error": null
    }

### Transfer Stock Between Warehouses

**Endpoint:** POST /api/admin/inventory/transfer

**Purpose:** Move stock from one warehouse to another.

**Headers:**

    Content-Type: application/json
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

**Request Body:**

    {
      "fromWarehouseId": "65a1b2c3d4e5f6g7h8i9j0k8",
      "toWarehouseId": "65a1b2c3d4e5f6g7h8i9j0ka",
      "variantId": "65a1b2c3d4e5f6g7h8i9j0k5",
      "quantity": 25,
      "reason": "Restocking secondary warehouse"
    }

**Response (200 OK):**

    {
      "message": "Stock transferred successfully",
      "data": {
        "sourceInventory": {
          "_id": "65a1b2c3d4e5f6g7h8i9j0k7",
          "qtyOnHand": 75,
          "qtyAvailable": 75
        },
        "destinationInventory": {
          "_id": "65a1b2c3d4e5f6g7h8i9j0kb",
          "qtyOnHand": 25,
          "qtyAvailable": 25
        },
        "transferredQuantity": 25
      },
      "error": null
    }

---

## 5. Product Fields Reference

### Product Fields (Required)

- name: Product display name (1-200 characters)
- slug: URL-friendly identifier (auto-generated if not provided, must be unique)
- sku: Stock keeping unit (1-100 characters, stored uppercase, must be unique)

### Product Fields (Optional)

- description: Full product description (max 5000 characters, default: null)
- shortDescription: Brief summary for listings (max 500 characters, default: null)
- benefits: Array of benefit statements (default: empty array)
- howToUse: Usage instructions (max 2000 characters, default: null)
- brand: Reference to Brand document ID (default: null)
- productType: One of "simple", "variable", or "bundle" (default: "simple")
- status: One of "draft", "active", or "archived" (default: "draft")
- isFeatured: Boolean flag for featured products (default: false)
- isBestseller: Boolean flag for bestseller badge (default: false)
- isNewArrival: Boolean flag for new arrival badge (default: false)
- tags: Array of searchable tags (default: empty array)
- attributes.skinType: Array containing any of "oily", "dry", "combination", "sensitive", "normal" (default: empty array)
- attributes.concerns: Array of skin concern tags (default: empty array)
- seo.title: Meta title for SEO (default: null)
- seo.description: Meta description for SEO (default: null)
- seo.keywords: Array of SEO keywords (default: empty array)
- hsnCode: Harmonized System Nomenclature code for taxation (default: null)

### Variant Fields (Required)

- name: Variant display name like "50ml" or "Red" (1-100 characters)
- sku: Unique SKU for this variant (1-50 characters)
- mrp: Maximum retail price (positive number)

### Variant Fields (Optional)

- barcode: Product barcode/UPC (max 50 characters, default: null)
- variantType: Type identifier like "size" or "color" (default: null)
- salePrice: Discounted selling price (positive number, default: null)
- costPrice: Cost/purchase price for margin calculation (positive number, default: null)
- discountPercent: Auto-calculated from MRP and salePrice (default: 0)
- weight: Weight in grams (positive number, default: null)
- isDefault: Whether this is the default variant shown (default: false)
- isActive: Whether variant is available for purchase (default: true)
- sortOrder: Display order among variants (default: 0)

---

## 6. Categories and Collections

The backend uses two separate organizational systems: Categories for hierarchical product classification and Collections for curated product groupings.

### Categories

Categories form a hierarchical tree structure for organizing products. They are manually created and managed by admins.

**Hierarchy:**

- Root categories have level 0 and path equal to their slug
- Child categories have level equal to parent level plus 1
- Path is constructed as parent path followed by slash and child slug (e.g., "skincare/face-wash")
- Unlimited nesting depth is supported

**Create Category**

**Endpoint:** POST /api/admin/categories

**Purpose:** Create a new category in the hierarchy.

**Headers:**

    Content-Type: application/json
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

**Request Body:**

    {
      "name": "Face Wash",
      "description": "All face wash and cleansing products",
      "parent": "65a1b2c3d4e5f6g7h8i9j0kc",
      "image": {
        "url": "https://res.cloudinary.com/demo/image/upload/face-wash.jpg",
        "publicId": "categories/face-wash"
      },
      "banner": {
        "url": "https://res.cloudinary.com/demo/image/upload/face-wash-banner.jpg",
        "publicId": "categories/face-wash-banner"
      },
      "seo": {
        "title": "Face Wash Products",
        "description": "Shop face wash and cleansers",
        "keywords": ["face wash", "cleanser"]
      },
      "showInMenu": true,
      "sortOrder": 1,
      "isActive": true
    }

**Response (201 Created):**

    {
      "message": "Category created successfully",
      "data": {
        "category": {
          "_id": "65a1b2c3d4e5f6g7h8i9j0kd",
          "name": "Face Wash",
          "slug": "face-wash",
          "description": "All face wash and cleansing products",
          "parent": "65a1b2c3d4e5f6g7h8i9j0kc",
          "level": 1,
          "path": "skincare/face-wash",
          "image": {
            "url": "https://res.cloudinary.com/demo/image/upload/face-wash.jpg",
            "publicId": "categories/face-wash"
          },
          "banner": {
            "url": "https://res.cloudinary.com/demo/image/upload/face-wash-banner.jpg",
            "publicId": "categories/face-wash-banner"
          },
          "seo": {
            "title": "Face Wash Products",
            "description": "Shop face wash and cleansers",
            "keywords": ["face wash", "cleanser"]
          },
          "showInMenu": true,
          "sortOrder": 1,
          "isActive": true,
          "deletedAt": null,
          "createdAt": "2024-01-15T12:00:00.000Z",
          "updatedAt": "2024-01-15T12:00:00.000Z"
        }
      },
      "error": null
    }

**Assign Product to Category**

**Endpoint:** POST /api/admin/products/:productId/categories

**Purpose:** Link a product to a category. Products can belong to multiple categories.

**Headers:**

    Content-Type: application/json
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

**Request Body:**

    {
      "categoryId": "65a1b2c3d4e5f6g7h8i9j0kd",
      "isPrimary": true
    }

**Response (201 Created):**

    {
      "message": "Category assigned successfully",
      "data": {
        "mapping": {
          "_id": "65a1b2c3d4e5f6g7h8i9j0ke",
          "product": "65a1b2c3d4e5f6g7h8i9j0k4",
          "category": {
            "_id": "65a1b2c3d4e5f6g7h8i9j0kd",
            "name": "Face Wash",
            "slug": "face-wash"
          },
          "isPrimary": true
        }
      },
      "error": null
    }

### Collections

Collections are manually curated or rule-based product groupings. There are two types:

- Manual collections: Admin explicitly adds products
- Smart collections: Products are automatically included based on defined rules

**Create Manual Collection**

**Endpoint:** POST /api/admin/collections

**Purpose:** Create a curated collection where products are manually added.

**Headers:**

    Content-Type: application/json
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

**Request Body:**

    {
      "name": "Summer Essentials",
      "description": "Must-have products for summer skincare",
      "type": "manual",
      "image": {
        "url": "https://res.cloudinary.com/demo/image/upload/summer-essentials.jpg",
        "publicId": "collections/summer-essentials"
      },
      "banner": {
        "url": "https://res.cloudinary.com/demo/image/upload/summer-essentials-banner.jpg",
        "publicId": "collections/summer-essentials-banner"
      },
      "seo": {
        "title": "Summer Essentials Collection",
        "description": "Shop summer skincare essentials",
        "keywords": ["summer", "skincare", "essentials"]
      },
      "isFeatured": true,
      "isActive": true
    }

**Response (201 Created):**

    {
      "message": "Collection created successfully",
      "data": {
        "collection": {
          "_id": "65a1b2c3d4e5f6g7h8i9j0kf",
          "name": "Summer Essentials",
          "slug": "summer-essentials",
          "description": "Must-have products for summer skincare",
          "type": "manual",
          "rules": [],
          "rulesMatch": "all",
          "image": {
            "url": "https://res.cloudinary.com/demo/image/upload/summer-essentials.jpg",
            "publicId": "collections/summer-essentials"
          },
          "banner": {
            "url": "https://res.cloudinary.com/demo/image/upload/summer-essentials-banner.jpg",
            "publicId": "collections/summer-essentials-banner"
          },
          "seo": {
            "title": "Summer Essentials Collection",
            "description": "Shop summer skincare essentials",
            "keywords": ["summer", "skincare", "essentials"]
          },
          "isFeatured": true,
          "isActive": true,
          "deletedAt": null,
          "createdAt": "2024-01-15T12:30:00.000Z",
          "updatedAt": "2024-01-15T12:30:00.000Z"
        }
      },
      "error": null
    }

**Create Smart Collection**

**Endpoint:** POST /api/admin/collections

**Purpose:** Create a rule-based collection that automatically includes matching products.

**Headers:**

    Content-Type: application/json
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

**Request Body:**

    {
      "name": "Acne Control Range",
      "description": "All products for acne-prone skin",
      "type": "smart",
      "rules": [
        {
          "field": "tag",
          "operator": "contains",
          "value": "acne"
        },
        {
          "field": "status",
          "operator": "equals",
          "value": "active"
        }
      ],
      "rulesMatch": "all",
      "isFeatured": false,
      "isActive": true
    }

**Response (201 Created):**

    {
      "message": "Collection created successfully",
      "data": {
        "collection": {
          "_id": "65a1b2c3d4e5f6g7h8i9j0kg",
          "name": "Acne Control Range",
          "slug": "acne-control-range",
          "description": "All products for acne-prone skin",
          "type": "smart",
          "rules": [
            {
              "field": "tag",
              "operator": "contains",
              "value": "acne"
            },
            {
              "field": "status",
              "operator": "equals",
              "value": "active"
            }
          ],
          "rulesMatch": "all",
          "isFeatured": false,
          "isActive": true,
          "deletedAt": null,
          "createdAt": "2024-01-15T12:35:00.000Z",
          "updatedAt": "2024-01-15T12:35:00.000Z"
        }
      },
      "error": null
    }

**Smart Collection Rule Options:**

- field: One of "tag", "productType", "price", "brand", or "status"
- operator: One of "equals", "notEquals", "contains", "greaterThan", or "lessThan"
- rulesMatch: "all" requires all rules to match; "any" requires at least one rule to match

**Add Products to Manual Collection**

**Endpoint:** POST /api/admin/collections/:id/products

**Purpose:** Add products to a manual collection.

**Headers:**

    Content-Type: application/json
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

**Request Body:**

    {
      "products": [
        {
          "productId": "65a1b2c3d4e5f6g7h8i9j0k3",
          "sortOrder": 0
        },
        {
          "productId": "65a1b2c3d4e5f6g7h8i9j0k4",
          "sortOrder": 1
        }
      ]
    }

**Response (201 Created):**

    {
      "message": "Products added successfully",
      "data": {
        "added": 2,
        "skipped": 0
      },
      "error": null
    }

---

## 7. Relationships: Products, Variants, Categories, SKU

**Product to Variants (One-to-Many):**

A product can have zero or more variants. Simple products typically have no variants or one default variant. Variable products have multiple variants representing different sizes, colors, or configurations. Each variant stores a reference to its parent product ID. Variants have independent SKUs, pricing, and inventory.

**Product to Categories (Many-to-Many):**

Products can belong to multiple categories through the ProductCategory join model. Each mapping can be marked as primary (one per product). Categories are hierarchical with parent-child relationships. When fetching products in a category, subcategory products can be optionally included.

**SKU Distribution:**

Products have a base SKU for identification. Each variant has its own unique SKU (typically derived from base SKU with suffix). Inventory records use variant SKU as the unique identifier per warehouse. Example: Product SKU "NPFW001" has variants "NPFW001-50" and "NPFW001-100".

**Product to Collections (Many-to-Many):**

Manual collections use CollectionProduct join table with sortOrder. Smart collections dynamically query products based on rules. Products can appear in multiple collections.

**Inventory Linkage:**

Inventory records store productId and variantId as strings (not ObjectId references). This allows the inventory service to operate independently. Each variant-warehouse combination has a separate inventory record. The SKU field in inventory matches the variant SKU.

---

## 8. Stock Management Flow

### Single Product (Simple Type)

When a simple product is created, the system asynchronously creates an inventory record with the product ID, null variant ID, initial quantity of 0, and default low stock threshold of 10. Stock is managed at the product level since there are no variants.

**Stock Update for Simple Product:**

    PUT /api/admin/inventory/:inventoryId/quantity

    Request:
    {
      "qtyChange": 50,
      "reason": "Initial stock from supplier"
    }

### Product with Variants

When a variant is added to a product, the system asynchronously creates an inventory record with the product ID, variant ID, variant SKU, initial quantity of 0, and default low stock threshold of 10. Each variant maintains independent inventory.

**Stock Update for Variant:**

    PUT /api/admin/inventory/:variantInventoryId/quantity

    Request:
    {
      "qtyChange": 75,
      "reason": "Restocking 50ml variant"
    }

**Key Differences:**

For simple products, one inventory record tracks total stock. For variable products, each variant has its own inventory record. Stock levels, thresholds, and backorder settings are managed independently per variant.

### When Stock Changes Occur

**Manual Corrections:**

Admin updates quantity via PUT /api/admin/inventory/:id/quantity. Creates an InventoryAdjustment record with type "correction". Stores quantity before, quantity after, reason, and admin ID.

**Order Placement:**

Stock is reserved when order is placed (qtyReserved increases). Available quantity decreases while on-hand remains same. Reservations have expiration time.

**Order Fulfillment:**

Reserved stock converts to sold (qtyOnHand decreases, qtyReserved decreases). Creates adjustment record with type "sale".

**Order Cancellation:**

Reserved stock is released (qtyReserved decreases). Available quantity increases.

**Returns:**

Returned stock is added back (qtyOnHand increases). Creates adjustment record with type "return".

**Warehouse Transfers:**

Source warehouse stock decreases. Destination warehouse stock increases. Both changes create adjustment records.

### Stock Reservation Flow

When a customer adds items to cart or places an order, the system creates an InventoryReservation record that holds stock temporarily. Reservations have status (active, released, converted, expired) and an expiration timestamp. Expired reservations are automatically released, returning stock to available pool.

### Inventory Audit Trail

Every stock change creates an InventoryAdjustment record containing:

- inventoryId: Reference to inventory record
- type: One of "restock", "sale", "return", "damage", or "correction"
- qtyChange: Positive or negative quantity change
- qtyBefore: Stock level before change
- qtyAfter: Stock level after change
- reason: Human-readable explanation
- referenceType: One of "order", "return", "manual", or "system"
- referenceId: Order ID or other reference
- adjustedById: Admin user ID for manual changes
- createdAt: Timestamp

---

## Summary of Key Endpoints

**Products:**
- POST /api/admin/products - Create product
- GET /api/admin/products - List products
- GET /api/admin/products/:id - Get product by ID
- PUT /api/admin/products/:id - Update product
- DELETE /api/admin/products/:id - Soft delete product

**Variants:**
- POST /api/admin/products/:productId/variants - Add variant
- GET /api/admin/products/:productId/variants - List variants
- PUT /api/admin/variants/:id - Update variant
- DELETE /api/admin/variants/:id - Soft delete variant

**Categories:**
- POST /api/admin/categories - Create category
- GET /api/admin/categories - List categories (tree or flat)
- PUT /api/admin/categories/:id - Update category
- DELETE /api/admin/categories/:id - Soft delete category

**Product-Category Mapping:**
- POST /api/admin/products/:productId/categories - Assign category
- DELETE /api/admin/products/:productId/categories/:categoryId - Remove category

**Collections:**
- POST /api/admin/collections - Create collection
- GET /api/admin/collections - List collections
- PUT /api/admin/collections/:id - Update collection
- POST /api/admin/collections/:id/products - Add products to manual collection
- DELETE /api/admin/collections/:id/products/:productId - Remove product from collection

**Inventory:**
- POST /api/admin/inventory - Create inventory record
- PUT /api/admin/inventory/:id/quantity - Update stock quantity
- PUT /api/admin/inventory/:id/threshold - Set low stock threshold
- PUT /api/admin/inventory/:id/reorder-point - Set reorder point
- PATCH /api/admin/inventory/:id/backorder - Enable/disable backorder
- POST /api/admin/inventory/transfer - Transfer between warehouses
