const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Student = require('../models/Student');

// General authentication middleware
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if user is admin or student
      let user;
      if (decoded.role === 'admin' || decoded.role === 'super_admin' || decoded.role === 'staff') {
        user = await Admin.findById(decoded.id).select('-password');
      } else {
        user = await Student.findById(decoded.id).select('-password');
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'No user found with this token'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated'
        });
      }

      // Set user info for routes
      req.user = {
        ...user.toObject(),
        userId: user._id,
        role: decoded.role
      };
      
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Admin only middleware
const adminOnly = async (req, res, next) => {
  try {
    if (!req.user || !['admin', 'super_admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error in admin authorization'
    });
  }
};

// Student only middleware
const studentOnly = async (req, res, next) => {
  try {
    if (!req.user || ['admin', 'super_admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Student access required'
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error in student authorization'
    });
  }
};

// Check specific admin permissions
const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.permissions || !req.user.permissions[permission]) {
        return res.status(403).json({
          success: false,
          message: `Permission denied: ${permission} required`
        });
      }
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Server error in permission check'
      });
    }
  };
};

module.exports = {
  protect,
  adminOnly,
  studentOnly,
  checkPermission
}; 