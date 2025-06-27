const { User } = require('../models/User');

const requireSubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Customers don't need a subscription
    if (user.role === 'customer') {
      return next();
    }
    
    // Check if subscription is active and not expired
    if (!user.subscriptionActive || new Date(user.subscriptionExpiry) <= new Date()) {
      return res.status(403).json({
        message: 'Active subscription required to access this feature',
        requiresPayment: true
      });
    }
    
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ message: 'Failed to verify subscription', error: error.message });
  }
};

module.exports = { requireSubscription };