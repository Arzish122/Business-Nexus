const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

// Get current user's profile
router.get('/', profileController.getProfile);

// Update user profile
router.put('/', profileController.updateProfile);

// Change password
router.put('/password', profileController.changePassword);

module.exports = router;