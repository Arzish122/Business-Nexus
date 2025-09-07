const express = require('express');
const router = express.Router();
const VideoCall = require('../models/VideoCall');
const authMiddleware = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Create a new video call room
router.post('/', async (req, res) => {
  try {
    const { title, description, scheduledTime, maxParticipants, isPublic, settings } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const roomId = 'room_' + uuidv4().replace(/-/g, '').substr(0, 12);
    
    const videoCall = new VideoCall({
      roomId,
      title,
      description: description || '',
      organizer: req.user._id,
      scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
      maxParticipants: maxParticipants || 10,
      isPublic: isPublic || false,
      settings: {
        allowScreenShare: settings?.allowScreenShare !== false,
        allowChat: settings?.allowChat !== false,
        requireApproval: settings?.requireApproval || false
      }
    });

    await videoCall.save();
    await videoCall.populate('organizer', 'name email userType');
    
    res.status(201).json({
      message: 'Video call room created successfully',
      videoCall
    });
  } catch (error) {
    console.error('Error creating video call:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all video calls for the user
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id;
    
    const videoCalls = await VideoCall.find({
      $or: [
        { organizer: userId },
        { 'participants.userId': userId },
        { isPublic: true }
      ]
    })
    .populate('organizer', 'name email userType')
    .populate('participants.userId', 'name email userType')
    .sort({ createdAt: -1 });
    
    res.json(videoCalls);
  } catch (error) {
    console.error('Error fetching video calls:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific video call by room ID
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;
    
    const videoCall = await VideoCall.findOne({ roomId })
      .populate('organizer', 'name email userType')
      .populate('participants.userId', 'name email userType');
    
    if (!videoCall) {
      return res.status(404).json({ message: 'Video call not found' });
    }
    
    // Check if user has access to this call
    const hasAccess = videoCall.isPublic || 
                     videoCall.organizer._id.toString() === userId.toString() ||
                     videoCall.participants.some(p => p.userId._id.toString() === userId.toString());
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(videoCall);
  } catch (error) {
    console.error('Error fetching video call:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join a video call room
router.post('/:roomId/join', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;
    
    const videoCall = await VideoCall.findOne({ roomId });
    
    if (!videoCall) {
      return res.status(404).json({ message: 'Video call not found' });
    }
    
    // Check if room is at capacity
    const activeParticipants = videoCall.participants.filter(p => p.isActive).length;
    if (activeParticipants >= videoCall.maxParticipants) {
      return res.status(400).json({ message: 'Room is at maximum capacity' });
    }
    
    // Check if user is already in the call
    const existingParticipant = videoCall.participants.find(
      p => p.userId.toString() === userId.toString()
    );
    
    if (existingParticipant) {
      existingParticipant.isActive = true;
      existingParticipant.joinedAt = new Date();
    } else {
      videoCall.participants.push({
        userId,
        joinedAt: new Date(),
        isActive: true
      });
    }
    
    // Update call status if it's the first participant
    if (videoCall.status === 'scheduled' && !videoCall.startTime) {
      videoCall.status = 'active';
      videoCall.startTime = new Date();
    }
    
    await videoCall.save();
    await videoCall.populate('organizer', 'name email userType');
    await videoCall.populate('participants.userId', 'name email userType');
    
    res.json({
      message: 'Successfully joined video call',
      videoCall
    });
  } catch (error) {
    console.error('Error joining video call:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave a video call room
router.post('/:roomId/leave', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;
    
    const videoCall = await VideoCall.findOne({ roomId });
    
    if (!videoCall) {
      return res.status(404).json({ message: 'Video call not found' });
    }
    
    const participant = videoCall.participants.find(
      p => p.userId.toString() === userId.toString()
    );
    
    if (participant) {
      participant.isActive = false;
    }
    
    // End call if no active participants
    const activeParticipants = videoCall.participants.filter(p => p.isActive).length;
    if (activeParticipants === 0 && videoCall.status === 'active') {
      videoCall.status = 'ended';
      videoCall.endTime = new Date();
    }
    
    await videoCall.save();
    
    res.json({
      message: 'Successfully left video call',
      videoCall
    });
  } catch (error) {
    console.error('Error leaving video call:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// End a video call (organizer only)
router.patch('/:roomId/end', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;
    
    const videoCall = await VideoCall.findOne({ roomId });
    
    if (!videoCall) {
      return res.status(404).json({ message: 'Video call not found' });
    }
    
    // Check if user is the organizer
    if (videoCall.organizer.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only the organizer can end the call' });
    }
    
    videoCall.status = 'ended';
    videoCall.endTime = new Date();
    
    // Mark all participants as inactive
    videoCall.participants.forEach(p => {
      p.isActive = false;
    });
    
    await videoCall.save();
    
    res.json({
      message: 'Video call ended successfully',
      videoCall
    });
  } catch (error) {
    console.error('Error ending video call:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a video call (organizer only)
router.delete('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;
    
    const videoCall = await VideoCall.findOne({ roomId });
    
    if (!videoCall) {
      return res.status(404).json({ message: 'Video call not found' });
    }
    
    // Check if user is the organizer
    if (videoCall.organizer.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only the organizer can delete the call' });
    }
    
    await VideoCall.deleteOne({ roomId });
    
    res.json({ message: 'Video call deleted successfully' });
  } catch (error) {
    console.error('Error deleting video call:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;