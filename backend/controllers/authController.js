// backend/controllers/authController.js
// NOTE: Replace the db mock below with real MySQL queries once you set up the DB.
// Using in-memory array here so the backend runs standalone for demo/testing.

const bcrypt = require("bcrypt");
const jwt    = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "fittrack_dev_secret_change_me";
const SALT_ROUNDS = 10;

// ── In-memory store (replace with MySQL) ─────────────────────
// In production: const db = require("../db");  then use db.query(...)
let users = [];
let nextId = 1;

// ── Register ──────────────────────────────────────────────────
async function register(req, res) {
  try {
    const { firstname, lastname, username, email, password, role, gender, age, assignedTrainerId } = req.body;

    if (!firstname || !lastname || !username || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required." });
    }
    if (users.find(u => u.email === email)) {
      return res.status(409).json({ error: "Email already in use." });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters." });
    }

    // Trainer assignment
    let trainer = null;
    if (role === "client") {
      if (!assignedTrainerId) return res.status(400).json({ error: "Please select a trainer." });
      trainer = users.find(u => u.id === parseInt(assignedTrainerId) && u.role === "trainer");
      if (!trainer) return res.status(400).json({ error: "Trainer not found." });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = {
      id: nextId++,
      firstname, lastname, username, email, password_hash, role,
      gender: gender || null,
      age:    age    || null,
      assignedTrainerId: trainer ? trainer.id : null,
      assignedTrainerName: trainer ? `${trainer.firstname} ${trainer.lastname}` : null,
      createdAt: new Date().toISOString()
    };
    users.push(user);

    res.status(201).json({ message: "Account created successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
}

// ── Login ─────────────────────────────────────────────────────
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required." });

    const user = users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: "Invalid email or password." });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)  return res.status(401).json({ error: "Invalid email or password." });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id:                  user.id,
        firstname:           user.firstname,
        lastname:            user.lastname,
        username:            user.username,
        email:               user.email,
        role:                user.role,
        assignedTrainerId:   user.assignedTrainerId   || null,
        assignedTrainerName: user.assignedTrainerName || null
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
}

// ── Get trainers list (for registration dropdown) ──────────────
function getTrainers(req, res) {
  const trainers = users
    .filter(u => u.role === "trainer")
    .map(t => ({ id: t.id, firstname: t.firstname, lastname: t.lastname, username: t.username }));
  res.json(trainers);
}

module.exports = { register, login, getTrainers };
