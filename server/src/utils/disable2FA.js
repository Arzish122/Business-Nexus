const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: 'c:\\Users\\Miraan Gee\\Desktop\\nexus\\server\\.env' });

const disable2FA = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the user and disable 2FA
    const userEmail = 'arzishkhan454@gmail.com';
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      console.log('User not found:', userEmail);
      return;
    }
    
    console.log('User found:', user.name);
    console.log('Current 2FA status:', user.twoFactorEnabled);
    
    if (user.twoFactorEnabled) {
      user.twoFactorEnabled = false;
      await user.save();
      console.log('2FA disabled successfully for user:', userEmail);
    } else {
      console.log('2FA was already disabled for user:', userEmail);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

disable2FA();