// backend/routes/bmi.js
const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");

let records = []; let nextId = 1;

// GET /api/bmi  – last 10 records
router.get("/", auth, (req, res) => {
  res.json(records.filter(r => r.userId === req.user.id).slice(0, 10));
});

// POST /api/bmi
router.post("/", auth, (req, res) => {
  const { heightCm, weightKg } = req.body;
  if (!heightCm || !weightKg) return res.status(400).json({ error: "Height and weight required." });
  const bmi = parseFloat((weightKg / ((heightCm / 100) ** 2)).toFixed(2));
  let category = "Normal";
  if (bmi < 18.5) category = "Underweight";
  else if (bmi >= 30) category = "Obese";
  else if (bmi >= 25) category = "Overweight";

  const rec = { id: nextId++, userId: req.user.id, heightCm, weightKg, bmi, category, recordedAt: new Date().toISOString() };
  records.unshift(rec);
  res.status(201).json(rec);
});

module.exports = router;
