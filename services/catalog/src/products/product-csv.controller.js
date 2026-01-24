import Product from "../../models/product.model.js";
import Brand from "../../models/brand.model.js";
import { sendResponse } from "@shared/utils";
import { parseCSV, generateCSV, validateCSVData } from "../../services/csv.service.js";
import { generateSlug, generateUniqueSlug } from "../../services/slug.service.js";

/**
 * @route GET /api/admin/products/csv/template
 * @description Download CSV template for bulk product upload
 * @access Admin
 */
export const downloadCSVTemplate = async (req, res) => {
  console.log("> GET /api/admin/products/csv/template");

  try {
    // Define template headers with sample data
    const templateData = [
      {
        name: "Aloe Vera Face Wash",
        sku: "ALO-FW-001",
        description: "Natural aloe vera face wash for all skin types",
        shortDescription: "Gentle cleansing with aloe vera",
        benefits: "Cleanses|Hydrates|Soothes",
        howToUse: "Apply on wet face, massage gently, rinse with water",
        brandName: "BrandName",
        productType: "simple",
        status: "draft",
        isFeatured: "false",
        isBestseller: "false",
        isNewArrival: "true",
        tags: "face wash|aloe vera|natural",
        skinType: "oily|dry|combination",
        concerns: "acne|dryness",
        seoTitle: "Aloe Vera Face Wash - Natural Cleansing",
        seoDescription: "Discover our natural aloe vera face wash",
        seoKeywords: "face wash|aloe vera|natural skincare",
        hsnCode: "33049900"
      }
    ];

    const headers = [
      "name",
      "sku",
      "description",
      "shortDescription",
      "benefits",
      "howToUse",
      "brandName",
      "productType",
      "status",
      "isFeatured",
      "isBestseller",
      "isNewArrival",
      "tags",
      "skinType",
      "concerns",
      "seoTitle",
      "seoDescription",
      "seoKeywords",
      "hsnCode"
    ];

    const headerLabels = {
      name: "Product Name*",
      sku: "SKU*",
      description: "Description",
      shortDescription: "Short Description",
      benefits: "Benefits (pipe-separated)",
      howToUse: "How to Use",
      brandName: "Brand Name",
      productType: "Product Type (simple|variable|bundle)*",
      status: "Status (draft|active|archived)*",
      isFeatured: "Is Featured (true|false)",
      isBestseller: "Is Bestseller (true|false)",
      isNewArrival: "Is New Arrival (true|false)",
      tags: "Tags (pipe-separated)",
      skinType: "Skin Type (pipe-separated: oily|dry|combination|sensitive|normal)",
      concerns: "Concerns (pipe-separated)",
      seoTitle: "SEO Title",
      seoDescription: "SEO Description",
      seoKeywords: "SEO Keywords (pipe-separated)",
      hsnCode: "HSN Code"
    };

    const csvContent = generateCSV(templateData, { headers, headerLabels });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=product-upload-template.csv");
    return res.send(csvContent);
  } catch (error) {
    console.log("> Error generating CSV template:", error.message);
    return sendResponse(res, 500, "Failed to generate CSV template", null, error.message);
  }
};

/**
 * @route POST /api/admin/products/csv/upload
 * @description Upload and process CSV file for bulk product creation/update
 * @access Admin
 */
export const uploadProductsCSV = async (req, res) => {
  console.log("> POST /api/admin/products/csv/upload");

  try {
    // Check if file was uploaded
    if (!req.file) {
      return sendResponse(res, 400, "No file uploaded", null, "Please upload a CSV file");
    }

    // Validate file type
    if (req.file.mimetype !== "text/csv" && !req.file.originalname.endsWith(".csv")) {
      return sendResponse(res, 400, "Invalid file type", null, "Only CSV files are allowed");
    }

    console.log(`> Processing CSV file: ${req.file.originalname} (${req.file.size} bytes)`);

    // Parse CSV content
    const csvContent = req.file.buffer.toString("utf8");
    const { headers, data, errors: parseErrors } = parseCSV(csvContent, { hasHeader: true });

    if (parseErrors.length > 0) {
      console.log(`> CSV parsing errors: ${parseErrors.length}`);
      return sendResponse(
        res,
        400,
        "CSV parsing failed",
        { errors: parseErrors },
        "The CSV file contains formatting errors"
      );
    }

    if (data.length === 0) {
      return sendResponse(res, 400, "CSV is empty", null, "The CSV file contains no data rows");
    }

    console.log(`> Parsed ${data.length} rows from CSV`);

    // Validate CSV structure
    const schema = {
      required: ["Product Name*", "SKU*", "Product Type (simple|variable|bundle)*", "Status (draft|active|archived)*"],
      types: {
        "Product Name*": "string",
        "SKU*": "string"
      }
    };

    const { valid, invalid } = validateCSVData(data, schema);

    console.log(`> Validation: ${valid.length} valid, ${invalid.length} invalid`);

    // Process valid rows
    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const processingErrors = [];

    for (const row of valid) {
      try {
        const productData = await transformCSVRowToProduct(row);

        // Check if product exists by name or SKU
        const existingProduct = await Product.findOne({
          $or: [
            { name: { $regex: `^${productData.name}$`, $options: "i" } },
            { sku: { $regex: `^${productData.sku}$`, $options: "i" } }
          ],
          deletedAt: null
        });

        if (existingProduct) {
          // Update existing product
          console.log(`> Updating existing product: ${productData.name}`);

          Object.keys(productData).forEach((key) => {
            if (key !== "_id" && key !== "slug" && key !== "sku") {
              existingProduct[key] = productData[key];
            }
          });

          await existingProduct.save();
          updatedCount++;
        } else {
          // Create new product
          console.log(`> Creating new product: ${productData.name}`);

          const product = new Product(productData);
          await product.save();
          createdCount++;
        }
      } catch (error) {
        console.log(`> Error processing row: ${error.message}`);
        failedCount++;
        processingErrors.push({
          row: row["Product Name*"] || "Unknown",
          error: error.message
        });
      }
    }

    // Combine validation errors and processing errors
    const allErrors = [
      ...invalid.map((item) => ({
        row: item.row,
        data: item.data["Product Name*"] || "Unknown",
        errors: item.errors
      })),
      ...processingErrors
    ];

    console.log(`> CSV upload completed: ${createdCount} created, ${updatedCount} updated, ${failedCount + invalid.length} failed`);

    return sendResponse(
      res,
      200,
      "CSV upload completed",
      {
        summary: {
          total: data.length,
          created: createdCount,
          updated: updatedCount,
          failed: failedCount + invalid.length
        },
        errors: allErrors
      },
      null
    );
  } catch (error) {
    console.log("> Error processing CSV upload:", error.message);
    return sendResponse(res, 500, "Failed to process CSV upload", null, error.message);
  }
};

/**
 * @route GET /api/admin/products/csv/export
 * @description Export products to CSV file
 * @access Admin
 */
export const exportProductsCSV = async (req, res) => {
  console.log("> GET /api/admin/products/csv/export");

  try {
    const { status, brand, limit = 1000 } = req.query;

    // Build filter
    const filter = { deletedAt: null };

    if (status) {
      filter.status = status;
    }

    if (brand) {
      filter.brand = brand;
    }

    console.log(`> Exporting products with filter:`, filter);

    // Fetch products
    const products = await Product.find(filter)
      .populate("brand", "name")
      .limit(parseInt(limit))
      .lean();

    console.log(`> Found ${products.length} products to export`);

    if (products.length === 0) {
      return sendResponse(res, 404, "No products found", null, "No products match the export criteria");
    }

    // Transform to CSV format
    const csvData = products.map((product) => ({
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      description: product.description || "",
      shortDescription: product.shortDescription || "",
      benefits: (product.benefits || []).join("|"),
      howToUse: product.howToUse || "",
      brandName: product.brand?.name || "",
      productType: product.productType,
      status: product.status,
      isFeatured: product.isFeatured ? "true" : "false",
      isBestseller: product.isBestseller ? "true" : "false",
      isNewArrival: product.isNewArrival ? "true" : "false",
      tags: (product.tags || []).join("|"),
      skinType: (product.attributes?.skinType || []).join("|"),
      concerns: (product.attributes?.concerns || []).join("|"),
      seoTitle: product.seo?.title || "",
      seoDescription: product.seo?.description || "",
      seoKeywords: (product.seo?.keywords || []).join("|"),
      hsnCode: product.hsnCode || "",
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));

    const headers = [
      "name",
      "slug",
      "sku",
      "description",
      "shortDescription",
      "benefits",
      "howToUse",
      "brandName",
      "productType",
      "status",
      "isFeatured",
      "isBestseller",
      "isNewArrival",
      "tags",
      "skinType",
      "concerns",
      "seoTitle",
      "seoDescription",
      "seoKeywords",
      "hsnCode",
      "createdAt",
      "updatedAt"
    ];

    const csvContent = generateCSV(csvData, { headers });

    const filename = `products-export-${new Date().toISOString().split("T")[0]}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    return res.send(csvContent);
  } catch (error) {
    console.log("> Error exporting products:", error.message);
    return sendResponse(res, 500, "Failed to export products", null, error.message);
  }
};

/**
 * Helper function to transform CSV row to product data
 * @param {object} row - CSV row data
 * @returns {Promise<object>} - Product data object
 */
const transformCSVRowToProduct = async (row) => {
  const name = row["Product Name*"]?.trim();
  const sku = row["SKU*"]?.trim().toUpperCase();

  if (!name || !sku) {
    throw new Error("Product name and SKU are required");
  }

  // Generate slug
  const slug = await generateUniqueSlug(generateSlug(name), Product);

  // Find brand by name if provided
  let brandId = null;
  const brandName = row["Brand Name"]?.trim();
  if (brandName) {
    const brand = await Brand.findOne({
      name: { $regex: `^${brandName}$`, $options: "i" },
      deletedAt: null
    });
    if (brand) {
      brandId = brand._id;
    } else {
      console.log(`> Warning: Brand not found: ${brandName}`);
    }
  }

  // Parse arrays (pipe-separated values)
  const parsePipeSeparated = (value) => {
    if (!value) return [];
    return value.split("|").map((v) => v.trim()).filter((v) => v);
  };

  // Parse boolean
  const parseBoolean = (value) => {
    if (!value) return false;
    return ["true", "1", "yes"].includes(value.toLowerCase());
  };

  return {
    name,
    slug,
    sku,
    description: row["Description"]?.trim() || null,
    shortDescription: row["Short Description"]?.trim() || null,
    benefits: parsePipeSeparated(row["Benefits (pipe-separated)"]),
    howToUse: row["How to Use"]?.trim() || null,
    brand: brandId,
    productType: row["Product Type (simple|variable|bundle)*"]?.trim().toLowerCase() || "simple",
    status: row["Status (draft|active|archived)*"]?.trim().toLowerCase() || "draft",
    isFeatured: parseBoolean(row["Is Featured (true|false)"]),
    isBestseller: parseBoolean(row["Is Bestseller (true|false)"]),
    isNewArrival: parseBoolean(row["Is New Arrival (true|false)"]),
    tags: parsePipeSeparated(row["Tags (pipe-separated)"]),
    attributes: {
      skinType: parsePipeSeparated(row["Skin Type (pipe-separated: oily|dry|combination|sensitive|normal)"]),
      concerns: parsePipeSeparated(row["Concerns (pipe-separated)"])
    },
    seo: {
      title: row["SEO Title"]?.trim() || null,
      description: row["SEO Description"]?.trim() || null,
      keywords: parsePipeSeparated(row["SEO Keywords (pipe-separated)"])
    },
    hsnCode: row["HSN Code"]?.trim() || null
  };
};

export default {
  downloadCSVTemplate,
  uploadProductsCSV,
  exportProductsCSV
};
