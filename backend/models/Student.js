const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
  rollNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
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
  admissionYear: {
    type: Number,
    required: true
  },
  // Current semester fee structure (for backward compatibility)
  feeStructure: {
    // Individual fee components
    tuitionFee: {
      type: Number,
      default: 0
    },
    examFee: {
      type: Number,
      default: 0
    },
    libraryFee: {
      type: Number,
      default: 0
    },
    labFee: {
      type: Number,
      default: 0
    },
    hostelFee: {
      type: Number,
      default: 0
    },
    messFee: {
      type: Number,
      default: 0
    },
    otherFee: {
      type: Number,
      default: 0
    },
    // Calculated totals
    totalAmount: {
      type: Number,
      required: true,
      default: 0
    },
    paidAmount: {
      type: Number,
      default: 0
    },
    pendingAmount: {
      type: Number,
      default: 0
    },
    dueDate: {
      type: Date,
      required: true
    }
  },
  // Semester-wise fee history
  semesterFees: [{
    semester: {
      type: Number,
      required: true
    },
    academicYear: {
      type: String,
      required: true
    },
    feeStructure: {
      tuitionFee: { type: Number, default: 0 },
      examFee: { type: Number, default: 0 },
      libraryFee: { type: Number, default: 0 },
      labFee: { type: Number, default: 0 },
      hostelFee: { type: Number, default: 0 },
      messFee: { type: Number, default: 0 },
      otherFee: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
      paidAmount: { type: Number, default: 0 },
      pendingAmount: { type: Number, default: 0 },
      dueDate: { type: Date, required: true }
    },
    payments: [{
      paymentId: String,
      amount: Number,
      feeType: String,
      paidAt: Date,
      transactionId: String
    }],
    status: {
      type: String,
      enum: ['pending', 'partial', 'completed'],
      default: 'pending'
    }
  }],
  guardianInfo: {
    name: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    },
    relation: {
      type: String,
      default: 'Parent'
    }
  },
  address: {
    street: {
      type: String,
      default: ''
    },
    city: {
      type: String,
      default: ''
    },
    state: {
      type: String,
      default: ''
    },
    zipCode: {
      type: String,
      default: ''
    },
    country: {
      type: String,
      default: 'India'
    }
  },
  profileImage: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Virtual for full name
studentSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Update total and pending amounts before saving
studentSchema.pre('save', function(next) {
  // Calculate total amount from individual fees
  const individualTotal = (this.feeStructure.tuitionFee || 0) + 
                         (this.feeStructure.examFee || 0) + 
                         (this.feeStructure.libraryFee || 0) + 
                         (this.feeStructure.labFee || 0) + 
                         (this.feeStructure.hostelFee || 0) + 
                         (this.feeStructure.messFee || 0) + 
                         (this.feeStructure.otherFee || 0);
  
  // Update total amount if individual fees are set
  if (individualTotal > 0) {
    this.feeStructure.totalAmount = individualTotal;
  }
  
  // Update pending amount
  this.feeStructure.pendingAmount = this.feeStructure.totalAmount - this.feeStructure.paidAmount;
  
  // Update semester fees calculation
  this.semesterFees.forEach(semFee => {
    const semTotal = (semFee.feeStructure.tuitionFee || 0) + 
                    (semFee.feeStructure.examFee || 0) + 
                    (semFee.feeStructure.libraryFee || 0) + 
                    (semFee.feeStructure.labFee || 0) + 
                    (semFee.feeStructure.hostelFee || 0) + 
                    (semFee.feeStructure.messFee || 0) + 
                    (semFee.feeStructure.otherFee || 0);
    
    if (semTotal > 0) {
      semFee.feeStructure.totalAmount = semTotal;
    }
    
    semFee.feeStructure.pendingAmount = semFee.feeStructure.totalAmount - semFee.feeStructure.paidAmount;
    
    // Update status
    if (semFee.feeStructure.paidAmount === 0) {
      semFee.status = 'pending';
    } else if (semFee.feeStructure.paidAmount >= semFee.feeStructure.totalAmount) {
      semFee.status = 'completed';
    } else {
      semFee.status = 'partial';
    }
  });
  
  next();
});

// Hash password before saving
studentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
studentSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to check if a specific fee type is already paid for current semester
studentSchema.methods.isFeeTypePaid = function(feeType, semester = null) {
  const targetSemester = semester || this.semester;
  
  // Check current semester
  if (targetSemester === this.semester) {
    const feeStructure = this.feeStructure;
    switch (feeType) {
      case 'tuition':
        return feeStructure.paidAmount >= feeStructure.tuitionFee && feeStructure.tuitionFee > 0;
      case 'exam':
        return feeStructure.paidAmount >= feeStructure.examFee && feeStructure.examFee > 0;
      case 'library':
        return feeStructure.paidAmount >= feeStructure.libraryFee && feeStructure.libraryFee > 0;
      case 'lab':
        return feeStructure.paidAmount >= feeStructure.labFee && feeStructure.labFee > 0;
      case 'hostel':
        return feeStructure.paidAmount >= feeStructure.hostelFee && feeStructure.hostelFee > 0;
      case 'mess':
        return feeStructure.paidAmount >= feeStructure.messFee && feeStructure.messFee > 0;
      case 'other':
        return feeStructure.paidAmount >= feeStructure.otherFee && feeStructure.otherFee > 0;
      case 'full':
        return feeStructure.paidAmount >= feeStructure.totalAmount;
      default:
        return false;
    }
  }
  
  // Check previous semesters
  const semesterFee = this.semesterFees.find(sf => sf.semester === targetSemester);
  if (!semesterFee) return false;
  
  return semesterFee.status === 'completed';
};

// Method to get fee structure for a specific semester
studentSchema.methods.getFeeStructureForSemester = function(semester = null) {
  const targetSemester = semester || this.semester;
  
  if (targetSemester === this.semester) {
    return this.feeStructure;
  }
  
  const semesterFee = this.semesterFees.find(sf => sf.semester === targetSemester);
  return semesterFee ? semesterFee.feeStructure : null;
};

module.exports = mongoose.model('Student', studentSchema); 