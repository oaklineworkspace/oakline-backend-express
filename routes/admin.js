// routes/admin.js
import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';

// Controllers
import {
  approveOrRejectCardApplication,
  assignCard,
  getCardApplications
} from '../controllers/admin/cardApplications.js';

import {
  createUser,
  deleteAllUsers,
  deleteUser,
  getUsers
} from '../controllers/admin/users.js';

import { getAccounts } from '../controllers/admin/accounts.js';

import {
  bulkTransactions,
  manualTransaction,
  processCardTransaction,
  getTransactions
} from '../controllers/admin/transactions.js';

const router = express.Router();

// 🔒 All admin routes require authentication
router.use(verifyToken);

//
// Card Applications
//
router.post('/card-application', approveOrRejectCardApplication);
router.post('/assign-card', assignCard);
router.get('/card-applications', getCardApplications);

//
// Users
//
router.post('/users', createUser);
router.get('/users', getUsers);
router.delete('/users', deleteAllUsers);       // ⚠️ Deletes ALL users
router.delete('/users/single', deleteUser);   // Safer single delete

//
// Accounts
//
router.get('/accounts', getAccounts);

//
// Transactions
//
router.post('/transactions/bulk', bulkTransactions);
router.post('/transactions/manual', manualTransaction);
router.post('/transactions/process', processCardTransaction);
router.get('/transactions', getTransactions);

export default router;
