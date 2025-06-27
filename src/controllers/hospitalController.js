const { Hospital } = require('../models/User');
const { cloudinary } = require('../utils/cloudinaryConfig');

// Get hospital profile with all details
const getHospitalProfile = async (req, res) => {
  try {
    const hospitalId = req.params.id || req.user._id;
    
    const hospital = await Hospital.findById(hospitalId)
      .populate('doctorIds', 'name specialty profilePhoto rating');
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    
    res.status(200).json({
      id: hospital._id,
      name: hospital.name,
      email: hospital.email,
      phone_number: hospital.mobileNumber,
      profile_image_url: hospital.profilePhoto,
      created_at: hospital.createdAt,
      updated_at: hospital.updatedAt,
      user_type: 'hospital',
      type: hospital.type,
      rating: hospital.rating || 0,
      review_count: hospital.reviewCount || 0,
      address: hospital.address,
      city: hospital.city,
      state: hospital.state,
      postal_code: hospital.postalCode,
      latitude: hospital.latitude,
      longitude: hospital.longitude,
      website: hospital.website,
      bed_count: hospital.bedCount,
      doctor_count: hospital.doctorCount,
      facilities: hospital.facilities || [],
      services: hospital.services || [],
      specialties: hospital.specialties || [],
      insurance_accepted: hospital.insuranceAccepted || [],
      images: hospital.images || [],
      is_open_24x7: hospital.isOpen24x7,
      available_slots: [], // This would need to be calculated based on availability
      doctor_ids: hospital.doctorIds.map(doc => doc._id),
      addresses: hospital.addresses || [],
      payment_methods: hospital.paymentMethods || [],
      settings: hospital.settings || {
        notifications_enabled: true,
        language: 'English',
        dark_mode_enabled: false,
        location_tracking_enabled: true
      }
    });
  } catch (error) {
    console.error('Get hospital profile error:', error);
    res.status(500).json({ message: 'Failed to get hospital profile', error: error.message });
  }
};

// Update hospital profile
const updateHospitalProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Check if the user is a hospital
    const hospital = await Hospital.findById(userId);
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }
    
    const {
      type,
      city,
      state,
      postalCode,
      latitude,
      longitude,
      website,
      bedCount,
      doctorCount,
      isOpen24x7
    } = req.body;
    
    // Update hospital profile
    const updatedHospital = await Hospital.findByIdAndUpdate(
      userId,
      {
        $set: {
          type,
          city,
          state,
          postalCode,
          latitude,
          longitude,
          website,
          bedCount,
          doctorCount,
          isOpen24x7
        }
      },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Hospital profile updated successfully',
      hospital: updatedHospital
    });
  } catch (error) {
    console.error('Update hospital profile error:', error);
    res.status(500).json({ message: 'Failed to update hospital profile', error: error.message });
  }
};

// Upload profile photo
const uploadProfilePhoto = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Check if the user is a hospital
    const hospital = await Hospital.findById(userId);
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }
    
    // If no file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Get the Cloudinary URL from the uploaded file
    const profilePhotoUrl = req.file.path;
    
    // Update hospital profile with the new photo URL
    const updatedHospital = await Hospital.findByIdAndUpdate(
      userId,
      { $set: { profilePhoto: profilePhotoUrl } },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Profile photo uploaded successfully',
      profilePhoto: updatedHospital.profilePhoto
    });
  } catch (error) {
    console.error('Upload profile photo error:', error);
    res.status(500).json({ message: 'Failed to upload profile photo', error: error.message });
  }
};

// Update hospital facilities
const updateFacilities = async (req, res) => {
  try {
    const userId = req.user._id;
    const { facilities } = req.body;
    
    const hospital = await Hospital.findById(userId);
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }
    
    const updatedHospital = await Hospital.findByIdAndUpdate(
      userId,
      { $set: { facilities } },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Facilities updated successfully',
      facilities: updatedHospital.facilities
    });
  } catch (error) {
    console.error('Update facilities error:', error);
    res.status(500).json({ message: 'Failed to update facilities', error: error.message });
  }
};

// Update hospital services
const updateServices = async (req, res) => {
  try {
    const userId = req.user._id;
    const { services } = req.body;
    
    const hospital = await Hospital.findById(userId);
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }
    
    const updatedHospital = await Hospital.findByIdAndUpdate(
      userId,
      { $set: { services } },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Services updated successfully',
      services: updatedHospital.services
    });
  } catch (error) {
    console.error('Update services error:', error);
    res.status(500).json({ message: 'Failed to update services', error: error.message });
  }
};

// Update hospital specialties
const updateSpecialties = async (req, res) => {
  try {
    const userId = req.user._id;
    const { specialties } = req.body;
    
    const hospital = await Hospital.findById(userId);
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }
    
    const updatedHospital = await Hospital.findByIdAndUpdate(
      userId,
      { $set: { specialties } },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Specialties updated successfully',
      specialties: updatedHospital.specialties
    });
  } catch (error) {
    console.error('Update specialties error:', error);
    res.status(500).json({ message: 'Failed to update specialties', error: error.message });
  }
};

// Update hospital insurance accepted
const updateInsuranceAccepted = async (req, res) => {
  try {
    const userId = req.user._id;
    const { insuranceAccepted } = req.body;
    
    const hospital = await Hospital.findById(userId);
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }
    
    const updatedHospital = await Hospital.findByIdAndUpdate(
      userId,
      { $set: { insuranceAccepted } },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Insurance accepted updated successfully',
      insuranceAccepted: updatedHospital.insuranceAccepted
    });
  } catch (error) {
    console.error('Update insurance accepted error:', error);
    res.status(500).json({ message: 'Failed to update insurance accepted', error: error.message });
  }
};

// Update hospital images
const updateImages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { images } = req.body;
    
    const hospital = await Hospital.findById(userId);
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }
    
    const updatedHospital = await Hospital.findByIdAndUpdate(
      userId,
      { $set: { images } },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Images updated successfully',
      images: updatedHospital.images
    });
  } catch (error) {
    console.error('Update images error:', error);
    res.status(500).json({ message: 'Failed to update images', error: error.message });
  }
};

// Update hospital addresses
const updateAddresses = async (req, res) => {
  try {
    const userId = req.user._id;
    const { addresses, placeData } = req.body;
    
    const hospital = await Hospital.findById(userId);
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }
    
    let updatedAddresses = addresses;
    
    // If Google Places data is provided, process it
    if (placeData) {
      const newAddress = mapGooglePlaceToAddress(placeData, 'Main Facility');
      
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
    
    const updatedHospital = await Hospital.findByIdAndUpdate(
      userId,
      { $set: { addresses: updatedAddresses } },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Addresses updated successfully',
      addresses: updatedHospital.addresses
    });
  } catch (error) {
    console.error('Update addresses error:', error);
    res.status(500).json({ message: 'Failed to update addresses', error: error.message });
  }
};

// Update hospital payment methods
const updatePaymentMethods = async (req, res) => {
  try {
    const userId = req.user._id;
    const { paymentMethods } = req.body;
    
    const hospital = await Hospital.findById(userId);
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }
    
    // Ensure only one payment method is set as default
    if (paymentMethods && paymentMethods.length > 0) {
      const defaultPaymentMethods = paymentMethods.filter(pm => pm.isDefault);
      if (defaultPaymentMethods.length > 1) {
        return res.status(400).json({ message: 'Only one payment method can be set as default' });
      }
    }
    
    const updatedHospital = await Hospital.findByIdAndUpdate(
      userId,
      { $set: { paymentMethods } },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Payment methods updated successfully',
      paymentMethods: updatedHospital.paymentMethods
    });
  } catch (error) {
    console.error('Update payment methods error:', error);
    res.status(500).json({ message: 'Failed to update payment methods', error: error.message });
  }
};

// Update hospital settings
const updateSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { settings } = req.body;
    
    const hospital = await Hospital.findById(userId);
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }
    
    const updatedHospital = await Hospital.findByIdAndUpdate(
      userId,
      { $set: { settings } },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Settings updated successfully',
      settings: updatedHospital.settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Failed to update settings', error: error.message });
  }
};

// Add doctor to hospital
const addDoctor = async (req, res) => {
  try {
    const userId = req.user._id;
    const { doctorId } = req.body;
    
    const hospital = await Hospital.findById(userId);
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }
    
    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Check if doctor is already added to hospital
    if (hospital.doctorIds && hospital.doctorIds.includes(doctorId)) {
      return res.status(400).json({ message: 'Doctor already added to hospital' });
    }
    
    const updatedHospital = await Hospital.findByIdAndUpdate(
      userId,
      { $push: { doctorIds: doctorId } },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Doctor added to hospital successfully',
      doctorIds: updatedHospital.doctorIds
    });
  } catch (error) {
    console.error('Add doctor error:', error);
    res.status(500).json({ message: 'Failed to add doctor', error: error.message });
  }
};

// Remove doctor from hospital
const removeDoctor = async (req, res) => {
  try {
    const userId = req.user._id;
    const { doctorId } = req.params;
    
    const hospital = await Hospital.findById(userId);
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }
    
    const updatedHospital = await Hospital.findByIdAndUpdate(
      userId,
      { $pull: { doctorIds: doctorId } },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Doctor removed from hospital successfully',
      doctorIds: updatedHospital.doctorIds
    });
  } catch (error) {
    console.error('Remove doctor error:', error);
    res.status(500).json({ message: 'Failed to remove doctor', error: error.message });
  }
};

module.exports = {
  getHospitalProfile,
  updateHospitalProfile,
  uploadProfilePhoto,
  updateFacilities,
  updateServices,
  updateSpecialties,
  updateInsuranceAccepted,
  updateImages,
  updateAddresses,
  updatePaymentMethods,
  updateSettings,
  addDoctor,
  removeDoctor
};

// Import the utility function
const { mapGooglePlaceToAddress } = require('../utils/addressUtil');