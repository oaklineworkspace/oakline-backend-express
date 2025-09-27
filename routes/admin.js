// routes/admin.js
import express from 'express';
import { verifyToken } from '../lib/middleware/authMiddleware.js';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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

// 🔒 Middleware: verify JWT
router.use(verifyToken);

// 🔒 Middleware: verify admin role
router.use(async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'No authenticated user' });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('admin_profiles')
      .select('role, is_active')
      .eq('id', userId)
      .single();

    if (error || !profile || !profile.is_active || !['admin', 'superadmin', 'auditor'].includes(profile.role)) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    req.adminProfile = profile; // attach admin info for downstream use
    next();
  } catch (err) {
    console.error('Admin role check error:', err);
    return res.status(500).json({ error: 'Admin verification failed' });
  }
});

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
