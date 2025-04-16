require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const imageRoutes = require("./routes/imageRoutes");
const User = require("./models/User");
const {
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
} = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/school";

// تكوين CORS للسماح بالطلبات من الواجهة الأمامية
const corsOptions = {
  origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:5001"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تقديم الملفات الثابتة من مجلد uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// التأكد من وجود مجلد uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!require('fs').existsSync(uploadsDir)) {
  require('fs').mkdirSync(uploadsDir, { recursive: true });
}

// تمكين CORS لجميع الطلبات
app.options("*", cors(corsOptions));

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("✅ تم الاتصال بقاعدة البيانات MongoDB");

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
          `✅ تم إنشاء حساب المسؤول الافتراضي. اسم المستخدم: ${ADMIN_USERNAME}`
        );
      } else {
        if (!adminUser.isAdmin) {
          adminUser.isAdmin = true;
          await adminUser.save();
          console.log(`✅ تم تحديث صلاحيات المستخدم ${ADMIN_USERNAME} إلى مسؤول`);
        }
        console.log(
          `✅ حساب المسؤول الافتراضي موجود. اسم المستخدم: ${ADMIN_USERNAME}`
        );
      }
    } catch (err) {
      console.error("❌ خطأ في التحقق من المسؤول الافتراضي:", err);
    }
  })
  .catch((err) => console.error("❌ خطأ في الاتصال بقاعدة البيانات MongoDB:", err));

// سجل الطلبات الواردة
app.use((req, res, next) => {
  console.log(`📌 طلب وارد: ${req.method} ${req.url}`);
  if (Object.keys(req.body).length) console.log("📌 محتوى الطلب:", req.body);
  next();
});

// المسارات
app.use("/api/auth", authRoutes);
app.use("/api/images", imageRoutes);


// معالجة الأخطاء
app.use((err, req, res, next) => {
  console.error("❌ خطأ في الخادم:", err.message);
  res.status(500).json({ 
    message: "حدث خطأ في الخادم", 
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
});
const tasksRoutes = require('./routes/tasks');
app.use('/api/tasks', tasksRoutes);
