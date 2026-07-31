const mongoose = require("mongoose");

const quotationSchema = new mongoose.Schema(
  {
    // Which billing entity this quotation was raised under ("satyasha" | "advance")
    companyKey: { type: String, required: true },

    invoiceNo: { type: String, required: true, unique: true },
    financialYear: { type: String, required: true },
    invoiceDate: { type: Date, required: true, default: Date.now },

    // Customer / Applicant details
    customerName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    district: { type: String, required: true },
    pincode: { type: String, trim: true },
    bpNumber: { type: String, trim: true }, // electricity BP / service number

    // Reference / field agent (optional)
    referenceName: { type: String, trim: true },
    referenceMobile: { type: String, trim: true },

    // System specification
    systemType: { type: String, required: true }, // DCR On-Grid / DCR On-Grid Hybrid
    solarBrand: { type: String, required: true }, // e.g. "Waaree Bifacial"
    capacityKW: { type: Number, required: true },
    hsnCode: { type: String, default: "8541" },

    // Pricing (all amounts in INR)
    listPrice: { type: Number, required: true }, // pre-tax, pre-discount line price
    discount: { type: Number, required: true, default: 0 },
    taxableAmount: { type: Number, required: true },
    cgstRate: { type: Number, required: true, default: 2.5 },
    sgstRate: { type: Number, required: true, default: 2.5 },
    cgstAmount: { type: Number, required: true },
    sgstAmount: { type: Number, required: true },
    totalTax: { type: Number, required: true },
    grandTotal: { type: Number, required: true }, // final payable amount

    remark: { type: String, trim: true },

    placeOfSupply: { type: String, default: "Chhattisgarh (22)" },
    reverseCharge: { type: String, default: "N" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quotation", quotationSchema);
