const express = require('express');
const router = express.Router();

const ACCOUNT_TYPES = require('../data/accountTypes');
const COUNTRIES = require('../data/countries');

// GET /api/options/account-types
router.get('/account-types', (req, res) => {
  res.json({ success: true, accountTypes: ACCOUNT_TYPES });
});

// GET /api/options/countries
router.get('/countries', (req, res) => {
  res.json({ success: true, countries: COUNTRIES });
});

module.exports = router;
