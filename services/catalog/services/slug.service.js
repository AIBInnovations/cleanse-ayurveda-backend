/**
 * Generates a URL-friendly slug from a string
 * @param {string} text - The text to convert to slug
 * @returns {string} - URL-friendly slug
 */
export const generateSlug = (text) => {
  if (!text) return "";

  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

/**
 * Generates a unique slug by appending a number if slug already exists
 * @param {string} baseSlug - The base slug to check
 * @param {object} Model - Mongoose model to check against
 * @param {string|null} excludeId - ID to exclude from check (for updates)
 * @returns {Promise<string>} - Unique slug
 */
export const generateUniqueSlug = async (baseSlug, Model, excludeId = null) => {
  let slug = baseSlug;
  let counter = 1;
  let exists = true;

  while (exists) {
    const query = { slug, deletedAt: null };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existing = await Model.findOne(query);
    if (!existing) {
      exists = false;
    } else {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  return slug;
};

export default {
  generateSlug,
  generateUniqueSlug,
};
