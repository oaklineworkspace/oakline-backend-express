// server.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import bodyParser from 'body-parser'; // Needed for Stripe webhook

// Load environment variables first
dotenv.config();

// Validate critical environment variables
const requiredEnvVars = [
  'SUPABASE_SERVICE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please make sure these are set in your Secrets tab');
  process.exit(1);
}

console.log('✅ Environment variables loaded successfully');

import { ENV } from './config/env.js';

// ------------------------
// Import Routes
// ------------------------
import authRoutes from './routes/auth.js';
import cardsRoutes from './routes/cards.js';
import accountsRoutes from './routes/accounts.js';
import adminRoutes from './routes/admin.js';
import stripeRoutes from './routes/stripe.js';
import usersRoutes from './routes/users.js';

// ------------------------
// Import Controllers
// ------------------------
import { stripeWebhook } from './controllers/stripe/stripeWebhookController.js';

// ------------------------
// Import Middleware
// ------------------------
import { secureErrorHandler as errorHandler } from './lib/middleware/errorHandler.js';
import { verifyToken } from './lib/middleware/authMiddleware.js';

// ------------------------
// Initialize App
// ------------------------
const app = express();

// ------------------------
// Security & Performance
// ------------------------
app.use(helmet());
app.use(cors({
  origin: ENV.NEXT_PUBLIC_SITE_URL || '*',
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

app.use(morgan('combined'));

// ------------------------
// Body parsing
// ------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ------------------------
// Health Check
// ------------------------
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ------------------------
// API Routes
// ------------------------
app.use('/api/auth', authRoutes);
app.use('/api/cards', verifyToken, cardsRoutes);
app.use('/api/accounts', verifyToken, accountsRoutes);
app.use('/api/admin', verifyToken, adminRoutes);
app.use('/api/stripe', verifyToken, stripeRoutes); // All Stripe endpoints except webhook

// ------------------------
// Users Routes (public + protected handled in router)
// ------------------------
app.use('/api/users', usersRoutes);

// ------------------------
// Stripe Webhook (must use raw body)
// ------------------------
app.post(
  '/api/stripe/webhook',
  bodyParser.raw({ type: 'application/json' }),
  stripeWebhook
);

// ------------------------
// 404 Not Found Handler
// ------------------------
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ------------------------
// Global Error Handler
// ------------------------
app.use(errorHandler);

// ------------------------
// Start Server
// ------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🟢 Oakline Backend running on 0.0.0.0:${PORT}`);
});

export default app;
