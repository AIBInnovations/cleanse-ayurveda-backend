import { Blog, BlogCategory } from "../../models/index.js";
import { sendResponse, HTTP_STATUS } from "@shared/utils";

const generateSlug = (title) => {
  return title
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
  const existing = await Blog.findOne(query).lean();
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

const incrementViewCount = (blogId) => {
  Blog.updateOne({ _id: blogId }, { $inc: { view_count: 1 } }).exec();
};

const getPublishedQuery = () => {
  const now = new Date();
  return {
    status: "published",
    $or: [{ published_at: null }, { published_at: { $lte: now } }]
  };
};

/**
 * @route GET /api/blogs
 * @desc List published blogs
 * @access Public
 */
export const listPublishedBlogs = async (req, res) => {
  console.log("> GET /api/blogs");
  console.log("> Query:", JSON.stringify(req.query));

  try {
    const { category, tag, featured, page = 1, limit = 10, sort = "latest" } = req.query;
    const skip = (page - 1) * limit;

    const query = getPublishedQuery();

    if (category) {
      const cat = await BlogCategory.findOne({ slug: category, is_active: true }).lean();
      if (cat) {
        query.category_id = cat._id;
      } else {
        return sendResponse(res, HTTP_STATUS.OK, "Blogs retrieved successfully", {
          blogs: [],
          pagination: { page: Number(page), limit: Number(limit), total: 0, pages: 0 }
        });
      }
    }

    if (tag) {
      query.tags = tag;
    }

    if (featured !== undefined) {
      query.is_featured = featured;
    }

    const sortObj = sort === "popular" ? { view_count: -1 } : { published_at: -1 };

    const [blogs, total] = await Promise.all([
      Blog.find(query)
        .select("slug title excerpt featured_image_url category_id tags author_name published_at view_count")
        .populate("category_id", "slug name")
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Blog.countDocuments(query)
    ]);

    console.log(`> Found ${blogs.length} published blogs`);
    return sendResponse(res, HTTP_STATUS.OK, "Blogs retrieved successfully", {
      blogs,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.log(`List published blogs error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to retrieve blogs", null, error.message);
  }
};

/**
 * @route GET /api/blogs/featured
 * @desc List featured blogs
 * @access Public
 */
export const listFeaturedBlogs = async (req, res) => {
  console.log("> GET /api/blogs/featured");

  try {
    const query = { ...getPublishedQuery(), is_featured: true };

    const blogs = await Blog.find(query)
      .select("slug title excerpt featured_image_url category_id tags author_name published_at view_count")
      .populate("category_id", "slug name")
      .sort({ published_at: -1 })
      .limit(5)
      .lean();

    console.log(`> Found ${blogs.length} featured blogs`);
    return sendResponse(res, HTTP_STATUS.OK, "Featured blogs retrieved successfully", { blogs });
  } catch (error) {
    console.log(`List featured blogs error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to retrieve blogs", null, error.message);
  }
};

/**
 * @route GET /api/blogs/:slug
 * @desc Get blog by slug
 * @access Public
 */
export const getBlogBySlug = async (req, res) => {
  console.log(`> GET /api/blogs/${req.params.slug}`);

  try {
    const { slug } = req.params;

    const blog = await Blog.findOne({ slug: slug.toLowerCase(), ...getPublishedQuery() })
      .populate("category_id", "slug name")
      .lean();

    if (!blog) {
      console.log(`> Blog not found: ${slug}`);
      return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Blog not found", null, "Blog not found or not published");
    }

    incrementViewCount(blog._id);

    console.log(`> Blog found: ${blog._id}`);
    return sendResponse(res, HTTP_STATUS.OK, "Blog retrieved successfully", { blog });
  } catch (error) {
    console.log(`Get blog by slug error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to retrieve blog", null, error.message);
  }
};

/**
 * @route GET /api/blogs/:slug/related
 * @desc Get related blogs
 * @access Public
 */
export const getRelatedBlogs = async (req, res) => {
  console.log(`> GET /api/blogs/${req.params.slug}/related`);

  try {
    const { slug } = req.params;

    const blog = await Blog.findOne({ slug: slug.toLowerCase() }).lean();

    if (!blog) {
      console.log(`> Blog not found: ${slug}`);
      return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Blog not found", null, "Blog not found");
    }

    const query = {
      ...getPublishedQuery(),
      _id: { $ne: blog._id },
      $or: []
    };

    if (blog.category_id) {
      query.$or.push({ category_id: blog.category_id });
    }

    if (blog.tags && blog.tags.length > 0) {
      query.$or.push({ tags: { $in: blog.tags } });
    }

    if (query.$or.length === 0) {
      delete query.$or;
    }

    const relatedBlogs = await Blog.find(query)
      .select("slug title excerpt featured_image_url category_id tags published_at")
      .populate("category_id", "slug name")
      .sort({ published_at: -1 })
      .limit(5)
      .lean();

    console.log(`> Found ${relatedBlogs.length} related blogs`);
    return sendResponse(res, HTTP_STATUS.OK, "Related blogs retrieved successfully", { blogs: relatedBlogs });
  } catch (error) {
    console.log(`Get related blogs error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to retrieve related blogs", null, error.message);
  }
};

/**
 * @route GET /api/admin/blogs
 * @desc List all blogs with filters
 * @access Admin
 */
export const listAllBlogs = async (req, res) => {
  console.log("> GET /api/admin/blogs");
  console.log("> Query:", JSON.stringify(req.query));

  try {
    const { status, category_id, is_featured, author_id, search, page = 1, limit = 20, sort = "-created_at" } = req.query;
    const skip = (page - 1) * limit;

    const query = {};

    if (status) query.status = status;
    if (category_id) query.category_id = category_id;
    if (is_featured !== undefined) query.is_featured = is_featured;
    if (author_id) query.author_id = author_id;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { excerpt: { $regex: search, $options: "i" } }
      ];
    }

    const sortField = sort.startsWith("-") ? sort.slice(1) : sort;
    const sortOrder = sort.startsWith("-") ? -1 : 1;
    const sortObj = { [sortField]: sortOrder };

    const [blogs, total] = await Promise.all([
      Blog.find(query)
        .select("slug title status category_id is_featured author_name view_count published_at created_at")
        .populate("category_id", "slug name")
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Blog.countDocuments(query)
    ]);

    console.log(`> Found ${blogs.length} blogs (total: ${total})`);
    return sendResponse(res, HTTP_STATUS.OK, "Blogs retrieved successfully", {
      blogs,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.log(`List all blogs error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to retrieve blogs", null, error.message);
  }
};

/**
 * @route GET /api/admin/blogs/:id
 * @desc Get blog by ID
 * @access Admin
 */
export const getBlogById = async (req, res) => {
  console.log(`> GET /api/admin/blogs/${req.params.id}`);

  try {
    const { id } = req.params;

    const blog = await Blog.findById(id).populate("category_id", "slug name").lean();

    if (!blog) {
      console.log(`> Blog not found: ${id}`);
      return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Blog not found", null, "Blog not found");
    }

    console.log(`> Blog found: ${blog._id}`);
    return sendResponse(res, HTTP_STATUS.OK, "Blog retrieved successfully", { blog });
  } catch (error) {
    console.log(`Get blog by ID error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to retrieve blog", null, error.message);
  }
};

/**
 * @route POST /api/admin/blogs
 * @desc Create new blog
 * @access Admin
 */
export const createBlog = async (req, res) => {
  console.log("> POST /api/admin/blogs");
  console.log("> Body:", JSON.stringify(req.body));

  try {
    const { title, slug, excerpt, content, category_id, tags, featured_image_url, is_featured, status, published_at, seo } = req.body;
    const authorId = req.headers["x-user-id"];
    const authorName = req.headers["x-user-name"] || "Admin";

    if (category_id) {
      const category = await BlogCategory.findById(category_id);
      if (!category || !category.is_active) {
        return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "Validation failed", null, "Category not found or inactive");
      }
    }

    let finalSlug = slug || generateSlug(title);
    finalSlug = await generateUniqueSlug(finalSlug);

    const blogData = {
      title,
      slug: finalSlug,
      excerpt: excerpt || "",
      content: content || "",
      category_id: category_id || null,
      tags: tags || [],
      featured_image_url: featured_image_url || null,
      is_featured: is_featured || false,
      status: status || "draft",
      seo: seo || {},
      author_id: authorId,
      author_name: authorName,
      view_count: 0
    };

    if (status === "published") {
      if (!excerpt || excerpt.length < 10) {
        return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "Validation failed", null, "Published blogs must have an excerpt of at least 10 characters");
      }
      if (!content || content.trim() === "") {
        return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "Validation failed", null, "Published blogs must have content");
      }
      if (!category_id) {
        return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "Validation failed", null, "Published blogs must have a category");
      }
      if (!featured_image_url) {
        return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "Validation failed", null, "Published blogs must have a featured image");
      }
      blogData.published_at = published_at ? new Date(published_at) : new Date();
    } else if (published_at) {
      blogData.published_at = new Date(published_at);
    }

    const blog = await Blog.create(blogData);

    console.log(`> Blog created: ${blog._id}`);
    return sendResponse(res, HTTP_STATUS.CREATED, "Blog created successfully", { blog });
  } catch (error) {
    console.log(`Create blog error: ${error.message}`);
    console.log(error.stack);
    if (error.code === 11000) {
      return sendResponse(res, HTTP_STATUS.CONFLICT, "Slug already exists", null, "A blog with this slug already exists");
    }
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to create blog", null, error.message);
  }
};

/**
 * @route PUT /api/admin/blogs/:id
 * @desc Update blog
 * @access Admin
 */
export const updateBlog = async (req, res) => {
  console.log(`> PUT /api/admin/blogs/${req.params.id}`);
  console.log("> Body:", JSON.stringify(req.body));

  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    delete updateData.view_count;
    delete updateData.author_id;
    delete updateData.author_name;

    const existingBlog = await Blog.findById(id);

    if (!existingBlog) {
      console.log(`> Blog not found: ${id}`);
      return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Blog not found", null, "Blog not found");
    }

    if (updateData.category_id) {
      const category = await BlogCategory.findById(updateData.category_id);
      if (!category || !category.is_active) {
        return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "Validation failed", null, "Category not found or inactive");
      }
    }

    if (updateData.slug && updateData.slug !== existingBlog.slug) {
      const isUnique = await checkSlugUnique(updateData.slug, id);
      if (!isUnique) {
        return sendResponse(res, HTTP_STATUS.CONFLICT, "Slug already exists", null, "A blog with this slug already exists");
      }
    }

    if (updateData.status === "published") {
      const excerpt = updateData.excerpt !== undefined ? updateData.excerpt : existingBlog.excerpt;
      const content = updateData.content !== undefined ? updateData.content : existingBlog.content;
      const categoryId = updateData.category_id !== undefined ? updateData.category_id : existingBlog.category_id;
      const featuredImage = updateData.featured_image_url !== undefined ? updateData.featured_image_url : existingBlog.featured_image_url;

      if (!excerpt || excerpt.length < 10) {
        return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "Validation failed", null, "Published blogs must have an excerpt of at least 10 characters");
      }
      if (!content || content.trim() === "") {
        return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "Validation failed", null, "Published blogs must have content");
      }
      if (!categoryId) {
        return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "Validation failed", null, "Published blogs must have a category");
      }
      if (!featuredImage) {
        return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "Validation failed", null, "Published blogs must have a featured image");
      }

      if (!existingBlog.published_at && !updateData.published_at) {
        updateData.published_at = new Date();
      }
    }

    const blog = await Blog.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate("category_id", "slug name")
      .lean();

    console.log(`> Blog updated: ${blog._id}`);
    return sendResponse(res, HTTP_STATUS.OK, "Blog updated successfully", { blog });
  } catch (error) {
    console.log(`Update blog error: ${error.message}`);
    console.log(error.stack);
    if (error.code === 11000) {
      return sendResponse(res, HTTP_STATUS.CONFLICT, "Slug already exists", null, "A blog with this slug already exists");
    }
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to update blog", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/blogs/:id/publish
 * @desc Publish blog
 * @access Admin
 */
export const publishBlog = async (req, res) => {
  console.log(`> PATCH /api/admin/blogs/${req.params.id}/publish`);

  try {
    const { id } = req.params;

    const existingBlog = await Blog.findById(id);

    if (!existingBlog) {
      console.log(`> Blog not found: ${id}`);
      return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Blog not found", null, "Blog not found");
    }

    if (!existingBlog.excerpt || existingBlog.excerpt.length < 10) {
      return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "Cannot publish", null, "Blog must have an excerpt of at least 10 characters");
    }
    if (!existingBlog.content || existingBlog.content.trim() === "") {
      return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "Cannot publish", null, "Blog must have content");
    }
    if (!existingBlog.category_id) {
      return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "Cannot publish", null, "Blog must have a category");
    }
    if (!existingBlog.featured_image_url) {
      return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "Cannot publish", null, "Blog must have a featured image");
    }

    const updateData = { status: "published" };
    if (!existingBlog.published_at) {
      updateData.published_at = new Date();
    }

    const blog = await Blog.findByIdAndUpdate(id, updateData, { new: true }).lean();

    console.log(`> Blog published: ${blog._id}`);
    return sendResponse(res, HTTP_STATUS.OK, "Blog published successfully", { blog });
  } catch (error) {
    console.log(`Publish blog error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to publish blog", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/blogs/:id/unpublish
 * @desc Unpublish blog
 * @access Admin
 */
export const unpublishBlog = async (req, res) => {
  console.log(`> PATCH /api/admin/blogs/${req.params.id}/unpublish`);

  try {
    const { id } = req.params;

    const blog = await Blog.findByIdAndUpdate(id, { status: "draft" }, { new: true }).lean();

    if (!blog) {
      console.log(`> Blog not found: ${id}`);
      return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Blog not found", null, "Blog not found");
    }

    console.log(`> Blog unpublished: ${blog._id}`);
    return sendResponse(res, HTTP_STATUS.OK, "Blog unpublished successfully", { blog });
  } catch (error) {
    console.log(`Unpublish blog error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to unpublish blog", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/blogs/:id/feature
 * @desc Feature blog
 * @access Admin
 */
export const featureBlog = async (req, res) => {
  console.log(`> PATCH /api/admin/blogs/${req.params.id}/feature`);

  try {
    const { id } = req.params;

    const blog = await Blog.findByIdAndUpdate(id, { is_featured: true }, { new: true }).lean();

    if (!blog) {
      console.log(`> Blog not found: ${id}`);
      return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Blog not found", null, "Blog not found");
    }

    console.log(`> Blog featured: ${blog._id}`);
    return sendResponse(res, HTTP_STATUS.OK, "Blog featured successfully", { blog });
  } catch (error) {
    console.log(`Feature blog error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to feature blog", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/blogs/:id/unfeature
 * @desc Unfeature blog
 * @access Admin
 */
export const unfeatureBlog = async (req, res) => {
  console.log(`> PATCH /api/admin/blogs/${req.params.id}/unfeature`);

  try {
    const { id } = req.params;

    const blog = await Blog.findByIdAndUpdate(id, { is_featured: false }, { new: true }).lean();

    if (!blog) {
      console.log(`> Blog not found: ${id}`);
      return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Blog not found", null, "Blog not found");
    }

    console.log(`> Blog unfeatured: ${blog._id}`);
    return sendResponse(res, HTTP_STATUS.OK, "Blog unfeatured successfully", { blog });
  } catch (error) {
    console.log(`Unfeature blog error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to unfeature blog", null, error.message);
  }
};

/**
 * @route DELETE /api/admin/blogs/:id
 * @desc Delete blog
 * @access Admin
 */
export const deleteBlog = async (req, res) => {
  console.log(`> DELETE /api/admin/blogs/${req.params.id}`);

  try {
    const { id } = req.params;

    const blog = await Blog.findByIdAndDelete(id);

    if (!blog) {
      console.log(`> Blog not found: ${id}`);
      return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Blog not found", null, "Blog not found");
    }

    console.log(`> Blog deleted: ${id}`);
    return sendResponse(res, HTTP_STATUS.OK, "Blog deleted successfully", null);
  } catch (error) {
    console.log(`Delete blog error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to delete blog", null, error.message);
  }
};

export default {
  listPublishedBlogs,
  listFeaturedBlogs,
  getBlogBySlug,
  getRelatedBlogs,
  listAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  publishBlog,
  unpublishBlog,
  featureBlog,
  unfeatureBlog,
  deleteBlog
};
