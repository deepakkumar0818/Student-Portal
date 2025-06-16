const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Exam = require('../../models/Exam');
const ExamResult = require('../../models/ExamResult');
const { protect, adminOnly } = require('../../middleware/auth');
const Student = require('../../models/Student');

// Get all exams
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, course, semester } = req.query;
    
    const query = { isActive: true };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { course: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }
    
    if (course) {
      query.course = course;
    }
    
    if (semester) {
      query.semester = parseInt(semester);
    }
    
    const exams = await Exam.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Exam.countDocuments(query);
    
    res.json({
      success: true,
      exams,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single exam
router.get('/:id', protect, adminOnly, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('allowedStudents.student', 'name rollNumber email');
    
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    
    res.json({ success: true, exam });
  } catch (error) {
    console.error('Get exam error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create new exam
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const {
      title,
      subject,
      course,
      semester,
      department,
      description,
      examType,
      passingMarks,
      duration,
      startDate,
      endDate,
      instructions,
      questions,
      settings,
      allowedStudents
    } = req.body;
    
    // Validate required fields
    if (!title || !subject || !course || !semester || !department || !examType || !passingMarks || !duration || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ 
        success: false, 
        message: 'End date must be after start date' 
      });
    }
    
    const exam = new Exam({
      title,
      subject,
      course,
      semester: parseInt(semester),
      department,
      description,
      examType,
      passingMarks: parseInt(passingMarks),
      duration: parseInt(duration),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      instructions: instructions || [],
      questions: questions || [],
      settings: settings || {},
      allowedStudents: allowedStudents || [],
      createdBy: req.user.id
    });
    
    await exam.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Exam created successfully',
      exam 
    });
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update exam
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    
    // Check if exam has started
    if (exam.status === 'active' || exam.status === 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot edit exam that has started or completed' 
      });
    }
    
    const updates = req.body;
    
    // Validate dates if provided
    if (updates.startDate && updates.endDate) {
      if (new Date(updates.startDate) >= new Date(updates.endDate)) {
        return res.status(400).json({ 
          success: false, 
          message: 'End date must be after start date' 
        });
      }
    }
    
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        exam[key] = updates[key];
      }
    });
    
    await exam.save();
    
    res.json({ 
      success: true, 
      message: 'Exam updated successfully',
      exam 
    });
  } catch (error) {
    console.error('Update exam error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete exam
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    
    // Check if exam has submissions
    const hasSubmissions = await ExamResult.countDocuments({ exam: exam._id });
    
    if (hasSubmissions > 0) {
      // Soft delete
      exam.isActive = false;
      await exam.save();
    } else {
      // Hard delete if no submissions
      await Exam.findByIdAndDelete(req.params.id);
    }
    
    res.json({ 
      success: true, 
      message: 'Exam deleted successfully' 
    });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Publish exam
router.put('/:id/publish', protect, adminOnly, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    
    if (exam.questions.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot publish exam without questions' 
      });
    }
    
    if (exam.allowedStudents.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot publish exam without enrolled students' 
      });
    }
    
    exam.status = 'published';
    await exam.save();
    
    res.json({ 
      success: true, 
      message: 'Exam published successfully',
      exam 
    });
  } catch (error) {
    console.error('Publish exam error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add students to exam
router.post('/:id/students', protect, adminOnly, async (req, res) => {
  try {
    const { studentIds, rollNumbers } = req.body;
    
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    
    // Add students
    if (studentIds && studentIds.length > 0) {
      for (let i = 0; i < studentIds.length; i++) {
        const studentId = studentIds[i];
        const rollNumber = rollNumbers ? rollNumbers[i] : '';
        
        if (!exam.isStudentAllowed(studentId)) {
          exam.allowedStudents.push({
            student: studentId,
            rollNumber: rollNumber,
            enrolledAt: new Date()
          });
        }
      }
    }
    
    await exam.save();
    
    res.json({ 
      success: true, 
      message: 'Students added successfully',
      exam 
    });
  } catch (error) {
    console.error('Add students error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Remove student from exam
router.delete('/:id/students/:studentId', protect, adminOnly, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    
    exam.allowedStudents = exam.allowedStudents.filter(
      student => student.student.toString() !== req.params.studentId
    );
    
    await exam.save();
    
    res.json({ 
      success: true, 
      message: 'Student removed successfully' 
    });
  } catch (error) {
    console.error('Remove student error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get exam results
router.get('/:id/results', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const results = await ExamResult.find({ exam: req.params.id })
      .populate('student', 'name rollNumber email')
      .populate('exam', 'title subject totalMarks passingMarks')
      .sort({ obtainedMarks: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await ExamResult.countDocuments({ exam: req.params.id });
    
    // Calculate statistics
    const stats = await ExamResult.aggregate([
      { $match: { exam: require('mongoose').Types.ObjectId(req.params.id) } },
      {
        $group: {
          _id: null,
          averageMarks: { $avg: '$obtainedMarks' },
          highestMarks: { $max: '$obtainedMarks' },
          lowestMarks: { $min: '$obtainedMarks' },
          totalStudents: { $sum: 1 },
          passedStudents: {
            $sum: {
              $cond: [{ $gte: ['$obtainedMarks', '$exam.passingMarks'] }, 1, 0]
            }
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      results,
      statistics: stats[0] || {},
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get exam results error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get exam analytics
router.get('/:id/analytics', protect, adminOnly, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    
    const results = await ExamResult.find({ exam: req.params.id })
      .populate('student', 'name rollNumber');
    
    // Grade distribution
    const gradeDistribution = {};
    results.forEach(result => {
      gradeDistribution[result.grade] = (gradeDistribution[result.grade] || 0) + 1;
    });
    
    // Question-wise analysis
    const questionAnalysis = exam.questions.map((question, index) => {
      const correctAnswers = results.filter(result => {
        const answer = result.answers.find(ans => ans.questionId.toString() === question._id.toString());
        return answer && answer.isCorrect;
      }).length;
      
      return {
        questionIndex: index + 1,
        questionText: question.questionText,
        totalAttempts: results.length,
        correctAnswers,
        difficulty: (correctAnswers / results.length) * 100,
        marks: question.marks
      };
    });
    
    // Time analysis
    const timeAnalysis = {
      averageTime: results.reduce((sum, result) => sum + result.timeTaken, 0) / results.length,
      minTime: Math.min(...results.map(r => r.timeTaken)),
      maxTime: Math.max(...results.map(r => r.timeTaken))
    };
    
    res.json({
      success: true,
      analytics: {
        gradeDistribution,
        questionAnalysis,
        timeAnalysis,
        totalStudents: results.length,
        examDuration: exam.duration
      }
    });
  } catch (error) {
    console.error('Get exam analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router; 