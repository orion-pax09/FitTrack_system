// ============================================================
//  FitTrack – Backend  (Node.js + Express)
//  server.js  –  entry point
// ============================================================

const express = require("express");
const cors    = require("cors");
const path    = require("path");

const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve frontend files from ../frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// ── Routes ────────────────────────────────────────────────────
app.use("/api/auth",      require("./routes/auth"));
app.use("/api/nutrition", require("./routes/nutrition"));
app.use("/api/workouts",  require("./routes/workouts"));
app.use("/api/bmi",       require("./routes/bmi"));
app.use("/api/messages",  require("./routes/messages"));

// ── Root fallback ─────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});

// ── Start ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ FitTrack server running on http://localhost:${PORT}`));
