const express = require('express');
const { 
  getDoctorEarnings, 
  requestPayout, 
  getPayoutHistory,
  updateBankDetails 
} = require('../controllers/transactionController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.get('/earnings', auth, getDoctorEarnings);
router.post('/payout/request', auth, requestPayout);
router.get('/payout/history', auth, getPayoutHistory);
router.put('/bank-details', auth, updateBankDetails);

module.exports = router;