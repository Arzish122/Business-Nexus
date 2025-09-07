const { body, validationResult } = require('express-validator');
const validator = require('validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('=== VALIDATION ERRORS ===');
    console.log('Request body:', req.body);
    console.log('Validation errors:', errors.array());
    console.log('========================');
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Custom sanitizer (basic cleanup)
const sanitizeInput = (value) => {
  if (typeof value !== 'string') return value;
  return validator.escape(validator.stripLow(value.trim()));
};

// User registration validation (only required fields)
const validateUserRegistration = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),

  body('firstName')
    .notEmpty()
    .withMessage('First name is required')
    .customSanitizer(sanitizeInput),

  body('lastName')
    .notEmpty()
    .withMessage('Last name is required')
    .customSanitizer(sanitizeInput),

  body('userType')
    .notEmpty()
    .withMessage('User type is required'),

  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .notEmpty()
    .withMessage('Email is required'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors
];

// Profile update validation (no restrictions, only sanitization)
const validateProfileUpdate = [
  body('firstName').optional().customSanitizer(sanitizeInput),
  body('lastName').optional().customSanitizer(sanitizeInput),
  body('bio').optional().customSanitizer(sanitizeInput),
  body('company').optional().customSanitizer(sanitizeInput),
  body('location').optional().customSanitizer(sanitizeInput),
  handleValidationErrors
];

// Payment validation (only amount required)
const validatePayment = [
  body('amount')
    .notEmpty()
    .withMessage('Amount is required'),
  handleValidationErrors
];

// Transfer validation
const validateTransfer = [
  body('amount')
    .notEmpty()
    .withMessage('Amount is required'),

  body('recipientId')
    .notEmpty()
    .withMessage('Recipient ID is required'),

  handleValidationErrors
];

// Withdrawal validation
const validateWithdrawal = [
  body('amount')
    .notEmpty()
    .withMessage('Amount is required'),

  body('withdrawMethod')
    .notEmpty()
    .withMessage('Withdraw method is required'),

  handleValidationErrors
];

// Message validation
const validateMessage = [
  body('content')
    .notEmpty()
    .withMessage('Message content is required')
    .customSanitizer(sanitizeInput),

  body('receiverId')
    .notEmpty()
    .withMessage('Receiver ID is required'),

  handleValidationErrors
];

// Document validation
const validateDocument = [
  body('title')
    .notEmpty()
    .withMessage('Document title is required')
    .customSanitizer(sanitizeInput),

  handleValidationErrors
];

// Search validation
const validateSearch = [
  body('query').optional().customSanitizer(sanitizeInput),
  body('email').optional().isEmail().normalizeEmail(),
  handleValidationErrors
];

// Password change validation (only checks required + min length)
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  handleValidationErrors
];

// 2FA validation
const validate2FA = [
  body('otpCode').optional(),
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateProfileUpdate,
  validatePayment,
  validateTransfer,
  validateWithdrawal,
  validateMessage,
  validateDocument,
  validateSearch,
  validatePasswordChange,
  validate2FA,
  handleValidationErrors,
  sanitizeInput
};
