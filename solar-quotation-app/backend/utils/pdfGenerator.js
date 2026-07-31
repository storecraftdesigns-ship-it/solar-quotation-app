const PDFDocument = require("pdfkit");
const { rupeesInWords } = require("./numberToWords");

const INR = (n) =>
  Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function fmtDate(d) {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  let hh = dt.getHours();
  const min = String(dt.getMinutes()).padStart(2, "0");
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12 || 12;
  return `${dd}-${mm}-${yyyy}  ( ${String(hh).padStart(2, "0")}:${min} ${ampm} )`;
}

/**
 * Streams a tax-invoice-style quotation PDF (matching the SATYASHA
 * ENTERPRISES sample) to the given writable stream (e.g. an HTTP response).
 *
 * @param {import('stream').Writable} stream
 * @param {object} q        - Quotation mongoose document (plain object ok)
 * @param {object} company  - entry from config/companies.js
 */
function generateQuotationPDF(stream, q, company) {
  const doc = new PDFDocument({ size: "A4", margin: 28 });
  doc.pipe(stream);

  const pageLeft = doc.page.margins.left;
  const pageRight = doc.page.width - doc.page.margins.right;
  const fullWidth = pageRight - pageLeft;
  let y = doc.page.margins.top;

  // Outer border
  const outerTop = y;

  // ---------- Header ----------
  doc.font("Helvetica-Bold").fontSize(9);
  doc.text(`GSTIN : ${company.gstin}`, pageLeft + 6, y + 6);

  doc.fontSize(11).text("TAX INVOICE", pageLeft, y + 4, { width: fullWidth, align: "center", underline: true });

  doc.fontSize(18).text(company.name, pageLeft, y + 20, { width: fullWidth, align: "center" });

  doc.font("Helvetica").fontSize(9);
  company.addressLines.forEach((line, i) => {
    doc.text(line, pageLeft, y + 42 + i * 12, { width: fullWidth, align: "center" });
  });

  y += 42 + company.addressLines.length * 12 + 8;
  doc.moveTo(pageLeft, y).lineTo(pageRight, y).stroke();

  // ---------- Invoice meta row ----------
  const metaTop = y;
  const metaHeight = 34;
  doc.font("Helvetica-Bold").fontSize(9);
  doc.text("Invoice No.", pageLeft + 6, metaTop + 6);
  doc.text("Dated", pageLeft + 6, metaTop + 18);
  doc.font("Helvetica").text(`: ${q.invoiceNo}`, pageLeft + 70, metaTop + 6);
  doc.text(`: ${fmtDate(q.invoiceDate)}`, pageLeft + 70, metaTop + 18);

  const metaMidX = pageLeft + fullWidth * 0.55;
  doc.font("Helvetica-Bold");
  doc.text("Place of Supply", metaMidX, metaTop + 6);
  doc.text("Reverse Charge", metaMidX, metaTop + 18);
  doc.font("Helvetica");
  doc.text(`: ${q.placeOfSupply}`, metaMidX + 90, metaTop + 6);
  doc.text(`: ${q.reverseCharge}`, metaMidX + 90, metaTop + 18);

  y = metaTop + metaHeight;
  doc.moveTo(pageLeft, y).lineTo(pageRight, y).stroke();
  doc.moveTo(pageLeft + fullWidth / 2, metaTop).lineTo(pageLeft + fullWidth / 2, y).stroke();

  // ---------- Billed to / Shipped to ----------
  const billTop = y;
  const billHeight = 90;
  const colWidth = fullWidth / 2;

  function addressBlock(x, label) {
    doc.font("Helvetica-BoldOblique").fontSize(9).text(label, x + 6, billTop + 6);
    doc.font("Helvetica-Bold").fontSize(9).text(q.customerName.toUpperCase(), x + 6, billTop + 20);
    doc.font("Helvetica").fontSize(9);
    doc.text(q.address, x + 6, billTop + 32, { width: colWidth - 12 });
    doc.text(`DIST-${q.district}`, x + 6, billTop + 58);
    doc.text("CHHATTISGARH", x + 6, billTop + 70);
    doc.text(`PIN-${q.pincode || "-"}`, x + 6, billTop + 82);
  }

  addressBlock(pageLeft, "Billed to :");
  addressBlock(pageLeft + colWidth, "Shipped to :");

  y = billTop + billHeight;
  doc.moveTo(pageLeft, y).lineTo(pageRight, y).stroke();
  doc.moveTo(pageLeft + colWidth, billTop).lineTo(pageLeft + colWidth, y).stroke();

  // ---------- Line items table ----------
  const cols = [
    { key: "sn", label: "S.N.", width: 28 },
    { key: "desc", label: "Description of Goods", width: 190 },
    { key: "hsn", label: "HSN/SAC Code", width: 60 },
    { key: "qty", label: "Qty.", width: 34 },
    { key: "unit", label: "Unit", width: 34 },
    { key: "list", label: "List Price", width: 65 },
    { key: "disc", label: "Discount", width: 55 },
    { key: "amount", label: "Amount (\u20B9)", width: 0 } // fills remainder
  ];
  const fixedW = cols.reduce((s, c) => s + c.width, 0);
  cols[cols.length - 1].width = fullWidth - fixedW;

  const tableTop = y;
  const headerH = 24;
  let x = pageLeft;
  doc.font("Helvetica-Bold").fontSize(8);
  cols.forEach((c) => {
    doc.text(c.label, x + 3, tableTop + 6, { width: c.width - 6 });
    x += c.width;
  });
  y = tableTop + headerH;
  doc.moveTo(pageLeft, y).lineTo(pageRight, y).stroke();

  // single line item row (the solar system)
  const rowTop = y;
  const rowH = 200; // generous body height to mirror the sample invoice's blank space
  const description = `${q.capacityKW} KW ${q.solarBrand.toUpperCase()} SOLAR SYSTEM (${q.systemType.toUpperCase()})`;

  doc.font("Helvetica").fontSize(8);
  x = pageLeft;
  const rowValues = {
    sn: "1.",
    desc: description,
    hsn: q.hsnCode,
    qty: "1.00",
    unit: "SET",
    list: INR(q.listPrice),
    disc: "0.00 %",
    amount: INR(q.listPrice)
  };
  cols.forEach((c) => {
    doc.text(rowValues[c.key], x + 3, rowTop + 6, { width: c.width - 6 });
    x += c.width;
  });

  y = rowTop + rowH;

  // vertical column separators for the whole table block
  x = pageLeft;
  cols.forEach((c) => {
    doc.moveTo(x, tableTop).lineTo(x, y).stroke();
    x += c.width;
  });
  doc.moveTo(pageRight, tableTop).lineTo(pageRight, y).stroke();
  doc.moveTo(pageLeft, y).lineTo(pageRight, y).stroke();

  // ---------- Totals block ----------
  const totalsLabelX = pageLeft + fullWidth - 260;
  const totalsValueX = pageRight - 90;
  let ty = y + 6;

  function totalLine(label, value, bold = false) {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9);
    doc.text(label, totalsLabelX, ty, { width: 160 });
    doc.text(value, totalsValueX, ty, { width: 90, align: "right" });
    ty += 14;
  }

  doc.font("Helvetica-Bold").fontSize(9);
  doc.text(INR(q.listPrice), totalsValueX, ty, { width: 90, align: "right" });
  ty += 14;
  totalLine("Less : Discount", INR(q.discount));
  totalLine(`Add : CGST (ITC-None) @ ${q.cgstRate.toFixed(2)} %`, INR(q.cgstAmount));
  totalLine(`Add : SGST @ ${q.sgstRate.toFixed(2)} %`, INR(q.sgstAmount));

  y = ty + 6;
  doc.moveTo(pageLeft, y).lineTo(pageRight, y).stroke();

  // Grand total row
  const gtTop = y;
  const gtH = 26;
  doc.font("Helvetica-Bold").fontSize(11);
  doc.text("Grand Total", pageLeft + 6, gtTop + 6);
  doc.text("1.00 SET", pageLeft + 140, gtTop + 6);
  doc.text(`\u20B9 ${INR(q.grandTotal)}`, pageRight - 160, gtTop + 6, { width: 154, align: "right" });
  y = gtTop + gtH;
  doc.moveTo(pageLeft, y).lineTo(pageRight, y).stroke();

  // ---------- HSN/SAC tax summary ----------
  const sumTop = y + 6;
  doc.font("Helvetica-Bold").fontSize(8).text("HSN/SAC   Tax Rate   Taxable Amt.   CGST Amt.   SGST Amt.   Total Tax", pageLeft + 6, sumTop);
  doc.font("Helvetica").fontSize(8).text(
    `${q.hsnCode}          ${q.cgstRate + q.sgstRate}%          ${INR(q.taxableAmount)}          ${INR(q.cgstAmount)}       ${INR(q.sgstAmount)}       ${INR(q.totalTax)}`,
    pageLeft + 6,
    sumTop + 14
  );

  y = sumTop + 34;
  doc.moveTo(pageLeft, y).lineTo(pageRight, y).stroke();

  // ---------- Amount in words ----------
  doc.font("Helvetica-Bold").fontSize(10).text(rupeesInWords(q.grandTotal), pageLeft + 6, y + 8);
  y += 30;
  doc.moveTo(pageLeft, y).lineTo(pageRight, y).stroke();

  // ---------- Terms & signature ----------
  const termsTop = y;
  const termsH = 110;
  const termsColWidth = fullWidth * 0.62;

  doc.font("Helvetica-Bold").fontSize(8).text("Terms & Conditions", pageLeft + 6, termsTop + 6);
  doc.font("Helvetica").fontSize(7.5);
  const terms = [
    "E.& O.E.",
    "1. Goods once sold will not be taken back.",
    "2. Interest @ 18% p.a. will be charged if the payment is not made within the stipulated time.",
    "3. Subject to 'Chhattisgarh' Jurisdiction only."
  ];
  terms.forEach((t, i) => doc.text(t, pageLeft + 6, termsTop + 20 + i * 12, { width: termsColWidth - 12 }));

  const sigX = pageLeft + termsColWidth;
  doc.font("Helvetica-Bold").fontSize(8).text("Receiver's Signature :", sigX + 6, termsTop + 6);
  doc.font("Helvetica-Bold").fontSize(9).text(`for ${company.name}`, sigX + 6, termsTop + 70, {
    width: fullWidth - termsColWidth - 12,
    align: "right"
  });
  doc.font("Helvetica").fontSize(8).text("Authorised Signatory", sigX + 6, termsTop + 92, {
    width: fullWidth - termsColWidth - 12,
    align: "right"
  });

  y = termsTop + termsH;
  doc.moveTo(pageLeft, termsTop).lineTo(pageLeft, y).stroke();
  doc.moveTo(pageRight, termsTop).lineTo(pageRight, y).stroke();
  doc.moveTo(sigX, termsTop).lineTo(sigX, y).stroke();
  doc.moveTo(pageLeft, y).lineTo(pageRight, y).stroke();

  // Outer left/right/top borders for the whole document
  doc.moveTo(pageLeft, outerTop).lineTo(pageRight, outerTop).stroke();
  doc.moveTo(pageLeft, outerTop).lineTo(pageLeft, y).stroke();
  doc.moveTo(pageRight, outerTop).lineTo(pageRight, y).stroke();

  doc.end();
}

module.exports = { generateQuotationPDF };
