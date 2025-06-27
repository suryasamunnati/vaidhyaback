const { Appointment } = require('../models/Appointment');
const { Customer, Doctor } = require('../models/User');
const { generateRtcToken, generateChannelName } = require('../utils/agoraUtil');

// Initialize a call for an appointment
const initializeCall = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const userId = req.user._id;
    
    // Find the appointment
    const appointment = await Appointment.findById(appointmentId)
      .populate('customer', 'name')
      .populate('doctor', 'name');
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // Check if the user is either the customer or the doctor for this appointment
    if (appointment.customer._id.toString() !== userId.toString() && 
        appointment.doctor._id.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized access to this appointment' });
    }
    
    // Check if appointment is confirmed
    if (appointment.status !== 'confirmed') {
      return res.status(400).json({ message: 'Cannot initialize call for an appointment that is not confirmed' });
    }
    
    // Check if appointment type is video or audio
    if (appointment.appointmentType !== 'video' && appointment.appointmentType !== 'audio') {
      return res.status(400).json({ message: 'This appointment is not a video or audio call' });
    }
    
    // Generate a channel name if not already present
    if (!appointment.callDetails || !appointment.callDetails.channelName) {
      const channelName = generateChannelName(appointmentId);
      
      // Generate tokens for both customer and doctor
      const customerUid = 1000; // Use a fixed UID for simplicity, or generate dynamically
      const doctorUid = 2000;   // Use a fixed UID for simplicity, or generate dynamically
      
      const customerToken = generateRtcToken(channelName, customerUid);
      const providerToken = generateRtcToken(channelName, doctorUid);
      
      // Update appointment with call details
      appointment.callDetails = {
        channelName,
        customerToken,
        providerToken,  // Changed from doctorToken to providerToken
        callStarted: false
      };
      
      await appointment.save();
    }
    
    // Determine which token to return based on user role
    const isCustomer = appointment.customer._id.toString() === userId.toString();
    const token = isCustomer ? appointment.callDetails.customerToken : appointment.callDetails.providerToken;
    const uid = isCustomer ? 1000 : 2000; // Match the UIDs used when generating tokens
    
    res.status(200).json({
      message: 'Call initialized successfully',
      callDetails: {
        appointmentId: appointment._id,
        channelName: appointment.callDetails.channelName,
        token,
        uid,
        appId: process.env.AGORA_APP_ID,
        appointmentType: appointment.appointmentType,
        otherParticipant: isCustomer ? appointment.doctor.name : appointment.customer.name
      }
    });
  } catch (error) {
    console.error('Error initializing call:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Start a call (when both parties join)
const startCall = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const userId = req.user._id;
    
    // Find the appointment
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // Check if the user is either the customer or the doctor for this appointment
    if (appointment.customer.toString() !== userId.toString() && 
        appointment.doctor.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized access to this appointment' });
    }
    
    // Update call status
    if (!appointment.callDetails.callStarted) {
      appointment.callDetails.callStarted = true;
      appointment.callDetails.callStartTime = new Date();
      await appointment.save();
    }
    
    res.status(200).json({
      message: 'Call started successfully',
      startTime: appointment.callDetails.callStartTime
    });
  } catch (error) {
    console.error('Error starting call:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// End a call
const endCall = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const userId = req.user._id;
    
    // Find the appointment
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // Check if the user is either the customer or the doctor for this appointment
    if (appointment.customer.toString() !== userId.toString() && 
        appointment.doctor.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized access to this appointment' });
    }
    
    // Update call status
    if (appointment.callDetails.callStarted && !appointment.callDetails.callEndTime) {
      const endTime = new Date();
      appointment.callDetails.callEndTime = endTime;
      
      // Calculate call duration in seconds
      const startTime = new Date(appointment.callDetails.callStartTime);
      const durationMs = endTime - startTime;
      appointment.callDetails.callDuration = Math.floor(durationMs / 1000);
      
      await appointment.save();
    }
    
    res.status(200).json({
      message: 'Call ended successfully',
      callDuration: appointment.callDetails.callDuration,
      endTime: appointment.callDetails.callEndTime
    });
  } catch (error) {
    console.error('Error ending call:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  initializeCall,
  startCall,
  endCall
};