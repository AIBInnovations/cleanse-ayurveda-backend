import { ResilientHttpClient, TimeoutConfig } from "@shared/http-client";

// Initialize HTTP clients for CMS and Catalog services
const cmsClient = new ResilientHttpClient({
  serviceName: "cms",
  baseURL: process.env.CMS_SERVICE_URL || "http://localhost:3006",
  timeout: TimeoutConfig.STANDARD,
  serviceId: "gateway",
});

const catalogClient = new ResilientHttpClient({
  serviceName: "catalog",
  baseURL: process.env.CATALOG_SERVICE_URL || "http://localhost:3002",
  timeout: TimeoutConfig.STANDARD,
  serviceId: "gateway",
});

/**
 * Extract unique product IDs from sections
 */
const extractProductIds = (sections) => {
  const productIds = new Set();

  sections.forEach((section) => {
    const refData = section.reference_id;

    // Extract from bento_layout products
    if (refData?.bento_items?.products) {
      refData.bento_items.products.forEach((prod) => {
        if (prod.product_id) productIds.add(prod.product_id);
      });
    }

    // Extract from product_showcase
    if (refData?.showcase_product?.product_id) {
      productIds.add(refData.showcase_product.product_id);
    }
  });

  return Array.from(productIds);
};

/**
 * Fetch products by IDs from catalog service
 */
const fetchProductsByIds = async (productIds) => {
  if (!productIds || productIds.length === 0) {
    return [];
  }

  try {
    const response = await catalogClient.get("/api/products", {
      params: {
        ids: productIds.join(","),
        limit: productIds.length,
      },
    });

    return response.data?.data?.products || [];
  } catch (error) {
    console.log("Error fetching products by IDs:", error.message);
    return [];
  }
};

/**
 * Fetch products for featured_products sections
 */
const fetchFeaturedProducts = async (config) => {
  try {
    const params = {
      limit: config?.limit || 8,
    };

    // Add filter based on product_source
    if (config?.product_source === "featured") {
      params.isFeatured = true;
    } else if (config?.product_source === "bestseller") {
      params.isBestseller = true;
    } else if (config?.product_source === "new_arrival") {
      params.isNewArrival = true;
    } else if (config?.product_source === "collection" && config?.collection_id) {
      // Fetch products from a specific collection
      const response = await catalogClient.get(
        `/api/collections/${config.collection_id}/products`,
        { params: { limit: params.limit } }
      );
      return response.data?.data?.products || [];
    }

    const response = await catalogClient.get("/api/products", { params });
    return response.data?.data?.products || [];
  } catch (error) {
    console.log("Error fetching featured products:", error.message);
    return [];
  }
};

/**
 * Fetch collections
 */
const fetchCollections = async (collectionIds) => {
  if (!collectionIds || collectionIds.length === 0) {
    return [];
  }

  try {
    // Fetch multiple collections in parallel
    const collectionPromises = collectionIds.map((id) =>
      catalogClient
        .get(`/api/collections/${id}`)
        .then((res) => res.data?.data)
        .catch((err) => {
          console.log(`Error fetching collection ${id}:`, err.message);
          return null;
        })
    );

    const collections = await Promise.all(collectionPromises);
    return collections.filter((c) => c !== null);
  } catch (error) {
    console.log("Error fetching collections:", error.message);
    return [];
  }
};

/**
 * Enrich section with product data
 */
const enrichSectionWithProducts = (section, productsMap) => {
  if (!section.reference_id) return section;

  const refData = { ...section.reference_id };

  // Enrich bento_layout products
  if (refData.bento_items?.products) {
    refData.bento_items.products = refData.bento_items.products.map((prod) => {
      const productData = productsMap[prod.product_id];

      if (productData) {
        return {
          _id: productData._id,
          name: productData.name,
          slug: productData.slug,
          shortDescription: productData.shortDescription,
          primaryImage: productData.primaryImage,
          pricing: productData.pricing,
          custom_image_url: prod.custom_image_url, // Keep custom override
          available: true,
        };
      }

      // Product not found or unavailable
      return {
        ...prod,
        available: false,
      };
    });
  }

  // Enrich product_showcase
  if (refData.showcase_product?.product_id) {
    const productData = productsMap[refData.showcase_product.product_id];

    if (productData) {
      refData.showcase_product = {
        ...refData.showcase_product,
        product: {
          _id: productData._id,
          name: productData.name,
          slug: productData.slug,
          description: productData.description,
          primaryImage: productData.primaryImage,
          pricing: productData.pricing,
          brand: productData.brand,
        },
        available: true,
      };
    } else {
      refData.showcase_product.available = false;
    }
  }

  return {
    ...section,
    reference_id: refData,
  };
};

/**
 * Fetch complete homepage data
 */
export const fetchHomepageData = async () => {
  try {
    console.log("> Fetching homepage layout from CMS");

    // Step 1: Fetch active layout from CMS
    const layoutResponse = await cmsClient.get("/api/homepage-layout");
    const layoutData = layoutResponse.data; // ResilientHttpClient already returns response.data

    if (!layoutData || !layoutData.sections || layoutData.sections.length === 0) {
      console.log("> No active layout or sections found");
      return {
        sections: [],
      };
    }

    const sections = layoutData.sections;

    console.log(`> Found ${sections.length} sections in layout`);

    // Step 2: Extract product IDs from custom sections
    const productIds = extractProductIds(sections);

    console.log(`> Extracted ${productIds.length} product IDs from sections`);

    // Step 3: Fetch all data in parallel
    const [referencedProducts, featuredProductsSets, collectionsSets] = await Promise.allSettled([
      // Fetch products referenced in sections
      productIds.length > 0 ? fetchProductsByIds(productIds) : Promise.resolve([]),

      // Fetch featured products for dynamic sections
      Promise.all(
        sections
          .filter((s) => s.section_source === "featured_products")
          .map((s) => fetchFeaturedProducts(s.config))
      ),

      // Fetch collections for collection sections
      Promise.all(
        sections
          .filter((s) => s.section_source === "collections" && s.config?.collection_ids)
          .map((s) => fetchCollections(s.config.collection_ids))
      ),
    ]);

    // Extract values from Promise.allSettled results
    const products = referencedProducts.status === "fulfilled" ? referencedProducts.value : [];
    const featuredProductsResults =
      featuredProductsSets.status === "fulfilled" ? featuredProductsSets.value : [];
    const collectionsResults =
      collectionsSets.status === "fulfilled" ? collectionsSets.value : [];

    // Create product lookup map
    const productsMap = {};
    products.forEach((p) => {
      productsMap[p._id] = p;
    });

    console.log(`> Fetched ${products.length} referenced products`);

    // Step 4: Transform sections for frontend
    let featuredProductsIndex = 0;
    let collectionsIndex = 0;

    const transformedSections = sections.map((section) => {
      // Base section structure
      const transformed = {
        type: section.section_source,
        sort_order: section.sort_order,
        config: section.config,
      };

      // Handle different section sources
      switch (section.section_source) {
        case "custom_section":
          // Enrich with product data
          const enriched = enrichSectionWithProducts(section, productsMap);
          transformed.data = enriched.reference_id;
          break;

        case "featured_products":
          transformed.data = {
            heading: section.config?.heading || "Featured Products",
            subheading: section.config?.subheading,
            layout_style: section.config?.layout_style || "grid",
            products: featuredProductsResults[featuredProductsIndex] || [],
          };
          featuredProductsIndex++;
          break;

        case "collections":
          transformed.data = {
            heading: section.config?.heading || "Shop by Collection",
            subheading: section.config?.subheading,
            layout_style: section.config?.layout_style || "grid",
            collections: collectionsResults[collectionsIndex] || [],
          };
          collectionsIndex++;
          break;

        case "banner":
        case "testimonials":
        case "reels":
          // These are already populated by CMS
          transformed.data = section.reference_id;
          break;

        default:
          transformed.data = section.reference_id || {};
      }

      return transformed;
    });

    // Sort by sort_order
    transformedSections.sort((a, b) => a.sort_order - b.sort_order);

    console.log(`> Homepage data aggregation complete: ${transformedSections.length} sections`);

    return {
      layout: layoutData.layout,
      sections: transformedSections,
    };
  } catch (error) {
    console.log("Error in fetchHomepageData:", error.message);
    console.log(error.stack);

    // Return partial data on error
    return {
      sections: [],
      error: error.message,
    };
  }
};

export default {
  fetchHomepageData,
};
