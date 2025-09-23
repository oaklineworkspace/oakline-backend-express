import express from 'express';
import { enrollUser, verifyIdentity } from '../controllers/users/userController.js';
import { transferFunds, getTransactionHistory } from '../controllers/users/accounts.js';
import { verifyToken } from '../lib/middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/verify-identity', verifyIdentity);
router.post('/enroll', enrollUser);

// Protected routes
router.post('/transfer', verifyToken, transferFunds);
router.get('/:accountId/transactions', verifyToken, getTransactionHistory);

export default router;
