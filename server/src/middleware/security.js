const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

// Helmet configuration for security headers
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["'self'", "https://js.stripe.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Rate limiting configurations
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 payment requests per hour
  message: {
    success: false,
    message: 'Too many payment requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const transferLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 transfer requests per hour
  message: {
    success: false,
    message: 'Too many transfer requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const searchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Limit each IP to 50 search requests per 5 minutes
  message: {
    success: false,
    message: 'Too many search requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const messageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Limit each IP to 100 messages per hour
  message: {
    success: false,
    message: 'Too many messages sent, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const documentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // Limit each IP to 30 document operations per hour
  message: {
    success: false,
    message: 'Too many document requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:8080',
      'https://your-production-domain.com' // Replace with your actual production domain
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-auth-token'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
};

// Security middleware to prevent common attacks
const preventXSS = (req, res, next) => {
  // Set X-XSS-Protection header
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
};

const preventClickjacking = (req, res, next) => {
  // Set X-Frame-Options header
  res.setHeader('X-Frame-Options', 'DENY');
  next();
};

const preventMimeSniffing = (req, res, next) => {
  // Set X-Content-Type-Options header
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
};

// Request sanitization middleware
const sanitizeRequest = (req, res, next) => {
  // Remove any null bytes from request parameters
  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key].replace(/\0/g, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };
  
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  
  next();
};

// IP whitelist middleware (for admin routes)
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    if (allowedIPs.length === 0 || allowedIPs.includes(clientIP)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: 'Access denied: IP not whitelisted'
      });
    }
  };
};

// Request logging middleware for security monitoring
const securityLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const method = req.method;
  const url = req.originalUrl;
  
  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//,  // Path traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
    /javascript:/i, // JavaScript injection
    /vbscript:/i, // VBScript injection
    /onload=/i, // Event handler injection
  ];
  
  const requestString = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params
  });
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestString));
  
  if (isSuspicious) {
    console.warn(`[SECURITY WARNING] ${timestamp} - Suspicious request from ${ip}:`, {
      method,
      url,
      userAgent,
      body: req.body,
      query: req.query
    });
  }
  
  next();
};

module.exports = {
  helmetConfig,
  generalLimiter,
  authLimiter,
  paymentLimiter,
  transferLimiter,
  searchLimiter,
  messageLimiter,
  documentLimiter,
  corsOptions,
  preventXSS,
  preventClickjacking,
  preventMimeSniffing,
  sanitizeRequest,
  ipWhitelist,
  securityLogger
};