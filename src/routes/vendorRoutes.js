const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requireSubscription } = require('../middleware/subscriptionMiddleware');
const { cloudinary, upload } = require('../utils/cloudinaryConfig');
const {
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
  addPaymentMethod
} = require('../controllers/vendorController');

// Get vendor profile
router.get('/profile/:id', auth, getVendorProfile);

// Update vendor profile - requires subscription
router.put('/profile', auth, requireSubscription, updateVendorProfile);

// Upload profile image - requires subscription
router.post('/profile/image', auth, requireSubscription, upload.single('image'), uploadProfileImage);

// Update service types - requires subscription
router.put('/service-types', auth, requireSubscription, updateServiceTypes);

// Add service - requires subscription
router.post('/services', auth, requireSubscription, addService);

// Update service - requires subscription
router.put('/services/:id', auth, requireSubscription, updateService);

// Delete service - requires subscription
router.delete('/services/:id', auth, requireSubscription, deleteService);

// Add image - requires subscription
router.post('/images', auth, requireSubscription, upload.single('image'), addImage);

// Delete image - requires subscription
router.delete('/images/:id', auth, requireSubscription, deleteImage);

// Update availability - requires subscription
router.put('/availability', auth, requireSubscription, updateAvailability);

// Add address - requires subscription
router.post('/addresses', auth, requireSubscription, addAddress);

// Update address - requires subscription
router.put('/addresses/:id', auth, requireSubscription, updateAddress);

// Delete address - requires subscription
router.delete('/addresses/:id', auth, requireSubscription, deleteAddress);

// Add payment method - requires subscription
router.post('/payment-methods', auth, requireSubscription, addPaymentMethod);

module.exports = router;