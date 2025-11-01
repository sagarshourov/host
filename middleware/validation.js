// middleware/validation.js
const validateCreditCheck = (req, res, next) => {
  const { ssn, authorizeCheck, verificationAnswers } = req.body;

  if (!ssn || !ssn.match(/^\d{3}-\d{2}-\d{4}$/)) {
    return res.status(400).json({
      error: 'Valid SSN is required'
    });
  }

  if (!authorizeCheck) {
    return res.status(400).json({
      error: 'Credit check authorization is required'
    });
  }

  if (!verificationAnswers || Object.keys(verificationAnswers).length === 0) {
    return res.status(400).json({
      error: 'Identity verification answers are required'
    });
  }

  next();
};

const validateTour = (req, res, next) => {
  const { property_id, name, email, date, time } = req.body;

  const errors = [];

  // Required fields
  if (!property_id) errors.push('Property ID is required');
  if (!name) errors.push('Name is required');
  if (!email) errors.push('Email is required');
  if (!date) errors.push('Date is required');
  if (!time) errors.push('Time is required');

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    errors.push('Invalid email format');
  }

  // Date validation (not in the past)
  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    errors.push('Cannot schedule tours in the past');
  }

  // Phone validation (if provided)
  if (req.body.phone) {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(req.body.phone)) {
      errors.push('Invalid phone number format');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};



module.exports = {
  validateCreditCheck,
  validateTour
};