// backend/controllers/workoutController.js

let workouts = [];
let nextId   = 1;

// GET /api/workouts
// - Trainer: returns suggestions they sent
// - Client:  returns suggestions sent to them (or "all")
function getSuggestions(req, res) {
  const { id, role } = req.user;   // injected by auth middleware

  if (role === "trainer") {
    return res.json(workouts.filter(w => w.trainerId === id));
  }

  // client – need their trainer id (pass via query or decode from token payload)
  const trainerId = parseInt(req.query.trainerId);
  const mine = workouts.filter(w =>
    w.trainerId === trainerId &&
    (w.clientId === null || w.clientId === id)
  );
  res.json(mine);
}

// POST /api/workouts  (trainer only)
function sendSuggestion(req, res) {
  if (req.user.role !== "trainer") {
    return res.status(403).json({ error: "Trainers only." });
  }

  const { title, type, description, clientId } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required." });

  const w = {
    id:          nextId++,
    trainerId:   req.user.id,
    clientId:    clientId || null,   // null = all clients
    title,
    type:        type || "General",
    description: description || "",
    createdAt:   new Date().toISOString()
  };
  workouts.unshift(w);
  res.status(201).json(w);
}

// DELETE /api/workouts/:id  (trainer only)
function deleteSuggestion(req, res) {
  if (req.user.role !== "trainer") {
    return res.status(403).json({ error: "Trainers only." });
  }
  const id = parseInt(req.params.id);
  const idx = workouts.findIndex(w => w.id === id && w.trainerId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: "Not found." });
  workouts.splice(idx, 1);
  res.json({ message: "Deleted." });
}

module.exports = { getSuggestions, sendSuggestion, deleteSuggestion };
