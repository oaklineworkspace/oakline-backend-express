import express from 'express';
import { createPaymentIntent } from '../controllers/stripe/stripeController.js';
import { verifyToken } from '../lib/middleware/authMiddleware.js';

const router = express.Router();

// POST /api/stripe/payment-intent
router.post('/payment-intent', verifyToken, createPaymentIntent);

export default router;
