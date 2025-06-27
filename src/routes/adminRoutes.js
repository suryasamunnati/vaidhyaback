const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const {
  // User management
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  
  // Doctor management
  getAllDoctors,
  approveDoctorProfile,
  rejectDoctorProfile,
  
  // Hospital management
  getAllHospitals,
  approveHospitalProfile,
  rejectHospitalProfile,
  
  // Vendor management
  getAllVendors,
  approveVendorProfile,
  rejectVendorProfile,
  
  // Customer management
  getAllCustomers,
  
  // Subscription management
  getAllSubscriptions,
  getSubscriptionById,
  updateSubscription,
  cancelSubscription,
  
  // Analytics
  getDashboardStats,
  getUserGrowthStats,
  getRevenueStats,
  getAppointmentStats,
  
  // Admin management
  getAllAdmins,
  createAdmin,
  updateAdminPermissions,
  deleteAdmin,
  getAdminProfile,
  updateAdminProfile
} = require('../controllers/adminController');

// Admin authentication - all routes require admin role
const adminAuth = [auth, authorize('admin')];

// Admin profile routes
router.get('/profile', adminAuth, getAdminProfile);
router.put('/profile', adminAuth, updateAdminProfile);

// Admin management routes (super admin only)
router.get('/admins', adminAuth, authorize('admin'), getAllAdmins);
router.post('/admins', adminAuth, authorize('admin'), createAdmin);
router.put('/admins/:id/permissions', adminAuth, authorize('admin'), updateAdminPermissions);
router.delete('/admins/:id', adminAuth, authorize('admin'), deleteAdmin);

// User management routes
router.get('/users', adminAuth, getAllUsers);
router.get('/users/:id', adminAuth, getUserById);
router.put('/users/:id/status', adminAuth, updateUserStatus);
router.delete('/users/:id', adminAuth, deleteUser);

// Doctor management routes
router.get('/doctors', adminAuth, getAllDoctors);
router.put('/doctors/:id/approve', adminAuth, approveDoctorProfile);
router.put('/doctors/:id/reject', adminAuth, rejectDoctorProfile);

// Hospital management routes
router.get('/hospitals', adminAuth, getAllHospitals);
router.put('/hospitals/:id/approve', adminAuth, approveHospitalProfile);
router.put('/hospitals/:id/reject', adminAuth, rejectHospitalProfile);

// Vendor management routes
router.get('/vendors', adminAuth, getAllVendors);
router.put('/vendors/:id/approve', adminAuth, approveVendorProfile);
router.put('/vendors/:id/reject', adminAuth, rejectVendorProfile);

// Customer management routes
router.get('/customers', adminAuth, getAllCustomers);

// Subscription management routes
router.get('/subscriptions', adminAuth, getAllSubscriptions);
router.get('/subscriptions/:id', adminAuth, getSubscriptionById);
router.put('/subscriptions/:id', adminAuth, updateSubscription);
router.delete('/subscriptions/:id', adminAuth, cancelSubscription);

// Analytics routes
router.get('/stats/dashboard', adminAuth, getDashboardStats);
router.get('/stats/users', adminAuth, getUserGrowthStats);
router.get('/stats/revenue', adminAuth, getRevenueStats);
router.get('/stats/appointments', adminAuth, getAppointmentStats);

module.exports = router;