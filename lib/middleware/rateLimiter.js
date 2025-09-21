
import { SECURITY_CONFIG } from '../../config/security.js';

const rateLimitStore = new Map();

export const rateLimit = (options = {}) => {
  const {
    windowMs = SECURITY_CONFIG.apiRateLimit.windowMs,
    max = SECURITY_CONFIG.apiRateLimit.max,
    keyGenerator = (req) => req.ip || 'anonymous'
  } = options;

  return async (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (rateLimitStore.has(key)) {
      const requests = rateLimitStore.get(key).filter(time => time > windowStart);
      rateLimitStore.set(key, requests);
    } else {
      rateLimitStore.set(key, []);
    }

    const requests = rateLimitStore.get(key);
    
    if (requests.length >= max) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    requests.push(now);
    rateLimitStore.set(key, requests);
    
    if (next) next();
  };
};

export const adminRateLimit = rateLimit({
  max: SECURITY_CONFIG.apiRateLimit.adminMax,
  keyGenerator: (req) => req.headers['x-admin-key'] || req.ip
});
