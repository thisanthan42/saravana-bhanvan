/**
 * Central Error Handling Middleware
 */

// 404 Not Found Handler for unknown routes
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
}

// Global Exception Handler
export function errorHandler(err, req, res, next) {
  // Always log error internally for debugging
  console.error(`[Server Error] ${new Date().toISOString()}:`, err);

  // PostgreSQL Check Constraint Violations (23514)
  if (err.code === '23514') {
    return res.status(400).json({
      success: false,
      message: 'Validation error: One or more rating values violate database constraints.',
    });
  }

  // Syntax or Malformed JSON body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Malformed JSON payload in request body.',
    });
  }

  const isProduction = process.env.NODE_ENV === 'production';

  // Generic sanitized error response (never leaks database credentials or full stack traces)
  return res.status(err.statusCode || 500).json({
    success: false,
    message: isProduction
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Internal Server Error',
    ...(isProduction ? {} : { stack: err.stack }),
  });
}
