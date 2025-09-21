
import { logComplianceEvent } from '../monitoring/sentry.js';

export const bankingComplianceMiddleware = (req, res, next) => {
  // Log all financial transactions for compliance
  if (req.url.includes('/api/process-transfer') || 
      req.url.includes('/api/card-transactions')) {
    
    logComplianceEvent('FINANCIAL_TRANSACTION_INITIATED', {
      userId: req.body.user_id,
      amount: req.body.amount,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
  }

  // Monitor admin access
  if (req.url.includes('/api/admin/')) {
    logComplianceEvent('ADMIN_ACCESS', {
      endpoint: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });
  }

  next();
};
