const express = require('express');
const { 
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
} = require('../controllers/hospitalController');
const { auth } = require('../middleware/auth');
const { upload } = require('../utils/cloudinaryConfig');

const router = express.Router();

// Get hospital profile
router.get('/profile', auth, getHospitalProfile);
router.get('/profile/:id', getHospitalProfile); // Public endpoint to get hospital by ID

// Hospital profile routes (all protected)
router.put('/profile', auth, updateHospitalProfile);
router.put('/facilities', auth, updateFacilities);
router.put('/services', auth, updateServices);
router.put('/specialties', auth, updateSpecialties);
router.put('/insurance', auth, updateInsuranceAccepted);
router.put('/images', auth, updateImages);
router.put('/addresses', auth, updateAddresses);
router.put('/payment-methods', auth, updatePaymentMethods);
router.put('/settings', auth, updateSettings);

// Doctor management routes
router.post('/doctors', auth, addDoctor);
router.delete('/doctors/:doctorId', auth, removeDoctor);

// File upload route
router.post('/upload-photo', auth, upload.single('profilePhoto'), uploadProfilePhoto);

// Import the function
const { getNearbyHospitals } = require('../controllers/hospitalController');

// Add the route
router.get('/nearby', getNearbyHospitals);
module.exports = router;