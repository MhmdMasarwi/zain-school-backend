const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Image = require('../models/Image');
const upload = require('../middleware/uploadMiddleware');

// دالة مساعدة للحصول على URL كامل للصورة
const getImageUrl = (req, imagePath) => {
  const relativePath = imagePath.split('uploads\\').pop().replace(/\\/g, '/');
  return `${req.protocol}://${req.get('host')}/uploads/${relativePath}`;
};

// رفع صورة - POST /api/upload أو POST /api/images/upload
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'لم يتم توفير صورة' });
    }

    // التحقق من نوع الصورة
    const { type, name, description, uploadedBy } = req.body;
    if (!type || !['environment', 'school'].includes(type)) {
      // حذف الملف المرفوع إذا كان النوع غير صالح
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'نوع الصورة يجب أن يكون إما environment أو school' });
    }

    if (!name) {
      // حذف الملف المرفوع إذا كان الاسم مفقودًا
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'اسم الصورة مطلوب' });
    }

    // إنشاء سجل صورة جديد
    const newImage = new Image({
      name,
      description: description || '',
      type,
      filePath: req.file.path,
      uploadedBy: uploadedBy || 'unknown',
      uploadDate: new Date()
    });

    await newImage.save();

    // إرجاع الصورة مع URL كامل
    const imageUrl = getImageUrl(req, req.file.path);
    
    res.status(201).json({
      message: 'تم رفع الصورة بنجاح',
      image: {
        ...newImage.toObject(),
        url: imageUrl
      }
    });
  } catch (error) {
    console.error('خطأ في رفع الصورة:', error);
    if (req.file && req.file.path) {
      // تنظيف الملف في حالة الخطأ
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'فشل في رفع الصورة', error: error.message });
  }
});

// الحصول على صور البيئة - GET /api/images/environment
router.get('/environment', async (req, res) => {
  try {
    const images = await Image.find({ type: 'environment' }).sort({ uploadDate: -1 });
    
    // إضافة URL كامل لكل صورة
    const imagesWithUrls = images.map(image => ({
      ...image.toObject(),
      url: getImageUrl(req, image.filePath)
    }));
    
    res.status(200).json({ images: imagesWithUrls });
  } catch (error) {
    console.error('خطأ في جلب صور البيئة:', error);
    res.status(500).json({ message: 'فشل في جلب صور البيئة', error: error.message });
  }
});

// الحصول على صور المدرسة - GET /api/images/school
router.get('/school', async (req, res) => {
  try {
    const images = await Image.find({ type: 'school' }).sort({ uploadDate: -1 });
    
    // إضافة URL كامل لكل صورة
    const imagesWithUrls = images.map(image => ({
      ...image.toObject(),
      url: getImageUrl(req, image.filePath)
    }));
    
    res.status(200).json({ images: imagesWithUrls });
  } catch (error) {
    console.error('خطأ في جلب صور المدرسة:', error);
    res.status(500).json({ message: 'فشل في جلب صور المدرسة', error: error.message });
  }
});

// حذف صورة - DELETE /api/images/:id
router.delete('/:id', async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    
    if (!image) {
      return res.status(404).json({ message: 'الصورة غير موجودة' });
    }
    
    // حذف الملف من القرص
    if (fs.existsSync(image.filePath)) {
      fs.unlinkSync(image.filePath);
    }
    
    // حذف من قاعدة البيانات
    await Image.deleteOne({ _id: req.params.id });
    
    res.status(200).json({ message: 'تم حذف الصورة بنجاح' });
  } catch (error) {
    console.error('خطأ في حذف الصورة:', error);
    res.status(500).json({ message: 'فشل في حذف الصورة', error: error.message });
  }
});

module.exports = router; 