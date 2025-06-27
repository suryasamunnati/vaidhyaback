require('dotenv').config();
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function testRazorpay() {
  try {
    console.log('Testing Razorpay connection...');
    console.log('Using key_id:', process.env.RAZORPAY_KEY_ID);
    
    const options = {
      amount: 50000, // ₹500
      currency: 'INR',
      receipt: 'test_receipt_' + Date.now()
    };
    
    const order = await razorpay.orders.create(options);
    console.log('Order created successfully:', order);
  } catch (error) {
    console.error('Error creating order:', error.message);
    console.error('Full error:', error);
  }
}

testRazorpay();