
export const secureErrorHandler = (error, req, res, next) => {
  // Log full error details for internal monitoring
  console.error('API Error:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    error: error.message,
    stack: error.stack
  });

  // Return sanitized error to client
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Invalid input data',
      details: isDevelopment ? error.message : 'Please check your input and try again'
    });
  }

  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized access'
    });
  }

  if (error.name === 'ForbiddenError') {
    return res.status(403).json({
      error: 'Access denied'
    });
  }

  // Generic server error
  res.status(500).json({
    error: 'Internal server error',
    reference: `ERR-${Date.now()}`,
    ...(isDevelopment && { details: error.message })
  });
};

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
