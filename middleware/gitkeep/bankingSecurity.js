import rateLimit from 'express-rate-limit';
import { BankingCompliance } from '../lib/security/bankingCompliance.js';

// ------------------------
// Rate Limiting
// ------------------------
export const bankingRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP per window
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ------------------------
// Transaction Monitoring
// ------------------------
export const transactionMonitoring = async (req, res, next) => {
  if (req.method === 'POST' && req.url.includes('/api/process-transfer')) {
    try {
      const validations = await BankingCompliance.validateTransaction(req.body);

      if (validations.some(v => v.requires_review)) {
        // Log flagged transaction
        await BankingCompliance.logComplianceEvent({
          type: 'TRANSACTION_FLAGGED',
          user_id: req.body.user_id,
          details: validations,
          ip: req.ip,
          requires_review: true,
        });

        // Block non-compliant transaction
        return res.status(403).json({ error: 'Transaction requires review by admin.' });
      }

      req.complianceValidations = validations;
    } catch (error) {
      console.error('Compliance middleware error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  next();
};

// ------------------------
// Security Headers
// ------------------------
export const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'"
  );
  next();
};
