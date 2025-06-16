const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Exam = require('../../models/Exam');
const ExamResult = require('../../models/ExamResult');
const Student = require('../../models/Student');
const { protect } = require('../../middleware/auth');

// Get available exams for student
router.get('/available', protect, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    const currentDate = new Date();
    
    // Find exams where student is enrolled and exam is active
    const exams = await Exam.find({
      'allowedStudents.student': student._id,
      isActive: true,
      status: { $in: ['published', 'active'] },
      endDate: { $gte: currentDate }
    })
    .populate('createdBy', 'name')
    .select('-questions.correctAnswer -questions.options.isCorrect')
    .sort({ startDate: 1 });
    
    // Check if student has already attempted each exam
    const examResults = await ExamResult.find({
      student: student._id,
      exam: { $in: exams.map(e => e._id) }
    });
    
    const examsWithStatus = exams.map(exam => {
      const result = examResults.find(r => r.exam.toString() === exam._id.toString());
      const now = new Date();
      
      let examStatus = 'upcoming';
      if (now >= exam.startDate && now <= exam.endDate) {
        examStatus = 'active';
      } else if (now > exam.endDate) {
        examStatus = 'completed';
      }
      
      return {
        ...exam.toObject(),
        attemptStatus: result ? result.status : 'not-attempted',
        canAttempt: !result && examStatus === 'active',
        currentStatus: examStatus,
        timeRemaining: exam.endDate - now,
        result: result ? {
          obtainedMarks: result.obtainedMarks,
          totalMarks: result.totalMarks,
          percentage: result.percentage,
          grade: result.grade,
          status: result.status
        } : null
      };
    });
    
    res.json({
      success: true,
      exams: examsWithStatus
    });
  } catch (error) {
    console.error('Get available exams error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get exam results
router.get('/results', protect, async (req, res) => {
  try {
    const results = await ExamResult.find({
      student: req.user.id,
      status: { $in: ['submitted', 'evaluated', 'published'] }
    })
    .populate('exam', 'title subject examType totalMarks passingMarks startDate')
    .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Get exam results error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get specific exam result
router.get('/results/:id', protect, async (req, res) => {
  try {
    const result = await ExamResult.findOne({
      _id: req.params.id,
      student: req.user.id
    })
    .populate('exam', 'title subject examType totalMarks passingMarks settings')
    .populate('student', 'name rollNumber');
    
    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Get exam result error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get exam details for student
router.get('/:id', protect, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    
    // Check if student is allowed to take this exam
    if (!exam.isStudentAllowed(student._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized for this exam' });
    }
    
    // Check if exam is active
    const now = new Date();
    if (now < exam.startDate || now > exam.endDate) {
      return res.status(400).json({ success: false, message: 'Exam is not currently active' });
    }
    
    // Check if student has already submitted
    const existingResult = await ExamResult.findOne({
      exam: exam._id,
      student: student._id
    });
    
    if (existingResult && existingResult.status !== 'in-progress') {
      return res.status(400).json({ success: false, message: 'Exam already submitted' });
    }
    
    // Return exam without correct answers
    const examForStudent = {
      ...exam.toObject(),
      questions: exam.questions.map(q => ({
        _id: q._id,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options ? q.options.map(opt => ({ text: opt.text })) : [],
        marks: q.marks
      }))
    };
    
    res.json({
      success: true,
      exam: examForStudent,
      existingResult
    });
  } catch (error) {
    console.error('Get exam details error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Start exam
router.post('/:id/start', protect, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    
    // Check if student is allowed
    if (!exam.isStudentAllowed(student._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized for this exam' });
    }
    
    // Check if exam is active
    const now = new Date();
    if (now < exam.startDate || now > exam.endDate) {
      return res.status(400).json({ success: false, message: 'Exam is not currently active' });
    }
    
    // Check if already started
    let examResult = await ExamResult.findOne({
      exam: exam._id,
      student: student._id
    });
    
    if (examResult) {
      if (examResult.status !== 'in-progress') {
        return res.status(400).json({ success: false, message: 'Exam already completed' });
      }
    } else {
      // Create new exam result
      examResult = new ExamResult({
        exam: exam._id,
        student: student._id,
        rollNumber: student.rollNumber,
        startTime: new Date(),
        status: 'in-progress',
        totalMarks: exam.totalMarks,
        browserInfo: {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip
        }
      });
      
      await examResult.save();
    }
    
    res.json({
      success: true,
      message: 'Exam started successfully',
      examResultId: examResult._id,
      startTime: examResult.startTime,
      duration: exam.duration
    });
  } catch (error) {
    console.error('Start exam error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Save answer
router.post('/:id/answer', protect, async (req, res) => {
  try {
    const { questionId, answer, timeTaken } = req.body;
    
    const examResult = await ExamResult.findOne({
      exam: req.params.id,
      student: req.user.id,
      status: 'in-progress'
    });
    
    if (!examResult) {
      return res.status(404).json({ success: false, message: 'Active exam session not found' });
    }
    
    const exam = await Exam.findById(req.params.id);
    const question = exam.questions.id(questionId);
    
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    
    // Check if answer already exists
    const existingAnswerIndex = examResult.answers.findIndex(
      ans => ans.questionId.toString() === questionId
    );
    
    // Evaluate answer
    let isCorrect = false;
    let marksAwarded = 0;
    
    if (question.questionType === 'multiple-choice') {
      const correctOption = question.options.find(opt => opt.isCorrect);
      isCorrect = correctOption && correctOption.text === answer;
      marksAwarded = isCorrect ? question.marks : 0;
    } else if (question.questionType === 'true-false') {
      isCorrect = question.correctAnswer === answer;
      marksAwarded = isCorrect ? question.marks : 0;
    }
    // For short-answer and essay, manual evaluation needed
    
    const answerObj = {
      questionId,
      questionText: question.questionText,
      selectedAnswer: answer,
      textAnswer: question.questionType === 'short-answer' || question.questionType === 'essay' ? answer : undefined,
      isCorrect,
      marksAwarded,
      maxMarks: question.marks,
      timeTaken
    };
    
    if (existingAnswerIndex !== -1) {
      examResult.answers[existingAnswerIndex] = answerObj;
    } else {
      examResult.answers.push(answerObj);
    }
    
    await examResult.save();
    
    res.json({
      success: true,
      message: 'Answer saved successfully'
    });
  } catch (error) {
    console.error('Save answer error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Submit exam
router.post('/:id/submit', protect, async (req, res) => {
  try {
    const examResult = await ExamResult.findOne({
      exam: req.params.id,
      student: req.user.id,
      status: 'in-progress'
    });
    
    if (!examResult) {
      return res.status(404).json({ success: false, message: 'Active exam session not found' });
    }
    
    examResult.endTime = new Date();
    examResult.submittedAt = new Date();
    examResult.status = 'submitted';
    
    // Calculate final results
    examResult.calculateResults();
    
    await examResult.save();
    
    res.json({
      success: true,
      message: 'Exam submitted successfully',
      result: {
        obtainedMarks: examResult.obtainedMarks,
        totalMarks: examResult.totalMarks,
        percentage: examResult.percentage,
        grade: examResult.grade,
        timeTaken: examResult.timeTaken
      }
    });
  } catch (error) {
    console.error('Submit exam error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Record violation
router.post('/:id/violation', protect, async (req, res) => {
  try {
    const { type, description } = req.body;
    
    const examResult = await ExamResult.findOne({
      exam: req.params.id,
      student: req.user.id,
      status: 'in-progress'
    });
    
    if (examResult) {
      examResult.addViolation(type, description);
      await examResult.save();
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Record violation error:', error);
    res.json({ success: false }); // Don't fail the exam for violation logging
  }
});

// Auto-submit exam (for timeout)
router.post('/:id/auto-submit', protect, async (req, res) => {
  try {
    const examResult = await ExamResult.findOne({
      exam: req.params.id,
      student: req.user.id,
      status: 'in-progress'
    });
    
    if (!examResult) {
      return res.status(404).json({ success: false, message: 'Active exam session not found' });
    }
    
    examResult.endTime = new Date();
    examResult.submittedAt = new Date();
    examResult.status = 'submitted';
    examResult.isLate = true;
    
    // Calculate final results
    examResult.calculateResults();
    
    await examResult.save();
    
    res.json({
      success: true,
      message: 'Exam auto-submitted due to timeout',
      result: {
        obtainedMarks: examResult.obtainedMarks,
        totalMarks: examResult.totalMarks,
        percentage: examResult.percentage,
        grade: examResult.grade
      }
    });
  } catch (error) {
    console.error('Auto-submit exam error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router; 