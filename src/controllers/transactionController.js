const Transaction = require('../models/Transaction');
const Payout = require('../models/Payout');
const { Doctor } = require('../models/User');
const { razorpay } = require('../utils/razorpayUtil');

// Get doctor's earnings overview
const getDoctorEarnings = async (req, res) => {
  try {
    const doctorId = req.user._id;
    
    // Verify the user is a doctor
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Get all completed transactions for this doctor
    const transactions = await Transaction.find({
      doctor: doctorId,
      status: 'completed'
    });
    
    // Calculate total earnings
    const totalEarnings = transactions.reduce((sum, transaction) => sum + transaction.doctorEarnings, 0);
    
    // Calculate earnings by appointment type
    const earningsByType = {};
    transactions.forEach(transaction => {
      const type = transaction.appointmentType;
      if (!earningsByType[type]) {
        earningsByType[type] = 0;
      }
      earningsByType[type] += transaction.doctorEarnings;
    });
    
    // Get pending payouts
    const pendingPayouts = await Payout.find({
      doctor: doctorId,
      status: { $in: ['pending', 'processing'] }
    }).select('amount requestedAt status');
    
    // Calculate available balance (total earnings minus processed payouts)
    const processedPayouts = await Payout.find({
      doctor: doctorId,
      status: 'completed'
    });
    
    const totalPaidOut = processedPayouts.reduce((sum, payout) => sum + payout.amount, 0);
    const availableBalance = totalEarnings - totalPaidOut;
    
    res.status(200).json({
      totalEarnings,
      earningsByType,
      availableBalance,
      pendingPayouts,
      recentTransactions: transactions.slice(0, 10) // Return 10 most recent transactions
    });
  } catch (error) {
    console.error('Error fetching doctor earnings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Request a payout
const requestPayout = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { amount } = req.body;
    
    // Verify the user is a doctor
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Check if doctor has bank details
    if (!doctor.bankDetails || !doctor.bankDetails.accountNumber || !doctor.bankDetails.ifscCode) {
      return res.status(400).json({ message: 'Please add your bank account details before requesting a payout' });
    }
    
    // Calculate available balance
    const completedTransactions = await Transaction.find({
      doctor: doctorId,
      status: 'completed'
    });
    
    const totalEarnings = completedTransactions.reduce((sum, transaction) => sum + transaction.doctorEarnings, 0);
    
    const processedPayouts = await Payout.find({
      doctor: doctorId,
      status: 'completed'
    });
    
    const totalPaidOut = processedPayouts.reduce((sum, payout) => sum + payout.amount, 0);
    const availableBalance = totalEarnings - totalPaidOut;
    
    // Check if requested amount is valid
    if (amount <= 0) {
      return res.status(400).json({ message: 'Payout amount must be greater than zero' });
    }
    
    // Check if doctor has enough balance
    if (amount > availableBalance) {
      return res.status(400).json({ message: 'Insufficient balance for requested payout amount' });
    }
    
    // Check if amount meets minimum threshold (e.g., INR 1,000)
    const MINIMUM_PAYOUT = 1000; // INR 1,000
    if (amount < MINIMUM_PAYOUT) {
      return res.status(400).json({ 
        message: `Payout amount must be at least ₹${MINIMUM_PAYOUT}`,
        minimumAmount: MINIMUM_PAYOUT
      });
    }
    
    // Create payout request
    const payout = new Payout({
      doctor: doctorId,
      amount,
      status: 'pending',
      bankDetails: {
        accountNumber: doctor.bankDetails.accountNumber,
        ifscCode: doctor.bankDetails.ifscCode,
        accountHolderName: doctor.bankDetails.accountHolderName || doctor.name
      }
    });
    
    await payout.save();
    
    res.status(201).json({
      message: 'Payout request submitted successfully',
      payout: {
        id: payout._id,
        amount: payout.amount,
        status: payout.status,
        requestedAt: payout.requestedAt
      }
    });
  } catch (error) {
    console.error('Error requesting payout:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get doctor's payout history
const getPayoutHistory = async (req, res) => {
  try {
    const doctorId = req.user._id;
    
    // Verify the user is a doctor
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Get all payouts for this doctor
    const payouts = await Payout.find({ doctor: doctorId })
      .sort({ requestedAt: -1 });
    
    res.status(200).json(payouts);
  } catch (error) {
    console.error('Error fetching payout history:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update doctor's bank details
const updateBankDetails = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { accountNumber, ifscCode, accountHolderName } = req.body;
    
    // Validate input
    if (!accountNumber || !ifscCode) {
      return res.status(400).json({ message: 'Account number and IFSC code are required' });
    }
    
    // Verify the user is a doctor
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Update bank details
    doctor.bankDetails = {
      accountNumber,
      ifscCode,
      accountHolderName: accountHolderName || doctor.name,
      verified: false // Will be verified later
    };
    
    await doctor.save();
    
    res.status(200).json({
      message: 'Bank details updated successfully',
      bankDetails: doctor.bankDetails
    });
  } catch (error) {
    console.error('Error updating bank details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getDoctorEarnings,
  requestPayout,
  getPayoutHistory,
  updateBankDetails
};