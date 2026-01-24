# Catalog Service Implementation Plan

## Project Context

Standalone microservice for Cleanse Ayurveda e-commerce platform. Handles product catalog, variants, categories, collections, bundles, search, and related products. Receives requests forwarded from Auth Service API Gateway.

Tech Stack: Node.js, Express.js, MongoDB/Mongoose, Cloudinary, Joi validation

---

## Folder Structure

```
catalog/
  config/
  dev_docs/
  middlewares/
  schema/
  services/
  src/
    brands/
      brand.controller.js
      brand.route.js
      brand.validation.js
    ingredients/
      ingredient.controller.js
      ingredient.route.js
      ingredient.validation.js
    products/
      product.controller.js
      product.route.js
      product.validation.js
    variants/
      variant.controller.js
      variant.route.js
      variant.validation.js
    media/
      media.controller.js
      media.route.js
      media.validation.js
    categories/
      category.controller.js
      category.route.js
      category.validation.js
    collections/
      collection.controller.js
      collection.route.js
      collection.validation.js
    bundles/
      bundle.controller.js
      bundle.route.js
      bundle.validation.js
    related-products/
      related-product.controller.js
      related-product.route.js
      related-product.validation.js
    search/
      search.controller.js
      search.route.js
      search.validation.js
  utils/
  index.js
  index.route.js
```

---

## Phase 1: Foundation and Brands Module

### 1.1 Schema Setup

Create base schemas:

- `schema/Brand.js` - Brand entity
- `schema/Ingredient.js` - Ingredient entity
- `schema/Category.js` - Category with parent reference for hierarchy
- `schema/Product.js` - Core product with all fields
- `schema/ProductVariant.js` - Variant linked to product
- `schema/ProductMedia.js` - Media linked to product/variant
- `schema/ProductIngredient.js` - Junction table product-ingredient
- `schema/ProductCategory.js` - Junction table product-category
- `schema/Collection.js` - Manual and smart collections
- `schema/CollectionProduct.js` - Junction table collection-product
- `schema/Bundle.js` - Bundle entity
- `schema/BundleItem.js` - Bundle items
- `schema/RelatedProduct.js` - Cross-sell, upsell mappings
- `schema/SearchSynonym.js` - Search synonyms for admin config

### 1.2 Brand Schema Fields

```
name: String (required, unique)
slug: String (required, unique, lowercase)
description: String
logo: { url, publicId }
isActive: Boolean (default: true)
createdAt, updatedAt: timestamps
```

### 1.3 Brand Routes

Consumer:
- GET /api/brands - List active brands (for filter dropdown)
- GET /api/brands/:slug - Get brand by slug

Admin:
- GET /api/admin/brands - List all brands with pagination, filters
- POST /api/admin/brands - Create brand
- GET /api/admin/brands/:id - Get brand by ID
- PUT /api/admin/brands/:id - Update brand
- PATCH /api/admin/brands/:id/status - Toggle active status
- DELETE /api/admin/brands/:id - Soft delete brand

### 1.4 Brand Controller Functions

- listBrands (consumer) - active only, minimal fields
- getBrandBySlug (consumer)
- listAllBrands (admin) - with filters, pagination
- createBrand (admin)
- getBrandById (admin)
- updateBrand (admin)
- toggleBrandStatus (admin)
- deleteBrand (admin) - soft delete

### 1.5 Validation Schemas

Create Joi validation for:
- createBrandSchema
- updateBrandSchema
- brandIdParamSchema
- brandSlugParamSchema

---

## Phase 2: Ingredients Module

### 2.1 Ingredient Schema Fields

```
name: String (required, unique)
slug: String (required, unique)
description: String
benefits: [String]
image: { url, publicId }
isActive: Boolean (default: true)
createdAt, updatedAt: timestamps
```

### 2.2 Ingredient Routes

Consumer:
- GET /api/ingredients - List active ingredients
- GET /api/ingredients/:slug - Get ingredient details

Admin:
- GET /api/admin/ingredients - List all with pagination
- POST /api/admin/ingredients - Create ingredient
- GET /api/admin/ingredients/:id - Get by ID
- PUT /api/admin/ingredients/:id - Update ingredient
- DELETE /api/admin/ingredients/:id - Soft delete

### 2.3 Ingredient Controller Functions

- listIngredients (consumer)
- getIngredientBySlug (consumer)
- listAllIngredients (admin)
- createIngredient (admin)
- getIngredientById (admin)
- updateIngredient (admin)
- deleteIngredient (admin)

---

## Phase 3: Categories Module

### 3.1 Category Schema Fields

```
name: String (required)
slug: String (required, unique)
description: String
parent: ObjectId (ref: Category, null for root)
level: Number (0 for root, computed)
path: String (materialized path: "parent-slug/child-slug")
image: { url, publicId }
banner: { url, publicId }
seo: { title, description, keywords }
showInMenu: Boolean (default: true)
sortOrder: Number (default: 0)
isActive: Boolean (default: true)
createdAt, updatedAt: timestamps
```

### 3.2 Category Routes

Consumer:
- GET /api/categories - List root categories with children (tree)
- GET /api/categories/:slug - Get category with subcategories
- GET /api/categories/:slug/products - Get products in category

Admin:
- GET /api/admin/categories - List all (flat or tree)
- POST /api/admin/categories - Create category
- GET /api/admin/categories/:id - Get by ID
- PUT /api/admin/categories/:id - Update category
- PATCH /api/admin/categories/:id/reorder - Reorder
- PATCH /api/admin/categories/:id/visibility - Toggle menu visibility
- DELETE /api/admin/categories/:id - Soft delete

### 3.3 Category Controller Functions

- getCategoryTree (consumer)
- getCategoryBySlug (consumer)
- getCategoryProducts (consumer)
- listAllCategories (admin)
- createCategory (admin)
- getCategoryById (admin)
- updateCategory (admin)
- reorderCategory (admin)
- toggleCategoryVisibility (admin)
- deleteCategory (admin)

---

## Phase 4: Products Module - Core

### 4.1 Product Schema Fields

```
name: String (required)
slug: String (required, unique)
description: String
shortDescription: String
benefits: [String]
howToUse: String
brand: ObjectId (ref: Brand)
productType: String (enum: simple, variable)
status: String (enum: draft, active, archived)
isFeatured: Boolean
isBestseller: Boolean
isNewArrival: Boolean
tags: [String]
attributes: {
  skinType: [String] (enum: oily, dry, combination, sensitive, normal)
  concerns: [String]
}
seo: { title, description, keywords }
hsnCode: String
ratingSummary: {
  average: Number
  count: Number
}
createdAt, updatedAt: timestamps
deletedAt: Date (for soft delete)
```

### 4.2 Product Routes - Consumer

- GET /api/products - List products (PLP) with filters, sort, pagination
- GET /api/products/:slug - Get product detail (PDP)
- GET /api/products/:slug/variants - Get product variants
- GET /api/products/:slug/media - Get product media
- GET /api/products/:slug/ingredients - Get product ingredients
- GET /api/products/:slug/related - Get related products

### 4.3 Product Routes - Admin

- GET /api/admin/products - List all with filters
- POST /api/admin/products - Create product
- GET /api/admin/products/:id - Get by ID
- PUT /api/admin/products/:id - Update product
- PATCH /api/admin/products/:id/status - Update status
- PATCH /api/admin/products/:id/flags - Update featured/bestseller/new
- POST /api/admin/products/:id/duplicate - Duplicate product
- DELETE /api/admin/products/:id - Soft delete
- POST /api/admin/products/bulk-import - Bulk import via CSV
- GET /api/admin/products/bulk-export - Bulk export
- PATCH /api/admin/products/bulk-update - Bulk update

### 4.4 Product Controller Functions

Consumer:
- listProducts - with filters (category, brand, price, attributes), sort, pagination
- getProductBySlug
- getProductVariants
- getProductMedia
- getProductIngredients
- getProductRelated

Admin:
- listAllProducts
- createProduct
- getProductById
- updateProduct
- updateProductStatus
- updateProductFlags
- duplicateProduct
- deleteProduct
- bulkImportProducts
- bulkExportProducts
- bulkUpdateProducts

---

## Phase 5: Product Variants Module

### 5.1 ProductVariant Schema Fields

```
product: ObjectId (ref: Product, required)
name: String (required, e.g., "100ml", "Vanilla")
sku: String (required, unique)
barcode: String
variantType: String (e.g., size, flavor)
mrp: Number (required)
salePrice: Number
costPrice: Number
discountPercent: Number (computed or stored)
weight: Number (in grams)
isDefault: Boolean (default: false)
isActive: Boolean (default: true)
sortOrder: Number (default: 0)
createdAt, updatedAt: timestamps
```

### 5.2 Variant Routes

Consumer:
- GET /api/products/:productSlug/variants - List variants
- GET /api/variants/:id - Get variant detail

Admin:
- GET /api/admin/products/:productId/variants - List variants
- POST /api/admin/products/:productId/variants - Add variant
- GET /api/admin/variants/:id - Get variant by ID
- PUT /api/admin/variants/:id - Update variant
- PATCH /api/admin/variants/:id/status - Toggle active
- PATCH /api/admin/variants/reorder - Reorder variants
- DELETE /api/admin/variants/:id - Delete variant

### 5.3 Variant Controller Functions

Consumer:
- listProductVariants
- getVariantById

Admin:
- listProductVariantsAdmin
- addVariant
- getVariantByIdAdmin
- updateVariant
- toggleVariantStatus
- reorderVariants
- deleteVariant

---

## Phase 6: Product Media Module

### 6.1 ProductMedia Schema Fields

```
product: ObjectId (ref: Product, required)
variant: ObjectId (ref: ProductVariant, optional)
type: String (enum: image, video)
url: String (required)
publicId: String (Cloudinary public ID)
altText: String
isPrimary: Boolean (default: false)
sortOrder: Number (default: 0)
metadata: {
  width: Number
  height: Number
  format: String
  bytes: Number
}
createdAt, updatedAt: timestamps
```

### 6.2 Media Routes

Consumer:
- GET /api/products/:productSlug/media - Get product media

Admin:
- GET /api/admin/products/:productId/media - List media
- POST /api/admin/products/:productId/media - Upload media (uses existing cloudinary)
- PUT /api/admin/media/:id - Update media (alt text)
- PATCH /api/admin/media/:id/primary - Set as primary
- PATCH /api/admin/products/:productId/media/reorder - Reorder media
- DELETE /api/admin/media/:id - Delete media
- POST /api/admin/products/:productId/media/bulk - Bulk upload

### 6.3 Media Controller Functions

Consumer:
- getProductMedia

Admin:
- listProductMediaAdmin
- uploadProductMedia
- updateMedia
- setPrimaryMedia
- reorderMedia
- deleteMedia
- bulkUploadMedia

---

## Phase 7: Product-Ingredient Mapping

### 7.1 ProductIngredient Schema Fields

```
product: ObjectId (ref: Product, required)
ingredient: ObjectId (ref: Ingredient, required)
percentage: Number (optional)
isKeyIngredient: Boolean (default: false)
sortOrder: Number (default: 0)
createdAt, updatedAt: timestamps
```

Compound index on (product, ingredient) for uniqueness.

### 7.2 Product-Ingredient Routes

Admin:
- GET /api/admin/products/:productId/ingredients - List mapped ingredients
- POST /api/admin/products/:productId/ingredients - Map ingredient to product
- PUT /api/admin/products/:productId/ingredients/:ingredientId - Update mapping
- PATCH /api/admin/products/:productId/ingredients/reorder - Reorder
- DELETE /api/admin/products/:productId/ingredients/:ingredientId - Remove mapping

### 7.3 Product-Ingredient Controller Functions

- listProductIngredients
- mapIngredientToProduct
- updateIngredientMapping
- reorderProductIngredients
- removeIngredientMapping

---

## Phase 8: Product-Category Mapping

### 8.1 ProductCategory Schema Fields

```
product: ObjectId (ref: Product, required)
category: ObjectId (ref: Category, required)
isPrimary: Boolean (default: false)
createdAt, updatedAt: timestamps
```

Compound index on (product, category) for uniqueness.

### 8.2 Product-Category Routes

Admin:
- GET /api/admin/products/:productId/categories - List categories
- POST /api/admin/products/:productId/categories - Assign category
- PATCH /api/admin/products/:productId/categories/:categoryId/primary - Set primary
- DELETE /api/admin/products/:productId/categories/:categoryId - Remove

### 8.3 Product-Category Controller Functions

- listProductCategories
- assignCategoryToProduct
- setPrimaryCategory
- removeCategoryFromProduct

---

## Phase 9: Collections Module

### 9.1 Collection Schema Fields

```
name: String (required)
slug: String (required, unique)
description: String
type: String (enum: manual, smart)
rules: [{
  field: String (tag, productType, price, brand)
  operator: String (equals, contains, greaterThan, lessThan)
  value: Mixed
}]
rulesMatch: String (enum: all, any) - for smart collections
image: { url, publicId }
banner: { url, publicId }
seo: { title, description, keywords }
isFeatured: Boolean (default: false)
isActive: Boolean (default: true)
createdAt, updatedAt: timestamps
```

### 9.2 CollectionProduct Schema Fields

```
collection: ObjectId (ref: Collection, required)
product: ObjectId (ref: Product, required)
sortOrder: Number (default: 0)
createdAt, updatedAt: timestamps
```

For manual collections only. Smart collections compute products dynamically.

### 9.3 Collection Routes

Consumer:
- GET /api/collections - List featured/active collections
- GET /api/collections/:slug - Get collection details
- GET /api/collections/:slug/products - Get products in collection

Admin:
- GET /api/admin/collections - List all collections
- POST /api/admin/collections - Create collection
- GET /api/admin/collections/:id - Get by ID
- PUT /api/admin/collections/:id - Update collection
- PATCH /api/admin/collections/:id/status - Toggle active
- PATCH /api/admin/collections/:id/featured - Toggle featured
- POST /api/admin/collections/:id/products - Add products (manual)
- PATCH /api/admin/collections/:id/products/reorder - Reorder products
- DELETE /api/admin/collections/:id/products/:productId - Remove product
- DELETE /api/admin/collections/:id - Delete collection

### 9.4 Collection Controller Functions

Consumer:
- listCollections
- getCollectionBySlug
- getCollectionProducts

Admin:
- listAllCollections
- createCollection
- getCollectionById
- updateCollection
- toggleCollectionStatus
- toggleCollectionFeatured
- addProductsToCollection
- reorderCollectionProducts
- removeProductFromCollection
- deleteCollection
- getSmartCollectionProducts (internal helper)

---

## Phase 10: Bundles Module

### 10.1 Bundle Schema Fields

```
name: String (required)
slug: String (required, unique)
description: String
image: { url, publicId }
pricingType: String (enum: fixed, percentageOff)
fixedPrice: Number (if pricingType is fixed)
percentageOff: Number (if pricingType is percentageOff)
originalPrice: Number (computed sum of items)
finalPrice: Number (computed based on pricing type)
savings: Number (computed)
validFrom: Date
validTo: Date
isActive: Boolean (default: true)
createdAt, updatedAt: timestamps
```

### 10.2 BundleItem Schema Fields

```
bundle: ObjectId (ref: Bundle, required)
product: ObjectId (ref: Product, required)
variant: ObjectId (ref: ProductVariant, optional)
quantity: Number (default: 1)
sortOrder: Number (default: 0)
createdAt, updatedAt: timestamps
```

### 10.3 Bundle Routes

Consumer:
- GET /api/bundles - List active bundles
- GET /api/bundles/:slug - Get bundle details with items

Admin:
- GET /api/admin/bundles - List all bundles
- POST /api/admin/bundles - Create bundle
- GET /api/admin/bundles/:id - Get by ID
- PUT /api/admin/bundles/:id - Update bundle
- POST /api/admin/bundles/:id/items - Add items
- PUT /api/admin/bundles/:id/items/:itemId - Update item
- DELETE /api/admin/bundles/:id/items/:itemId - Remove item
- PATCH /api/admin/bundles/:id/status - Toggle active
- DELETE /api/admin/bundles/:id - Delete bundle

### 10.4 Bundle Controller Functions

Consumer:
- listBundles
- getBundleBySlug

Admin:
- listAllBundles
- createBundle
- getBundleById
- updateBundle
- addBundleItems
- updateBundleItem
- removeBundleItem
- toggleBundleStatus
- deleteBundle
- computeBundlePricing (internal helper)

---

## Phase 11: Related Products Module

### 11.1 RelatedProduct Schema Fields

```
product: ObjectId (ref: Product, required)
relatedProduct: ObjectId (ref: Product, required)
relationType: String (enum: crossSell, upSell, frequentlyBoughtTogether)
sortOrder: Number (default: 0)
createdAt, updatedAt: timestamps
```

Compound index on (product, relatedProduct, relationType) for uniqueness.

### 11.2 Related Product Routes

Consumer:
- GET /api/products/:productSlug/cross-sell - Get cross-sell products
- GET /api/products/:productSlug/up-sell - Get up-sell products
- GET /api/products/:productSlug/frequently-bought - Get frequently bought together

Admin:
- GET /api/admin/products/:productId/related - List all related
- POST /api/admin/products/:productId/related - Add related product
- PATCH /api/admin/products/:productId/related/reorder - Reorder
- DELETE /api/admin/products/:productId/related/:relatedId - Remove

### 11.3 Related Product Controller Functions

Consumer:
- getCrossSellProducts
- getUpSellProducts
- getFrequentlyBoughtTogether

Admin:
- listRelatedProducts
- addRelatedProduct
- reorderRelatedProducts
- removeRelatedProduct

---

## Phase 12: Search Module

### 12.1 SearchSynonym Schema Fields

```
term: String (required)
synonyms: [String] (required)
isActive: Boolean (default: true)
createdAt, updatedAt: timestamps
```

### 12.2 Search Implementation

Use MongoDB text indexes on:
- Product: name, description, tags
- Category: name
- Brand: name
- Ingredient: name

For typo tolerance and fuzzy search, implement:
- Levenshtein distance matching (simple implementation)
- Or integrate with MongoDB Atlas Search (if available)

### 12.3 Search Routes

Consumer:
- GET /api/search - Full-text search with filters
- GET /api/search/suggestions - Typeahead/autocomplete
- GET /api/search/category/:categorySlug - Search within category

Admin:
- GET /api/admin/search/synonyms - List synonyms
- POST /api/admin/search/synonyms - Create synonym
- PUT /api/admin/search/synonyms/:id - Update synonym
- DELETE /api/admin/search/synonyms/:id - Delete synonym
- GET /api/admin/search/analytics - View search analytics (basic)

### 12.4 Search Controller Functions

Consumer:
- searchProducts
- getSearchSuggestions
- searchInCategory

Admin:
- listSynonyms
- createSynonym
- updateSynonym
- deleteSynonym
- getSearchAnalytics

### 12.5 Search Features

- Full-text search across product name, description, tags
- Synonym matching (using SearchSynonym collection)
- Faceted search (filters for category, brand, price range, attributes)
- Sort by relevance, price, rating, newest
- Pagination
- Basic typo tolerance

---

## Phase 13: Shared Services and Utilities

### 13.1 Services

Create `services/` helpers:

- `services/slug.service.js` - Generate unique slugs
- `services/pagination.service.js` - Pagination helper
- `services/filter.service.js` - Query filter builder
- `services/sort.service.js` - Sort options builder
- `services/csv.service.js` - CSV import/export for bulk operations

### 13.2 Middleware Updates

Update `middlewares/validate.middleware.js`:
- Generic Joi validation middleware
- Support for body, query, params validation

### 13.3 Constants

Create `utils/constants.js`:
- Product status enum
- Product type enum
- Collection type enum
- Relation type enum
- Skin type enum
- Sort options

---

## Phase 14: Index Route Updates

Update `index.route.js` to include all module routes:

```javascript
import brandRoutes from "./src/brands/brand.route.js";
import ingredientRoutes from "./src/ingredients/ingredient.route.js";
import categoryRoutes from "./src/categories/category.route.js";
import productRoutes from "./src/products/product.route.js";
import variantRoutes from "./src/variants/variant.route.js";
import mediaRoutes from "./src/media/media.route.js";
import collectionRoutes from "./src/collections/collection.route.js";
import bundleRoutes from "./src/bundles/bundle.route.js";
import searchRoutes from "./src/search/search.route.js";

// Consumer routes
router.use("/brands", brandRoutes.consumer);
router.use("/ingredients", ingredientRoutes.consumer);
router.use("/categories", categoryRoutes.consumer);
router.use("/products", productRoutes.consumer);
router.use("/collections", collectionRoutes.consumer);
router.use("/bundles", bundleRoutes.consumer);
router.use("/search", searchRoutes.consumer);

// Admin routes
router.use("/admin/brands", brandRoutes.admin);
router.use("/admin/ingredients", ingredientRoutes.admin);
router.use("/admin/categories", categoryRoutes.admin);
router.use("/admin/products", productRoutes.admin);
router.use("/admin/variants", variantRoutes.admin);
router.use("/admin/media", mediaRoutes.admin);
router.use("/admin/collections", collectionRoutes.admin);
router.use("/admin/bundles", bundleRoutes.admin);
router.use("/admin/search", searchRoutes.admin);
```

---

## Phase 15: Testing and Validation

### 15.1 Manual Testing Checklist

Per module:
- All CRUD operations work
- Validation returns proper error messages
- Pagination works correctly
- Filters and sorting work
- Edge cases handled (empty data, invalid IDs, duplicates)

### 15.2 Data Integrity

- Cascade handling on delete (what happens to variants when product deleted)
- Reference integrity (brand exists before assigning to product)
- Slug uniqueness enforcement

---

## Implementation Order Summary

Phase 1: Foundation + Brands (schema setup, brand CRUD)
Phase 2: Ingredients (ingredient CRUD)
Phase 3: Categories (hierarchy, tree structure)
Phase 4: Products Core (product CRUD, filters, sort)
Phase 5: Product Variants (variant CRUD)
Phase 6: Product Media (media upload, management)
Phase 7: Product-Ingredient Mapping
Phase 8: Product-Category Mapping
Phase 9: Collections (manual + smart)
Phase 10: Bundles (bundle deals)
Phase 11: Related Products (cross-sell, up-sell)
Phase 12: Search (full-text, filters, synonyms)
Phase 13: Shared Services
Phase 14: Route Integration
Phase 15: Testing

---

## Notes

- All responses use `sendResponse()` from `utils/response.utils.js`
- All errors logged with `console.log()`
- Joi validation on all request bodies
- JSDoc comments on routes and controllers with request/response examples
- Soft delete where applicable (deletedAt field)
- Consumer routes return minimal, public-safe data
- Admin routes return full data with IDs

---

## Prompt Instructions for Each Phase

When implementing a phase, provide this context:
1. Which phase number
2. Reference this plan document
3. Mention any completed phases for context
4. Ask to implement specific module routes, controllers, schema, validation

Example prompt:
```
Implement Phase 1 (Foundation + Brands) as per dev_docs/catalog-implementation-plan.md.
Create Brand schema and complete brand module with consumer and admin routes.
Follow code_of_conduct.md strictly.
```
