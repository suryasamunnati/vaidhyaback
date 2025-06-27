const bcrypt = require('bcryptjs');
const { Admin } = require('../models/Admin');

// Initialize default admin user
const initializeAdmin = async () => {
  try {
    // Check if any admin exists
    const existingAdmin = await Admin.findOne({ role: 'admin' });
    
    if (!existingAdmin) {
      console.log('No admin found. Creating default admin...');
      
      // Hash the password
      const hashedPassword = await bcrypt.hash('12345678', 12);
      
      // Create default admin
      const defaultAdmin = new Admin({
        name: 'admin',
        email: 'admin@vaidhya.com',
        mobileNumber: '9999999999',
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
        permissions: {
          manageUsers: true,
          manageSubscriptions: true,
          managePayments: true,
          manageContent: true,
          viewAnalytics: true,
          superAdmin: true
        },
        adminLevel: 'super'
      });
      
      await defaultAdmin.save();
      console.log('✅ Default admin created successfully!');
      console.log('Email: admin@vaidhya.com');
      console.log('Password: 12345678');
      console.log('Mobile: 9999999999');
    } else {
      console.log('✅ Admin already exists. Skipping admin creation.');
    }
  } catch (error) {
    console.error('❌ Error initializing admin:', error.message);
  }
};

module.exports = { initializeAdmin };