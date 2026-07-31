# Solar Quotation Generator — Full Stack (Node.js + Express + MongoDB + PDFKit)

Generates GST tax-invoice style solar quotations (matching the SATYASHA ENTERPRISES
sample PDF), saves every quotation to MongoDB, and lets you view/download the PDF
at any time. Frontend form fields mirror the two reference sites you shared.

```
solar-quotation-app/
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── config/        (db.js, companies.js, priceConfig.js)
│   ├── models/         (Quotation.js, Counter.js)
│   ├── routes/         (quotationRoutes.js)
│   └── utils/          (pdfGenerator.js, numberToWords.js)
└── frontend/
    ├── index.html
    ├── css/style.css
    └── js/script.js
```

## 1. Prerequisites
- Node.js 18+ installed (`node -v`)
- A MongoDB database — either:
  - Local MongoDB (`mongodb://127.0.0.1:27017`), or
  - Free MongoDB Atlas cluster (recommended) → get a connection string from atlas.mongodb.com

## 2. Backend setup
```bash
cd backend
npm install
cp .env.example .env
```
Edit `.env`:
```
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/solar_quotations
PORT=5000
CLIENT_ORIGIN=*
```
Run it:
```bash
npm start
# or, for auto-reload during development:
npm run dev
```
You should see:
```
MongoDB connected: solar_quotations
Solar Quotation API running on http://localhost:5000
```

## 3. Frontend
The backend already serves the frontend as static files, so once the server is
running you can simply open:
```
http://localhost:5000/index.html
```
(Alternatively, open `frontend/index.html` directly in a browser or serve it with
any static server — `js/script.js` auto-detects and calls `http://localhost:5000/api`.)

## 4. Using it
1. Fill the form (Company, Customer, District, Solar System, Capacity, Final Amount).
2. Click **AUTHORIZE & GENERATE QUOTATION** — this POSTs to `/api/quotations`,
   which saves the record to MongoDB and auto-generates an invoice number
   (e.g. `SECGRY/46/2026-27`), then opens the generated PDF in a new tab.
3. Go to the **Saved Quotations** tab to search past quotations and re-open their PDFs.

## 5. Adjusting prices / branding
- `backend/config/priceConfig.js` → edit `PRICE_PER_KW` with your real official
  price list per brand (currently placeholder values), districts, brands, capacities.
- `backend/config/companies.js` → edit company name/address/GSTIN, or add more
  billing entities (e.g. for the "Advance International Solar" branding).
- `backend/utils/pdfGenerator.js` → controls the exact PDF layout if you want to
  tweak positions/fonts further.

## 6. Key API endpoints
| Method | Endpoint                        | Purpose                              |
|--------|----------------------------------|---------------------------------------|
| GET    | /api/meta                        | Dropdown options for the form         |
| GET    | /api/price-lookup                | Reference list price for brand+kW     |
| POST   | /api/quotations                  | Create + save a quotation             |
| GET    | /api/quotations                  | List/search saved quotations          |
| GET    | /api/quotations/:id              | Get one quotation (JSON)              |
| PUT    | /api/quotations/:id              | Edit a quotation                      |
| DELETE | /api/quotations/:id              | Delete a quotation                    |
| GET    | /api/quotations/:id/pdf          | Stream/view the generated PDF         |

## 7. Deploying
- Backend: Render, Railway, Fly.io, or any Node host — set `MONGO_URI`,
  `PORT`, `CLIENT_ORIGIN` as environment variables.
- Database: MongoDB Atlas (free tier is enough to start).
- Frontend: can stay served by Express, or deploy separately (Netlify/Vercel) —
  just update `API_BASE` in `frontend/js/script.js` to your backend's public URL.

## Note on pricing math
The invoice math mirrors your sample PDF exactly:
```
taxableAmount = grandTotal / 1.05
discount      = listPrice - taxableAmount
CGST = SGST   = taxableAmount * 2.5%
```
So you enter the **final agreed price** (grand total) and the system
back-calculates the discount/tax breakdown the same way SATYASHA ENTERPRISES'
invoice does (₹2,30,000 list → ₹2,05,000 final → ₹34,761.90 discount, etc.).
