// backend/routes/nutrition.js
const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");

let meals  = [];
let nextId = 1;

// GET /api/nutrition?date=YYYY-MM-DD
router.get("/", auth, (req, res) => {
  const date  = req.query.date || new Date().toISOString().split("T")[0];
  const today = meals.filter(m => m.userId === req.user.id && m.loggedDate === date);
  res.json(today);
});

// POST /api/nutrition
router.post("/", auth, (req, res) => {
  const { name, mealTime, calories, proteinG, carbsG, fatsG } = req.body;
  if (!name) return res.status(400).json({ error: "Meal name required." });

  const meal = {
    id:         nextId++,
    userId:     req.user.id,
    mealTime:   mealTime   || "Snack",
    name,
    calories:   calories   || 0,
    proteinG:   proteinG   || 0,
    carbsG:     carbsG     || 0,
    fatsG:      fatsG      || 0,
    loggedDate: new Date().toISOString().split("T")[0],
    createdAt:  new Date().toISOString()
  };
  meals.push(meal);
  res.status(201).json(meal);
});

// DELETE /api/nutrition/:id
router.delete("/:id", auth, (req, res) => {
  const idx = meals.findIndex(m => m.id === parseInt(req.params.id) && m.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: "Not found." });
  meals.splice(idx, 1);
  res.json({ message: "Deleted." });
});

module.exports = router;
