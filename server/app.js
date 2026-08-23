import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import authRoutes from './routes/auth.routes.js';
import chatRoutes from './routes/chat.routes.js';
import evidenceRoutes from './routes/evidence.routes.js';

const app = express();

// ── Proxy Configuration ────────────────────────────────────────
// Render acts as a reverse proxy. Trusting '1' ensures Express uses the correct client IP from X-Forwarded-For instead of the load balancer IP.
app.set('trust proxy', 1);

// ── Security Middleware ──────────────────────────────────────

// Helmet with strict Content-Security-Policy
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://postpartum-backend.onrender.com', 'https://postpartum-rag-api.onrender.com'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow loading cross-origin fonts
    hsts: {
      maxAge: 31536000,        // 1 year
      includeSubDomains: true,
      preload: true,
    },
  })
);

// Additional security headers
app.use(securityHeaders);

// ── CORS ─────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://postpartum-frontend.onrender.com',
  'http://localhost:4200',
  'http://127.0.0.1:4200'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., server-to-server, health checks)
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // Cache preflight for 24 hours
}));

// ── Parsers (with size limits to prevent DoS) ────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ── Global Rate Limiter ──────────────────────────────────────
app.use('/api', apiLimiter);

// ── Logger ───────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Production: log in combined format for security auditing
  app.use(morgan('combined'));
}

// ── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'PostpartumHeal API is running' });
});

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/evidence', evidenceRoutes);

// ── 404 Handler ──────────────────────────────────────────────
// Express 5 requires named splat params — '{*path}' replaces bare '*'
app.use((req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// ── Global Error Handler ─────────────────────────────────────
app.use(errorHandler);

export default app;
