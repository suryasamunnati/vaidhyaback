const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  // Common fields for all appointment types
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  type: {
    type: String,
    enum: ['doctor', 'hospital', 'service'],
    required: true
  },
  // Optional references based on appointment type
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital'
  },
  serviceVendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  dateTime: {
    type: Date,
    required: true
  },
  consultationType: {
    type: String,
    enum: ['video', 'audio', 'in-person', 'homeVisit', null],
    default: null
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'upcoming', 'confirmed', 'rejected', 'completed', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String
  },
  paymentId: {
    type: String
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  bookedAt: {
    type: Date,
    default: Date.now
  },
  cancelledAt: {
    type: Date
  },
  cancellationReason: {
    type: String
  },
  // Doctor appointment specific fields
  specialty: {
    type: String
  },
  clinicName: {
    type: String
  },
  clinicAddress: {
    type: String
  },
  // Hospital appointment specific fields
  department: {
    type: String
  },
  service: {
    type: String
  },
  hospitalAddress: {
    type: String
  },
  // Service appointment specific fields
  serviceType: {
    type: String
  },
  serviceName: {
    type: String
  },
  vendorAddress: {
    type: String
  },
  // Call details for video/audio appointments
  callDetails: {
    channelName: String,
    customerToken: String,
    doctorToken: String, // Changed from providerToken to doctorToken
    callStarted: {
      type: Boolean,
      default: false
    },
    callStartTime: Date,
    callEndTime: Date,
    callDuration: Number // in seconds
  },
  // Patient details - ADD THESE FIELDS
  patientDetails: {
    name: {
      type: String,
      required: true
    },
    age: {
      type: Number
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other']
    },
    phone: {
      type: String
    },
    email: {
      type: String
    },
    relationshipToCustomer: {
      type: String,
      enum: ['self', 'spouse', 'child', 'parent', 'sibling', 'other'],
      default: 'self'
    },
    medicalHistory: {
      type: String
    },
    allergies: {
      type: String
    },
    currentMedications: {
      type: String
    }
  }
});

// Middleware to validate required fields based on appointment type
appointmentSchema.pre('validate', function(next) {
  if (this.type === 'doctor' && !this.doctor) {
    this.invalidate('doctor', 'Doctor is required for doctor appointments');
  } else if (this.type === 'hospital' && !this.hospital) {
    this.invalidate('hospital', 'Hospital is required for hospital appointments');
  } else if (this.type === 'service' && !this.serviceVendor) {
    this.invalidate('serviceVendor', 'Service vendor is required for service appointments');
  }
  next();
});

// Auto-confirm in-person appointments
appointmentSchema.pre('save', function(next) {
  if (this.isNew && this.consultationType === 'in-person') {
    this.status = 'confirmed';
  }
  next();
});

// Create a virtual for appointment ID in the format "appt_123"
appointmentSchema.virtual('appointmentId').get(function() {
  return `appt_${this._id.toString().substr(-6)}`;
});

// Ensure virtuals are included in JSON output
appointmentSchema.set('toJSON', { virtuals: true });
appointmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Appointment', appointmentSchema);