const User = require('../models/User');

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    // Extract all fields from request body
    const { 
      name, 
      email, 
      bio, 
      role,
      location, 
      website, 
      social,
      // Entrepreneur specific fields
      startupName,
      industry,
      pitchSummary,
      fundingNeeded,
      teamSize,
      foundedYear,
      // Investor specific fields
      investmentInterests,
      investmentStage,
      portfolioCompanies,
      minimumInvestment,
      maximumInvestment
    } = req.body;
    
    // Build profile object
    const profileFields = {};
    if (name) profileFields.name = name;
    if (bio) profileFields.bio = bio;
    if (location) profileFields.location = location;
    if (website) profileFields.website = website;
    if (social) profileFields.social = social;
    
    // Add role-specific fields
    if (role === 'entrepreneur') {
      if (startupName) profileFields.startupName = startupName;
      if (industry) profileFields.industry = industry;
      if (pitchSummary) profileFields.pitchSummary = pitchSummary;
      if (fundingNeeded) profileFields.fundingNeeded = fundingNeeded;
      if (teamSize !== undefined) profileFields.teamSize = teamSize;
      if (foundedYear !== undefined) profileFields.foundedYear = foundedYear;
    } else if (role === 'investor') {
      if (investmentInterests) profileFields.investmentInterests = investmentInterests;
      if (investmentStage) profileFields.investmentStage = investmentStage;
      if (portfolioCompanies) profileFields.portfolioCompanies = portfolioCompanies;
      if (minimumInvestment) profileFields.minimumInvestment = minimumInvestment;
      if (maximumInvestment) profileFields.maximumInvestment = maximumInvestment;
    }
    
    if (email) {
      // Check if email is already in use by another user
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser.id.toString() !== req.user.id) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      profileFields.email = email;
    }
    
    // Update user
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: profileFields },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    
    // Get user with password
    const user = await User.findById(req.user.id);
    
    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};