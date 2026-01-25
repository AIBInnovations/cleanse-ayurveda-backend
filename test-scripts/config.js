/**
 * Test Configuration
 * Central configuration for comprehensive API testing
 */

export const CONFIG = {
  // Gateway Configuration
  gateway: {
    baseUrl: 'http://localhost:3000',
    timeout: 10000, // 10 seconds
    healthEndpoint: '/api/health'
  },

  // Service Configuration
  services: {
    gateway: { name: 'Gateway', port: 3000, path: 'services/gateway' },
    auth: { name: 'Auth', port: 3001, path: 'services/auth' },
    catalog: { name: 'Catalog', port: 3002, path: 'services/catalog' },
    order: { name: 'Order', port: 3003, path: 'services/order' },
    pricing: { name: 'Pricing', port: 3004, path: 'services/pricing-promotions' },
    inventory: { name: 'Inventory', port: 3005, path: 'services/inventory' },
    cms: { name: 'CMS', port: 3006, path: 'services/cms' },
    engagement: { name: 'Engagement', port: 3007, path: 'services/engagement' }
  },

  // Authentication Configuration
  auth: {
    admin: {
      email: 'admin@cleanse.com',
      password: 'ChangeMe123!'
    },
    consumer: {
      // Firebase JWT token (already obtained)
      token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjFjMzIxOTgzNGRhNTBlMjBmYWVhZWE3Yzg2Y2U3YjU1MzhmMTdiZTEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vY2xlYW5zZS1heXVydmVkYSIsImF1ZCI6ImNsZWFuc2UtYXl1cnZlZGEiLCJhdXRoX3RpbWUiOjE3NjkzNDIzMTcsInVzZXJfaWQiOiJaR3dQYWFienhNTzdXWG5BSWtabHVyQUJiUm4xIiwic3ViIjoiWkd3UGFhYnp4TU83V1huQUlrWmx1ckFCYlJuMSIsImlhdCI6MTc2OTM0MjMxNywiZXhwIjoxNzY5MzQ1OTE3LCJwaG9uZV9udW1iZXIiOiIrOTE5MTc5NjIxNzY1IiwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJwaG9uZSI6WyIrOTE5MTc5NjIxNzY1Il19LCJzaWduX2luX3Byb3ZpZGVyIjoicGhvbmUifX0.uTVFwfc_7yJaNaOFyDm_wtps-c-RFaMN-SaPNNK6A_If9SYtLIydP8oT2PS8TW1DjmhxXC6dZfnIuurnYjK-pySmr89PEeohKvYttd6tcFZj6jp3tcHgKjiXMxVXAMgrmc0HIY82QVzOLmuLU-PpgQyrcBO-2Cjn3AYIB6rzCAWEFOmfpv7ZMUVppfrF1bIRlOiGPM8fTFpN_GatjXaqRReOX1gfANWdNXQAz40b7Kobs0riBOkxwCQtxL-YIP2WnIj_xEZYAi-UnTwIBUdpwVjD1mg-9Cra0NrKmPhhzM0ibDEc6VNsQkWLPYsK2Tl7z1-hYHe8XKQp2bU_wRRgFg'
    }
  },

  // Test Data Templates
  testData: {
    categories: [
      { name: 'Face Care', slug: 'face-care', icon: '🧴', description: 'Premium face care products' },
      { name: 'Body Care', slug: 'body-care', icon: '🫧', description: 'Nourishing body care essentials' },
      { name: 'Hair Care', slug: 'hair-care', icon: '💆', description: 'Natural hair care solutions' },
      { name: 'Wellness', slug: 'wellness', icon: '🌿', description: 'Holistic wellness products' },
      { name: 'Combos & Kits', slug: 'combos-kits', icon: '🎁', description: 'Curated product combinations' },
      { name: 'Ayurvedic Herbs', slug: 'ayurvedic-herbs', icon: '🌱', description: 'Pure ayurvedic herbs' },
      { name: 'Essential Oils', slug: 'essential-oils', icon: '💧', description: 'Natural essential oils' },
      { name: 'Skincare Tools', slug: 'skincare-tools', icon: '🪮', description: 'Skincare accessories' }
    ],

    products: [
      {
        name: 'Aloe Vera Gel',
        shortDescription: 'Pure aloe vera gel for skin hydration',
        description: 'Our premium aloe vera gel is extracted from fresh aloe leaves, providing deep hydration and soothing relief for all skin types.',
        category: 'face-care',
        isFeatured: true,
        isBestseller: true,
        basePrice: 299,
        compareAtPrice: 499,
        tags: ['natural', 'hydrating', 'soothing']
      },
      {
        name: 'Neem Face Wash',
        shortDescription: 'Gentle neem-based facial cleanser',
        description: 'Ayurvedic neem face wash with tea tree oil for clear, acne-free skin. Suitable for oily and combination skin types.',
        category: 'face-care',
        isFeatured: true,
        basePrice: 249,
        compareAtPrice: 399,
        tags: ['neem', 'acne', 'cleansing']
      },
      {
        name: 'Turmeric Glow Cream',
        shortDescription: 'Brightening turmeric face cream',
        description: 'Natural turmeric and saffron infused cream for radiant, glowing skin. Rich in antioxidants.',
        category: 'face-care',
        isFeatured: true,
        basePrice: 599,
        compareAtPrice: 899,
        tags: ['turmeric', 'brightening', 'anti-aging']
      },
      {
        name: 'Coconut Hair Oil',
        shortDescription: 'Pure cold-pressed coconut oil',
        description: 'Virgin coconut oil enriched with herbs for stronger, shinier hair. Prevents hair fall and promotes growth.',
        category: 'hair-care',
        isBestseller: true,
        basePrice: 349,
        compareAtPrice: 549,
        tags: ['coconut', 'hair-growth', 'nourishing']
      },
      {
        name: 'Sandalwood Body Lotion',
        shortDescription: 'Luxurious sandalwood body moisturizer',
        description: 'Rich body lotion with sandalwood and almond oil for silky smooth skin. Non-greasy formula.',
        category: 'body-care',
        isFeatured: true,
        basePrice: 449,
        compareAtPrice: 699,
        tags: ['sandalwood', 'moisturizing', 'luxury']
      },
      {
        name: 'Ashwagandha Wellness Capsules',
        shortDescription: 'Stress relief and vitality support',
        description: 'Pure ashwagandha extract capsules for stress management, better sleep, and increased energy levels.',
        category: 'wellness',
        isNewArrival: true,
        basePrice: 799,
        compareAtPrice: 1199,
        tags: ['ashwagandha', 'stress-relief', 'immunity']
      },
      {
        name: 'Rose Water Toner',
        shortDescription: 'Refreshing rose water facial toner',
        description: 'Pure rose water spray for toning and refreshing skin. Balances pH and tightens pores.',
        category: 'face-care',
        isBestseller: true,
        basePrice: 199,
        compareAtPrice: 349,
        tags: ['rose', 'toner', 'refreshing']
      },
      {
        name: 'Tea Tree Face Scrub',
        shortDescription: 'Exfoliating tea tree scrub',
        description: 'Gentle exfoliating scrub with tea tree oil and walnut granules for smooth, clear skin.',
        category: 'face-care',
        basePrice: 329,
        compareAtPrice: 499,
        tags: ['tea-tree', 'exfoliating', 'acne']
      },
      {
        name: 'Lavender Essential Oil',
        shortDescription: 'Calming lavender aromatherapy oil',
        description: '100% pure lavender essential oil for aromatherapy, stress relief, and better sleep quality.',
        category: 'essential-oils',
        isNewArrival: true,
        basePrice: 549,
        compareAtPrice: 799,
        tags: ['lavender', 'aromatherapy', 'relaxation']
      },
      {
        name: 'Herbal Hair Mask',
        shortDescription: 'Deep conditioning hair treatment',
        description: 'Intensive hair mask with amla, bhringraj, and hibiscus for deep nourishment and repair.',
        category: 'hair-care',
        basePrice: 399,
        compareAtPrice: 599,
        tags: ['herbal', 'conditioning', 'repair']
      },
      {
        name: 'Charcoal Face Mask',
        shortDescription: 'Detoxifying activated charcoal mask',
        description: 'Activated charcoal face mask that draws out impurities and excess oil for clearer skin.',
        category: 'face-care',
        isFeatured: true,
        basePrice: 399,
        compareAtPrice: 649,
        tags: ['charcoal', 'detox', 'pore-cleansing']
      },
      {
        name: 'Kumkumadi Face Oil',
        shortDescription: 'Precious saffron face oil',
        description: 'Luxurious ayurvedic face oil with saffron and 16 herbs for radiant, youthful skin.',
        category: 'face-care',
        basePrice: 1299,
        compareAtPrice: 1999,
        tags: ['kumkumadi', 'saffron', 'anti-aging']
      },
      {
        name: 'Mint Foot Cream',
        shortDescription: 'Cooling peppermint foot moisturizer',
        description: 'Soothing foot cream with peppermint and tea tree oil for soft, refreshed feet.',
        category: 'body-care',
        basePrice: 249,
        compareAtPrice: 399,
        tags: ['mint', 'foot-care', 'cooling']
      },
      {
        name: 'Vitamin C Serum',
        shortDescription: 'Brightening vitamin C face serum',
        description: 'Potent vitamin C serum with hyaluronic acid for bright, even-toned, hydrated skin.',
        category: 'face-care',
        isBestseller: true,
        isNewArrival: true,
        basePrice: 899,
        compareAtPrice: 1499,
        tags: ['vitamin-c', 'brightening', 'serum']
      },
      {
        name: 'Complete Skincare Kit',
        shortDescription: 'Full skincare routine in one kit',
        description: 'Complete morning and night skincare routine with cleanser, toner, serum, and moisturizer.',
        category: 'combos-kits',
        isFeatured: true,
        basePrice: 1799,
        compareAtPrice: 2999,
        tags: ['kit', 'skincare', 'combo']
      }
    ],

    blogs: [
      {
        title: '10 Benefits of Aloe Vera for Skin',
        slug: '10-benefits-aloe-vera-skin',
        excerpt: 'Discover the amazing benefits of aloe vera for your skin health',
        content: '<p>Aloe vera has been used for centuries in Ayurveda...</p>',
        isFeatured: true,
        category: 'Skincare Tips'
      },
      {
        title: 'Understanding Ayurvedic Skin Types',
        slug: 'ayurvedic-skin-types-guide',
        excerpt: 'Learn about Vata, Pitta, and Kapha skin types',
        content: '<p>In Ayurveda, skin types are classified based on doshas...</p>',
        isFeatured: true,
        category: 'Ayurveda'
      },
      {
        title: 'Natural Hair Care Routine',
        slug: 'natural-hair-care-routine',
        excerpt: 'Build a chemical-free hair care regimen',
        content: '<p>Natural ingredients can transform your hair health...</p>',
        isFeatured: true,
        category: 'Hair Care'
      },
      {
        title: 'Benefits of Turmeric in Skincare',
        slug: 'turmeric-skincare-benefits',
        excerpt: 'Why turmeric is a skincare superstar',
        content: '<p>Turmeric has powerful anti-inflammatory properties...</p>',
        category: 'Ingredients'
      },
      {
        title: 'Morning Skincare Routine Guide',
        slug: 'morning-skincare-routine',
        excerpt: 'Start your day with glowing skin',
        content: '<p>A proper morning routine protects your skin all day...</p>',
        category: 'Skincare Tips'
      },
      {
        title: 'Essential Oils for Stress Relief',
        slug: 'essential-oils-stress-relief',
        excerpt: 'Aromatherapy for relaxation and calm',
        content: '<p>Essential oils can significantly reduce stress levels...</p>',
        category: 'Wellness'
      },
      {
        title: 'Seasonal Skincare Tips for Winter',
        slug: 'winter-skincare-tips',
        excerpt: 'Protect your skin in cold weather',
        content: '<p>Winter requires special attention to skin hydration...</p>',
        category: 'Seasonal Care'
      },
      {
        title: 'The Power of Neem in Acne Treatment',
        slug: 'neem-acne-treatment',
        excerpt: 'Natural solution for clear skin',
        content: '<p>Neem has antibacterial properties perfect for acne...</p>',
        category: 'Skincare Tips'
      }
    ],

    testimonials: [
      {
        name: 'Priya Sharma',
        rating: 5,
        text: 'The aloe vera gel is absolutely amazing! My skin feels so hydrated and fresh. Best purchase ever!',
        isApproved: true
      },
      {
        name: 'Rahul Kumar',
        rating: 5,
        text: 'Been using the neem face wash for 2 months. My acne has reduced significantly. Highly recommend!',
        isApproved: true
      },
      {
        name: 'Ananya Patel',
        rating: 4,
        text: 'Love the natural ingredients. The turmeric cream gives a nice glow. Will buy again!',
        isApproved: true
      },
      {
        name: 'Vikram Singh',
        rating: 5,
        text: 'The coconut hair oil is fantastic! My hair fall has stopped and hair feels stronger.',
        isApproved: true
      },
      {
        name: 'Meera Reddy',
        rating: 5,
        text: 'Excellent products! The skincare kit transformed my skin in just 3 weeks.',
        isApproved: true
      },
      {
        name: 'Arjun Verma',
        rating: 4,
        text: 'Good quality products with natural ingredients. Customer service is also very responsive.',
        isApproved: true
      }
    ],

    banners: [
      {
        title: 'Welcome to Natural Beauty',
        placement: 'hero',
        imageUrl: 'https://via.placeholder.com/1920x600/4CAF50/ffffff?text=Natural+Beauty',
        link: '/products',
        priority: 1
      },
      {
        title: 'Summer Sale - 30% Off',
        placement: 'hero',
        imageUrl: 'https://via.placeholder.com/1920x600/FF9800/ffffff?text=Summer+Sale',
        link: '/sale',
        priority: 2
      },
      {
        title: 'New Arrivals',
        placement: 'mid_page',
        imageUrl: 'https://via.placeholder.com/800x400/2196F3/ffffff?text=New+Arrivals',
        link: '/new-arrivals',
        priority: 1
      },
      {
        title: 'Ayurvedic Wellness',
        placement: 'mid_page',
        imageUrl: 'https://via.placeholder.com/800x400/9C27B0/ffffff?text=Ayurvedic+Wellness',
        link: '/wellness',
        priority: 2
      }
    ],

    pincodes: ['110001', '400001', '560001', '700001', '500001'],
    searchTerms: ['aloe', 'neem', 'face wash', 'hair oil', 'turmeric'],
    reviewData: {
      rating: 5,
      title: 'Great Product - Test Review',
      comment: 'This is an automated test review. The product quality is excellent and delivery was quick.',
      isVerifiedPurchase: false
    }
  },

  // Report Configuration
  report: {
    outputDir: 'test-scripts/reports',
    filename: `test-report-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.md`
  },

  // Performance Thresholds
  performance: {
    maxResponseTime: 3000, // 3 seconds
    warningResponseTime: 2000 // 2 seconds
  }
};

export default CONFIG;
