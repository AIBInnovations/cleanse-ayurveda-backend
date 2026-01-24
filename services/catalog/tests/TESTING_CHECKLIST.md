# Catalog Service - Testing Checklist

## Quick Start

```bash
# 1. Start the server
npm run dev

# 2. Seed test data
node tests/fixtures/seed-data.js

# 3. Run automated tests
node tests/run-tests.js

# 4. Run specific module tests
node tests/run-tests.js brands
node tests/run-tests.js products
```

---

## Module Testing Checklist

### 1. Brands Module

#### Admin Routes (`/api/admin/brands`)

| Test | Endpoint | Expected | Status |
|------|----------|----------|--------|
| List all brands | `GET /admin/brands` | 200, paginated list | ☐ |
| List with pagination | `GET /admin/brands?page=2&limit=5` | 200, correct page | ☐ |
| List with search | `GET /admin/brands?search=himalaya` | 200, filtered results | ☐ |
| Get brand by ID | `GET /admin/brands/:id` | 200, brand object | ☐ |
| Get brand by slug | `GET /admin/brands/slug/:slug` | 200, brand object | ☐ |
| Create brand | `POST /admin/brands` | 201, created brand | ☐ |
| Create with duplicate name | `POST /admin/brands` | 201, unique slug | ☐ |
| Create with invalid data | `POST /admin/brands` | 400, validation errors | ☐ |
| Update brand | `PUT /admin/brands/:id` | 200, updated brand | ☐ |
| Delete brand | `DELETE /admin/brands/:id` | 200, soft deleted | ☐ |
| Get non-existent brand | `GET /admin/brands/000...` | 404, not found | ☐ |

#### Consumer Routes (`/api/brands`)

| Test | Endpoint | Expected | Status |
|------|----------|----------|--------|
| List active brands | `GET /brands` | 200, only active brands | ☐ |
| Get brand by slug | `GET /brands/:slug` | 200, brand with logo | ☐ |
| Deleted brand not shown | `GET /brands` | Deleted brands excluded | ☐ |

---

### 2. Categories Module

#### Admin Routes (`/api/admin/categories`)

| Test | Endpoint | Expected | Status |
|------|----------|----------|--------|
| List all categories | `GET /admin/categories` | 200, flat list | ☐ |
| Get category tree | `GET /admin/categories/tree` | 200, nested structure | ☐ |
| Create root category | `POST /admin/categories` | 201, no parent | ☐ |
| Create child category | `POST /admin/categories` with parent | 201, with parent ref | ☐ |
| Update category | `PUT /admin/categories/:id` | 200, updated | ☐ |
| Delete category | `DELETE /admin/categories/:id` | 200, soft deleted | ☐ |
| Reorder categories | `PATCH /admin/categories/reorder` | 200, new order | ☐ |

#### Consumer Routes (`/api/categories`)

| Test | Endpoint | Expected | Status |
|------|----------|----------|--------|
| List active categories | `GET /categories` | 200, active only | ☐ |
| Get category tree | `GET /categories/tree` | 200, active nested | ☐ |
| Get by slug with products | `GET /categories/:slug` | 200, with products | ☐ |

---

### 3. Ingredients Module

#### Admin Routes (`/api/admin/ingredients`)

| Test | Endpoint | Expected | Status |
|------|----------|----------|--------|
| List all ingredients | `GET /admin/ingredients` | 200, paginated | ☐ |
| Create ingredient | `POST /admin/ingredients` | 201, created | ☐ |
| Create with benefits array | `POST /admin/ingredients` | 201, array saved | ☐ |
| Update ingredient | `PUT /admin/ingredients/:id` | 200, updated | ☐ |
| Delete ingredient | `DELETE /admin/ingredients/:id` | 200, deleted | ☐ |

#### Consumer Routes (`/api/ingredients`)

| Test | Endpoint | Expected | Status |
|------|----------|----------|--------|
| List active ingredients | `GET /ingredients` | 200, active only | ☐ |
| Get by slug with products | `GET /ingredients/:slug` | 200, with products | ☐ |

---

### 4. Products Module

#### Admin Routes (`/api/admin/products`)

| Test | Endpoint | Expected | Status |
|------|----------|----------|--------|
| List all products | `GET /admin/products` | 200, paginated | ☐ |
| Filter by status | `GET /admin/products?status=active` | 200, filtered | ☐ |
| Filter by brand | `GET /admin/products?brand=:id` | 200, filtered | ☐ |
| Filter by featured | `GET /admin/products?isFeatured=true` | 200, featured only | ☐ |
| Create product | `POST /admin/products` | 201, created | ☐ |
| Create without brand | `POST /admin/products` | 400, brand required | ☐ |
| Create with invalid brand | `POST /admin/products` | 404, brand not found | ☐ |
| Update product | `PUT /admin/products/:id` | 200, updated | ☐ |
| Change status | `PATCH /admin/products/:id/status` | 200, status changed | ☐ |
| Delete product | `DELETE /admin/products/:id` | 200, cascades to variants | ☐ |

#### Consumer Routes (`/api/products`)

| Test | Endpoint | Expected | Status |
|------|----------|----------|--------|
| List active products | `GET /products` | 200, active only | ☐ |
| Get by slug | `GET /products/:slug` | 200, full details | ☐ |
| Includes variants | `GET /products/:slug` | Has variants array | ☐ |
| Includes pricing | `GET /products/:slug` | Has pricing object | ☐ |
| Includes primary image | `GET /products/:slug` | Has primaryImage | ☐ |

---

### 5. Variants Module

#### Admin Routes (`/api/admin/products/:productId/variants`)

| Test | Endpoint | Expected | Status |
|------|----------|----------|--------|
| List product variants | `GET /admin/products/:id/variants` | 200, variant list | ☐ |
| Create variant | `POST /admin/products/:id/variants` | 201, created | ☐ |
| Create with duplicate SKU | `POST /admin/products/:id/variants` | 409, conflict | ☐ |
| Set default variant | `PATCH /admin/variants/:id/default` | 200, only one default | ☐ |
| Update variant | `PUT /admin/variants/:id` | 200, updated | ☐ |
| Delete variant | `DELETE /admin/variants/:id` | 200, deleted | ☐ |

#### Consumer Routes (`/api/products/:slug/variants`)

| Test | Endpoint | Expected | Status |
|------|----------|----------|--------|
| List variants by slug | `GET /products/:slug/variants` | 200, active variants | ☐ |

---

### 6. Media Module

#### Admin Routes (`/api/admin/products/:productId/media`)

| Test | Endpoint | Expected | Status |
|------|----------|----------|--------|
| List product media | `GET /admin/products/:id/media` | 200, media list | ☐ |
| Add media | `POST /admin/products/:id/media` | 201, added | ☐ |
| Set primary image | `PATCH /admin/media/:id/primary` | 200, one primary | ☐ |
| Reorder media | `PATCH /admin/products/:id/media/reorder` | 200, reordered | ☐ |
| Delete media | `DELETE /admin/media/:id` | 200, deleted | ☐ |

---

### 7. Collections Module

#### Admin Routes (`/api/admin/collections`)

| Test | Endpoint | Expected | Status |
|------|----------|----------|--------|
| List collections | `GET /admin/collections` | 200, paginated | ☐ |
| Create manual collection | `POST /admin/collections` type=manual | 201, created | ☐ |
| Create smart collection | `POST /admin/collections` type=smart | 201, with rules | ☐ |
| Add products to manual | `POST /admin/collections/:id/products` | 201, added | ☐ |
| Remove product | `DELETE /admin/collections/:id/products/:pid` | 200, removed | ☐ |
| Update collection | `PUT /admin/collections/:id` | 200, updated | ☐ |

#### Consumer Routes (`/api/collections`)

| Test | Endpoint | Expected | Status |
|------|----------|----------|--------|
| List active collections | `GET /collections` | 200, active only | ☐ |
| Get by slug with products | `GET /collections/:slug` | 200, with products | ☐ |
| Smart collection products | `GET /collections/:slug` | Products match rules | ☐ |

---

### 8. Bundles Module

#### Admin Routes (`/api/admin/bundles`)

| Test | Endpoint | Expected | Status |
|------|----------|----------|--------|
| List bundles | `GET /admin/bundles` | 200, paginated | ☐ |
| Create fixed price bundle | `POST /admin/bundles` pricingType=fixed | 201, created | ☐ |
| Create percentage bundle | `POST /admin/bundles` pricingType=percentageOff | 201, created | ☐ |
| Bundle with validity dates | `POST /admin/bundles` with dates | 201, date validated | ☐ |
| Update bundle | `PUT /admin/bundles/:id` | 200, updated | ☐ |
| Delete bundle | `DELETE /admin/bundles/:id` | 200, deleted | ☐ |

#### Consumer Routes (`/api/bundles`)

| Test | Endpoint | Expected | Status |
|------|----------|----------|--------|
| List active bundles | `GET /bundles` | 200, within validity | ☐ |
| Get by slug | `GET /bundles/:slug` | 200, with computed pricing | ☐ |

---

### 9. Related Products Module

#### Admin Routes (`/api/admin/products/:productId/related`)

| Test | Endpoint | Expected | Status |
|------|----------|----------|--------|
| List related products | `GET /admin/products/:id/related` | 200, grouped by type | ☐ |
| Add cross-sell | `POST /admin/products/:id/related` | 201, added | ☐ |
| Add up-sell | `POST /admin/products/:id/related` | 201, added | ☐ |
| Add frequently bought | `POST /admin/products/:id/related` | 201, added | ☐ |
| Cannot relate to self | `POST /admin/products/:id/related` | 400, error | ☐ |
| Bulk add | `POST /admin/products/:id/related/bulk` | 201, count | ☐ |
| Reorder | `PATCH /admin/products/:id/related/reorder` | 200, reordered | ☐ |
| Remove relation | `DELETE /admin/products/:id/related/:rid` | 200, removed | ☐ |

#### Consumer Routes (`/api/products/:slug/...`)

| Test | Endpoint | Expected | Status |
|------|----------|----------|--------|
| Get cross-sell | `GET /products/:slug/cross-sell` | 200, products | ☐ |
| Get up-sell | `GET /products/:slug/up-sell` | 200, products | ☐ |
| Get frequently bought | `GET /products/:slug/frequently-bought` | 200, products | ☐ |

---

### 10. Search Module

#### Consumer Routes (`/api/search`)

| Test | Endpoint | Expected | Status |
|------|----------|----------|--------|
| Full text search | `GET /search?q=aloe` | 200, results | ☐ |
| Search with filters | `GET /search?q=cream&brand=:id` | 200, filtered | ☐ |
| Search with price range | `GET /search?q=cream&minPrice=100&maxPrice=500` | 200, in range | ☐ |
| Search with sort | `GET /search?q=cream&sort=price_asc` | 200, sorted | ☐ |
| Get suggestions | `GET /search/suggestions?q=alo` | 200, suggestions | ☐ |
| Search in category | `GET /search/category/:slug?q=wash` | 200, category scoped | ☐ |

#### Admin Routes (`/api/admin/search`)

| Test | Endpoint | Expected | Status |
|------|----------|----------|--------|
| List synonyms | `GET /admin/search/synonyms` | 200, paginated | ☐ |
| Create synonym | `POST /admin/search/synonyms` | 201, created | ☐ |
| Duplicate term | `POST /admin/search/synonyms` | 409, conflict | ☐ |
| Update synonym | `PUT /admin/search/synonyms/:id` | 200, updated | ☐ |
| Delete synonym | `DELETE /admin/search/synonyms/:id` | 200, deleted | ☐ |
| Get analytics | `GET /admin/search/analytics` | 200, summary | ☐ |

---

## Data Integrity Tests

### Cascade Handling

| Test | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| Delete product | Soft delete product | Variants soft deleted too | ☐ |
| Delete brand | Soft delete brand | Products keep reference | ☐ |
| Delete category | Soft delete category | Products keep mapping | ☐ |
| Delete ingredient | Soft delete ingredient | Products keep mapping | ☐ |

### Reference Integrity

| Test | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| Create product with invalid brand | POST product | 404 brand not found | ☐ |
| Add invalid product to collection | POST collection product | 404 product not found | ☐ |
| Create variant for invalid product | POST variant | 404 product not found | ☐ |

### Slug Uniqueness

| Test | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| Create duplicate brand name | POST brand | Unique slug generated (brand-1) | ☐ |
| Create duplicate product name | POST product | Unique slug generated | ☐ |
| Create duplicate category name | POST category | Unique slug generated | ☐ |

---

## Validation Tests

### Common Validation

| Test | Input | Expected | Status |
|------|-------|----------|--------|
| Invalid ObjectId format | `/:id` with "invalid" | 400, validation error | ☐ |
| Missing required field | Empty name | 400, field required | ☐ |
| Invalid enum value | status: "unknown" | 400, invalid value | ☐ |
| Negative number | price: -100 | 400, must be positive | ☐ |
| String too long | name > 200 chars | 400, max length | ☐ |
| Invalid email format | email: "notanemail" | 400, invalid format | ☐ |
| Invalid URL format | website: "notaurl" | 400, invalid format | ☐ |

### Pagination Validation

| Test | Input | Expected | Status |
|------|-------|----------|--------|
| Negative page | page: -1 | 400 or defaults to 1 | ☐ |
| Zero page | page: 0 | 400 or defaults to 1 | ☐ |
| Exceeding max limit | limit: 500 | Clamps to max (100) | ☐ |
| Non-integer page | page: "abc" | 400, must be number | ☐ |

---

## Edge Cases

| Test | Scenario | Expected | Status |
|------|----------|----------|--------|
| Empty collection | List with no data | 200, empty array | ☐ |
| Last page pagination | Request page > total | 200, empty array | ☐ |
| Special chars in search | `q=<script>` | Sanitized, no XSS | ☐ |
| Unicode in names | Arabic/Chinese chars | Properly stored/returned | ☐ |
| Very long description | 10000 chars | Truncated or stored | ☐ |
| Concurrent updates | Same resource | Last write wins | ☐ |

---

## Performance Considerations

- [ ] List endpoints respond < 500ms
- [ ] Search with filters responds < 1s
- [ ] Bulk operations handle 100+ items
- [ ] Pagination prevents memory issues
- [ ] Indexes are properly utilized

---

## Testing Notes

1. **Before Testing**: Run `node tests/fixtures/seed-data.js` to populate test data
2. **After Testing**: Test data can be cleaned via delete endpoints
3. **Environment**: Ensure `.env` has `TEST_API_URL` set correctly
4. **Database**: Use a separate test database when possible

---

## Sign-off

| Module | Tester | Date | Notes |
|--------|--------|------|-------|
| Brands | | | |
| Categories | | | |
| Ingredients | | | |
| Products | | | |
| Variants | | | |
| Media | | | |
| Collections | | | |
| Bundles | | | |
| Related Products | | | |
| Search | | | |
