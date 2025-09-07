const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { 
  validateUserRegistration, 
  validateUserLogin, 
  validatePasswordChange, 
  validate2FA,
  handleValidationErrors 
} = require('../middleware/validation');
const { authLimiter, generalLimiter } = require('../middleware/security');

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', 
  authLimiter,
  validateUserRegistration,
  authController.signup
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', 
  authLimiter,
  validateUserLogin,
  handleValidationErrors,
  authController.login
);

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', 
  generalLimiter,
  authController.refreshToken
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', 
  authMiddleware, 
  authController.getCurrentUser
);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', 
  authMiddleware, 
  authController.logout
);

// @route   POST /api/auth/2fa/toggle
// @desc    Enable/Disable 2FA
// @access  Private
router.post('/2fa/toggle', 
  authMiddleware,
  validate2FA,
  handleValidationErrors,
  authController.toggle2FA
);

// @route   POST /api/auth/verify-email
// @desc    Verify email address
// @access  Private
router.post('/verify-email', 
  authMiddleware,
  validate2FA,
  handleValidationErrors,
  authController.verifyEmail
);

// @route   POST /api/auth/resend-verification
// @desc    Resend email verification
// @access  Private
router.post('/resend-verification', 
  authMiddleware,
  generalLimiter,
  authController.resendVerification
);

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', 
  authMiddleware,
  validatePasswordChange,
  handleValidationErrors,
  authController.changePassword
);

module.exports = router;