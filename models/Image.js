const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'اسم الصورة مطلوب'],
    trim: true
  },
  description: {
    type: String,
    required: false,
    trim: true
  },
  type: {
    type: String,
    required: [true, 'نوع الصورة مطلوب'],
    enum: {
      values: ['environment', 'school'],
      message: 'نوع الصورة يجب أن يكون إما environment أو school'
    }
  },
  filePath: {
    type: String,
    required: [true, 'مسار الملف مطلوب']
  },
  uploadedBy: {
    type: String,
    required: false,
    default: 'unknown'
  },
  uploadDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// إضافة حقل افتراضي url
imageSchema.virtual('url').get(function() {
  if (!this.filePath) return null;
  const relativePath = this.filePath.split('uploads\\').pop().replace(/\\/g, '/');
  return `/uploads/${relativePath}`;
});

module.exports = mongoose.model('Image', imageSchema); 