const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

// Search users by email (must come before /:id route)
router.get('/search', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ message: 'Email parameter is required' });
    }
    
    // Search for users with email containing the search term
    const users = await User.find({
      email: { $regex: email, $options: 'i' }
    }).select('-password').limit(10);
    
    const formattedUsers = users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      userType: user.userType,
      avatarUrl: user.avatarUrl || '',
    }));
    
    res.json(formattedUsers);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.userType,
      avatarUrl: user.avatarUrl || '',
      bio: user.bio || ''
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (for participant selection)
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    
    const formattedUsers = users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.userType,
      avatarUrl: user.avatarUrl || '',
    }));
    
    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;