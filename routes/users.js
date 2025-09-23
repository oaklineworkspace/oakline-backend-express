// routes/users.js
import express from 'express';
import { enrollUser, verifyIdentity } from '../controllers/users/userController.js';
import { transferFunds, getTransactionHistory } from '../controllers/users/accounts.js';
import { verifyToken } from '../lib/middleware/authMiddleware.js';

const router = express.Router();

// ------------------------
// Public routes (no auth required)
// ------------------------
router.post('/verify-identity', verifyIdentity); // Step 1: verify DOB + SSN
router.post('/enroll', enrollUser);              // Step 2: enroll after verification

// ------------------------
// Protected routes (auth required)
// ------------------------
router.post('/transfer', verifyToken, transferFunds);
router.get('/:accountId/transactions', verifyToken, getTransactionHistory);

export default router;
