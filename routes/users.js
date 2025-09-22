import express from 'express';
import { enrollUser, verifyIdentity } from '../controllers/users/userController.js';
import { transferFunds, getTransactionHistory } from '../controllers/users/accounts.js';
import { verifyToken } from '../lib/middleware/authMiddleware.js';

const router = express.Router();

// --- Public routes ---
router.post('/verify-identity', verifyIdentity); // new: verify DOB + SSN
router.post('/enroll', enrollUser);              // enroll after verification

// --- Protected routes (require authentication) ---
router.post('/transfer', verifyToken, transferFunds);
router.get('/:accountId/transactions', verifyToken, getTransactionHistory);

export default router;
