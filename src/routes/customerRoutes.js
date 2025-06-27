const express = require('express');
const { auth } = require('../middleware/auth');
const { 
  getCustomerProfile, 
  updateCustomerProfile,
  addMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
  addMedication,
  updateMedication,
  deleteMedication,
  addVital,
  addFamilyMember,
  addAddress,
  addPaymentMethod,
  // Import other functions
} = require('../controllers/customerController');

const router = express.Router();

// All routes are protected with auth middleware
router.use(auth);

// Profile routes
router.get('/profile', getCustomerProfile);
router.put('/profile', updateCustomerProfile);

// Medical records routes
router.post('/medical-records', addMedicalRecord);
router.put('/medical-records', updateMedicalRecord);
router.delete('/medical-records/:recordId', deleteMedicalRecord);

// Medications routes
router.post('/medications', addMedication);
router.put('/medications', updateMedication);
router.delete('/medications/:medicationId', deleteMedication);

// Vitals routes
router.post('/vitals', addVital);
// Add more routes for vitals

// Family members routes
router.post('/family-members', addFamilyMember);
// Add more routes for family members

// Addresses routes
router.post('/addresses', addAddress);
// Add more routes for addresses

// Payment methods routes
router.post('/payment-methods', addPaymentMethod);
// Add more routes for payment methods

module.exports = router;