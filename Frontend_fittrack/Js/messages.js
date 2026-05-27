// backend/routes/messages.js
const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");

let messages = []; let nextId = 1;

// GET /api/messages?with=USER_ID
router.get("/", auth, (req, res) => {
  const withId = parseInt(req.query.with);
  const thread = messages.filter(m =>
    (m.senderId === req.user.id && m.receiverId === withId) ||
    (m.senderId === withId      && m.receiverId === req.user.id)
  );
  res.json(thread);
});

// POST /api/messages
router.post("/", auth, (req, res) => {
  const { receiverId, body } = req.body;
  if (!receiverId || !body) return res.status(400).json({ error: "receiverId and body required." });
  const msg = { id: nextId++, senderId: req.user.id, receiverId: parseInt(receiverId), body, isRead: false, sentAt: new Date().toISOString() };
  messages.push(msg);
  res.status(201).json(msg);
});

module.exports = router;
