const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdraw', 'transfer'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    required: true
  },
  description: {
    type: String,
    required: true
  },
  // For transfers
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Payment gateway details
  paymentMethod: {
    type: String,
    enum: ['stripe', 'paypal', 'bank_transfer'],
    required: true
  },
  paymentIntentId: {
    type: String // Stripe payment intent ID
  },
  paypalOrderId: {
    type: String // PayPal order ID
  },
  // Transaction metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Error details for failed transactions
  errorMessage: {
    type: String
  },
  // Processing timestamps
  processedAt: {
    type: Date
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
TransactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ type: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);