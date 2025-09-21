// routes/users.js
import express from 'express';
import { enrollUser } from '../controllers/userController.js';
import { transferFunds, getTransactionHistory } from '../controllers/users/accounts.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Public route ---
// POST /api/users/enroll → enroll new user
router.post('/enroll', enrollUser);

// --- Protected routes (require authentication) ---
router.post('/transfer', verifyToken, transferFunds);
router.get('/:accountId/transactions', verifyToken, getTransactionHistory);

export default router;
