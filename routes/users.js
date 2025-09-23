// routes/users.js
import express from 'express';
import {
  requestEnrollment,
  completeEnrollment,
  verifyIdentity,
  enrollUser
} from '../controllers/users/userController.js';
import { verifyToken } from '../lib/middleware/authMiddleware.js';

const router = express.Router();

// ------------------------
// Public routes
// ------------------------

// Request enrollment link (email + SSN)
router.post('/request-enroll', requestEnrollment);

// Complete enrollment (set password)
router.post('/complete-enroll', completeEnrollment);

// Verify user identity (DOB + last 4 of SSN)
router.post('/verify-identity', verifyIdentity);

// Enroll user after verification
router.post('/enroll', enrollUser);

// ------------------------
// Protected routes (require authentication)
// Example: transaction history, transfers, etc.
// router.use(verifyToken);
// router.get('/transactions', getTransactions);
// router.post('/transfer', createTransfer);

export default router;
