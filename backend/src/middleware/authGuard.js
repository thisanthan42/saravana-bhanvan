/**
 * Manager Authorization Guard Middleware
 * 
 * Protects administrative and data retrieval endpoints.
 * Customers must NEVER be able to access the feedback database.
 */
export function requireManagerAuth(req, res, next) {
  const managerSecret = process.env.MANAGER_API_SECRET;
  const providedKey = req.headers['x-manager-key'] || req.headers['x-api-key'];
  const authHeader = req.headers['authorization'];

  let token = providedKey;
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  // If no secret configured or invalid token provided, reject with 403 Forbidden
  if (!managerSecret || !token || token !== managerSecret) {
    return res.status(403).json({
      success: false,
      message: 'Access restricted: Manager authentication required to view feedback records.',
    });
  }

  next();
}
