const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');
const User = require('../models/User');
require('dotenv').config({ path: 'c:\\Users\\Miraan Gee\\Desktop\\nexus\\server\\.env' });

const createTestMeeting = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find users to use as organizer and participant
    const users = await User.find().limit(2);
    console.log('Found users:', users.map(u => ({ id: u._id, name: u.name, email: u.email })));
    
    if (users.length < 2) {
      console.log('Need at least 2 users to create a test meeting');
      return;
    }
    
    const organizer = users[0];
    const participant = users[1];
    
    // Create a test meeting with participants
    const testMeeting = new Meeting({
      title: 'Test Meeting for Accept/Decline',
      description: 'Testing accept/decline functionality',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // Tomorrow + 1 hour
      location: 'Test Location',
      organizerId: organizer._id,
      participants: [
        { userId: participant._id, status: 'pending' }
      ],
      status: 'scheduled'
    });
    
    await testMeeting.save();
    console.log('Test meeting created successfully!');
    console.log('Meeting ID:', testMeeting._id);
    console.log('Organizer:', organizer.name, '(' + organizer.email + ')');
    console.log('Participant:', participant.name, '(' + participant.email + ')');
    console.log('Participant can accept/decline this meeting');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

createTestMeeting();