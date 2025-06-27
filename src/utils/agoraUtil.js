const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

// Generate an Agora token for video/voice calls
const generateRtcToken = (channelName, uid, role = RtcRole.PUBLISHER, privilegeExpireTime = 3600) => {
  // Get the current timestamp in seconds
  const currentTimestamp = Math.floor(Date.now() / 1000);
  // Set token expiration time
  const expirationTimestamp = currentTimestamp + privilegeExpireTime;
  
  // Build the token
  const token = RtcTokenBuilder.buildTokenWithUid(
    process.env.AGORA_APP_ID,
    process.env.AGORA_APP_CERTIFICATE,
    channelName,
    uid,
    role,
    expirationTimestamp
  );
  
  return token;
};

// Create a unique channel name for an appointment
const generateChannelName = (appointmentId) => {
  return `vaidhya_appointment_${appointmentId}_${Date.now()}`;
};

module.exports = {
  generateRtcToken,
  generateChannelName
};