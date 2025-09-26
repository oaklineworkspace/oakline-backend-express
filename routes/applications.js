import express from 'express';
import { submitApplication } from '../controllers/applications/applicationsController.js';

const router = express.Router();

router.post('/submit', submitApplication);

export default router;
