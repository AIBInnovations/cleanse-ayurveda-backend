import { sendResponse, HTTP_STATUS } from "@shared/utils";
import HomepageSection from "../../models/homepage-section.model.js";

// Helper: Compute section status based on dates and is_active
const computeSectionStatus = (section) => {
  if (!section.is_active) return "inactive";

  const now = new Date();
  if (section.starts_at && new Date(section.starts_at) > now) return "scheduled";
  if (section.ends_at && new Date(section.ends_at) < now) return "expired";

  return "active";
};

// ============================================================
// CONSUMER CONTROLLERS
// ============================================================

// GET /homepage-sections - Get active sections
const getActiveSections = async (req, res) => {
  console.log("> GET /homepage-sections");
  console.log("Query:", JSON.stringify(req.query));

  try {
    const { section_type, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const now = new Date();

    const query = {
      is_active: true,
      $or: [{ starts_at: null }, { starts_at: { $lte: now } }],
      $and: [{ $or: [{ ends_at: null }, { ends_at: { $gte: now } }] }],
    };

    if (section_type) {
      query.section_type = section_type;
    }

    const [sections, total] = await Promise.all([
      HomepageSection.find(query)
        .select("-created_by_id")
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      HomepageSection.countDocuments(query),
    ]);

    console.log(`> Retrieved ${sections.length} active sections`);

    return sendResponse(res, HTTP_STATUS.OK, "Sections retrieved successfully", {
      sections,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.log("Error in getActiveSections:", error.message);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve sections",
      null,
      error.message
    );
  }
};

// ============================================================
// ADMIN CONTROLLERS
// ============================================================

// GET /admin/homepage-sections - List all sections
const listAllSections = async (req, res) => {
  console.log("> GET /admin/homepage-sections");
  console.log("Query:", JSON.stringify(req.query));

  try {
    const {
      section_type,
      is_active,
      status,
      search,
      page = 1,
      limit = 20,
    } = req.query;
    const skip = (page - 1) * limit;

    const query = {};

    if (section_type) {
      query.section_type = section_type;
    }

    if (typeof is_active !== "undefined") {
      query.is_active = is_active === "true" || is_active === true;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { heading: { $regex: search, $options: "i" } },
      ];
    }

    const [sections, total] = await Promise.all([
      HomepageSection.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      HomepageSection.countDocuments(query),
    ]);

    // Add computed status and filter by status if provided
    let sectionsWithStatus = sections.map((section) => ({
      ...section,
      status: computeSectionStatus(section),
    }));

    if (status) {
      sectionsWithStatus = sectionsWithStatus.filter(
        (section) => section.status === status
      );
    }

    console.log(`> Retrieved ${sectionsWithStatus.length} sections`);

    return sendResponse(res, HTTP_STATUS.OK, "Sections retrieved successfully", {
      sections: sectionsWithStatus,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: status ? sectionsWithStatus.length : total,
        pages: Math.ceil(
          (status ? sectionsWithStatus.length : total) / limit
        ),
      },
    });
  } catch (error) {
    console.log("Error in listAllSections:", error.message);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve sections",
      null,
      error.message
    );
  }
};

// GET /admin/homepage-sections/:id - Get section by ID
const getSectionById = async (req, res) => {
  console.log("> GET /admin/homepage-sections/:id");
  console.log("ID:", req.params.id);

  try {
    const section = await HomepageSection.findById(req.params.id).lean();

    if (!section) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Section not found",
        null,
        "No section found with the provided ID"
      );
    }

    console.log(`> Section retrieved: ${section.name}`);

    return sendResponse(res, HTTP_STATUS.OK, "Section retrieved successfully", {
      ...section,
      status: computeSectionStatus(section),
    });
  } catch (error) {
    console.log("Error in getSectionById:", error.message);
    console.log(error.stack);

    if (error.name === "CastError") {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Invalid section ID format",
        null,
        error.message
      );
    }

    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve section",
      null,
      error.message
    );
  }
};

// GET /admin/homepage-sections/by-name/:name - Get section by name
const getSectionByName = async (req, res) => {
  console.log("> GET /admin/homepage-sections/by-name/:name");
  console.log("Name:", req.params.name);

  try {
    const section = await HomepageSection.findOne({
      name: req.params.name,
    }).lean();

    if (!section) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Section not found",
        null,
        `No section found with name: ${req.params.name}`
      );
    }

    console.log(`> Section retrieved by name: ${section.name} (${section._id})`);

    return sendResponse(res, HTTP_STATUS.OK, "Section retrieved successfully", {
      ...section,
      status: computeSectionStatus(section),
    });
  } catch (error) {
    console.log("Error in getSectionByName:", error.message);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve section",
      null,
      error.message
    );
  }
};

// POST /admin/homepage-sections - Create new section
const createSection = async (req, res) => {
  console.log("> POST /admin/homepage-sections");
  console.log("Body:", JSON.stringify(req.body, null, 2));

  try {
    const adminId = req.headers["x-admin-id"];

    const sectionData = {
      ...req.body,
      created_by_id: adminId || null,
    };

    const section = await HomepageSection.create(sectionData);

    console.log(`> Section created: ${section.name} (${section._id})`);

    return sendResponse(
      res,
      HTTP_STATUS.CREATED,
      "Section created successfully",
      {
        ...section.toObject(),
        status: computeSectionStatus(section),
      }
    );
  } catch (error) {
    console.log("Error in createSection:", error.message);
    console.log(error.stack);

    // Handle duplicate name error
    if (error.code === 11000) {
      return sendResponse(
        res,
        HTTP_STATUS.CONFLICT,
        "Section name already exists",
        null,
        "A section with this name already exists. Please use a unique name."
      );
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Validation failed",
        null,
        error.message
      );
    }

    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create section",
      null,
      error.message
    );
  }
};

// PUT /admin/homepage-sections/:id - Update section
const updateSection = async (req, res) => {
  console.log("> PUT /admin/homepage-sections/:id");
  console.log("ID:", req.params.id);
  console.log("Body:", JSON.stringify(req.body, null, 2));

  try {
    const section = await HomepageSection.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    if (!section) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Section not found",
        null,
        "No section found with the provided ID"
      );
    }

    console.log(`> Section updated: ${section.name} (${section._id})`);

    return sendResponse(res, HTTP_STATUS.OK, "Section updated successfully", {
      ...section,
      status: computeSectionStatus(section),
    });
  } catch (error) {
    console.log("Error in updateSection:", error.message);
    console.log(error.stack);

    if (error.code === 11000) {
      return sendResponse(
        res,
        HTTP_STATUS.CONFLICT,
        "Section name already exists",
        null,
        "A section with this name already exists. Please use a unique name."
      );
    }

    if (error.name === "CastError") {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Invalid section ID format",
        null,
        error.message
      );
    }

    if (error.name === "ValidationError") {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Validation failed",
        null,
        error.message
      );
    }

    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update section",
      null,
      error.message
    );
  }
};

// DELETE /admin/homepage-sections/:id - Delete section
const deleteSection = async (req, res) => {
  console.log("> DELETE /admin/homepage-sections/:id");
  console.log("ID:", req.params.id);

  try {
    const section = await HomepageSection.findByIdAndDelete(req.params.id);

    if (!section) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Section not found",
        null,
        "No section found with the provided ID"
      );
    }

    console.log(`> Section deleted: ${section.name} (${section._id})`);

    return sendResponse(res, HTTP_STATUS.OK, "Section deleted successfully");
  } catch (error) {
    console.log("Error in deleteSection:", error.message);
    console.log(error.stack);

    if (error.name === "CastError") {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Invalid section ID format",
        null,
        error.message
      );
    }

    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to delete section",
      null,
      error.message
    );
  }
};

// PATCH /admin/homepage-sections/:id/activate - Activate section
const activateSection = async (req, res) => {
  console.log("> PATCH /admin/homepage-sections/:id/activate");
  console.log("ID:", req.params.id);

  try {
    const section = await HomepageSection.findByIdAndUpdate(
      req.params.id,
      { is_active: true },
      { new: true }
    ).lean();

    if (!section) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Section not found",
        null,
        "No section found with the provided ID"
      );
    }

    console.log(`> Section activated: ${section.name} (${section._id})`);

    return sendResponse(res, HTTP_STATUS.OK, "Section activated successfully", {
      ...section,
      status: computeSectionStatus(section),
    });
  } catch (error) {
    console.log("Error in activateSection:", error.message);
    console.log(error.stack);

    if (error.name === "CastError") {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Invalid section ID format",
        null,
        error.message
      );
    }

    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to activate section",
      null,
      error.message
    );
  }
};

// PATCH /admin/homepage-sections/:id/deactivate - Deactivate section
const deactivateSection = async (req, res) => {
  console.log("> PATCH /admin/homepage-sections/:id/deactivate");
  console.log("ID:", req.params.id);

  try {
    const section = await HomepageSection.findByIdAndUpdate(
      req.params.id,
      { is_active: false },
      { new: true }
    ).lean();

    if (!section) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Section not found",
        null,
        "No section found with the provided ID"
      );
    }

    console.log(`> Section deactivated: ${section.name} (${section._id})`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Section deactivated successfully",
      {
        ...section,
        status: computeSectionStatus(section),
      }
    );
  } catch (error) {
    console.log("Error in deactivateSection:", error.message);
    console.log(error.stack);

    if (error.name === "CastError") {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Invalid section ID format",
        null,
        error.message
      );
    }

    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to deactivate section",
      null,
      error.message
    );
  }
};

export default {
  // Consumer
  getActiveSections,

  // Admin
  listAllSections,
  getSectionById,
  getSectionByName,
  createSection,
  updateSection,
  deleteSection,
  activateSection,
  deactivateSection,
};
