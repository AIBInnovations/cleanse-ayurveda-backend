import Joi from "joi";

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

export const subscribeSchema = {
  body: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
    popup_id: objectId.allow(null),
    source: Joi.string().valid("popup", "footer", "page").default("footer"),
    metadata: Joi.object({
      user_agent: Joi.string().allow(null, ""),
      ip_address: Joi.string().allow(null, ""),
      page_url: Joi.string().uri().allow(null, ""),
    }).allow(null),
  }),
};

export const unsubscribeSchema = {
  body: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
  }),
};

export const adminListQuerySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    is_subscribed: Joi.boolean(),
    source: Joi.string().valid("popup", "footer", "page"),
    search: Joi.string().trim().allow(""),
  }),
};

export const getSubscriberByIdSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid subscriber ID format",
      "any.required": "Subscriber ID is required",
    }),
  }),
};

export const deleteSubscriberSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid subscriber ID format",
      "any.required": "Subscriber ID is required",
    }),
  }),
};

export default {
  subscribeSchema,
  unsubscribeSchema,
  adminListQuerySchema,
  getSubscriberByIdSchema,
  deleteSubscriberSchema,
};
