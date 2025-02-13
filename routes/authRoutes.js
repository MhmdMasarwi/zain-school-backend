const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

const validateUserInput = (user) => {
  const usernameRegex = /^[A-Za-z]+$/;
  const nameRegex = /^[\u0600-\u06FF\sA-Za-z]{2,}$/;
  const passwordRegex = /^\d{9}$/;

  let errors = {};

  if (!nameRegex.test(user.firstName)) errors.firstName = "השם הפרטי חייב להכיל לפחות 2 אותיות.";
  if (!nameRegex.test(user.lastName)) errors.lastName = "שם המשפחה חייב להכיל לפחות 2 אותיות.";
  if (!nameRegex.test(user.fatherName)) errors.fatherName = "שם האב חייב להכיל לפחות 2 אותיות.";
  if (!usernameRegex.test(user.username)) errors.username = "שם המשתמש חייב להיות באותיות באנגלית בלבד.";
  if (!passwordRegex.test(user.password)) errors.password = "הסיסמה חייבת להכיל בדיוק 9 ספרות.";
  if (!user.gradeLevel) errors.gradeLevel = "יש לבחור כיתה.";
  if (!user.className) errors.className = "יש לבחור שם כיתה.";

  return Object.keys(errors).length === 0 ? null : errors;
};

// ✅ הרשמה
router.post("/register", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  const { firstName, lastName, fatherName, username, password, gradeLevel, className } = req.body;

  const validationErrors = validateUserInput({ firstName, lastName, fatherName, username, password, gradeLevel, className });
  if (validationErrors) return res.status(400).json({ message: "שגיאה בהרשמה.", errors: validationErrors });

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: "שם המשתמש כבר תפוס." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ firstName, lastName, fatherName, username, password: hashedPassword, gradeLevel, className });

    await newUser.save();
    
    res.status(201).json({ message: "המשתמש נרשם בהצלחה." });
  } catch (err) {
    console.error("❌ שגיאה בהרשמה:", err);
    res.status(500).json({ message: "שגיאה בהרשמה.", error: err.message });
  }
});

router.post("/login", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: "חובה להזין שם משתמש וסיסמה." });
  }

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

router.get("/profile", authenticateToken, async (req, res) => {
  try {
    console.log("📌 קבלת פרופיל למשתמש עם ID:", req.user.id);
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "המשתמש לא נמצא." });
    }
    res.json(user);
  } catch (err) {
    console.error("❌ שגיאה בטעינת הפרופיל:", err);
    res.status(500).json({ message: "שגיאה בטעינת הפרופיל." });
  }
});


module.exports = router;
