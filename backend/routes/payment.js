const express = require('express');
const QRCode = require('qrcode');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { protect, adminOnly } = require('../middleware/auth');
const Student = require('../models/Student');
const Payment = require('../models/Payment');

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Generate QR Code for Payment (Updated to prevent duplicate payments)
// @route   POST /api/payment/generate-qr
// @access  Private (Admin)
router.post('/generate-qr', protect, adminOnly, async (req, res) => {
  try {
    const { studentId, amount, feeType, description, semester } = req.body;

    if (!studentId || !amount || !feeType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide studentId, amount, and feeType'
      });
    }

    // Find student
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const targetSemester = semester || student.semester;
    
    // Check if the specific fee type is already paid
    if (student.isFeeTypePaid(feeType, targetSemester)) {
      return res.status(400).json({
        success: false,
        message: `${feeType} fee is already paid for semester ${targetSemester}`
      });
    }

    // Get fee structure for the target semester
    const feeStructure = student.getFeeStructureForSemester(targetSemester);
    if (!feeStructure) {
      return res.status(400).json({
        success: false,
        message: `Fee structure not found for semester ${targetSemester}`
      });
    }

    // Validate amount against fee structure
    let expectedAmount = 0;
    switch (feeType) {
      case 'tuition':
        expectedAmount = feeStructure.tuitionFee;
        break;
      case 'exam':
        expectedAmount = feeStructure.examFee;
        break;
      case 'library':
        expectedAmount = feeStructure.libraryFee;
        break;
      case 'lab':
        expectedAmount = feeStructure.labFee;
        break;
      case 'hostel':
        expectedAmount = feeStructure.hostelFee;
        break;
      case 'mess':
        expectedAmount = feeStructure.messFee;
        break;
      case 'other':
        expectedAmount = feeStructure.otherFee;
        break;
      case 'full':
        expectedAmount = feeStructure.pendingAmount;
        break;
      default:
        // Allow custom amounts for partial payments
        break;
    }

    // Check if amount is reasonable
    if (expectedAmount > 0 && amount > expectedAmount) {
      return res.status(400).json({
        success: false,
        message: `Amount (₹${amount}) exceeds expected ${feeType} fee (₹${expectedAmount})`
      });
    }

    // Check if total payment would exceed total amount
    if (feeStructure.paidAmount + amount > feeStructure.totalAmount) {
      const maxPayable = feeStructure.totalAmount - feeStructure.paidAmount;
      return res.status(400).json({
        success: false,
        message: `Payment amount (₹${amount}) would exceed pending amount (₹${maxPayable})`
      });
    }

    // Check for existing pending payment for same fee type
    const existingPayment = await Payment.findOne({
      student: studentId,
      feeType,
      semester: targetSemester,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: `A pending payment already exists for ${feeType} fee. Please complete or wait for it to expire.`,
        data: {
          existingPaymentId: existingPayment.paymentId,
          expiresAt: existingPayment.expiresAt
        }
      });
    }

    // Create unique payment ID
    const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create Razorpay order
    const options = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: paymentId,
      notes: {
        student_id: student._id.toString(),
        roll_number: student.rollNumber,
        fee_type: feeType,
        semester: targetSemester.toString(),
        payment_id: paymentId
      }
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Generate UPI payment URL for QR code
    const paymentUrl = `upi://pay?pa=studentportal@upi&pn=Student Portal&am=${amount}&cu=INR&tn=${description || `${feeType} payment for ${student.rollNumber} Sem-${targetSemester}`}&tr=${paymentId}`;

    // Generate QR code as base64 image
    const qrCodeImage = await QRCode.toDataURL(paymentUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Create payment record
    const payment = await Payment.create({
      paymentId,
      student: student._id,
      amount,
      feeType,
      semester: targetSemester,
      academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      description: description || `${feeType} payment for ${student.fullName} - Semester ${targetSemester}`,
      status: 'pending',
      razorpayOrderId: razorpayOrder.id,
      qrCodeImage,
      qrCodeUrl: paymentUrl,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'QR Code generated successfully',
      data: {
        paymentId: payment.paymentId,
        qrCodeImage,
        amount,
        feeType,
        semester: targetSemester,
        status: 'pending',
        expiresAt: payment.expiresAt,
        razorpayOrderId: razorpayOrder.id,
        warnings: expectedAmount > 0 && amount < expectedAmount ? 
          [`This is a partial payment. Expected ${feeType} fee is ₹${expectedAmount}`] : []
      }
    });
  } catch (error) {
    console.error('QR Generation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating QR code'
    });
  }
});

// @desc    Verify Payment
// @route   POST /api/payment/verify
// @access  Public
router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification data'
      });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Find payment record
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id }).populate('student');
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    // Check if payment is already completed
    if (payment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed'
      });
    }

    // Update payment status
    payment.status = 'completed';
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.paidAt = new Date();
    
    // Generate receipt number if not exists
    if (!payment.receipt.receiptNumber) {
      payment.receipt.receiptNumber = `RCP_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    }
    
    await payment.save();

    // Update student fee structure
    const student = payment.student;
    const paymentSemester = payment.semester || student.semester;
    
    console.log(`Payment verified for student ${student.rollNumber}: ${payment.feeType} fee of ₹${payment.amount} for semester ${paymentSemester}`);

    // Update current semester fees
    if (paymentSemester === student.semester) {
      const oldPaidAmount = student.feeStructure.paidAmount;
      student.feeStructure.paidAmount += payment.amount;
      console.log(`Current semester payment: Adding ${payment.amount} to ${oldPaidAmount} = ${student.feeStructure.paidAmount}`);
    } else {
      // Update semester history
      let semesterFee = student.semesterFees.find(sf => sf.semester === paymentSemester);
      
      if (!semesterFee) {
        // Create new semester fee record if it doesn't exist
        semesterFee = {
          semester: paymentSemester,
          academicYear: payment.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
          feeStructure: {
            tuitionFee: 0,
            examFee: 0,
            libraryFee: 0,
            labFee: 0,
            hostelFee: 0,
            messFee: 0,
            otherFee: 0,
            totalAmount: payment.amount, // Set as total for now
            paidAmount: 0,
            pendingAmount: 0,
            dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
          },
          payments: [],
          status: 'pending'
        };
        student.semesterFees.push(semesterFee);
      }
      
      // Add payment to semester history
      semesterFee.payments.push({
        paymentId: payment.paymentId,
        amount: payment.amount,
        feeType: payment.feeType,
        paidAt: payment.paidAt,
        transactionId: payment.razorpayPaymentId
      });
      
      // Update semester fee amounts
      semesterFee.feeStructure.paidAmount += payment.amount;
      
      console.log(`Previous semester payment: Added ${payment.amount} to semester ${paymentSemester}`);
    }
    
    await student.save();

    // Fetch updated student to confirm changes
    const updatedStudent = await Student.findById(student._id);
    console.log(`Updated student fee structure:`, updatedStudent.feeStructure);

    // Check if fees are fully paid
    const currentFeeStructure = paymentSemester === student.semester ? 
      updatedStudent.feeStructure : 
      updatedStudent.semesterFees.find(sf => sf.semester === paymentSemester)?.feeStructure;

    const isFullyPaid = currentFeeStructure?.paidAmount >= currentFeeStructure?.totalAmount;

    res.status(200).json({
      success: true,
      message: isFullyPaid ? 
        `Payment completed! All fees for semester ${paymentSemester} are now paid.` : 
        'Payment verified successfully',
      data: {
        paymentId: payment._id,
        receiptNumber: payment.receipt.receiptNumber,
        amount: payment.amount,
        feeType: payment.feeType,
        semester: paymentSemester,
        status: payment.status,
        paidAt: payment.paidAt,
        isFullyPaid,
        student: {
          id: student._id,
          name: student.fullName,
          rollNumber: student.rollNumber,
          currentSemester: student.semester,
          updatedFeeStructure: paymentSemester === student.semester ? {
            totalAmount: updatedStudent.feeStructure.totalAmount,
            paidAmount: updatedStudent.feeStructure.paidAmount,
            pendingAmount: updatedStudent.feeStructure.pendingAmount
          } : currentFeeStructure
        }
      }
    });
  } catch (error) {
    console.error('Payment Verification Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment'
    });
  }
});

// @desc    Get Payment Status
// @route   GET /api/payment/status/:paymentId
// @access  Private
router.get('/status/:paymentId', protect, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId).populate('student', 'rollNumber firstName lastName');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if user has permission to view this payment
    if (req.user.role === 'student' && payment.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Get Payment Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment status'
    });
  }
});

// @desc    Get Student Payment History
// @route   GET /api/payment/history/:rollNumber
// @access  Private
router.get('/history/:rollNumber', protect, async (req, res) => {
  try {
    const { rollNumber } = req.params;
    const { page = 1, limit = 10, status, semester } = req.query;

    // Build query
    let query = { rollNumber: rollNumber.toUpperCase() };
    if (status) query.status = status;
    if (semester) query.semester = parseInt(semester);

    // Check permissions
    if (req.user.role === 'student' && req.user.rollNumber !== rollNumber.toUpperCase()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment history'
      });
    }

    const payments = await Payment.find(query)
      .populate('student', 'rollNumber firstName lastName course department')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get Payment History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment history'
    });
  }
});

// @desc    Download Receipt
// @route   GET /api/payment/receipt/:paymentId
// @access  Private
router.get('/receipt/:paymentId', protect, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId)
      .populate('student', 'rollNumber firstName lastName course department email phone');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Receipt available only for completed payments'
      });
    }

    // Check permissions
    if (req.user.role === 'student' && payment.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this receipt'
      });
    }

    // Generate receipt data (In a real app, you might generate PDF here)
    const receiptData = {
      receiptNumber: payment.receipt.receiptNumber,
      paymentId: payment._id,
      student: payment.student,
      amount: payment.amount,
      semester: payment.semester,
      academicYear: payment.academicYear,
      paidAt: payment.paidAt,
      razorpayPaymentId: payment.razorpayPaymentId,
      description: payment.description
    };

    res.status(200).json({
      success: true,
      data: receiptData
    });
  } catch (error) {
    console.error('Download Receipt Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating receipt'
    });
  }
});

// @desc    Get All Payments (Admin Only)
// @route   GET /api/payment/all
// @access  Private (Admin)
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, semester, search } = req.query;

    // Build query
    let query = {};
    if (status) query.status = status;
    if (semester) query.semester = parseInt(semester);
    if (search) {
      query.$or = [
        { rollNumber: { $regex: search, $options: 'i' } },
        { 'receipt.receiptNumber': { $regex: search, $options: 'i' } }
      ];
    }

    const payments = await Payment.find(query)
      .populate('student', 'rollNumber firstName lastName course department')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get All Payments Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payments'
    });
  }
});

// @desc    Get all payments for admin
// @route   GET /api/payment/admin/all
// @access  Private (Admin)
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, feeType, startDate, endDate } = req.query;

    // Build query
    let query = {};
    if (status) query.status = status;
    if (feeType) query.feeType = feeType;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const payments = await Payment.find(query)
      .populate('student', 'rollNumber firstName lastName fullName email phone course semester department')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get All Payments Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payments'
    });
  }
});

// @desc    Direct UPI Payment Verification (for scanned QR codes)
// @route   POST /api/payment/verify-upi
// @access  Public
router.post('/verify-upi', async (req, res) => {
  try {
    const { paymentId, transactionId, amount } = req.body;

    if (!paymentId || !transactionId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide paymentId, transactionId, and amount'
      });
    }

    // Find payment record
    const payment = await Payment.findOne({ paymentId }).populate('student');
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    // Check if payment amount matches
    if (parseFloat(amount) !== payment.amount) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount mismatch'
      });
    }

    // Check if payment is already completed
    if (payment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed'
      });
    }

    // Update payment status
    payment.status = 'completed';
    payment.razorpayPaymentId = transactionId; // Store UPI transaction ID
    payment.paidAt = new Date();
    await payment.save();

    // Update student fee structure
    const student = payment.student;
    student.feeStructure.paidAmount += payment.amount;
    await student.save();

    // Generate receipt number
    const receiptNumber = `RCP_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    payment.receipt.receiptNumber = receiptNumber;
    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        paymentId: payment._id,
        receiptNumber: payment.receipt.receiptNumber,
        amount: payment.amount,
        status: payment.status,
        paidAt: payment.paidAt,
        student: {
          name: student.fullName,
          rollNumber: student.rollNumber
        }
      }
    });
  } catch (error) {
    console.error('UPI Payment Verification Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment'
    });
  }
});

// @desc    Test Payment Update (Admin only - for debugging)
// @route   POST /api/payment/test-update
// @access  Private (Admin)
router.post('/test-update', protect, adminOnly, async (req, res) => {
  try {
    const { studentId, amount, feeType } = req.body;

    if (!studentId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide studentId and amount'
      });
    }

    // Find student
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    console.log('Before update:', {
      rollNumber: student.rollNumber,
      totalAmount: student.feeStructure.totalAmount,
      paidAmount: student.feeStructure.paidAmount,
      pendingAmount: student.feeStructure.pendingAmount
    });

    // Update student fee structure
    const oldPaidAmount = student.feeStructure.paidAmount;
    student.feeStructure.paidAmount += parseFloat(amount);
    
    // Save and let pre-save middleware calculate pending amount
    await student.save();
    
    // Fetch updated student
    const updatedStudent = await Student.findById(studentId);
    
    console.log('After update:', {
      rollNumber: updatedStudent.rollNumber,
      totalAmount: updatedStudent.feeStructure.totalAmount,
      paidAmount: updatedStudent.feeStructure.paidAmount,
      pendingAmount: updatedStudent.feeStructure.pendingAmount
    });

    res.status(200).json({
      success: true,
      message: 'Test payment update completed',
      data: {
        student: {
          rollNumber: updatedStudent.rollNumber,
          name: updatedStudent.fullName
        },
        oldPaidAmount,
        addedAmount: parseFloat(amount),
        newPaidAmount: updatedStudent.feeStructure.paidAmount,
        feeStructure: updatedStudent.feeStructure
      }
    });
  } catch (error) {
    console.error('Test Payment Update Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error in test payment update',
      error: error.message
    });
  }
});

module.exports = router; 