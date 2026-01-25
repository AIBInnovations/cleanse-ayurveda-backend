import LoyaltyTier from "../../models/loyalty-tier.model.js";
import LoyaltyAccount from "../../models/loyalty-account.model.js";
import { sendResponse } from "@shared/utils";
import { parsePagination, buildPaginationMeta } from "../../services/pagination.service.js";

/**
 * @route GET /api/loyalty/tiers
 * @description Get active loyalty tiers (consumer)
 * @access Public
 */
export const getActiveTiers = async (req, res) => {
  console.log("> GET /api/loyalty/tiers");

  try {
    const tiers = await LoyaltyTier.find({ isActive: true })
      .select("name displayName minPoints minSpend pointsMultiplier benefits color icon")
      .sort({ sortOrder: 1, minPoints: 1 })
      .lean();

    console.log(`> Found ${tiers.length} active tiers`);
    return sendResponse(res, 200, "Tiers fetched successfully", { tiers }, null);
  } catch (error) {
    console.log("> Error fetching tiers:", error.message);
    return sendResponse(res, 500, "Failed to fetch tiers", null, error.message);
  }
};

/**
 * @route GET /api/loyalty/tiers/my-tier
 * @description Get user's current tier (consumer)
 * @access Auth
 */
export const getMyTier = async (req, res) => {
  const userId = req.user._id;
  console.log(`> GET /api/loyalty/tiers/my-tier for user ${userId}`);

  try {
    const account = await LoyaltyAccount.findOne({ user: userId })
      .populate("tier", "name displayName minPoints pointsMultiplier benefits color icon")
      .lean();

    if (!account) {
      // Return default tier info
      const defaultTier = await LoyaltyTier.findOne({ isActive: true })
        .sort({ minPoints: 1 })
        .select("name displayName minPoints pointsMultiplier benefits color icon")
        .lean();

      console.log(`> No account found, returning default tier`);
      return sendResponse(res, 200, "Tier info fetched successfully", {
        currentTier: defaultTier,
        pointsBalance: 0,
        nextTier: null,
        pointsToNextTier: defaultTier ? null : 0,
      }, null);
    }

    // Find next tier
    let nextTier = null;
    let pointsToNextTier = null;

    if (account.tier) {
      nextTier = await LoyaltyTier.findOne({
        isActive: true,
        minPoints: { $gt: account.tier.minPoints },
      })
        .sort({ minPoints: 1 })
        .select("name displayName minPoints color icon")
        .lean();

      if (nextTier) {
        pointsToNextTier = nextTier.minPoints - account.pointsEarnedLifetime;
      }
    }

    console.log(`> User tier: ${account.tier?.name || 'none'}`);
    return sendResponse(res, 200, "Tier info fetched successfully", {
      currentTier: account.tier,
      pointsBalance: account.pointsBalance,
      pointsEarnedLifetime: account.pointsEarnedLifetime,
      nextTier,
      pointsToNextTier,
    }, null);
  } catch (error) {
    console.log("> Error fetching user tier:", error.message);
    return sendResponse(res, 500, "Failed to fetch tier info", null, error.message);
  }
};

/**
 * @route GET /api/admin/loyalty/tiers
 * @description List all tiers (admin)
 * @access Admin
 */
export const listTiers = async (req, res) => {
  console.log("> GET /api/admin/loyalty/tiers");

  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};

    if (req.query.isActive === "true") {
      filter.isActive = true;
    } else if (req.query.isActive === "false") {
      filter.isActive = false;
    }

    const sortField = req.query.sortBy || "sortOrder";
    const sortOrder = req.query.order === "desc" ? -1 : 1;
    const sortOptions = { [sortField]: sortOrder };

    const [tiers, total] = await Promise.all([
      LoyaltyTier.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      LoyaltyTier.countDocuments(filter),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    console.log(`> Found ${tiers.length} of ${total} tiers`);
    return sendResponse(res, 200, "Tiers fetched successfully", { tiers, pagination }, null);
  } catch (error) {
    console.log("> Error fetching tiers:", error.message);
    return sendResponse(res, 500, "Failed to fetch tiers", null, error.message);
  }
};

/**
 * @route POST /api/admin/loyalty/tiers
 * @description Create a loyalty tier (admin)
 * @access Admin
 */
export const createTier = async (req, res) => {
  console.log("> POST /api/admin/loyalty/tiers");

  try {
    const {
      name,
      displayName,
      minPoints,
      minSpend,
      pointsMultiplier,
      benefits,
      sortOrder,
      isActive,
      color,
      icon,
    } = req.body;

    // Check if tier name already exists
    const existingTier = await LoyaltyTier.findOne({ name });
    if (existingTier) {
      console.log(`> Tier already exists: ${name}`);
      return sendResponse(res, 409, "Tier already exists", null, `A tier with name '${name}' already exists`);
    }

    const tier = new LoyaltyTier({
      name,
      displayName,
      minPoints,
      minSpend: minSpend || 0,
      pointsMultiplier: pointsMultiplier || 1,
      benefits: benefits || [],
      sortOrder: sortOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
      color: color || null,
      icon: icon || null,
    });

    await tier.save();

    console.log(`> Tier created: ${tier.name} (${tier._id})`);
    return sendResponse(res, 201, "Tier created successfully", { tier }, null);
  } catch (error) {
    console.log("> Error creating tier:", error.message);
    return sendResponse(res, 500, "Failed to create tier", null, error.message);
  }
};

/**
 * @route GET /api/admin/loyalty/tiers/:id
 * @description Get tier by ID (admin)
 * @access Admin
 */
export const getTierById = async (req, res) => {
  const { id } = req.params;
  console.log(`> GET /api/admin/loyalty/tiers/${id}`);

  try {
    const tier = await LoyaltyTier.findById(id).lean();

    if (!tier) {
      console.log(`> Tier not found: ${id}`);
      return sendResponse(res, 404, "Tier not found", null, `Tier with ID '${id}' not found`);
    }

    // Get member count for this tier
    const memberCount = await LoyaltyAccount.countDocuments({ tier: id });

    console.log(`> Tier found: ${tier.name}`);
    return sendResponse(res, 200, "Tier fetched successfully", { tier, memberCount }, null);
  } catch (error) {
    console.log("> Error fetching tier:", error.message);
    return sendResponse(res, 500, "Failed to fetch tier", null, error.message);
  }
};

/**
 * @route PUT /api/admin/loyalty/tiers/:id
 * @description Update a tier (admin)
 * @access Admin
 */
export const updateTier = async (req, res) => {
  const { id } = req.params;
  console.log(`> PUT /api/admin/loyalty/tiers/${id}`);

  try {
    const tier = await LoyaltyTier.findById(id);

    if (!tier) {
      console.log(`> Tier not found: ${id}`);
      return sendResponse(res, 404, "Tier not found", null, `Tier with ID '${id}' not found`);
    }

    const {
      name,
      displayName,
      minPoints,
      minSpend,
      pointsMultiplier,
      benefits,
      sortOrder,
      color,
      icon,
    } = req.body;

    // Check name uniqueness if changing
    if (name && name !== tier.name) {
      const existingTier = await LoyaltyTier.findOne({ name, _id: { $ne: id } });
      if (existingTier) {
        console.log(`> Tier name already exists: ${name}`);
        return sendResponse(res, 409, "Tier name already exists", null, `A tier with name '${name}' already exists`);
      }
      tier.name = name;
    }

    if (displayName !== undefined) tier.displayName = displayName;
    if (minPoints !== undefined) tier.minPoints = minPoints;
    if (minSpend !== undefined) tier.minSpend = minSpend;
    if (pointsMultiplier !== undefined) tier.pointsMultiplier = pointsMultiplier;
    if (benefits !== undefined) tier.benefits = benefits;
    if (sortOrder !== undefined) tier.sortOrder = sortOrder;
    if (color !== undefined) tier.color = color;
    if (icon !== undefined) tier.icon = icon;

    await tier.save();

    console.log(`> Tier updated: ${tier.name}`);
    return sendResponse(res, 200, "Tier updated successfully", { tier }, null);
  } catch (error) {
    console.log("> Error updating tier:", error.message);
    return sendResponse(res, 500, "Failed to update tier", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/loyalty/tiers/:id/activate
 * @description Activate a tier (admin)
 * @access Admin
 */
export const activateTier = async (req, res) => {
  const { id } = req.params;
  console.log(`> PATCH /api/admin/loyalty/tiers/${id}/activate`);

  try {
    const tier = await LoyaltyTier.findById(id);

    if (!tier) {
      console.log(`> Tier not found: ${id}`);
      return sendResponse(res, 404, "Tier not found", null, `Tier with ID '${id}' not found`);
    }

    tier.isActive = true;
    await tier.save();

    console.log(`> Tier activated: ${tier.name}`);
    return sendResponse(res, 200, "Tier activated successfully", { tier }, null);
  } catch (error) {
    console.log("> Error activating tier:", error.message);
    return sendResponse(res, 500, "Failed to activate tier", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/loyalty/tiers/:id/deactivate
 * @description Deactivate a tier (admin)
 * @access Admin
 */
export const deactivateTier = async (req, res) => {
  const { id } = req.params;
  console.log(`> PATCH /api/admin/loyalty/tiers/${id}/deactivate`);

  try {
    const tier = await LoyaltyTier.findById(id);

    if (!tier) {
      console.log(`> Tier not found: ${id}`);
      return sendResponse(res, 404, "Tier not found", null, `Tier with ID '${id}' not found`);
    }

    tier.isActive = false;
    await tier.save();

    console.log(`> Tier deactivated: ${tier.name}`);
    return sendResponse(res, 200, "Tier deactivated successfully", { tier }, null);
  } catch (error) {
    console.log("> Error deactivating tier:", error.message);
    return sendResponse(res, 500, "Failed to deactivate tier", null, error.message);
  }
};

/**
 * @route DELETE /api/admin/loyalty/tiers/:id
 * @description Delete a tier (admin)
 * @access Admin
 */
export const deleteTier = async (req, res) => {
  const { id } = req.params;
  console.log(`> DELETE /api/admin/loyalty/tiers/${id}`);

  try {
    const tier = await LoyaltyTier.findById(id);

    if (!tier) {
      console.log(`> Tier not found: ${id}`);
      return sendResponse(res, 404, "Tier not found", null, `Tier with ID '${id}' not found`);
    }

    // Check if any accounts are using this tier
    const accountCount = await LoyaltyAccount.countDocuments({ tier: id });
    if (accountCount > 0) {
      console.log(`> Cannot delete tier: ${accountCount} accounts using it`);
      return sendResponse(res, 400, "Cannot delete tier", null, `${accountCount} accounts are currently on this tier. Please migrate them first.`);
    }

    await LoyaltyTier.findByIdAndDelete(id);

    console.log(`> Tier deleted: ${tier.name}`);
    return sendResponse(res, 200, "Tier deleted successfully", null, null);
  } catch (error) {
    console.log("> Error deleting tier:", error.message);
    return sendResponse(res, 500, "Failed to delete tier", null, error.message);
  }
};

export default {
  getActiveTiers,
  getMyTier,
  listTiers,
  createTier,
  getTierById,
  updateTier,
  activateTier,
  deactivateTier,
  deleteTier,
};
