const nodemailer = require('nodemailer');
const { generateOTP, validateOTPFormat, hashToken } = require('../utils/password');
const User = require('../models/User');

// Email configuration
const createEmailTransporter = () => {
  // For development/testing - using Ethereal Email (fake SMTP)
  if (process.env.NODE_ENV !== 'production') {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.ETHEREAL_EMAIL || 'ethereal.user@ethereal.email',
        pass: process.env.ETHEREAL_PASS || 'ethereal.pass'
      }
    });
  }
  
  // For production - configure with your actual email service
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail', // or 'outlook', 'yahoo', etc.
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// In-memory OTP storage (in production, use Redis or database)
const otpStorage = new Map();

// OTP configuration
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 3;
const OTP_COOLDOWN_MINUTES = 5;

/**
 * Generate and send OTP via email
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @param {string} purpose - Purpose of OTP (login, password_reset, etc.)
 * @returns {Promise<object>} - Result object
 */
const generateAndSendOTP = async (userId, email, purpose = 'login') => {
  try {
    // Check if user is in cooldown period
    const cooldownKey = `cooldown_${userId}`;
    const cooldownData = otpStorage.get(cooldownKey);
    
    if (cooldownData && Date.now() < cooldownData.expiresAt) {
      const remainingTime = Math.ceil((cooldownData.expiresAt - Date.now()) / 60000);
      throw new Error(`Please wait ${remainingTime} minutes before requesting a new OTP`);
    }
    
    // Generate OTP
    const otp = generateOTP(6);
    const otpKey = `otp_${userId}_${purpose}`;
    const expiresAt = Date.now() + (OTP_EXPIRY_MINUTES * 60 * 1000);
    
    // Store OTP with metadata
    otpStorage.set(otpKey, {
      otp: hashToken(otp), // Store hashed version
      expiresAt,
      attempts: 0,
      purpose,
      email
    });
    
    // Send OTP via email
    const emailSent = await sendOTPEmail(email, otp, purpose);
    
    if (!emailSent.success) {
      // Clean up stored OTP if email failed
      otpStorage.delete(otpKey);
      throw new Error('Failed to send OTP email');
    }
    
    return {
      success: true,
      message: 'OTP sent successfully',
      expiresIn: OTP_EXPIRY_MINUTES,
      emailInfo: emailSent.info
    };
    
  } catch (error) {
    console.error('Error generating OTP:', error);
    throw error;
  }
};

/**
 * Verify OTP
 * @param {string} userId - User ID
 * @param {string} otp - OTP to verify
 * @param {string} purpose - Purpose of OTP
 * @returns {Promise<object>} - Verification result
 */
const verifyOTP = async (userId, otp, purpose = 'login') => {
  try {
    // Validate OTP format
    if (!validateOTPFormat(otp, 6)) {
      throw new Error('Invalid OTP format');
    }
    
    const otpKey = `otp_${userId}_${purpose}`;
    const storedOTPData = otpStorage.get(otpKey);
    
    if (!storedOTPData) {
      throw new Error('OTP not found or expired');
    }
    
    // Check if OTP has expired
    if (Date.now() > storedOTPData.expiresAt) {
      otpStorage.delete(otpKey);
      throw new Error('OTP has expired');
    }
    
    // Check attempt limit
    if (storedOTPData.attempts >= MAX_OTP_ATTEMPTS) {
      otpStorage.delete(otpKey);
      // Set cooldown
      const cooldownKey = `cooldown_${userId}`;
      otpStorage.set(cooldownKey, {
        expiresAt: Date.now() + (OTP_COOLDOWN_MINUTES * 60 * 1000)
      });
      throw new Error('Too many failed attempts. Please request a new OTP.');
    }
    
    // Verify OTP
    const hashedInputOTP = hashToken(otp);
    const isValid = hashedInputOTP === storedOTPData.otp;
    
    if (!isValid) {
      // Increment attempt counter
      storedOTPData.attempts += 1;
      otpStorage.set(otpKey, storedOTPData);
      
      const remainingAttempts = MAX_OTP_ATTEMPTS - storedOTPData.attempts;
      throw new Error(`Invalid OTP. ${remainingAttempts} attempts remaining.`);
    }
    
    // OTP is valid - clean up
    otpStorage.delete(otpKey);
    
    // Update user's 2FA verification status if needed
    if (purpose === 'login') {
      await User.findByIdAndUpdate(userId, {
        lastTwoFactorVerification: new Date(),
        $inc: { twoFactorVerificationCount: 1 }
      });
    }
    
    return {
      success: true,
      message: 'OTP verified successfully',
      purpose
    };
    
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
};

/**
 * Send OTP via email
 * @param {string} email - Recipient email
 * @param {string} otp - OTP to send
 * @param {string} purpose - Purpose of OTP
 * @returns {Promise<object>} - Email sending result
 */
const chalk = require("chalk");
const sendOTPEmail = async (email, otp, purpose) => {
  try {
    // For development - skip actual email sending and just log OTP
    if (process.env.NODE_ENV !== '') {
      console.log(`\n OTP FOR EMAIL `);
      console.log(`To: ${email}`);
      console.log(`Purpose: ${purpose}`);
      console.log(`OTP: ${otp}`);
      console.log(`Expires in: ${OTP_EXPIRY_MINUTES} minutes`);
      
      
      return {
        success: true,
        info: {
          messageId: 'dev-mode-' + Date.now(),
          previewUrl: null
        }
      };
    }
    
    const transporter = createEmailTransporter();
    
    // Email templates based on purpose
    const emailTemplates = {
      login: {
        subject: 'Your Nexus Login Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; text-align: center;">Nexus Security Verification</h2>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #495057; margin-top: 0;">Your verification code is:</h3>
              <div style="font-size: 32px; font-weight: bold; color: #007bff; text-align: center; letter-spacing: 5px; margin: 20px 0;">
                ${otp}
              </div>
              <p style="color: #6c757d; margin-bottom: 0;">This code will expire in ${OTP_EXPIRY_MINUTES} minutes.</p>
            </div>
            <p style="color: #495057;">If you didn't request this verification code, please ignore this email or contact support if you have concerns.</p>
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
            <p style="color: #6c757d; font-size: 12px; text-align: center;">This is an automated message from Nexus. Please do not reply to this email.</p>
          </div>
        `
      },
      password_reset: {
        subject: 'Your Nexus Password Reset Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <h3 style="color: #856404; margin-top: 0;">Your password reset code is:</h3>
              <div style="font-size: 32px; font-weight: bold; color: #856404; text-align: center; letter-spacing: 5px; margin: 20px 0;">
                ${otp}
              </div>
              <p style="color: #856404; margin-bottom: 0;">This code will expire in ${OTP_EXPIRY_MINUTES} minutes.</p>
            </div>
            <p style="color: #495057;">If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
            <p style="color: #6c757d; font-size: 12px; text-align: center;">This is an automated message from Nexus. Please do not reply to this email.</p>
          </div>
        `
      },
      email_verification: {
        subject: 'Verify Your Nexus Email Address',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; text-align: center;">Email Verification</h2>
            <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
              <h3 style="color: #0c5460; margin-top: 0;">Your email verification code is:</h3>
              <div style="font-size: 32px; font-weight: bold; color: #0c5460; text-align: center; letter-spacing: 5px; margin: 20px 0;">
                ${otp}
              </div>
              <p style="color: #0c5460; margin-bottom: 0;">This code will expire in ${OTP_EXPIRY_MINUTES} minutes.</p>
            </div>
            <p style="color: #495057;">Please enter this code to verify your email address and complete your account setup.</p>
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
            <p style="color: #6c757d; font-size: 12px; text-align: center;">This is an automated message from Nexus. Please do not reply to this email.</p>
          </div>
        `
      }
    };
    
    const template = emailTemplates[purpose] || emailTemplates.login;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Nexus Security" <noreply@nexus.com>',
      to: email,
      subject: template.subject,
      html: template.html
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    // For development - log the preview URL
    if (process.env.NODE_ENV !== 'production') {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return {
      success: true,
      info: {
        messageId: info.messageId,
        previewUrl: process.env.NODE_ENV !== 'production' ? nodemailer.getTestMessageUrl(info) : null
      }
    };
    
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Clean up expired OTPs (should be called periodically)
 */
const cleanupExpiredOTPs = () => {
  const now = Date.now();
  for (const [key, data] of otpStorage.entries()) {
    if (data.expiresAt && now > data.expiresAt) {
      otpStorage.delete(key);
    }
  }
};

/**
 * Get OTP statistics for monitoring
 * @returns {object} - OTP statistics
 */
const getOTPStats = () => {
  const stats = {
    totalActive: 0,
    byPurpose: {},
    cooldowns: 0
  };
  
  for (const [key, data] of otpStorage.entries()) {
    if (key.startsWith('otp_')) {
      stats.totalActive++;
      const purpose = data.purpose || 'unknown';
      stats.byPurpose[purpose] = (stats.byPurpose[purpose] || 0) + 1;
    } else if (key.startsWith('cooldown_')) {
      stats.cooldowns++;
    }
  }
  
  return stats;
};

// Cleanup expired OTPs every 5 minutes
setInterval(cleanupExpiredOTPs, 5 * 60 * 1000);

module.exports = {
  generateAndSendOTP,
  verifyOTP,
  sendOTPEmail,
  cleanupExpiredOTPs,
  getOTPStats
};