import { sendResponse, HTTP_STATUS } from "@shared/utils";
import NavigationMenu from "../../models/navigation-menu.model.js";

// ============================================================
// CONSUMER CONTROLLERS
// ============================================================

// GET /navigation - Get all active navigation menus
const getActiveMenus = async (req, res) => {
  console.log("getActiveMenus called with query:", req.query);

  const { location } = req.query;

  const query = { is_active: true };

  if (location) {
    query.location = location;
  }

  const menus = await NavigationMenu.find(query)
    .select("name location items")
    .sort({ created_at: 1 })
    .lean();

  return sendResponse(res, HTTP_STATUS.OK, "Navigation menus retrieved successfully", menus);
};

// ============================================================
// ADMIN CONTROLLERS
// ============================================================

// GET /admin/navigation - List all navigation menus
const listAllMenus = async (req, res) => {
  console.log("listAllMenus called with query:", req.query);

  const { location, is_active, search, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const query = {};

  if (location) {
    query.location = location;
  }

  if (typeof is_active === "boolean") {
    query.is_active = is_active;
  }

  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  const [menus, total] = await Promise.all([
    NavigationMenu.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
    NavigationMenu.countDocuments(query),
  ]);

  return sendResponse(res, HTTP_STATUS.OK, "Navigation menus retrieved successfully", {
    menus,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

// GET /admin/navigation/:id - Get navigation menu by ID
const getMenuById = async (req, res) => {
  console.log("getMenuById called with id:", req.params.id);

  const menu = await NavigationMenu.findById(req.params.id).lean();

  if (!menu) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Navigation menu not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Navigation menu retrieved successfully", menu);
};

// POST /admin/navigation - Create new navigation menu
const createMenu = async (req, res) => {
  console.log("createMenu called with body:", req.body);

  // Check if location already exists
  const existingMenu = await NavigationMenu.findOne({ location: req.body.location });
  if (existingMenu) {
    return sendResponse(res, HTTP_STATUS.CONFLICT, `A menu already exists for location: ${req.body.location}`);
  }

  const menu = await NavigationMenu.create(req.body);

  return sendResponse(res, HTTP_STATUS.CREATED, "Navigation menu created successfully", menu.toObject());
};

// PUT /admin/navigation/:id - Update navigation menu
const updateMenu = async (req, res) => {
  console.log("updateMenu called with id:", req.params.id, "body:", req.body);

  // If changing location, check it doesn't already exist
  if (req.body.location) {
    const existingMenu = await NavigationMenu.findOne({
      location: req.body.location,
      _id: { $ne: req.params.id },
    });
    if (existingMenu) {
      return sendResponse(res, HTTP_STATUS.CONFLICT, `A menu already exists for location: ${req.body.location}`);
    }
  }

  const menu = await NavigationMenu.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).lean();

  if (!menu) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Navigation menu not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Navigation menu updated successfully", menu);
};

// PATCH /admin/navigation/:id/activate - Activate navigation menu
const activateMenu = async (req, res) => {
  console.log("activateMenu called with id:", req.params.id);

  const menu = await NavigationMenu.findByIdAndUpdate(
    req.params.id,
    { is_active: true },
    { new: true }
  ).lean();

  if (!menu) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Navigation menu not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Navigation menu activated successfully", menu);
};

// PATCH /admin/navigation/:id/deactivate - Deactivate navigation menu
const deactivateMenu = async (req, res) => {
  console.log("deactivateMenu called with id:", req.params.id);

  const menu = await NavigationMenu.findByIdAndUpdate(
    req.params.id,
    { is_active: false },
    { new: true }
  ).lean();

  if (!menu) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Navigation menu not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Navigation menu deactivated successfully", menu);
};

// DELETE /admin/navigation/:id - Delete navigation menu
const deleteMenu = async (req, res) => {
  console.log("deleteMenu called with id:", req.params.id);

  const menu = await NavigationMenu.findByIdAndDelete(req.params.id);

  if (!menu) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Navigation menu not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Navigation menu deleted successfully");
};

export default {
  getActiveMenus,
  listAllMenus,
  getMenuById,
  createMenu,
  updateMenu,
  activateMenu,
  deactivateMenu,
  deleteMenu,
};
