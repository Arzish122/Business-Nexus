const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Meeting = require('../models/Meeting');

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

// Helper function to check for meeting conflicts
const checkMeetingConflicts = async (startTime, endTime, organizerId, participantIds = [], excludeMeetingId = null) => {
  const conflictQuery = {
    $and: [
      {
        $or: [
          // Check if new meeting starts during an existing meeting
          {
            startTime: { $lte: new Date(startTime) },
            endTime: { $gt: new Date(startTime) }
          },
          // Check if new meeting ends during an existing meeting
          {
            startTime: { $lt: new Date(endTime) },
            endTime: { $gte: new Date(endTime) }
          },
          // Check if new meeting completely encompasses an existing meeting
          {
            startTime: { $gte: new Date(startTime) },
            endTime: { $lte: new Date(endTime) }
          }
        ]
      },
      {
        status: { $ne: 'cancelled' } // Don't check cancelled meetings
      },
      {
        $or: [
          { organizerId: organizerId },
          { 'participants.userId': organizerId },
          { organizerId: { $in: participantIds } },
          { 'participants.userId': { $in: participantIds } }
        ]
      }
    ]
  };

  // Exclude the current meeting if updating
  if (excludeMeetingId) {
    conflictQuery.$and.push({ _id: { $ne: excludeMeetingId } });
  }

  const conflicts = await Meeting.find(conflictQuery);
  return conflicts;
};

// Get all meetings
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id.toString();
    
    // Find meetings where the user is either the organizer or a participant
    const meetings = await Meeting.find({
      $or: [
        { organizerId: userId },
        { 'participants.userId': userId }
      ]
    }).sort({ startTime: 1 });
    
    res.json(meetings);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new meeting
router.post('/', async (req, res) => {
  try {
    const { title, description, startTime, endTime, location, participants } = req.body;
    const organizerId = req.user._id.toString();
    
    // Validate required fields
    if (!title || !startTime || !endTime) {
      return res.status(400).json({ message: 'Missing required fields: title, startTime, and endTime are required' });
    }

    // Validate time logic
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (start >= end) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    if (start < new Date()) {
      return res.status(400).json({ message: 'Cannot schedule meetings in the past' });
    }

    // Check for conflicts
    const participantIds = participants || [];
    const conflicts = await checkMeetingConflicts(startTime, endTime, organizerId, participantIds);
    
    if (conflicts.length > 0) {
      const conflictDetails = conflicts.map(meeting => ({
        id: meeting._id,
        title: meeting.title,
        startTime: meeting.startTime,
        endTime: meeting.endTime
      }));
      
      return res.status(409).json({ 
        message: 'Meeting conflicts detected. One or more participants have overlapping meetings.',
        conflicts: conflictDetails
      });
    }
    
    // Create new meeting
    const newMeeting = new Meeting({
      title,
      description,
      startTime,
      endTime,
      location,
      organizerId,
      participants: participantIds.map(userId => ({ userId, status: 'pending' })),
      status: 'scheduled'
    });
    
    await newMeeting.save();
    
    res.status(201).json(newMeeting);
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single meeting by ID
router.get('/:id', async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Check if user has access to this meeting
    const userId = req.user._id.toString();
    const hasAccess = meeting.organizerId === userId || 
                     meeting.participants.some(p => p.userId === userId);
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(meeting);
  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update meeting status (for organizer)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.user._id.toString();
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    if (!['scheduled', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be: scheduled, cancelled, or completed' });
    }
    
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Only organizer can update meeting status
    if (meeting.organizerId !== userId) {
      return res.status(403).json({ message: 'Only the organizer can update meeting status' });
    }
    
    meeting.status = status;
    await meeting.save();
    
    res.json(meeting);
  } catch (error) {
    console.error('Error updating meeting status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept meeting invitation
router.patch('/:id/accept', async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Find participant
    const participantIndex = meeting.participants.findIndex(p => p.userId === userId);
    
    if (participantIndex === -1) {
      return res.status(403).json({ message: 'You are not invited to this meeting' });
    }

    // Check for conflicts before accepting
    const conflicts = await checkMeetingConflicts(
      meeting.startTime, 
      meeting.endTime, 
      userId, 
      [], 
      meeting._id
    );
    
    if (conflicts.length > 0) {
      const conflictDetails = conflicts.map(conflictMeeting => ({
        id: conflictMeeting._id,
        title: conflictMeeting.title,
        startTime: conflictMeeting.startTime,
        endTime: conflictMeeting.endTime
      }));
      
      return res.status(409).json({ 
        message: 'Cannot accept meeting due to scheduling conflicts.',
        conflicts: conflictDetails
      });
    }
    
    meeting.participants[participantIndex].status = 'accepted';
    await meeting.save();
    
    res.json({ message: 'Meeting invitation accepted', meeting });
  } catch (error) {
    console.error('Error accepting meeting:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject meeting invitation
router.patch('/:id/reject', async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Find participant
    const participantIndex = meeting.participants.findIndex(p => p.userId === userId);
    
    if (participantIndex === -1) {
      return res.status(403).json({ message: 'You are not invited to this meeting' });
    }
    
    meeting.participants[participantIndex].status = 'rejected';
    await meeting.save();
    
    res.json({ message: 'Meeting invitation rejected', meeting });
  } catch (error) {
    console.error('Error rejecting meeting:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update meeting details (for organizer)
router.put('/:id', async (req, res) => {
  try {
    const { title, description, startTime, endTime, location, participants } = req.body;
    const userId = req.user._id.toString();
    
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Only organizer can update meeting
    if (meeting.organizerId !== userId) {
      return res.status(403).json({ message: 'Only the organizer can update meeting details' });
    }

    // If time is being updated, check for conflicts
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (start >= end) {
        return res.status(400).json({ message: 'End time must be after start time' });
      }

      if (start < new Date()) {
        return res.status(400).json({ message: 'Cannot schedule meetings in the past' });
      }

      const participantIds = participants || meeting.participants.map(p => p.userId);
      const conflicts = await checkMeetingConflicts(startTime, endTime, userId, participantIds, meeting._id);
      
      if (conflicts.length > 0) {
        const conflictDetails = conflicts.map(conflictMeeting => ({
          id: conflictMeeting._id,
          title: conflictMeeting.title,
          startTime: conflictMeeting.startTime,
          endTime: conflictMeeting.endTime
        }));
        
        return res.status(409).json({ 
          message: 'Meeting update conflicts detected.',
          conflicts: conflictDetails
        });
      }
    }

    // Update meeting fields
    if (title) meeting.title = title;
    if (description !== undefined) meeting.description = description;
    if (startTime) meeting.startTime = startTime;
    if (endTime) meeting.endTime = endTime;
    if (location !== undefined) meeting.location = location;
    if (participants) {
      meeting.participants = participants.map(userId => ({ userId, status: 'pending' }));
    }
    
    await meeting.save();
    
    res.json(meeting);
  } catch (error) {
    console.error('Error updating meeting:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a meeting
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }
    
    // Only the organizer can delete a meeting
    if (meeting.organizerId !== userId) {
      return res.status(403).json({ message: 'Only the organizer can delete this meeting' });
    }
    
    await Meeting.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;