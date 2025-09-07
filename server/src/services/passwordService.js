const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Salt rounds for bcrypt (higher = more secure but slower)
const SALT_ROUNDS = 12;

// Password strength requirements
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '@$!%*?&'
};

// Hash password using bcrypt
const hashPassword = async (password) => {
  try {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }
    
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    return {
      success: true,
      hashedPassword,
      salt
    };
  } catch (error) {
    console.error('Password hashing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Compare password with hash
const comparePassword = async (password, hashedPassword) => {
  try {
    if (!password || !hashedPassword) {
      return {
        success: false,
        isMatch: false,
        error: 'Password and hash are required'
      };
    }
    
    const isMatch = await bcrypt.compare(password, hashedPassword);
    
    return {
      success: true,
      isMatch
    };
  } catch (error) {
    console.error('Password comparison error:', error);
    return {
      success: false,
      isMatch: false,
      error: error.message
    };
  }
};

// Check password strength
const checkPasswordStrength = (password) => {
  const errors = [];
  const warnings = [];
  let score = 0;
  
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      score: 0,
      strength: 'invalid',
      errors: ['Password must be a string'],
      warnings: []
    };
  }
  
  // Length check
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  } else if (password.length >= PASSWORD_REQUIREMENTS.minLength) {
    score += 1;
  }
  
  if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
    errors.push(`Password must not exceed ${PASSWORD_REQUIREMENTS.maxLength} characters`);
  }
  
  // Character type checks
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (/[A-Z]/.test(password)) {
    score += 1;
  }
  
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (/[a-z]/.test(password)) {
    score += 1;
  }
  
  if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else if (/\d/.test(password)) {
    score += 1;
  }
  
  const specialCharRegex = new RegExp(`[${PASSWORD_REQUIREMENTS.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !specialCharRegex.test(password)) {
    errors.push(`Password must contain at least one special character (${PASSWORD_REQUIREMENTS.specialChars})`);
  } else if (specialCharRegex.test(password)) {
    score += 1;
  }
  
  // Additional strength checks
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[A-Z].*[A-Z]/.test(password)) score += 0.5; // Multiple uppercase
  if (/\d.*\d/.test(password)) score += 0.5; // Multiple numbers
  
  // Common password patterns (weakness detection)
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /admin/i,
    /(.)\1{2,}/ // Repeated characters
  ];
  
  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      warnings.push('Password contains common patterns that make it easier to guess');
      score -= 1;
      break;
    }
  }
  
  // Determine strength level
  let strength;
  if (score < 2) strength = 'very-weak';
  else if (score < 3) strength = 'weak';
  else if (score < 4) strength = 'fair';
  else if (score < 5) strength = 'good';
  else strength = 'strong';
  
  return {
    isValid: errors.length === 0,
    score: Math.max(0, score),
    strength,
    errors,
    warnings
  };
};

// Generate secure random password
const generateSecurePassword = (length = 16) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specialChars = PASSWORD_REQUIREMENTS.specialChars;
  
  let password = '';
  
  // Ensure at least one character from each required type
  password += uppercase[crypto.randomInt(0, uppercase.length)];
  password += lowercase[crypto.randomInt(0, lowercase.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += specialChars[crypto.randomInt(0, specialChars.length)];
  
  // Fill the rest randomly
  const allChars = uppercase + lowercase + numbers + specialChars;
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)];
  }
  
  // Shuffle the password to avoid predictable patterns
  return password.split('').sort(() => crypto.randomInt(0, 2) - 0.5).join('');
};

// Generate password reset token
const generateResetToken = () => {
  return {
    token: crypto.randomBytes(32).toString('hex'),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
  };
};

// Validate reset token format
const validateResetToken = (token) => {
  return token && typeof token === 'string' && token.length === 64 && /^[a-f0-9]+$/.test(token);
};

module.exports = {
  hashPassword,
  comparePassword,
  checkPasswordStrength,
  generateSecurePassword,
  generateResetToken,
  validateResetToken,
  PASSWORD_REQUIREMENTS
};