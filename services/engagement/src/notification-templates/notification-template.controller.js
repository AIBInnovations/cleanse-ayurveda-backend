import NotificationTemplate from "../../models/notification-template.model.js";
import { sendResponse } from "@shared/utils";
import { parsePagination, buildPaginationMeta } from "../../services/pagination.service.js";

/**
 * Helper to replace variables in template
 */
const replaceVariables = (template, variables) => {
  if (!template) return null;

  let result = { ...template };

  if (result.subject) {
    Object.keys(variables).forEach((key) => {
      result.subject = result.subject.replace(new RegExp(`{{${key}}}`, "g"), variables[key]);
    });
  }

  if (result.body) {
    Object.keys(variables).forEach((key) => {
      result.body = result.body.replace(new RegExp(`{{${key}}}`, "g"), variables[key]);
    });
  }

  return result;
};

/**
 * @route GET /api/admin/notification-templates
 * @description List all notification templates (admin)
 * @access Admin
 */
export const listTemplates = async (req, res) => {
  console.log("> GET /api/admin/notification-templates");

  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.channel) {
      filter.channels = req.query.channel;
    }

    if (req.query.isActive === "true") {
      filter.isActive = true;
    } else if (req.query.isActive === "false") {
      filter.isActive = false;
    }

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { code: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const sortField = req.query.sortBy || "createdAt";
    const sortOrder = req.query.order === "asc" ? 1 : -1;
    const sortOptions = { [sortField]: sortOrder };

    const [templates, total] = await Promise.all([
      NotificationTemplate.find(filter)
        .select("code name category channels isActive createdAt")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      NotificationTemplate.countDocuments(filter),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    console.log(`> Found ${templates.length} of ${total} templates`);
    return sendResponse(res, 200, "Templates fetched successfully", { templates, pagination }, null);
  } catch (error) {
    console.log("> Error fetching templates:", error.message);
    return sendResponse(res, 500, "Failed to fetch templates", null, error.message);
  }
};

/**
 * @route POST /api/admin/notification-templates
 * @description Create a notification template (admin)
 * @access Admin
 */
export const createTemplate = async (req, res) => {
  console.log("> POST /api/admin/notification-templates");

  try {
    const {
      code,
      name,
      category,
      channels,
      templates,
      variables,
      isActive,
      description,
    } = req.body;

    // Check if code already exists
    const existingTemplate = await NotificationTemplate.findOne({ code });
    if (existingTemplate) {
      console.log(`> Template already exists: ${code}`);
      return sendResponse(res, 409, "Template already exists", null, `A template with code '${code}' already exists`);
    }

    const template = new NotificationTemplate({
      code,
      name,
      category,
      channels,
      templates,
      variables: variables || [],
      isActive: isActive !== undefined ? isActive : true,
      description: description || null,
    });

    await template.save();

    console.log(`> Template created: ${template.code} (${template._id})`);
    return sendResponse(res, 201, "Template created successfully", { template }, null);
  } catch (error) {
    console.log("> Error creating template:", error.message);
    return sendResponse(res, 500, "Failed to create template", null, error.message);
  }
};

/**
 * @route GET /api/admin/notification-templates/:id
 * @description Get template by ID (admin)
 * @access Admin
 */
export const getTemplateById = async (req, res) => {
  const { id } = req.params;
  console.log(`> GET /api/admin/notification-templates/${id}`);

  try {
    const template = await NotificationTemplate.findById(id).lean();

    if (!template) {
      console.log(`> Template not found: ${id}`);
      return sendResponse(res, 404, "Template not found", null, `Template with ID '${id}' not found`);
    }

    console.log(`> Template found: ${template.code}`);
    return sendResponse(res, 200, "Template fetched successfully", { template }, null);
  } catch (error) {
    console.log("> Error fetching template:", error.message);
    return sendResponse(res, 500, "Failed to fetch template", null, error.message);
  }
};

/**
 * @route PUT /api/admin/notification-templates/:id
 * @description Update a template (admin)
 * @access Admin
 */
export const updateTemplate = async (req, res) => {
  const { id } = req.params;
  console.log(`> PUT /api/admin/notification-templates/${id}`);

  try {
    const template = await NotificationTemplate.findById(id);

    if (!template) {
      console.log(`> Template not found: ${id}`);
      return sendResponse(res, 404, "Template not found", null, `Template with ID '${id}' not found`);
    }

    const {
      code,
      name,
      category,
      channels,
      templates,
      variables,
      description,
    } = req.body;

    // Check code uniqueness if changing
    if (code && code !== template.code) {
      const existingTemplate = await NotificationTemplate.findOne({ code, _id: { $ne: id } });
      if (existingTemplate) {
        console.log(`> Template code already exists: ${code}`);
        return sendResponse(res, 409, "Template code already exists", null, `A template with code '${code}' already exists`);
      }
      template.code = code;
    }

    if (name !== undefined) template.name = name;
    if (category !== undefined) template.category = category;
    if (channels !== undefined) template.channels = channels;
    if (templates !== undefined) template.templates = templates;
    if (variables !== undefined) template.variables = variables;
    if (description !== undefined) template.description = description;

    await template.save();

    console.log(`> Template updated: ${template.code}`);
    return sendResponse(res, 200, "Template updated successfully", { template }, null);
  } catch (error) {
    console.log("> Error updating template:", error.message);
    return sendResponse(res, 500, "Failed to update template", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/notification-templates/:id/activate
 * @description Activate a template (admin)
 * @access Admin
 */
export const activateTemplate = async (req, res) => {
  const { id } = req.params;
  console.log(`> PATCH /api/admin/notification-templates/${id}/activate`);

  try {
    const template = await NotificationTemplate.findById(id);

    if (!template) {
      console.log(`> Template not found: ${id}`);
      return sendResponse(res, 404, "Template not found", null, `Template with ID '${id}' not found`);
    }

    template.isActive = true;
    await template.save();

    console.log(`> Template activated: ${template.code}`);
    return sendResponse(res, 200, "Template activated successfully", { template }, null);
  } catch (error) {
    console.log("> Error activating template:", error.message);
    return sendResponse(res, 500, "Failed to activate template", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/notification-templates/:id/deactivate
 * @description Deactivate a template (admin)
 * @access Admin
 */
export const deactivateTemplate = async (req, res) => {
  const { id } = req.params;
  console.log(`> PATCH /api/admin/notification-templates/${id}/deactivate`);

  try {
    const template = await NotificationTemplate.findById(id);

    if (!template) {
      console.log(`> Template not found: ${id}`);
      return sendResponse(res, 404, "Template not found", null, `Template with ID '${id}' not found`);
    }

    template.isActive = false;
    await template.save();

    console.log(`> Template deactivated: ${template.code}`);
    return sendResponse(res, 200, "Template deactivated successfully", { template }, null);
  } catch (error) {
    console.log("> Error deactivating template:", error.message);
    return sendResponse(res, 500, "Failed to deactivate template", null, error.message);
  }
};

/**
 * @route DELETE /api/admin/notification-templates/:id
 * @description Delete a template (admin)
 * @access Admin
 */
export const deleteTemplate = async (req, res) => {
  const { id } = req.params;
  console.log(`> DELETE /api/admin/notification-templates/${id}`);

  try {
    const template = await NotificationTemplate.findById(id);

    if (!template) {
      console.log(`> Template not found: ${id}`);
      return sendResponse(res, 404, "Template not found", null, `Template with ID '${id}' not found`);
    }

    await NotificationTemplate.findByIdAndDelete(id);

    console.log(`> Template deleted: ${template.code}`);
    return sendResponse(res, 200, "Template deleted successfully", null, null);
  } catch (error) {
    console.log("> Error deleting template:", error.message);
    return sendResponse(res, 500, "Failed to delete template", null, error.message);
  }
};

/**
 * @route POST /api/admin/notification-templates/:id/preview
 * @description Preview a template with variables (admin)
 * @access Admin
 */
export const previewTemplate = async (req, res) => {
  const { id } = req.params;
  const { channel, variables } = req.body;
  console.log(`> POST /api/admin/notification-templates/${id}/preview`);

  try {
    const template = await NotificationTemplate.findById(id).lean();

    if (!template) {
      console.log(`> Template not found: ${id}`);
      return sendResponse(res, 404, "Template not found", null, `Template with ID '${id}' not found`);
    }

    if (!template.channels.includes(channel)) {
      console.log(`> Channel not configured: ${channel}`);
      return sendResponse(res, 400, "Channel not configured", null, `Channel '${channel}' is not configured for this template`);
    }

    const channelTemplate = template.templates[channel];
    if (!channelTemplate) {
      console.log(`> No template content for channel: ${channel}`);
      return sendResponse(res, 400, "No template content", null, `No content defined for channel '${channel}'`);
    }

    const preview = replaceVariables(channelTemplate, variables || {});

    console.log(`> Template preview generated for ${template.code}`);
    return sendResponse(res, 200, "Preview generated successfully", {
      preview,
      unreplacedVariables: template.variables.filter((v) => !variables || !variables[v]),
    }, null);
  } catch (error) {
    console.log("> Error generating preview:", error.message);
    return sendResponse(res, 500, "Failed to generate preview", null, error.message);
  }
};

export default {
  listTemplates,
  createTemplate,
  getTemplateById,
  updateTemplate,
  activateTemplate,
  deactivateTemplate,
  deleteTemplate,
  previewTemplate,
};
