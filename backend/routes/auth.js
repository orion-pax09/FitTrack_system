// backend/routes/auth.js
const express = require("express");
const router  = express.Router();
const { register, login, getTrainers } = require("../controllers/authController");

router.post("/register",  register);
router.post("/login",     login);
router.get("/trainers",   getTrainers);   // for registration dropdown

module.exports = router;
