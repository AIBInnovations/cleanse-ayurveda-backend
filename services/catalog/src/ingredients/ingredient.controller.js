import Ingredient from "../../models/ingredient.model.js";
import { sendResponse } from "@shared/utils";
import { generateSlug, generateUniqueSlug } from "../../services/slug.service.js";
import { parsePagination, buildPaginationMeta } from "../../services/pagination.service.js";
import { buildSortQuery } from "../../services/query.service.js";

/**
 * @route GET /api/ingredients
 * @description List all active ingredients (consumer)
 * @access Public
 *
 * @queryParams
 * - None required
 *
 * @responseBody Success (200)
 * {
 *   "message": "Ingredients fetched successfully",
 *   "data": {
 *     "ingredients": [
 *       { "_id": "...", "name": "Aloe Vera", "slug": "aloe-vera", "benefits": ["Hydrating", "Soothing"], "image": { "url": "...", "publicId": "..." } }
 *     ]
 *   },
 *   "error": null
 * }
 */
export const listIngredients = async (req, res) => {
  console.log("> GET /api/ingredients");

  try {
    const ingredients = await Ingredient.find({ isActive: true, deletedAt: null })
      .select("name slug benefits image")
      .sort({ name: 1 })
      .lean();

    console.log(`> Found ${ingredients.length} ingredients`);
    return sendResponse(res, 200, "Ingredients fetched successfully", { ingredients }, null);
  } catch (error) {
    console.log("> Error fetching ingredients:", error.message);
    return sendResponse(res, 500, "Failed to fetch ingredients", null, error.message);
  }
};

/**
 * @route GET /api/ingredients/:slug
 * @description Get ingredient by slug (consumer)
 * @access Public
 *
 * @params
 * - slug: Ingredient slug
 *
 * @responseBody Success (200)
 * {
 *   "message": "Ingredient fetched successfully",
 *   "data": {
 *     "ingredient": { "_id": "...", "name": "Aloe Vera", "slug": "aloe-vera", "description": "...", "benefits": [...], "image": {...} }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Ingredient not found", "data": null, "error": "Ingredient with slug 'xyz' not found" }
 */
export const getIngredientBySlug = async (req, res) => {
  const { slug } = req.params;
  console.log(`> GET /api/ingredients/${slug}`);

  try {
    const ingredient = await Ingredient.findOne({ slug, isActive: true, deletedAt: null })
      .select("name slug description benefits image")
      .lean();

    if (!ingredient) {
      console.log(`> Ingredient not found: ${slug}`);
      return sendResponse(res, 404, "Ingredient not found", null, `Ingredient with slug '${slug}' not found`);
    }

    console.log(`> Ingredient found: ${ingredient.name}`);
    return sendResponse(res, 200, "Ingredient fetched successfully", { ingredient }, null);
  } catch (error) {
    console.log("> Error fetching ingredient:", error.message);
    return sendResponse(res, 500, "Failed to fetch ingredient", null, error.message);
  }
};

/**
 * @route GET /api/admin/ingredients
 * @description List all ingredients with filters and pagination (admin)
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
 *   "message": "Ingredients fetched successfully",
 *   "data": {
 *     "ingredients": [...],
 *     "pagination": { "total": 50, "page": 1, "limit": 20, "totalPages": 3, "hasNextPage": true, "hasPrevPage": false }
 *   },
 *   "error": null
 * }
 */
export const listAllIngredients = async (req, res) => {
  console.log("> GET /api/admin/ingredients");
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

    const [ingredients, total] = await Promise.all([
      Ingredient.find(filter).sort(sortOptions).skip(skip).limit(limit).lean(),
      Ingredient.countDocuments(filter),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    console.log(`> Found ${ingredients.length} of ${total} ingredients`);
    return sendResponse(res, 200, "Ingredients fetched successfully", { ingredients, pagination }, null);
  } catch (error) {
    console.log("> Error fetching ingredients:", error.message);
    return sendResponse(res, 500, "Failed to fetch ingredients", null, error.message);
  }
};

/**
 * @route POST /api/admin/ingredients
 * @description Create a new ingredient (admin)
 * @access Admin
 *
 * @requestBody
 * {
 *   "name": "Aloe Vera",
 *   "description": "A soothing plant extract",
 *   "benefits": ["Hydrating", "Soothing", "Anti-inflammatory"],
 *   "image": { "url": "https://...", "publicId": "ingredients/abc123" },
 *   "isActive": true
 * }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Ingredient created successfully",
 *   "data": { "ingredient": { "_id": "...", "name": "Aloe Vera", "slug": "aloe-vera", ... } },
 *   "error": null
 * }
 *
 * @responseBody Error (409)
 * { "message": "Ingredient already exists", "data": null, "error": "An ingredient with name 'Aloe Vera' already exists" }
 */
export const createIngredient = async (req, res) => {
  console.log("> POST /api/admin/ingredients");
  console.log("> Body:", req.body);

  try {
    const { name, description, benefits, image, isActive } = req.body;

    const existingIngredient = await Ingredient.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
      deletedAt: null,
    });

    if (existingIngredient) {
      console.log(`> Ingredient already exists: ${name}`);
      return sendResponse(res, 409, "Ingredient already exists", null, `An ingredient with name '${name}' already exists`);
    }

    const baseSlug = generateSlug(name);
    const slug = await generateUniqueSlug(baseSlug, Ingredient);

    const ingredient = new Ingredient({
      name,
      slug,
      description: description || null,
      benefits: benefits || [],
      image: image || { url: null, publicId: null },
      isActive: isActive !== undefined ? isActive : true,
    });

    await ingredient.save();

    console.log(`> Ingredient created: ${ingredient.name} (${ingredient._id})`);
    return sendResponse(res, 201, "Ingredient created successfully", { ingredient }, null);
  } catch (error) {
    console.log("> Error creating ingredient:", error.message);
    return sendResponse(res, 500, "Failed to create ingredient", null, error.message);
  }
};

/**
 * @route GET /api/admin/ingredients/:id
 * @description Get ingredient by ID (admin)
 * @access Admin
 *
 * @params
 * - id: Ingredient ObjectId
 *
 * @responseBody Success (200)
 * {
 *   "message": "Ingredient fetched successfully",
 *   "data": { "ingredient": { "_id": "...", "name": "...", ... } },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Ingredient not found", "data": null, "error": "Ingredient with ID '...' not found" }
 */
export const getIngredientById = async (req, res) => {
  const { id } = req.params;
  console.log(`> GET /api/admin/ingredients/${id}`);

  try {
    const ingredient = await Ingredient.findOne({ _id: id, deletedAt: null }).lean();

    if (!ingredient) {
      console.log(`> Ingredient not found: ${id}`);
      return sendResponse(res, 404, "Ingredient not found", null, `Ingredient with ID '${id}' not found`);
    }

    console.log(`> Ingredient found: ${ingredient.name}`);
    return sendResponse(res, 200, "Ingredient fetched successfully", { ingredient }, null);
  } catch (error) {
    console.log("> Error fetching ingredient:", error.message);
    return sendResponse(res, 500, "Failed to fetch ingredient", null, error.message);
  }
};

/**
 * @route PUT /api/admin/ingredients/:id
 * @description Update ingredient (admin)
 * @access Admin
 *
 * @params
 * - id: Ingredient ObjectId
 *
 * @requestBody
 * {
 *   "name": "Updated Ingredient Name",
 *   "description": "Updated description",
 *   "benefits": ["Benefit 1", "Benefit 2"],
 *   "image": { "url": "https://...", "publicId": "..." },
 *   "isActive": true
 * }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Ingredient updated successfully",
 *   "data": { "ingredient": { "_id": "...", "name": "Updated Ingredient Name", ... } },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Ingredient not found", "data": null, "error": "Ingredient with ID '...' not found" }
 *
 * @responseBody Error (409)
 * { "message": "Ingredient name already exists", "data": null, "error": "An ingredient with name '...' already exists" }
 */
export const updateIngredient = async (req, res) => {
  const { id } = req.params;
  console.log(`> PUT /api/admin/ingredients/${id}`);
  console.log("> Body:", req.body);

  try {
    const ingredient = await Ingredient.findOne({ _id: id, deletedAt: null });

    if (!ingredient) {
      console.log(`> Ingredient not found: ${id}`);
      return sendResponse(res, 404, "Ingredient not found", null, `Ingredient with ID '${id}' not found`);
    }

    const { name, description, benefits, image, isActive } = req.body;

    if (name && name !== ingredient.name) {
      const existingIngredient = await Ingredient.findOne({
        name: { $regex: `^${name}$`, $options: "i" },
        _id: { $ne: id },
        deletedAt: null,
      });

      if (existingIngredient) {
        console.log(`> Ingredient name already exists: ${name}`);
        return sendResponse(res, 409, "Ingredient name already exists", null, `An ingredient with name '${name}' already exists`);
      }

      ingredient.name = name;
      ingredient.slug = await generateUniqueSlug(generateSlug(name), Ingredient, id);
    }

    if (description !== undefined) ingredient.description = description;
    if (benefits !== undefined) ingredient.benefits = benefits;
    if (image !== undefined) ingredient.image = image;
    if (isActive !== undefined) ingredient.isActive = isActive;

    await ingredient.save();

    console.log(`> Ingredient updated: ${ingredient.name}`);
    return sendResponse(res, 200, "Ingredient updated successfully", { ingredient }, null);
  } catch (error) {
    console.log("> Error updating ingredient:", error.message);
    return sendResponse(res, 500, "Failed to update ingredient", null, error.message);
  }
};

/**
 * @route DELETE /api/admin/ingredients/:id
 * @description Soft delete ingredient (admin)
 * @access Admin
 *
 * @params
 * - id: Ingredient ObjectId
 *
 * @responseBody Success (200)
 * {
 *   "message": "Ingredient deleted successfully",
 *   "data": { "ingredient": { "_id": "...", "name": "...", "deletedAt": "2024-01-01T00:00:00Z" } },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Ingredient not found", "data": null, "error": "Ingredient with ID '...' not found" }
 */
export const deleteIngredient = async (req, res) => {
  const { id } = req.params;
  console.log(`> DELETE /api/admin/ingredients/${id}`);

  try {
    const ingredient = await Ingredient.findOne({ _id: id, deletedAt: null });

    if (!ingredient) {
      console.log(`> Ingredient not found: ${id}`);
      return sendResponse(res, 404, "Ingredient not found", null, `Ingredient with ID '${id}' not found`);
    }

    ingredient.deletedAt = new Date();
    ingredient.isActive = false;
    await ingredient.save();

    console.log(`> Ingredient deleted: ${ingredient.name}`);
    return sendResponse(res, 200, "Ingredient deleted successfully", { ingredient }, null);
  } catch (error) {
    console.log("> Error deleting ingredient:", error.message);
    return sendResponse(res, 500, "Failed to delete ingredient", null, error.message);
  }
};

export default {
  listIngredients,
  getIngredientBySlug,
  listAllIngredients,
  createIngredient,
  getIngredientById,
  updateIngredient,
  deleteIngredient,
};
