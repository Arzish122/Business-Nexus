// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Database connection
const connectDB = require('./config/db');

// Security middleware
const {
  helmetConfig,
  corsOptions,
  generalLimiter,
  sanitizeRequest,
  preventXSS,
  securityLogger,
} = require('./middleware/security');

// Routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const meetingsRoutes = require('./routes/meetings');
const usersRoutes = require('./routes/users');
const videoCallRoutes = require('./routes/videoCalls');
const documentRoutes = require('./routes/documents');
const paymentRoutes = require('./routes/payments');

// Initialize Express + HTTP + Socket.IO
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:5174"
    ],
    methods: ["GET", "POST"]
  }
});

/* --------------------------------------------------
   MIDDLEWARE
-------------------------------------------------- */

// Security first
app.use(helmetConfig);
app.use(securityLogger);
app.use(cors(corsOptions));
app.use(generalLimiter);
app.use(preventXSS);
app.use(sanitizeRequest);

// Body parsing (Stripe webhook requires raw body)
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook/stripe') {
    next(); // Skip JSON parsing
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files for uploads
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
);

/* --------------------------------------------------
   DATABASE
-------------------------------------------------- */
connectDB();

/* --------------------------------------------------
   ROUTES
-------------------------------------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/video-calls', videoCallRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/payments', paymentRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('🚀 Nexus API is running');
});

/* --------------------------------------------------
   SOCKET.IO (WebRTC signaling)
-------------------------------------------------- */
const activeRooms = new Map();

io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  // Join room
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);

    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, new Set());
    }
    activeRooms.get(roomId).add(userId);

    socket.to(roomId).emit('user-connected', userId);
    console.log(`👤 User ${userId} joined room ${roomId}`);
  });

  // WebRTC signaling
  socket.on('offer', (roomId, offer, targetUserId) => {
    socket.to(roomId).emit('offer', offer, socket.id, targetUserId);
  });

  socket.on('answer', (roomId, answer, targetUserId) => {
    socket.to(roomId).emit('answer', answer, socket.id, targetUserId);
  });

  socket.on('ice-candidate', (roomId, candidate, targetUserId) => {
    socket.to(roomId).emit('ice-candidate', candidate, socket.id, targetUserId);
  });

  // Media controls
  socket.on('toggle-audio', (roomId, userId, isAudioEnabled) => {
    socket.to(roomId).emit('user-audio-toggled', userId, isAudioEnabled);
  });

  socket.on('toggle-video', (roomId, userId, isVideoEnabled) => {
    socket.to(roomId).emit('user-video-toggled', userId, isVideoEnabled);
  });

  // Leave room
  socket.on('leave-room', (roomId, userId) => {
    socket.leave(roomId);

    if (activeRooms.has(roomId)) {
      activeRooms.get(roomId).delete(userId);

      if (activeRooms.get(roomId).size === 0) {
        activeRooms.delete(roomId);
      }
    }

    socket.to(roomId).emit('user-disconnected', userId);
    console.log(`👋 User ${userId} left room ${roomId}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
    activeRooms.forEach((participants, roomId) => {
      if (participants.has(socket.id)) {
        participants.delete(socket.id);
        socket.to(roomId).emit('user-disconnected', socket.id);

        if (participants.size === 0) {
          activeRooms.delete(roomId);
        }
      }
    });
  });
});

/* --------------------------------------------------
   START SERVER
-------------------------------------------------- */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('📡 Socket.IO signaling server initialized');
});
