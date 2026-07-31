const express = require("express");
const router = express.Router();

const Quotation = require("../models/Quotation");
const { currentFinancialYear, getNextSequence } = require("../models/Counter");
const companies = require("../config/companies");
const priceConfig = require("../config/priceConfig");
const { generateQuotationPDF } = require("../utils/pdfGenerator");

const GST_RATE = priceConfig.GST_RATE; // total % (e.g. 5)
const HALF_RATE = GST_RATE / 2; // CGST / SGST each

/**
 * GET /api/meta
 * Returns all dropdown options the frontend form needs, plus company presets.
 */
router.get("/meta", (req, res) => {
  res.json({
    districts: priceConfig.DISTRICTS,
    solarSystems: priceConfig.SOLAR_SYSTEMS,
    capacities: priceConfig.CAPACITIES,
    systemTypes: priceConfig.SYSTEM_TYPES,
    hsnCode: priceConfig.HSN_CODE,
    gstRate: GST_RATE,
    companies: Object.values(companies).map((c) => ({ key: c.key, name: c.name }))
  });
});

/**
 * GET /api/price-lookup?brand=..&capacityKW=..
 * Returns the reference List Price for a brand/capacity combo, so the
 * frontend can show a suggested price before the user enters the final amount.
 */
router.get("/price-lookup", (req, res) => {
  const { brand, capacityKW } = req.query;
  if (!brand || !capacityKW) {
    return res.status(400).json({ error: "brand and capacityKW are required" });
  }
  const listPrice = priceConfig.getListPrice(brand, Number(capacityKW));
  res.json({ listPrice });
});

/**
 * Given a listPrice and the customer's final agreed amount (grandTotal, GST inclusive),
 * back-calculate taxable amount / discount / CGST / SGST exactly the way the
 * sample invoice does:
 *   taxableAmount = grandTotal / (1 + GST_RATE/100)
 *   discount      = listPrice - taxableAmount
 *   cgst = sgst   = taxableAmount * (HALF_RATE/100)
 */
function computeTax(listPrice, grandTotal) {
  const taxableAmount = grandTotal / (1 + GST_RATE / 100);
  const discount = Math.max(0, listPrice - taxableAmount);
  const cgstAmount = taxableAmount * (HALF_RATE / 100);
  const sgstAmount = taxableAmount * (HALF_RATE / 100);
  const totalTax = cgstAmount + sgstAmount;

  return {
    taxableAmount: round2(taxableAmount),
    discount: round2(discount),
    cgstAmount: round2(cgstAmount),
    sgstAmount: round2(sgstAmount),
    totalTax: round2(totalTax)
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * POST /api/quotations
 * Creates a new quotation, auto-generating the invoice number, and stores it in MongoDB.
 * Body: {
 *   companyKey, customerName, mobile, address, district, pincode, bpNumber,
 *   referenceName, referenceMobile, systemType, solarBrand, capacityKW,
 *   grandTotal, remark
 * }
 */
router.post("/quotations", async (req, res) => {
  try {
    // Fall back to the first configured company if none was sent from the form
    const defaultCompanyKey = Object.keys(companies)[0];

    const {
      companyKey = defaultCompanyKey,
      customerName,
      mobile,
      address,
      district,
      pincode,
      bpNumber,
      referenceName,
      referenceMobile,
      systemType,
      solarBrand,
      capacityKW,
      grandTotal,
      remark
    } = req.body;

    if (!customerName || !mobile || !address || !district || !systemType || !solarBrand || !capacityKW || !grandTotal) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const company = companies[companyKey];
    if (!company) return res.status(400).json({ error: "Unknown companyKey" });

    const listPrice = priceConfig.getListPrice(solarBrand, capacityKW);
    const { taxableAmount, discount, cgstAmount, sgstAmount, totalTax } = computeTax(
      listPrice,
      Number(grandTotal)
    );

    const financialYear = currentFinancialYear();
    const seq = await getNextSequence(companyKey, financialYear);
    const invoiceNo = `${company.invoicePrefix}/${seq}/${financialYear}`;

    const quotation = await Quotation.create({
      companyKey,
      invoiceNo,
      financialYear,
      invoiceDate: new Date(),
      customerName,
      mobile,
      address,
      district,
      pincode,
      bpNumber,
      referenceName,
      referenceMobile,
      systemType,
      solarBrand,
      capacityKW,
      hsnCode: priceConfig.HSN_CODE,
      listPrice,
      discount,
      taxableAmount,
      cgstRate: HALF_RATE,
      sgstRate: HALF_RATE,
      cgstAmount,
      sgstAmount,
      totalTax,
      grandTotal: Number(grandTotal),
      remark,
      placeOfSupply: `${company.stateName} (${company.stateCode})`
    });

    res.status(201).json(quotation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create quotation", details: err.message });
  }
});

/**
 * GET /api/quotations
 * Lists quotations, most recent first. Supports ?search=&page=&limit=
 */
router.get("/quotations", async (req, res) => {
  try {
    const { search = "", page = 1, limit = 20 } = req.query;
    const query = search
      ? {
        $or: [
          { customerName: new RegExp(search, "i") },
          { mobile: new RegExp(search, "i") },
          { invoiceNo: new RegExp(search, "i") }
        ]
      }
      : {};

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Quotation.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Quotation.countDocuments(query)
    ]);

    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch quotations", details: err.message });
  }
});

/** GET /api/quotations/:id - fetch a single quotation */
router.get("/quotations/:id", async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return res.status(404).json({ error: "Not found" });
    res.json(quotation);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch quotation", details: err.message });
  }
});

/** PUT /api/quotations/:id - update a quotation's editable fields */
router.put("/quotations/:id", async (req, res) => {
  try {
    const updatable = [
      "customerName", "mobile", "address", "district", "pincode", "bpNumber",
      "referenceName", "referenceMobile", "systemType", "solarBrand",
      "capacityKW", "grandTotal", "remark"
    ];
    const updates = {};
    updatable.forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });

    // Recompute pricing if anything price-relevant changed
    if (updates.solarBrand || updates.capacityKW || updates.grandTotal) {
      const existing = await Quotation.findById(req.params.id);
      if (!existing) return res.status(404).json({ error: "Not found" });

      const brand = updates.solarBrand || existing.solarBrand;
      const capacityKW = updates.capacityKW || existing.capacityKW;
      const grandTotal = updates.grandTotal !== undefined ? Number(updates.grandTotal) : existing.grandTotal;

      const listPrice = priceConfig.getListPrice(brand, capacityKW);
      const tax = computeTax(listPrice, grandTotal);

      Object.assign(updates, {
        listPrice,
        grandTotal,
        cgstRate: HALF_RATE,
        sgstRate: HALF_RATE,
        ...tax
      });
    }

    const quotation = await Quotation.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!quotation) return res.status(404).json({ error: "Not found" });
    res.json(quotation);
  } catch (err) {
    res.status(500).json({ error: "Failed to update quotation", details: err.message });
  }
});

/** DELETE /api/quotations/:id */
router.delete("/quotations/:id", async (req, res) => {
  try {
    const deleted = await Quotation.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete quotation", details: err.message });
  }
});

/** GET /api/quotations/:id/pdf - streams the generated invoice/quotation PDF */
router.get("/quotations/:id/pdf", async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return res.status(404).json({ error: "Not found" });

    const company = companies[quotation.companyKey] || companies.satyasha;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${quotation.invoiceNo.replace(/\//g, "-")}.pdf"`
    );

    generateQuotationPDF(res, quotation, company);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate PDF", details: err.message });
  }
});

module.exports = router;