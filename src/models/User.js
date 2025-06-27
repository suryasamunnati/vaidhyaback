const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Base user schema with common fields
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  mobileNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\d{10}$/.test(v);
      },
      message: props => `${props.value} is not a valid 10-digit mobile number!`
    }
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^\S+@\S+\.\S+$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  password: {
    type: String,
    required: function() {
      // Only require password during creation or when explicitly updating password
      return this.isNew || this.isModified('password');
    },
    minlength: 6
  },
  // Add common address fields to base schema
  address: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  postalCode: {
    type: String,
    trim: true
  },
  latitude: {
    type: Number
  },
  longitude: {
    type: Number
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['customer', 'doctor', 'hospital', 'vendor', 'admin'],
    required: true
  },
  preferredLanguage: {
    type: String,
    default: 'english'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  discriminatorKey: 'userType',
  timestamps: true
});

// Add password hashing middleware BEFORE creating the model
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Add a method to check password BEFORE creating the model
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Create the User model AFTER defining schema methods
const User = mongoose.model('User', userSchema);

// Customer model with extended fields
const Customer = User.discriminator('Customer', new mongoose.Schema({
  profileImageUrl: {
    type: String,
    trim: true
  },
  medicalRecords: [{
    title: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    date: {
      type: Date,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    doctorName: {
      type: String
    },
    hospitalName: {
      type: String
    }
  }],
  medications: [{
    name: {
      type: String,
      required: true
    },
    dosage: {
      type: String,
      required: true
    },
    frequency: {
      type: String,
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date
    },
    prescribedBy: {
      type: String
    }
  }],
  vitals: [{
    name: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    },
    unit: {
      type: String
    },
    recordedAt: {
      type: Date,
      default: Date.now
    }
  }],
  familyMembers: [{
    name: {
      type: String,
      required: true
    },
    relationship: {
      type: String,
      required: true
    },
    dateOfBirth: {
      type: Date
    },
    phoneNumber: {
      type: String
    },
    bloodGroup: {
      type: String
    },
    allergies: [{
      type: String
    }]
  }],

  paymentMethods: [{
    type: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    lastFourDigits: {
      type: String
    },
    expiryDate: {
      type: String
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  settings: {
    notificationsEnabled: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'English'
    },
    darkModeEnabled: {
      type: Boolean,
      default: false
    },
    locationTrackingEnabled: {
      type: Boolean,
      default: true
    }
  }
}));

// Doctor model
// Doctor discriminator
const Doctor = User.discriminator('Doctor', new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['Ayurvedic', 'Homeopathy', 'Doctors/Physician', 'Naturopathy', 'Unani', 'Alopathy', 'Baby Care', 'Veterinary']
  },
  specialty: {
    type: String,
    required: true
  },

  specialtyTags: {
    type: [String],
    validate: {
      validator: function(v) {
        return v.length <= 3; // Maximum 3 specialties
      },
      message: 'Doctor can select up to 3 specialties only'
    }
  },
  profilePhoto: {
    type: String, // URL to the stored image
  },

  qualifications: {
    type: [String],
    // removed required: true
  },
  yearsOfExperience: {
    type: Number,
    // removed required: true
    min: 0
  },
  // New fields based on JSON structure
  about: {
    type: String,
    trim: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  languages: [{
    type: String,
    trim: true
  }],
  specializations: [{
    type: String,
    trim: true
  }],
  // Replace this:
  services: [{
    type: String,
    trim: true
  }],
  
  // With this:
  // Replace the services field with this updated version
  services: [{
    id: {
      type: String,
      required: true
    },
    
    serviceType: {
      type: String,
      required: true,
      enum: ['Clinical Visit', 'Home Visit', 'Video Consultation', 'Voice Consultation']
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    isCommissionInclusive: {
      type: Boolean,
      default: false
    },
    commissionPercentage: {
      type: Number,
      default: 10
    },
    currency: {
      type: String,
      default: 'INR'
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 5
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date
    }
  }],
  education: [{
    degree: {
      type: String,
      required: true,
      trim: true
    },
    institution: {
      type: String,
      required: true,
      trim: true
    },
    year: {
      type: String,
      trim: true
    }
  }],
  experience: [{
    position: {
      type: String,
      required: true,
      trim: true
    },
    organization: {
      type: String,
      required: true,
      trim: true
    },
    startYear: {
      type: String,
      required: true
    },
    endYear: {
      type: String
    },
    description: {
      type: String,
      trim: true
    }
  }],
  awards: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    organization: {
      type: String,
      required: true,
      trim: true
    },
    year: {
      type: String
    }
  }],

  consultationTypes: [{
    type: {
      type: String,
      required: true,
      enum: ['Video', 'Audio', 'In-person', 'Chat']
    },
    fee: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 5
    },
    iconCode: {
      type: Number
    }
  }],
  isAvailableNow: {
    type: Boolean,
    default: false
  },
  addresses: [{
    name: {
      type: String,
      required: true
    },
    addressLine1: {
      type: String,
      required: true
    },
    addressLine2: {
      type: String
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    postalCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    },
    latitude: {
      type: Number
    },
    longitude: {
      type: Number
    },
    placeId: {
      type: String
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  settings: {
    notificationsEnabled: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'English'
    },
    darkModeEnabled: {
      type: Boolean,
      default: false
    },
    locationTrackingEnabled: {
      type: Boolean,
      default: true
    }
  },
  clinicHospitalAffiliation: {
    type: String
  },
  consultationFees: {
    video: {
      type: Number,
      default: 0
    },
    audio: {
      type: Number,
      default: 0
    },
    inPerson: {
      type: Number,
      default: 0
    },
    chat: {
      type: Number,
      default: 0
    },
    isCommissionInclusive: {
      type: Boolean,
      default: false
    }
  },
  availability: {
    workingDays: [{
      day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      isAvailable: {
        type: Boolean,
        default: true
      },
      slots: [{
        startTime: String, // Format: "HH:MM" (24-hour format)
        endTime: String,   // Format: "HH:MM" (24-hour format)
        isBooked: {
          type: Boolean,
          default: false
        }
      }]
    }],
    unavailablePeriods: [{
      startDate: Date,
      endDate: Date,
      reason: String
    }]
  },
  subscriptionActive: {
    type: Boolean,
    default: false
  },
  subscriptionExpiry: {
    type: Date
  },
  bankDetails: {
    accountNumber: {
      type: String,
      trim: true
    },
    ifscCode: {
      type: String,
      trim: true
    },
    accountHolderName: {
      type: String,
      trim: true
    },
    verified: {
      type: Boolean,
      default: false
    }
  }
}));

// Hospital/Vendor model
const Hospital = User.discriminator('Hospital', new mongoose.Schema({
  facilityDetails: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  // REMOVE: address, city, state, postalCode, latitude, longitude (now in base schema)
  // REMOVE: addresses array (now in base schema)
  website: {
    type: String,
    trim: true
  },
  bedCount: {
    type: Number,
    min: 0
  },
  doctorCount: {
    type: Number,
    min: 0
  },
  facilities: [{
    type: String,
    trim: true
  }],
  services: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    minPrice: {
      type: Number,
      min: 0
    },
    maxPrice: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    iconCode: {
      type: Number
    }
  }],
  specialties: [{
    type: String,
    trim: true
  }],
  insuranceAccepted: [{
    type: String,
    trim: true
  }],
  images: [{
    type: String,
    trim: true
  }],
  isOpen24x7: {
    type: Boolean,
    default: false
  },
  doctorIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  }],

  paymentMethods: [{
    type: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    lastFourDigits: {
      type: String
    },
    expiryDate: {
      type: String
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  settings: {
    notificationsEnabled: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'English'
    },
    darkModeEnabled: {
      type: Boolean,
      default: false
    },
    locationTrackingEnabled: {
      type: Boolean,
      default: true
    }
  },
  subscriptionActive: {
    type: Boolean,
    default: false
  },
  subscriptionExpiry: {
    type: Date
  },
  profilePhoto: {
    type: String // URL to the stored image
  }
}));

// Vendor model
const Vendor = User.discriminator('Vendor', new mongoose.Schema({
  facilityDetails: {
    type: String,
    required: true
  },

  profileImageUrl: {
    type: String,
    trim: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },

  website: {
    type: String,
    trim: true
  },
  serviceTypes: [{
    type: String,
    trim: true
  }],
  services: [{
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    price: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    durationMinutes: {
      type: Number
    },
    iconCode: {
      type: Number
    }
  }],
  images: [{
    type: String,
    trim: true
  }],
  isAvailableNow: {
    type: Boolean,
    default: false
  },
  availableSlots: [{
    id: {
      type: String,
      required: true
    },
    dateTime: {
      type: Date,
      required: true
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  }],

  paymentMethods: [{
    id: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    lastFourDigits: {
      type: String
    },
    expiryDate: {
      type: String
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  settings: {
    notificationsEnabled: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'English'
    },
    darkModeEnabled: {
      type: Boolean,
      default: false
    },
    locationTrackingEnabled: {
      type: Boolean,
      default: true
    }
  },
  subscriptionActive: {
    type: Boolean,
    default: false
  },
  subscriptionExpiry: {
    type: Date
  }
}));

module.exports = { User, Customer, Doctor, Hospital, Vendor };
