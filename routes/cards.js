import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { getUserCards, updateCard, createCard } from '../controllers/cards/cardsController.js';
import { getCardTransactions, processCardTransaction } from '../controllers/cards/cardTransactionsController.js';

const router = express.Router();

// =====================
// Cards
// GET /api/cards/user/:userId
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    const cards = await getUserCards(req.params.userId);
    res.status(200).json({ cards });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================
// Card Transactions
// GET /api/cards/:cardId/transactions
router.get('/:cardId/transactions', verifyToken, async (req, res) => {
  try {
    const transactions = await getCardTransactions(req.user.id, req.params.cardId);
    res.status(200).json({ transactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================
// Process Transaction
// POST /api/cards/:cardId/transaction
router.post('/:cardId/transaction', verifyToken, async (req, res) => {
  const { amount, merchant, location, transactionType } = req.body;
  try {
    const result = await processCardTransaction(req.user.id, req.params.cardId, amount, merchant, location, transactionType);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// =====================
// Update Card
// POST /api/cards/:cardId/update
router.post('/:cardId/update', verifyToken, async (req, res) => {
  const { action, dailyLimit, monthlyLimit } = req.body;
  try {
    const updatedCard = await updateCard(req.user.id, req.params.cardId, action, dailyLimit, monthlyLimit);
    res.status(200).json({ card: updatedCard });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// =====================
// Create Card
// POST /api/cards/create
router.post('/create', verifyToken, async (req, res) => {
  const { userId, accountId, cardType } = req.body;
  try {
    const card = await createCard(userId, accountId, cardType);
    res.status(201).json({ card });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
