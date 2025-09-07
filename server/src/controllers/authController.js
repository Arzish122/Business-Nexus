const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { hashPassword, comparePassword, generateTokenPair, checkPasswordStrength } = require('../utils/password');
const { generateAndSendOTP, verifyOTP } = require('../services/twoFactorAuth');
const { sanitizeInput } = require('../middleware/validation');

// Register a new user
exports.signup = async (req, res) => {
  try {
    console.log('=== SIGNUP REQUEST DEBUG ===');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Request body values:', req.body);
    console.log('firstName:', req.body.firstName, 'length:', req.body.firstName?.length);
    console.log('lastName:', req.body.lastName, 'length:', req.body.lastName?.length);
    console.log('email:', req.body.email);
    console.log('userType:', req.body.userType);
    console.log('password length:', req.body.password?.length);
    console.log('==============================');
    
    let { name, email, password, userType, firstName, lastName } = req.body;

    // Sanitize inputs
    firstName = sanitizeInput(firstName || '');
    lastName = sanitizeInput(lastName || '');
    email = email?.toLowerCase().trim();
    userType = userType?.toLowerCase();

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !userType) {
      console.log('Missing required fields:', { firstName, lastName, email, password: password ? 'provided' : 'missing', userType });
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required' 
      });
    }

    // Check password strength
    if (!password || password.length < 6) {
  return res.status(400).json({
    success: false,
    message: 'Password must be at least 6 characters long'
  });
}


    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      console.log('User already exists with email:', email);
      return res.status(400).json({ 
        success: false,
        message: 'User already exists' 
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const fullName = `${firstName} ${lastName}`;
    user = new User({
      name: fullName,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      userType,
      role: userType === 'investor' ? 'investor' : 'entrepreneur',
      emailVerified: false,
      twoFactorEnabled: false,
      status: 'active'
    });

    console.log('Attempting to save new user:', { name: fullName, email, userType });
    
    // Save user to database
    await user.save();
    console.log('User saved successfully with ID:', user._id);

    // Generate token pair
    const tokenPair = generateTokenPair({
      userId: user._id,
      email: user.email,
      role: user.role,
      userType: user.userType
    });

    // Send email verification OTP (optional)
    try {
      await generateAndSendOTP(user._id.toString(), user.email, 'email_verification');
    } catch (otpError) {
      console.warn('Failed to send verification email:', otpError.message);
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
        role: user.role,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
  } catch (error) {
    console.error('Signup error:', error.message);
    console.error('Full error:', error);
    
    // Check for validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: validationErrors.join(', ') 
      });
    }
    
    // Check for duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: 'Email already in use' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error: ' + error.message 
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    console.log('Login request received:', req.body);
    let { email, password, otpCode, rememberMe } = req.body;

    // Sanitize inputs
    email = email?.toLowerCase().trim();

    // Validate required fields
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found with email:', email);
      return res.status(400).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Check if user account is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended or inactive'
      });
    }

    console.log('User found:', { id: user._id, email: user.email });

    // Check password using bcrypt
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      console.log('Password mismatch');
      return res.status(400).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    console.log('Password match successful');

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      if (!otpCode) {
        // Send OTP for 2FA
        try {
          await generateAndSendOTP(user._id.toString(), user.email, 'login');
          return res.status(200).json({
            success: true,
            requiresTwoFactor: true,
            message: 'OTP sent to your email. Please verify to complete login.',
            tempToken: jwt.sign(
              { userId: user._id, step: 'awaiting_2fa' },
              process.env.JWT_SECRET || 'nexus-secret-key',
              { expiresIn: '10m' }
            )
          });
        } catch (otpError) {
          console.error('Failed to send OTP:', otpError.message);
          return res.status(500).json({
            success: false,
            message: 'Failed to send verification code'
          });
        }
      } else {
        // Verify OTP
        const otpVerification = await verifyOTP(user._id.toString(), otpCode, 'login');
        if (!otpVerification.success) {
          return res.status(400).json({
            success: false,
            message: otpVerification.message
          });
        }
      }
    }

    // Generate token pair
    const tokenPair = generateTokenPair({
      userId: user._id,
      email: user.email,
      role: user.role || user.userType,
      userType: user.userType
    }, rememberMe ? '30d' : '1d');

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    console.log('Login successful, tokens generated');

    res.json({
      success: true,
      message: 'Login successful',
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
        role: user.role || user.userType,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error: ' + error.message 
    });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
        role: user.role || user.userType,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get current user error:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Server error: ' + error.message 
    });
  }
};

// Refresh access token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'nexus-refresh-secret');
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Get user
    const user = await User.findById(decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Generate new token pair
    const tokenPair = generateTokenPair({
      userId: user._id,
      email: user.email,
      role: user.role || user.userType,
      userType: user.userType
    });

    res.json({
      success: true,
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn
    });
  } catch (error) {
    console.error('Refresh token error:', error.message);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }
};

// Enable/Disable 2FA
exports.toggle2FA = async (req, res) => {
  try {
    const { enable, otpCode } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (enable) {
      if (!otpCode) {
        // Send OTP to enable 2FA
        await generateAndSendOTP(userId, user.email, 'Two Step Verification');
        return res.json({
          success: true,
          message: 'OTP sent to your email.'
        });
      } else {
        // Verify OTP and enable 2FA
        const verification = await verifyOTP(userId, otpCode, 'Two Step Verification');
        if (!verification.success) {
          return res.status(400).json({
            success: false,
            message: verification.message
          });
        }

        user.twoFactorEnabled = true;
        await user.save();

        return res.json({
          success: true,
          message: '2FA enabled '
        });
      }
    } else {
      // Disable 2FA
      user.twoFactorEnabled = false;
      await user.save();

      res.json({
        success: true,
        message: '2FA disabled '
      });
    }
  } catch (error) {
    console.error('Toggle 2FA error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

// Verify email
exports.verifyEmail = async (req, res) => {
  try {
    const { otpCode } = req.body;
    const userId = req.user.userId;

    if (!otpCode) {
      return res.status(400).json({
        success: false,
        message: 'OTP code is required'
      });
    }

    const verification = await verifyOTP(userId, otpCode, 'email_verification');
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.message
      });
    }

    // Update user email verification status
    await User.findByIdAndUpdate(userId, { emailVerified: true });

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

// Resend verification email
exports.resendVerification = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    await generateAndSendOTP(userId, user.email, 'email_verification');

    res.json({
      success: true,
      message: 'Verification email sent '
    });
  } catch (error) {
    console.error('Resend verification error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    let { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    // Check password strength
    if (!password || password.length < 6) {
  return res.status(400).json({
    success: false,
    message: 'Password must be at least 6 characters long'
  });
}


    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: ' Password is incorrect'
      });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);
    
    // Update password
    user.password = hashedNewPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

// Logout (invalidate tokens)
exports.logout = async (req, res) => {
  try {
    
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};