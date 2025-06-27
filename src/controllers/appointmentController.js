const Appointment = require('../models/Appointment');
const { Customer, Doctor, Hospital, Vendor } = require('../models/User');
const { createOrder, verifyPayment } = require('../utils/razorpayUtil');
const Transaction = require('../models/Transaction');
const { sendAppointmentConfirmation } = require('../utils/notificationUtil');

// Book a doctor appointment
const bookDoctorAppointment = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { doctorId, consultationType, dateTime, notes, patientDetails } = req.body;

    // Validate patient details
    if (!patientDetails || !patientDetails.name) {
      return res.status(400).json({ message: 'Patient details with name are required' });
    }

    // Validate customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Validate doctor
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check doctor availability
    const appointmentDateTime = new Date(dateTime);
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][appointmentDateTime.getDay()];
    const appointmentTime = appointmentDateTime.toTimeString().substring(0, 5); // HH:MM format
    
    // Find the working day in doctor's availability
    const workingDay = doctor.availability.workingDays.find(day => day.day === dayOfWeek && day.isAvailable);
    if (!workingDay) {
      return res.status(400).json({ message: 'Doctor is not available on this day' });
    }

    // Helper function to convert HH:MM to minutes
    function timeToMinutes(timeString) {
      const [hours, minutes] = timeString.split(':').map(Number);
      return hours * 60 + minutes;
    }

    // Check if the time slot is available
    const availableSlot = workingDay.slots.find(slot => {
      const slotStart = slot.startTime;
      const slotEnd = slot.endTime;
      
      // Convert times to minutes for proper comparison
      const appointmentMinutes = timeToMinutes(appointmentTime);
      const slotStartMinutes = timeToMinutes(slotStart);
      const slotEndMinutes = timeToMinutes(slotEnd);
      
      return appointmentMinutes >= slotStartMinutes && 
             appointmentMinutes < slotEndMinutes && 
             !slot.isBooked;
    });

    if (!availableSlot) {
      console.log('Slot availability debug:', {
        requestedDay: dayOfWeek,
        requestedTime: appointmentTime,
        availableSlots: workingDay.slots.filter(slot => !slot.isBooked),
        allSlots: workingDay.slots
      });
      
      return res.status(400).json({ 
        message: 'Selected time slot is not available',
        availableSlots: workingDay.slots.filter(slot => !slot.isBooked).map(slot => ({
          startTime: slot.startTime,
          endTime: slot.endTime
        }))
      });
    }

    // Check if doctor is on leave
    const isOnLeave = doctor.availability.unavailablePeriods.some(
      period => appointmentDateTime >= new Date(period.startDate) && appointmentDateTime <= new Date(period.endDate)
    );
    
    if (isOnLeave) {
      return res.status(400).json({ message: 'Doctor is on leave during the selected date' });
    }

    // Calculate fees based on consultation type from doctor's services
    let amount = 0;
    let selectedService = null;

    // Map consultation types to service types
    const serviceTypeMapping = {
      'video': 'Video Consultation',
      'audio': 'Voice Consultation', 
      'in-person': 'Clinical Visit' // or 'Home Visit' depending on the appointment
    };

    const serviceType = serviceTypeMapping[consultationType];
    if (!serviceType) {
      return res.status(400).json({ message: 'Invalid consultation type' });
    }

    // Find the matching active service
    selectedService = doctor.services.find(service => 
      service.serviceType === serviceType && service.isActive
    );

    if (!selectedService) {
      return res.status(400).json({ 
        message: `Doctor does not offer ${consultationType} consultation service or it is currently unavailable` 
      });
    }

    amount = selectedService.price;

    // Validate minimum amount
    if (amount <= 0) {
      return res.status(400).json({ 
        message: `Service price not set for ${consultationType} consultation. Please contact the doctor.` 
      });
    }

    // Create a payment order
    const receipt = `apt_${customerId.toString().slice(-8)}_${doctorId.toString().slice(-8)}_${Date.now().toString().slice(-6)}`;
    const orderResponse = await createOrder(Math.round(amount * 100), receipt);

    // Create appointment
    const appointment = new Appointment({
      customer: customerId,
      type: 'doctor',
      doctor: doctorId,
      dateTime: appointmentDateTime,
      consultationType,
      amount,
      currency: selectedService.currency || 'INR',
      status: 'pending',
      notes,
      isPaid: false,
      specialty: doctor.specialty,
      clinicName: doctor.addresses && doctor.addresses.length > 0 ? doctor.addresses[0].clinicName || '' : '',
      clinicAddress: doctor.addresses && doctor.addresses.length > 0 ? 
        `${doctor.addresses[0].addressLine1 || ''}, ${doctor.addresses[0].city || ''}, ${doctor.addresses[0].state || ''} ${doctor.addresses[0].postalCode || ''}`.trim() : '',
      // Add patient details
      patientDetails: {
        name: patientDetails.name,
        age: patientDetails.age,
        gender: patientDetails.gender,
        phone: patientDetails.phone,
        email: patientDetails.email,
        relationshipToCustomer: patientDetails.relationshipToCustomer || 'self',
        medicalHistory: patientDetails.medicalHistory,
        allergies: patientDetails.allergies,
        currentMedications: patientDetails.currentMedications
      }
    });

    await appointment.save();

    res.status(201).json({
      message: 'Doctor appointment created successfully',
      appointment: {
        id: appointment._id,
        user_id: customer._id,
        type: appointment.type,
        doctor_id: doctor._id,
        hospital_id: null,
        service_vendor_id: null,
        date_time: appointment.dateTime,
        consultation_type: appointment.consultationType,
        amount: appointment.amount,
        currency: appointment.currency,
        status: appointment.status,
        notes: appointment.notes,
        payment_id: appointment.paymentId,
        booked_at: appointment.bookedAt,
        cancelled_at: appointment.cancelledAt,
        cancellation_reason: appointment.cancellationReason,
        is_paid: appointment.isPaid,
        // Doctor details
        doctor_name: doctor.name,
        specialty: doctor.specialty,
        clinic_name: appointment.clinicName,
        clinic_address: appointment.clinicAddress
      },
      patient: {
        name: appointment.patientDetails.name,
        age: appointment.patientDetails.age,
        gender: appointment.patientDetails.gender,
        phone: appointment.patientDetails.phone,
        email: appointment.patientDetails.email,
        relationship_to_customer: appointment.patientDetails.relationshipToCustomer,
        medical_history: appointment.patientDetails.medicalHistory,
        allergies: appointment.patientDetails.allergies,
        current_medications: appointment.patientDetails.currentMedications
      },
      order: orderResponse,
      // Add Razorpay key_id for Flutter integration
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Error booking doctor appointment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Book a hospital appointment
const bookHospitalAppointment = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { hospitalId, dateTime, service, department, notes } = req.body;

    // Validate customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Validate hospital
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    // Check if the service exists
    const hospitalService = hospital.services.find(s => s.name === service);
    if (!hospitalService) {
      return res.status(400).json({ message: 'Service not available at this hospital' });
    }

    // Get service amount
    const amount = hospitalService.price || 0;

    // Create a payment order
    const receipt = `apt_${customerId.toString().slice(-8)}_${hospitalId.toString().slice(-8)}_${Date.now().toString().slice(-6)}`;
    const orderResponse = await createOrder(Math.round(amount * 100), receipt);

    // Create appointment
    const appointment = new Appointment({
      customer: customerId,
      type: 'hospital',
      hospital: hospitalId,
      dateTime: new Date(dateTime),
      amount,
      currency: 'USD', // Default currency
      status: 'pending',
      notes,
      isPaid: false,
      department,
      service,
      hospitalAddress: hospital.addresses.length > 0 ? 
        `${hospital.addresses[0].addressLine1}, ${hospital.addresses[0].city}, ${hospital.addresses[0].state} ${hospital.addresses[0].postalCode}` : 
        ''
    });

    await appointment.save();

    res.status(201).json({
      message: 'Hospital appointment created successfully',
      appointment: {
        id: appointment.appointmentId,
        user_id: customer._id,
        type: appointment.type,
        doctor_id: null,
        hospital_id: hospital._id,
        service_vendor_id: null,
        date_time: appointment.dateTime,
        consultation_type: null,
        amount: appointment.amount,
        currency: appointment.currency,
        status: appointment.status,
        notes: appointment.notes,
        payment_id: appointment.paymentId,
        booked_at: appointment.bookedAt,
        cancelled_at: appointment.cancelledAt,
        cancellation_reason: appointment.cancellationReason,
        is_paid: appointment.isPaid,
        hospital_name: hospital.name,
        department: appointment.department,
        service: appointment.service,
        hospital_address: appointment.hospitalAddress
      },
      order: orderResponse
    });
  } catch (error) {
    console.error('Error booking hospital appointment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Book a service appointment
const bookServiceAppointment = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { vendorId, serviceId, dateTime, notes } = req.body;

    // Validate customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Validate vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Check if the service exists
    const vendorService = vendor.services.find(s => s.id === serviceId);
    if (!vendorService) {
      return res.status(400).json({ message: 'Service not available from this vendor' });
    }

    // Get service amount and details
    const amount = vendorService.price || 0;
    const serviceType = vendor.serviceTypes.length > 0 ? vendor.serviceTypes[0] : 'General';

    // Create a payment order
    const receipt = `apt_${customerId.toString().slice(-8)}_${vendorId.toString().slice(-8)}_${Date.now().toString().slice(-6)}`;
    const orderResponse = await createOrder(Math.round(amount * 100), receipt);

    // Create appointment
    const appointment = new Appointment({
      customer: customerId,
      type: 'service',
      serviceVendor: vendorId,
      dateTime: new Date(dateTime),
      amount,
      currency: vendorService.currency || 'USD',
      status: 'pending',
      notes,
      isPaid: false,
      serviceType,
      serviceName: vendorService.name,
      vendorAddress: vendor.addresses.length > 0 ? 
        `${vendor.addresses[0].addressLine1}, ${vendor.addresses[0].city}, ${vendor.addresses[0].state} ${vendor.addresses[0].postalCode}` : 
        vendor.address || ''
    });

    await appointment.save();

    res.status(201).json({
      message: 'Service appointment created successfully',
      appointment: {
        id: appointment.appointmentId,
        user_id: customer._id,
        type: appointment.type,
        doctor_id: null,
        hospital_id: null,
        service_vendor_id: vendor._id,
        date_time: appointment.dateTime,
        consultation_type: null,
        amount: appointment.amount,
        currency: appointment.currency,
        status: appointment.status,
        notes: appointment.notes,
        payment_id: appointment.paymentId,
        booked_at: appointment.bookedAt,
        cancelled_at: appointment.cancelledAt,
        cancellation_reason: appointment.cancellationReason,
        is_paid: appointment.isPaid,
        vendor_name: vendor.name,
        service_type: appointment.serviceType,
        service_name: appointment.serviceName,
        vendor_address: appointment.vendorAddress
      },
      order: orderResponse
    });
  } catch (error) {
    console.error('Error booking service appointment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verify payment and confirm appointment
const verifyAppointmentPayment = async (req, res) => {
  try {
    const { appointmentId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    // Find the appointment using _id instead of appointmentId
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Verify payment signature
    const isValid = verifyPayment(
      razorpay_order_id,
      razorpay_payment_id, 
      razorpay_signature
    );

    if (!isValid) {
      appointment.status = 'cancelled';
      await appointment.save();
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    // Update appointment with payment details
    appointment.paymentId = razorpay_payment_id;
    appointment.isPaid = true;
    appointment.status = 'upcoming';
    
    // For in-person appointments, they are auto-confirmed
    if (appointment.consultationType === 'in-person') {
      appointment.status = 'confirmed';
    }
    
    await appointment.save();

    // If it's a doctor appointment, update the doctor's availability
    if (appointment.type === 'doctor' && appointment.doctor) {
      const doctor = await Doctor.findById(appointment.doctor);
      if (doctor) {
        // Mark the slot as booked in doctor's availability
        const appointmentDate = new Date(appointment.dateTime);
        const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][appointmentDate.getDay()];
        const appointmentTime = appointmentDate.toTimeString().substring(0, 5); // HH:MM format
        
        // Helper function to convert HH:MM to minutes
        function timeToMinutes(timeString) {
          const [hours, minutes] = timeString.split(':').map(Number);
          return hours * 60 + minutes;
        }

        // Find and update the slot
        const workingDayIndex = doctor.availability.workingDays.findIndex(day => day.day === dayOfWeek);
        if (workingDayIndex !== -1) {
          const slotIndex = doctor.availability.workingDays[workingDayIndex].slots.findIndex(slot => {
            const slotStart = slot.startTime;
            const slotEnd = slot.endTime;
            
            // Convert times to minutes for proper comparison
            const appointmentMinutes = timeToMinutes(appointmentTime);
            const slotStartMinutes = timeToMinutes(slotStart);
            const slotEndMinutes = timeToMinutes(slotEnd);
            
            return appointmentMinutes >= slotStartMinutes && appointmentMinutes < slotEndMinutes;
          });
          
          if (slotIndex !== -1) {
            doctor.availability.workingDays[workingDayIndex].slots[slotIndex].isBooked = true;
            await doctor.save();
          }
        }
      }
    }

    // Send notifications based on appointment type
    try {
      let provider;
      if (appointment.type === 'doctor' && appointment.doctor) {
        provider = await Doctor.findById(appointment.doctor);
      } else if (appointment.type === 'hospital' && appointment.hospital) {
        provider = await Hospital.findById(appointment.hospital);
      } else if (appointment.type === 'service' && appointment.serviceVendor) {
        provider = await Vendor.findById(appointment.serviceVendor);
      }
      
      const customer = await Customer.findById(appointment.customer);
      if (provider && customer) {
        await sendAppointmentConfirmation(appointment, customer, provider);
      }
    } catch (notificationError) {
      console.error('Error sending notifications:', notificationError);
      // Continue with the response even if notification fails
    }

    // Format response based on appointment type
    let response;
    if (appointment.type === 'doctor') {
      const doctor = await Doctor.findById(appointment.doctor);
      response = {
        id: appointment.appointmentId,
        user_id: appointment.customer,
        type: appointment.type,
        doctor_id: appointment.doctor,
        hospital_id: null,
        service_vendor_id: null,
        date_time: appointment.dateTime,
        consultation_type: appointment.consultationType,
        amount: appointment.amount,
        currency: appointment.currency,
        status: appointment.status,
        notes: appointment.notes,
        payment_id: appointment.paymentId,
        booked_at: appointment.bookedAt,
        cancelled_at: appointment.cancelledAt,
        cancellation_reason: appointment.cancellationReason,
        is_paid: appointment.isPaid,
        doctor_name: doctor ? doctor.name : '',
        specialty: appointment.specialty,
        clinic_name: appointment.clinicName,
        clinic_address: appointment.clinicAddress
      };
    } else if (appointment.type === 'hospital') {
      const hospital = await Hospital.findById(appointment.hospital);
      response = {
        id: appointment.appointmentId,
        user_id: appointment.customer,
        type: appointment.type,
        doctor_id: null,
        hospital_id: appointment.hospital,
        service_vendor_id: null,
        date_time: appointment.dateTime,
        consultation_type: null,
        amount: appointment.amount,
        currency: appointment.currency,
        status: appointment.status,
        notes: appointment.notes,
        payment_id: appointment.paymentId,
        booked_at: appointment.bookedAt,
        cancelled_at: appointment.cancelledAt,
        cancellation_reason: appointment.cancellationReason,
        is_paid: appointment.isPaid,
        hospital_name: hospital ? hospital.name : '',
        department: appointment.department,
        service: appointment.service,
        hospital_address: appointment.hospitalAddress
      };
    } else { // service
      const vendor = await Vendor.findById(appointment.serviceVendor);
      response = {
        id: appointment.appointmentId,
        user_id: appointment.customer,
        type: appointment.type,
        doctor_id: null,
        hospital_id: null,
        service_vendor_id: appointment.serviceVendor,
        date_time: appointment.dateTime,
        consultation_type: null,
        amount: appointment.amount,
        currency: appointment.currency,
        status: appointment.status,
        notes: appointment.notes,
        payment_id: appointment.paymentId,
        booked_at: appointment.bookedAt,
        cancelled_at: appointment.cancelledAt,
        cancellation_reason: appointment.cancellationReason,
        is_paid: appointment.isPaid,
        vendor_name: vendor ? vendor.name : '',
        service_type: appointment.serviceType,
        service_name: appointment.serviceName,
        vendor_address: appointment.vendorAddress
      };
    }

    res.status(200).json({
      message: 'Payment verified and appointment confirmed successfully',
      appointment: response
    });
  } catch (error) {
    console.error('Error verifying appointment payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get customer appointments
const getCustomerAppointments = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { status, type } = req.query;
    
    // Build query
    const query = { customer: customerId };
    if (status) query.status = status;
    if (type) query.type = type;
    
    // Get appointments
    const appointments = await Appointment.find(query).sort({ dateTime: -1 });
    
    // Format response
    const formattedAppointments = await Promise.all(appointments.map(async (appointment) => {
      let formattedAppointment;
      
      if (appointment.type === 'doctor') {
        const doctor = await Doctor.findById(appointment.doctor);
        
        // Find the specific service that was booked
        let bookedService = null;
        if (doctor && doctor.services) {
          const serviceTypeMapping = {
            'video': 'Video Consultation',
            'audio': 'Voice Consultation', 
            'in-person': 'Clinical Visit'
          };
          const serviceType = serviceTypeMapping[appointment.consultationType];
          bookedService = doctor.services.find(service => 
            service.serviceType === serviceType && service.isActive
          );
        }
        
        formattedAppointment = {
          id: appointment._id,
          user_id: appointment.customer,
          type: appointment.type,
          doctor_id: appointment.doctor,
          hospital_id: null,
          service_vendor_id: null,
          date_time: appointment.dateTime,
          consultation_type: appointment.consultationType,
          amount: appointment.amount,
          currency: appointment.currency,
          status: appointment.status,
          notes: appointment.notes,
          payment_id: appointment.paymentId,
          booked_at: appointment.bookedAt,
          cancelled_at: appointment.cancelledAt,
          cancellation_reason: appointment.cancellationReason,
          is_paid: appointment.isPaid,
          doctor_name: doctor ? doctor.name : '',
          specialty: appointment.specialty,
          clinic_name: appointment.clinicName,
          clinic_address: appointment.clinicAddress,
          // Add service details
          service_type: bookedService ? bookedService.serviceType : null,
          service_description: bookedService ? bookedService.description : null,
          original_service_price: bookedService ? bookedService.price : appointment.amount
        };
      } else if (appointment.type === 'hospital') {
        const hospital = await Hospital.findById(appointment.hospital);
        formattedAppointment = {
          id: appointment._id,
          user_id: appointment.customer,
          type: appointment.type,
          doctor_id: null,
          hospital_id: appointment.hospital,
          service_vendor_id: null,
          date_time: appointment.dateTime,
          consultation_type: null,
          amount: appointment.amount,
          currency: appointment.currency,
          status: appointment.status,
          notes: appointment.notes,
          payment_id: appointment.paymentId,
          booked_at: appointment.bookedAt,
          cancelled_at: appointment.cancelledAt,
          cancellation_reason: appointment.cancellationReason,
          is_paid: appointment.isPaid,
          hospital_name: hospital ? hospital.name : '',
          department: appointment.department,
          service: appointment.service,
          hospital_address: appointment.hospitalAddress
        };
      } else { // service
        const vendor = await Vendor.findById(appointment.serviceVendor);
        formattedAppointment = {
          id: appointment._id,
          user_id: appointment.customer,
          type: appointment.type,
          doctor_id: null,
          hospital_id: null,
          service_vendor_id: appointment.serviceVendor,
          date_time: appointment.dateTime,
          consultation_type: null,
          amount: appointment.amount,
          currency: appointment.currency,
          status: appointment.status,
          notes: appointment.notes,
          payment_id: appointment.paymentId,
          booked_at: appointment.bookedAt,
          cancelled_at: appointment.cancelledAt,
          cancellation_reason: appointment.cancellationReason,
          is_paid: appointment.isPaid,
          vendor_name: vendor ? vendor.name : '',
          service_type: appointment.serviceType,
          service_name: appointment.serviceName,
          vendor_address: appointment.vendorAddress
        };
      }
      
      return formattedAppointment;
    }));
    
    res.status(200).json(formattedAppointments);
  } catch (error) {
    console.error('Error getting customer appointments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get provider appointments (doctor, hospital, or vendor)
const getProviderAppointments = async (req, res) => {
  try {
    const providerId = req.user._id;
    const providerRole = req.user.role;
    const { status } = req.query;
    
    // Build query based on provider role
    const query = {};
    if (status) query.status = status;
    
    if (providerRole === 'doctor') {
      query.type = 'doctor';
      query.doctor = providerId;
    } else if (providerRole === 'hospital') {
      query.type = 'hospital';
      query.hospital = providerId;
    } else if (providerRole === 'vendor') {
      query.type = 'service';
      query.serviceVendor = providerId;
    } else {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    
    // Get appointments
    const appointments = await Appointment.find(query)
      .populate('customer', 'name mobileNumber email')
      .sort({ dateTime: -1 });
    
    // Format response
    const formattedAppointments = appointments.map(appointment => {
      const baseAppointment = {
        id: appointment.appointmentId,
        user_id: appointment.customer._id,
        user_name: appointment.customer.name,
        user_phone: appointment.customer.mobileNumber,
        user_email: appointment.customer.email,
        type: appointment.type,
        date_time: appointment.dateTime,
        amount: appointment.amount,
        currency: appointment.currency,
        status: appointment.status,
        notes: appointment.notes,
        payment_id: appointment.paymentId,
        booked_at: appointment.bookedAt,
        cancelled_at: appointment.cancelledAt,
        cancellation_reason: appointment.cancellationReason,
        is_paid: appointment.isPaid
      };
      
      if (appointment.type === 'doctor') {
        return {
          ...baseAppointment,
          doctor_id: appointment.doctor,
          hospital_id: null,
          service_vendor_id: null,
          consultation_type: appointment.consultationType,
          specialty: appointment.specialty,
          clinic_name: appointment.clinicName,
          clinic_address: appointment.clinicAddress
        };
      } else if (appointment.type === 'hospital') {
        return {
          ...baseAppointment,
          doctor_id: null,
          hospital_id: appointment.hospital,
          service_vendor_id: null,
          consultation_type: null,
          department: appointment.department,
          service: appointment.service,
          hospital_address: appointment.hospitalAddress
        };
      } else { // service
        return {
          ...baseAppointment,
          doctor_id: null,
          hospital_id: null,
          service_vendor_id: appointment.serviceVendor,
          consultation_type: null,
          service_type: appointment.serviceType,
          service_name: appointment.serviceName,
          vendor_address: appointment.vendorAddress
        };
      }
    });
    
    res.status(200).json(formattedAppointments);
  } catch (error) {
    console.error('Error getting provider appointments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Respond to appointment (confirm or reject)
const respondToAppointment = async (req, res) => {
  try {
    const providerId = req.user._id;
    const providerRole = req.user.role;
    const { appointmentId, action, reason } = req.body;
    
    if (!['confirm', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Must be confirm or reject' });
    }
    
    // Find the appointment
    const appointment = await Appointment.findOne({ appointmentId });
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // Verify that the provider has permission to respond to this appointment
    let hasPermission = false;
    if (providerRole === 'doctor' && appointment.type === 'doctor' && appointment.doctor.toString() === providerId.toString()) {
      hasPermission = true;
    } else if (providerRole === 'hospital' && appointment.type === 'hospital' && appointment.hospital.toString() === providerId.toString()) {
      hasPermission = true;
    } else if (providerRole === 'vendor' && appointment.type === 'service' && appointment.serviceVendor.toString() === providerId.toString()) {
      hasPermission = true;
    }
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'You do not have permission to respond to this appointment' });
    }
    
    // Update appointment status
    if (action === 'confirm') {
      appointment.status = 'confirmed';
    } else { // reject
      appointment.status = 'rejected';
      appointment.cancellationReason = reason || 'Rejected by provider';
    }
    
    await appointment.save();
    
    // Notify customer
    try {
      const customer = await Customer.findById(appointment.customer);
      if (customer) {
        // Implement notification logic here
      }
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Continue with the response even if notification fails
    }
    
    res.status(200).json({
      message: `Appointment ${action === 'confirm' ? 'confirmed' : 'rejected'} successfully`,
      appointment
    });
  } catch (error) {
    console.error('Error responding to appointment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Cancel appointment
const cancelAppointment = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const { appointmentId } = req.params;
    const { reason } = req.body;
    
    // Find the appointment
    const appointment = await Appointment.findOne({ appointmentId });
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // Check if the user has permission to cancel this appointment
    let hasPermission = false;
    if (userRole === 'customer' && appointment.customer.toString() === userId.toString()) {
      hasPermission = true;
    } else if (userRole === 'doctor' && appointment.type === 'doctor' && appointment.doctor.toString() === userId.toString()) {
      hasPermission = true;
    } else if (userRole === 'hospital' && appointment.type === 'hospital' && appointment.hospital.toString() === userId.toString()) {
      hasPermission = true;
    } else if (userRole === 'vendor' && appointment.type === 'service' && appointment.serviceVendor.toString() === userId.toString()) {
      hasPermission = true;
    }
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'You do not have permission to cancel this appointment' });
    }
    
    // Check if the appointment can be cancelled
    if (['completed', 'cancelled'].includes(appointment.status)) {
      return res.status(400).json({ message: `Cannot cancel an appointment that is already ${appointment.status}` });
    }
    
    // Update appointment
    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date();
    appointment.cancellationReason = reason || `Cancelled by ${userRole}`;
    
    await appointment.save();
    
    // If it's a doctor appointment, free up the slot
    if (appointment.type === 'doctor' && appointment.doctor) {
      const doctor = await Doctor.findById(appointment.doctor);
      if (doctor) {
        // Free up the slot in doctor's availability
        const appointmentDate = new Date(appointment.dateTime);
        const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][appointmentDate.getDay()];
        const appointmentTime = appointmentDate.toTimeString().substring(0, 5); // HH:MM format
        
        // Helper function to convert HH:MM to minutes
        function timeToMinutes(timeString) {
          const [hours, minutes] = timeString.split(':').map(Number);
          return hours * 60 + minutes;
        }

        // Find and update the slot
        const workingDayIndex = doctor.availability.workingDays.findIndex(day => day.day === dayOfWeek);
        if (workingDayIndex !== -1) {
          const slotIndex = doctor.availability.workingDays[workingDayIndex].slots.findIndex(slot => {
            const slotStart = slot.startTime;
            const slotEnd = slot.endTime;
            
            // Convert times to minutes for proper comparison
            const appointmentMinutes = timeToMinutes(appointmentTime);
            const slotStartMinutes = timeToMinutes(slotStart);
            const slotEndMinutes = timeToMinutes(slotEnd);
            
            return appointmentMinutes >= slotStartMinutes && appointmentMinutes < slotEndMinutes;
          });
          
          if (slotIndex !== -1) {
            doctor.availability.workingDays[workingDayIndex].slots[slotIndex].isBooked = false;
            await doctor.save();
          }
        }
      }
    }
    
    // Notify the other party
    try {
      let notifyUser;
      if (userRole === 'customer') {
        if (appointment.type === 'doctor') {
          notifyUser = await Doctor.findById(appointment.doctor);
        } else if (appointment.type === 'hospital') {
          notifyUser = await Hospital.findById(appointment.hospital);
        } else if (appointment.type === 'service') {
          notifyUser = await Vendor.findById(appointment.serviceVendor);
        }
      } else {
        notifyUser = await Customer.findById(appointment.customer);
      }
      
      if (notifyUser) {
        // Implement notification logic here
      }
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Continue with the response even if notification fails
    }
    
    res.status(200).json({
      message: 'Appointment cancelled successfully',
      appointment
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get doctor appointments by service type
const getDoctorAppointmentsByService = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { serviceId, status } = req.query;
    
    // Build query
    const query = {
      type: 'doctor',
      doctor: doctorId
    };
    
    if (status) {
      query.status = status;
    }
    
    // Get appointments
    const appointments = await Appointment.find(query)
      .populate('customer', 'name mobileNumber email')
      .sort({ dateTime: -1 });
    
    // If serviceId is provided, filter appointments by service
    let filteredAppointments = appointments;
    if (serviceId) {
      // Get the doctor to find the service name
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      
      const service = doctor.services.find(s => s.id === serviceId);
      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }
      
      // Filter appointments by service name
      filteredAppointments = appointments.filter(appointment => 
        appointment.serviceName === service.name
      );
    }
    
    // Format appointments
    const formattedAppointments = await Promise.all(filteredAppointments.map(async (appointment) => {
      const customer = await Customer.findById(appointment.customer);
      
      return {
        id: appointment.appointmentId,
        user_id: appointment.customer,
        type: appointment.type,
        doctor_id: appointment.doctor,
        date_time: appointment.dateTime,
        consultation_type: appointment.consultationType,
        amount: appointment.amount,
        currency: appointment.currency,
        status: appointment.status,
        notes: appointment.notes,
        payment_id: appointment.paymentId,
        booked_at: appointment.bookedAt,
        cancelled_at: appointment.cancelledAt,
        cancellation_reason: appointment.cancellationReason,
        is_paid: appointment.isPaid,
        customer_name: customer ? customer.name : '',
        customer_phone: customer ? customer.mobileNumber : '',
        customer_email: customer ? customer.email : '',
        specialty: appointment.specialty,
        clinic_name: appointment.clinicName,
        clinic_address: appointment.clinicAddress,
        service_name: appointment.serviceName
      };
    }));
    
    res.status(200).json(formattedAppointments);
  } catch (error) {
    console.error('Error getting doctor appointments by service:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
const getLatestCustomerAppointment = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { status, type } = req.query;
    
    // Build query
    const query = { customer: customerId };
    if (status) query.status = status;
    if (type) query.type = type;
    
    // Get the latest appointment only
    const appointment = await Appointment.findOne(query)
      .sort({ dateTime: -1 })
      .limit(1);
    
    if (!appointment) {
      return res.status(404).json({ message: 'No appointments found' });
    }
    
    // Format response based on appointment type
    let formattedAppointment;
    
    if (appointment.type === 'doctor') {
      const doctor = await Doctor.findById(appointment.doctor);
      formattedAppointment = {
        id: appointment._id,
        user_id: appointment.customer,
        type: appointment.type,
        doctor_id: appointment.doctor,
        hospital_id: null,
        service_vendor_id: null,
        date_time: appointment.dateTime,
        consultation_type: appointment.consultationType,
        amount: appointment.amount,
        currency: appointment.currency,
        status: appointment.status,
        notes: appointment.notes,
        payment_id: appointment.paymentId,
        booked_at: appointment.bookedAt,
        cancelled_at: appointment.cancelledAt,
        cancellation_reason: appointment.cancellationReason,
        is_paid: appointment.isPaid,
        doctor_name: doctor ? doctor.name : '',
        specialty: appointment.specialty,
        clinic_name: appointment.clinicName,
        clinic_address: appointment.clinicAddress
      };
    } else if (appointment.type === 'hospital') {
      const hospital = await Hospital.findById(appointment.hospital);
      formattedAppointment = {
        id: appointment._id,
        user_id: appointment.customer,
        type: appointment.type,
        doctor_id: null,
        hospital_id: appointment.hospital,
        service_vendor_id: null,
        date_time: appointment.dateTime,
        consultation_type: null,
        amount: appointment.amount,
        currency: appointment.currency,
        status: appointment.status,
        notes: appointment.notes,
        payment_id: appointment.paymentId,
        booked_at: appointment.bookedAt,
        cancelled_at: appointment.cancelledAt,
        cancellation_reason: appointment.cancellationReason,
        is_paid: appointment.isPaid,
        hospital_name: hospital ? hospital.name : '',
        department: appointment.department,
        service: appointment.service,
        hospital_address: appointment.hospitalAddress
      };
    } else { // service
      const vendor = await Vendor.findById(appointment.serviceVendor);
      formattedAppointment = {
        id: appointment._id,
        user_id: appointment.customer,
        type: appointment.type,
        doctor_id: null,
        hospital_id: null,
        service_vendor_id: appointment.serviceVendor,
        date_time: appointment.dateTime,
        consultation_type: null,
        amount: appointment.amount,
        currency: appointment.currency,
        status: appointment.status,
        notes: appointment.notes,
        payment_id: appointment.paymentId,
        booked_at: appointment.bookedAt,
        cancelled_at: appointment.cancelledAt,
        cancellation_reason: appointment.cancellationReason,
        is_paid: appointment.isPaid,
        vendor_name: vendor ? vendor.name : '',
        service_type: appointment.serviceType,
        service_name: appointment.serviceName,
        vendor_address: appointment.vendorAddress
      };
    }
    
    res.status(200).json(formattedAppointment);
  } catch (error) {
    console.error('Error getting latest customer appointment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
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
};

// Get customer's latest appointment
