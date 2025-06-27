const express = require('express');
const { initializeCall, startCall, endCall } = require('../controllers/videoCallController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Video call routes (all protected)
router.post('/initialize', auth, initializeCall);
router.post('/start', auth, startCall);
router.post('/end', auth, endCall);

module.exports = router;