/**
 * Comprehensive API Testing Suite
 * Tests all endpoints from "Cleanse pagewise apis.md" via Gateway
 */

import CONFIG from './config.js';
import HttpClient from './utils/http-client.js';
import ServiceManager from './utils/service-manager.js';
import SeedData from './utils/seed-data.js';
import ReportGenerator from './utils/report-generator.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test results storage
const testResults = {
  gatewayUrl: CONFIG.gateway.baseUrl,
  startTime: null,
  endTime: null,
  totalDuration: 0,
  serviceHealth: [],
  authentication: {},
  seedData: {},
  homepageTests: [],
  productPageTests: [],
  userFlows: [],
  failures: [],
  recommendations: []
};

// Global instances
let httpClient;
let serviceManager;
let seeder;

/**
 * Initialize test suite
 */
async function initialize() {
  console.log('\n' + '='.repeat(60));
  console.log('  CLEANSE AYURVEDA - COMPREHENSIVE API TEST SUITE');
  console.log('='.repeat(60));

  testResults.startTime = Date.now();

  // Initialize HTTP client
  httpClient = new HttpClient(CONFIG.gateway.baseUrl, CONFIG.gateway.timeout);

  // Initialize service manager
  serviceManager = new ServiceManager(CONFIG.services);

  // Initialize seeder
  seeder = new SeedData(httpClient);

  console.log(`\n📍 Testing Gateway: ${CONFIG.gateway.baseUrl}\n`);
}

/**
 * Phase 1: Service Health Checks & Auto-Start
 */
async function runPreflightChecks() {
  console.log('\n' + '─'.repeat(60));
  console.log('PHASE 1: PRE-FLIGHT CHECKS');
  console.log('─'.repeat(60));

  // Check all services
  const healthCheck = await serviceManager.checkAllServices();
  testResults.serviceHealth = healthCheck.results;

  // Auto-start unhealthy services
  if (!healthCheck.allHealthy) {
    console.log(`\n⚙️  Auto-starting ${healthCheck.unhealthyServices.length} service(s)...\n`);

    const startResult = await serviceManager.startUnhealthyServices(healthCheck.unhealthyServices);

    // Wait for services to be ready
    if (!startResult.allStarted) {
      console.log('\n⚠️  Some services failed to start. Proceeding with available services...\n');
    } else {
      // Re-check health after starting
      console.log('\n🔄 Re-checking service health...\n');
      const recheckResult = await serviceManager.checkAllServices();
      testResults.serviceHealth = recheckResult.results;
    }
  }

  return healthCheck.allHealthy;
}

/**
 * Phase 2: Authentication Setup
 */
async function setupAuthentication() {
  console.log('\n' + '─'.repeat(60));
  console.log('PHASE 2: AUTHENTICATION SETUP');
  console.log('─'.repeat(60) + '\n');

  // Admin Login
  console.log('🔐 Logging in as Admin...');
  const adminLoginResponse = await httpClient.post(
    '/api/auth/admin/login',
    {
      email: CONFIG.auth.admin.email,
      password: CONFIG.auth.admin.password
    },
    { auth: 'none' }
  );

  if (httpClient.isSuccess(adminLoginResponse) && adminLoginResponse.data?.data?.accessToken) {
    httpClient.setToken('admin', adminLoginResponse.data.data.accessToken);
    testResults.authentication.admin = true;
    console.log('✓ Admin token obtained\n');
  } else {
    testResults.authentication.admin = false;
    console.log(`✗ Admin login failed: ${adminLoginResponse.error}\n`);
  }

  // Consumer Token (already provided)
  console.log('🔐 Setting Consumer token...');
  httpClient.setToken('consumer', CONFIG.auth.consumer.token);
  testResults.authentication.consumer = true;
  console.log('✓ Consumer token set\n');

  // Guest Session
  console.log('🔐 Creating Guest session...');
  const guestSessionResponse = await httpClient.post(
    '/api/auth/guest',
    {},
    { auth: 'none' }
  );

  if (httpClient.isSuccess(guestSessionResponse) && guestSessionResponse.data?.data?.accessToken) {
    httpClient.setToken('guest', guestSessionResponse.data.data.accessToken);
    testResults.authentication.guest = true;
    console.log('✓ Guest session created\n');
  } else {
    testResults.authentication.guest = false;
    console.log(`✗ Guest session failed: ${guestSessionResponse.error}\n`);
  }

  const allAuthSuccess = testResults.authentication.admin &&
    testResults.authentication.consumer &&
    testResults.authentication.guest;

  console.log(allAuthSuccess ? '✅ All authentication successful\n' : '⚠️  Some authentication failed\n');

  return allAuthSuccess;
}

/**
 * Phase 3: Seed Comprehensive Test Data
 */
async function seedTestData() {
  console.log('\n' + '─'.repeat(60));
  console.log('PHASE 3: SEED COMPREHENSIVE TEST DATA');
  console.log('─'.repeat(60) + '\n');

  const createdData = await seeder.seedAll();
  testResults.seedData = createdData;

  return createdData;
}

/**
 * Phase 4: Homepage API Testing
 */
async function testHomepageEndpoints(seedData) {
  console.log('\n' + '─'.repeat(60));
  console.log('PHASE 4: HOMEPAGE API TESTING');
  console.log('─'.repeat(60) + '\n');

  const tests = [
    // 1. Header/Menu
    {
      name: 'Header/Menu Items',
      endpoint: '/api/cms/navigation',
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 2. Hero Banners
    {
      name: 'Hero Section Banners',
      endpoint: '/api/cms/banners?placement=hero',
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 3. Popup Promo
    {
      name: 'Popup Promo Banner',
      endpoint: '/api/cms/popups',
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 4. Vision/Values Page
    {
      name: 'Vision & Values',
      endpoint: '/api/cms/pages/our-values',
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 5. Featured Products
    {
      name: 'Featured Products',
      endpoint: '/api/catalog/products?isFeatured=true&limit=10',
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 6. All Banners (Bento)
    {
      name: 'Bento Section Banners',
      endpoint: '/api/cms/banners',
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 7. Product Showcase - use first product
    {
      name: 'Product Showcase',
      endpoint: seedData.products.length > 0 ? `/api/catalog/products/${seedData.products[0].slug}` : '/api/catalog/products/test-product',
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 8. Categories
    {
      name: 'Category Fetch',
      endpoint: '/api/catalog/categories',
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 9. Blogs List
    {
      name: 'Blogs List',
      endpoint: '/api/cms/blogs',
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 10. Featured Blogs
    {
      name: 'Featured Blogs',
      endpoint: '/api/cms/blogs/featured',
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 11. Instagram Reels
    {
      name: 'Instagram Reels',
      endpoint: '/api/cms/reels',
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 12. Testimonials
    {
      name: 'Testimonials',
      endpoint: '/api/cms/testimonials',
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 13. Search Suggestions
    {
      name: 'Search Suggestions',
      endpoint: '/api/catalog/search/suggestions?q=aloe',
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 14. Search Products
    {
      name: 'Search Products',
      endpoint: '/api/catalog/search?q=aloe&limit=10',
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    }
  ];

  // POST endpoints with guest auth
  const postTests = [
    // 15. Add to Cart (Guest)
    {
      name: 'Add to Cart (Guest)',
      endpoint: '/api/order/cart/items',
      method: 'POST',
      auth: 'guest',
      body: seedData.variants.length > 0 ? {
        variantId: seedData.variants[0].variantId,
        quantity: 2
      } : null,
      expectedFields: ['message', 'data'],
      verbose: true  // Enable verbose logging to see error details
    },

    // 16. Get Cart (Guest)
    {
      name: 'Get Cart (Guest)',
      endpoint: '/api/order/cart',
      method: 'GET',
      auth: 'guest',
      expectedFields: ['message', 'data'],
      verbose: true  // Enable verbose logging to see error details
    }
  ];

  tests.push(...postTests);

  // Execute tests
  for (const test of tests) {
    await runSingleTest(test, 'homepageTests');
  }

  const passed = testResults.homepageTests.filter(t => t.passed).length;
  const total = testResults.homepageTests.length;

  console.log(`\n✅ Homepage Tests Complete: ${passed}/${total} passed\n`);
}

/**
 * Phase 5: Product Page API Testing
 */
async function testProductPageEndpoints(seedData) {
  console.log('\n' + '─'.repeat(60));
  console.log('PHASE 5: PRODUCT PAGE API TESTING');
  console.log('─'.repeat(60) + '\n');

  if (seedData.products.length === 0) {
    console.log('⚠️  No products available for product page testing\n');
    return;
  }

  const testProduct = seedData.products[0];
  const testVariant = seedData.variants.find(v => v.productId === testProduct.id);

  const tests = [
    // 1. Product Details
    {
      name: 'Product Basic Details',
      endpoint: `/api/catalog/products/${testProduct.slug}`,
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 2. Product Variants
    {
      name: 'Product Variants',
      endpoint: `/api/catalog/products/${testProduct.slug}/variants`,
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 3. Product Media
    {
      name: 'Product Photos',
      endpoint: `/api/catalog/products/${testProduct.slug}/media`,
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 4. Product Ingredients
    {
      name: 'Product Ingredients',
      endpoint: `/api/catalog/products/${testProduct.slug}/ingredients`,
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 5. Stock Check
    {
      name: 'Stock Status Check',
      endpoint: testVariant ? `/api/inventory/stock/check/${testVariant.variantId}` : '/api/inventory/stock/check/dummy-id',
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 6. Product Reviews
    {
      name: 'Product Reviews',
      endpoint: `/api/engagement/products/${testProduct.id}/reviews`,
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 7. Cross-sell Products
    {
      name: 'Cross-sell Recommendations',
      endpoint: `/api/catalog/products/${testProduct.slug}/related?type=crossSell`,
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 8. Up-sell Products
    {
      name: 'Up-sell Recommendations',
      endpoint: `/api/catalog/products/${testProduct.slug}/related?type=upSell`,
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 9. Frequently Bought Together
    {
      name: 'Frequently Bought Together',
      endpoint: `/api/catalog/products/${testProduct.slug}/related?type=frequentlyBoughtTogether`,
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 10. Bundle List
    {
      name: 'Bundle List',
      endpoint: '/api/catalog/bundles',
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 11. Bundle Details
    {
      name: 'Bundle Details',
      endpoint: seedData.bundles.length > 0 ? `/api/catalog/bundles/${seedData.bundles[0].slug}` : '/api/catalog/bundles/test-bundle',
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 12. Our Values Page
    {
      name: 'Our Values Page',
      endpoint: '/api/cms/pages/our-values',
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 13. Shipping & Returns Page
    {
      name: 'Shipping & Returns Page',
      endpoint: '/api/cms/pages/shipping-returns',
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    },

    // 14. Privacy Policy Page
    {
      name: 'Privacy Policy Page',
      endpoint: '/api/cms/pages/privacy-policy',
      method: 'GET',
      auth: 'none',
      expectedFields: ['message', 'data']
    }
  ];

  // POST endpoints with consumer auth
  const postTests = [
    // 15. Add to Cart (Consumer)
    {
      name: 'Add to Cart (Consumer)',
      endpoint: '/api/order/cart/items',
      method: 'POST',
      auth: 'consumer',
      body: testVariant ? {
        variantId: testVariant.variantId,
        quantity: 1
      } : null,
      expectedFields: ['message', 'data']
    },

    // 16. Initiate Checkout
    {
      name: 'Initiate Checkout',
      endpoint: '/api/order/checkout',
      method: 'POST',
      auth: 'consumer',
      body: {},
      expectedFields: ['message', 'data']
    },

    // 17. Write Review
    {
      name: 'Write Product Review',
      endpoint: `/api/engagement/products/${testProduct.id}/reviews`,
      method: 'POST',
      auth: 'consumer',
      body: CONFIG.testData.reviewData,
      expectedFields: ['message', 'data']
    }
  ];

  tests.push(...postTests);

  // Execute tests
  for (const test of tests) {
    await runSingleTest(test, 'productPageTests');
  }

  const passed = testResults.productPageTests.filter(t => t.passed).length;
  const total = testResults.productPageTests.length;

  console.log(`\n✅ Product Page Tests Complete: ${passed}/${total} passed\n`);
}

/**
 * Phase 6: User Flow Testing
 */
async function testUserFlows(seedData) {
  console.log('\n' + '─'.repeat(60));
  console.log('PHASE 6: USER FLOW TESTING');
  console.log('─'.repeat(60) + '\n');

  // Flow 1: Guest Browse & Add to Cart
  await testGuestBrowseFlow(seedData);

  // Flow 2: Authenticated Purchase Journey
  await testAuthenticatedPurchaseFlow(seedData);

  // Flow 3: Discovery & Engagement
  await testDiscoveryFlow(seedData);

  const passed = testResults.userFlows.filter(f => f.passed).length;
  const total = testResults.userFlows.length;

  console.log(`\n✅ User Flow Tests Complete: ${passed}/${total} passed\n`);
}

/**
 * Test guest browse flow
 */
async function testGuestBrowseFlow(seedData) {
  console.log('🛒 Testing Guest Browse & Cart Flow...');

  const flowSteps = [];
  let flowPassed = true;
  const flowStart = Date.now();

  try {
    // Step 1: Get featured products
    const step1 = await httpClient.get('/api/catalog/products?isFeatured=true&limit=5', { auth: 'none', verbose: false });
    flowSteps.push({ step: 'Get featured products', passed: httpClient.isSuccess(step1) });
    if (!httpClient.isSuccess(step1)) flowPassed = false;

    // Step 2: Get product details
    if (seedData.products.length > 0) {
      const step2 = await httpClient.get(`/api/catalog/products/${seedData.products[0].slug}`, { auth: 'none', verbose: false });
      flowSteps.push({ step: 'Get product details', passed: httpClient.isSuccess(step2) });
      if (!httpClient.isSuccess(step2)) flowPassed = false;
    }

    // Step 3: Get variants
    if (seedData.products.length > 0) {
      const step3 = await httpClient.get(`/api/catalog/products/${seedData.products[0].slug}/variants`, { auth: 'none', verbose: false });
      flowSteps.push({ step: 'Get product variants', passed: httpClient.isSuccess(step3) });
      if (!httpClient.isSuccess(step3)) flowPassed = false;
    }

    // Step 4: Check stock
    if (seedData.variants.length > 0) {
      const step4 = await httpClient.get(`/api/inventory/stock/check/${seedData.variants[0].variantId}`, { auth: 'none', verbose: false });
      flowSteps.push({ step: 'Check stock availability', passed: httpClient.isSuccess(step4) });
      if (!httpClient.isSuccess(step4)) flowPassed = false;
    }

    // Step 5: Add to cart (guest)
    if (seedData.variants.length > 0) {
      const step5 = await httpClient.post('/api/order/cart/items', {
        variantId: seedData.variants[0].variantId,
        quantity: 2
      }, { auth: 'guest', verbose: false });
      flowSteps.push({ step: 'Add to cart', passed: httpClient.isSuccess(step5) });
      if (!httpClient.isSuccess(step5)) flowPassed = false;
    }

    // Step 6: Get cart
    const step6 = await httpClient.get('/api/order/cart', { auth: 'guest', verbose: false });
    flowSteps.push({ step: 'Get cart', passed: httpClient.isSuccess(step6) });
    if (!httpClient.isSuccess(step6)) flowPassed = false;

    console.log(`  ${flowPassed ? '✓' : '✗'} Guest Browse & Cart Flow (${flowSteps.length} steps)`);
  } catch (error) {
    console.log(`  ✗ Guest Browse & Cart Flow failed: ${error.message}`);
    flowPassed = false;
  }

  testResults.userFlows.push({
    name: 'Guest Browse & Cart',
    steps: flowSteps.length,
    passed: flowPassed,
    duration: Date.now() - flowStart,
    error: flowPassed ? null : 'Flow failed - see step details'
  });
}

/**
 * Test authenticated purchase flow
 */
async function testAuthenticatedPurchaseFlow(seedData) {
  console.log('💳 Testing Authenticated Purchase Flow...');

  const flowSteps = [];
  let flowPassed = true;
  const flowStart = Date.now();

  try {
    // Step 1: Search
    const step1 = await httpClient.get('/api/catalog/search?q=aloe', { auth: 'none', verbose: false });
    flowSteps.push({ step: 'Search products', passed: httpClient.isSuccess(step1) });
    if (!httpClient.isSuccess(step1)) flowPassed = false;

    // Step 2: View product
    if (seedData.products.length > 0) {
      const step2 = await httpClient.get(`/api/catalog/products/${seedData.products[0].slug}`, { auth: 'consumer', verbose: false });
      flowSteps.push({ step: 'View product details', passed: httpClient.isSuccess(step2) });
      if (!httpClient.isSuccess(step2)) flowPassed = false;
    }

    // Step 3: Check reviews
    if (seedData.products.length > 0) {
      const step3 = await httpClient.get(`/api/engagement/products/${seedData.products[0].id}/reviews`, { auth: 'none', verbose: false });
      flowSteps.push({ step: 'Check product reviews', passed: httpClient.isSuccess(step3) });
      if (!httpClient.isSuccess(step3)) flowPassed = false;
    }

    // Step 4: Add to cart
    if (seedData.variants.length > 0) {
      const step4 = await httpClient.post('/api/order/cart/items', {
        variantId: seedData.variants[0].variantId,
        quantity: 1
      }, { auth: 'consumer', verbose: false });
      flowSteps.push({ step: 'Add to cart', passed: httpClient.isSuccess(step4) });
      if (!httpClient.isSuccess(step4)) flowPassed = false;
    }

    // Step 5: View cart
    const step5 = await httpClient.get('/api/order/cart', { auth: 'consumer', verbose: false });
    flowSteps.push({ step: 'View cart', passed: httpClient.isSuccess(step5) });
    if (!httpClient.isSuccess(step5)) flowPassed = false;

    console.log(`  ${flowPassed ? '✓' : '✗'} Authenticated Purchase Flow (${flowSteps.length} steps)`);
  } catch (error) {
    console.log(`  ✗ Authenticated Purchase Flow failed: ${error.message}`);
    flowPassed = false;
  }

  testResults.userFlows.push({
    name: 'Authenticated Purchase Journey',
    steps: flowSteps.length,
    passed: flowPassed,
    duration: Date.now() - flowStart,
    error: flowPassed ? null : 'Flow failed - see step details'
  });
}

/**
 * Test discovery flow
 */
async function testDiscoveryFlow(seedData) {
  console.log('🔍 Testing Discovery & Engagement Flow...');

  const flowSteps = [];
  let flowPassed = true;
  const flowStart = Date.now();

  try {
    // Step 1: Browse categories
    const step1 = await httpClient.get('/api/catalog/categories', { auth: 'none', verbose: false });
    flowSteps.push({ step: 'Browse categories', passed: httpClient.isSuccess(step1) });
    if (!httpClient.isSuccess(step1)) flowPassed = false;

    // Step 2: Filter by category
    if (seedData.categories.length > 0) {
      const step2 = await httpClient.get(`/api/catalog/products?category=${seedData.categories[0].slug}`, { auth: 'none', verbose: false });
      flowSteps.push({ step: 'Filter by category', passed: httpClient.isSuccess(step2) });
      if (!httpClient.isSuccess(step2)) flowPassed = false;
    }

    // Step 3: View blogs
    const step3 = await httpClient.get('/api/cms/blogs', { auth: 'none', verbose: false });
    flowSteps.push({ step: 'View blogs', passed: httpClient.isSuccess(step3) });
    if (!httpClient.isSuccess(step3)) flowPassed = false;

    // Step 4: View testimonials
    const step4 = await httpClient.get('/api/cms/testimonials', { auth: 'none', verbose: false });
    flowSteps.push({ step: 'View testimonials', passed: httpClient.isSuccess(step4) });
    if (!httpClient.isSuccess(step4)) flowPassed = false;

    console.log(`  ${flowPassed ? '✓' : '✗'} Discovery & Engagement Flow (${flowSteps.length} steps)`);
  } catch (error) {
    console.log(`  ✗ Discovery Flow failed: ${error.message}`);
    flowPassed = false;
  }

  testResults.userFlows.push({
    name: 'Discovery & Engagement',
    steps: flowSteps.length,
    passed: flowPassed,
    duration: Date.now() - flowStart,
    error: flowPassed ? null : 'Flow failed - see step details'
  });
}

/**
 * Run a single test
 */
async function runSingleTest(test, resultArray) {
  const testStart = Date.now();

  try {
    let response;
    const verbose = test.verbose || false;

    if (test.method === 'GET') {
      response = await httpClient.get(test.endpoint, {
        auth: test.auth,
        verbose: verbose
      });
    } else if (test.method === 'POST') {
      if (!test.body) {
        console.log(`  ⚠️  Skipping ${test.name}: no test data available`);
        return;
      }

      response = await httpClient.post(test.endpoint, test.body, {
        auth: test.auth,
        verbose: verbose
      });
    } else if (test.method === 'PUT') {
      response = await httpClient.put(test.endpoint, test.body || {}, {
        auth: test.auth,
        verbose: verbose
      });
    }

    const duration = Date.now() - testStart;
    const passed = httpClient.isSuccess(response);
    const hasRequiredFields = test.expectedFields ? httpClient.hasRequiredFields(response, test.expectedFields) : true;

    const dataQuality = hasRequiredFields ? 'Complete' : 'Incomplete';

    const testResult = {
      name: test.name,
      endpoint: test.endpoint,
      method: test.method,
      passed: passed && hasRequiredFields,
      status: response.status,
      duration,
      dataQuality,
      error: passed ? null : response.error,
      response: response.data
    };

    testResults[resultArray].push(testResult);

    const symbol = testResult.passed ? '✓' : '✗';
    console.log(`  ${symbol} ${test.name} (${response.status}, ${duration}ms)`);

    // Track failures
    if (!testResult.passed) {
      testResults.failures.push({
        title: test.name,
        endpoint: test.endpoint,
        method: test.method,
        error: response.error || 'Unknown error',
        status: response.status,
        rootCause: categorizeError(response),
        fixed: false,
        retested: false
      });
    }
  } catch (error) {
    console.log(`  ✗ ${test.name} - Exception: ${error.message}`);

    testResults[resultArray].push({
      name: test.name,
      endpoint: test.endpoint,
      method: test.method,
      passed: false,
      status: 0,
      duration: Date.now() - testStart,
      dataQuality: 'N/A',
      error: error.message
    });
  }
}

/**
 * Categorize error for fix strategy
 */
function categorizeError(response) {
  if (response.status === 503) return 'Service Unavailable';
  if (response.status === 404) return 'Route Not Found';
  if (response.status === 401) return 'Authentication Failed';
  if (response.status === 403) return 'Authorization Failed';
  if (response.status === 400) return 'Validation Error';
  if (response.status === 500) return 'Internal Server Error';
  if (response.status === 0) return 'Connection Failed';
  return 'Unknown Error';
}

/**
 * Generate final report
 */
async function generateFinalReport() {
  console.log('\n' + '─'.repeat(60));
  console.log('GENERATING FINAL REPORT');
  console.log('─'.repeat(60) + '\n');

  testResults.endTime = Date.now();
  testResults.totalDuration = testResults.endTime - testResults.startTime;

  // Generate recommendations based on results
  generateRecommendations();

  // Create report
  const reportGen = new ReportGenerator(testResults);
  const reportPath = path.join(__dirname, '..', CONFIG.report.outputDir, CONFIG.report.filename);

  reportGen.generate(reportPath);
  reportGen.printConsoleSummary();

  return reportPath;
}

/**
 * Generate recommendations based on test results
 */
function generateRecommendations() {
  const failures = testResults.failures || [];
  const allTests = [...testResults.homepageTests, ...testResults.productPageTests];

  // High priority: Service unavailability
  const serviceUnavailable = failures.filter(f => f.rootCause === 'Service Unavailable');
  if (serviceUnavailable.length > 0) {
    testResults.recommendations.push({
      priority: 'High Priority',
      text: `${serviceUnavailable.length} endpoint(s) failed due to service unavailability. Ensure all services are running.`
    });
  }

  // High priority: Authentication issues
  const authIssues = failures.filter(f => f.rootCause === 'Authentication Failed' || f.rootCause === 'Authorization Failed');
  if (authIssues.length > 0) {
    testResults.recommendations.push({
      priority: 'High Priority',
      text: `${authIssues.length} endpoint(s) have authentication issues. Review token forwarding and middleware configuration.`
    });
  }

  // Medium priority: Performance
  const slowEndpoints = allTests.filter(t => t.duration > 2000);
  if (slowEndpoints.length > 0) {
    testResults.recommendations.push({
      priority: 'Medium Priority',
      text: `${slowEndpoints.length} endpoint(s) have response times > 2s. Consider optimization or caching.`
    });
  }

  // Low priority: Missing data
  const notFoundErrors = failures.filter(f => f.status === 404);
  if (notFoundErrors.length > 0) {
    testResults.recommendations.push({
      priority: 'Low Priority',
      text: `${notFoundErrors.length} endpoint(s) returned 404. Verify routes are correctly configured or data exists.`
    });
  }
}

/**
 * Main test execution
 */
async function main() {
  try {
    await initialize();

    // Phase 1: Pre-flight
    await runPreflightChecks();

    // Phase 2: Authentication
    const authSuccess = await setupAuthentication();
    if (!authSuccess) {
      console.log('❌ Authentication setup failed. Cannot proceed with tests.\n');
      await generateFinalReport();
      return;
    }

    // Phase 3: Seed Data
    const seedData = await seedTestData();

    // Phase 4: Homepage Tests
    await testHomepageEndpoints(seedData);

    // Phase 5: Product Page Tests
    await testProductPageEndpoints(seedData);

    // Phase 6: User Flows
    await testUserFlows(seedData);

    // Generate Report
    const reportPath = await generateFinalReport();

    console.log('\n' + '='.repeat(60));
    console.log('  ✅ TESTING COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n📄 Full report: ${reportPath}\n`);

  } catch (error) {
    console.error('\n❌ Fatal error during testing:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
main();
