const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// Update the import to include Admin
const { User, Customer, Doctor, Hospital, Vendor } = require('../models/User');
const { Admin } = require('../models/Admin');
const OTP = require('../models/OTP');
const { generateOTP, sendOTP } = require('../utils/otpUtil');
const { mapGooglePlaceToAddress } = require('../utils/addressUtil');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Register a new user
const register = async (req, res) => {
  try {
    const { name, mobileNumber, email, password, role, specialty, facilityDetails, address } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { mobileNumber }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email or mobile number' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    let user;
    
    // Create user based on role
    if (role === 'customer') {
      user = new Customer({
        name,
        mobileNumber,
        email,
        password: hashedPassword,
        role
      });
    } else if (role === 'doctor') {
      if (!specialty) {
        return res.status(400).json({ message: 'Specialty is required for doctors' });
      }
      
      if (!req.body.category) {
        return res.status(400).json({ message: 'Category is required for doctors' });
      }
      
      const validCategories = ['Ayurvedic', 'Homeopathy', 'Doctors/Physician', 'Naturopathy', 'Unani', 'Alopathy', 'Baby Care', 'Veterinary'];
      if (!validCategories.includes(req.body.category)) {
        return res.status(400).json({ message: 'Invalid category. Must be one of: ' + validCategories.join(', ') });
      }
      
      user = new Doctor({
        name,
        mobileNumber,
        email,
        password: hashedPassword,
        role,
        specialty,
        category: req.body.category
      });
    } else if (role === 'hospital') {
      if (!facilityDetails || !req.body.type) {
        return res.status(400).json({ message: 'Facility details and hospital type are required' });
      }
      
      user = new Hospital({
        name,
        mobileNumber,
        email,
        password: hashedPassword,
        role,
        facilityDetails,
        type: req.body.type
      });
    } else if (role === 'vendor') {
      if (!facilityDetails) {
        return res.status(400).json({ message: 'Facility details are required' });
      }
      
      user = new Vendor({
        name,
        mobileNumber,
        email,
        password: hashedPassword,
        role,
        facilityDetails
      });
    } else {
      return res.status(400).json({ message: 'Invalid role' });
    }
    
    // Common address handling for ALL roles
    if (req.body.placeData) {
      let placeData;
      
      // Parse placeData if it's a string
      if (typeof req.body.placeData === 'string') {
        try {
          placeData = JSON.parse(req.body.placeData);
        } catch (error) {
          return res.status(400).json({ 
            message: 'Invalid placeData format. Must be valid JSON.' 
          });
        }
      } else {
        placeData = req.body.placeData;
      }
      
      // Check if required fields exist in placeData
      if (!placeData.city || !placeData.state || !placeData.postal_code) {
        return res.status(400).json({ 
          message: 'City, state, and postal code required in place data' 
        }); 
      }
      
      const addressObj = mapGooglePlaceToAddress(placeData, 'Primary Location');
      
      // Set common address fields for ALL users
      user.city = placeData.city;
      user.state = placeData.state;
      user.postalCode = placeData.postal_code;
      user.latitude = placeData.latitude;
      user.longitude = placeData.longitude;
      user.address = `${placeData.street_number || ''} ${placeData.route || ''}, ${placeData.city}, ${placeData.state}, ${placeData.postal_code}`.trim();
      
      // Add to addresses array
      user.addresses = [addressObj];
    } else if (address) {
      // Legacy support for old format
      user.address = address;
      
      if (req.body.city && req.body.state && req.body.postalCode) {
        user.city = req.body.city;
        user.state = req.body.state;
        user.postalCode = req.body.postalCode;
      } else {
        return res.status(400).json({ message: 'City, state, and postal code are required' });
      }
    } else {
      // For customers, address might be optional
      if (role !== 'customer') {
        return res.status(400).json({ message: 'Address information is required' });
      }
    }
    
    await user.save();
    
    // Generate and send OTP
    const otp = generateOTP();
    const newOTP = new OTP({
      mobileNumber,
      otp
    });
    
    await newOTP.save();
    await sendOTP(mobileNumber, otp);
    
    res.status(201).json({
      message: 'User registered successfully. Please verify your mobile number with the OTP sent.',
      userId: user._id,
      requiresPayment: role !== 'customer'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body;
    
    console.log('OTP Verification Request:', { mobileNumber, otp, timestamp: new Date() });
    
    const otpRecord = await OTP.findOne({ mobileNumber });
    
    console.log('OTP Record Found:', otpRecord ? {
      id: otpRecord._id,
      mobileNumber: otpRecord.mobileNumber,
      otp: otpRecord.otp,
      createdAt: otpRecord.createdAt,
      timeElapsed: new Date() - otpRecord.createdAt
    } : 'No OTP record found');
    
    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP expired or not found' });
    }
    
    console.log('OTP Comparison:', { provided: otp, stored: otpRecord.otp, match: otpRecord.otp === otp });
    
    if (otpRecord.otp.toString() !== otp.toString()) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    // Mark user as verified using direct update to avoid validation issues
    const user = await User.findOneAndUpdate(
      { mobileNumber },
      { isVerified: true },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete the OTP record
    await OTP.deleteOne({ _id: otpRecord._id });
    
    // Generate token
    const token = generateToken(user._id);
    
    // Check subscription status for non-customer users
    let isSubscribed = true;
    let subscriptionExpiry = null;
    
    if (user.role !== 'customer') {
      isSubscribed = user.subscriptionActive && new Date(user.subscriptionExpiry) > new Date();
      subscriptionExpiry = user.subscriptionExpiry;
      
      // If subscription has expired, update the status
      if (user.subscriptionActive && new Date(user.subscriptionExpiry) <= new Date()) {
        await User.findByIdAndUpdate(user._id, { subscriptionActive: false });
        isSubscribed = false;
      }
    }
    
    res.status(200).json({
      message: 'OTP verified successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
        isVerified: user.isVerified,
        isSubscribed: user.role === 'customer' ? true : isSubscribed,
        subscriptionExpiry: subscriptionExpiry,
        requiresPayment: user.role !== 'customer' && !isSubscribed
      }
    });
  } catch (error) {  
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'OTP verification failed', error: error.message });
  }
};

// Login with mobile number (send OTP)
const login = async (req, res) => {
  try {
    const { mobileNumber } = req.body;
    
    const user = await User.findOne({ mobileNumber });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate and send OTP
    const otp = generateOTP();
    
    console.log('Generated OTP for login:', { mobileNumber, otp, timestamp: new Date() });
    
    // Delete any existing OTP for this mobile number
    const deletedCount = await OTP.deleteMany({ mobileNumber });
    console.log('Deleted existing OTPs:', deletedCount.deletedCount);
    
    const newOTP = new OTP({
      mobileNumber,
      otp
    });
    
    await newOTP.save();
    console.log('OTP saved successfully:', { id: newOTP._id, createdAt: newOTP.createdAt });
    
    await sendOTP(mobileNumber, otp);
    
    res.status(200).json({
      message: 'OTP sent successfully',
      userId: user._id
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

// Resend OTP
const resendOTP = async (req, res) => {
  try {
    const { mobileNumber } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ mobileNumber });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete any existing OTP
    await OTP.deleteMany({ mobileNumber });
    
    // Generate and send new OTP
    const otp = generateOTP();
    const newOTP = new OTP({
      mobileNumber,
      otp
    });
    
    await newOTP.save();
    await sendOTP(mobileNumber, otp);
    
    res.status(200).json({ message: 'OTP resent successfully' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Failed to resend OTP', error: error.message });
  }
};

// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-__v');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to get profile', error: error.message });
  }
};

// Login with password
// Update loginWithPassword to handle admin login
const loginWithPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email (check both User and Admin collections)
    let user = await User.findOne({ email });
    
    // If not found in User collection, check Admin collection
    if (!user) {
      user = await Admin.findOne({ email });
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if password matches
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // For admin users, skip verification check
    if (user.role === 'admin') {
      const token = generateToken(user._id);
      
      return res.status(200).json({
        message: 'Admin login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: true,
          permissions: user.permissions,
          adminLevel: user.adminLevel
        }
      });
    }
    
    // Check if user is verified (for non-admin users)
    if (!user.isVerified) {
      // Generate and send OTP for verification
      const otp = generateOTP();
      
      // Delete any existing OTP
      await OTP.deleteMany({ mobileNumber: user.mobileNumber });
      
      const newOTP = new OTP({
        mobileNumber: user.mobileNumber,
        otp
      });
      
      await newOTP.save();
      await sendOTP(user.mobileNumber, otp);
      
      return res.status(200).json({
        message: 'Account not verified. OTP sent for verification.',
        userId: user._id,
        requiresVerification: true
      });
    }
    
    // Generate token
    const token = generateToken(user._id);
    
    // Check subscription status for non-customer users
    let isSubscribed = true;
    let subscriptionExpiry = null;
    
    if (user.role !== 'customer') {
      isSubscribed = user.subscriptionActive && new Date(user.subscriptionExpiry) > new Date();
      subscriptionExpiry = user.subscriptionExpiry;
      
      // If subscription has expired, update the status
      if (user.subscriptionActive && new Date(user.subscriptionExpiry) <= new Date()) {
        user.subscriptionActive = false;
        await user.save();
        isSubscribed = false;
      }
    }
    
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
        isVerified: user.isVerified,
        isSubscribed: user.role === 'customer' ? true : isSubscribed,
        subscriptionExpiry: subscriptionExpiry,
        requiresPayment: user.role !== 'customer' && !isSubscribed
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

// Add this function after the existing register function

// Register a new admin (manual registration)
const registerAdmin = async (req, res) => {
  try {
    const { name, mobileNumber, email, password } = req.body;
    
    // Validate required fields
    if (!name || !mobileNumber || !email || !password) {
      return res.status(400).json({ message: 'All fields are required: name, mobileNumber, email, password' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { mobileNumber }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email or mobile number' });
    }
    
    // Check if any admin already exists (optional: remove this if you want multiple admins)
    const existingAdmin = await Admin.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({ message: 'An admin already exists. Only one admin is allowed.' });
    }
    
    // Create admin user
    const admin = new Admin({
      name,
      mobileNumber,
      email,
      password, // This will be hashed by the pre-save middleware
      role: 'admin',
      isVerified: true, // Admin is auto-verified
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
    
    await admin.save();
    
    // Generate token
    const token = generateToken(admin._id);
    
    res.status(201).json({
      message: 'Admin registered successfully',
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        mobileNumber: admin.mobileNumber,
        role: admin.role,
        permissions: admin.permissions,
        adminLevel: admin.adminLevel
      }
    });
    
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ message: 'Server error during admin registration' });
  }
};

// Add to module.exports
module.exports = {
  register,
  registerAdmin, // Add this line
  verifyOTP,
  login,
  loginWithPassword,
  resendOTP,
  getProfile
};

// Debug endpoint - remove in production
const debugOTP = async (req, res) => {
  try {
    const { mobileNumber } = req.params;
    const otpRecords = await OTP.find({ mobileNumber });
    
    res.status(200).json({
      mobileNumber,
      otpRecords: otpRecords.map(record => ({
        id: record._id,
        otp: record.otp,
        createdAt: record.createdAt,
        timeElapsed: new Date() - record.createdAt,
        isExpired: (new Date() - record.createdAt) > 300000 // 5 minutes
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};