import mongoose from "mongoose";

/**
 * Counter Schema for Sequential Number Generation
 */
const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  year: { type: Number, required: true },
  sequence: { type: Number, default: 0 }
}, { timestamps: true });

counterSchema.index({ name: 1, year: 1 }, { unique: true });

const Counter = mongoose.model("Counter", counterSchema);

/**
 * Get next sequence number for a counter type
 * @param {string} counterName - Name of counter (order, refund, return, invoice)
 * @returns {Promise<number>} Next sequence number
 */
const getNextSequence = async (counterName) => {
  const currentYear = new Date().getFullYear();

  const counter = await Counter.findOneAndUpdate(
    { name: counterName, year: currentYear },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return counter.sequence;
};

/**
 * Generate order number
 * Format: ORD-YYYY-XXXXXX
 * @returns {Promise<string>} Order number
 */
export const generateOrderNumber = async () => {
  const year = new Date().getFullYear();
  const sequence = await getNextSequence("order");
  const paddedSequence = String(sequence).padStart(6, "0");
  return `ORD-${year}-${paddedSequence}`;
};

/**
 * Generate refund number
 * Format: REF-YYYY-XXXXXX
 * @returns {Promise<string>} Refund number
 */
export const generateRefundNumber = async () => {
  const year = new Date().getFullYear();
  const sequence = await getNextSequence("refund");
  const paddedSequence = String(sequence).padStart(6, "0");
  return `REF-${year}-${paddedSequence}`;
};

/**
 * Generate return number
 * Format: RET-YYYY-XXXXXX
 * @returns {Promise<string>} Return number
 */
export const generateReturnNumber = async () => {
  const year = new Date().getFullYear();
  const sequence = await getNextSequence("return");
  const paddedSequence = String(sequence).padStart(6, "0");
  return `RET-${year}-${paddedSequence}`;
};

/**
 * Generate invoice number
 * Format: INV-YYYY-XXXXXX
 * @returns {Promise<string>} Invoice number
 */
export const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const sequence = await getNextSequence("invoice");
  const paddedSequence = String(sequence).padStart(6, "0");
  return `INV-${year}-${paddedSequence}`;
};

/**
 * Get current sequence for a counter
 * @param {string} counterName - Counter name
 * @returns {Promise<number>} Current sequence
 */
export const getCurrentSequence = async (counterName) => {
  const currentYear = new Date().getFullYear();
  const counter = await Counter.findOne({ name: counterName, year: currentYear });
  return counter ? counter.sequence : 0;
};

/**
 * Reset counter for a specific year (admin operation)
 * @param {string} counterName - Counter name
 * @param {number} year - Year to reset
 * @returns {Promise<boolean>} Success status
 */
export const resetCounter = async (counterName, year) => {
  await Counter.findOneAndUpdate(
    { name: counterName, year },
    { sequence: 0 },
    { upsert: true }
  );
  return true;
};

/**
 * Get counter statistics
 * @returns {Promise<Array>} Counter stats
 */
export const getCounterStats = async () => {
  const currentYear = new Date().getFullYear();
  const counters = await Counter.find({ year: currentYear }).lean();

  return counters.map(counter => ({
    name: counter.name,
    year: counter.year,
    currentSequence: counter.sequence,
    lastUpdated: counter.updatedAt
  }));
};

/**
 * Validate number format
 * @param {string} number - Number to validate
 * @param {string} type - Type (order, refund, return, invoice)
 * @returns {boolean} Is valid
 */
export const validateNumberFormat = (number, type) => {
  const prefixes = {
    order: "ORD",
    refund: "REF",
    return: "RET",
    invoice: "INV"
  };

  const prefix = prefixes[type];
  if (!prefix) return false;

  const pattern = new RegExp(`^${prefix}-\\d{4}-\\d{6}$`);
  return pattern.test(number);
};

/**
 * Parse number to extract components
 * @param {string} number - Number to parse
 * @returns {Object} Parsed components
 */
export const parseNumber = (number) => {
  const parts = number.split("-");
  if (parts.length !== 3) {
    return null;
  }

  return {
    prefix: parts[0],
    year: parseInt(parts[1]),
    sequence: parseInt(parts[2])
  };
};

export default Counter;
