const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "satyasha-2026-27"
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model("Counter", counterSchema);

/**
 * Returns the current Indian financial year string, e.g. "2026-27"
 * (April to March). Adjust here if your business year differs.
 */
function currentFinancialYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(-2)}`;
  }
  return `${year - 1}-${String(year).slice(-2)}`;
}

/**
 * Atomically increments and returns the next sequence number for a
 * given company + financial year, e.g. companyKey="satyasha" -> 45
 */
async function getNextSequence(companyKey, financialYear) {
  const id = `${companyKey}-${financialYear}`;
  const doc = await Counter.findByIdAndUpdate(
    id,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}

module.exports = { Counter, currentFinancialYear, getNextSequence };
