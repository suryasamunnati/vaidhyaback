const Doctor = require('../models/User').Doctor;
const Appointment = require('../models/Appointment');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');
const { cloudinary } = require('../utils/cloudinaryConfig');

// Import the utility function
const { mapGooglePlaceToAddress } = require('../utils/addressUtil');


// Update doctor profile
const updateDoctorProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Check if the user is a doctor
    const doctor = await Doctor.findById(userId);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    
    const {
      profilePhoto,
      medicalRegistrationNumber,
      qualifications,
      yearsOfExperience,
      clinicHospitalAffiliation,
      consultationFees,
      specialtyTags
    } = req.body;
    
    // Validate specialty tags (maximum 3)
    if (specialtyTags && specialtyTags.length > 3) {
      return res.status(400).json({ message: 'Maximum 3 specialty tags allowed' });
    }
    
    // If a new profile photo URL is provided and different from the current one,
    // delete the old photo from Cloudinary (if it exists)
    if (profilePhoto && doctor.profilePhoto && profilePhoto !== doctor.profilePhoto) {
      try {
        // Extract public_id from the Cloudinary URL
        const publicId = doctor.profilePhoto.split('/').pop().split('.')[0];
        if (publicId) {
          await cloudinary.uploader.destroy('vaidhya/doctors/' + publicId);
        }
      } catch (cloudinaryError) {
        console.error('Error deleting old profile photo:', cloudinaryError);
        // Continue with the update even if deletion fails
      }
    }
    
    // Update doctor profile
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      userId,
      {
        $set: {
          profilePhoto,
          medicalRegistrationNumber,
          qualifications,
          yearsOfExperience,
          clinicHospitalAffiliation,
          consultationFees,
          specialtyTags
        }
      },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Doctor profile updated successfully',
      doctor: updatedDoctor
    });
  } catch (error) {
    console.error('Update doctor profile error:', error);
    res.status(500).json({ message: 'Failed to update doctor profile', error: error.message });
  }
};

// Update doctor availability
const updateAvailability = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Check if the user is a doctor
    const doctor = await Doctor.findById(userId);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    
    const { workingDays } = req.body;
    
    // Initialize availability object if it doesn't exist
    if (!doctor.availability) {
      doctor.availability = {
        workingDays: [],
        unavailablePeriods: []
      };
    }
    
    // Update working days
    doctor.availability.workingDays = workingDays;
    await doctor.save();
    
    res.status(200).json({
      message: 'Doctor availability updated successfully',
      availability: doctor.availability
    });
  } catch (error) {
    console.error('Update doctor availability error:', error);
    res.status(500).json({ message: 'Failed to update doctor availability', error: error.message });
  }
};

// Add unavailable period
const addUnavailablePeriod = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Check if the user is a doctor
    const doctor = await Doctor.findById(userId);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    
    const { startDate, endDate, reason } = req.body;
    
    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ message: 'Start date cannot be after end date' });
    }
    
    // Initialize availability if it doesn't exist
    if (!doctor.availability) {
      await Doctor.findByIdAndUpdate(
        userId,
        {
          $set: {
            availability: {
              workingDays: [],
              unavailablePeriods: []
            }
          }
        }
      );
    }
    
    // Add unavailable period
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      userId,
      {
        $push: {
          'availability.unavailablePeriods': {
            startDate,
            endDate,
            reason
          }
        }
      },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Unavailable period added successfully',
      unavailablePeriods: updatedDoctor.availability.unavailablePeriods
    });
  } catch (error) {
    console.error('Add unavailable period error:', error);
    res.status(500).json({ message: 'Failed to add unavailable period', error: error.message });
  }
};

// Upload profile photo
const uploadProfilePhoto = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Check if the user is a doctor
    const doctor = await Doctor.findById(userId);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    
    // If no file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Get the Cloudinary URL from the uploaded file
    const profilePhotoUrl = req.file.path;
    
    // Update doctor profile with the new photo URL
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      userId,
      { $set: { profilePhoto: profilePhotoUrl } },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Profile photo uploaded successfully',
      profilePhoto: updatedDoctor.profilePhoto
    });
  } catch (error) {
    console.error('Upload profile photo error:', error);
    res.status(500).json({ message: 'Failed to upload profile photo', error: error.message });
  }
};

// Add these functions to the existing doctorController.js

// Get doctor profile with all details
const getDoctorProfile = async (req, res) => {
  try {
    const doctorId = req.params.id || req.user._id;
    
    const doctor = await Doctor.findById(doctorId)
      .select('-bankDetails.accountNumber -bankDetails.ifscCode');
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.status(200).json({
      id: doctor._id,
      name: doctor.name,
      email: doctor.email,
      phone_number: doctor.mobileNumber,
      profile_image_url: doctor.profilePhoto,
      created_at: doctor.createdAt,
      updated_at: doctor.updatedAt,
      user_type: 'doctor',
      specialty: doctor.specialty,
      qualification: doctor.qualifications.join(', '),
      rating: doctor.rating || 0,
      review_count: doctor.reviewCount || 0,
      about: doctor.about,
      experience_years: doctor.yearsOfExperience,
      languages: doctor.languages || [],
      clinics: doctor.clinics || [],
      consultation_types: doctor.consultationTypes || [],
      specializations: doctor.specializations || [],
      services: doctor.services || [],
      education: doctor.education || [],
      experience: doctor.experience || [],
      awards: doctor.awards || [],
      available_slots: doctor.availability && doctor.availability.workingDays ? 
        doctor.availability.workingDays.filter(day => day.isAvailable).length : 0,
      is_available_now: doctor.isAvailableNow,
      addresses: doctor.addresses || [],
      payment_methods: [{
        id: 'pm_001',
        type: 'Bank Account',
        name: doctor.bankDetails.accountHolderName || 'Business Account',
        last_four_digits: doctor.bankDetails.accountNumber ? 
          doctor.bankDetails.accountNumber.slice(-4) : '',
        expiry_date: null,
        is_default: true
      }],
      settings: doctor.settings || {
        notifications_enabled: true,
        language: 'English',
        dark_mode_enabled: false,
        location_tracking_enabled: true
      },
      availability: doctor.availability || {
        workingDays: [],
        unavailablePeriods: []
      }
    });
  } catch (error) {
    console.error('Get doctor profile error:', error);
    res.status(500).json({ message: 'Failed to get doctor profile', error: error.message });
  }
};

// Update doctor education
const updateEducation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { education } = req.body;
    
    const doctor = await Doctor.findById(userId);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      userId,
      { $set: { education } },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Education updated successfully',
      education: updatedDoctor.education
    });
  } catch (error) {
    console.error('Update education error:', error);
    res.status(500).json({ message: 'Failed to update education', error: error.message });
  }
};

// Update doctor experience
const updateExperience = async (req, res) => {
  try {
    const userId = req.user._id;
    const { experience } = req.body;
    
    const doctor = await Doctor.findById(userId);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      userId,
      { $set: { experience } },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Experience updated successfully',
      experience: updatedDoctor.experience
    });
  } catch (error) {
    console.error('Update experience error:', error);
    res.status(500).json({ message: 'Failed to update experience', error: error.message });
  }
};

// Update doctor awards
const updateAwards = async (req, res) => {
  try {
    const userId = req.user._id;
    const { awards } = req.body;
    
    const doctor = await Doctor.findById(userId);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      userId,
      { $set: { awards } },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Awards updated successfully',
      awards: updatedDoctor.awards
    });
  } catch (error) {
    console.error('Update awards error:', error);
    res.status(500).json({ message: 'Failed to update awards', error: error.message });
  }
};

// Update doctor clinics
const updateClinics = async (req, res) => {
  try {
    const userId = req.user._id;
    const { clinics } = req.body;
    
    const doctor = await Doctor.findById(userId);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      userId,
      { $set: { clinics } },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Clinics updated successfully',
      clinics: updatedDoctor.clinics
    });
  } catch (error) {
    console.error('Update clinics error:', error);
    res.status(500).json({ message: 'Failed to update clinics', error: error.message });
  }
};

// Update doctor consultation types
const updateConsultationTypes = async (req, res) => {
  try {
    const userId = req.user._id;
    const { consultationTypes } = req.body;
    
    const doctor = await Doctor.findById(userId);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      userId,
      { $set: { consultationTypes } },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Consultation types updated successfully',
      consultationTypes: updatedDoctor.consultationTypes
    });
  } catch (error) {
    console.error('Update consultation types error:', error);
    res.status(500).json({ message: 'Failed to update consultation types', error: error.message });
  }
};

// Update doctor settings
const updateSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { settings } = req.body;
    
    const doctor = await Doctor.findById(userId);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      userId,
      { $set: { settings } },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Settings updated successfully',
      settings: updatedDoctor.settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Failed to update settings', error: error.message });
  }
};

// Update doctor addresses
const updateAddresses = async (req, res) => {
  try {
    const userId = req.user._id;
    const { addresses, placeData } = req.body;
    
    const doctor = await Doctor.findById(userId);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    
    let updatedAddresses = addresses;
    
    // If Google Places data is provided, process it
    if (placeData) {
      const newAddress = mapGooglePlaceToAddress(placeData, 'Work Address');
      
      // If no addresses exist yet or addresses array is empty
      if (!updatedAddresses || updatedAddresses.length === 0) {
        updatedAddresses = [newAddress];
      } else {
        // If setting as default, unset other defaults
        if (newAddress.isDefault) {
          updatedAddresses.forEach(addr => addr.isDefault = false);
        }
        
        // Check if an address with this placeId already exists
        const existingIndex = updatedAddresses.findIndex(addr => addr.placeId === placeData.place_id);
        
        if (existingIndex >= 0) {
          // Update existing address
          updatedAddresses[existingIndex] = {
            ...updatedAddresses[existingIndex],
            ...newAddress
          };
        } else {
          // Add new address
          updatedAddresses.push(newAddress);
        }
      }
    }
    
    // Ensure only one address is set as default
    if (updatedAddresses && updatedAddresses.length > 0) {
      const defaultAddresses = updatedAddresses.filter(addr => addr.isDefault);
      if (defaultAddresses.length > 1) {
        return res.status(400).json({ message: 'Only one address can be set as default' });
      }
      
      // If no default address, set the first one as default
      if (defaultAddresses.length === 0) {
        updatedAddresses[0].isDefault = true;
      }
    }
    
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      userId,
      { $set: { addresses: updatedAddresses } },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Addresses updated successfully',
      addresses: updatedDoctor.addresses
    });
  } catch (error) {
    console.error('Update addresses error:', error);
    res.status(500).json({ message: 'Failed to update addresses', error: error.message });
  }
};

// Add these to the module.exports
module.exports = {
  updateDoctorProfile,
  updateAvailability,
  addUnavailablePeriod,
  uploadProfilePhoto,
  getDoctorProfile,
  updateEducation,
  updateExperience,
  updateAwards,
  updateClinics,
  updateConsultationTypes,
  updateSettings,
  updateAddresses
};


// Get doctor dashboard statistics
const getDoctorDashboardStats = async (req, res) => {
  try {
    const doctorId = req.user._id;
    
    // Check if the user is a doctor
    const doctor = await Doctor.findById(doctorId);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get today's appointments
    const todayAppointments = await Appointment.countDocuments({
      doctor: doctorId,
      dateTime: { $gte: today, $lt: tomorrow },
      status: { $in: ['upcoming', 'confirmed'] }
    });
    
    // Get total unique patients
    const uniquePatients = await Appointment.distinct('customer', { doctor: doctorId });
    const totalPatients = uniquePatients.length;
    
    // Get today's earnings from transactions
    const todayEarnings = await Transaction.aggregate([
      {
        $match: {
          doctor: new mongoose.Types.ObjectId(doctorId), // Fix: Use new keyword
          createdAt: { $gte: today, $lt: tomorrow },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    const earnings = todayEarnings.length > 0 ? todayEarnings[0].total : 0;
    
    // Get pending reviews (this would need a Review model)
    // This is a placeholder - you would need to implement a review system
    const pendingReviews = 0; // Replace with actual query when you have a review system
    
    res.status(200).json({
      today_appointments: todayAppointments,
      pending_reviews: pendingReviews,
      total_patients: totalPatients,
      today_earnings: earnings,
      currency: 'INR' // Use the appropriate currency from your system
    });
  } catch (error) {
    console.error('Get doctor dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to get dashboard stats', error: error.message });
  }
};




// Get all services provided by the doctor
const getDoctorServices = async (req, res) => {
  try {
    const doctorId = req.params._id || req.user._id;
    
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.status(200).json({
      services: doctor.services || []
    });
  } catch (error) {
    console.error('Error fetching doctor services:', error);
    res.status(500).json({ message: 'Failed to fetch doctor services', error: error.message });
  }
};

// Get a specific service by ID
const getDoctorServiceById = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { serviceId } = req.params;
    
    if (!serviceId) {
      return res.status(400).json({ message: 'Service ID is required' });
    }
    
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    const service = doctor.services.find(service => service.id === serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    res.status(200).json(service);
  } catch (error) {
    console.error('Error fetching doctor service:', error);
    res.status(500).json({ message: 'Failed to fetch doctor service', error: error.message });
  }
};

// Add a new service
const addDoctorService = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { 
      serviceType, 
      price, 
      isCommissionInclusive, 
      currency, 
      durationMinutes, 
      isActive 
    } = req.body;
    
    if (!serviceType) {
      return res.status(400).json({ message: 'Service type is required' });
    }
    
    // Validate service type
    const validServiceTypes = ['Clinical Visit', 'Home Visit', 'Video Consultation', 'Voice Consultation'];
    if (!validServiceTypes.includes(serviceType)) {
      return res.status(400).json({ 
        message: 'Invalid service type. Must be one of: Clinical Visit, Home Visit, Video Consultation, Voice Consultation'
      });
    }
    
    if (!price || price <= 0) {
      return res.status(400).json({ message: 'Valid price is required' });
    }
    
    if (!durationMinutes || durationMinutes < 5) {
      return res.status(400).json({ message: 'Valid duration (minimum 5 minutes) is required' });
    }
    
    // Create new service object
    const newService = {
      id: `service_${Date.now()}`,
      serviceType,
      price,
      isCommissionInclusive: isCommissionInclusive !== undefined ? isCommissionInclusive : false,
      commissionPercentage: 10, // Default 10%
      currency: currency || 'INR',
      durationMinutes,
      isActive: isActive !== undefined ? isActive : true,
      createdAt: new Date()
    };
    
    // Use findByIdAndUpdate to avoid full schema validation
    const doctor = await Doctor.findByIdAndUpdate(
      doctorId,
      { $push: { services: newService } },
      { new: true, runValidators: false } // Disable validators to avoid password check
    );
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Log for debugging
    console.log('Service added successfully:', newService);
    console.log('Doctor services count:', doctor.services.length);
    
    res.status(201).json({ message: 'Service added successfully', service: newService });
  } catch (error) {
    console.error('Error adding doctor service:', error);
    res.status(500).json({ message: 'Failed to add doctor service', error: error.message });
  }
};

// Update an existing service
const updateDoctorService = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { serviceId } = req.params;
    const { 
      serviceType, 
      price, 
      isCommissionInclusive, 
      currency, 
      durationMinutes, 
      isActive 
    } = req.body;
    
    if (!serviceId) {
      return res.status(400).json({ message: 'Service ID is required' });
    }
    
    // Validate service type if provided
    if (serviceType) {
      const validServiceTypes = ['Clinical Visit', 'Home Visit', 'Video Consultation', 'Voice Consultation'];
      if (!validServiceTypes.includes(serviceType)) {
        return res.status(400).json({ 
          message: 'Invalid service type. Must be one of: Clinical Visit, Home Visit, Video Consultation, Voice Consultation'
        });
      }
    }
    
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Find the service
    const serviceIndex = doctor.services.findIndex(service => service.id === serviceId);
    if (serviceIndex === -1) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    // Update service fields
    if (serviceType) doctor.services[serviceIndex].serviceType = serviceType;
    if (price !== undefined) doctor.services[serviceIndex].price = price;
    if (isCommissionInclusive !== undefined) doctor.services[serviceIndex].isCommissionInclusive = isCommissionInclusive;
    if (currency) doctor.services[serviceIndex].currency = currency;
    if (durationMinutes !== undefined) doctor.services[serviceIndex].durationMinutes = durationMinutes;
    if (isActive !== undefined) doctor.services[serviceIndex].isActive = isActive;
    
    doctor.services[serviceIndex].updatedAt = new Date();
    
    await doctor.save();
    
    res.status(200).json({ message: 'Service updated successfully', service: doctor.services[serviceIndex] });
  } catch (error) {
    console.error('Error updating doctor service:', error);
    res.status(500).json({ message: 'Failed to update doctor service', error: error.message });
  }
};

// Delete a service
const deleteDoctorService = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { serviceId } = req.params;
    
    if (!serviceId) {
      return res.status(400).json({ message: 'Service ID is required' });
    }
    
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Remove the service
    doctor.services = doctor.services.filter(service => service.id !== serviceId);
    await doctor.save();
    
    res.status(200).json({ message: 'Service deleted successfully', services: doctor.services });
  } catch (error) {
    console.error('Error deleting doctor service:', error);
    res.status(500).json({ message: 'Failed to delete doctor service', error: error.message });
  }
};

// Update service status (active/inactive)
const updateDoctorServiceStatus = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { serviceId } = req.params;
    const { isActive } = req.body;
    
    if (!serviceId) {
      return res.status(400).json({ message: 'Service ID is required' });
    }
    
    if (isActive === undefined) {
      return res.status(400).json({ message: 'isActive status is required' });
    }
    
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Find the service
    const serviceIndex = doctor.services.findIndex(service => service.id === serviceId);
    if (serviceIndex === -1) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    // Update service status
    doctor.services[serviceIndex].isActive = isActive;
    doctor.services[serviceIndex].updatedAt = new Date();
    
    await doctor.save();
    
    res.status(200).json({ 
      message: `Service ${isActive ? 'activated' : 'deactivated'} successfully`, 
      service: doctor.services[serviceIndex] 
    });
  } catch (error) {
    console.error('Error updating doctor service status:', error);
    res.status(500).json({ message: 'Failed to update doctor service status', error: error.message });
  }
};
// ... existing code ...

// Get nearby doctors based on latitude and longitude
const getNearbyDoctors = async (req, res) => {
  try {
    const { latitude, longitude, radius = 10, limit = 20, specialty, category, page = 1 } = req.query;
    
    // Validate required parameters
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        message: 'Latitude and longitude are required' 
      });
    }
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radiusInKm = parseFloat(radius);
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const skip = (pageNum - 1) * limitNum;
    
    // Build query for active doctors - fix the role/user_type field
    let query = {
      $or: [
        { role: 'doctor' },
        { user_type: 'doctor' }
      ],
      // Remove status and subscriptionActive if they don't exist in your schema
      'addresses.latitude': { $exists: true, $ne: null },
      'addresses.longitude': { $exists: true, $ne: null }
    };
    
    // Add specialty filter if provided
    if (specialty && specialty !== 'all') {
      query.specialty = { $regex: specialty, $options: 'i' };
    }
    
    // Add category filter if provided (if this field exists)
    if (category && category !== 'all') {
      query.category = { $regex: category, $options: 'i' };
    }
    
    // Find doctors with geospatial query
    const doctors = await Doctor.aggregate([
      {
        $match: query
      },
      {
        $addFields: {
          // Get coordinates from addresses array (first address)
          doctorLat: { $arrayElemAt: ['$addresses.latitude', 0] },
          doctorLng: { $arrayElemAt: ['$addresses.longitude', 0] }
        }
      },
      {
        $addFields: {
          distance: {
            $multiply: [
              6371, // Earth's radius in kilometers
              {
                $acos: {
                  $add: [
                    {
                      $multiply: [
                        { $sin: { $multiply: [{ $divide: [lat, 180] }, Math.PI] } },
                        { $sin: { $multiply: [{ $divide: ['$doctorLat', 180] }, Math.PI] } }
                      ]
                    },
                    {
                      $multiply: [
                        { $cos: { $multiply: [{ $divide: [lat, 180] }, Math.PI] } },
                        { $cos: { $multiply: [{ $divide: ['$doctorLat', 180] }, Math.PI] } },
                        { $cos: { $multiply: [{ $divide: [{ $subtract: ['$doctorLng', lng] }, 180] }, Math.PI] } }
                      ]
                    }
                  ]
                }
              }
            ]
          }
        }
      },
      {
        $match: {
          distance: { $lte: radiusInKm },
          doctorLat: { $ne: null },
          doctorLng: { $ne: null }
        }
      },
      {
        $sort: { distance: 1, rating: -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: limitNum
      },
      {
        $project: {
          id: '$_id',
          name: 1,
          email: 1,
          phone_number: '$mobileNumber', // Map to your field name
          user_type: 1,
          specialty: 1,
          qualification: '$qualifications',
          rating: { $ifNull: ['$rating', 0] },
          review_count: { $ifNull: ['$reviewCount', 0] },
          languages: 1,
          clinics: '$clinicHospitalAffiliation',
          consultation_types: '$consultationTypes',
          specializations: 1,
          services: 1,
          education: 1,
          experience: 1,
          awards: 1,
          available_slots: '$availableSlots',
          is_available_now: '$isAvailableNow',
          addresses: 1,
          payment_methods: '$paymentMethods',
          settings: 1,
          distance: { $round: ['$distance', 2] },
          created_at: '$createdAt',
          updated_at: '$updatedAt'
        }
      }
    ]);
    
    // Get total count with same logic
    const totalCount = await Doctor.aggregate([
      { $match: query },
      {
        $addFields: {
          doctorLat: { $arrayElemAt: ['$addresses.latitude', 0] },
          doctorLng: { $arrayElemAt: ['$addresses.longitude', 0] }
        }
      },
      {
        $addFields: {
          distance: {
            $multiply: [
              6371,
              {
                $acos: {
                  $add: [
                    {
                      $multiply: [
                        { $sin: { $multiply: [{ $divide: [lat, 180] }, Math.PI] } },
                        { $sin: { $multiply: [{ $divide: ['$doctorLat', 180] }, Math.PI] } }
                      ]
                    },
                    {
                      $multiply: [
                        { $cos: { $multiply: [{ $divide: [lat, 180] }, Math.PI] } },
                        { $cos: { $multiply: [{ $divide: ['$doctorLat', 180] }, Math.PI] } },
                        { $cos: { $multiply: [{ $divide: [{ $subtract: ['$doctorLng', lng] }, 180] }, Math.PI] } }
                      ]
                    }
                  ]
                }
              }
            ]
          }
        }
      },
      {
        $match: {
          distance: { $lte: radiusInKm },
          doctorLat: { $ne: null },
          doctorLng: { $ne: null }
        }
      },
      { $count: 'total' }
    ]);
    
    const total = totalCount.length > 0 ? totalCount[0].total : 0;
    
    res.status(200).json({
      success: true,
      data: {
        doctors,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
          hasNext: pageNum < Math.ceil(total / limitNum),
          hasPrev: pageNum > 1
        },
        searchParams: {
          latitude: lat,
          longitude: lng,
          radius: radiusInKm,
          specialty: specialty || 'all',
          category: category || 'all'
        }
      }
    });
    
  } catch (error) {
    console.error('Get nearby doctors error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get nearby doctors', 
      error: error.message 
    });
  }
};

// ... existing code ...


// Get service overview statistics
const getDoctorServiceOverview = async (req, res) => {
  try {
    const doctorId = req.user._id;
    
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Calculate service statistics
    const services = doctor.services || [];
    const totalServices = services.length;
    const activeServices = services.filter(service => service.isActive).length;
    const inactiveServices = totalServices - activeServices;
    
    // Return with property names matching frontend expectations
    res.status(200).json({
      total: totalServices,
      active: activeServices,
      inactive: inactiveServices
    });
  } catch (error) {
    console.error('Error getting doctor service overview:', error);
    res.status(500).json({ message: 'Failed to get doctor service overview', error: error.message });
  }
};
// Get doctor available slots for customers
const getDoctorAvailableSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date, days = 7 } = req.query; // Optional date filter and number of days
    
    const doctor = await Doctor.findById(doctorId)
      .select('name availability services consultationTypes');
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    if (!doctor.availability || !doctor.availability.workingDays || doctor.availability.workingDays.length === 0) {
      return res.status(200).json({ 
        doctorId,
        doctorName: doctor.name,
        availableSlots: [],
        message: 'Doctor has not set availability yet'
      });
    }
    
    // Calculate available slots for the requested period
    const startDate = date ? new Date(date) : new Date();
    const availableSlots = [];
    
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
      const workingDay = doctor.availability.workingDays.find(
        day => day.day === dayName && day.isAvailable
      );
      
      if (workingDay && workingDay.slots && workingDay.slots.length > 0) {
        // Filter out booked slots and check for unavailable periods
        const availableSlotsForDay = workingDay.slots
          .filter(slot => !slot.isBooked)
          .map(slot => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
            duration: slot.duration || 30, // Default 30 minutes
            consultationTypes: doctor.consultationTypes || []
          }));
        
        if (availableSlotsForDay.length > 0) {
          availableSlots.push({
            date: currentDate.toISOString().split('T')[0],
            day: dayName,
            slots: availableSlotsForDay
          });
        }
      }
    }
    
    res.status(200).json({
      doctorId,
      doctorName: doctor.name,
      consultationTypes: doctor.consultationTypes || [],
      services: doctor.services || [],
      availableSlots
    });
    
  } catch (error) {
    console.error('Get doctor available slots error:', error);
    res.status(500).json({ 
      message: 'Failed to get doctor available slots', 
      error: error.message 
    });
  }
};

// Update the module.exports
module.exports = {
  updateDoctorProfile,
  updateAvailability,
  addUnavailablePeriod,
  uploadProfilePhoto,
  getDoctorProfile,
  updateEducation,
  updateExperience,
  updateAwards,
  updateClinics,
  updateConsultationTypes,
  updateSettings,
  updateAddresses,
  getDoctorDashboardStats,
  getDoctorServices,
  getDoctorServiceById,
  addDoctorService,
  updateDoctorService,
  deleteDoctorService,
  updateDoctorServiceStatus,
  getDoctorServiceOverview,
  getNearbyDoctors,
  getDoctorAvailableSlots
};