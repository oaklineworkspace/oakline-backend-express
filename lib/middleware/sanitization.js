
import xss from 'xss';
import validator from 'validator';

export const sanitizeInput = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

const sanitizeObject = (obj) => {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Remove XSS attempts
      sanitized[key] = xss(value, {
        whiteList: {}, // No HTML allowed
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script']
      });
      
      // Additional sanitization for specific fields
      if (key.includes('email')) {
        sanitized[key] = validator.normalizeEmail(sanitized[key]) || '';
      }
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

export const validateFinancialData = (req, res, next) => {
  const { amount, accountNumber, routingNumber } = req.body;
  
  if (amount !== undefined) {
    if (!validator.isFloat(String(amount), { min: 0.01, max: 1000000 })) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
  }
  
  if (accountNumber && !validator.isLength(accountNumber, { min: 8, max: 17 })) {
    return res.status(400).json({ error: 'Invalid account number' });
  }
  
  if (routingNumber && !validator.isLength(routingNumber, { min: 9, max: 9 })) {
    return res.status(400).json({ error: 'Invalid routing number' });
  }
  
  next();
};
