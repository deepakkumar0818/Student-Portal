const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Document = require('../models/Document');
const Student = require('../models/Student');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/documents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow only specific file types
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, PNG, DOC, and DOCX files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Get all documents for the authenticated student
router.get('/my-documents', protect, async (req, res) => {
  try {
    const documents = await Document.find({
      studentId: req.user.userId,
      isActive: true
    }).sort({ createdAt: -1 });

    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

// Upload a new document
router.post('/upload', protect, (req, res, next) => {
  console.log('=== Document Upload Debug ===');
  console.log('Headers:', req.headers);
  console.log('User:', req.user ? { id: req.user.userId, role: req.user.role } : 'No user');
  
  // Use multer middleware
  upload.single('document')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
        }
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ message: err.message });
    }
    
    // Continue with the actual upload logic
    handleUpload(req, res);
  });
});

async function handleUpload(req, res) {
  try {
    console.log('File:', req.file);
    console.log('Body:', req.body);
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { documentType, title, description = '' } = req.body;

    if (!documentType || !title) {
      return res.status(400).json({ message: 'Document type and title are required' });
    }

    // Get student details
    const student = await Student.findById(req.user.userId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Create document record
    const document = new Document({
      studentId: req.user.userId,
      rollNumber: student.rollNumber,
      documentType,
      title,
      description,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: 'student'
    });

    await document.save();

    res.status(201).json({
      message: 'Document uploaded successfully',
      document
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ message: 'Failed to upload document', error: error.message });
  }
}

// Download a document
router.get('/download/:documentId', protect, async (req, res) => {
  try {
    const document = await Document.findById(req.params.documentId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user has permission to download
    const isStudent = document.studentId.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';
    
    if (!isStudent && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    // Set appropriate headers
    res.set({
      'Content-Type': document.mimeType,
      'Content-Disposition': `attachment; filename="${document.fileName}"`
    });

    // Stream the file
    const fileStream = fs.createReadStream(document.filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ message: 'Failed to download document' });
  }
});

// Delete a document (student can delete their own documents)
router.delete('/:documentId', protect, async (req, res) => {
  try {
    const document = await Document.findById(req.params.documentId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user has permission to delete
    const isOwner = document.studentId.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Soft delete
    document.isActive = false;
    await document.save();

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
});

// Get documents by type (e.g., degrees, results)
router.get('/type/:documentType', protect, async (req, res) => {
  try {
    const { documentType } = req.params;
    
    const documents = await Document.find({
      studentId: req.user.userId,
      documentType,
      isActive: true
    }).sort({ createdAt: -1 });

    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents by type:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

// Admin routes
// Get all documents (admin only)
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 10, studentId, documentType, isVerified } = req.query;
    
    const filter = { isActive: true };
    if (studentId) filter.studentId = studentId;
    if (documentType) filter.documentType = documentType;
    if (isVerified !== undefined) filter.isVerified = isVerified === 'true';

    const documents = await Document.find(filter)
      .populate('studentId', 'firstName lastName rollNumber email')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Document.countDocuments(filter);

    res.json({
      documents,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching all documents:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

// Upload document for student (admin only)
router.post('/admin/upload/:studentId', protect, adminOnly, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { studentId } = req.params;
    const { documentType, title, description = '', academicYear, semester, subjects, totalMarks, obtainedMarks, percentage, cgpa, result } = req.body;

    if (!documentType || !title) {
      return res.status(400).json({ message: 'Document type and title are required' });
    }

    // Get student details
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Create document record
    const documentData = {
      studentId,
      rollNumber: student.rollNumber,
      documentType,
      title,
      description,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: 'admin',
      isVerified: true,
      verifiedBy: req.user.userId,
      verifiedAt: new Date()
    };

    // Add academic data if provided
    if (academicYear) documentData.academicYear = academicYear;
    if (semester) documentData.semester = semester;
    if (subjects) documentData.subjects = JSON.parse(subjects);
    if (totalMarks) documentData.totalMarks = totalMarks;
    if (obtainedMarks) documentData.obtainedMarks = obtainedMarks;
    if (percentage) documentData.percentage = percentage;
    if (cgpa) documentData.cgpa = cgpa;
    if (result) documentData.result = result;

    const document = new Document(documentData);
    await document.save();

    res.status(201).json({
      message: 'Document uploaded successfully',
      document
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ message: 'Failed to upload document' });
  }
});

// Verify/unverify document (admin only)
router.patch('/admin/verify/:documentId', protect, adminOnly, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { isVerified, verificationNotes = '' } = req.body;

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    document.isVerified = isVerified;
    document.verificationNotes = verificationNotes;
    
    if (isVerified) {
      document.verifiedBy = req.user.userId;
      document.verifiedAt = new Date();
    } else {
      document.verifiedBy = undefined;
      document.verifiedAt = undefined;
    }

    await document.save();

    res.json({
      message: `Document ${isVerified ? 'verified' : 'unverified'} successfully`,
      document
    });
  } catch (error) {
    console.error('Error verifying document:', error);
    res.status(500).json({ message: 'Failed to verify document' });
  }
});

module.exports = router; 