const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  userType: {
    type: String,
    enum: ['entrepreneur', 'investor'],
    required: true
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'investor', 'entrepreneur', 'user'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  bio: {
    type: String,
    default: ''
  },
  avatarUrl: {
    type: String,
    default: '/default-avatar.png'
  },
  location: {
    type: String
  },
  website: {
    type: String
  },
  social: {
    linkedin: { type: String },
    twitter: { type: String },
    instagram: { type: String }
  },
  // Entrepreneur specific fields
  startupName: { type: String },
  industry: { type: String },
  pitchSummary: { type: String },
  fundingNeeded: { type: String },
  teamSize: { type: Number },
  foundedYear: { type: Number },
  // Investor specific fields
  investmentInterests: { type: [String] },
  investmentStage: { type: [String] },
  portfolioCompanies: { type: [String] },
  minimumInvestment: { type: String },
  maximumInvestment: { type: String },
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
UserSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for better query performance
UserSchema.index({ userType: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', UserSchema);