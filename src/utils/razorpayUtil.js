const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay with API keys
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create a new order
const createOrder = async (amount, receipt) => {
  try {
    const options = {
      amount: amount * 100, // amount in paise (correct conversion from rupees)
      currency: 'INR',
      receipt: receipt,
      payment_capture: 1 // Auto-capture the payment
    };
    
    console.log('Creating Razorpay order with options:', options);
    const order = await razorpay.orders.create(options);
    console.log('Razorpay order created successfully:', order);
    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error.message);
    console.error('Full error details:', error);
    throw new Error(`Failed to create payment order: ${error.message}`);
  }
};

// Verify payment signature
const verifyPayment = (orderId, paymentId, signature) => {
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  
  return generatedSignature === signature;
};

// Process payout to doctor
const processDoctorPayout = async (payoutId) => {
  try {
    // Get the payout details
    const payout = await Payout.findById(payoutId);
    if (!payout || payout.status !== 'pending') {
      throw new Error('Invalid payout or payout already processed');
    }
    
    // Get doctor details
    const doctor = await Doctor.findById(payout.doctor);
    if (!doctor || !doctor.bankDetails) {
      throw new Error('Doctor not found or bank details missing');
    }
    
    // Create fund transfer request to doctor's bank account
    // This is a simplified example - actual implementation would use Razorpay's payout API
    const payoutRequest = {
      account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
      amount: payout.amount * 100, // Convert to paise
      currency: 'INR',
      mode: 'NEFT',
      purpose: 'payout',
      fund_account: {
        account_type: 'bank_account',
        bank_account: {
          name: doctor.bankDetails.accountHolderName || doctor.name,
          ifsc: doctor.bankDetails.ifscCode,
          account_number: doctor.bankDetails.accountNumber
        }
      },
      queue_if_low_balance: true,
      reference_id: payout._id.toString(),
      narration: `Vaidhya Doctor Payout - ${doctor.name}`
    };
    
    // Make API call to Razorpay
    const razorpayPayout = await razorpay.payouts.create(payoutRequest);
    
    // Update payout record
    payout.status = 'processing';
    payout.razorpayPayoutId = razorpayPayout.id;
    await payout.save();
    
    return razorpayPayout;
  } catch (error) {
    console.error('Error processing doctor payout:', error);
    throw error;
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  processDoctorPayout
};