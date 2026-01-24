# Catalog Service - Data Integrity Guide

## Overview

This document describes data integrity rules, cascade behavior, and reference integrity constraints in the Catalog Service.

---

## Soft Delete Pattern

All entities in the Catalog Service use soft delete with a `deletedAt` timestamp field.

### Behavior

- **Soft Delete**: Sets `deletedAt = new Date()` instead of removing from database
- **Query Filter**: All queries include `deletedAt: null` to exclude deleted items
- **Consumer Endpoints**: Only show active, non-deleted items
- **Admin Endpoints**: Only show non-deleted items (all statuses)

### Implementation

```javascript
// Delete (soft)
entity.deletedAt = new Date();
await entity.save();

// Query (exclude deleted)
Model.find({ deletedAt: null });
```

---

## Cascade Handling

### Current Behavior

| Action | Entity | Cascade Behavior |
|--------|--------|------------------|
| Delete Product | Product | Sets `deletedAt`, status → `archived` |
| Delete Brand | Brand | Sets `deletedAt`, products keep reference |
| Delete Category | Category | Sets `deletedAt`, mappings remain |
| Delete Ingredient | Ingredient | Sets `deletedAt`, mappings remain |
| Delete Variant | ProductVariant | Sets `deletedAt` |
| Delete Media | ProductMedia | Sets `deletedAt` |
| Delete Collection | Collection | Sets `deletedAt` |
| Delete Bundle | Bundle | Sets `deletedAt` |

### Important Notes

1. **Product Deletion**: When a product is soft deleted:
   - Variants are NOT automatically soft deleted
   - Media items are NOT automatically soft deleted
   - Product-Ingredient mappings remain
   - Product-Category mappings remain
   - Related product entries remain
   - **Result**: Orphaned data may exist but is harmless as parent product is not returned

2. **Brand Deletion**: When a brand is soft deleted:
   - Products referencing the brand are NOT modified
   - Products will show `brand: null` when populated if brand is deleted
   - **Recommendation**: Check for products before deleting brand

3. **Category Deletion**: When a category is soft deleted:
   - Product-Category mappings are NOT modified
   - Child categories are NOT automatically deleted
   - **Recommendation**: Handle child categories manually

### Recommended Cascade Enhancements

For stricter data integrity, consider implementing cascade soft deletes:

```javascript
// Enhanced deleteProduct with cascade
export const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findOne({ _id: id, deletedAt: null });
    if (!product) {
      return sendResponse(res, 404, "Product not found", null, "...");
    }

    const deletedAt = new Date();

    // Cascade to related entities
    await Promise.all([
      Product.updateOne({ _id: id }, { deletedAt, status: "archived" }),
      ProductVariant.updateMany({ product: id }, { deletedAt }),
      ProductMedia.updateMany({ product: id }, { deletedAt }),
      ProductIngredient.deleteMany({ product: id }),
      ProductCategory.deleteMany({ product: id }),
      RelatedProduct.deleteMany({ $or: [{ product: id }, { relatedProduct: id }] }),
    ]);

    return sendResponse(res, 200, "Product deleted successfully", { deletedAt }, null);
  } catch (error) {
    return sendResponse(res, 500, "Failed to delete product", null, error.message);
  }
};
```

---

## Reference Integrity

### Foreign Key Constraints

MongoDB doesn't enforce foreign key constraints. The application handles reference integrity:

| Entity | Reference | Validation |
|--------|-----------|------------|
| Product | brand | Checked on create/update |
| ProductVariant | product | Checked on create |
| ProductMedia | product, variant | Checked on create |
| ProductIngredient | product, ingredient | Checked on create |
| ProductCategory | product, category | Checked on create |
| CollectionProduct | collection, product | Checked on create |
| BundleItem | product, variant | Checked on create |
| RelatedProduct | product, relatedProduct | Checked on create |

### Implementation Pattern

```javascript
// Reference validation before create
const brandExists = await Brand.findOne({ _id: brand, deletedAt: null });
if (!brandExists) {
  return sendResponse(res, 404, "Brand not found", null, "...");
}
```

### Self-Reference Prevention

- RelatedProduct prevents relating a product to itself
- Category can reference parent but not itself

---

## Slug Uniqueness

### Unique Slug Generation

Slugs are generated from entity names and made unique by appending a counter:

```javascript
// Example: "aloe-face-wash", "aloe-face-wash-1", "aloe-face-wash-2"
const generateUniqueSlug = async (baseSlug, Model, excludeId = null) => {
  let slug = baseSlug;
  let counter = 1;

  while (await Model.findOne({ slug, deletedAt: null, _id: { $ne: excludeId } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};
```

### Entities with Slugs

- Brand
- Category
- Ingredient
- Product
- Collection
- Bundle

---

## Default Value Handling

### Variants

- Only one variant per product can be `isDefault: true`
- Setting a new default automatically unsets the previous default
- If no default is set, first active variant is used

### Media

- Only one media item per product can be `isPrimary: true`
- Setting a new primary automatically unsets the previous primary

### Categories

- Parent category reference is optional
- Root categories have `parent: null` and `path: /slug`
- Child categories have path: `/parent-slug/child-slug`

---

## Indexes

### Unique Indexes

| Collection | Index | Type |
|------------|-------|------|
| brands | slug | unique |
| categories | slug | unique |
| ingredients | slug | unique |
| products | slug | unique |
| productvariants | sku | unique |
| collections | slug | unique |
| bundles | slug | unique |
| searchsynonyms | term | unique |

### Compound Indexes

| Collection | Index | Purpose |
|------------|-------|---------|
| products | { name: "text", description: "text", tags: "text" } | Full-text search |
| relatedproducts | { product, relatedProduct, relationType } | Unique relations |

---

## Edge Cases

### Empty Collections

All list endpoints return empty arrays with proper pagination:

```json
{
  "message": "Products fetched successfully",
  "data": {
    "products": [],
    "pagination": { "total": 0, "page": 1, "limit": 20, "totalPages": 0 }
  }
}
```

### Invalid IDs

- Invalid ObjectId format: Returns 400 with validation error
- Non-existent ObjectId: Returns 404 with "not found" error

### Duplicate Prevention

- Duplicate slugs: Auto-incremented (e.g., `name-1`, `name-2`)
- Duplicate SKUs: Returns 409 conflict
- Duplicate synonyms: Returns 409 conflict
- Duplicate relations: Skipped in bulk add

---

## Testing Data Integrity

### Verification Queries

```javascript
// Find orphaned variants (product deleted but variant not)
db.productvariants.find({
  deletedAt: null,
  product: { $in: db.products.find({ deletedAt: { $ne: null } }).map(p => p._id) }
});

// Find products with deleted brands
db.products.find({
  deletedAt: null,
  brand: { $in: db.brands.find({ deletedAt: { $ne: null } }).map(b => b._id) }
});

// Find circular category references
db.categories.find({
  _id: { $eq: { $parent: "$_id" } }
});
```

### Cleanup Scripts

```javascript
// Remove orphaned variants
const deletedProducts = await Product.find({ deletedAt: { $ne: null } }).select("_id");
await ProductVariant.updateMany(
  { product: { $in: deletedProducts.map(p => p._id) }, deletedAt: null },
  { deletedAt: new Date() }
);
```

---

## Recommendations

1. **Cascade Deletes**: Implement cascade soft delete for products to clean up variants, media, etc.
2. **Orphan Detection**: Add admin endpoint to detect and clean orphaned data
3. **Brand Check**: Warn before deleting brand with active products
4. **Category Check**: Warn before deleting category with child categories or products
5. **Hard Delete**: Consider periodic cleanup of long-deleted records (30+ days)
