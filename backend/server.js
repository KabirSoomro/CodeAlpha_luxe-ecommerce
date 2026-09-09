const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');

// Load environment variables from backend or root .env
dotenv.config({ path: path.join(__dirname, '.env') });
if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.join(__dirname, '../.env') });
}

// Connect to MongoDB Atlas
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with permissive CORS for modern client apps
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Attach io to Express app and request context
app.set('io', io);
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'luxe-backend', timestamp: new Date().toISOString() });
});

// Static assets: serve Vite production build if exists
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));

// Socket.io connection lifecycle
io.on('connection', (socket) => {
  console.log(`⚡ Client connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`❌ Client disconnected: ${socket.id}`));
});

// SPA Client Routing fallback (serve index.html for non-API routes)
app.get('*', (req, res, next) => {
  const indexPath = path.join(frontendDist, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  if (req.url.startsWith('/api')) {
    return next();
  }
  res.send('Luxe Premium E-Commerce API is running...');
});

// Error handling middleware
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
app.use(notFound);
app.use(errorHandler);

// Listen on configured port
const PORT = process.env.PORT || 5000;
if (!server.listening) {
  server.listen(PORT, () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} in use, skipping explicit bind.`);
    } else {
      console.error('Server binding error:', err);
    }
  });
}

module.exports = { app, server, io };
