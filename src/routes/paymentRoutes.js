const express = require('express');
const { createPaymentOrder, verifyPaymentAndActivate } = require('../controllers/paymentController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Payment routes
router.post('/create-order', auth, createPaymentOrder);
router.post('/verify', auth, verifyPaymentAndActivate);

module.exports = router;