import express from 'express';
import { requestEnrollment, completeEnrollment } from '../controllers/enrollController.js';

const router = express.Router();

router.post('/request', requestEnrollment);
router.post('/complete', completeEnrollment);

export default router;
