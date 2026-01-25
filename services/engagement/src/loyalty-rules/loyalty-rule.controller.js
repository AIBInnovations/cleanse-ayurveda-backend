import LoyaltyRule from "../../models/loyalty-rule.model.js";
import { sendResponse } from "@shared/utils";
import { parsePagination, buildPaginationMeta } from "../../services/pagination.service.js";

/**
 * @route GET /api/admin/loyalty/rules
 * @description List all loyalty rules (admin)
 * @access Admin
 */
export const listRules = async (req, res) => {
  console.log("> GET /api/admin/loyalty/rules");

  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};

    if (req.query.ruleType) {
      filter.ruleType = req.query.ruleType;
    }

    if (req.query.actionType) {
      filter.actionType = req.query.actionType;
    }

    if (req.query.isActive === "true") {
      filter.isActive = true;
    } else if (req.query.isActive === "false") {
      filter.isActive = false;
    }

    const sortField = req.query.sortBy || "createdAt";
    const sortOrder = req.query.order === "asc" ? 1 : -1;
    const sortOptions = { [sortField]: sortOrder };

    const [rules, total] = await Promise.all([
      LoyaltyRule.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      LoyaltyRule.countDocuments(filter),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    console.log(`> Found ${rules.length} of ${total} rules`);
    return sendResponse(res, 200, "Rules fetched successfully", { rules, pagination }, null);
  } catch (error) {
    console.log("> Error fetching rules:", error.message);
    return sendResponse(res, 500, "Failed to fetch rules", null, error.message);
  }
};

/**
 * @route POST /api/admin/loyalty/rules
 * @description Create a loyalty rule (admin)
 * @access Admin
 */
export const createRule = async (req, res) => {
  console.log("> POST /api/admin/loyalty/rules");

  try {
    const {
      name,
      ruleType,
      actionType,
      pointsValue,
      pointsPerAmount,
      minOrderValue,
      maxPointsPerOrder,
      isActive,
      validFrom,
      validUntil,
      description,
    } = req.body;

    const rule = new LoyaltyRule({
      name,
      ruleType,
      actionType,
      pointsValue,
      pointsPerAmount: pointsPerAmount || null,
      minOrderValue: minOrderValue || 0,
      maxPointsPerOrder: maxPointsPerOrder || null,
      isActive: isActive !== undefined ? isActive : true,
      validFrom: validFrom || null,
      validUntil: validUntil || null,
      description: description || null,
    });

    await rule.save();

    console.log(`> Rule created: ${rule.name} (${rule._id})`);
    return sendResponse(res, 201, "Rule created successfully", { rule }, null);
  } catch (error) {
    console.log("> Error creating rule:", error.message);
    return sendResponse(res, 500, "Failed to create rule", null, error.message);
  }
};

/**
 * @route GET /api/admin/loyalty/rules/:id
 * @description Get rule by ID (admin)
 * @access Admin
 */
export const getRuleById = async (req, res) => {
  const { id } = req.params;
  console.log(`> GET /api/admin/loyalty/rules/${id}`);

  try {
    const rule = await LoyaltyRule.findById(id).lean();

    if (!rule) {
      console.log(`> Rule not found: ${id}`);
      return sendResponse(res, 404, "Rule not found", null, `Rule with ID '${id}' not found`);
    }

    console.log(`> Rule found: ${rule.name}`);
    return sendResponse(res, 200, "Rule fetched successfully", { rule }, null);
  } catch (error) {
    console.log("> Error fetching rule:", error.message);
    return sendResponse(res, 500, "Failed to fetch rule", null, error.message);
  }
};

/**
 * @route PUT /api/admin/loyalty/rules/:id
 * @description Update a rule (admin)
 * @access Admin
 */
export const updateRule = async (req, res) => {
  const { id } = req.params;
  console.log(`> PUT /api/admin/loyalty/rules/${id}`);

  try {
    const rule = await LoyaltyRule.findById(id);

    if (!rule) {
      console.log(`> Rule not found: ${id}`);
      return sendResponse(res, 404, "Rule not found", null, `Rule with ID '${id}' not found`);
    }

    const {
      name,
      ruleType,
      actionType,
      pointsValue,
      pointsPerAmount,
      minOrderValue,
      maxPointsPerOrder,
      validFrom,
      validUntil,
      description,
    } = req.body;

    if (name !== undefined) rule.name = name;
    if (ruleType !== undefined) rule.ruleType = ruleType;
    if (actionType !== undefined) rule.actionType = actionType;
    if (pointsValue !== undefined) rule.pointsValue = pointsValue;
    if (pointsPerAmount !== undefined) rule.pointsPerAmount = pointsPerAmount;
    if (minOrderValue !== undefined) rule.minOrderValue = minOrderValue;
    if (maxPointsPerOrder !== undefined) rule.maxPointsPerOrder = maxPointsPerOrder;
    if (validFrom !== undefined) rule.validFrom = validFrom;
    if (validUntil !== undefined) rule.validUntil = validUntil;
    if (description !== undefined) rule.description = description;

    await rule.save();

    console.log(`> Rule updated: ${rule.name}`);
    return sendResponse(res, 200, "Rule updated successfully", { rule }, null);
  } catch (error) {
    console.log("> Error updating rule:", error.message);
    return sendResponse(res, 500, "Failed to update rule", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/loyalty/rules/:id/activate
 * @description Activate a rule (admin)
 * @access Admin
 */
export const activateRule = async (req, res) => {
  const { id } = req.params;
  console.log(`> PATCH /api/admin/loyalty/rules/${id}/activate`);

  try {
    const rule = await LoyaltyRule.findById(id);

    if (!rule) {
      console.log(`> Rule not found: ${id}`);
      return sendResponse(res, 404, "Rule not found", null, `Rule with ID '${id}' not found`);
    }

    rule.isActive = true;
    await rule.save();

    console.log(`> Rule activated: ${rule.name}`);
    return sendResponse(res, 200, "Rule activated successfully", { rule }, null);
  } catch (error) {
    console.log("> Error activating rule:", error.message);
    return sendResponse(res, 500, "Failed to activate rule", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/loyalty/rules/:id/deactivate
 * @description Deactivate a rule (admin)
 * @access Admin
 */
export const deactivateRule = async (req, res) => {
  const { id } = req.params;
  console.log(`> PATCH /api/admin/loyalty/rules/${id}/deactivate`);

  try {
    const rule = await LoyaltyRule.findById(id);

    if (!rule) {
      console.log(`> Rule not found: ${id}`);
      return sendResponse(res, 404, "Rule not found", null, `Rule with ID '${id}' not found`);
    }

    rule.isActive = false;
    await rule.save();

    console.log(`> Rule deactivated: ${rule.name}`);
    return sendResponse(res, 200, "Rule deactivated successfully", { rule }, null);
  } catch (error) {
    console.log("> Error deactivating rule:", error.message);
    return sendResponse(res, 500, "Failed to deactivate rule", null, error.message);
  }
};

/**
 * @route DELETE /api/admin/loyalty/rules/:id
 * @description Delete a rule (admin)
 * @access Admin
 */
export const deleteRule = async (req, res) => {
  const { id } = req.params;
  console.log(`> DELETE /api/admin/loyalty/rules/${id}`);

  try {
    const rule = await LoyaltyRule.findById(id);

    if (!rule) {
      console.log(`> Rule not found: ${id}`);
      return sendResponse(res, 404, "Rule not found", null, `Rule with ID '${id}' not found`);
    }

    await LoyaltyRule.findByIdAndDelete(id);

    console.log(`> Rule deleted: ${rule.name}`);
    return sendResponse(res, 200, "Rule deleted successfully", null, null);
  } catch (error) {
    console.log("> Error deleting rule:", error.message);
    return sendResponse(res, 500, "Failed to delete rule", null, error.message);
  }
};

export default {
  listRules,
  createRule,
  getRuleById,
  updateRule,
  activateRule,
  deactivateRule,
  deleteRule,
};
