require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const authRoutes = require("./routes/authRoutes");
const User = require("./models/User");
const {
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
} = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/school";

const corsOptions = {
  origin: "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

// app.options("*", cors(corsOptions));

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("✅ Connected to MongoDB");

    // التحقق من وجود المسؤول الثابت وإنشائه إذا لم يكن موجودًا
    try {
      const adminUser = await User.findOne({ username: ADMIN_USERNAME });
      if (!adminUser) {
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
        console.log(
          `✅ Default admin user created automatically. Username: ${ADMIN_USERNAME}`
        );
      } else {
        // تأكد من أن المستخدم مسؤول
        if (!adminUser.isAdmin) {
          adminUser.isAdmin = true;
          await adminUser.save();
          console.log(`✅ User ${ADMIN_USERNAME} permissions updated to admin`);
        }
        console.log(
          `✅ Default admin user exists. Username: ${ADMIN_USERNAME}`
        );
      }
    } catch (err) {
      console.error("❌ Error checking default admin:", err);
    }
  })
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

app.use((req, res, next) => {
  console.log(`📌 בקשה נכנסת: ${req.method} ${req.url}`);
  if (Object.keys(req.body).length) console.log("📌 גוף הבקשה:", req.body);
  next();
});

app.use("/api/auth", authRoutes);

app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message);
  res.status(500).json({ message: "שגיאה בשרת", error: err.message });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
