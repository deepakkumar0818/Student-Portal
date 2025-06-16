const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    unique: true,
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  feeType: {
    type: String,
    enum: ['tuition', 'exam', 'library', 'lab', 'hostel', 'mess', 'other', 'full'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'successful', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  razorpayOrderId: {
    type: String,
    unique: true,
    sparse: true
  },
  razorpayPaymentId: {
    type: String,
    unique: true,
    sparse: true
  },
  razorpaySignature: {
    type: String
  },
  qrCodeImage: {
    type: String, // Base64 encoded QR code image
    required: true
  },
  qrCodeUrl: {
    type: String, // UPI payment URL
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  paidAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  receipt: {
    receiptNumber: {
      type: String,
      unique: true,
      sparse: true
    },
    receiptUrl: String
  },
  // Legacy fields for backward compatibility
  semester: {
    type: Number
  },
  academicYear: {
    type: String
  },
  dueDate: {
    type: Date
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  },
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Generate receipt number before saving
paymentSchema.pre('save', function(next) {
  if ((this.status === 'completed' || this.status === 'successful') && !this.receipt.receiptNumber) {
    const timestamp = Date.now().toString();
    this.receipt.receiptNumber = `RCP${timestamp}${Math.floor(Math.random() * 1000)}`;
  }
  next();
});

// Auto-expire pending payments
paymentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for faster queries
paymentSchema.index({ student: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ feeType: 1 });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema); 