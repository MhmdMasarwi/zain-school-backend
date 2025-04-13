const multer = require('multer');
const path = require('path');
const fs = require('fs');

// التأكد من وجود مجلد uploads
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// تكوين التخزين
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // إنشاء اسم ملف فريد مع الامتداد الأصلي
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// فلتر الملفات للسماح فقط بأنواع الصور المحددة
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('يُسمح فقط بملفات الصور من نوع jpg أو jpeg أو png أو gif أو webp'), false);
  }
};

// إنشاء middleware للتحميل مع حد حجم الملف 5 ميجابايت
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1 // ملف واحد فقط في كل مرة
  },
  fileFilter: fileFilter
});

// معالجة أخطاء multer
upload.handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'حجم الملف كبير جداً. الحد الأقصى المسموح به هو 5 ميجابايت'
      });
    }
    return res.status(400).json({
      message: 'خطأ في تحميل الملف',
      error: err.message
    });
  }
  next(err);
};

module.exports = upload; 