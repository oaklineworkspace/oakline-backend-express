// server.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import bodyParser from 'body-parser'; // Needed for Stripe webhook

// Load environment variables
dotenv.config();

// ------------------------
// Validate critical environment variables
// ------------------------
const requiredEnvVars = [
  'SUPABASE_SERVICE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SITE_URL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM'
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

console.log('✅ Environment variables loaded');

// ------------------------
// Import routes
// ------------------------
import authRoutes from './routes/auth.js';
import cardsRoutes from './routes/cards.js';
import accountsRoutes from './routes/accounts.js';
import adminRoutes from './routes/admin.js';
import stripeRoutes from './routes/stripe.js';
import usersRoutes from './routes/users.js'; 
import applicationsRoutes from './routes/applications.js'; // <-- NEW
import optionsRoutes from './routes/options.js';
// ------------------------
// Import controllers
// ------------------------
import { stripeWebhook } from './controllers/stripe/stripeWebhookController.js';

// ------------------------
// Import middleware
// ------------------------
import { secureErrorHandler as errorHandler } from './lib/middleware/errorHandler.js';
import { verifyToken } from './lib/middleware/authMiddleware.js';

// ------------------------
// Initialize app
// ------------------------
const app = express();

// ------------------------
// Security & Performance
// ------------------------
app.use(helmet());

// ✅ Multi-domain CORS setup
const allowedOrigins = [
  "https://theoaklinebank.com",
  "https://www.theoaklinebank.com",
  "https://oakline-frontend.vercel.app",
  "https://oakline-admin.vercel.app",       // <-- Admin dashboard added
  "http://localhost:3000",
  "https://94172b37-347f-4336-a50a-3c5d736c8d0b-00-2gs4qw0lqbo8f.kirk.replit.dev",
  "https://c83f882a-0f33-4f89-8bba-803252644277-00-1rs8o8lvxz5o3.spock.replit.dev",
  "https://c3c6a995-3964-4202-92c6-08752dcd1764-00-2ogeelws1sy3x.kirk.replit.dev",
  "https://1a2b9811-157e-4583-8121-c74ae61e998e-00-1fq9v2n8ddsus.worf.replit.dev",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));

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
// Health check
// ------------------------
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ------------------------
// API routes
// ------------------------
app.use('/api/auth', authRoutes);
app.use('/api/cards', verifyToken, cardsRoutes);
app.use('/api/accounts', verifyToken, accountsRoutes);
app.use('/api/admin', verifyToken, adminRoutes);
app.use('/api/stripe', verifyToken, stripeRoutes);
app.use('/api/applications', applicationsRoutes); // <-- added route
app.use('/api/users', usersRoutes); 
app.use('/api/options', optionsRoutes);

// ------------------------
// Stripe webhook (raw body required)
// ------------------------
app.post(
  '/api/stripe/webhook',
  bodyParser.raw({ type: 'application/json' }),
  stripeWebhook
);

// ------------------------
// 404 handler
// ------------------------
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ------------------------
// Global error handler
// ------------------------
app.use(errorHandler);

// ------------------------
// Start server
// ------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🟢 Oakline Backend running on 0.0.0.0:${PORT}`);
});

export default app;
