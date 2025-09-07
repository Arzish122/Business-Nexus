const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT configuration
const JWT_CONFIG = {
  accessTokenSecret: process.env.JWT_SECRET || 'nexus_access_secret_key_2024',
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'nexus_refresh_secret_key_2024',
  accessTokenExpiry: process.env.JWT_EXPIRES_IN || '15m', // 15 minutes
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // 7 days
  issuer: 'nexus-platform',
  audience: 'nexus-users'
};

// In-memory storage for refresh tokens (in production, use Redis or database)
const refreshTokenStore = new Map();

// Generate access token
const generateAccessToken = (payload) => {
  try {
    const tokenPayload = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role || 'user',
      userType: payload.userType,
      status: payload.status || 'active',
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID() // Unique token ID
    };
    
    const token = jwt.sign(tokenPayload, JWT_CONFIG.accessTokenSecret, {
      expiresIn: JWT_CONFIG.accessTokenExpiry,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
      algorithm: 'HS256'
    });
    
    return {
      success: true,
      token,
      expiresIn: JWT_CONFIG.accessTokenExpiry
    };
  } catch (error) {
    console.error('Access token generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Generate refresh token
const generateRefreshToken = (payload) => {
  try {
    const tokenPayload = {
      userId: payload.userId,
      email: payload.email,
      tokenType: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID()
    };
    
    const token = jwt.sign(tokenPayload, JWT_CONFIG.refreshTokenSecret, {
      expiresIn: JWT_CONFIG.refreshTokenExpiry,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
      algorithm: 'HS256'
    });
    
    // Store refresh token with metadata
    refreshTokenStore.set(token, {
      userId: payload.userId,
      createdAt: new Date(),
      lastUsed: new Date(),
      userAgent: payload.userAgent || 'unknown',
      ipAddress: payload.ipAddress || 'unknown'
    });
    
    return {
      success: true,
      token,
      expiresIn: JWT_CONFIG.refreshTokenExpiry
    };
  } catch (error) {
    console.error('Refresh token generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Generate token pair (access + refresh)
const generateTokenPair = (payload, options = {}) => {
  try {
    const accessTokenResult = generateAccessToken(payload);
    if (!accessTokenResult.success) {
      return accessTokenResult;
    }
    
    const refreshTokenResult = generateRefreshToken({
      ...payload,
      userAgent: options.userAgent,
      ipAddress: options.ipAddress
    });
    
    if (!refreshTokenResult.success) {
      return refreshTokenResult;
    }
    
    return {
      success: true,
      accessToken: accessTokenResult.token,
      refreshToken: refreshTokenResult.token,
      accessTokenExpiresIn: accessTokenResult.expiresIn,
      refreshTokenExpiresIn: refreshTokenResult.expiresIn
    };
  } catch (error) {
    console.error('Token pair generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Verify access token
const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.accessTokenSecret, {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
      algorithms: ['HS256']
    });
    
    return {
      success: true,
      payload: decoded
    };
  } catch (error) {
    let message = 'Invalid token';
    
    if (error.name === 'TokenExpiredError') {
      message = 'Token has expired';
    } else if (error.name === 'JsonWebTokenError') {
      message = 'Invalid token format';
    } else if (error.name === 'NotBeforeError') {
      message = 'Token not active yet';
    }
    
    return {
      success: false,
      error: message,
      expired: error.name === 'TokenExpiredError'
    };
  }
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    // Check if token exists in store
    if (!refreshTokenStore.has(token)) {
      return {
        success: false,
        error: 'Refresh token not found or has been revoked'
      };
    }
    
    const decoded = jwt.verify(token, JWT_CONFIG.refreshTokenSecret, {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
      algorithms: ['HS256']
    });
    
    // Update last used timestamp
    const tokenData = refreshTokenStore.get(token);
    tokenData.lastUsed = new Date();
    
    return {
      success: true,
      payload: decoded
    };
  } catch (error) {
    // Remove invalid token from store
    refreshTokenStore.delete(token);
    
    let message = 'Invalid refresh token';
    
    if (error.name === 'TokenExpiredError') {
      message = 'Refresh token has expired';
    } else if (error.name === 'JsonWebTokenError') {
      message = 'Invalid refresh token format';
    }
    
    return {
      success: false,
      error: message,
      expired: error.name === 'TokenExpiredError'
    };
  }
};

// Refresh access token using refresh token
const refreshAccessToken = (refreshToken, userPayload) => {
  try {
    const verifyResult = verifyRefreshToken(refreshToken);
    
    if (!verifyResult.success) {
      return verifyResult;
    }
    
    // Generate new access token
    const accessTokenResult = generateAccessToken(userPayload);
    
    if (!accessTokenResult.success) {
      return accessTokenResult;
    }
    
    return {
      success: true,
      accessToken: accessTokenResult.token,
      expiresIn: accessTokenResult.expiresIn
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Revoke refresh token
const revokeRefreshToken = (token) => {
  try {
    const deleted = refreshTokenStore.delete(token);
    return {
      success: true,
      revoked: deleted
    };
  } catch (error) {
    console.error('Token revocation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Revoke all refresh tokens for a user
const revokeAllUserTokens = (userId) => {
  try {
    let revokedCount = 0;
    
    for (const [token, data] of refreshTokenStore.entries()) {
      if (data.userId === userId) {
        refreshTokenStore.delete(token);
        revokedCount++;
      }
    }
    
    return {
      success: true,
      revokedCount
    };
  } catch (error) {
    console.error('Bulk token revocation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get user's active refresh tokens
const getUserRefreshTokens = (userId) => {
  try {
    const userTokens = [];
    
    for (const [token, data] of refreshTokenStore.entries()) {
      if (data.userId === userId) {
        userTokens.push({
          tokenId: token.substring(0, 8) + '...', // Partial token for security
          createdAt: data.createdAt,
          lastUsed: data.lastUsed,
          userAgent: data.userAgent,
          ipAddress: data.ipAddress
        });
      }
    }
    
    return {
      success: true,
      tokens: userTokens
    };
  } catch (error) {
    console.error('Get user tokens error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Clean up expired refresh tokens
const cleanupExpiredTokens = () => {
  try {
    let cleanedCount = 0;
    
    for (const [token, data] of refreshTokenStore.entries()) {
      try {
        jwt.verify(token, JWT_CONFIG.refreshTokenSecret);
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          refreshTokenStore.delete(token);
          cleanedCount++;
        }
      }
    }
    
    console.log(`Cleaned up ${cleanedCount} expired refresh tokens`);
    return { success: true, cleanedCount };
  } catch (error) {
    console.error('Token cleanup error:', error);
    return { success: false, error: error.message };
  }
};

// Run cleanup every hour
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  refreshAccessToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  getUserRefreshTokens,
  cleanupExpiredTokens,
  JWT_CONFIG
};