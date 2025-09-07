const mongoose = require('mongoose');

const videoCallSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  scheduledTime: {
    type: Date,
    default: null
  },
  startTime: {
    type: Date,
    default: null
  },
  endTime: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'ended'],
    default: 'scheduled'
  },
  maxParticipants: {
    type: Number,
    default: 10
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  settings: {
    allowScreenShare: {
      type: Boolean,
      default: true
    },
    allowChat: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Generate unique room ID
videoCallSchema.pre('save', function(next) {
  if (!this.roomId) {
    this.roomId = 'room_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }
  next();
});

module.exports = mongoose.model('VideoCall', videoCallSchema);