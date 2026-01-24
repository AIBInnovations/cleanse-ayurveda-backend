/**
 * Seed data fixtures for testing
 * Run with: node tests/fixtures/seed-data.js
 *
 * This script creates sample data for manual testing
 */

import { api, generate, delay } from "../utils/test.utils.js";

/**
 * Sample brands
 */
const brands = [
  {
    name: "Himalaya Herbals",
    description: "Ayurvedic and herbal healthcare products",
    website: "https://himalayawellness.in",
    isActive: true,
  },
  {
    name: "Forest Essentials",
    description: "Luxury Ayurvedic skincare and wellness",
    website: "https://forestessentials.com",
    isActive: true,
  },
  {
    name: "Kama Ayurveda",
    description: "Traditional Ayurvedic beauty products",
    website: "https://kamaayurveda.com",
    isActive: true,
  },
  {
    name: "Biotique",
    description: "Botanically pure, organically correct formulas",
    website: "https://biotique.com",
    isActive: true,
  },
  {
    name: "Khadi Natural",
    description: "Herbal and natural personal care",
    website: "https://khadinatural.com",
    isActive: true,
  },
];

/**
 * Sample ingredients
 */
const ingredients = [
  {
    name: "Aloe Vera",
    description: "Soothing succulent plant extract",
    benefits: ["Moisturizing", "Healing", "Anti-inflammatory"],
    source: "Plant",
    isActive: true,
  },
  {
    name: "Neem",
    description: "Traditional antibacterial herb",
    benefits: ["Antibacterial", "Purifying", "Anti-acne"],
    source: "Tree",
    isActive: true,
  },
  {
    name: "Turmeric",
    description: "Golden healing spice",
    benefits: ["Brightening", "Anti-inflammatory", "Antioxidant"],
    source: "Root",
    isActive: true,
  },
  {
    name: "Sandalwood",
    description: "Aromatic cooling wood",
    benefits: ["Cooling", "Soothing", "Fragrance"],
    source: "Wood",
    isActive: true,
  },
  {
    name: "Rose",
    description: "Gentle floral extract",
    benefits: ["Hydrating", "Toning", "Calming"],
    source: "Flower",
    isActive: true,
  },
  {
    name: "Tea Tree",
    description: "Powerful antibacterial oil",
    benefits: ["Antibacterial", "Anti-fungal", "Acne-fighting"],
    source: "Leaf",
    isActive: true,
  },
  {
    name: "Coconut Oil",
    description: "Nourishing tropical oil",
    benefits: ["Deep moisturizing", "Hair nourishment", "Skin softening"],
    source: "Fruit",
    isActive: true,
  },
  {
    name: "Saffron",
    description: "Precious golden spice",
    benefits: ["Brightening", "Anti-aging", "Radiance"],
    source: "Flower",
    isActive: true,
  },
];

/**
 * Sample categories
 */
const categories = [
  {
    name: "Face Care",
    description: "Products for facial skincare",
    isActive: true,
    children: [
      { name: "Face Wash", description: "Facial cleansers", isActive: true },
      { name: "Face Cream", description: "Facial moisturizers", isActive: true },
      { name: "Face Serum", description: "Concentrated treatments", isActive: true },
      { name: "Face Mask", description: "Deep treatments", isActive: true },
    ],
  },
  {
    name: "Hair Care",
    description: "Products for hair health",
    isActive: true,
    children: [
      { name: "Shampoo", description: "Hair cleansers", isActive: true },
      { name: "Conditioner", description: "Hair conditioning", isActive: true },
      { name: "Hair Oil", description: "Nourishing oils", isActive: true },
    ],
  },
  {
    name: "Body Care",
    description: "Products for body skincare",
    isActive: true,
    children: [
      { name: "Body Lotion", description: "Body moisturizers", isActive: true },
      { name: "Body Wash", description: "Body cleansers", isActive: true },
      { name: "Body Scrub", description: "Exfoliating products", isActive: true },
    ],
  },
  {
    name: "Lip Care",
    description: "Products for lip care",
    isActive: true,
  },
  {
    name: "Men's Care",
    description: "Products for men",
    isActive: true,
  },
];

/**
 * Sample products (will be linked to brands and categories)
 */
const products = [
  {
    name: "Aloe Vera Face Wash",
    shortDescription: "Gentle cleansing with aloe vera",
    description:
      "A refreshing face wash infused with pure aloe vera extract. Gently cleanses while keeping skin hydrated and supple. Suitable for all skin types.",
    productType: "simple",
    status: "active",
    tags: ["bestseller", "gentle", "daily-use"],
    skinType: ["normal", "dry", "sensitive"],
    isFeatured: true,
    variants: [
      {
        name: "100ml",
        sku: "ALO-FW-100",
        mrp: 299,
        salePrice: 249,
        costPrice: 120,
        stockQuantity: 500,
        weight: 120,
        isActive: true,
        isDefault: true,
      },
      {
        name: "200ml",
        sku: "ALO-FW-200",
        mrp: 499,
        salePrice: 449,
        costPrice: 200,
        stockQuantity: 300,
        weight: 220,
        isActive: true,
        isDefault: false,
      },
    ],
  },
  {
    name: "Neem Purifying Cream",
    shortDescription: "Anti-acne neem cream",
    description:
      "A powerful anti-acne cream enriched with neem and turmeric. Controls excess oil and prevents breakouts. Perfect for oily and acne-prone skin.",
    productType: "simple",
    status: "active",
    tags: ["anti-acne", "oil-control", "purifying"],
    skinType: ["oily", "combination"],
    isFeatured: false,
    variants: [
      {
        name: "50g",
        sku: "NEEM-CR-50",
        mrp: 399,
        salePrice: 349,
        costPrice: 150,
        stockQuantity: 400,
        weight: 60,
        isActive: true,
        isDefault: true,
      },
    ],
  },
  {
    name: "Turmeric Brightening Serum",
    shortDescription: "Radiance boosting serum",
    description:
      "A luxurious serum with pure turmeric and saffron extracts. Brightens skin, reduces dark spots, and gives a natural glow.",
    productType: "simple",
    status: "active",
    tags: ["brightening", "anti-aging", "luxury"],
    skinType: ["normal", "dry", "combination"],
    isFeatured: true,
    variants: [
      {
        name: "30ml",
        sku: "TUR-SR-30",
        mrp: 999,
        salePrice: 849,
        costPrice: 400,
        stockQuantity: 200,
        weight: 50,
        isActive: true,
        isDefault: true,
      },
    ],
  },
  {
    name: "Rose Water Toner",
    shortDescription: "Gentle rose toner",
    description:
      "Pure rose water toner for hydration and pore tightening. Refreshes and prepares skin for moisturizer. Alcohol-free formula.",
    productType: "simple",
    status: "active",
    tags: ["toner", "hydrating", "natural"],
    skinType: ["normal", "dry", "sensitive"],
    isFeatured: false,
    variants: [
      {
        name: "100ml",
        sku: "ROSE-TN-100",
        mrp: 249,
        salePrice: 199,
        costPrice: 80,
        stockQuantity: 600,
        weight: 110,
        isActive: true,
        isDefault: true,
      },
      {
        name: "200ml",
        sku: "ROSE-TN-200",
        mrp: 399,
        salePrice: 349,
        costPrice: 140,
        stockQuantity: 350,
        weight: 210,
        isActive: true,
        isDefault: false,
      },
    ],
  },
  {
    name: "Coconut Hair Oil",
    shortDescription: "Nourishing coconut oil",
    description:
      "Traditional coconut hair oil for deep nourishment. Strengthens hair roots, prevents breakage, and adds natural shine.",
    productType: "simple",
    status: "active",
    tags: ["hair-oil", "nourishing", "traditional"],
    skinType: [],
    isFeatured: false,
    variants: [
      {
        name: "100ml",
        sku: "COCO-HO-100",
        mrp: 199,
        salePrice: 179,
        costPrice: 70,
        stockQuantity: 800,
        weight: 120,
        isActive: true,
        isDefault: true,
      },
      {
        name: "200ml",
        sku: "COCO-HO-200",
        mrp: 349,
        salePrice: 299,
        costPrice: 120,
        stockQuantity: 500,
        weight: 220,
        isActive: true,
        isDefault: false,
      },
    ],
  },
];

/**
 * Sample synonyms for search
 */
const synonyms = [
  { term: "face wash", synonyms: ["facial cleanser", "face cleanser", "face cleaning"], isActive: true },
  { term: "moisturizer", synonyms: ["moisturiser", "hydrating cream", "face cream"], isActive: true },
  { term: "anti-aging", synonyms: ["anti-ageing", "anti aging", "age defying"], isActive: true },
  { term: "sunscreen", synonyms: ["sun block", "sun protection", "spf"], isActive: true },
  { term: "hair oil", synonyms: ["hair serum", "hair nourishment"], isActive: true },
];

/**
 * Seed the database
 */
const seed = async () => {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║          SEEDING CATALOG DATABASE                          ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("\n");

  const created = {
    brands: [],
    ingredients: [],
    categories: [],
    products: [],
    variants: [],
    synonyms: [],
  };

  try {
    // 1. Create brands
    console.log("\n--- Creating Brands ---");
    for (const brand of brands) {
      const res = await api.post("/admin/brands", brand);
      if (res.status === 201) {
        created.brands.push(res.data.data.brand);
        console.log(`  Created brand: ${brand.name}`);
      } else {
        console.log(`  Failed to create brand: ${brand.name}`);
      }
    }

    // 2. Create ingredients
    console.log("\n--- Creating Ingredients ---");
    for (const ingredient of ingredients) {
      const res = await api.post("/admin/ingredients", ingredient);
      if (res.status === 201) {
        created.ingredients.push(res.data.data.ingredient);
        console.log(`  Created ingredient: ${ingredient.name}`);
      } else {
        console.log(`  Failed to create ingredient: ${ingredient.name}`);
      }
    }

    // 3. Create categories (with hierarchy)
    console.log("\n--- Creating Categories ---");
    for (const category of categories) {
      const { children, ...parentData } = category;
      const parentRes = await api.post("/admin/categories", parentData);

      if (parentRes.status === 201) {
        const parent = parentRes.data.data.category;
        created.categories.push(parent);
        console.log(`  Created category: ${category.name}`);

        // Create children
        if (children && children.length > 0) {
          for (const child of children) {
            const childRes = await api.post("/admin/categories", {
              ...child,
              parent: parent._id,
            });
            if (childRes.status === 201) {
              created.categories.push(childRes.data.data.category);
              console.log(`    Created sub-category: ${child.name}`);
            }
          }
        }
      }
    }

    // 4. Create products with variants
    console.log("\n--- Creating Products ---");
    const brandIds = created.brands.map((b) => b._id);
    const categoryIds = created.categories.filter((c) => !c.parent).map((c) => c._id);

    for (let i = 0; i < products.length; i++) {
      const { variants, ...productData } = products[i];

      // Assign a random brand
      productData.brand = brandIds[i % brandIds.length];

      const productRes = await api.post("/admin/products", productData);

      if (productRes.status === 201) {
        const product = productRes.data.data.product;
        created.products.push(product);
        console.log(`  Created product: ${productData.name}`);

        // Create variants
        for (const variant of variants) {
          const variantRes = await api.post(`/admin/products/${product._id}/variants`, variant);
          if (variantRes.status === 201) {
            created.variants.push(variantRes.data.data.variant);
            console.log(`    Created variant: ${variant.name} (${variant.sku})`);
          }
        }

        // Assign to a random category
        const categoryId = categoryIds[i % categoryIds.length];
        await api.post(`/admin/products/${product._id}/categories`, {
          categories: [categoryId],
        });

        // Assign random ingredients
        const randomIngredients = created.ingredients
          .slice(0, Math.floor(Math.random() * 3) + 2)
          .map((ing) => ing._id);
        await api.post(`/admin/products/${product._id}/ingredients`, {
          ingredients: randomIngredients,
        });
      }
    }

    // 5. Create synonyms
    console.log("\n--- Creating Search Synonyms ---");
    for (const synonym of synonyms) {
      const res = await api.post("/admin/search/synonyms", synonym);
      if (res.status === 201) {
        created.synonyms.push(res.data.data.synonym);
        console.log(`  Created synonym: ${synonym.term}`);
      }
    }

    // Summary
    console.log("\n");
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║                    SEEDING COMPLETE                        ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    console.log(`\n  Brands:      ${created.brands.length}`);
    console.log(`  Ingredients: ${created.ingredients.length}`);
    console.log(`  Categories:  ${created.categories.length}`);
    console.log(`  Products:    ${created.products.length}`);
    console.log(`  Variants:    ${created.variants.length}`);
    console.log(`  Synonyms:    ${created.synonyms.length}`);
    console.log("\n");

    return created;
  } catch (error) {
    console.log("Seeding error:", error.message);
    throw error;
  }
};

// Run if executed directly
seed();

export default seed;
