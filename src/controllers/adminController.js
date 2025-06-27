const { User, Customer, Doctor, Hospital, Vendor } = require('../models/User');
const { Admin } = require('../models/Admin');
const Subscription = require('../models/Subscription');
const { Appointment } = require('../models/Appointment');

// Admin Profile Management

const getAdminProfile = async (req, res) => {
  try {
    const adminId = req.user._id;
    
    const admin = await Admin.findById(adminId).select('-__v');
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    res.status(200).json({
      id: admin._id,
      name: admin.name,
      email: admin.email,
      permissions: admin.permissions,
      adminLevel: admin.adminLevel,
      lastLogin: admin.lastLogin
    });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ message: 'Failed to get admin profile', error: error.message });
  }
};

const updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { name, email, mobileNumber } = req.body;
    
    const admin = await Admin.findById(adminId);
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    // Update admin profile
    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      {
        $set: {
          name: name || admin.name,
          email: email || admin.email,
          mobileNumber: mobileNumber || admin.mobileNumber,
          lastLogin: new Date()
        }
      },
      { new: true }
    );
    
    res.status(200).json({
      message: 'Admin profile updated successfully',
      admin: {
        id: updatedAdmin._id,
        name: updatedAdmin.name,
        email: updatedAdmin.email,
        mobileNumber: updatedAdmin.mobileNumber
      }
    });
  } catch (error) {
    console.error('Update admin profile error:', error);
    res.status(500).json({ message: 'Failed to update admin profile', error: error.message });
  }
};

// Admin Management (Super Admin only)

const getAllAdmins = async (req, res) => {
  try {
    // Check if the requesting admin is a super admin
    if (!req.user.permissions?.superAdmin) {
      return res.status(403).json({ message: 'Only super admins can view all admins' });
    }
    
    const admins = await Admin.find().select('name email adminLevel permissions lastLogin');
    
    res.status(200).json({
      count: admins.length,
      admins
    });
  } catch (error) {
    console.error('Get all admins error:', error);
    res.status(500).json({ message: 'Failed to get admins', error: error.message });
  }
};

const createAdmin = async (req, res) => {
  try {
    // Check if the requesting admin is a super admin
    if (!req.user.permissions?.superAdmin) {
      return res.status(403).json({ message: 'Only super admins can create new admins' });
    }
    
    const { name, email, password, mobileNumber, permissions, adminLevel } = req.body;
    
    // Check if admin with this email already exists
    const existingAdmin = await User.findOne({ email });
    
    if (existingAdmin) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Create new admin
    const newAdmin = new Admin({
      name,
      email,
      password, // This will be hashed by the User schema pre-save hook
      mobileNumber,
      role: 'admin',
      permissions: permissions || {},
      adminLevel: adminLevel || 'junior'
    });
    
    await newAdmin.save();
    
    res.status(201).json({
      message: 'Admin created successfully',
      admin: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        adminLevel: newAdmin.adminLevel
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ message: 'Failed to create admin', error: error.message });
  }
};

const updateAdminPermissions = async (req, res) => {
  try {
    // Check if the requesting admin is a super admin
    if (!req.user.permissions?.superAdmin) {
      return res.status(403).json({ message: 'Only super admins can update admin permissions' });
    }
    
    const adminId = req.params.id;
    const { permissions, adminLevel } = req.body;
    
    const admin = await Admin.findById(adminId);
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    // Update admin permissions
    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      {
        $set: {
          permissions: permissions || admin.permissions,
          adminLevel: adminLevel || admin.adminLevel
        }
      },
      { new: true }
    );
    
    res.status(200).json({
      message: 'Admin permissions updated successfully',
      admin: {
        id: updatedAdmin._id,
        name: updatedAdmin.name,
        permissions: updatedAdmin.permissions,
        adminLevel: updatedAdmin.adminLevel
      }
    });
  } catch (error) {
    console.error('Update admin permissions error:', error);
    res.status(500).json({ message: 'Failed to update admin permissions', error: error.message });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    // Check if the requesting admin is a super admin
    if (!req.user.permissions?.superAdmin) {
      return res.status(403).json({ message: 'Only super admins can delete admins' });
    }
    
    const adminId = req.params.id;
    
    // Prevent deleting yourself
    if (adminId === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own admin account' });
    }
    
    const admin = await Admin.findById(adminId);
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    await Admin.findByIdAndDelete(adminId);
    
    res.status(200).json({
      message: 'Admin deleted successfully'
    });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ message: 'Failed to delete admin', error: error.message });
  }
};

// User Management

const getAllUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 10, search } = req.query;
    
    const query = {};
    
    // Filter by role if provided
    if (role) {
      query.role = role;
    }
    
    // Search by name or email if provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get users with pagination
    const users = await User.find(query)
      .select('name email role mobileNumber createdAt subscriptionActive')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    // Get total count for pagination
    const totalUsers = await User.countDocuments(query);
    
    res.status(200).json({
      users,
      pagination: {
        total: totalUsers,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalUsers / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Failed to get users', error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId).select('-password -__v');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Failed to get user', error: error.message });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    const { status } = req.body;
    
    if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user status
    user.status = status;
    await user.save();
    
    res.status(200).json({
      message: 'User status updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Failed to update user status', error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete user
    await User.findByIdAndDelete(userId);
    
    res.status(200).json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
};

// Doctor Management

const getAllDoctors = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, specialty, status } = req.query;
    
    const query = { role: 'doctor' };
    
    // Search by name or email if provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by specialty if provided
    if (specialty) {
      query.specialty = specialty;
    }
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get doctors with pagination
    const doctors = await Doctor.find(query)
      .select('name email specialty specialtyTags medicalRegistrationNumber subscriptionActive')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    // Get total count for pagination
    const totalDoctors = await Doctor.countDocuments(query);
    
    res.status(200).json({
      doctors,
      pagination: {
        total: totalDoctors,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalDoctors / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all doctors error:', error);
    res.status(500).json({ message: 'Failed to get doctors', error: error.message });
  }
};

const approveDoctorProfile = async (req, res) => {
  try {
    const doctorId = req.params.id;
    
    const doctor = await Doctor.findById(doctorId);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Update doctor status to approved
    doctor.status = 'approved';
    await doctor.save();
    
    res.status(200).json({
      message: 'Doctor profile approved successfully',
      doctor: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        status: doctor.status
      }
    });
  } catch (error) {
    console.error('Approve doctor profile error:', error);
    res.status(500).json({ message: 'Failed to approve doctor profile', error: error.message });
  }
};

const rejectDoctorProfile = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const { reason } = req.body;
    
    const doctor = await Doctor.findById(doctorId);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Update doctor status to rejected
    doctor.status = 'rejected';
    doctor.rejectionReason = reason || 'Profile does not meet our requirements';
    await doctor.save();
    
    res.status(200).json({
      message: 'Doctor profile rejected',
      doctor: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        status: doctor.status,
        rejectionReason: doctor.rejectionReason
      }
    });
  } catch (error) {
    console.error('Reject doctor profile error:', error);
    res.status(500).json({ message: 'Failed to reject doctor profile', error: error.message });
  }
};

// Hospital Management

const getAllHospitals = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, type, city } = req.query;
    
    const query = { role: 'hospital' };
    
    // Search by name or email if provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by hospital type if provided
    if (type) {
      query.type = type;
    }
    
    // Filter by city if provided
    if (city) {
      query.city = city;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get hospitals with pagination
    const hospitals = await Hospital.find(query)
      .select('name email type city state subscriptionActive')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    // Get total count for pagination
    const totalHospitals = await Hospital.countDocuments(query);
    
    res.status(200).json({
      hospitals,
      pagination: {
        total: totalHospitals,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalHospitals / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all hospitals error:', error);
    res.status(500).json({ message: 'Failed to get hospitals', error: error.message });
  }
};

const approveHospitalProfile = async (req, res) => {
  try {
    const hospitalId = req.params.id;
    
    const hospital = await Hospital.findById(hospitalId);
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    
    // Update hospital status to approved
    hospital.status = 'approved';
    await hospital.save();
    
    res.status(200).json({
      message: 'Hospital profile approved successfully',
      hospital: {
        id: hospital._id,
        name: hospital.name,
        email: hospital.email,
        status: hospital.status
      }
    });
  } catch (error) {
    console.error('Approve hospital profile error:', error);
    res.status(500).json({ message: 'Failed to approve hospital profile', error: error.message });
  }
};

const rejectHospitalProfile = async (req, res) => {
  try {
    const hospitalId = req.params.id;
    const { reason } = req.body;
    
    const hospital = await Hospital.findById(hospitalId);
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    
    // Update hospital status to rejected
    hospital.status = 'rejected';
    hospital.rejectionReason = reason || 'Profile does not meet our requirements';
    await hospital.save();
    
    res.status(200).json({
      message: 'Hospital profile rejected',
      hospital: {
        id: hospital._id,
        name: hospital.name,
        email: hospital.email,
        status: hospital.status,
        rejectionReason: hospital.rejectionReason
      }
    });
  } catch (error) {
    console.error('Reject hospital profile error:', error);
    res.status(500).json({ message: 'Failed to reject hospital profile', error: error.message });
  }
};

// Vendor Management

const getAllVendors = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, serviceType, city } = req.query;
    
    const query = { role: 'vendor' };
    
    // Search by name or email if provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by service type if provided
    if (serviceType) {
      query.serviceTypes = serviceType;
    }
    
    // Filter by city if provided
    if (city) {
      query.city = city;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get vendors with pagination
    const vendors = await Vendor.find(query)
      .select('name email serviceTypes city state subscriptionActive')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    // Get total count for pagination
    const totalVendors = await Vendor.countDocuments(query);
    
    res.status(200).json({
      vendors,
      pagination: {
        total: totalVendors,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalVendors / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all vendors error:', error);
    res.status(500).json({ message: 'Failed to get vendors', error: error.message });
  }
};

const approveVendorProfile = async (req, res) => {
  try {
    const vendorId = req.params.id;
    
    const vendor = await Vendor.findById(vendorId);
    
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Update vendor status to approved
    vendor.status = 'approved';
    await vendor.save();
    
    res.status(200).json({
      message: 'Vendor profile approved successfully',
      vendor: {
        id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        status: vendor.status
      }
    });
  } catch (error) {
    console.error('Approve vendor profile error:', error);
    res.status(500).json({ message: 'Failed to approve vendor profile', error: error.message });
  }
};

const rejectVendorProfile = async (req, res) => {
  try {
    const vendorId = req.params.id;
    const { reason } = req.body;
    
    const vendor = await Vendor.findById(vendorId);
    
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Update vendor status to rejected
    vendor.status = 'rejected';
    vendor.rejectionReason = reason || 'Profile does not meet our requirements';
    await vendor.save();
    
    res.status(200).json({
      message: 'Vendor profile rejected',
      vendor: {
        id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        status: vendor.status,
        rejectionReason: vendor.rejectionReason
      }
    });
  } catch (error) {
    console.error('Reject vendor profile error:', error);
    res.status(500).json({ message: 'Failed to reject vendor profile', error: error.message });
  }
};

// Customer Management

const getAllCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    const query = { role: 'customer' };
    
    // Search by name or email if provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get customers with pagination
    const customers = await Customer.find(query)
      .select('name email mobileNumber createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    // Get total count for pagination
    const totalCustomers = await Customer.countDocuments(query);
    
    res.status(200).json({
      customers,
      pagination: {
        total: totalCustomers,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCustomers / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all customers error:', error);
    res.status(500).json({ message: 'Failed to get customers', error: error.message });
  }
};

// Subscription Management

const getAllSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const query = {};
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get subscriptions with pagination
    const subscriptions = await Subscription.find(query)
      .populate('userId', 'name email role')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    // Get total count for pagination
    const totalSubscriptions = await Subscription.countDocuments(query);
    
    res.status(200).json({
      subscriptions,
      pagination: {
        total: totalSubscriptions,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalSubscriptions / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all subscriptions error:', error);
    res.status(500).json({ message: 'Failed to get subscriptions', error: error.message });
  }
};

const getSubscriptionById = async (req, res) => {
  try {
    const subscriptionId = req.params.id;
    
    const subscription = await Subscription.findById(subscriptionId)
      .populate('userId', 'name email role');
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    res.status(200).json(subscription);
  } catch (error) {
    console.error('Get subscription by ID error:', error);
    res.status(500).json({ message: 'Failed to get subscription', error: error.message });
  }
};

const updateSubscription = async (req, res) => {
  try {
    const subscriptionId = req.params.id;
    const { status, endDate } = req.body;
    
    const subscription = await Subscription.findById(subscriptionId);
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    // Update subscription
    const updatedSubscription = await Subscription.findByIdAndUpdate(
      subscriptionId,
      {
        $set: {
          status: status || subscription.status,
          endDate: endDate || subscription.endDate
        }
      },
      { new: true }
    );
    
    // Update user subscription status if needed
    if (status === 'completed') {
      await User.findByIdAndUpdate(subscription.userId, {
        subscriptionActive: true,
        subscriptionExpiry: endDate || subscription.endDate
      });
    } else if (status === 'failed' || status === 'cancelled') {
      await User.findByIdAndUpdate(subscription.userId, {
        subscriptionActive: false
      });
    }
    
    res.status(200).json({
      message: 'Subscription updated successfully',
      subscription: updatedSubscription
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ message: 'Failed to update subscription', error: error.message });
  }
};

const cancelSubscription = async (req, res) => {
  try {
    const subscriptionId = req.params.id;
    
    const subscription = await Subscription.findById(subscriptionId);
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    // Update subscription status to cancelled
    subscription.status = 'cancelled';
    await subscription.save();
    
    // Update user subscription status
    await User.findByIdAndUpdate(subscription.userId, {
      subscriptionActive: false
    });
    
    res.status(200).json({
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ message: 'Failed to cancel subscription', error: error.message });
  }
};

// Analytics

const getDashboardStats = async (req, res) => {
  try {
    // Get counts for each user type
    const customerCount = await Customer.countDocuments();
    const doctorCount = await Doctor.countDocuments();
    const hospitalCount = await Hospital.countDocuments();
    const vendorCount = await Vendor.countDocuments();
    
    // Get subscription stats
    const activeSubscriptions = await User.countDocuments({
      subscriptionActive: true,
      subscriptionExpiry: { $gt: new Date() }
    });
    
    // Get recent users
    const recentUsers = await User.find()
      .select('name email role createdAt')
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Get appointment stats
    const totalAppointments = await Appointment.countDocuments();
    const pendingAppointments = await Appointment.countDocuments({ status: 'pending' });
    const completedAppointments = await Appointment.countDocuments({ status: 'completed' });
    
    res.status(200).json({
      userCounts: {
        customers: customerCount,
        doctors: doctorCount,
        hospitals: hospitalCount,
        vendors: vendorCount,
        total: customerCount + doctorCount + hospitalCount + vendorCount
      },
      subscriptions: {
        active: activeSubscriptions
      },
      appointments: {
        total: totalAppointments,
        pending: pendingAppointments,
        completed: completedAppointments
      },
      recentUsers
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to get dashboard stats', error: error.message });
  }
};

const getUserGrowthStats = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFormat;
    let groupBy;
    
    // Set date format and group by based on period
    if (period === 'day') {
      dateFormat = '%Y-%m-%d';
      groupBy = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } };
    } else if (period === 'week') {
      dateFormat = '%Y-%U'; // Year and week number
      groupBy = { year: { $year: '$createdAt' }, week: { $week: '$createdAt' } };
    } else if (period === 'month') {
      dateFormat = '%Y-%m';
      groupBy = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };
    } else if (period === 'year') {
      dateFormat = '%Y';
      groupBy = { year: { $year: '$createdAt' } };
    } else {
      return res.status(400).json({ message: 'Invalid period. Use day, week, month, or year.' });
    }
    
    // Get user growth stats for each role
    const customerGrowth = await Customer.aggregate([
      { $group: { _id: groupBy, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
    ]);
    
    const doctorGrowth = await Doctor.aggregate([
      { $group: { _id: groupBy, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
    ]);
    
    const hospitalGrowth = await Hospital.aggregate([
      { $group: { _id: groupBy, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
    ]);
    
    const vendorGrowth = await Vendor.aggregate([
      { $group: { _id: groupBy, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
    ]);
    
    res.status(200).json({
      period,
      customerGrowth,
      doctorGrowth,
      hospitalGrowth,
      vendorGrowth
    });
  } catch (error) {
    console.error('Get user growth stats error:', error);
    res.status(500).json({ message: 'Failed to get user growth stats', error: error.message });
  }
};

const getRevenueStats = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFormat;
    let groupBy;
    
    // Set date format and group by based on period
    if (period === 'day') {
      dateFormat = '%Y-%m-%d';
      groupBy = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } };
    } else if (period === 'week') {
      dateFormat = '%Y-%U'; // Year and week number
      groupBy = { year: { $year: '$createdAt' }, week: { $week: '$createdAt' } };
    } else if (period === 'month') {
      dateFormat = '%Y-%m';
      groupBy = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };
    } else if (period === 'year') {
      dateFormat = '%Y';
      groupBy = { year: { $year: '$createdAt' } };
    } else {
      return res.status(400).json({ message: 'Invalid period. Use day, week, month, or year.' });
    }
    
    // Get subscription revenue stats
    const subscriptionRevenue = await Subscription.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: groupBy, revenue: { $sum: '$amount' } } },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
    ]);
    
    res.status(200).json({
      period,
      subscriptionRevenue
    });
  } catch (error) {
    console.error('Get revenue stats error:', error);
    res.status(500).json({ message: 'Failed to get revenue stats', error: error.message });
  }
};

const getAppointmentStats = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFormat;
    let groupBy;
    
    // Set date format and group by based on period
    if (period === 'day') {
      dateFormat = '%Y-%m-%d';
      groupBy = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } };
    } else if (period === 'week') {
      dateFormat = '%Y-%U'; // Year and week number
      groupBy = { year: { $year: '$createdAt' }, week: { $week: '$createdAt' } };
    } else if (period === 'month') {
      dateFormat = '%Y-%m';
      groupBy = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };
    } else if (period === 'year') {
      dateFormat = '%Y';
      groupBy = { year: { $year: '$createdAt' } };
    } else {
      return res.status(400).json({ message: 'Invalid period. Use day, week, month, or year.' });
    }
    
    // Get appointment stats
    const appointmentsByStatus = await Appointment.aggregate([
      { $group: { _id: { ...groupBy, status: '$status' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1, '_id.status': 1 } }
    ]);
    
    res.status(200).json({
      period,
      appointmentsByStatus
    });
  } catch (error) {
    console.error('Get appointment stats error:', error);
    res.status(500).json({ message: 'Failed to get appointment stats', error: error.message });
  }
};

module.exports = {
  // Admin Profile Management
  getAdminProfile,
  updateAdminProfile,
  
  // Admin Management
  getAllAdmins,
  createAdmin,
  updateAdminPermissions,
  deleteAdmin,
  
  // User Management
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  
  // Doctor Management
  getAllDoctors,
  approveDoctorProfile,
  rejectDoctorProfile,
  
  // Hospital Management
  getAllHospitals,
  approveHospitalProfile,
  rejectHospitalProfile,
  
  // Vendor Management
  getAllVendors,
  approveVendorProfile,
  rejectVendorProfile,
  
  // Customer Management
  getAllCustomers,
  
  // Subscription Management
  getAllSubscriptions,
  getSubscriptionById,
  updateSubscription,
  cancelSubscription,
  
  // Analytics
  getDashboardStats,
  getUserGrowthStats,
  getRevenueStats,
  getAppointmentStats
};