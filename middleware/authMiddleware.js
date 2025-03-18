const jwt = require("jsonwebtoken");
const User = require("../models/User");

// تعريف بيانات المسؤول الثابتة
const ADMIN_USERNAME = "adminzain";
const ADMIN_PASSWORD = "123456789"; // كلمة المرور الثابتة للمسؤول (9 أرقام حسب متطلبات التحقق)

const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(403).json({ message: "גישה נדחתה. חסר טוקן." });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "טוקן לא תקף." });
    req.user = user;
    next();
  });
};

const isAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(403).json({ message: "גישה נדחתה. לא מחובר." });
    }

    // First check if isAdmin flag is in the token
    if (req.user.isAdmin === true) {
      return next();
    }

    // If not in token, verify from the database
    const user = await User.findById(req.user.id);
    if (!user || !user.isAdmin) {
      return res
        .status(403)
        .json({ message: "גישה נדחתה. דרושות הרשאות מנהל." });
    }

    next();
  } catch (err) {
    console.error("❌ שגיאה בבדיקת הרשאות מנהל:", err);
    res.status(500).json({ message: "שגיאה בבדיקת הרשאות." });
  }
};

// التحقق ما إذا كان اسم المستخدم هو اسم المسؤول الثابت
const isAdminUsername = (username) => {
  return username === ADMIN_USERNAME;
};

// التحقق من بيانات المسؤول الثابتة
const checkDefaultAdminCredentials = (username, password) => {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
};

module.exports = {
  authenticateToken,
  isAdmin,
  isAdminUsername,
  checkDefaultAdminCredentials,
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
};
