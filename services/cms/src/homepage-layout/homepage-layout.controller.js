import { sendResponse, HTTP_STATUS } from "@shared/utils";
import HomepageLayout from "../../models/homepage-layout.model.js";

// Helper: Compute layout status based on dates and is_active
const computeLayoutStatus = (layout) => {
  if (!layout.is_active) return "inactive";

  const now = new Date();
  if (layout.starts_at && new Date(layout.starts_at) > now) return "scheduled";
  if (layout.ends_at && new Date(layout.ends_at) < now) return "expired";

  return "active";
};

// ============================================================
// CONSUMER CONTROLLERS
// ============================================================

// GET /homepage-layout - Get active layout with all sections
const getActiveLayout = async (req, res) => {
  console.log("> GET /homepage-layout");

  try {
    const now = new Date();

    const layout = await HomepageLayout.findOne({
      is_active: true,
      $or: [{ starts_at: null }, { starts_at: { $lte: now } }],
      $and: [{ $or: [{ ends_at: null }, { ends_at: { $gte: now } }] }],
    })
      .populate({
        path: "sections.reference_id",
        // Dynamically populate based on reference_model
      })
      .lean();

    if (!layout) {
      console.log("> No active layout found");
      return sendResponse(
        res,
        HTTP_STATUS.OK,
        "No active layout found",
        {
          layout: null,
          sections: [],
        }
      );
    }

    // Filter visible sections and sort by sort_order
    const visibleSections = layout.sections
      .filter((section) => section.is_visible)
      .sort((a, b) => a.sort_order - b.sort_order);

    console.log(
      `> Active layout retrieved: ${layout.name} with ${visibleSections.length} visible sections`
    );

    return sendResponse(res, HTTP_STATUS.OK, "Layout retrieved successfully", {
      layout: {
        _id: layout._id,
        name: layout.name,
        version: layout.version,
      },
      sections: visibleSections,
    });
  } catch (error) {
    console.log("Error in getActiveLayout:", error.message);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve layout",
      null,
      error.message
    );
  }
};

// ============================================================
// ADMIN CONTROLLERS
// ============================================================

// GET /admin/homepage-layout - Get current layout (admin view)
const getLayout = async (req, res) => {
  console.log("> GET /admin/homepage-layout");

  try {
    // Get the most recent active layout, or the latest inactive one
    const layout = await HomepageLayout.findOne({ is_active: true })
      .populate({
        path: "sections.reference_id",
      })
      .lean();

    if (!layout) {
      // If no active layout, get the most recent one
      const latestLayout = await HomepageLayout.findOne()
        .sort({ created_at: -1 })
        .populate({
          path: "sections.reference_id",
        })
        .lean();

      if (!latestLayout) {
        console.log("> No layouts found");
        return sendResponse(res, HTTP_STATUS.OK, "No layouts found", {
          layout: null,
        });
      }

      console.log(
        `> Latest layout retrieved: ${latestLayout.name} (inactive)`
      );
      return sendResponse(res, HTTP_STATUS.OK, "Layout retrieved successfully", {
        ...latestLayout,
        status: computeLayoutStatus(latestLayout),
      });
    }

    console.log(`> Active layout retrieved: ${layout.name}`);

    return sendResponse(res, HTTP_STATUS.OK, "Layout retrieved successfully", {
      ...layout,
      status: computeLayoutStatus(layout),
    });
  } catch (error) {
    console.log("Error in getLayout:", error.message);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve layout",
      null,
      error.message
    );
  }
};

// PUT /admin/homepage-layout - Update layout
const updateLayout = async (req, res) => {
  console.log("> PUT /admin/homepage-layout");
  console.log("Body:", JSON.stringify(req.body, null, 2));

  try {
    const adminId = req.headers["x-admin-id"];

    // Find the active layout or create new one
    let layout = await HomepageLayout.findOne({ is_active: true });

    if (layout) {
      // Update existing layout
      Object.assign(layout, req.body);
      await layout.save();
      console.log(`> Layout updated: ${layout.name} (${layout._id})`);
    } else {
      // Create new layout
      const layoutData = {
        ...req.body,
        is_active: true,
        version: 1,
        created_by_id: adminId || null,
      };
      layout = await HomepageLayout.create(layoutData);
      console.log(`> Layout created: ${layout.name} (${layout._id})`);
    }

    // Populate references for response
    const populatedLayout = await HomepageLayout.findById(layout._id)
      .populate({
        path: "sections.reference_id",
      })
      .lean();

    return sendResponse(res, HTTP_STATUS.OK, "Layout updated successfully", {
      ...populatedLayout,
      status: computeLayoutStatus(populatedLayout),
    });
  } catch (error) {
    console.log("Error in updateLayout:", error.message);
    console.log(error.stack);

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
      "Failed to update layout",
      null,
      error.message
    );
  }
};

// POST /admin/homepage-layout/publish - Publish layout (activate)
const publishLayout = async (req, res) => {
  console.log("> POST /admin/homepage-layout/publish");

  try {
    const layout = await HomepageLayout.findOne({ is_active: true });

    if (!layout) {
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "No active layout to publish",
        null,
        "Please create or update a layout first"
      );
    }

    // The pre-save hook in the model already ensures only one active layout
    // So we just need to make sure this one is marked as active
    layout.is_active = true;
    await layout.save();

    console.log(`> Layout published: ${layout.name} (${layout._id})`);

    return sendResponse(res, HTTP_STATUS.OK, "Layout published successfully", {
      _id: layout._id,
      name: layout.name,
      version: layout.version,
      is_active: layout.is_active,
    });
  } catch (error) {
    console.log("Error in publishLayout:", error.message);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to publish layout",
      null,
      error.message
    );
  }
};

// GET /admin/homepage-layout/versions - Get all layout versions
const getLayoutVersions = async (req, res) => {
  console.log("> GET /admin/homepage-layout/versions");

  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const [layouts, total] = await Promise.all([
      HomepageLayout.find()
        .select("name version is_active created_at updated_at")
        .sort({ version: -1, created_at: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      HomepageLayout.countDocuments(),
    ]);

    const layoutsWithStatus = layouts.map((layout) => ({
      ...layout,
      status: computeLayoutStatus(layout),
    }));

    console.log(`> Retrieved ${layouts.length} layout versions`);

    return sendResponse(res, HTTP_STATUS.OK, "Layout versions retrieved successfully", {
      layouts: layoutsWithStatus,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.log("Error in getLayoutVersions:", error.message);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve layout versions",
      null,
      error.message
    );
  }
};

export default {
  // Consumer
  getActiveLayout,

  // Admin
  getLayout,
  updateLayout,
  publishLayout,
  getLayoutVersions,
};
