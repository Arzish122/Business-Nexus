const mongoose = require('mongoose');

const SignatureSchema = new mongoose.Schema({
  signedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  signatureImageUrl: {
    type: String,
    required: true
  },
  signedAt: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String
  }
});

const DocumentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  version: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'approved', 'rejected', 'signed'],
    default: 'draft'
  },
  
  isPublic: {
    type: Boolean,
    default: false
  },
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['view', 'edit', 'sign'],
      default: 'view'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  signatures: [SignatureSchema],
  requiresSignature: {
    type: Boolean,
    default: false
  },
  signatureDeadline: {
    type: Date
  },
  metadata: {
    pageCount: { type: Number },
    wordCount: { type: Number },
    lastModified: { type: Date, default: Date.now }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
DocumentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
DocumentSchema.index({ uploadedBy: 1, createdAt: -1 });
DocumentSchema.index({ status: 1 });
DocumentSchema.index({ tags: 1 });

module.exports = mongoose.model('Document', DocumentSchema);