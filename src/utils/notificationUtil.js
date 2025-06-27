const axios = require('axios');

// Send SMS notification via Fast2SMS
const sendSMS = async (mobileNumber, message) => {
  try {
    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
      route: 'q', // Use 'q' for quick SMS without OTP template
      message: message,
      numbers: mobileNumber,
    }, {
      headers: {
        'authorization': process.env.FAST2SMS_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error sending SMS notification:', error);
    throw new Error('Failed to send SMS notification');
  }
};

// Send appointment confirmation notifications
const sendAppointmentConfirmation = async (appointment, customer, doctor) => {
  try {
    // Format date and time for messages
    const appointmentDate = new Date(appointment.date).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const startTime = appointment.slot.startTime;
    const endTime = appointment.slot.endTime;
    
    // Prepare messages for customer and doctor
    const customerMessage = `Your appointment with Dr. ${doctor.name} is confirmed for ${appointmentDate} from ${startTime} to ${endTime}. Type: ${appointment.appointmentType}. Thank you for booking with Vaidhya.`;
    
    const doctorMessage = `New appointment confirmed with ${customer.name} for ${appointmentDate} from ${startTime} to ${endTime}. Type: ${appointment.appointmentType}.`;
    
    // Send SMS notifications
    await Promise.all([
      sendSMS(customer.mobileNumber, customerMessage),
      sendSMS(doctor.mobileNumber, doctorMessage)
    ]);
    
    // Here you would also implement push notifications if you have a push notification service
    // sendPushNotification(customer.deviceToken, customerMessage);
    // sendPushNotification(doctor.deviceToken, doctorMessage);
    
    return { success: true };
  } catch (error) {
    console.error('Error sending appointment confirmation:', error);
    return { success: false, error: error.message };
  }
};

// Placeholder for push notification functionality
// This would be implemented when you integrate a push notification service like Firebase Cloud Messaging
const sendPushNotification = async (deviceToken, message, title = 'Vaidhya Notification') => {
  // This is a placeholder. You would implement this with your chosen push notification service
  console.log(`Push notification would be sent to ${deviceToken}: ${title} - ${message}`);
  return { success: true };
};

module.exports = {
  sendSMS,
  sendAppointmentConfirmation,
  sendPushNotification
};