import { BlogCategory, Blog } from "../../models/index.js";
import { sendResponse, HTTP_STATUS } from "@shared/utils";

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const checkSlugUnique = async (slug, excludeId = null) => {
  const query = { slug: slug.toLowerCase() };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const existing = await BlogCategory.findOne(query).lean();
  return !existing;
};

const generateUniqueSlug = async (baseSlug, excludeId = null) => {
  let slug = baseSlug;
  let counter = 1;
  while (!(await checkSlugUnique(slug, excludeId))) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
};

const validateParentId = async (parentId, currentCategoryId = null) => {
  if (parentId === currentCategoryId) {
    return { valid: false, error: "Category cannot be its own parent" };
  }

  const parent = await BlogCategory.findById(parentId);
  if (!parent) {
    return { valid: false, error: "Parent category not found" };
  }
  if (!parent.is_active) {
    return { valid: false, error: "Parent category must be active" };
  }
  if (parent.parent_id !== null) {
    return { valid: false, error: "Cannot nest categories more than 1 level deep" };
  }

  if (currentCategoryId) {
    const childCount = await BlogCategory.countDocuments({ parent_id: currentCategoryId });
    if (childCount > 0) {
      return { valid: false, error: "Cannot set parent for category that has children" };
    }
  }

  return { valid: true };
};

const getBlogCount = async (categoryId) => {
  return Blog.countDocuments({ category_id: categoryId });
};

const buildCategoryTree = (categories) => {
  const categoryMap = new Map();
  const roots = [];

  categories.forEach(cat => {
    categoryMap.set(cat._id.toString(), { ...cat, children: [] });
  });

  categories.forEach(cat => {
    const category = categoryMap.get(cat._id.toString());
    if (cat.parent_id) {
      const parent = categoryMap.get(cat.parent_id.toString());
      if (parent) {
        parent.children.push(category);
      }
    } else {
      roots.push(category);
    }
  });

  roots.sort((a, b) => a.sort_order - b.sort_order);
  roots.forEach(root => root.children.sort((a, b) => a.sort_order - b.sort_order));

  return roots;
};

/**
 * @route GET /api/blog-categories
 * @desc List all active categories as tree
 * @access Public
 */
export const listActiveCategories = async (req, res) => {
  console.log("> GET /api/blog-categories");

  try {
    const categories = await BlogCategory.find({ is_active: true })
      .select("slug name parent_id sort_order")
      .sort({ sort_order: 1 })
      .lean();

    const categoryIds = categories.map(c => c._id);
    const blogCounts = await Blog.aggregate([
      { $match: { category_id: { $in: categoryIds } } },
      { $group: { _id: "$category_id", count: { $sum: 1 } } }
    ]);

    const countMap = new Map(blogCounts.map(b => [b._id.toString(), b.count]));
    const categoriesWithCount = categories.map(cat => ({
      ...cat,
      blog_count: countMap.get(cat._id.toString()) || 0
    }));

    const tree = buildCategoryTree(categoriesWithCount);

    console.log(`> Found ${categories.length} active categories`);
    return sendResponse(res, HTTP_STATUS.OK, "Categories retrieved successfully", { categories: tree });
  } catch (error) {
    console.log(`List active categories error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to retrieve categories", null, error.message);
  }
};

/**
 * @route GET /api/blog-categories/:slug
 * @desc Get category by slug
 * @access Public
 */
export const getCategoryBySlug = async (req, res) => {
  console.log(`> GET /api/blog-categories/${req.params.slug}`);

  try {
    const { slug } = req.params;

    const category = await BlogCategory.findOne({ slug: slug.toLowerCase(), is_active: true }).lean();

    if (!category) {
      console.log(`> Category not found: ${slug}`);
      return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Category not found", null, "Category not found or inactive");
    }

    const blogCount = await getBlogCount(category._id);

    console.log(`> Category found: ${category._id}`);
    return sendResponse(res, HTTP_STATUS.OK, "Category retrieved successfully", {
      category: { ...category, blog_count: blogCount }
    });
  } catch (error) {
    console.log(`Get category by slug error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to retrieve category", null, error.message);
  }
};

/**
 * @route GET /api/admin/blog-categories
 * @desc List all categories with filters
 * @access Admin
 */
export const listAllCategories = async (req, res) => {
  console.log("> GET /api/admin/blog-categories");
  console.log("> Query:", JSON.stringify(req.query));

  try {
    const { is_active, parent_id, search, format = "flat", page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const query = {};

    if (is_active !== undefined) {
      query.is_active = is_active;
    }
    if (parent_id === "null" || parent_id === "") {
      query.parent_id = null;
    } else if (parent_id) {
      query.parent_id = parent_id;
    }
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const [categories, total] = await Promise.all([
      BlogCategory.find(query).sort({ sort_order: 1 }).skip(skip).limit(limit).lean(),
      BlogCategory.countDocuments(query)
    ]);

    const categoryIds = categories.map(c => c._id);
    const blogCounts = await Blog.aggregate([
      { $match: { category_id: { $in: categoryIds } } },
      { $group: { _id: "$category_id", count: { $sum: 1 } } }
    ]);

    const countMap = new Map(blogCounts.map(b => [b._id.toString(), b.count]));
    const categoriesWithCount = categories.map(cat => ({
      ...cat,
      blog_count: countMap.get(cat._id.toString()) || 0
    }));

    let result = categoriesWithCount;
    if (format === "tree") {
      result = buildCategoryTree(categoriesWithCount);
    }

    console.log(`> Found ${categories.length} categories (total: ${total})`);
    return sendResponse(res, HTTP_STATUS.OK, "Categories retrieved successfully", {
      categories: result,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.log(`List all categories error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to retrieve categories", null, error.message);
  }
};

/**
 * @route GET /api/admin/blog-categories/:id
 * @desc Get category by ID
 * @access Admin
 */
export const getCategoryById = async (req, res) => {
  console.log(`> GET /api/admin/blog-categories/${req.params.id}`);

  try {
    const { id } = req.params;

    const category = await BlogCategory.findById(id).lean();

    if (!category) {
      console.log(`> Category not found: ${id}`);
      return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Category not found", null, "Category not found");
    }

    const [blogCount, children] = await Promise.all([
      getBlogCount(category._id),
      BlogCategory.find({ parent_id: category._id }).lean()
    ]);

    console.log(`> Category found: ${category._id}`);
    return sendResponse(res, HTTP_STATUS.OK, "Category retrieved successfully", {
      category: { ...category, blog_count: blogCount, children }
    });
  } catch (error) {
    console.log(`Get category by ID error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to retrieve category", null, error.message);
  }
};

/**
 * @route POST /api/admin/blog-categories
 * @desc Create new category
 * @access Admin
 */
export const createCategory = async (req, res) => {
  console.log("> POST /api/admin/blog-categories");
  console.log("> Body:", JSON.stringify(req.body));

  try {
    const { name, slug, parent_id, is_active = true, sort_order } = req.body;

    if (parent_id) {
      const validation = await validateParentId(parent_id);
      if (!validation.valid) {
        return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "Validation failed", null, validation.error);
      }
    }

    let finalSlug = slug || generateSlug(name);
    finalSlug = await generateUniqueSlug(finalSlug);

    let finalSortOrder = sort_order;
    if (finalSortOrder === undefined) {
      const maxOrder = await BlogCategory.findOne({ parent_id: parent_id || null })
        .sort({ sort_order: -1 })
        .select("sort_order")
        .lean();
      finalSortOrder = maxOrder ? maxOrder.sort_order + 1 : 0;
    }

    const category = await BlogCategory.create({
      name,
      slug: finalSlug,
      parent_id: parent_id || null,
      is_active,
      sort_order: finalSortOrder
    });

    console.log(`> Category created: ${category._id}`);
    return sendResponse(res, HTTP_STATUS.CREATED, "Category created successfully", { category });
  } catch (error) {
    console.log(`Create category error: ${error.message}`);
    console.log(error.stack);
    if (error.code === 11000) {
      return sendResponse(res, HTTP_STATUS.CONFLICT, "Slug already exists", null, "A category with this slug already exists");
    }
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to create category", null, error.message);
  }
};

/**
 * @route PUT /api/admin/blog-categories/:id
 * @desc Update category
 * @access Admin
 */
export const updateCategory = async (req, res) => {
  console.log(`> PUT /api/admin/blog-categories/${req.params.id}`);
  console.log("> Body:", JSON.stringify(req.body));

  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const existingCategory = await BlogCategory.findById(id);

    if (!existingCategory) {
      console.log(`> Category not found: ${id}`);
      return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Category not found", null, "Category not found");
    }

    if (updateData.parent_id !== undefined && updateData.parent_id !== existingCategory.parent_id?.toString()) {
      if (updateData.parent_id) {
        const validation = await validateParentId(updateData.parent_id, id);
        if (!validation.valid) {
          return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "Validation failed", null, validation.error);
        }
      }
    }

    if (updateData.slug && updateData.slug !== existingCategory.slug) {
      const isUnique = await checkSlugUnique(updateData.slug, id);
      if (!isUnique) {
        return sendResponse(res, HTTP_STATUS.CONFLICT, "Slug already exists", null, "A category with this slug already exists");
      }
    }

    const category = await BlogCategory.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).lean();

    console.log(`> Category updated: ${category._id}`);
    return sendResponse(res, HTTP_STATUS.OK, "Category updated successfully", { category });
  } catch (error) {
    console.log(`Update category error: ${error.message}`);
    console.log(error.stack);
    if (error.code === 11000) {
      return sendResponse(res, HTTP_STATUS.CONFLICT, "Slug already exists", null, "A category with this slug already exists");
    }
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to update category", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/blog-categories/:id/activate
 * @desc Activate category
 * @access Admin
 */
export const activateCategory = async (req, res) => {
  console.log(`> PATCH /api/admin/blog-categories/${req.params.id}/activate`);

  try {
    const { id } = req.params;

    const category = await BlogCategory.findByIdAndUpdate(id, { is_active: true }, { new: true }).lean();

    if (!category) {
      console.log(`> Category not found: ${id}`);
      return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Category not found", null, "Category not found");
    }

    console.log(`> Category activated: ${category._id}`);
    return sendResponse(res, HTTP_STATUS.OK, "Category activated successfully", { category });
  } catch (error) {
    console.log(`Activate category error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to activate category", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/blog-categories/:id/deactivate
 * @desc Deactivate category
 * @access Admin
 */
export const deactivateCategory = async (req, res) => {
  console.log(`> PATCH /api/admin/blog-categories/${req.params.id}/deactivate`);

  try {
    const { id } = req.params;
    const { cascade_children = false } = req.query;

    const category = await BlogCategory.findByIdAndUpdate(id, { is_active: false }, { new: true }).lean();

    if (!category) {
      console.log(`> Category not found: ${id}`);
      return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Category not found", null, "Category not found");
    }

    if (cascade_children) {
      await BlogCategory.updateMany({ parent_id: id }, { is_active: false });
      console.log(`> Deactivated children of category: ${id}`);
    }

    console.log(`> Category deactivated: ${category._id}`);
    return sendResponse(res, HTTP_STATUS.OK, "Category deactivated successfully", { category });
  } catch (error) {
    console.log(`Deactivate category error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to deactivate category", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/blog-categories/reorder
 * @desc Reorder categories
 * @access Admin
 */
export const reorderCategories = async (req, res) => {
  console.log("> PATCH /api/admin/blog-categories/reorder");
  console.log("> Body:", JSON.stringify(req.body));

  try {
    const { items } = req.body;

    const bulkOps = items.map(item => ({
      updateOne: {
        filter: { _id: item.id },
        update: { sort_order: item.sort_order }
      }
    }));

    await BlogCategory.bulkWrite(bulkOps);

    console.log(`> Reordered ${items.length} categories`);
    return sendResponse(res, HTTP_STATUS.OK, "Categories reordered successfully", null);
  } catch (error) {
    console.log(`Reorder categories error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to reorder categories", null, error.message);
  }
};

/**
 * @route DELETE /api/admin/blog-categories/:id
 * @desc Delete category
 * @access Admin
 */
export const deleteCategory = async (req, res) => {
  console.log(`> DELETE /api/admin/blog-categories/${req.params.id}`);

  try {
    const { id } = req.params;
    const { force = false } = req.query;

    const existingCategory = await BlogCategory.findById(id);

    if (!existingCategory) {
      console.log(`> Category not found: ${id}`);
      return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Category not found", null, "Category not found");
    }

    const blogCount = await getBlogCount(id);
    if (blogCount > 0) {
      return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "Cannot delete category", null, `Cannot delete category with ${blogCount} assigned blogs`);
    }

    const childCount = await BlogCategory.countDocuments({ parent_id: id });
    if (childCount > 0 && !force) {
      return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "Cannot delete category", null, `Cannot delete category with ${childCount} child categories. Use force=true to delete children too.`);
    }

    if (childCount > 0 && force) {
      await BlogCategory.deleteMany({ parent_id: id });
      console.log(`> Deleted ${childCount} child categories`);
    }

    await BlogCategory.findByIdAndDelete(id);

    console.log(`> Category deleted: ${id}`);
    return sendResponse(res, HTTP_STATUS.OK, "Category deleted successfully", null);
  } catch (error) {
    console.log(`Delete category error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to delete category", null, error.message);
  }
};

export default {
  listActiveCategories,
  getCategoryBySlug,
  listAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  activateCategory,
  deactivateCategory,
  reorderCategories,
  deleteCategory
};
