/**
 * Seed Data Utility
 * Creates comprehensive test data using admin APIs
 */

import CONFIG from '../config.js';

class SeedData {
  constructor(httpClient) {
    this.client = httpClient;
    this.createdData = {
      categories: [],
      products: [],
      variants: [],
      bundles: [],
      blogs: [],
      testimonials: [],
      banners: [],
      reels: [],
      popups: [],
      pages: [],
      navigation: [],
      reviews: []
    };
  }

  /**
   * Seed all test data
   * @returns {Promise<object>} Created data IDs
   */
  async seedAll() {
    console.log('\n🌱 Seeding comprehensive test data...\n');

    try {
      // Seed in order of dependencies
      await this.seedCategories();
      await this.seedProducts();
      await this.seedBundles();
      await this.seedBlogs();
      await this.seedTestimonials();
      await this.seedBanners();
      await this.seedReels();
      await this.seedPopups();
      await this.seedPages();
      await this.seedNavigation();
      await this.seedReviews();

      console.log('\n✅ All test data seeded successfully\n');
      this.printSummary();

      return this.createdData;
    } catch (error) {
      console.error('\n❌ Error seeding data:', error.message);
      throw error;
    }
  }

  /**
   * Seed categories
   */
  async seedCategories() {
    console.log('📁 Seeding categories...');

    // First, try to fetch existing categories
    const existingCatsResp = await this.client.get('/api/catalog/categories', { auth: 'none', verbose: false });

    const existingCategories = {};
    if (this.client.isSuccess(existingCatsResp) && existingCatsResp.data?.data) {
      const cats = Array.isArray(existingCatsResp.data.data) ? existingCatsResp.data.data : existingCatsResp.data.data.categories || [];
      cats.forEach(cat => {
        if (cat.slug) {
          existingCategories[cat.slug] = cat;
        }
      });
    }

    for (const cat of CONFIG.testData.categories) {
      // Check if category already exists
      if (existingCategories[cat.slug]) {
        this.createdData.categories.push({
          ...cat,
          id: existingCategories[cat.slug]._id || existingCategories[cat.slug].id
        });
        console.log(`  ↻ Using existing category: ${cat.name}`);
        continue;
      }

      // Create new category
      const response = await this.client.post(
        '/api/catalog/admin/categories',
        {
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          icon: cat.icon,
          isActive: true
        },
        { auth: 'admin', verbose: false }
      );

      if (this.client.isSuccess(response) && response.data?.data) {
        this.createdData.categories.push({
          ...cat,
          id: response.data.data._id || response.data.data.id
        });
        console.log(`  ✓ Created category: ${cat.name}`);
      } else {
        console.log(`  ⚠️  Failed to create category: ${cat.name} (${response.status})`);
      }
    }

    console.log(`✓ Categories available: ${this.createdData.categories.length}/${CONFIG.testData.categories.length}\n`);
  }

  /**
   * Seed products
   */
  async seedProducts() {
    console.log('🛍️  Seeding products...');

    // Fetch existing products
    const existingProdsResp = await this.client.get('/api/catalog/admin/products?limit=100', { auth: 'admin', verbose: false });
    const existingProducts = {};

    if (this.client.isSuccess(existingProdsResp) && existingProdsResp.data?.data) {
      const prods = existingProdsResp.data.data.products || [];
      prods.forEach(prod => {
        if (prod.slug) {
          existingProducts[prod.slug] = prod;
        }
      });
    }

    for (const prod of CONFIG.testData.products) {
      const slug = this.generateSlug(prod.name);

      // Check if product already exists
      if (existingProducts[slug]) {
        const productId = existingProducts[slug]._id || existingProducts[slug].id;

        this.createdData.products.push({
          ...prod,
          id: productId,
          slug: existingProducts[slug].slug
        });
        console.log(`  ↻ Using existing product: ${prod.name}`);

        // Fetch existing variants for this product
        const variantsResp = await this.client.get(`/api/catalog/admin/products/${productId}/variants`, { auth: 'admin', verbose: false });
        let hasVariants = false;

        if (this.client.isSuccess(variantsResp) && variantsResp.data?.data) {
          const variants = variantsResp.data.data.variants || variantsResp.data.data || [];
          if (variants.length > 0) {
            hasVariants = true;
            variants.forEach(v => {
              this.createdData.variants.push({
                productId: productId,
                variantId: v._id || v.id,
                name: v.name,
                sku: v.sku
              });
            });
          }
        }

        // If no variants exist, create them
        if (!hasVariants) {
          console.log(`    Creating variants for existing product...`);
          await this.createProductVariants(productId, prod);
        }

        continue;
      }

      // Find category ID
      const category = this.createdData.categories.find(c => c.slug === prod.category);

      if (!category) {
        console.log(`  ⚠️  Skipping ${prod.name}: category not found`);
        continue;
      }

      const sku = this.generateSKU(prod.name);

      const response = await this.client.post(
        '/api/catalog/admin/products',
        {
          name: prod.name,
          slug,
          sku,
          shortDescription: prod.shortDescription,
          description: prod.description,
          status: 'active',
          tags: prod.tags || []
        },
        { auth: 'admin', verbose: false }
      );

      if (this.client.isSuccess(response) && response.data?.data) {
        const productData = response.data.data.product || response.data.data;
        const productId = productData._id || productData.id;

        this.createdData.products.push({
          ...prod,
          id: productId,
          slug: productData.slug
        });

        // Set product flags
        if (prod.isFeatured || prod.isBestseller || prod.isNewArrival) {
          await this.setProductFlags(productId, {
            isFeatured: prod.isFeatured || false,
            isBestseller: prod.isBestseller || false,
            isNewArrival: prod.isNewArrival || false
          });
        }

        // Create variants
        await this.createProductVariants(productId, prod);

        console.log(`  ✓ Created product: ${prod.name}`);
      } else {
        console.log(`  ⚠️  Failed to create product: ${prod.name} (${response.status})`);
      }
    }

    console.log(`✓ Products available: ${this.createdData.products.length}/${CONFIG.testData.products.length}\n`);
  }

  /**
   * Set product flags (featured, bestseller, new arrival)
   */
  async setProductFlags(productId, flags) {
    await this.client.patch(
      `/api/catalog/admin/products/${productId}/flags`,
      flags,
      { auth: 'admin', verbose: false }
    );
  }

  /**
   * Create product variants
   */
  async createProductVariants(productId, product) {
    const variants = [
      { size: '50ml', quantity: 50, sku: `${product.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '')}-50` },
      { size: '100ml', quantity: 100, sku: `${product.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '')}-100` },
      { size: '200ml', quantity: 200, sku: `${product.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '')}-200` }
    ];

    for (const variant of variants) {
      const variantIndex = variants.indexOf(variant);
      const price = product.basePrice + (variantIndex * 100);
      const compareAtPrice = product.compareAtPrice + (variantIndex * 100);
      const mrp = compareAtPrice; // MRP is same as compareAtPrice

      const response = await this.client.post(
        `/api/catalog/admin/products/${productId}/variants`,
        {
          name: variant.size,
          sku: variant.sku,
          price,
          compareAtPrice,
          mrp,
          attributes: { size: variant.size },
          isDefault: variantIndex === 0
        },
        { auth: 'admin', verbose: false }
      );

      if (this.client.isSuccess(response) && response.data?.data) {
        const variantData = response.data.data.variant || response.data.data;
        this.createdData.variants.push({
          productId,
          variantId: variantData._id || variantData.id,
          ...variant
        });
      }
    }
  }

  /**
   * Seed bundles
   */
  async seedBundles() {
    console.log('📦 Seeding bundles...');

    if (this.createdData.products.length < 3) {
      console.log('  ⚠️  Not enough products to create bundles\n');
      return;
    }

    const bundlesData = [
      {
        name: 'Complete Skincare Kit',
        slug: 'complete-skincare-kit',
        description: 'Everything you need for a complete skincare routine',
        productIds: this.createdData.products.slice(0, 4).map(p => p.id),
        discount: 20
      },
      {
        name: 'Hair & Body Care Combo',
        slug: 'hair-body-care-combo',
        description: 'Nourish your hair and body with this combo',
        productIds: this.createdData.products.slice(4, 7).map(p => p.id),
        discount: 15
      }
    ];

    for (const bundle of bundlesData) {
      // Step 1: Create a product for this bundle (required by Bundle model)
      const productSlug = `${bundle.slug}-product`;
      const productSku = `BUNDLE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const productResponse = await this.client.post(
        '/api/catalog/admin/products',
        {
          name: bundle.name,
          slug: productSlug,
          sku: productSku,
          shortDescription: bundle.description,
          description: bundle.description,
          status: 'active',
          tags: ['bundle', 'combo']
        },
        { auth: 'admin', verbose: false }
      );

      if (!this.client.isSuccess(productResponse) || !productResponse.data?.data) {
        console.log(`  ⚠️  Failed to create product for bundle: ${bundle.name}`);
        continue;
      }

      const productData = productResponse.data.data.product || productResponse.data.data;
      const productId = productData._id || productData.id;

      // Step 2: Create bundle with correct field names
      const response = await this.client.post(
        '/api/catalog/admin/bundles',
        {
          product: productId,  // REQUIRED: Reference to product
          name: bundle.name,   // REQUIRED: Bundle name
          slug: bundle.slug,
          description: bundle.description,
          pricingType: 'percentageOff',  // CORRECT: was discountType
          percentageOff: bundle.discount,  // CORRECT: was discountValue
          isActive: true
        },
        { auth: 'admin', verbose: false }
      );

      if (this.client.isSuccess(response) && response.data?.data) {
        const bundleData = response.data.data.bundle || response.data.data;
        const bundleId = bundleData._id || bundleData.id;

        // Step 3: Add items to bundle
        for (const productId of bundle.productIds) {
          await this.client.post(
            `/api/catalog/admin/bundles/${bundleId}/items`,
            { productId, quantity: 1 },
            { auth: 'admin', verbose: false }
          );
        }

        this.createdData.bundles.push({
          ...bundle,
          id: bundleId,
          slug: bundleData.slug
        });

        console.log(`  ✓ Created bundle: ${bundle.name}`);
      } else {
        console.log(`  ⚠️  Failed to create bundle: ${bundle.name} (${response.status})`);
      }
    }

    console.log(`✓ Bundles seeded: ${this.createdData.bundles.length}\n`);
  }

  /**
   * Seed blogs
   */
  async seedBlogs() {
    console.log('📝 Seeding blogs...');

    // First create blog categories
    const blogCategories = {};
    const uniqueCategories = [...new Set(CONFIG.testData.blogs.map(b => b.category))];

    for (const catName of uniqueCategories) {
      const catSlug = this.generateSlug(catName);
      const catResp = await this.client.post('/api/cms/admin/blog-categories', {
        name: catName,
        slug: catSlug,
        description: `${catName} articles`
      }, { auth: 'admin', verbose: false });

      if (this.client.isSuccess(catResp) && catResp.data?.data) {
        const catData = catResp.data.data.category || catResp.data.data;
        blogCategories[catName] = catData._id || catData.id;
      }
    }

    // Now create blogs with category IDs
    for (const blog of CONFIG.testData.blogs) {
      const categoryId = blogCategories[blog.category];

      if (!categoryId) {
        console.log(`  ⚠️  Skipping ${blog.title}: blog category not found`);
        continue;
      }

      const response = await this.client.post(
        '/api/cms/admin/blogs',
        {
          title: blog.title,
          slug: blog.slug,
          excerpt: blog.excerpt,
          content: blog.content,
          status: 'published',
          isFeatured: blog.isFeatured || false,
          category: categoryId
        },
        { auth: 'admin', verbose: false }
      );

      if (this.client.isSuccess(response) && response.data?.data) {
        const blogData = response.data.data.blog || response.data.data;
        this.createdData.blogs.push({
          ...blog,
          id: blogData._id || blogData.id
        });
        console.log(`  ✓ Created blog: ${blog.title}`);
      } else {
        console.log(`  ⚠️  Failed to create blog: ${blog.title} (${response.status})`);
      }
    }

    console.log(`✓ Blogs seeded: ${this.createdData.blogs.length}/${CONFIG.testData.blogs.length}\n`);
  }

  /**
   * Seed testimonials
   */
  async seedTestimonials() {
    console.log('⭐ Seeding testimonials...');

    for (const testimonial of CONFIG.testData.testimonials) {
      const response = await this.client.post(
        '/api/cms/admin/testimonials',
        {
          customer_name: testimonial.name,  // CORRECT: was name
          rating: testimonial.rating,
          testimonial_text: testimonial.text,  // CORRECT: was text
          is_featured: testimonial.isApproved || false,  // CORRECT: was isApproved
          is_active: true  // CORRECT: was isActive
        },
        { auth: 'admin', verbose: false }
      );

      if (this.client.isSuccess(response) && response.data?.data) {
        const testData = response.data.data.testimonial || response.data.data;
        this.createdData.testimonials.push({
          ...testimonial,
          id: testData._id || testData.id
        });
        console.log(`  ✓ Created testimonial: ${testimonial.name}`);
      } else {
        console.log(`  ⚠️  Failed to create testimonial: ${testimonial.name} (${response.status})`);
      }
    }

    console.log(`✓ Testimonials seeded: ${this.createdData.testimonials.length}/${CONFIG.testData.testimonials.length}\n`);
  }

  /**
   * Seed banners
   */
  async seedBanners() {
    console.log('🎨 Seeding banners...');

    for (const banner of CONFIG.testData.banners) {
      const response = await this.client.post(
        '/api/cms/admin/banners',
        {
          name: banner.title,  // ADDED: required field
          title: banner.title,
          placement: banner.placement,
          image_desktop_url: banner.imageUrl,  // CORRECT: was imageUrl
          cta_url: banner.link,  // CORRECT: was link
          priority: banner.priority,
          is_active: true  // CORRECT: was isActive
        },
        { auth: 'admin', verbose: false }
      );

      if (this.client.isSuccess(response) && response.data?.data) {
        const bannerData = response.data.data.banner || response.data.data;
        this.createdData.banners.push({
          ...banner,
          id: bannerData._id || bannerData.id
        });
        console.log(`  ✓ Created banner: ${banner.title}`);
      } else {
        console.log(`  ⚠️  Failed to create banner: ${banner.title} (${response.status})`);
      }
    }

    console.log(`✓ Banners seeded: ${this.createdData.banners.length}/${CONFIG.testData.banners.length}\n`);
  }

  /**
   * Seed reels
   */
  async seedReels() {
    console.log('🎬 Seeding reels...');

    const reelsData = [
      { title: 'Aloe Vera Benefits', url: 'https://www.instagram.com/reel/example1', thumbnailUrl: 'https://via.placeholder.com/300x400' },
      { title: 'Morning Skincare Routine', url: 'https://www.instagram.com/reel/example2', thumbnailUrl: 'https://via.placeholder.com/300x400' },
      { title: 'Hair Care Tips', url: 'https://www.instagram.com/reel/example3', thumbnailUrl: 'https://via.placeholder.com/300x400' }
    ];

    for (const reel of reelsData) {
      const response = await this.client.post(
        '/api/cms/admin/reels',
        {
          title: reel.title,
          video_url: reel.url,  // CORRECT: was url
          thumbnail_url: reel.thumbnailUrl,  // CORRECT: was thumbnailUrl
          is_active: true  // CORRECT: was isActive
        },
        { auth: 'admin', verbose: false }
      );

      if (this.client.isSuccess(response) && response.data?.data) {
        const reelData = response.data.data.reel || response.data.data;
        this.createdData.reels.push({
          ...reel,
          id: reelData._id || reelData.id
        });
        console.log(`  ✓ Created reel: ${reel.title}`);
      } else {
        console.log(`  ⚠️  Failed to create reel: ${reel.title} (${response.status})`);
      }
    }

    console.log(`✓ Reels seeded: ${this.createdData.reels.length}/${reelsData.length}\n`);
  }

  /**
   * Seed popups
   */
  async seedPopups() {
    console.log('🔔 Seeding popups...');

    const popupData = {
      name: 'Newsletter Popup',  // ADDED: required field
      title: 'Subscribe to Newsletter',
      type: 'newsletter',
      content: '<h2>Get 10% Off Your First Order</h2><p>Subscribe to our newsletter for exclusive deals!</p>',
      trigger_type: 'time_delay',  // CORRECT: was part of triggerDelay
      trigger_value: '5000',  // CORRECT: was triggerDelay (must be string)
      is_active: true  // CORRECT: was isActive
    };

    const response = await this.client.post(
      '/api/cms/admin/popups',
      popupData,
      { auth: 'admin', verbose: false }
    );

    if (this.client.isSuccess(response) && response.data?.data) {
      const popupDataResp = response.data.data.popup || response.data.data;
      this.createdData.popups.push({
        ...popupData,
        id: popupDataResp._id || popupDataResp.id
      });
      console.log(`  ✓ Created popup: ${popupData.title}`);
    } else {
      console.log(`  ⚠️  Failed to create popup: ${popupData.title} (${response.status})`);
    }

    console.log(`✓ Popups seeded: ${this.createdData.popups.length}\n`);
  }

  /**
   * Seed pages
   */
  async seedPages() {
    console.log('📄 Seeding pages...');

    const pagesData = [
      {
        title: 'Our Values',
        slug: 'our-values',
        content: '<h1>Our Values</h1><p>At Cleanse Ayurveda, we believe in the power of natural ingredients...</p>'
      },
      {
        title: 'Shipping & Returns',
        slug: 'shipping-returns',
        content: '<h1>Shipping & Returns</h1><p>Free shipping on orders above ₹500. Easy returns within 30 days...</p>'
      },
      {
        title: 'Privacy Policy',
        slug: 'privacy-policy',
        content: '<h1>Privacy Policy</h1><p>Your privacy is important to us...</p>'
      }
    ];

    for (const page of pagesData) {
      const response = await this.client.post(
        '/api/cms/admin/pages',
        {
          title: page.title,
          slug: page.slug,
          content: page.content,
          status: 'published'
        },
        { auth: 'admin', verbose: false }
      );

      if (this.client.isSuccess(response) && response.data?.data) {
        const pageData = response.data.data.page || response.data.data;
        this.createdData.pages.push({
          ...page,
          id: pageData._id || pageData.id
        });
        console.log(`  ✓ Created page: ${page.title}`);
      } else {
        console.log(`  ⚠️  Failed to create page: ${page.title} (${response.status})`);
      }
    }

    console.log(`✓ Pages seeded: ${this.createdData.pages.length}/${pagesData.length}\n`);
  }

  /**
   * Seed navigation
   */
  async seedNavigation() {
    console.log('🧭 Seeding navigation...');

    const navData = {
      location: 'main_header',  // ADDED: required field (enum value)
      name: 'Main Menu',
      items: [
        { title: 'Home', url: '/', order: 1 },  // CORRECT: was label
        { title: 'Shop', url: '/products', order: 2 },
        { title: 'About', url: '/about', order: 3 },
        { title: 'Blog', url: '/blogs', order: 4 },
        { title: 'Contact', url: '/contact', order: 5 }
      ],
      is_active: true  // CORRECT: was isActive
    };

    const response = await this.client.post(
      '/api/cms/admin/navigation',
      navData,
      { auth: 'admin', verbose: false }
    );

    if (this.client.isSuccess(response) && response.data?.data) {
      const navDataResp = response.data.data.navigation || response.data.data;
      this.createdData.navigation.push({
        ...navData,
        id: navDataResp._id || navDataResp.id
      });
      console.log(`  ✓ Created navigation: ${navData.name}`);
    } else {
      console.log(`  ⚠️  Failed to create navigation: ${navData.name} (${response.status})`);
    }

    console.log(`✓ Navigation seeded: ${this.createdData.navigation.length}\n`);
  }

  /**
   * Seed reviews
   */
  async seedReviews() {
    console.log('💬 Seeding reviews...');

    if (this.createdData.products.length === 0) {
      console.log('  ⚠️  No products available for reviews\n');
      return;
    }

    const reviewsData = [
      { rating: 5, title: 'Excellent product!', comment: 'Love this product. Works great!', isVerifiedPurchase: true },
      { rating: 4, title: 'Good quality', comment: 'Nice product but slightly expensive.', isVerifiedPurchase: true },
      { rating: 5, title: 'Highly recommended', comment: 'Amazing results in just 2 weeks!', isVerifiedPurchase: true },
      { rating: 4, title: 'Worth buying', comment: 'Good value for money.', isVerifiedPurchase: false }
    ];

    for (let i = 0; i < Math.min(10, this.createdData.products.length); i++) {
      const product = this.createdData.products[i];
      const review = reviewsData[i % reviewsData.length];

      const response = await this.client.post(
        `/api/engagement/admin/reviews`,
        {
          productId: product.id,
          userId: 'test-user-id',
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          isVerifiedPurchase: review.isVerifiedPurchase,
          status: 'approved'
        },
        { auth: 'admin', verbose: false }
      );

      if (this.client.isSuccess(response) && response.data?.data) {
        const reviewData = response.data.data.review || response.data.data;
        this.createdData.reviews.push({
          productId: product.id,
          ...review,
          id: reviewData._id || reviewData.id
        });
        console.log(`  ✓ Created review for: ${product.name}`);
      } else {
        console.log(`  ⚠️  Failed to create review for: ${product.name} (${response.status})`);
      }
    }

    console.log(`✓ Reviews seeded: ${this.createdData.reviews.length}\n`);
  }

  /**
   * Generate slug from name
   */
  generateSlug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  /**
   * Generate SKU from name
   */
  generateSKU(name) {
    const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${random}`;
  }

  /**
   * Print summary of seeded data
   */
  printSummary() {
    console.log('📊 Seed Data Summary:\n');
    console.log(`   Categories: ${this.createdData.categories.length}`);
    console.log(`   Products: ${this.createdData.products.length}`);
    console.log(`   Variants: ${this.createdData.variants.length}`);
    console.log(`   Bundles: ${this.createdData.bundles.length}`);
    console.log(`   Blogs: ${this.createdData.blogs.length}`);
    console.log(`   Testimonials: ${this.createdData.testimonials.length}`);
    console.log(`   Banners: ${this.createdData.banners.length}`);
    console.log(`   Reels: ${this.createdData.reels.length}`);
    console.log(`   Popups: ${this.createdData.popups.length}`);
    console.log(`   Pages: ${this.createdData.pages.length}`);
    console.log(`   Navigation: ${this.createdData.navigation.length}`);
    console.log(`   Reviews: ${this.createdData.reviews.length}`);
    console.log();
  }

  /**
   * Get created data
   */
  getCreatedData() {
    return this.createdData;
  }
}

export default SeedData;
