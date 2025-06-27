const express = require('express');
const { 
  register, 
  registerAdmin, // Add this import
  verifyOTP, 
  login, 
  loginWithPassword, 
  resendOTP, 
  getProfile 
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/register-admin', registerAdmin); // Add this route
router.post('/verify-otp', verifyOTP);
router.post('/login', login); // OTP-based login
router.post('/login-password', loginWithPassword); // Password-based login
router.post('/resend-otp', resendOTP);

// Protected routes
router.get('/profile', auth, getProfile);

module.exports = router;