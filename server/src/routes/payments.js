// routes/payments.js
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const Transaction = require('../models/Transaction');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const {
  validatePayment,
  validateTransfer,
  validateWithdrawal,
  handleValidationErrors,
} = require('../middleware/validation');
const { paymentLimiter, transferLimiter } = require('../middleware/security');

/**
 * @route   POST /api/payments/webhook/stripe
 * @desc    Handle Stripe webhook events (raw body required!)
 * @access  Public
 */
router.post(
  '/webhook/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body, // raw Buffer
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('❌ Webhook signature failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`✅ Webhook verified: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        console.log('🎯 Handling payment_intent.succeeded:', pi.id);

        try {
          let transaction = await Transaction.findOne({ paymentIntentId: pi.id });

          if (transaction) {
            console.log('Found transaction:', transaction._id);
            transaction.status = 'completed';
            transaction.processedAt = new Date();
            await transaction.save();

            const user = await User.findById(transaction.userId);
            if (user) {
              user.balance = (user.balance || 0) + transaction.amount;
              await user.save();
              console.log(`💰 Balance updated for ${user.email}`);
            }
          } else {
            // Fallback: no transaction found, credit user from metadata
            const userId = pi.metadata?.userId;
            if (userId) {
              const user = await User.findById(userId);
              if (user) {
                const amount = pi.amount_received / 100;
                user.balance = (user.balance || 0) + amount;
                await user.save();

                await Transaction.create({
                  userId,
                  type: 'deposit',
                  amount,
                  description: `Stripe deposit via webhook`,
                  paymentMethod: 'stripe',
                  status: 'completed',
                  paymentIntentId: pi.id,
                  processedAt: new Date(),
                });

                console.log(`💰 Balance credited via metadata for ${user.email}`);
              }
            }
          }
        } catch (err) {
          console.error('⚠️ Error handling payment success:', err);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const failed = event.data.object;
        console.log('⚠️ Payment failed:', failed.id);

        try {
          const transaction = await Transaction.findOne({ paymentIntentId: failed.id });
          if (transaction) {
            transaction.status = 'failed';
            transaction.errorMessage =
              failed.last_payment_error?.message || 'Payment failed';
            await transaction.save();
          }
        } catch (err) {
          console.error('⚠️ Error handling payment failure:', err);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  }
);

// --- Protect all other routes after webhook ---
router.use(authMiddleware);

/**
 * @route   POST /api/payments/deposit
 * @desc    Create deposit transaction
 * @access  Private
 */
router.post(
  '/deposit',
  paymentLimiter,
  validatePayment,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { amount, paymentMethod = 'stripe' } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid amount' });
      }

      const transaction = new Transaction({
        userId: req.user._id,
        type: 'deposit',
        amount: parseFloat(amount),
        description: `Deposit of $${amount}`,
        paymentMethod,
        status: 'pending',
      });

      if (paymentMethod === 'stripe') {
        try {
          const pi = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: 'usd',
            metadata: {
              userId: req.user._id.toString(),
              transactionId: transaction._id.toString(),
              type: 'deposit',
            },
          });
          transaction.paymentIntentId = pi.id;
        } catch (err) {
          console.error('⚠️ Stripe error:', err.message);
          transaction.status = 'completed';
          transaction.paymentIntentId = `demo_pi_${Date.now()}`;

          const user = await User.findById(req.user._id);
          if (user) {
            user.balance = (user.balance || 0) + transaction.amount;
            await user.save();
          }
        }
      } else {
        transaction.status = 'completed';
        const user = await User.findById(req.user._id);
        if (user) {
          user.balance = (user.balance || 0) + transaction.amount;
          await user.save();
        }
      }

      await transaction.save();
      await transaction.populate('userId', 'name email');

      let clientSecret = null;
      if (paymentMethod === 'stripe' && transaction.paymentIntentId && !transaction.paymentIntentId.startsWith('demo_')) {
        const pi = await stripe.paymentIntents.retrieve(transaction.paymentIntentId);
        clientSecret = pi.client_secret;
      }

      res.status(201).json({
        success: true,
        message: 'Deposit created',
        transaction,
        clientSecret,
      });
    } catch (error) {
      console.error('Deposit error:', error);
      res.status(500).json({ success: false, message: 'Server error during deposit' });
    }
  }
);

/**
 * @route   POST /api/payments/withdraw
 * @desc    Create withdrawal transaction
 * @access  Private
 */
router.post(
  '/withdraw',
  paymentLimiter,
  validateWithdrawal,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { amount } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid amount' });
      }

      const transaction = new Transaction({
        userId: req.user._id,
        type: 'withdraw',
        amount: parseFloat(amount),
        description: `Withdrawal of $${amount}`,
        paymentMethod: 'manual',
        status: 'pending',
      });

      await transaction.save();
      await transaction.populate('userId', 'name email');

      setTimeout(async () => {
        transaction.status = 'completed';
        transaction.processedAt = new Date();
        await transaction.save();

        const user = await User.findById(req.user._id);
        if (user) {
          user.balance = (user.balance || 0) - transaction.amount;
          await user.save();
        }
      }, 3000);

      res.status(201).json({ success: true, message: 'Withdrawal created', transaction });
    } catch (error) {
      console.error('Withdrawal error:', error);
      res.status(500).json({ success: false, message: 'Server error during withdrawal' });
    }
  }
);

/**
 * @route   POST /api/payments/transfer
 * @desc    Transfer funds between users
 * @access  Private
 */
router.post(
  '/transfer',
  transferLimiter,
  validateTransfer,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { amount, recipientId, description } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid amount' });
      }
      if (!recipientId) {
        return res.status(400).json({ success: false, message: 'Recipient required' });
      }
      if (recipientId === req.user._id.toString()) {
        return res.status(400).json({ success: false, message: 'Cannot transfer to yourself' });
      }

      const recipient = await User.findById(recipientId);
      if (!recipient) {
        return res.status(404).json({ success: false, message: 'Recipient not found' });
      }

      const transaction = new Transaction({
        userId: req.user._id,
        recipientId,
        type: 'transfer',
        amount: parseFloat(amount),
        description: description || `Transfer to ${recipient.name}`,
        paymentMethod: 'internal',
        status: 'pending',
      });

      await transaction.save();
      await transaction.populate('userId', 'name email');
      await transaction.populate('recipientId', 'name email');

      setTimeout(async () => {
        transaction.status = 'completed';
        transaction.processedAt = new Date();
        await transaction.save();

        const sender = await User.findById(req.user._id);
        const receiver = await User.findById(recipientId);
        if (sender && receiver) {
          sender.balance = (sender.balance || 0) - transaction.amount;
          receiver.balance = (receiver.balance || 0) + transaction.amount;
          await sender.save();
          await receiver.save();
        }
      }, 2000);

      res.status(201).json({ success: true, message: 'Transfer created', transaction });
    } catch (error) {
      console.error('Transfer error:', error);
      res.status(500).json({ success: false, message: 'Server error during transfer' });
    }
  }
);

/**
 * @route   GET /api/payments/transactions
 * @desc    List transactions
 * @access  Private
 */
router.get('/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status } = req.query;
    const query = { $or: [{ userId: req.user._id }, { recipientId: req.user._id }] };
    if (type && type !== 'all') query.type = type;
    if (status && status !== 'all') query.status = status;

    const transactions = await Transaction.find(query)
      .populate('userId', 'name email')
      .populate('recipientId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching transactions' });
  }
});

/**
 * @route   GET /api/payments/transactions/:id
 * @desc    Get single transaction
 * @access  Private
 */
router.get('/transactions/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('recipientId', 'name email');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const hasAccess =
      transaction.userId._id.toString() === req.user._id.toString() ||
      (transaction.recipientId &&
        transaction.recipientId._id.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, transaction });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching transaction' });
  }
});

module.exports = router;
