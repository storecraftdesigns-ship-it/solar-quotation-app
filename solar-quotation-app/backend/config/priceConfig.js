// Chhattisgarh districts (as listed on the reference quotation forms)
const DISTRICTS = [
  "Balod", "Baloda Bazar", "Balrampur-Ramanujganj", "Bastar", "Bemetara",
  "Bijapur", "Bilaspur", "Dakshin Bastar Dantewada", "Dhamtari", "Durg",
  "Gariyaband", "Gaurela-Pendra-Marwahi", "Janjgir-Champa", "Jashpur",
  "Kabirdham", "Kanker", "Khairagarh-Chhuikhadan-Gandai", "Kondagaon",
  "Korba", "Korea", "Mahasamund", "Manendragarh-Chirmiri-Bharatpur",
  "Mohla-Manpur-Ambagarh Chowki", "Mungeli", "Narayanpur", "Raigarh",
  "Rajnandgaon", "Sakti", "Sarangarh-Bilaigarh", "Sukma", "Surajpur", "Surguja"
];

// Solar panel brand/technology options
const SOLAR_SYSTEMS = [
  "Gautam Topcon DCR",
  "Gautam Bifacial",
  "Adani Bifacial",
  "Adani Topcon",
  "Waaree Topcon",
  "Waaree Bifacial",
  "ADVANCE BIFACIAL",
  "ADVANCE TOPCON"
];

// System capacity options (in KW)
const CAPACITIES = [2, 2.2, 2.75, 3, 3.3, 4, 5, 6, 7, 8, 10];

// System type options
const SYSTEM_TYPES = ["DCR On-Grid", "DCR On-Grid Hybrid"];

// HSN code used for solar systems on the sample invoice
const HSN_CODE = "8541";
const GST_RATE = 5; // % (split as 2.5% CGST + 2.5% SGST for intra-state supply)

/**
 * PLACEHOLDER base "List Price" per KW, per brand (in INR).
 * These are illustrative only - replace with your real official price list.
 * List Price for a given selection = PRICE_PER_KW[brand] * capacityKW
 */
const PRICE_PER_KW = {
  "Gautam Topcon DCR": 68000,
  "Gautam Bifacial": 70000,
  "Adani Bifacial": 71000,
  "Adani Topcon": 69500,
  "Waaree Topcon": 74000,
  "Waaree Bifacial": 76667, // matches sample invoice: 3 KW => 2,30,000
  "ADVANCE BIFACIAL": 72000,
  "ADVANCE TOPCON": 70500
};

function getListPrice(brand, capacityKW) {
  const rate = PRICE_PER_KW[brand];
  if (!rate) return 0;
  return Math.round(rate * Number(capacityKW));
}

module.exports = {
  DISTRICTS,
  SOLAR_SYSTEMS,
  CAPACITIES,
  SYSTEM_TYPES,
  HSN_CODE,
  GST_RATE,
  PRICE_PER_KW,
  getListPrice
};
