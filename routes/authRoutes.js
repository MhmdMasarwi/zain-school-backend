const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  authenticateToken,
  isAdmin,
  isAdminUsername,
  checkDefaultAdminCredentials,
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
} = require("../middleware/authMiddleware");

const router = express.Router();

const validateUserInput = (user) => {
  const usernameRegex = /^[A-Za-z]+$/;
  const nameRegex = /^[\u0600-\u06FF\sA-Za-z]{2,}$/;
  const passwordRegex = /^\d{9}$/;

  let errors = {};

  if (!nameRegex.test(user.firstName))
    errors.firstName = "השם הפרטי חייב להכיל לפחות 2 אותיות.";
  if (!nameRegex.test(user.lastName))
    errors.lastName = "שם המשפחה חייב להכיל לפחות 2 אותיות.";
  if (!nameRegex.test(user.fatherName))
    errors.fatherName = "שם האב חייב להכיל לפחות 2 אותיות.";
  if (!usernameRegex.test(user.username))
    errors.username = "שם המשתמש חייב להיות באותיות באנגלית בלבד.";
  if (!passwordRegex.test(user.password))
    errors.password = "הסיסמה חייבת להכיל בדיוק 9 ספרות.";
  if (!user.gradeLevel) errors.gradeLevel = "יש לבחור כיתה.";
  if (!user.className) errors.className = "יש לבחור שם כיתה.";

  return Object.keys(errors).length === 0 ? null : errors;
};

// ✅ הרשמה
router.post("/register", async (req, res) => {
  // res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  const {
    firstName,
    lastName,
    fatherName,
    username,
    password,
    gradeLevel,
    className,
  } = req.body;

  if (isAdminUsername(username)) {
    return res.status(400).json({
      message: "לا يمكن استخدام اسم المستخدم هذا. اسم المستخدم محجوز للإدارة.",
    });
  }

  const validationErrors = validateUserInput({
    firstName,
    lastName,
    fatherName,
    username,
    password,
    gradeLevel,
    className,
  });
  if (validationErrors)
    return res
      .status(400)
      .json({ message: "שגיאה בהרשמה.", errors: validationErrors });

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser)
      return res.status(400).json({ message: "שם המשתמש כבר תפוס." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      firstName,
      lastName,
      fatherName,
      username,
      password: hashedPassword,
      gradeLevel,
      className,
    });

    await newUser.save();

    res.status(201).json({ message: "המשתמש נרשם בהצלחה." });
  } catch (err) {
    console.error("❌ שגיאה בהרשמה:", err);
    res.status(500).json({ message: "שגיאה בהרשמה.", error: err.message });
  }
});

// تسجيل الدخول مع دعم المسؤول الثابت
router.post("/login", async (req, res) => {
  // res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "חובה להזין שם משתמש וסיסמה." });
  }

  try {
    // التحقق مما إذا كان المستخدم هو المسؤول الثابت
    if (checkDefaultAdminCredentials(username, password)) {
      // البحث عن المسؤول الثابت في قاعدة البيانات
      let adminUser = await User.findOne({ username: ADMIN_USERNAME });

      // إذا لم يكن المسؤول موجودًا، قم بإنشائه
      if (!adminUser) {
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
        adminUser = new User({
          firstName: "Admin",
          lastName: "Admin",
          fatherName: "Admin",
          username: ADMIN_USERNAME,
          password: hashedPassword,
          gradeLevel: "Admin",
          className: "Admin",
          isAdmin: true,
        });
        await adminUser.save();
        console.log("🔐 Default admin account created successfully");
      }
      // تأكد من أن المستخدم مدير
      else if (!adminUser.isAdmin) {
        adminUser.isAdmin = true;
        await adminUser.save();
        console.log("🔐 Admin permissions updated for default user");
      }

      // إنشاء التوكن للمدير
      const token = jwt.sign(
        { id: adminUser._id, isAdmin: true },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      return res.json({
        message: "Admin login successful",
        token,
        user: {
          id: adminUser._id,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          isAdmin: true,
        },
      });
    }

    // التحقق من المستخدمين العاديين
    const user = await User.findOne({ username });
    if (!user)
      return res.status(400).json({ message: "שם משתמש או סיסמה שגויים." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "שם משתמש או סיסמה שגויים." });

    if (!process.env.JWT_SECRET) {
      throw new Error("🔴 חסר JWT_SECRET בסביבת העבודה!");
    }

    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "התחברות בוצעה בהצלחה.",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
      },
    });
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

// ===== Admin Routes =====

// Get all users (admin only)
router.get("/users", authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    console.error("❌ שגיאה בטעינת משתמשים:", err);
    res.status(500).json({ message: "שגיאה בטעינת משתמשים." });
  }
});

// Get single user by ID (admin only)
router.get("/users/:userId", authenticateToken, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "המשתמש לא נמצא." });
    }
    res.json(user);
  } catch (err) {
    console.error("❌ שגיאה בטעינת המשתמש:", err);
    res.status(500).json({ message: "שגיאה בטעינת המשתמש." });
  }
});

// Update user (admin only)
router.put("/users/:userId", authenticateToken, isAdmin, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      fatherName,
      username,
      gradeLevel,
      className,
      isAdmin,
    } = req.body;

    // Check if username already exists (if changing username)
    if (username) {
      const existingUser = await User.findOne({
        username,
        _id: { $ne: req.params.userId },
      });

      if (existingUser) {
        return res.status(400).json({ message: "שם המשתמש כבר תפוס." });
      }
    }

    // Build update object
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (fatherName) updateData.fatherName = fatherName;
    if (username) updateData.username = username;
    if (gradeLevel) updateData.gradeLevel = gradeLevel;
    if (className) updateData.className = className;
    if (isAdmin !== undefined) updateData.isAdmin = isAdmin;

    // Update password if provided
    if (req.body.password) {
      const passwordRegex = /^\d{9}$/;
      if (!passwordRegex.test(req.body.password)) {
        return res
          .status(400)
          .json({ message: "הסיסמה חייבת להכיל בדיוק 9 ספרות." });
      }
      updateData.password = await bcrypt.hash(req.body.password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "המשתמש לא נמצא." });
    }

    res.json({ message: "המשתמש עודכן בהצלחה.", user: updatedUser });
  } catch (err) {
    console.error("❌ שגיאה בעדכון המשתמש:", err);
    res
      .status(500)
      .json({ message: "שגיאה בעדכון המשתמש.", error: err.message });
  }
});

// Delete user (admin only)
router.delete(
  "/users/:userId",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    try {
      const user = await User.findByIdAndDelete(req.params.userId);
      if (!user) {
        return res.status(404).json({ message: "המשתמש לא נמצא." });
      }
      res.json({ message: "המשתמש נמחק בהצלחה." });
    } catch (err) {
      console.error("❌ שגיאה במחיקת המשתמש:", err);
      res.status(500).json({ message: "שגיאה במחיקת המשתמש." });
    }
  }
);

// Create a new admin user route
router.post("/create-admin", authenticateToken, isAdmin, async (req, res) => {
  const {
    firstName,
    lastName,
    fatherName,
    username,
    password,
    gradeLevel,
    className,
  } = req.body;

  const validationErrors = validateUserInput({
    firstName,
    lastName,
    fatherName,
    username,
    password,
    gradeLevel,
    className,
  });
  if (validationErrors)
    return res
      .status(400)
      .json({ message: "שגיאה ביצירת מנהל.", errors: validationErrors });

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser)
      return res.status(400).json({ message: "שם המשתמש כבר תפוס." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new User({
      firstName,
      lastName,
      fatherName,
      username,
      password: hashedPassword,
      gradeLevel,
      className,
      isAdmin: true,
    });

    await newAdmin.save();

    res.status(201).json({ message: "המנהל נוצר בהצלחה." });
  } catch (err) {
    console.error("❌ שגיאה ביצירת מנהל:", err);
    res.status(500).json({ message: "שגיאה ביצירת מנהל.", error: err.message });
  }
});

// Special route to set first admin - IMPORTANT: Secure or remove this route after first admin setup
router.post("/set-first-admin", async (req, res) => {
  try {
    // Check if there's already an admin in the system
    const existingAdmin = await User.findOne({ isAdmin: true });
    if (existingAdmin) {
      return res.status(403).json({
        message:
          "פעולה נדחתה. כבר קיים מנהל במערכת. השתמש בחשבון מנהל כדי ליצור מנהלים נוספים.",
      });
    }

    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ message: "חובה לספק שם משתמש." });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "המשתמש לא נמצא." });
    }

    user.isAdmin = true;
    await user.save();

    res.json({ message: "המשתמש הוגדר כמנהל בהצלחה." });
  } catch (err) {
    console.error("❌ שגיאה בהגדרת מנהל ראשון:", err);
    res.status(500).json({ message: "שגיאה בהגדרת מנהל.", error: err.message });
  }
});

// تعديل طريقة إنشاء المسؤول الافتراضي
router.post("/create-default-admin", async (req, res) => {
  try {
    // البحث عن مستخدم بالاسم الثابت للمسؤول
    const existingAdmin = await User.findOne({ username: ADMIN_USERNAME });
    if (existingAdmin) {
      // تحديث كلمة المرور للمسؤول الافتراضي إذا كان موجودًا
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      existingAdmin.password = hashedPassword;
      existingAdmin.isAdmin = true; // تأكد من أنه مسؤول
      existingAdmin.firstName = "Admin";
      existingAdmin.lastName = "Admin";
      existingAdmin.fatherName = "Admin";
      await existingAdmin.save();
      return res.status(200).json({
        message: "Default admin details updated successfully.",
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
      });
    }

    // إنشاء مسؤول جديد بالبيانات الثابتة
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const defaultAdmin = new User({
      firstName: "Admin",
      lastName: "Admin",
      fatherName: "Admin",
      username: ADMIN_USERNAME,
      password: hashedPassword,
      gradeLevel: "Admin",
      className: "Admin",
      isAdmin: true,
    });

    await defaultAdmin.save();

    res.status(201).json({
      message: "Default admin created successfully.",
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
    });
  } catch (err) {
    console.error("❌ Error creating default admin:", err);
    res
      .status(500)
      .json({ message: "Error creating default admin.", error: err.message });
  }
});

// طريقة للتأكد من وجود المسؤول الثابت
router.get("/check-default-admin", async (req, res) => {
  try {
    const adminUser = await User.findOne({ username: ADMIN_USERNAME });
    if (adminUser) {
      return res.json({
        exists: true,
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
      });
    } else {
      return res.json({
        exists: false,
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
      });
    }
  } catch (err) {
    console.error("❌ Error checking default admin:", err);
    res
      .status(500)
      .json({ message: "Error checking default admin.", error: err.message });
  }
});

module.exports = router;
