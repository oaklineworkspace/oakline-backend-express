// routes/users.js
import express from 'express';
import { transferFunds, getTransactionHistory } from '../controllers/users/accounts.js';

const router = express.Router();

// POST /api/users/transfer → transfer funds
router.post('/transfer', transferFunds);

// GET /api/users/:accountId/transactions → get transaction history
router.get('/:accountId/transactions', getTransactionHistory);

export default router;
