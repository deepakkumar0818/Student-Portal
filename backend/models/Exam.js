const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  questionType: {
    type: String,
    enum: ['multiple-choice', 'true-false', 'short-answer', 'essay'],
    default: 'multiple-choice'
  },
  options: [{
    text: String,
    isCorrect: Boolean
  }],
  correctAnswer: String, // For non-MCQ questions
  marks: {
    type: Number,
    required: true,
    min: 1
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  }
});

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  course: {
    type: String,
    required: true,
    trim: true
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  examType: {
    type: String,
    enum: ['midterm', 'final', 'quiz', 'assignment', 'practical'],
    required: true
  },
  totalMarks: {
    type: Number,
    required: true,
    min: 1
  },
  passingMarks: {
    type: Number,
    required: true,
    min: 1
  },
  duration: {
    type: Number, // Duration in minutes
    required: true,
    min: 1
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  instructions: [{
    type: String,
    trim: true
  }],
  questions: [questionSchema],
  allowedStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    rollNumber: String,
    enrolledAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    showResultsImmediately: {
      type: Boolean,
      default: false
    },
    allowReview: {
      type: Boolean,
      default: true
    },
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    shuffleOptions: {
      type: Boolean,
      default: false
    },
    preventTabSwitch: {
      type: Boolean,
      default: true
    },
    enableProctoring: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'active', 'completed', 'cancelled'],
    default: 'draft'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Virtual for enrolled students count
examSchema.virtual('enrolledCount').get(function() {
  return this.allowedStudents ? this.allowedStudents.length : 0;
});

// Virtual for exam status based on dates
examSchema.virtual('currentStatus').get(function() {
  const now = new Date();
  if (this.status === 'draft') return 'draft';
  if (this.status === 'cancelled') return 'cancelled';
  if (now < this.startDate) return 'upcoming';
  if (now > this.endDate) return 'completed';
  return 'active';
});

// Method to check if student is allowed to take exam
examSchema.methods.isStudentAllowed = function(studentId) {
  return this.allowedStudents.some(student => 
    student.student.toString() === studentId.toString()
  );
};

// Method to enroll student
examSchema.methods.enrollStudent = function(studentId, rollNumber) {
  if (!this.isStudentAllowed(studentId)) {
    this.allowedStudents.push({
      student: studentId,
      rollNumber: rollNumber,
      enrolledAt: new Date()
    });
  }
};

// Auto-update exam status based on dates
examSchema.pre('save', function(next) {
  const now = new Date();
  
  if (this.status !== 'draft' && this.status !== 'cancelled') {
    if (now < this.startDate) {
      this.status = 'published';
    } else if (now >= this.startDate && now <= this.endDate) {
      this.status = 'active';
    } else if (now > this.endDate) {
      this.status = 'completed';
    }
  }
  
  // Calculate total marks from questions
  if (this.questions && this.questions.length > 0) {
    this.totalMarks = this.questions.reduce((total, question) => total + question.marks, 0);
  }
  
  next();
});

// Index for better query performance
examSchema.index({ course: 1, semester: 1, department: 1 });
examSchema.index({ status: 1, startDate: 1 });
examSchema.index({ 'allowedStudents.student': 1 });

module.exports = mongoose.model('Exam', examSchema); 