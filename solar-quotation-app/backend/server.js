require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");
const quotationRoutes = require("./routes/quotationRoutes");

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGIN || "*")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: allowedOrigins.includes("*") ? "*" : allowedOrigins
  })
);
app.use(express.json());

// Serve the frontend directly from Express too (optional convenience -
// you can also open frontend/index.html separately or host it elsewhere)
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.use("/api", quotationRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Solar Quotation API running on http://localhost:${PORT}`);
    console.log(`Frontend (if opened via this server): http://localhost:${PORT}/index.html`);
  });
});
