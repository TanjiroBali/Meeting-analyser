import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiRouter } from './routes/api';
import { setupSocketServer } from './socket';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Configure CORS for REST API and Socket.IO
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.length > 0) {
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, origin);
      }
    }

    // Allow Netlify subdomains by default
    if (origin.endsWith('.netlify.app')) {
      return callback(null, origin);
    }

    // Allow local development origins
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, origin);
    }

    // Reflect origin to support credentialed requests
    return callback(null, origin);
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
};

// Initialize Socket.IO with CORS
const io = new SocketIOServer(server, {
  cors: corsOptions,
});

// Attach Socket.IO signaling logic
setupSocketServer(io);

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Anymit Backend & Socket.IO Server', timestamp: new Date() });
});

// API Routes (Mounted under both /api and / to prevent 404s if /api prefix is omitted)
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Start listening on 0.0.0.0 for production cloud hosting providers (Render, Railway, Fly.io, etc.)
const HOST = process.env.HOST || '0.0.0.0';

server.listen(Number(PORT), HOST, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Anymit Server & Socket.IO running on http://${HOST}:${PORT}`);
  console.log(`📡 REST API Base URL: http://${HOST}:${PORT}/api`);
  console.log(`=======================================================`);
});
