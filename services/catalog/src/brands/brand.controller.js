import Brand from "../../models/brand.model.js";
import { sendResponse } from "@shared/utils";
import { generateSlug, generateUniqueSlug } from "../../services/slug.service.js";
import { parsePagination, buildPaginationMeta } from "../../services/pagination.service.js";
import { buildFilterQuery, buildSortQuery } from "../../services/query.service.js";

/**
 * @route GET /api/brands
 * @description List all active brands (consumer)
 * @access Public
 *
 * @queryParams
 * - None required
 *
 * @responseBody Success (200)
 * {
 *   "message": "Brands fetched successfully",
 *   "data": {
 *     "brands": [
 *       { "_id": "...", "name": "Brand A", "slug": "brand-a", "logo": { "url": "...", "publicId": "..." } }
 *     ]
 *   },
 *   "error": null
 * }
 */
export const listBrands = async (req, res) => {
  console.log("> GET /api/brands");

  try {
    const brands = await Brand.find({ isActive: true, deletedAt: null })
      .select("name slug logo")
      .sort({ name: 1 })
      .lean();

    console.log(`> Found ${brands.length} brands`);
    return sendResponse(res, 200, "Brands fetched successfully", { brands }, null);
  } catch (error) {
    console.log("> Error fetching brands:", error.message);
    return sendResponse(res, 500, "Failed to fetch brands", null, error.message);
  }
};

/**
 * @route GET /api/brands/:slug
 * @description Get brand by slug (consumer)
 * @access Public
 *
 * @params
 * - slug: Brand slug
 *
 * @responseBody Success (200)
 * {
 *   "message": "Brand fetched successfully",
 *   "data": {
 *     "brand": { "_id": "...", "name": "Brand A", "slug": "brand-a", "description": "...", "logo": {...} }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Brand not found", "data": null, "error": "Brand with slug 'xyz' not found" }
 */
export const getBrandBySlug = async (req, res) => {
  const { slug } = req.params;
  console.log(`> GET /api/brands/${slug}`);

  try {
    const brand = await Brand.findOne({ slug, isActive: true, deletedAt: null })
      .select("name slug description logo")
      .lean();

    if (!brand) {
      console.log(`> Brand not found: ${slug}`);
      return sendResponse(res, 404, "Brand not found", null, `Brand with slug '${slug}' not found`);
    }

    console.log(`> Brand found: ${brand.name}`);
    return sendResponse(res, 200, "Brand fetched successfully", { brand }, null);
  } catch (error) {
    console.log("> Error fetching brand:", error.message);
    return sendResponse(res, 500, "Failed to fetch brand", null, error.message);
  }
};

/**
 * @route GET /api/admin/brands
 * @description List all brands with filters and pagination (admin)
 * @access Admin
 *
 * @queryParams
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - search: Search by name
 * - isActive: Filter by active status (true/false)
 * - sortBy: Sort field (name, createdAt)
 * - order: Sort order (asc, desc)
 *
 * @responseBody Success (200)
 * {
 *   "message": "Brands fetched successfully",
 *   "data": {
 *     "brands": [...],
 *     "pagination": { "total": 50, "page": 1, "limit": 20, "totalPages": 3, "hasNextPage": true, "hasPrevPage": false }
 *   },
 *   "error": null
 * }
 */
export const listAllBrands = async (req, res) => {
  console.log("> GET /api/admin/brands");
  console.log("> Query:", req.query);

  try {
    const { page, limit, skip } = parsePagination(req.query);

    const filter = { deletedAt: null };

    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === "true";
    }

    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: "i" };
    }

    const sortOptions = buildSortQuery(
      req.query,
      { name: "name", createdAt: "createdAt" },
      "createdAt",
      "desc"
    );

    const [brands, total] = await Promise.all([
      Brand.find(filter).sort(sortOptions).skip(skip).limit(limit).lean(),
      Brand.countDocuments(filter),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    console.log(`> Found ${brands.length} of ${total} brands`);
    return sendResponse(res, 200, "Brands fetched successfully", { brands, pagination }, null);
  } catch (error) {
    console.log("> Error fetching brands:", error.message);
    return sendResponse(res, 500, "Failed to fetch brands", null, error.message);
  }
};

/**
 * @route POST /api/admin/brands
 * @description Create a new brand (admin)
 * @access Admin
 *
 * @requestBody
 * {
 *   "name": "Brand Name",
 *   "description": "Brand description",
 *   "logo": { "url": "https://...", "publicId": "brands/abc123" },
 *   "isActive": true
 * }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Brand created successfully",
 *   "data": { "brand": { "_id": "...", "name": "Brand Name", "slug": "brand-name", ... } },
 *   "error": null
 * }
 *
 * @responseBody Error (409)
 * { "message": "Brand already exists", "data": null, "error": "A brand with name 'Brand Name' already exists" }
 */
export const createBrand = async (req, res) => {
  console.log("> POST /api/admin/brands");
  console.log("> Body:", req.body);

  try {
    const { name, description, logo, isActive } = req.body;

    const existingBrand = await Brand.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
      deletedAt: null,
    });

    if (existingBrand) {
      console.log(`> Brand already exists: ${name}`);
      return sendResponse(res, 409, "Brand already exists", null, `A brand with name '${name}' already exists`);
    }

    const baseSlug = generateSlug(name);
    const slug = await generateUniqueSlug(baseSlug, Brand);

    const brand = new Brand({
      name,
      slug,
      description: description || null,
      logo: logo || { url: null, publicId: null },
      isActive: isActive !== undefined ? isActive : true,
    });

    await brand.save();

    console.log(`> Brand created: ${brand.name} (${brand._id})`);
    return sendResponse(res, 201, "Brand created successfully", { brand }, null);
  } catch (error) {
    console.log("> Error creating brand:", error.message);
    return sendResponse(res, 500, "Failed to create brand", null, error.message);
  }
};

/**
 * @route GET /api/admin/brands/:id
 * @description Get brand by ID (admin)
 * @access Admin
 *
 * @params
 * - id: Brand ObjectId
 *
 * @responseBody Success (200)
 * {
 *   "message": "Brand fetched successfully",
 *   "data": { "brand": { "_id": "...", "name": "...", ... } },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Brand not found", "data": null, "error": "Brand with ID '...' not found" }
 */
export const getBrandById = async (req, res) => {
  const { id } = req.params;
  console.log(`> GET /api/admin/brands/${id}`);

  try {
    const brand = await Brand.findOne({ _id: id, deletedAt: null }).lean();

    if (!brand) {
      console.log(`> Brand not found: ${id}`);
      return sendResponse(res, 404, "Brand not found", null, `Brand with ID '${id}' not found`);
    }

    console.log(`> Brand found: ${brand.name}`);
    return sendResponse(res, 200, "Brand fetched successfully", { brand }, null);
  } catch (error) {
    console.log("> Error fetching brand:", error.message);
    return sendResponse(res, 500, "Failed to fetch brand", null, error.message);
  }
};

/**
 * @route PUT /api/admin/brands/:id
 * @description Update brand (admin)
 * @access Admin
 *
 * @params
 * - id: Brand ObjectId
 *
 * @requestBody
 * {
 *   "name": "Updated Brand Name",
 *   "description": "Updated description",
 *   "logo": { "url": "https://...", "publicId": "..." },
 *   "isActive": true
 * }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Brand updated successfully",
 *   "data": { "brand": { "_id": "...", "name": "Updated Brand Name", ... } },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Brand not found", "data": null, "error": "Brand with ID '...' not found" }
 *
 * @responseBody Error (409)
 * { "message": "Brand name already exists", "data": null, "error": "A brand with name '...' already exists" }
 */
export const updateBrand = async (req, res) => {
  const { id } = req.params;
  console.log(`> PUT /api/admin/brands/${id}`);
  console.log("> Body:", req.body);

  try {
    const brand = await Brand.findOne({ _id: id, deletedAt: null });

    if (!brand) {
      console.log(`> Brand not found: ${id}`);
      return sendResponse(res, 404, "Brand not found", null, `Brand with ID '${id}' not found`);
    }

    const { name, description, logo, isActive } = req.body;

    if (name && name !== brand.name) {
      const existingBrand = await Brand.findOne({
        name: { $regex: `^${name}$`, $options: "i" },
        _id: { $ne: id },
        deletedAt: null,
      });

      if (existingBrand) {
        console.log(`> Brand name already exists: ${name}`);
        return sendResponse(res, 409, "Brand name already exists", null, `A brand with name '${name}' already exists`);
      }

      brand.name = name;
      brand.slug = await generateUniqueSlug(generateSlug(name), Brand, id);
    }

    if (description !== undefined) brand.description = description;
    if (logo !== undefined) brand.logo = logo;
    if (isActive !== undefined) brand.isActive = isActive;

    await brand.save();

    console.log(`> Brand updated: ${brand.name}`);
    return sendResponse(res, 200, "Brand updated successfully", { brand }, null);
  } catch (error) {
    console.log("> Error updating brand:", error.message);
    return sendResponse(res, 500, "Failed to update brand", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/brands/:id/status
 * @description Toggle brand active status (admin)
 * @access Admin
 *
 * @params
 * - id: Brand ObjectId
 *
 * @requestBody
 * { "isActive": true }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Brand status updated successfully",
 *   "data": { "brand": { "_id": "...", "isActive": true, ... } },
 *   "error": null
 * }
 */
export const toggleBrandStatus = async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  console.log(`> PATCH /api/admin/brands/${id}/status`);
  console.log("> Body:", req.body);

  try {
    const brand = await Brand.findOne({ _id: id, deletedAt: null });

    if (!brand) {
      console.log(`> Brand not found: ${id}`);
      return sendResponse(res, 404, "Brand not found", null, `Brand with ID '${id}' not found`);
    }

    brand.isActive = isActive;
    await brand.save();

    console.log(`> Brand status updated: ${brand.name} -> isActive: ${isActive}`);
    return sendResponse(res, 200, "Brand status updated successfully", { brand }, null);
  } catch (error) {
    console.log("> Error updating brand status:", error.message);
    return sendResponse(res, 500, "Failed to update brand status", null, error.message);
  }
};

/**
 * @route DELETE /api/admin/brands/:id
 * @description Soft delete brand (admin)
 * @access Admin
 *
 * @params
 * - id: Brand ObjectId
 *
 * @responseBody Success (200)
 * {
 *   "message": "Brand deleted successfully",
 *   "data": { "brand": { "_id": "...", "name": "...", "deletedAt": "2024-01-01T00:00:00Z" } },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Brand not found", "data": null, "error": "Brand with ID '...' not found" }
 */
export const deleteBrand = async (req, res) => {
  const { id } = req.params;
  console.log(`> DELETE /api/admin/brands/${id}`);

  try {
    const brand = await Brand.findOne({ _id: id, deletedAt: null });

    if (!brand) {
      console.log(`> Brand not found: ${id}`);
      return sendResponse(res, 404, "Brand not found", null, `Brand with ID '${id}' not found`);
    }

    brand.deletedAt = new Date();
    brand.isActive = false;
    await brand.save();

    console.log(`> Brand deleted: ${brand.name}`);
    return sendResponse(res, 200, "Brand deleted successfully", { brand }, null);
  } catch (error) {
    console.log("> Error deleting brand:", error.message);
    return sendResponse(res, 500, "Failed to delete brand", null, error.message);
  }
};

export default {
  listBrands,
  getBrandBySlug,
  listAllBrands,
  createBrand,
  getBrandById,
  updateBrand,
  toggleBrandStatus,
  deleteBrand,
};
