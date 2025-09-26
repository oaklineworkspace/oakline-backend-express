// /routes/options.js
import express from 'express';
import ACCOUNT_TYPES from '../data/accountTypes.js';
import COUNTRIES from '../data/countries.js';

const router = express.Router();

// GET /api/options/account-types
router.get('/account-types', (req, res) => {
  res.json({ success: true, accountTypes: ACCOUNT_TYPES });
});

// GET /api/options/countries
router.get('/countries', (req, res) => {
  res.json({ success: true, countries: COUNTRIES });
});

export default router;
