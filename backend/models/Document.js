const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  rollNumber: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  documentType: {
    type: String,
    enum: [
      // Student uploaded documents
      'class12_marksheet',
      'class10_marksheet', 
      'birth_certificate',
      'aadhar_card',
      'caste_certificate',
      'income_certificate',
      'migration_certificate',
      'character_certificate',
      'passport_photo',
      'signature',
      'other_document',
      // Institution provided documents
      'degree_certificate',
      'provisional_certificate',
      'semester_marksheet',
      'transcript',
      'character_certificate_college',
      'migration_certificate_college'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: String,
    enum: ['student', 'admin'],
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  verifiedAt: {
    type: Date
  },
  verificationNotes: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // For semester results and degree
  academicYear: {
    type: String
  },
  semester: {
    type: Number
  },
  // For results/marksheets
  subjects: [{
    subjectName: String,
    subjectCode: String,
    credits: Number,
    marksObtained: Number,
    maxMarks: Number,
    grade: String
  }],
  totalMarks: {
    type: Number
  },
  obtainedMarks: {
    type: Number
  },
  percentage: {
    type: Number
  },
  cgpa: {
    type: Number
  },
  result: {
    type: String,
    enum: ['Pass', 'Fail', 'Distinction', 'First Class', 'Second Class', 'Third Class']
  }
}, {
  timestamps: true
});

// Index for faster queries
documentSchema.index({ studentId: 1, documentType: 1 });
documentSchema.index({ rollNumber: 1 });

// Virtual for full file URL
documentSchema.virtual('fileUrl').get(function() {
  return `/api/documents/download/${this._id}`;
});

// Ensure virtual fields are serialized
documentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Document', documentSchema); 