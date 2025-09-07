const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Configuration
const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    throw new Error('Error hashing password: ' + error.message);
  }
};

/**
 * Compare a plain text password with a hashed password
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} - True if passwords match
 */
const comparePassword = async (password, hashedPassword) => {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    throw new Error('Error comparing passwords: ' + error.message);
  }
};

/**
 * Generate a secure JWT token
 * @param {object} payload - Data to include in token
 * @param {string} expiresIn - Token expiration time
 * @returns {string} - JWT token
 */
const generateToken = (payload, expiresIn = JWT_EXPIRES_IN) => {
  try {
    const token = jwt.sign(
      {
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        jti: crypto.randomUUID() // Unique token ID for revocation
      },
      JWT_SECRET,
      {
        expiresIn,
        issuer: 'nexus-app',
        audience: 'nexus-users'
      }
    );
    return token;
  } catch (error) {
    throw new Error('Error generating token: ' + error.message);
  }
};

/**
 * Generate both access and refresh tokens
 * @param {object} payload - User data to include in tokens
 * @returns {object} - Object containing access and refresh tokens
 */
const generateTokenPair = (payload) => {
  try {
    const accessToken = generateToken(payload, JWT_EXPIRES_IN);
    const refreshToken = generateToken(
      { userId: payload.userId, type: 'refresh' },
      REFRESH_TOKEN_EXPIRES_IN
    );
    
    return {
      accessToken,
      refreshToken,
      expiresIn: JWT_EXPIRES_IN
    };
  } catch (error) {
    throw new Error('Error generating token pair: ' + error.message);
  }
};

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {object} - Decoded token payload
 */
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'nexus-app',
      audience: 'nexus-users'
    });
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed: ' + error.message);
    }
  }
};

/**
 * Generate a secure random password
 * @param {number} length - Password length (default: 12)
 * @returns {string} - Generated password
 */
const generateSecurePassword = (length = 12) => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = lowercase + uppercase + numbers + symbols;
  
  let password = '';
  
  // Ensure at least one character from each category
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Check password strength
 * @param {string} password - Password to check
 * @returns {object} - Password strength analysis
 */
const checkPasswordStrength = (password) => {
  const analysis = {
    score: 0,
    feedback: [],
    isStrong: false
  };
  
  // Length check
  if (password.length >= 8) {
    analysis.score += 1;
  } else {
    analysis.feedback.push('Password should be at least 8 characters long');
  }
  
  if (password.length >= 12) {
    analysis.score += 1;
  }
  
  // Character variety checks
  if (/[a-z]/.test(password)) {
    analysis.score += 1;
  } else {
    analysis.feedback.push('Password should contain lowercase letters');
  }
  
  if (/[A-Z]/.test(password)) {
    analysis.score += 1;
  } else {
    analysis.feedback.push('Password should contain uppercase letters');
  }
  
  if (/\d/.test(password)) {
    analysis.score += 1;
  } else {
    analysis.feedback.push('Password should contain numbers');
  }
  
  if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    analysis.score += 1;
  } else {
    analysis.feedback.push('Password should contain special characters');
  }
  
  // Common patterns check
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /abc123/i,
    /(.)\1{2,}/ // Repeated characters
  ];
  
  const hasCommonPattern = commonPatterns.some(pattern => pattern.test(password));
  if (hasCommonPattern) {
    analysis.score -= 2;
    analysis.feedback.push('Password contains common patterns');
  }
  
  analysis.isStrong = analysis.score >= 5 && analysis.feedback.length === 0;
  
  return analysis;
};

/**
 * Generate a secure random token for password reset, email verification, etc.
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} - Hex encoded token
 */
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a token for secure storage
 * @param {string} token - Token to hash
 * @returns {string} - Hashed token
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate OTP for 2FA
 * @param {number} length - OTP length (default: 6)
 * @returns {string} - Generated OTP
 */
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  
  return otp;
};

/**
 * Validate OTP format
 * @param {string} otp - OTP to validate
 * @param {number} expectedLength - Expected OTP length
 * @returns {boolean} - True if OTP format is valid
 */
const validateOTPFormat = (otp, expectedLength = 6) => {
  const otpRegex = new RegExp(`^\\d{${expectedLength}}$`);
  return otpRegex.test(otp);
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  generateTokenPair,
  verifyToken,
  generateSecurePassword,
  checkPasswordStrength,
  generateSecureToken,
  hashToken,
  generateOTP,
  validateOTPFormat
};