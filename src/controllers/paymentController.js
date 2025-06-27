const { createOrder, verifyPayment } = require('../utils/razorpayUtil');
const { User, Doctor, Hospital, Vendor } = require('../models/User');
const Subscription = require('../models/Subscription');
const { v4: uuidv4 } = require('uuid');

// Create payment order for subscription
const createPaymentOrder = async (req, res) => {
  try {
    const { userId } = req.body;
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is a doctor, hospital, or vendor
    if (!['doctor', 'hospital', 'vendor'].includes(user.role)) {
      return res.status(400).json({ message: 'Only doctors, hospitals, and vendors can subscribe' });
    }
    
    // Check if user already has an active subscription
    if (user.subscriptionActive && user.subscriptionExpiry > new Date()) {
      return res.status(400).json({
        message: 'You already have an active subscription',
        expiryDate: user.subscriptionExpiry
      });
    }
    
    // Set subscription amount (INR 2,000)
    const amount = 2000;
    
    // Generate a unique receipt ID
    const receipt = `sub_${uuidv4()}`;
    
    // Create Razorpay order
    const order = await createOrder(amount, receipt);
    
    res.status(200).json({
      message: 'Payment order created successfully',
      order,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Create payment order error:', error);
    res.status(500).json({ message: 'Failed to create payment order', error: error.message });
  }
};

// Verify payment and activate subscription
const verifyPaymentAndActivate = async (req, res) => {
  try {
    const { orderId, paymentId, signature, userId } = req.body;
    
    // Verify payment signature
    const isValid = verifyPayment(orderId, paymentId, signature);
    
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Calculate subscription end date (1 year from now)
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);
    
    // Create subscription record
    const subscription = new Subscription({
      userId,
      paymentId,
      orderId,
      amount: 2000, // INR 2,000
      status: 'completed',
      endDate
    });
    
    await subscription.save();
    
    // Update user subscription status based on role
    if (user.role === 'doctor') {
      await Doctor.findByIdAndUpdate(userId, {
        subscriptionActive: true,
        subscriptionExpiry: endDate
      });
    } else if (user.role === 'hospital') {
      await Hospital.findByIdAndUpdate(userId, {
        subscriptionActive: true,
        subscriptionExpiry: endDate
      });
    } else if (user.role === 'vendor') {
      await Vendor.findByIdAndUpdate(userId, {
        subscriptionActive: true,
        subscriptionExpiry: endDate
      });
    }
    
    res.status(200).json({
      message: 'Payment verified and subscription activated successfully',
      subscription: {
        id: subscription._id,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        status: subscription.status
      }
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: 'Failed to verify payment', error: error.message });
  }
};

module.exports = {
  createPaymentOrder,
  verifyPaymentAndActivate
};