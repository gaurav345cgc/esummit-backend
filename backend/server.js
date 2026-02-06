const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { errorHandler } = require('./src/middleware/errorHandler');
const apiRouter = require('./src/routes');
const { supabase } = require('./src/services/supabase');

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;

// Make io available to routes/controllers
app.set('io', io);

// Basic security headers
app.use(helmet());

// CORS: allow all origins in dev, restrict in production
app.use(
  cors({
    origin: process.env.FRONTEND_URL || process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
    credentials: true,
  })
);

// JSON parser (except for webhook which uses raw)
app.use(express.json());

// Mount routes under /api
app.use('/api', apiRouter);

// Socket.io connection handling
io.on('connection', async (socket) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      socket.disconnect();
      return;
    }

    // Verify token with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      socket.disconnect();
      return;
    }

    const userId = data.user.id;

    // Join user-specific room
    socket.join(`user:${userId}`);

    socket.emit('connected', { user_id: userId });

    socket.on('disconnect', () => {
      // User disconnected
    });
  } catch (err) {
    console.error('Socket connection error:', err);
    socket.disconnect();
  }
});

// Global error handler
app.use(errorHandler);

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`Socket.io server ready`);
});

