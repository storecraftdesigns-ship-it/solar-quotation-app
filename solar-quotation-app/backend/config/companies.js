/**
 * Billing-entity presets.
 * "OSGreen"  -> matches SATYASHA ENTERPRISES tax invoice (the sample PDF you shared)
 *
 * Edit / add more entities here as needed. invoicePrefix is used to build
 * invoice numbers, e.g. SECGRY/45/2026-27
 */
module.exports = {
  "osgreen": {
    key: "osgreen",
    name: "OS Green Energy",
    addressLines: [
      "Panchil Nagar ward no. 20 BMY Charoda, Durg",
      "Chhattisgarh, 490021"
    ],
    gstin: "22BYNPN8202K1Z8",
    invoicePrefix: "OSGREEN",
    stateCode: "22",
    stateName: "Chhattisgarh"
  }
};
