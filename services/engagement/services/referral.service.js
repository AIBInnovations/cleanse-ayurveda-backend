import { customAlphabet } from "nanoid";
import Referral from "../models/referral.model.js";

// Create a custom alphabet for referral codes (uppercase alphanumeric, no confusing chars)
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generateCode = customAlphabet(alphabet, 8);

/**
 * Generates a unique referral code for a user
 * @param {string} userId - User ID to generate code for
 * @returns {Promise<string>} - Unique referral code
 */
export const generateReferralCode = async (userId) => {
  let code;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    code = generateCode();

    // Check if code already exists
    const existing = await Referral.findOne({ referrerCode: code });
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    // Fallback: use user ID hash with timestamp
    const timestamp = Date.now().toString(36).toUpperCase();
    code = `REF${timestamp.slice(-6)}`;
  }

  return code;
};

/**
 * Gets or creates a referral code for a user
 * @param {string} userId - User ID
 * @returns {Promise<{code: string, isNew: boolean}>}
 */
export const getOrCreateReferralCode = async (userId) => {
  // Check if user already has a referral record as referrer
  let referral = await Referral.findOne({ referrer: userId });

  if (referral) {
    return { code: referral.referrerCode, isNew: false };
  }

  // Generate new code
  const code = await generateReferralCode(userId);

  // Create new referral record (without referee yet)
  referral = new Referral({
    referrer: userId,
    referrerCode: code,
    status: "pending",
  });

  await referral.save();

  return { code, isNew: true };
};

/**
 * Validates a referral code
 * @param {string} code - Referral code to validate
 * @returns {Promise<{valid: boolean, referrerId?: string, message?: string}>}
 */
export const validateReferralCode = async (code) => {
  const referral = await Referral.findOne({
    referrerCode: code.toUpperCase(),
  }).populate("referrer", "firstName lastName");

  if (!referral) {
    return { valid: false, message: "Invalid referral code" };
  }

  if (referral.isFlagged) {
    return { valid: false, message: "This referral code is no longer valid" };
  }

  return {
    valid: true,
    referrerId: referral.referrer._id,
    referrerName: `${referral.referrer.firstName} ${referral.referrer.lastName}`,
  };
};

export default {
  generateReferralCode,
  getOrCreateReferralCode,
  validateReferralCode,
};
