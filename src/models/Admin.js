const mongoose = require('mongoose');
const { User } = require('./User');

// Admin model - extends the base User model
const Admin = User.discriminator('Admin', new mongoose.Schema({
  permissions: {
    manageUsers: {
      type: Boolean,
      default: true
    },
    manageSubscriptions: {
      type: Boolean,
      default: true
    },
    managePayments: {
      type: Boolean,
      default: true
    },
    manageContent: {
      type: Boolean,
      default: true
    },
    viewAnalytics: {
      type: Boolean,
      default: true
    },
    superAdmin: {
      type: Boolean,
      default: false
    }
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  adminLevel: {
    type: String,
    enum: ['junior', 'senior', 'super'],
    default: 'junior'
  }
}, {
  timestamps: true
}));

module.exports = { Admin };