const axios = require('axios');

// Generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via Fast2SMS
const sendOTP = async (mobileNumber, otp) => {
  try {
    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
      route: 'otp',
      variables_values: otp,
      numbers: mobileNumber,
    }, {
      headers: {
        'authorization': process.env.FAST2SMS_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw new Error('Failed to send OTP');
  }
};

module.exports = {
  generateOTP,
  sendOTP
};