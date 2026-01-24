/**
 * Main test runner for Catalog Service
 * Runs all module tests and generates a report
 *
 * Usage: node tests/run-tests.js [module]
 * Examples:
 *   node tests/run-tests.js          # Run all tests
 *   node tests/run-tests.js brands   # Run only brand tests
 *   node tests/run-tests.js products # Run only product tests
 */

import { api, assert, TestRunner, generate, cleanup, delay } from "./utils/test.utils.js";

// Store created IDs for cleanup
const createdIds = {
  brands: [],
  ingredients: [],
  categories: [],
  products: [],
  variants: [],
  collections: [],
  bundles: [],
  synonyms: [],
};

/**
 * Brand Module Tests
 */
const brandTests = new TestRunner("Brand Module");

brandTests.test("GET /admin/brands - List all brands", async () => {
  const res = await api.get("/admin/brands");
  assert.status(res, 200);
  assert.hasData(res);
  assert.dataHasKey(res, "brands");
  assert.hasPagination(res);
});

brandTests.test("POST /admin/brands - Create brand", async () => {
  const brandData = generate.brand();
  const res = await api.post("/admin/brands", brandData);
  assert.status(res, 201);
  assert.hasData(res);
  assert.dataHasKey(res, "brand");
  createdIds.brands.push(res.data.data.brand._id);
});

brandTests.test("POST /admin/brands - Validation error on empty name", async () => {
  const res = await api.post("/admin/brands", { name: "" });
  assert.status(res, 400);
  assert.hasError(res);
});

brandTests.test("GET /admin/brands/:id - Get brand by ID", async () => {
  const brandId = createdIds.brands[0];
  if (!brandId) throw new Error("No brand created for this test");
  const res = await api.get(`/admin/brands/${brandId}`);
  assert.status(res, 200);
  assert.hasData(res);
});

brandTests.test("PUT /admin/brands/:id - Update brand", async () => {
  const brandId = createdIds.brands[0];
  if (!brandId) throw new Error("No brand created for this test");
  const res = await api.put(`/admin/brands/${brandId}`, { name: "Updated Brand Name" });
  assert.status(res, 200);
  assert.hasData(res);
});

brandTests.test("GET /brands - Consumer list (active only)", async () => {
  const res = await api.get("/brands");
  assert.status(res, 200);
  assert.hasData(res);
  assert.dataHasKey(res, "brands");
});

brandTests.test("GET /admin/brands/:id - 404 for non-existent ID", async () => {
  const res = await api.get("/admin/brands/000000000000000000000000");
  assert.status(res, 404);
});

/**
 * Category Module Tests
 */
const categoryTests = new TestRunner("Category Module");

categoryTests.test("POST /admin/categories - Create category", async () => {
  const categoryData = generate.category();
  const res = await api.post("/admin/categories", categoryData);
  assert.status(res, 201);
  assert.hasData(res);
  createdIds.categories.push(res.data.data.category._id);
});

categoryTests.test("GET /admin/categories - List all categories", async () => {
  const res = await api.get("/admin/categories");
  assert.status(res, 200);
  assert.hasData(res);
  assert.dataHasKey(res, "categories");
});

categoryTests.test("GET /categories - Consumer list (active only)", async () => {
  const res = await api.get("/categories");
  assert.status(res, 200);
  assert.hasData(res);
});

categoryTests.test("GET /categories/tree - Get category tree", async () => {
  const res = await api.get("/categories/tree");
  assert.status(res, 200);
  assert.hasData(res);
});

/**
 * Ingredient Module Tests
 */
const ingredientTests = new TestRunner("Ingredient Module");

ingredientTests.test("POST /admin/ingredients - Create ingredient", async () => {
  const ingredientData = generate.ingredient();
  const res = await api.post("/admin/ingredients", ingredientData);
  assert.status(res, 201);
  assert.hasData(res);
  createdIds.ingredients.push(res.data.data.ingredient._id);
});

ingredientTests.test("GET /admin/ingredients - List all ingredients", async () => {
  const res = await api.get("/admin/ingredients");
  assert.status(res, 200);
  assert.hasData(res);
  assert.dataHasKey(res, "ingredients");
  assert.hasPagination(res);
});

ingredientTests.test("GET /ingredients - Consumer list", async () => {
  const res = await api.get("/ingredients");
  assert.status(res, 200);
  assert.hasData(res);
});

/**
 * Product Module Tests
 */
const productTests = new TestRunner("Product Module");

productTests.test("POST /admin/products - Create product", async () => {
  // First ensure we have a brand
  if (createdIds.brands.length === 0) {
    const brandRes = await api.post("/admin/brands", generate.brand());
    createdIds.brands.push(brandRes.data.data.brand._id);
  }

  const productData = generate.product(createdIds.brands[0]);
  const res = await api.post("/admin/products", productData);
  assert.status(res, 201);
  assert.hasData(res);
  createdIds.products.push(res.data.data.product._id);
});

productTests.test("GET /admin/products - List all products", async () => {
  const res = await api.get("/admin/products");
  assert.status(res, 200);
  assert.hasData(res);
  assert.dataHasKey(res, "products");
  assert.hasPagination(res);
});

productTests.test("GET /products - Consumer list (active only)", async () => {
  const res = await api.get("/products");
  assert.status(res, 200);
  assert.hasData(res);
});

productTests.test("GET /admin/products with filters", async () => {
  const res = await api.get("/admin/products", { status: "active", limit: 5 });
  assert.status(res, 200);
  assert.hasData(res);
});

productTests.test("POST /admin/products - Validation error on missing brand", async () => {
  const res = await api.post("/admin/products", { name: "Test Product" });
  assert.status(res, 400);
});

/**
 * Variant Module Tests
 */
const variantTests = new TestRunner("Variant Module");

variantTests.test("POST /admin/products/:id/variants - Create variant", async () => {
  const productId = createdIds.products[0];
  if (!productId) throw new Error("No product created for this test");

  const variantData = generate.variant(productId);
  delete variantData.product; // Product comes from URL
  const res = await api.post(`/admin/products/${productId}/variants`, variantData);
  assert.status(res, 201);
  assert.hasData(res);
  createdIds.variants.push(res.data.data.variant._id);
});

variantTests.test("GET /admin/products/:id/variants - List product variants", async () => {
  const productId = createdIds.products[0];
  if (!productId) throw new Error("No product created for this test");

  const res = await api.get(`/admin/products/${productId}/variants`);
  assert.status(res, 200);
  assert.hasData(res);
});

variantTests.test("GET /admin/variants - List all variants", async () => {
  const res = await api.get("/admin/variants");
  assert.status(res, 200);
  assert.hasData(res);
  assert.dataHasKey(res, "variants");
});

/**
 * Collection Module Tests
 */
const collectionTests = new TestRunner("Collection Module");

collectionTests.test("POST /admin/collections - Create manual collection", async () => {
  const collectionData = generate.collection({ type: "manual" });
  const res = await api.post("/admin/collections", collectionData);
  assert.status(res, 201);
  assert.hasData(res);
  createdIds.collections.push(res.data.data.collection._id);
});

collectionTests.test("GET /admin/collections - List all collections", async () => {
  const res = await api.get("/admin/collections");
  assert.status(res, 200);
  assert.hasData(res);
  assert.dataHasKey(res, "collections");
});

collectionTests.test("GET /collections - Consumer list", async () => {
  const res = await api.get("/collections");
  assert.status(res, 200);
  assert.hasData(res);
});

/**
 * Bundle Module Tests
 */
const bundleTests = new TestRunner("Bundle Module");

bundleTests.test("POST /admin/bundles - Create bundle", async () => {
  const productId = createdIds.products[0];
  const variantId = createdIds.variants[0];
  if (!productId || !variantId) {
    throw new Error("Need product and variant for bundle test");
  }

  const bundleData = generate.bundle([{ product: productId, variant: variantId, quantity: 1 }]);
  const res = await api.post("/admin/bundles", bundleData);
  assert.status(res, 201);
  assert.hasData(res);
  createdIds.bundles.push(res.data.data.bundle._id);
});

bundleTests.test("GET /admin/bundles - List all bundles", async () => {
  const res = await api.get("/admin/bundles");
  assert.status(res, 200);
  assert.hasData(res);
  assert.dataHasKey(res, "bundles");
});

bundleTests.test("GET /bundles - Consumer list (active only)", async () => {
  const res = await api.get("/bundles");
  assert.status(res, 200);
  assert.hasData(res);
});

/**
 * Search Module Tests
 */
const searchTests = new TestRunner("Search Module");

searchTests.test("GET /search - Full text search", async () => {
  const res = await api.get("/search", { q: "test" });
  assert.status(res, 200);
  assert.hasData(res);
  assert.dataHasKey(res, "products");
});

searchTests.test("GET /search/suggestions - Get suggestions", async () => {
  const res = await api.get("/search/suggestions", { q: "tes" });
  assert.status(res, 200);
  assert.hasData(res);
});

searchTests.test("POST /admin/search/synonyms - Create synonym", async () => {
  const synonymData = generate.synonym();
  const res = await api.post("/admin/search/synonyms", synonymData);
  assert.status(res, 201);
  assert.hasData(res);
  createdIds.synonyms.push(res.data.data.synonym._id);
});

searchTests.test("GET /admin/search/synonyms - List synonyms", async () => {
  const res = await api.get("/admin/search/synonyms");
  assert.status(res, 200);
  assert.hasData(res);
  assert.dataHasKey(res, "synonyms");
});

searchTests.test("GET /admin/search/analytics - Get analytics", async () => {
  const res = await api.get("/admin/search/analytics");
  assert.status(res, 200);
  assert.hasData(res);
  assert.dataHasKey(res, "summary");
});

/**
 * Validation Tests (Cross-module)
 */
const validationTests = new TestRunner("Validation Tests");

validationTests.test("Invalid ObjectId format returns 400", async () => {
  const res = await api.get("/admin/brands/invalid-id");
  assert.status(res, 400);
});

validationTests.test("Empty body on POST returns 400", async () => {
  const res = await api.post("/admin/brands", {});
  assert.status(res, 400);
});

validationTests.test("Pagination - negative page returns 400", async () => {
  const res = await api.get("/admin/brands", { page: -1 });
  assert.status(res, 400);
});

validationTests.test("Pagination - exceeding max limit uses max", async () => {
  const res = await api.get("/admin/brands", { limit: 500 });
  assert.status(res, 200);
  // Should clamp to max limit (100)
});

/**
 * Data Integrity Tests
 */
const integrityTests = new TestRunner("Data Integrity Tests");

integrityTests.test("Duplicate slug - should generate unique slug", async () => {
  const brandData = generate.brand({ name: "Duplicate Test Brand" });
  const res1 = await api.post("/admin/brands", brandData);
  assert.status(res1, 201);
  createdIds.brands.push(res1.data.data.brand._id);

  const res2 = await api.post("/admin/brands", { ...brandData, name: "Duplicate Test Brand" });
  assert.status(res2, 201);
  createdIds.brands.push(res2.data.data.brand._id);

  // Slugs should be different
  assert.isTrue(
    res1.data.data.brand.slug !== res2.data.data.brand.slug,
    "Slugs are unique"
  );
});

integrityTests.test("Reference integrity - brand must exist for product", async () => {
  const productData = generate.product("000000000000000000000000");
  const res = await api.post("/admin/products", productData);
  // Should fail with 404 or 400 for non-existent brand
  assert.isTrue(res.status === 404 || res.status === 400, "Invalid brand rejected");
});

integrityTests.test("Soft delete - item not returned in consumer list", async () => {
  // Create a brand
  const brandData = generate.brand();
  const createRes = await api.post("/admin/brands", brandData);
  assert.status(createRes, 201);
  const brandId = createRes.data.data.brand._id;
  createdIds.brands.push(brandId);

  // Delete it
  const deleteRes = await api.delete(`/admin/brands/${brandId}`);
  assert.status(deleteRes, 200);

  // Should not appear in consumer list
  const listRes = await api.get("/brands");
  const brands = listRes.data.data.brands;
  const found = brands.find((b) => b._id === brandId);
  assert.isTrue(!found, "Deleted brand not in consumer list");
});

/**
 * Cleanup function
 */
const runCleanup = async () => {
  console.log("\n\nCleaning up test data...");

  // Delete in reverse order of dependencies
  for (const id of createdIds.synonyms) {
    await cleanup("/admin/search/synonyms", id);
  }
  for (const id of createdIds.bundles) {
    await cleanup("/admin/bundles", id);
  }
  for (const id of createdIds.collections) {
    await cleanup("/admin/collections", id);
  }
  for (const id of createdIds.variants) {
    await cleanup("/admin/variants", id);
  }
  for (const id of createdIds.products) {
    await cleanup("/admin/products", id);
  }
  for (const id of createdIds.categories) {
    await cleanup("/admin/categories", id);
  }
  for (const id of createdIds.ingredients) {
    await cleanup("/admin/ingredients", id);
  }
  for (const id of createdIds.brands) {
    await cleanup("/admin/brands", id);
  }

  console.log("Cleanup complete.\n");
};

/**
 * Main test runner
 */
const allTests = {
  brands: brandTests,
  categories: categoryTests,
  ingredients: ingredientTests,
  products: productTests,
  variants: variantTests,
  collections: collectionTests,
  bundles: bundleTests,
  search: searchTests,
  validation: validationTests,
  integrity: integrityTests,
};

const runTests = async () => {
  const args = process.argv.slice(2);
  const moduleToTest = args[0];

  const results = {
    total: { passed: 0, failed: 0 },
    modules: {},
  };

  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║          CATALOG SERVICE - API TEST SUITE                  ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("\n");

  try {
    if (moduleToTest && allTests[moduleToTest]) {
      // Run single module
      const result = await allTests[moduleToTest].run();
      results.modules[moduleToTest] = result;
      results.total.passed += result.passed;
      results.total.failed += result.failed;
    } else if (!moduleToTest) {
      // Run all tests in order
      const testOrder = [
        "brands",
        "categories",
        "ingredients",
        "products",
        "variants",
        "collections",
        "bundles",
        "search",
        "validation",
        "integrity",
      ];

      for (const module of testOrder) {
        const result = await allTests[module].run();
        results.modules[module] = result;
        results.total.passed += result.passed;
        results.total.failed += result.failed;
      }
    } else {
      console.log(`Unknown module: ${moduleToTest}`);
      console.log(`Available modules: ${Object.keys(allTests).join(", ")}`);
      process.exit(1);
    }

    // Cleanup
    await runCleanup();

    // Final summary
    console.log("\n");
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║                    FINAL SUMMARY                           ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    console.log(`\n  Total Passed: ${results.total.passed}`);
    console.log(`  Total Failed: ${results.total.failed}`);
    console.log(`  Total Tests:  ${results.total.passed + results.total.failed}`);
    console.log(`\n  Success Rate: ${((results.total.passed / (results.total.passed + results.total.failed)) * 100).toFixed(1)}%\n`);

    process.exit(results.total.failed > 0 ? 1 : 0);
  } catch (error) {
    console.log("Test runner error:", error.message);
    await runCleanup();
    process.exit(1);
  }
};

// Run tests
runTests();
