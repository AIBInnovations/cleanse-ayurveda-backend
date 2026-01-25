import { Page } from "../../models/index.js";
import { sendResponse, HTTP_STATUS } from "@shared/utils";

/**
 * Generate URL-friendly slug from title
 * @param {string} title - Page title
 * @returns {string} URL-friendly slug
 */
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

/**
 * Check if slug is unique
 * @param {string} slug - Slug to check
 * @param {string} excludeId - Optional ID to exclude from check
 * @returns {Promise<boolean>} True if unique
 */
const checkSlugUnique = async (slug, excludeId = null) => {
  const query = { slug: slug.toLowerCase() };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const existing = await Page.findOne(query).lean();
  return !existing;
};

/**
 * Generate unique slug with suffix if needed
 * @param {string} baseSlug - Base slug to check
 * @param {string} excludeId - Optional ID to exclude
 * @returns {Promise<string>} Unique slug
 */
const generateUniqueSlug = async (baseSlug, excludeId = null) => {
  let slug = baseSlug;
  let counter = 1;
  while (!(await checkSlugUnique(slug, excludeId))) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
};

/**
 * @route GET /api/pages
 * @desc List all published pages (consumer)
 * @access Public
 */
export const listPublishedPages = async (req, res) => {
  console.log("> GET /api/pages");
  console.log("> Query:", JSON.stringify(req.query));

  try {
    const { page_type, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const now = new Date();
    const query = {
      status: "published",
      $or: [
        { published_at: null },
        { published_at: { $lte: now } }
      ]
    };

    if (page_type) {
      query.page_type = page_type;
    }

    const [pages, total] = await Promise.all([
      Page.find(query)
        .select("slug title page_type seo published_at created_at")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Page.countDocuments(query)
    ]);

    console.log(`> Found ${pages.length} published pages`);

    return sendResponse(res, HTTP_STATUS.OK, "Pages retrieved successfully", {
      pages,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.log(`List published pages error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to retrieve pages", null, error.message);
  }
};

/**
 * @route GET /api/pages/:slug
 * @desc Get published page by slug (consumer)
 * @access Public
 */
export const getPageBySlug = async (req, res) => {
  console.log(`> GET /api/pages/${req.params.slug}`);

  try {
    const { slug } = req.params;
    const now = new Date();

    const page = await Page.findOne({
      slug: slug.toLowerCase(),
      status: "published",
      $or: [
        { published_at: null },
        { published_at: { $lte: now } }
      ]
    }).lean();

    if (!page) {
      console.log(`> Page not found: ${slug}`);
      return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Page not found", null, "Page not found or not published");
    }

    console.log(`> Page found: ${page._id}`);
    return sendResponse(res, HTTP_STATUS.OK, "Page retrieved successfully", { page });
  } catch (error) {
    console.log(`Get page by slug error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to retrieve page", null, error.message);
  }
};

/**
 * @route GET /api/admin/pages
 * @desc List all pages with filters (admin)
 * @access Admin
 */
export const listAllPages = async (req, res) => {
  console.log("> GET /api/admin/pages");
  console.log("> Query:", JSON.stringify(req.query));

  try {
    const { status, page_type, search, page = 1, limit = 20, sort = "-created_at" } = req.query;
    const skip = (page - 1) * limit;

    const query = {};

    if (status) {
      query.status = status;
    }
    if (page_type) {
      query.page_type = page_type;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } }
      ];
    }

    const sortField = sort.startsWith("-") ? sort.slice(1) : sort;
    const sortOrder = sort.startsWith("-") ? -1 : 1;
    const sortObj = { [sortField]: sortOrder };

    const [pages, total] = await Promise.all([
      Page.find(query)
        .select("slug title status page_type is_system author_id created_at updated_at published_at")
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Page.countDocuments(query)
    ]);

    console.log(`> Found ${pages.length} pages (total: ${total})`);

    return sendResponse(res, HTTP_STATUS.OK, "Pages retrieved successfully", {
      pages,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.log(`List all pages error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to retrieve pages", null, error.message);
  }
};

/**
 * @route GET /api/admin/pages/:id
 * @desc Get page by ID (admin)
 * @access Admin
 */
export const getPageById = async (req, res) => {
  console.log(`> GET /api/admin/pages/${req.params.id}`);

  try {
    const { id } = req.params;

    const page = await Page.findById(id).lean();

    if (!page) {
      console.log(`> Page not found: ${id}`);
      return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Page not found", null, "Page not found");
    }

    console.log(`> Page found: ${page._id}`);
    return sendResponse(res, HTTP_STATUS.OK, "Page retrieved successfully", { page });
  } catch (error) {
    console.log(`Get page by ID error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to retrieve page", null, error.message);
  }
};

/**
 * @route POST /api/admin/pages
 * @desc Create new page (admin)
 * @access Admin
 * @body { title, slug?, content?, page_type?, status?, published_at?, is_system?, seo? }
 */
export const createPage = async (req, res) => {
  console.log("> POST /api/admin/pages");
  console.log("> Body:", JSON.stringify(req.body));

  try {
    const { title, slug, content, page_type, status, published_at, is_system, seo } = req.body;
    const authorId = req.headers["x-user-id"];

    let finalSlug = slug || generateSlug(title);
    finalSlug = await generateUniqueSlug(finalSlug);

    const pageData = {
      title,
      slug: finalSlug,
      content: content || "",
      page_type: page_type || "static",
      status: status || "draft",
      is_system: is_system || false,
      seo: seo || {},
      author_id: authorId
    };

    if (status === "published") {
      if (!content || content.trim() === "") {
        return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "Validation failed", null, "Published pages must have content");
      }
      pageData.published_at = published_at ? new Date(published_at) : new Date();
    } else if (published_at) {
      pageData.published_at = new Date(published_at);
    }

    const page = await Page.create(pageData);

    console.log(`> Page created: ${page._id}`);
    return sendResponse(res, HTTP_STATUS.CREATED, "Page created successfully", { page });
  } catch (error) {
    console.log(`Create page error: ${error.message}`);
    console.log(error.stack);
    if (error.code === 11000) {
      return sendResponse(res, HTTP_STATUS.CONFLICT, "Slug already exists", null, "A page with this slug already exists");
    }
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to create page", null, error.message);
  }
};

/**
 * @route PUT /api/admin/pages/:id
 * @desc Update page (admin)
 * @access Admin
 * @body { title?, slug?, content?, page_type?, status?, published_at?, seo? }
 */
export const updatePage = async (req, res) => {
  console.log(`> PUT /api/admin/pages/${req.params.id}`);
  console.log("> Body:", JSON.stringify(req.body));

  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    delete updateData.is_system;
    delete updateData.author_id;

    const existingPage = await Page.findById(id);

    if (!existingPage) {
      console.log(`> Page not found: ${id}`);
      return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Page not found", null, "Page not found");
    }

    if (updateData.slug && updateData.slug !== existingPage.slug) {
      const isUnique = await checkSlugUnique(updateData.slug, id);
      if (!isUnique) {
        return sendResponse(res, HTTP_STATUS.CONFLICT, "Slug already exists", null, "A page with this slug already exists");
      }
    }

    if (updateData.status === "published") {
      const content = updateData.content !== undefined ? updateData.content : existingPage.content;
      if (!content || content.trim() === "") {
        return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "Validation failed", null, "Published pages must have content");
      }
      if (!existingPage.published_at && !updateData.published_at) {
        updateData.published_at = new Date();
      }
    }

    const page = await Page.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).lean();

    console.log(`> Page updated: ${page._id}`);
    return sendResponse(res, HTTP_STATUS.OK, "Page updated successfully", { page });
  } catch (error) {
    console.log(`Update page error: ${error.message}`);
    console.log(error.stack);
    if (error.code === 11000) {
      return sendResponse(res, HTTP_STATUS.CONFLICT, "Slug already exists", null, "A page with this slug already exists");
    }
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to update page", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/pages/:id/publish
 * @desc Publish page (admin)
 * @access Admin
 */
export const publishPage = async (req, res) => {
  console.log(`> PATCH /api/admin/pages/${req.params.id}/publish`);

  try {
    const { id } = req.params;
    const { published_at } = req.body || {};

    const existingPage = await Page.findById(id);

    if (!existingPage) {
      console.log(`> Page not found: ${id}`);
      return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Page not found", null, "Page not found");
    }

    if (!existingPage.content || existingPage.content.trim() === "") {
      return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "Cannot publish", null, "Published pages must have content");
    }

    const updateData = { status: "published" };

    if (published_at) {
      const publishDate = new Date(published_at);
      if (publishDate > new Date()) {
        updateData.published_at = publishDate;
      } else {
        updateData.published_at = new Date();
      }
    } else if (!existingPage.published_at) {
      updateData.published_at = new Date();
    }

    const page = await Page.findByIdAndUpdate(id, updateData, { new: true }).lean();

    console.log(`> Page published: ${page._id}`);
    return sendResponse(res, HTTP_STATUS.OK, "Page published successfully", { page });
  } catch (error) {
    console.log(`Publish page error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to publish page", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/pages/:id/unpublish
 * @desc Unpublish page (admin)
 * @access Admin
 */
export const unpublishPage = async (req, res) => {
  console.log(`> PATCH /api/admin/pages/${req.params.id}/unpublish`);

  try {
    const { id } = req.params;

    const page = await Page.findByIdAndUpdate(id, { status: "draft" }, { new: true }).lean();

    if (!page) {
      console.log(`> Page not found: ${id}`);
      return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Page not found", null, "Page not found");
    }

    console.log(`> Page unpublished: ${page._id}`);
    return sendResponse(res, HTTP_STATUS.OK, "Page unpublished successfully", { page });
  } catch (error) {
    console.log(`Unpublish page error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to unpublish page", null, error.message);
  }
};

/**
 * @route DELETE /api/admin/pages/:id
 * @desc Delete page (admin)
 * @access Admin
 */
export const deletePage = async (req, res) => {
  console.log(`> DELETE /api/admin/pages/${req.params.id}`);

  try {
    const { id } = req.params;

    const existingPage = await Page.findById(id);

    if (!existingPage) {
      console.log(`> Page not found: ${id}`);
      return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Page not found", null, "Page not found");
    }

    if (existingPage.is_system) {
      console.log(`> Cannot delete system page: ${id}`);
      return sendResponse(res, HTTP_STATUS.FORBIDDEN, "Cannot delete system page", null, "System pages cannot be deleted");
    }

    await Page.findByIdAndDelete(id);

    console.log(`> Page deleted: ${id}`);
    return sendResponse(res, HTTP_STATUS.OK, "Page deleted successfully", null);
  } catch (error) {
    console.log(`Delete page error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to delete page", null, error.message);
  }
};

export default {
  listPublishedPages,
  getPageBySlug,
  listAllPages,
  getPageById,
  createPage,
  updatePage,
  publishPage,
  unpublishPage,
  deletePage
};
