const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('../models/Admin');

// Load config
dotenv.config({ path: './config.env' });

const createDefaultAdmin = async () => {
  try {
    // Wait for existing connection to be ready
    if (mongoose.connection.readyState === 0) {
      // If no connection exists, wait a bit for the main connection to establish
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Check if we have a valid connection
    if (mongoose.connection.readyState !== 1) {
      console.log('Waiting for MongoDB connection...');
      return;
    }

    console.log('MongoDB Connected...');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
    
    if (existingAdmin) {
      console.log('Default admin already exists');
      return;
    }

    // Create default admin
    const adminData = {
      name: 'System Administrator',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: 'super_admin',
      permissions: {
        canCreateStudent: true,
        canEditStudent: true,
        canDeleteStudent: true,
        canGenerateQR: true,
        canViewPayments: true,
        canManageAdmins: true
      },
      department: 'Administration',
      phone: '+1234567890',
      isActive: true
    };

    const admin = await Admin.create(adminData);
    console.log('Default admin created successfully:', {
      name: admin.name,
      email: admin.email,
      role: admin.role
    });

  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

// Run the seeder if called directly
if (require.main === module) {
  // Only connect if running directly (not imported)
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).then(() => {
    createDefaultAdmin().then(() => {
      mongoose.connection.close();
      process.exit(0);
    });
  });
}

module.exports = createDefaultAdmin;