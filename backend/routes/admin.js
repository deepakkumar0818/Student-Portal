const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, adminOnly } = require('../middleware/auth');
const Student = require('../models/Student');
const Payment = require('../models/Payment');
const Admin = require('../models/Admin');

const router = express.Router();

// Import exam routes
const examRoutes = require('./admin/examRoutes');

// Use exam routes
router.use('/exams', examRoutes);

// @desc    Search Student by Roll Number
// @route   POST /api/admin/student/search
// @access  Private (Admin)
router.post('/student/search', protect, adminOnly, async (req, res) => {
  try {
    const { rollNumber } = req.body;

    if (!rollNumber) {
      return res.status(400).json({
        success: false,
        message: 'Roll number is required'
      });
    }

    const student = await Student.findOne({ rollNumber: rollNumber.toUpperCase() });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get recent payments
    const recentPayments = await Payment.find({ student: student._id })
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        student,
        recentPayments
      }
    });
  } catch (error) {
    console.error('Search Student Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching student'
    });
  }
});

// @desc    Create New Student
// @route   POST /api/admin/student/create
// @access  Private (Admin)
router.post('/student/create', [
  protect,
  adminOnly,
  body('rollNumber').notEmpty().withMessage('Roll number is required'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('course').notEmpty().withMessage('Course is required'),
  body('semester').isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8'),
  body('department').notEmpty().withMessage('Department is required'),
  body('admissionYear').isInt().withMessage('Admission year is required'),
  body('guardianInfo.name').notEmpty().withMessage('Guardian name is required'),
  body('guardianInfo.phone').notEmpty().withMessage('Guardian phone is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      rollNumber,
      firstName,
      lastName,
      email,
      phone,
      password,
      course,
      semester,
      department,
      admissionYear,
      feeStructure,
      guardianInfo,
      address
    } = req.body;

    // Check if student already exists
    const existingStudent = await Student.findOne({
      $or: [
        { rollNumber: rollNumber.toUpperCase() },
        { email: email.toLowerCase() }
      ]
    });

    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: 'Student with this roll number or email already exists'
      });
    }

    // Calculate total fee amount from individual components
    const totalAmount = (feeStructure?.tuitionFee || 0) + 
                       (feeStructure?.examFee || 0) + 
                       (feeStructure?.libraryFee || 0) + 
                       (feeStructure?.labFee || 0) + 
                       (feeStructure?.hostelFee || 0) + 
                       (feeStructure?.messFee || 0) + 
                       (feeStructure?.otherFee || 0);

    // Create student data object with proper structure
    const studentData = {
      rollNumber: rollNumber.toUpperCase(),
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      password,
      course,
      semester: parseInt(semester),
      department,
      admissionYear: parseInt(admissionYear),
      feeStructure: {
        tuitionFee: feeStructure?.tuitionFee || 0,
        examFee: feeStructure?.examFee || 0,
        libraryFee: feeStructure?.libraryFee || 0,
        labFee: feeStructure?.labFee || 0,
        hostelFee: feeStructure?.hostelFee || 0,
        messFee: feeStructure?.messFee || 0,
        otherFee: feeStructure?.otherFee || 0,
        totalAmount,
        paidAmount: 0,
        pendingAmount: totalAmount,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      },
      guardianInfo: {
        name: guardianInfo?.name || '',
        phone: guardianInfo?.phone || '',
        email: guardianInfo?.email || '',
        relation: guardianInfo?.relation || 'Parent'
      },
      address: {
        street: address?.street || '',
        city: address?.city || '',
        state: address?.state || '',
        zipCode: address?.zipCode || '',
        country: address?.country || 'India'
      },
      isActive: true
    };

    const student = await Student.create(studentData);

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: {
        id: student._id,
        rollNumber: student.rollNumber,
        name: student.fullName,
        email: student.email,
        course: student.course,
        semester: student.semester,
        department: student.department
      }
    });
  } catch (error) {
    console.error('Create Student Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating student',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Update Student
// @route   PUT /api/admin/student/:id
// @access  Private (Admin)
router.put('/student/:id', protect, adminOnly, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const {
      firstName,
      lastName,
      rollNumber,
      email,
      phone,
      password,
      course,
      semester,
      department,
      admissionYear,
      feeStructure,
      guardianInfo,
      address,
      isActive
    } = req.body;

    // Check if roll number or email conflicts with other students
    if (rollNumber && rollNumber !== student.rollNumber) {
      const existingStudent = await Student.findOne({
        rollNumber: rollNumber.toUpperCase(),
        _id: { $ne: req.params.id }
      });
      if (existingStudent) {
        return res.status(400).json({
          success: false,
          message: 'Roll number already exists for another student'
        });
      }
    }

    if (email && email !== student.email) {
      const existingStudent = await Student.findOne({
        email: email.toLowerCase(),
        _id: { $ne: req.params.id }
      });
      if (existingStudent) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists for another student'
        });
      }
    }

    // Build update object
    const updateData = {};
    
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (rollNumber) updateData.rollNumber = rollNumber.toUpperCase();
    if (email) updateData.email = email.toLowerCase();
    if (phone) updateData.phone = phone;
    if (course) updateData.course = course;
    if (semester) updateData.semester = parseInt(semester);
    if (department) updateData.department = department;
    if (admissionYear) updateData.admissionYear = parseInt(admissionYear);
    if (typeof isActive !== 'undefined') updateData.isActive = isActive;

    // Handle fee structure update
    if (feeStructure) {
      const totalAmount = (feeStructure.tuitionFee || 0) + 
                         (feeStructure.examFee || 0) + 
                         (feeStructure.libraryFee || 0) + 
                         (feeStructure.labFee || 0) + 
                         (feeStructure.hostelFee || 0) + 
                         (feeStructure.messFee || 0) + 
                         (feeStructure.otherFee || 0);

      updateData.feeStructure = {
        tuitionFee: feeStructure.tuitionFee || 0,
        examFee: feeStructure.examFee || 0,
        libraryFee: feeStructure.libraryFee || 0,
        labFee: feeStructure.labFee || 0,
        hostelFee: feeStructure.hostelFee || 0,
        messFee: feeStructure.messFee || 0,
        otherFee: feeStructure.otherFee || 0,
        totalAmount,
        paidAmount: student.feeStructure.paidAmount || 0, // Keep existing paid amount
        pendingAmount: totalAmount - (student.feeStructure.paidAmount || 0),
        dueDate: feeStructure.dueDate || student.feeStructure.dueDate
      };
    }

    // Handle guardian info update
    if (guardianInfo) {
      updateData.guardianInfo = {
        name: guardianInfo.name || '',
        phone: guardianInfo.phone || '',
        email: guardianInfo.email || '',
        relation: guardianInfo.relation || 'Parent'
      };
    }

    // Handle address update
    if (address) {
      updateData.address = {
        street: address.street || '',
        city: address.city || '',
        state: address.state || '',
        zipCode: address.zipCode || '',
        country: address.country || 'India'
      };
    }

    // Handle password update (only if provided)
    if (password && password.trim() !== '') {
      updateData.password = password;
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: updatedStudent
    });
  } catch (error) {
    console.error('Update Student Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating student',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get All Students
// @route   GET /api/admin/students
// @access  Private (Admin)
router.get('/students', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, department, course, semester } = req.query;

    // Build query
    let query = {};
    if (search) {
      query.$or = [
        { rollNumber: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (department) query.department = department;
    if (course) query.course = course;
    if (semester) query.semester = parseInt(semester);

    const students = await Student.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Student.countDocuments(query);

    res.status(200).json({
      success: true,
      data: students,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get Students Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students'
    });
  }
});

// @desc    Get Dashboard Statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private (Admin)
router.get('/dashboard/stats', protect, adminOnly, async (req, res) => {
  try {
    // Get basic counts
    const totalStudents = await Student.countDocuments({ isActive: true });
    const totalPayments = await Payment.countDocuments();
    const completedPayments = await Payment.countDocuments({ status: 'completed' });
    const pendingPayments = await Payment.countDocuments({ status: 'pending' });

    // Get total revenue
    const revenueResult = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Get recent payments
    const recentPayments = await Payment.find()
      .populate('student', 'rollNumber firstName lastName')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get department-wise statistics
    const departmentStats = await Student.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get monthly payment trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrends = await Payment.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, status: 'completed' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalStudents,
          totalPayments,
          completedPayments,
          pendingPayments,
          totalRevenue
        },
        recentPayments,
        departmentStats,
        monthlyTrends
      }
    });
  } catch (error) {
    console.error('Get Dashboard Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics'
    });
  }
});

// @desc    Get Payment Analytics
// @route   GET /api/admin/analytics/payments
// @access  Private (Admin)
router.get('/analytics/payments', protect, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate, department, semester } = req.query;

    // Build match query
    let matchQuery = {};
    if (startDate && endDate) {
      matchQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (semester) matchQuery.semester = parseInt(semester);

    // Base pipeline
    let pipeline = [
      { $match: matchQuery }
    ];

    // Add student lookup if department filter is needed
    if (department) {
      pipeline.push(
        { $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'studentData' } },
        { $match: { 'studentData.department': department } }
      );
    }

    // Payment status breakdown
    const statusBreakdown = await Payment.aggregate([
      ...pipeline,
      { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }
    ]);

    // Payment method breakdown
    const methodBreakdown = await Payment.aggregate([
      ...pipeline,
      { $match: { status: 'completed' } },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, amount: { $sum: '$amount' } } }
    ]);

    // Daily payment trends
    const dailyTrends = await Payment.aggregate([
      ...pipeline,
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        statusBreakdown,
        methodBreakdown,
        dailyTrends
      }
    });
  } catch (error) {
    console.error('Get Payment Analytics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment analytics'
    });
  }
});

// @desc    Get Analytics Data
// @route   GET /api/admin/analytics
// @access  Private (Admin)
router.get('/analytics', protect, adminOnly, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Calculate date range based on period
    let startDate;
    const endDate = new Date();
    
    switch (period) {
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // month
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get student statistics
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ isActive: true });
    const newStudents = await Student.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Get payment statistics
    const totalPayments = await Payment.countDocuments();
    const successfulPayments = await Payment.countDocuments({ status: 'successful' });
    const pendingPayments = await Payment.countDocuments({ status: 'pending' });
    const failedPayments = await Payment.countDocuments({ status: 'failed' });

    // Calculate total revenue
    const revenueResult = await Payment.aggregate([
      { $match: { status: 'successful' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Get payments by fee type
    const paymentsByFeeType = await Payment.aggregate([
      { $match: { status: 'successful' } },
      {
        $group: {
          _id: '$feeType',
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get students by course
    const studentsByCourse = await Student.aggregate([
      {
        $group: {
          _id: '$course',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get students by semester
    const studentsBySemester = await Student.aggregate([
      {
        $group: {
          _id: '$semester',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get monthly payment trend (last 6 months)
    const monthlyTrend = await Payment.aggregate([
      {
        $match: {
          status: 'successful',
          createdAt: { $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format monthly trend data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedMonthlyTrend = monthlyTrend.map(item => ({
      month: monthNames[item._id.month - 1],
      amount: item.amount,
      count: item.count
    }));

    const analytics = {
      overview: {
        totalStudents,
        activeStudents,
        newStudents,
        totalPayments,
        totalRevenue,
        pendingPayments,
        successRate: totalPayments > 0 ? ((successfulPayments / totalPayments) * 100).toFixed(1) : 0
      },
      payments: {
        byFeeType: paymentsByFeeType.map(item => ({
          name: item._id || 'Unknown',
          amount: item.amount,
          count: item.count
        })),
        byStatus: [
          { name: 'Successful', count: successfulPayments, percentage: totalPayments > 0 ? ((successfulPayments / totalPayments) * 100).toFixed(1) : 0 },
          { name: 'Pending', count: pendingPayments, percentage: totalPayments > 0 ? ((pendingPayments / totalPayments) * 100).toFixed(1) : 0 },
          { name: 'Failed', count: failedPayments, percentage: totalPayments > 0 ? ((failedPayments / totalPayments) * 100).toFixed(1) : 0 }
        ],
        monthlyTrend: formattedMonthlyTrend
      },
      students: {
        byCourse: studentsByCourse.map(item => ({
          name: item._id || 'Unknown',
          count: item.count
        })),
        bySemester: studentsBySemester.map(item => ({
          semester: item._id,
          count: item.count
        }))
      }
    };

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics data'
    });
  }
});

module.exports = router; 