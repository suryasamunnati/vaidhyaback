const express = require('express');
const { 
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
} = require('../controllers/doctorController');
const { auth } = require('../middleware/auth');
const { upload } = require('../utils/cloudinaryConfig');

const router = express.Router();

// Get doctor profile
router.get('/profile', auth, getDoctorProfile);
router.get('/profile/:id', getDoctorProfile); // Public endpoint to get doctor by ID

// Doctor profile routes (all protected)
router.put('/profile', auth, updateDoctorProfile);
router.put('/availability', auth, updateAvailability);
router.post('/unavailable-period', auth, addUnavailablePeriod);

// New routes for enhanced doctor profile
router.put('/education', auth, updateEducation);
router.put('/experience', auth, updateExperience);
router.put('/awards', auth, updateAwards);
router.put('/clinics', auth, updateClinics);
router.put('/consultation-types', auth, updateConsultationTypes);
router.put('/settings', auth, updateSettings);
router.put('/addresses', auth, updateAddresses);

// File upload route
router.post('/upload-photo', auth, upload.single('profilePhoto'), uploadProfilePhoto);

// Doctor dashboard statistics
router.get('/dashboard-stats', auth, getDoctorDashboardStats);

// New service-related routes
router.get('/services', auth, getDoctorServices);
router.get('/services/:serviceId', auth, getDoctorServiceById);
router.post('/services', auth, addDoctorService);
router.put('/services/:serviceId', auth, updateDoctorService);
router.delete('/services/:serviceId', auth, deleteDoctorService);
router.patch('/services/:serviceId/status', auth, updateDoctorServiceStatus);
router.get('/service-overview', auth, getDoctorServiceOverview);

// Public route for nearby doctors
router.get('/nearby', getNearbyDoctors);
// Add this to the existing routes
router.get('/availability/:doctorId', getDoctorAvailableSlots); // Public endpoint for customers
module.exports = router;