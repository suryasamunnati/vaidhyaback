const { Customer } = require('../models/User');

// Get customer profile with all details
const getCustomerProfile = async (req, res) => {
  try {
    const customerId = req.user._id;
    
    const customer = await Customer.findById(customerId).select('-__v');
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    res.status(200).json({
      id: customer._id,
      name: customer.name,
      email: customer.email,
      phone_number: customer.mobileNumber,
      profile_image_url: customer.profileImageUrl,
      created_at: customer.createdAt,
      updated_at: customer.updatedAt,
      user_type: 'consumer',
      medical_records: customer.medicalRecords,
      medications: customer.medications,
      vitals: customer.vitals,
      family_members: customer.familyMembers,
      addresses: customer.addresses,
      payment_methods: customer.paymentMethods,
      settings: customer.settings
    });
  } catch (error) {
    console.error('Error fetching customer profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update customer profile
const updateCustomerProfile = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { name, email, profileImageUrl, settings } = req.body;
    
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    // Update basic info
    if (name) customer.name = name;
    if (email) customer.email = email;
    if (profileImageUrl) customer.profileImageUrl = profileImageUrl;
    if (settings) customer.settings = { ...customer.settings, ...settings };
    
    await customer.save();
    
    res.status(200).json({
      message: 'Profile updated successfully',
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone_number: customer.mobileNumber,
        profile_image_url: customer.profileImageUrl,
        settings: customer.settings
      }
    });
  } catch (error) {
    console.error('Error updating customer profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Medical Records Management
const addMedicalRecord = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { title, description, date, fileUrl, doctorName, hospitalName } = req.body;
    
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    customer.medicalRecords.push({
      title,
      description,
      date,
      fileUrl,
      doctorName,
      hospitalName
    });
    
    await customer.save();
    
    res.status(201).json({
      message: 'Medical record added successfully',
      medicalRecord: customer.medicalRecords[customer.medicalRecords.length - 1]
    });
  } catch (error) {
    console.error('Error adding medical record:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateMedicalRecord = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { recordId, title, description, date, fileUrl, doctorName, hospitalName } = req.body;
    
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    const recordIndex = customer.medicalRecords.findIndex(record => record._id.toString() === recordId);
    
    if (recordIndex === -1) {
      return res.status(404).json({ message: 'Medical record not found' });
    }
    
    if (title) customer.medicalRecords[recordIndex].title = title;
    if (description) customer.medicalRecords[recordIndex].description = description;
    if (date) customer.medicalRecords[recordIndex].date = date;
    if (fileUrl) customer.medicalRecords[recordIndex].fileUrl = fileUrl;
    if (doctorName) customer.medicalRecords[recordIndex].doctorName = doctorName;
    if (hospitalName) customer.medicalRecords[recordIndex].hospitalName = hospitalName;
    
    await customer.save();
    
    res.status(200).json({
      message: 'Medical record updated successfully',
      medicalRecord: customer.medicalRecords[recordIndex]
    });
  } catch (error) {
    console.error('Error updating medical record:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteMedicalRecord = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { recordId } = req.params;
    
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    const recordIndex = customer.medicalRecords.findIndex(record => record._id.toString() === recordId);
    
    if (recordIndex === -1) {
      return res.status(404).json({ message: 'Medical record not found' });
    }
    
    customer.medicalRecords.splice(recordIndex, 1);
    await customer.save();
    
    res.status(200).json({ message: 'Medical record deleted successfully' });
  } catch (error) {
    console.error('Error deleting medical record:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Similar functions for medications, vitals, family members, addresses, and payment methods
// For brevity, I'm not including all of them, but they would follow the same pattern

// Medications Management
const addMedication = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { name, dosage, frequency, startDate, endDate, prescribedBy, notes } = req.body;
    
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    customer.medications.push({
      name,
      dosage,
      frequency,
      startDate,
      endDate,
      prescribedBy,
      notes
    });
    
    await customer.save();
    
    res.status(201).json({
      message: 'Medication added successfully',
      medication: customer.medications[customer.medications.length - 1]
    });
  } catch (error) {
    console.error('Error adding medication:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateMedication = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { medicationId, name, dosage, frequency, startDate, endDate, prescribedBy, notes } = req.body;
    
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    const medicationIndex = customer.medications.findIndex(med => med._id.toString() === medicationId);
    
    if (medicationIndex === -1) {
      return res.status(404).json({ message: 'Medication not found' });
    }
    
    if (name) customer.medications[medicationIndex].name = name;
    if (dosage) customer.medications[medicationIndex].dosage = dosage;
    if (frequency) customer.medications[medicationIndex].frequency = frequency;
    if (startDate) customer.medications[medicationIndex].startDate = startDate;
    if (endDate) customer.medications[medicationIndex].endDate = endDate;
    if (prescribedBy) customer.medications[medicationIndex].prescribedBy = prescribedBy;
    if (notes) customer.medications[medicationIndex].notes = notes;
    
    await customer.save();
    
    res.status(200).json({
      message: 'Medication updated successfully',
      medication: customer.medications[medicationIndex]
    });
  } catch (error) {
    console.error('Error updating medication:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteMedication = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { medicationId } = req.params;
    
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    const medicationIndex = customer.medications.findIndex(med => med._id.toString() === medicationId);
    
    if (medicationIndex === -1) {
      return res.status(404).json({ message: 'Medication not found' });
    }
    
    customer.medications.splice(medicationIndex, 1);
    await customer.save();
    
    res.status(200).json({ message: 'Medication deleted successfully' });
  } catch (error) {
    console.error('Error deleting medication:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Vitals Management
const addVital = async (req, res) => {
  // Similar implementation
};

// Family Members Management
const addFamilyMember = async (req, res) => {
  // Similar implementation
};

// Addresses Management
const addAddress = async (req, res) => {
  // Similar implementation
};

// Payment Methods Management
const addPaymentMethod = async (req, res) => {
  // Similar implementation
};

module.exports = {
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
  addPaymentMethod
};