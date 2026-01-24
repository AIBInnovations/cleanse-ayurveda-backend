import Category from "../../models/category.model.js";
import Product from "../../models/product.model.js";
import ProductCategory from "../../models/product-category.model.js";
import { sendResponse } from "@shared/utils";
import { generateSlug, generateUniqueSlug } from "../../services/slug.service.js";
import { parsePagination, buildPaginationMeta } from "../../services/pagination.service.js";
import { buildSortQuery } from "../../services/query.service.js";

/**
 * Build category tree from flat list
 * @param {Array} categories - Flat list of categories
 * @param {string|null} parentId - Parent ID to filter by
 * @returns {Array} Tree structure
 */
const buildCategoryTree = (categories, parentId = null) => {
  return categories
    .filter((cat) => {
      const catParent = cat.parent ? cat.parent.toString() : null;
      return catParent === parentId;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((cat) => ({
      ...cat,
      children: buildCategoryTree(categories, cat._id.toString()),
    }));
};

/**
 * Compute level and path for a category
 * @param {string|null} parentId - Parent category ID
 * @param {string} slug - Category slug
 * @returns {Object} { level, path }
 */
const computeLevelAndPath = async (parentId, slug) => {
  if (!parentId) {
    return { level: 0, path: slug };
  }

  const parent = await Category.findOne({ _id: parentId, deletedAt: null }).lean();
  if (!parent) {
    return { level: 0, path: slug };
  }

  return {
    level: parent.level + 1,
    path: `${parent.path}/${slug}`,
  };
};

/**
 * Update paths for all descendant categories
 * @param {string} categoryId - Category ID
 * @param {string} oldPath - Old path
 * @param {string} newPath - New path
 */
const updateDescendantPaths = async (categoryId, oldPath, newPath) => {
  const descendants = await Category.find({
    path: { $regex: `^${oldPath}/` },
    deletedAt: null,
  });

  for (const desc of descendants) {
    desc.path = desc.path.replace(oldPath, newPath);
    await desc.save();
  }
};

/**
 * @route GET /api/categories
 * @description Get category tree for menu (consumer)
 * @access Public
 *
 * @responseBody Success (200)
 * {
 *   "message": "Categories fetched successfully",
 *   "data": {
 *     "categories": [
 *       {
 *         "_id": "...",
 *         "name": "Skincare",
 *         "slug": "skincare",
 *         "image": { "url": "...", "publicId": "..." },
 *         "children": [
 *           { "_id": "...", "name": "Face Wash", "slug": "face-wash", "children": [] }
 *         ]
 *       }
 *     ]
 *   },
 *   "error": null
 * }
 */
export const getCategoryTree = async (req, res) => {
  console.log("> GET /api/categories");

  try {
    const categories = await Category.find({
      isActive: true,
      deletedAt: null,
      showInMenu: true,
    })
      .select("name slug image parent sortOrder level")
      .lean();

    const tree = buildCategoryTree(categories, null);

    console.log(`> Found ${categories.length} categories, built tree`);
    return sendResponse(res, 200, "Categories fetched successfully", { categories: tree }, null);
  } catch (error) {
    console.log("> Error fetching categories:", error.message);
    return sendResponse(res, 500, "Failed to fetch categories", null, error.message);
  }
};

/**
 * @route GET /api/categories/:slug
 * @description Get category by slug with subcategories (consumer)
 * @access Public
 *
 * @params
 * - slug: Category slug
 *
 * @responseBody Success (200)
 * {
 *   "message": "Category fetched successfully",
 *   "data": {
 *     "category": {
 *       "_id": "...",
 *       "name": "Skincare",
 *       "slug": "skincare",
 *       "description": "...",
 *       "image": { "url": "...", "publicId": "..." },
 *       "banner": { "url": "...", "publicId": "..." },
 *       "seo": { "title": "...", "description": "...", "keywords": [] },
 *       "subcategories": [...]
 *     }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Category not found", "data": null, "error": "Category with slug 'xyz' not found" }
 */
export const getCategoryBySlug = async (req, res) => {
  const { slug } = req.params;
  console.log(`> GET /api/categories/${slug}`);

  try {
    const category = await Category.findOne({
      slug,
      isActive: true,
      deletedAt: null,
    })
      .select("name slug description image banner seo")
      .lean();

    if (!category) {
      console.log(`> Category not found: ${slug}`);
      return sendResponse(res, 404, "Category not found", null, `Category with slug '${slug}' not found`);
    }

    const subcategories = await Category.find({
      parent: category._id,
      isActive: true,
      deletedAt: null,
      showInMenu: true,
    })
      .select("name slug image sortOrder")
      .sort({ sortOrder: 1 })
      .lean();

    console.log(`> Category found: ${category.name}, subcategories: ${subcategories.length}`);
    return sendResponse(res, 200, "Category fetched successfully", {
      category: { ...category, subcategories },
    }, null);
  } catch (error) {
    console.log("> Error fetching category:", error.message);
    return sendResponse(res, 500, "Failed to fetch category", null, error.message);
  }
};

/**
 * @route GET /api/categories/:slug/products
 * @description Get products in category (consumer)
 * @access Public
 *
 * @params
 * - slug: Category slug
 *
 * @queryParams
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 50)
 * - sortBy: Sort field (name, createdAt, price)
 * - order: Sort order (asc, desc)
 * - includeSubcategories: Include products from subcategories (default: true)
 *
 * @responseBody Success (200)
 * {
 *   "message": "Products fetched successfully",
 *   "data": {
 *     "category": { "_id": "...", "name": "Skincare", "slug": "skincare" },
 *     "products": [...],
 *     "pagination": { "total": 50, "page": 1, "limit": 20, "totalPages": 3, "hasNextPage": true, "hasPrevPage": false }
 *   },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Category not found", "data": null, "error": "Category with slug 'xyz' not found" }
 */
export const getCategoryProducts = async (req, res) => {
  const { slug } = req.params;
  console.log(`> GET /api/categories/${slug}/products`);
  console.log("> Query:", req.query);

  try {
    const category = await Category.findOne({
      slug,
      isActive: true,
      deletedAt: null,
    })
      .select("_id name slug path")
      .lean();

    if (!category) {
      console.log(`> Category not found: ${slug}`);
      return sendResponse(res, 404, "Category not found", null, `Category with slug '${slug}' not found`);
    }

    const { page, limit, skip } = parsePagination(req.query);
    const includeSubcategories = req.query.includeSubcategories !== "false";

    let categoryIds = [category._id];

    if (includeSubcategories) {
      const subcategories = await Category.find({
        path: { $regex: `^${category.path}/` },
        isActive: true,
        deletedAt: null,
      })
        .select("_id")
        .lean();
      categoryIds = categoryIds.concat(subcategories.map((c) => c._id));
    }

    const productCategories = await ProductCategory.find({
      category: { $in: categoryIds },
    })
      .select("product")
      .lean();

    const productIds = [...new Set(productCategories.map((pc) => pc.product.toString()))];

    const productFilter = {
      _id: { $in: productIds },
      status: "active",
      deletedAt: null,
    };

    const sortOptions = buildSortQuery(
      req.query,
      { name: "name", createdAt: "createdAt" },
      "createdAt",
      "desc"
    );

    const [products, total] = await Promise.all([
      Product.find(productFilter)
        .select("name slug shortDescription tags isFeatured isBestseller isNewArrival brand")
        .populate("brand", "name slug")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(productFilter),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    console.log(`> Found ${products.length} of ${total} products in category ${category.name}`);
    return sendResponse(res, 200, "Products fetched successfully", {
      category: { _id: category._id, name: category.name, slug: category.slug },
      products,
      pagination,
    }, null);
  } catch (error) {
    console.log("> Error fetching category products:", error.message);
    return sendResponse(res, 500, "Failed to fetch products", null, error.message);
  }
};

/**
 * @route GET /api/admin/categories
 * @description List all categories with filters (admin)
 * @access Admin
 *
 * @queryParams
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - search: Search by name
 * - isActive: Filter by active status (true/false)
 * - showInMenu: Filter by menu visibility (true/false)
 * - parent: Filter by parent ID (use "null" for root categories)
 * - level: Filter by level
 * - sortBy: Sort field (name, createdAt, sortOrder)
 * - order: Sort order (asc, desc)
 * - flat: Return flat list instead of tree (default: false)
 *
 * @responseBody Success (200) - Tree mode
 * {
 *   "message": "Categories fetched successfully",
 *   "data": {
 *     "categories": [{ "_id": "...", "name": "...", "children": [...] }]
 *   },
 *   "error": null
 * }
 *
 * @responseBody Success (200) - Flat mode
 * {
 *   "message": "Categories fetched successfully",
 *   "data": {
 *     "categories": [...],
 *     "pagination": { "total": 50, "page": 1, "limit": 20, "totalPages": 3, "hasNextPage": true, "hasPrevPage": false }
 *   },
 *   "error": null
 * }
 */
export const listAllCategories = async (req, res) => {
  console.log("> GET /api/admin/categories");
  console.log("> Query:", req.query);

  try {
    const flat = req.query.flat === "true";
    const filter = { deletedAt: null };

    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === "true";
    }

    if (req.query.showInMenu !== undefined) {
      filter.showInMenu = req.query.showInMenu === "true";
    }

    if (req.query.parent !== undefined) {
      filter.parent = req.query.parent === "null" ? null : req.query.parent;
    }

    if (req.query.level !== undefined) {
      filter.level = parseInt(req.query.level, 10);
    }

    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: "i" };
    }

    if (flat) {
      const { page, limit, skip } = parsePagination(req.query);

      const sortOptions = buildSortQuery(
        req.query,
        { name: "name", createdAt: "createdAt", sortOrder: "sortOrder" },
        "sortOrder",
        "asc"
      );

      const [categories, total] = await Promise.all([
        Category.find(filter)
          .populate("parent", "name slug")
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean(),
        Category.countDocuments(filter),
      ]);

      const pagination = buildPaginationMeta(total, page, limit);

      console.log(`> Found ${categories.length} of ${total} categories (flat)`);
      return sendResponse(res, 200, "Categories fetched successfully", { categories, pagination }, null);
    }

    const categories = await Category.find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    const tree = buildCategoryTree(categories, null);

    console.log(`> Found ${categories.length} categories, built tree`);
    return sendResponse(res, 200, "Categories fetched successfully", { categories: tree }, null);
  } catch (error) {
    console.log("> Error fetching categories:", error.message);
    return sendResponse(res, 500, "Failed to fetch categories", null, error.message);
  }
};

/**
 * @route POST /api/admin/categories
 * @description Create a new category (admin)
 * @access Admin
 *
 * @requestBody
 * {
 *   "name": "Skincare",
 *   "description": "All skincare products",
 *   "parent": "507f1f77bcf86cd799439011",
 *   "image": { "url": "https://...", "publicId": "categories/abc123" },
 *   "banner": { "url": "https://...", "publicId": "categories/banner123" },
 *   "seo": { "title": "Skincare Products", "description": "...", "keywords": ["skincare"] },
 *   "showInMenu": true,
 *   "sortOrder": 1,
 *   "isActive": true
 * }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Category created successfully",
 *   "data": { "category": { "_id": "...", "name": "Skincare", "slug": "skincare", ... } },
 *   "error": null
 * }
 *
 * @responseBody Error (409)
 * { "message": "Category already exists", "data": null, "error": "A category with name 'Skincare' already exists" }
 *
 * @responseBody Error (404)
 * { "message": "Parent category not found", "data": null, "error": "Parent category with ID '...' not found" }
 */
export const createCategory = async (req, res) => {
  console.log("> POST /api/admin/categories");
  console.log("> Body:", req.body);

  try {
    const { name, description, parent, image, banner, seo, showInMenu, sortOrder, isActive } = req.body;

    const existingCategory = await Category.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
      deletedAt: null,
    });

    if (existingCategory) {
      console.log(`> Category already exists: ${name}`);
      return sendResponse(res, 409, "Category already exists", null, `A category with name '${name}' already exists`);
    }

    if (parent) {
      const parentCategory = await Category.findOne({ _id: parent, deletedAt: null });
      if (!parentCategory) {
        console.log(`> Parent category not found: ${parent}`);
        return sendResponse(res, 404, "Parent category not found", null, `Parent category with ID '${parent}' not found`);
      }
    }

    const baseSlug = generateSlug(name);
    const slug = await generateUniqueSlug(baseSlug, Category);
    const { level, path } = await computeLevelAndPath(parent, slug);

    const category = new Category({
      name,
      slug,
      description: description || null,
      parent: parent || null,
      level,
      path,
      image: image || { url: null, publicId: null },
      banner: banner || { url: null, publicId: null },
      seo: seo || { title: null, description: null, keywords: [] },
      showInMenu: showInMenu !== undefined ? showInMenu : true,
      sortOrder: sortOrder !== undefined ? sortOrder : 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    await category.save();

    console.log(`> Category created: ${category.name} (${category._id})`);
    return sendResponse(res, 201, "Category created successfully", { category }, null);
  } catch (error) {
    console.log("> Error creating category:", error.message);
    return sendResponse(res, 500, "Failed to create category", null, error.message);
  }
};

/**
 * @route GET /api/admin/categories/:id
 * @description Get category by ID (admin)
 * @access Admin
 *
 * @params
 * - id: Category ObjectId
 *
 * @responseBody Success (200)
 * {
 *   "message": "Category fetched successfully",
 *   "data": { "category": { "_id": "...", "name": "...", ... } },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Category not found", "data": null, "error": "Category with ID '...' not found" }
 */
export const getCategoryById = async (req, res) => {
  const { id } = req.params;
  console.log(`> GET /api/admin/categories/${id}`);

  try {
    const category = await Category.findOne({ _id: id, deletedAt: null })
      .populate("parent", "name slug")
      .lean();

    if (!category) {
      console.log(`> Category not found: ${id}`);
      return sendResponse(res, 404, "Category not found", null, `Category with ID '${id}' not found`);
    }

    console.log(`> Category found: ${category.name}`);
    return sendResponse(res, 200, "Category fetched successfully", { category }, null);
  } catch (error) {
    console.log("> Error fetching category:", error.message);
    return sendResponse(res, 500, "Failed to fetch category", null, error.message);
  }
};

/**
 * @route PUT /api/admin/categories/:id
 * @description Update category (admin)
 * @access Admin
 *
 * @params
 * - id: Category ObjectId
 *
 * @requestBody
 * {
 *   "name": "Updated Category Name",
 *   "description": "Updated description",
 *   "parent": "507f1f77bcf86cd799439011",
 *   "image": { "url": "https://...", "publicId": "..." },
 *   "banner": { "url": "https://...", "publicId": "..." },
 *   "seo": { "title": "...", "description": "...", "keywords": [] },
 *   "showInMenu": true,
 *   "sortOrder": 1,
 *   "isActive": true
 * }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Category updated successfully",
 *   "data": { "category": { "_id": "...", "name": "Updated Category Name", ... } },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Category not found", "data": null, "error": "Category with ID '...' not found" }
 *
 * @responseBody Error (409)
 * { "message": "Category name already exists", "data": null, "error": "A category with name '...' already exists" }
 *
 * @responseBody Error (400)
 * { "message": "Invalid parent", "data": null, "error": "Category cannot be its own parent" }
 */
export const updateCategory = async (req, res) => {
  const { id } = req.params;
  console.log(`> PUT /api/admin/categories/${id}`);
  console.log("> Body:", req.body);

  try {
    const category = await Category.findOne({ _id: id, deletedAt: null });

    if (!category) {
      console.log(`> Category not found: ${id}`);
      return sendResponse(res, 404, "Category not found", null, `Category with ID '${id}' not found`);
    }

    const { name, description, parent, image, banner, seo, showInMenu, sortOrder, isActive } = req.body;
    const oldPath = category.path;
    let needsPathUpdate = false;

    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({
        name: { $regex: `^${name}$`, $options: "i" },
        _id: { $ne: id },
        deletedAt: null,
      });

      if (existingCategory) {
        console.log(`> Category name already exists: ${name}`);
        return sendResponse(res, 409, "Category name already exists", null, `A category with name '${name}' already exists`);
      }

      category.name = name;
      const newSlug = await generateUniqueSlug(generateSlug(name), Category, id);
      category.slug = newSlug;
      needsPathUpdate = true;
    }

    if (parent !== undefined) {
      if (parent === id) {
        console.log("> Category cannot be its own parent");
        return sendResponse(res, 400, "Invalid parent", null, "Category cannot be its own parent");
      }

      if (parent) {
        const parentCategory = await Category.findOne({ _id: parent, deletedAt: null });
        if (!parentCategory) {
          console.log(`> Parent category not found: ${parent}`);
          return sendResponse(res, 404, "Parent category not found", null, `Parent category with ID '${parent}' not found`);
        }

        if (parentCategory.path.startsWith(category.path)) {
          console.log("> Cannot set descendant as parent");
          return sendResponse(res, 400, "Invalid parent", null, "Cannot set a descendant category as parent");
        }
      }

      category.parent = parent || null;
      needsPathUpdate = true;
    }

    if (needsPathUpdate) {
      const { level, path } = await computeLevelAndPath(category.parent, category.slug);
      category.level = level;
      category.path = path;

      await updateDescendantPaths(id, oldPath, path);
    }

    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (banner !== undefined) category.banner = banner;
    if (seo !== undefined) category.seo = seo;
    if (showInMenu !== undefined) category.showInMenu = showInMenu;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    console.log(`> Category updated: ${category.name}`);
    return sendResponse(res, 200, "Category updated successfully", { category }, null);
  } catch (error) {
    console.log("> Error updating category:", error.message);
    return sendResponse(res, 500, "Failed to update category", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/categories/:id/reorder
 * @description Reorder category (admin)
 * @access Admin
 *
 * @params
 * - id: Category ObjectId
 *
 * @requestBody
 * { "sortOrder": 2 }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Category reordered successfully",
 *   "data": { "category": { "_id": "...", "name": "...", "sortOrder": 2, ... } },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Category not found", "data": null, "error": "Category with ID '...' not found" }
 */
export const reorderCategory = async (req, res) => {
  const { id } = req.params;
  const { sortOrder } = req.body;
  console.log(`> PATCH /api/admin/categories/${id}/reorder`);
  console.log("> Body:", req.body);

  try {
    const category = await Category.findOne({ _id: id, deletedAt: null });

    if (!category) {
      console.log(`> Category not found: ${id}`);
      return sendResponse(res, 404, "Category not found", null, `Category with ID '${id}' not found`);
    }

    category.sortOrder = sortOrder;
    await category.save();

    console.log(`> Category reordered: ${category.name} -> sortOrder: ${sortOrder}`);
    return sendResponse(res, 200, "Category reordered successfully", { category }, null);
  } catch (error) {
    console.log("> Error reordering category:", error.message);
    return sendResponse(res, 500, "Failed to reorder category", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/categories/:id/visibility
 * @description Toggle category menu visibility (admin)
 * @access Admin
 *
 * @params
 * - id: Category ObjectId
 *
 * @requestBody
 * { "showInMenu": false }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Category visibility updated successfully",
 *   "data": { "category": { "_id": "...", "name": "...", "showInMenu": false, ... } },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Category not found", "data": null, "error": "Category with ID '...' not found" }
 */
export const toggleCategoryVisibility = async (req, res) => {
  const { id } = req.params;
  const { showInMenu } = req.body;
  console.log(`> PATCH /api/admin/categories/${id}/visibility`);
  console.log("> Body:", req.body);

  try {
    const category = await Category.findOne({ _id: id, deletedAt: null });

    if (!category) {
      console.log(`> Category not found: ${id}`);
      return sendResponse(res, 404, "Category not found", null, `Category with ID '${id}' not found`);
    }

    category.showInMenu = showInMenu;
    await category.save();

    console.log(`> Category visibility updated: ${category.name} -> showInMenu: ${showInMenu}`);
    return sendResponse(res, 200, "Category visibility updated successfully", { category }, null);
  } catch (error) {
    console.log("> Error updating category visibility:", error.message);
    return sendResponse(res, 500, "Failed to update category visibility", null, error.message);
  }
};

/**
 * @route DELETE /api/admin/categories/:id
 * @description Soft delete category (admin)
 * @access Admin
 *
 * @params
 * - id: Category ObjectId
 *
 * @responseBody Success (200)
 * {
 *   "message": "Category deleted successfully",
 *   "data": { "category": { "_id": "...", "name": "...", "deletedAt": "2024-01-01T00:00:00Z", ... } },
 *   "error": null
 * }
 *
 * @responseBody Error (404)
 * { "message": "Category not found", "data": null, "error": "Category with ID '...' not found" }
 *
 * @responseBody Error (400)
 * { "message": "Cannot delete category", "data": null, "error": "Category has subcategories. Delete or reassign them first." }
 */
export const deleteCategory = async (req, res) => {
  const { id } = req.params;
  console.log(`> DELETE /api/admin/categories/${id}`);

  try {
    const category = await Category.findOne({ _id: id, deletedAt: null });

    if (!category) {
      console.log(`> Category not found: ${id}`);
      return sendResponse(res, 404, "Category not found", null, `Category with ID '${id}' not found`);
    }

    const childCount = await Category.countDocuments({ parent: id, deletedAt: null });
    if (childCount > 0) {
      console.log(`> Category has ${childCount} subcategories`);
      return sendResponse(res, 400, "Cannot delete category", null, "Category has subcategories. Delete or reassign them first.");
    }

    category.deletedAt = new Date();
    category.isActive = false;
    await category.save();

    console.log(`> Category deleted: ${category.name}`);
    return sendResponse(res, 200, "Category deleted successfully", { category }, null);
  } catch (error) {
    console.log("> Error deleting category:", error.message);
    return sendResponse(res, 500, "Failed to delete category", null, error.message);
  }
};

export default {
  getCategoryTree,
  getCategoryBySlug,
  getCategoryProducts,
  listAllCategories,
  createCategory,
  getCategoryById,
  updateCategory,
  reorderCategory,
  toggleCategoryVisibility,
  deleteCategory,
};
