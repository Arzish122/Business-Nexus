const crypto = require('crypto');
const nodemailer = require('nodemailer');

// In-memory storage for OTPs (in production, use Redis or database)
const otpStorage = new Map();

// Email transporter configuration (using Gmail for demo)
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'demo@nexus.com',
      pass: process.env.EMAIL_PASS || 'demo_password'
    }
  });
};

// Generate a 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Store OTP with expiration (5 minutes)
const storeOTP = (userId, otp) => {
  const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes
  otpStorage.set(userId, {
    otp,
    expiresAt,
    attempts: 0
  });
};

// Verify OTP
const verifyOTP = (userId, providedOTP) => {
  const stored = otpStorage.get(userId);
  
  if (!stored) {
    return { success: false, message: 'No OTP found. Please request a new one.' };
  }
  
  if (Date.now() > stored.expiresAt) {
    otpStorage.delete(userId);
    return { success: false, message: 'OTP has expired. Please request a new one.' };
  }
  
  if (stored.attempts >= 3) {
    otpStorage.delete(userId);
    return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }
  
  if (stored.otp !== providedOTP) {
    stored.attempts++;
    return { 
      success: false, 
      message: `Invalid OTP. ${3 - stored.attempts} attempts remaining.` 
    };
  }
  
  // OTP is valid
  otpStorage.delete(userId);
  return { success: true, message: 'OTP verified successfully.' };
};

// Send OTP via email (mockup - logs to console in demo mode)
const sendOTPEmail = async (email, otp, purpose = 'verification') => {
  try {
    // In demo mode, just log the OTP
    if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_USER) {
      console.log(`\n=== 2FA OTP EMAIL (DEMO MODE) ===`);
      console.log(`To: ${email}`);
      console.log(`Purpose: ${purpose}`);
      console.log(`OTP Code: ${otp}`);
      console.log(`Expires: ${new Date(Date.now() + 5 * 60 * 1000).toLocaleString()}`);
      console.log(`================================\n`);
      return { success: true, messageId: 'demo-' + Date.now() };
    }
    
    // Real email sending (when configured)
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@nexus.com',
      to: email,
      subject: `Nexus - Your ${purpose} Code`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Nexus Security Code</h2>
          <p>Your ${purpose} code is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${otp}</span>
          </div>
          <p style="color: #6b7280;">This code will expire in 5 minutes.</p>
          <p style="color: #6b7280;">If you didn't request this code, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px;">Nexus - Connecting Entrepreneurs & Investors</p>
        </div>
      `
    };
    
    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
};

// Generate and send OTP for user
const generateAndSendOTP = async (userId, email, purpose = 'verification') => {
  try {
    const otp = generateOTP();
    storeOTP(userId, otp);
    
    const emailResult = await sendOTPEmail(email, otp, purpose);
    
    if (emailResult.success) {
      return {
        success: true,
        message: 'OTP sent successfully to your email.',
        messageId: emailResult.messageId
      };
    } else {
      return {
        success: false,
        message: 'Failed to send OTP email. Please try again.',
        error: emailResult.error
      };
    }
  } catch (error) {
    console.error('OTP generation error:', error);
    return {
      success: false,
      message: 'Failed to generate OTP. Please try again.',
      error: error.message
    };
  }
};

// Clean up expired OTPs (run periodically)
const cleanupExpiredOTPs = () => {
  const now = Date.now();
  for (const [userId, data] of otpStorage.entries()) {
    if (now > data.expiresAt) {
      otpStorage.delete(userId);
    }
  }
};

// Run cleanup every 10 minutes
setInterval(cleanupExpiredOTPs, 10 * 60 * 1000);

module.exports = {
  generateOTP,
  generateAndSendOTP,
  verifyOTP,
  sendOTPEmail,
  cleanupExpiredOTPs
};