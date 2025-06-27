const express = require('express');
const { 
  bookDoctorAppointment,
  bookHospitalAppointment,
  bookServiceAppointment,
  verifyAppointmentPayment,
  getCustomerAppointments,
  getProviderAppointments,
  respondToAppointment,
  cancelAppointment,
  getDoctorAppointmentsByService,
  getLatestCustomerAppointment
} = require('../controllers/appointmentController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Booking routes for different appointment types
router.post('/book/doctor', auth, bookDoctorAppointment);
router.post('/book/hospital', auth, bookHospitalAppointment);
router.post('/book/service', auth, bookServiceAppointment);

// Payment verification
router.post('/verify-payment', auth, verifyAppointmentPayment);

// Customer routes
router.get('/customer', auth, getCustomerAppointments);
router.get('/customer/latest', auth, getLatestCustomerAppointment);

// Provider routes (doctor, hospital, vendor)
router.get('/provider', auth, getProviderAppointments);
router.post('/respond', auth, respondToAppointment);

// Common routes
router.delete('/cancel/:appointmentId', auth, cancelAppointment);
router.get('/doctor/by-service', auth, getDoctorAppointmentsByService);

module.exports = router;