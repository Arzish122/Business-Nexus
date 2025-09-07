const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    // Get token from Authorization header, x-auth-token header, query string, or cookies
    let token =
      req.header('Authorization') ||
      req.header('x-auth-token') ||
      req.query.token ||
      (req.cookies && req.cookies.token);

    // If Authorization header has Bearer prefix, strip it
    if (token && token.startsWith('Bearer ')) {
      token = token.slice(7).trim();
    }

    // If no token found
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided.',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexus-secret-key');

    // Ensure decoded token has userId
    if (!decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token: no user ID found.',
      });
    }

    // Find user in DB
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token: user not found.',
      });
    }

    // Attach user and token to request
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);

    // Differentiate JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.',
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during authentication.',
    });
  }
};
