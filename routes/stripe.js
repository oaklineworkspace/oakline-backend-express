import express from 'express';
import { createPaymentIntent } from '../controllers/stripeController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/stripe/payment-intent
router.post('/payment-intent', verifyToken, createPaymentIntent);

export default router;
