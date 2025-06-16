const express = require('express');
const { protect, studentOnly } = require('../middleware/auth');
const Student = require('../models/Student');
const Payment = require('../models/Payment');

const router = express.Router();

// Import exam routes
const examRoutes = require('./student/examRoutes');

// Use exam routes
router.use('/exams', examRoutes);

// @desc    Get Student Profile
// @route   GET /api/student/profile
// @access  Private (Student)
router.get('/profile', protect, studentOnly, async (req, res) => {
  try {
    const student = await Student.findById(req.user._id).select('-password');
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Get Student Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student profile'
    });
  }
});

// @desc    Update Student Profile
// @route   PUT /api/student/profile
// @access  Private (Student)
router.put('/profile', protect, studentOnly, async (req, res) => {
  try {
    const allowedUpdates = ['phone', 'email', 'address', 'guardianInfo', 'profileImage'];
    const updates = {};
    
    // Only allow certain fields to be updated by students
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    const student = await Student.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: student
    });
  } catch (error) {
    console.error('Update Student Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
});

// @desc    Get Fee Status
// @route   GET /api/student/fee-status
// @access  Private (Student)
router.get('/fee-status', protect, studentOnly, async (req, res) => {
  try {
    const student = await Student.findById(req.user._id).select('rollNumber firstName lastName feeStructure');
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get payment summary
    const paymentSummary = await Payment.aggregate([
      { $match: { student: student._id } },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
          totalPending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } },
          completedPayments: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          pendingPayments: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }
        }
      }
    ]);

    const summary = paymentSummary[0] || {
      totalPaid: 0,
      totalPending: 0,
      completedPayments: 0,
      pendingPayments: 0
    };

    // Get next due payment
    const nextDuePayment = await Payment.findOne({
      student: student._id,
      status: 'pending'
    }).sort({ dueDate: 1 });

    res.status(200).json({
      success: true,
      data: {
        student: {
          rollNumber: student.rollNumber,
          name: student.fullName
        },
        feeStructure: student.feeStructure,
        paymentSummary: summary,
        nextDuePayment,
        isFeePending: student.feeStructure.pendingAmount > 0
      }
    });
  } catch (error) {
    console.error('Get Fee Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching fee status'
    });
  }
});

// @desc    Get Payment History
// @route   GET /api/student/payment-history
// @access  Private (Student)
router.get('/payment-history', protect, studentOnly, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, semester } = req.query;

    // Build query
    let query = { student: req.user._id };
    if (status) query.status = status;
    if (semester) query.semester = parseInt(semester);

    const payments = await Payment.find(query)
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
    console.error('Get Payment History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment history'
    });
  }
});

// @desc    Get Single Payment Details
// @route   GET /api/student/payment/:paymentId
// @access  Private (Student)
router.get('/payment/:paymentId', protect, studentOnly, async (req, res) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.paymentId,
      student: req.user._id
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Get Payment Details Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment details'
    });
  }
});

// @desc    Change Password
// @route   PUT /api/student/change-password
// @access  Private (Student)
router.put('/change-password', protect, studentOnly, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const student = await Student.findById(req.user._id).select('+password');

    // Check current password
    const isMatch = await student.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    student.password = newPassword;
    await student.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password'
    });
  }
});

// @desc    Get Academic Performance (Optional)
// @route   GET /api/student/academic-performance
// @access  Private (Student)
router.get('/academic-performance', protect, studentOnly, async (req, res) => {
  try {
    const student = await Student.findById(req.user._id).select('rollNumber firstName lastName course semester department admissionYear');
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get payment compliance history
    const paymentCompliance = await Payment.aggregate([
      { $match: { student: student._id } },
      {
        $group: {
          _id: '$semester',
          totalPayments: { $sum: 1 },
          completedPayments: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          onTimePayments: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'completed'] },
                    { $lte: ['$paidAt', '$dueDate'] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Calculate compliance percentage
    const complianceStats = paymentCompliance.map(semester => ({
      semester: semester._id,
      completionRate: semester.totalPayments > 0 ? (semester.completedPayments / semester.totalPayments * 100).toFixed(2) : 0,
      onTimeRate: semester.totalPayments > 0 ? (semester.onTimePayments / semester.totalPayments * 100).toFixed(2) : 0,
      totalPayments: semester.totalPayments,
      completedPayments: semester.completedPayments,
      onTimePayments: semester.onTimePayments
    }));

    res.status(200).json({
      success: true,
      data: {
        student: {
          rollNumber: student.rollNumber,
          name: student.fullName,
          course: student.course,
          currentSemester: student.semester,
          department: student.department,
          admissionYear: student.admissionYear
        },
        paymentCompliance: complianceStats
      }
    });
  } catch (error) {
    console.error('Get Academic Performance Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching academic performance'
    });
  }
});

module.exports = router; 