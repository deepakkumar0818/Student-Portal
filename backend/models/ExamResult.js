const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  questionText: String,
  selectedAnswer: String, // For MCQ
  textAnswer: String, // For text-based questions
  selectedOptions: [String], // For multiple select
  isCorrect: Boolean,
  marksAwarded: {
    type: Number,
    default: 0
  },
  maxMarks: Number,
  timeTaken: Number // Time taken for this question in seconds
});

const examResultSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  rollNumber: {
    type: String,
    required: true
  },
  answers: [answerSchema],
  totalMarks: {
    type: Number,
    required: true,
    default: 0
  },
  obtainedMarks: {
    type: Number,
    required: true,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  grade: {
    type: String,
    enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'],
    default: 'F'
  },
  status: {
    type: String,
    enum: ['in-progress', 'submitted', 'evaluated', 'published'],
    default: 'in-progress'
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  submittedAt: {
    type: Date
  },
  timeTaken: {
    type: Number, // Total time taken in minutes
    default: 0
  },
  attempts: {
    type: Number,
    default: 1
  },
  isLate: {
    type: Boolean,
    default: false
  },
  violations: [{
    type: {
      type: String,
      enum: ['tab-switch', 'window-blur', 'copy-paste', 'right-click', 'fullscreen-exit']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    description: String
  }],
  browserInfo: {
    userAgent: String,
    platform: String,
    language: String,
    screenResolution: String,
    ipAddress: String
  },
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  evaluatedAt: Date,
  remarks: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Virtual for pass/fail status
examResultSchema.virtual('isPassed').get(function() {
  return this.obtainedMarks >= this.exam?.passingMarks;
});

// Virtual for completion status
examResultSchema.virtual('isCompleted').get(function() {
  return this.status === 'submitted' || this.status === 'evaluated' || this.status === 'published';
});

// Method to calculate grade
examResultSchema.methods.calculateGrade = function() {
  const percentage = this.percentage;
  
  if (percentage >= 90) return 'A+';
  if (percentage >= 85) return 'A';
  if (percentage >= 80) return 'B+';
  if (percentage >= 75) return 'B';
  if (percentage >= 70) return 'C+';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
};

// Method to calculate results
examResultSchema.methods.calculateResults = function() {
  let obtainedMarks = 0;
  let totalMarks = 0;
  
  this.answers.forEach(answer => {
    obtainedMarks += answer.marksAwarded || 0;
    totalMarks += answer.maxMarks || 0;
  });
  
  this.obtainedMarks = obtainedMarks;
  this.totalMarks = totalMarks;
  this.percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;
  this.grade = this.calculateGrade();
};

// Method to add violation
examResultSchema.methods.addViolation = function(type, description) {
  this.violations.push({
    type,
    description,
    timestamp: new Date()
  });
};

// Pre-save middleware to calculate results
examResultSchema.pre('save', function(next) {
  if (this.isModified('answers')) {
    this.calculateResults();
  }
  
  // Calculate time taken
  if (this.endTime && this.startTime) {
    this.timeTaken = Math.round((this.endTime - this.startTime) / (1000 * 60)); // in minutes
  }
  
  next();
});

// Index for better query performance
examResultSchema.index({ exam: 1, student: 1 });
examResultSchema.index({ rollNumber: 1, exam: 1 });
examResultSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ExamResult', examResultSchema); 