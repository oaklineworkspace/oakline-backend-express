import express from 'express';
import { requestEnrollment, completeEnrollment } from '../controllers/users/enrollController.js';

const router = express.Router();

// Public routes
router.post('/request-enroll', requestEnrollment);
router.post('/complete-enroll', completeEnrollment);

export default router;
