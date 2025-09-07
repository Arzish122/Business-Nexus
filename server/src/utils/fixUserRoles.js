const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus')
  .then(() => {
    console.log('Connected to MongoDB');
    fixUserRoles();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function fixUserRoles() {
  try {
    console.log('Starting user role fix...');
    
    // Find all users
    const users = await User.find({});
    console.log(`Found ${users.length} users`);
    
    for (const user of users) {
      console.log(`\nUser: ${user.email}`);
      console.log(`Current userType: ${user.userType}`);
      console.log(`Current role: ${user.role}`);
      
      // Fix role based on userType
      let newRole = user.userType;
      if (user.userType === 'entrepreneur') {
        newRole = 'entrepreneur';
      } else if (user.userType === 'investor') {
        newRole = 'investor';
      }
      
      if (user.role !== newRole) {
        console.log(`Updating role from '${user.role}' to '${newRole}'`);
        user.role = newRole;
        await user.save();
        console.log('✅ Role updated successfully');
      } else {
        console.log('✅ Role is already correct');
      }
    }
    
    console.log('\n🎉 User role fix completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing user roles:', error);
    process.exit(1);
  }
}