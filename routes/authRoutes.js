const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ פונקציה לווידוא נתוני משתמש
const validateUserInput = (username, password) => {
  const usernameRegex = /^[A-Za-z]+$/;
  const passwordRegex = /^[0-9]{9}$/;

  if (!usernameRegex.test(username)) return "שם המשתמש חייב להכיל רק אותיות באנגלית.";
  if (!passwordRegex.test(password)) return "הסיסמה חייבת להכיל בדיוק 9 ספרות.";
  return null;
};

// ✅ הרשמה
router.post("/register", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  const { username, password } = req.body;
  const validationError = validateUserInput(username, password);
  if (validationError) return res.status(400).json({ message: validationError });

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: "שם המשתמש כבר תפוס." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    
    res.status(201).json({ message: "המשתמש נרשם בהצלחה." });
  } catch (err) {
    console.error("❌ שגיאה בהרשמה:", err);
    res.status(500).json({ message: "שגיאה בהרשמה.", error: err.message });
  }
});
// ✅ התחברות
router.post("/login", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  const { username, password } = req.body;
  const validationError = validateUserInput(username, password);
  if (validationError) return res.status(400).json({ message: validationError });

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "שם משתמש או סיסמה שגויים." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "שם משתמש או סיסמה שגויים." });

    if (!process.env.JWT_SECRET) {
      throw new Error("🔴 חסר JWT_SECRET בסביבת העבודה!");
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({ message: "התחברות בוצעה בהצלחה.", token });
  } catch (err) {
    console.error("❌ שגיאה בהתחברות:", err);
    res.status(500).json({ message: "שגיאה בהתחברות.", error: err.message });
  }
});

// ✅ גישה לפרופיל - מאובטח עם JWT
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    console.error("❌ שגיאה בטעינת הפרופיל:", err);
    res.status(500).json({ message: "שגיאה בטעינת הפרופיל." });
  }
});

module.exports = router;
