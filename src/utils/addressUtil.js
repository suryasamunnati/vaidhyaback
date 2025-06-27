const { v4: uuidv4 } = require('uuid');

/**
 * Maps Google Places API data to our address schema format
 * @param {Object} placeData - The Google Places API data
 * @param {String} addressName - Name for the address (default: 'Main Address')
 * @returns {Object} - Formatted address object
 */
const mapGooglePlaceToAddress = (placeData, addressName = 'Main Address') => {
  // Extract address components
  const streetNumber = placeData.street_number || '';
  const route = placeData.route || '';
  
  return {
    id: uuidv4(), // Generate unique ID for the address
    name: addressName,
    addressLine1: streetNumber && route ? `${streetNumber}, ${route}` : placeData.name,
    addressLine2: '',  // Can be filled manually if needed
    city: placeData.city || '',
    state: placeData.state || '',
    postalCode: placeData.postal_code || '',
    country: placeData.country || '',
    latitude: placeData.latitude,
    longitude: placeData.longitude,
    placeId: placeData.place_id,
    isDefault: true  // Set as default if it's the first address
  };
};

module.exports = {
  mapGooglePlaceToAddress
};