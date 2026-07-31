// Change this if your backend runs on a different host/port
const API_BASE = window.location.origin.includes("5000")
  ? "/api"
  : "http://localhost:5000/api";

const $ = (sel) => document.querySelector(sel);

// ---------- Tabs ----------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    $("#tab-" + btn.dataset.tab).classList.add("active");
    if (btn.dataset.tab === "list") loadQuotations();
  });
});

// ---------- Load meta / dropdown options ----------
async function loadMeta() {
  const res = await fetch(`${API_BASE}/meta`);
  const meta = await res.json();

  fillSelect("#companyKey", meta.companies.map((c) => ({ value: c.key, label: c.name })));
  fillSelect("#district", meta.districts.map((d) => ({ value: d, label: d })), true);
  fillSelect("#systemType", meta.systemTypes.map((s) => ({ value: s, label: s })));
  fillSelect("#solarBrand", meta.solarSystems.map((s) => ({ value: s, label: s })), true);
  fillSelect(
    "#capacityKW",
    meta.capacities.map((c) => ({ value: c, label: `${c} KW System` })),
    true
  );
}

function fillSelect(selector, options, keepFirst = false) {
  const el = $(selector);
  const startIdx = keepFirst ? 1 : 0;
  // remove all but placeholder option if keepFirst
  el.length = keepFirst ? 1 : 0;
  options.forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    el.appendChild(o);
  });
}

// ---------- Price hint ----------
async function updatePriceHint() {
  const brand = $("#solarBrand").value;
  const capacityKW = $("#capacityKW").value;
  const hint = $("#priceHint");

  if (!brand || !capacityKW) {
    hint.textContent = "Select brand and capacity to view reference List Price.";
    return;
  }
  const res = await fetch(`${API_BASE}/price-lookup?brand=${encodeURIComponent(brand)}&capacityKW=${capacityKW}`);
  const data = await res.json();
  hint.textContent = `Reference List Price for ${capacityKW} KW ${brand}: ₹${Number(data.listPrice).toLocaleString("en-IN")} (before discount/GST adjustment). Enter your final agreed amount below.`;
}

$("#solarBrand").addEventListener("change", updatePriceHint);
$("#capacityKW").addEventListener("change", updatePriceHint);

// ---------- Create quotation ----------
$("#quoteForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const msg = $("#formMsg");
  msg.textContent = "";
  msg.className = "form-msg";

  const payload = Object.fromEntries(new FormData(form).entries());
  payload.capacityKW = Number(payload.capacityKW);
  payload.grandTotal = Number(payload.grandTotal);

  try {
    const res = await fetch(`${API_BASE}/quotations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to create quotation");

    msg.textContent = `Quotation ${data.invoiceNo} generated successfully. Opening PDF...`;
    msg.classList.add("success");

    window.open(`${API_BASE}/quotations/${data._id}/pdf`, "_blank");
    form.reset();
    $("#priceHint").textContent = "Select brand and capacity to view reference List Price.";
  } catch (err) {
    msg.textContent = err.message;
    msg.classList.add("error");
  }
});

// ---------- List quotations ----------
async function loadQuotations(search = "") {
  const res = await fetch(`${API_BASE}/quotations?search=${encodeURIComponent(search)}`);
  const data = await res.json();
  const tbody = $("#quoteTableBody");
  tbody.innerHTML = "";

  data.items.forEach((q) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${q.invoiceNo}</td>
      <td>${q.customerName}</td>
      <td>${q.mobile}</td>
      <td>${q.capacityKW} KW ${q.solarBrand}</td>
      <td>₹${Number(q.grandTotal).toLocaleString("en-IN")}</td>
      <td>${new Date(q.invoiceDate).toLocaleDateString("en-IN")}</td>
      <td><a href="${API_BASE}/quotations/${q._id}/pdf" target="_blank">View PDF</a></td>
    `;
    tbody.appendChild(tr);
  });

  if (data.items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#888;">No quotations found.</td></tr>`;
  }
}

$("#searchBtn").addEventListener("click", () => loadQuotations($("#searchBox").value));
$("#searchBox").addEventListener("keydown", (e) => {
  if (e.key === "Enter") loadQuotations($("#searchBox").value);
});

// ---------- Init ----------
loadMeta();
