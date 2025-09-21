// routes/users.js
import express from 'express';
import { transferFunds, getTransactionHistory } from '../controllers/users/accounts.js';
import { enrollUser } from '../controllers/users/userController.js'; // import your new controller

const router = express.Router();

// Public route: enroll a new user
router.post('/enroll', enrollUser);

// POST /api/users/transfer → transfer funds
router.post('/transfer', transferFunds);

// GET /api/users/:accountId/transactions → get transaction history
router.get('/:accountId/transactions', getTransactionHistory);

export default router;
