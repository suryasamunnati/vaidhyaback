const { Vendor } = require('../models/User');
const { cloudinary } = require('../utils/cloudinaryConfig');

// Get vendor profile
const getVendorProfile = async (req, res) => {
  try {
    const vendorId = req.params.id || req.user._id;
    
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Format response to match the desired JSON structure
    const response = {
      id: vendor._id,
      name: vendor.name,
      email: vendor.email,
      phone_number: vendor.mobileNumber,
      profile_image_url: vendor.profileImageUrl,
      created_at: vendor.createdAt,
      updated_at: vendor.updatedAt,
      user_type: vendor.role,
      rating: vendor.rating,
      review_count: vendor.reviewCount,
      address: vendor.address,
      city: vendor.city,
      state: vendor.state,
      postal_code: vendor.postalCode,
      latitude: vendor.latitude,
      longitude: vendor.longitude,
      website: vendor.website,
      service_types: vendor.serviceTypes,
      services: vendor.services,
      images: vendor.images,
      is_available_now: vendor.isAvailableNow,
      available_slots: vendor.availableSlots,
      medical_records: [],
      medications: [],
      vitals: [],
      family_members: [],
      addresses: vendor.addresses,
      payment_methods: vendor.paymentMethods,
      settings: {
        notifications_enabled: vendor.settings?.notificationsEnabled,
        language: vendor.settings?.language,
        dark_mode_enabled: vendor.settings?.darkModeEnabled,
        location_tracking_enabled: vendor.settings?.locationTrackingEnabled
      }
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching vendor profile:', error);
    res.status(500).json({ message: 'Failed to fetch vendor profile', error: error.message });
  }
};

// Update vendor profile
const updateVendorProfile = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const {
      name,
      email,
      address,
      city,
      state,
      postal_code,
      latitude,
      longitude,
      website,
      facilityDetails
    } = req.body;
    
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Update fields if provided
    if (name) vendor.name = name;
    if (email) vendor.email = email;
    if (address) vendor.address = address;
    if (city) vendor.city = city;
    if (state) vendor.state = state;
    if (postal_code) vendor.postalCode = postal_code;
    if (latitude) vendor.latitude = latitude;
    if (longitude) vendor.longitude = longitude;
    if (website) vendor.website = website;
    if (facilityDetails) vendor.facilityDetails = facilityDetails;
    
    await vendor.save();
    
    res.status(200).json({ message: 'Vendor profile updated successfully', vendor });
  } catch (error) {
    console.error('Error updating vendor profile:', error);
    res.status(500).json({ message: 'Failed to update vendor profile', error: error.message });
  }
};

// Upload profile image
const uploadProfileImage = async (req, res) => {
  try {
    const vendorId = req.user._id;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }
    
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // If vendor already has a profile image, delete it from Cloudinary
    if (vendor.profileImageUrl) {
      const publicId = vendor.profileImageUrl.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    }
    
    // Update profile image URL
    vendor.profileImageUrl = req.file.path;
    await vendor.save();
    
    res.status(200).json({
      message: 'Profile image uploaded successfully',
      profileImageUrl: vendor.profileImageUrl
    });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    res.status(500).json({ message: 'Failed to upload profile image', error: error.message });
  }
};

// Update service types
const updateServiceTypes = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { serviceTypes } = req.body;
    
    if (!serviceTypes || !Array.isArray(serviceTypes)) {
      return res.status(400).json({ message: 'Service types must be provided as an array' });
    }
    
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    vendor.serviceTypes = serviceTypes;
    await vendor.save();
    
    res.status(200).json({ message: 'Service types updated successfully', serviceTypes: vendor.serviceTypes });
  } catch (error) {
    console.error('Error updating service types:', error);
    res.status(500).json({ message: 'Failed to update service types', error: error.message });
  }
};

// Add service
const addService = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { name, description, price, currency, durationMinutes, iconCode } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Service name is required' });
    }
    
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Add new service
    const newService = {
      id: `service_${Date.now()}`,
      name,
      description,
      price,
      currency: currency || 'USD',
      durationMinutes,
      iconCode
    };
    vendor.services.push(newService);
    
    await vendor.save();
    
    res.status(201).json({ message: 'Service added successfully', service: newService });
  } catch (error) {
    console.error('Error adding service:', error);
    res.status(500).json({ message: 'Failed to add service', error: error.message });
  }
};

// Update service
const updateService = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { serviceId } = req.params;
    const { name, description, price, currency, durationMinutes, iconCode } = req.body;
    
    if (!serviceId) {
      return res.status(400).json({ message: 'Service ID is required' });
    }
    
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Find the service
    const serviceIndex = vendor.services.findIndex(service => service.id === serviceId);
    if (serviceIndex === -1) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    // Update service fields
    if (name) vendor.services[serviceIndex].name = name;
    if (description !== undefined) vendor.services[serviceIndex].description = description;
    if (price !== undefined) vendor.services[serviceIndex].price = price;
    if (currency) vendor.services[serviceIndex].currency = currency;
    if (durationMinutes !== undefined) vendor.services[serviceIndex].durationMinutes = durationMinutes;
    if (iconCode !== undefined) vendor.services[serviceIndex].iconCode = iconCode;
    
    await vendor.save();
    
    res.status(200).json({ message: 'Service updated successfully', service: vendor.services[serviceIndex] });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ message: 'Failed to update service', error: error.message });
  }
};

// Delete a service
const deleteService = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { serviceId } = req.params;
    
    if (!serviceId) {
      return res.status(400).json({ message: 'Service ID is required' });
    }
    
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Remove the service
    vendor.services = vendor.services.filter(service => service.id !== serviceId);
    await vendor.save();
    
    res.status(200).json({ message: 'Service deleted successfully', services: vendor.services });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ message: 'Failed to delete service', error: error.message });
  }
};

// Add image
const addImage = async (req, res) => {
  try {
    const vendorId = req.user._id;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }
    
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Add new image URL
    vendor.images.push(req.file.path);
    await vendor.save();
    
    res.status(201).json({
      message: 'Image added successfully',
      imageUrl: req.file.path
    });
  } catch (error) {
    console.error('Error adding image:', error);
    res.status(500).json({ message: 'Failed to add image', error: error.message });
  }
};

// Delete an image
const deleteImage = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { imageId } = req.params;
    
    if (!imageId) {
      return res.status(400).json({ message: 'Image ID is required' });
    }
    
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Find the image URL
    const imageUrl = vendor.images[imageId];
    if (!imageUrl) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    // Remove the image from the array
    vendor.images.splice(imageId, 1);
    
    // Delete from Cloudinary
    const publicId = imageUrl.split('/').pop().split('.')[0];
    await cloudinary.uploader.destroy(publicId);
    
    await vendor.save();
    
    res.status(200).json({
      message: 'Image deleted successfully',
      images: vendor.images
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ message: 'Failed to delete image', error: error.message });
  }
};

// Update availability
const updateAvailability = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { workingDays } = req.body;
    
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Initialize availability object if it doesn't exist
    if (!vendor.availability) {
      vendor.availability = {};
    }
    
    // Update working days
    vendor.availability.workingDays = workingDays;
    await vendor.save();
    
    res.status(200).json({
      message: 'Availability updated successfully',
      availability: vendor.availability
    });
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({ message: 'Failed to update availability', error: error.message });
  }
};

// Import the utility function
const { mapGooglePlaceToAddress } = require('../utils/addressUtil');

// Add address
const addAddress = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { name, addressLine1, addressLine2, city, state, postalCode, country, isDefault, placeData } = req.body;
    
    const vendor = await Vendor.findById(vendorId);
    
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    let newAddress;
    
    // If Google Places data is provided, use it
    if (placeData) {
      newAddress = mapGooglePlaceToAddress(placeData, name || 'Service Location');
      if (isDefault !== undefined) {
        newAddress.isDefault = isDefault;
      }
    } else {
      // Otherwise use the manually entered address
      newAddress = {
        id: new mongoose.Types.ObjectId().toString(),
        name,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
        isDefault: isDefault || false
      };
    }
    
    // If this address is set as default, unset any existing default
    if (newAddress.isDefault) {
      vendor.addresses.forEach(addr => {
        addr.isDefault = false;
      });
    }
    
    // If no addresses exist yet, make this one default
    if (vendor.addresses.length === 0) {
      newAddress.isDefault = true;
    }
    
    vendor.addresses.push(newAddress);
    await vendor.save();
    
    res.status(201).json({
      message: 'Address added successfully',
      address: newAddress
    });
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ message: 'Failed to add address', error: error.message });
  }
};

// Update address
const updateAddress = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { addressId } = req.params;
    const { name, addressLine1, addressLine2, city, state, postalCode, country, isDefault } = req.body;
    
    if (!addressId) {
      return res.status(400).json({ message: 'Address ID is required' });
    }
    
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Find the address
    const addressIndex = vendor.addresses.findIndex(addr => addr.id === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({ message: 'Address not found' });
    }
    
    // Update address fields
    if (name) vendor.addresses[addressIndex].name = name;
    if (addressLine1) vendor.addresses[addressIndex].addressLine1 = addressLine1;
    if (addressLine2 !== undefined) vendor.addresses[addressIndex].addressLine2 = addressLine2;
    if (city) vendor.addresses[addressIndex].city = city;
    if (state) vendor.addresses[addressIndex].state = state;
    if (postalCode) vendor.addresses[addressIndex].postalCode = postalCode;
    if (country) vendor.addresses[addressIndex].country = country;
    
    // Handle default address logic
    if (isDefault !== undefined) {
      if (isDefault) {
        // Unset any existing default
        vendor.addresses.forEach((addr, idx) => {
          if (idx !== addressIndex) {
            addr.isDefault = false;
          }
        });
        vendor.addresses[addressIndex].isDefault = true;
      } else {
        // Only allow unsetting default if there's another address to make default
        if (vendor.addresses.length > 1) {
          vendor.addresses[addressIndex].isDefault = false;
          
          // Make sure at least one address is default
          const hasDefault = vendor.addresses.some(addr => addr.isDefault);
          if (!hasDefault) {
            // Make the first non-current address default
            const newDefaultIndex = vendor.addresses.findIndex((addr, idx) => idx !== addressIndex);
            if (newDefaultIndex !== -1) {
              vendor.addresses[newDefaultIndex].isDefault = true;
            }
          }
        }
      }
    }
    
    await vendor.save();
    
    res.status(200).json({
      message: 'Address updated successfully',
      address: vendor.addresses[addressIndex]
    });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ message: 'Failed to update address', error: error.message });
  }
};

// Delete address
const deleteAddress = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { addressId } = req.params;
    
    if (!addressId) {
      return res.status(400).json({ message: 'Address ID is required' });
    }
    
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Find the address
    const addressIndex = vendor.addresses.findIndex(addr => addr.id === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({ message: 'Address not found' });
    }
    
    // Check if this is the default address
    const isDefault = vendor.addresses[addressIndex].isDefault;
    
    // Remove the address
    vendor.addresses.splice(addressIndex, 1);
    
    // If the deleted address was the default and there are other addresses,
    // make the first one the new default
    if (isDefault && vendor.addresses.length > 0) {
      vendor.addresses[0].isDefault = true;
    }
    
    await vendor.save();
    
    res.status(200).json({
      message: 'Address deleted successfully',
      addresses: vendor.addresses
    });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ message: 'Failed to delete address', error: error.message });
  }
};

// Add payment method
const addPaymentMethod = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { type, name, lastFourDigits, expiryDate, isDefault } = req.body;
    
    if (!type || !name) {
      return res.status(400).json({ message: 'Payment method type and name are required' });
    }
    
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Create new payment method
    const newPaymentMethod = {
      id: `pm_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      name,
      lastFourDigits: lastFourDigits || '',
      expiryDate: expiryDate || '',
      isDefault: isDefault || false
    };
    
    // If this payment method is set as default, unset any existing default
    if (newPaymentMethod.isDefault) {
      vendor.paymentMethods.forEach(method => {
        method.isDefault = false;
      });
    }
    
    // If no payment methods exist yet, make this one default
    if (vendor.paymentMethods.length === 0) {
      newPaymentMethod.isDefault = true;
    }
    
    vendor.paymentMethods.push(newPaymentMethod);
    await vendor.save();
    
    res.status(201).json({
      message: 'Payment method added successfully',
      paymentMethod: newPaymentMethod
    });
  } catch (error) {
    console.error('Error adding payment method:', error);
    res.status(500).json({ message: 'Failed to add payment method', error: error.message });
  }
};

// Get nearby vendors based on latitude and longitude
const getNearbyVendors = async (req, res) => {
  try {
    const { latitude, longitude, radius = 10, limit = 20, serviceType, page = 1 } = req.query;
    
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
    
    // Build query for active vendors
    let query = {
      role: 'vendor',
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null }
    };
    
    // Add service type filter if provided
    if (serviceType && serviceType !== 'all') {
      query.serviceTypes = { $in: [new RegExp(serviceType, 'i')] };
    }
    
    // Find vendors with geospatial query
    const vendors = await Vendor.aggregate([
      {
        $match: query
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
                        { $sin: { $multiply: [{ $divide: ['$latitude', 180] }, Math.PI] } }
                      ]
                    },
                    {
                      $multiply: [
                        { $cos: { $multiply: [{ $divide: [lat, 180] }, Math.PI] } },
                        { $cos: { $multiply: [{ $divide: ['$latitude', 180] }, Math.PI] } },
                        { $cos: { $multiply: [{ $divide: [{ $subtract: ['$longitude', lng] }, 180] }, Math.PI] } }
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
          latitude: { $ne: null },
          longitude: { $ne: null }
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
          phone_number: '$mobileNumber',
          user_type: '$role',
          rating: { $ifNull: ['$rating', 0] },
          review_count: { $ifNull: ['$reviewCount', 0] },
          address: 1,
          city: 1,
          state: 1,
          postal_code: '$postalCode',
          latitude: 1,
          longitude: 1,
          website: 1,
          service_types: '$serviceTypes',
          services: 1,
          images: 1,
          is_available_now: '$isAvailableNow',
          available_slots: '$availableSlots',
          distance: { $round: ['$distance', 2] },
          created_at: '$createdAt',
          updated_at: '$updatedAt'
        }
      }
    ]);
    
    // Get total count
    const totalCount = await Vendor.aggregate([
      { $match: query },
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
                        { $sin: { $multiply: [{ $divide: ['$latitude', 180] }, Math.PI] } }
                      ]
                    },
                    {
                      $multiply: [
                        { $cos: { $multiply: [{ $divide: [lat, 180] }, Math.PI] } },
                        { $cos: { $multiply: [{ $divide: ['$latitude', 180] }, Math.PI] } },
                        { $cos: { $multiply: [{ $divide: [{ $subtract: ['$longitude', lng] }, 180] }, Math.PI] } }
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
          latitude: { $ne: null },
          longitude: { $ne: null }
        }
      },
      { $count: 'total' }
    ]);
    
    const total = totalCount.length > 0 ? totalCount[0].total : 0;
    
    res.status(200).json({
      success: true,
      data: {
        vendors,
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
          serviceType: serviceType || 'all'
        }
      }
    });
    
  } catch (error) {
    console.error('Get nearby vendors error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get nearby vendors', 
      error: error.message 
    });
  }
};

module.exports = {
  getVendorProfile,
  updateVendorProfile,
  uploadProfileImage,
  updateServiceTypes,
  addService,
  updateService,
  deleteService,
  addImage,
  deleteImage,
  updateAvailability,
  addAddress,
  updateAddress,
  deleteAddress,
  addPaymentMethod,
  getNearbyVendors,
};