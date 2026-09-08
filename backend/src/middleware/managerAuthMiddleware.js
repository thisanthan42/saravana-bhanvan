import { AuthService } from '../services/authService.js';
import { ManagerModel } from '../models/managerModel.js';

/**
 * Manager JWT Authentication Middleware
 * 
 * Verifies that the incoming request contains a valid, non-expired
 * JWT bearer token issued to an authorized hotel manager or super admin.
 * Populates req.manager with profile, role, and authorized branches.
 */
export async function requireManagerAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const legacyKey = req.headers['x-manager-key'] || req.headers['x-manager-token'];

  // Support legacy developer key if explicitly matched
  if (legacyKey && process.env.MANAGER_API_SECRET && legacyKey === process.env.MANAGER_API_SECRET) {
    req.manager = {
      id: 0,
      name: 'System Developer / Manager',
      email: 'manager@saravanabhavan.com',
      role: 'super_admin',
      authorizedBranches: [],
      authorizedBranchIds: [],
    };
    return next();
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access restricted: Manager authentication required. Please log in.',
    });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Session token missing. Please log in.',
    });
  }

  try {
    const decoded = AuthService.verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid token session.',
      });
    }

    // Check live manager status in database/store for instant revocation upon suspension
    const liveManager = await ManagerModel.findById(decoded.id);
    if (liveManager) {
      if (liveManager.status === 'suspended' || liveManager.status === 'inactive') {
        return res.status(403).json({
          success: false,
          message: 'Your manager account has been suspended by the platform administrator.',
          code: 'ACCOUNT_SUSPENDED',
        });
      }

      // Check business status for non-super-admins
      if (liveManager.business_id && liveManager.role !== 'super_admin' && liveManager.role !== 'owner') {
        const biz = await ManagerModel.getBusinessStatus(liveManager.business_id);
        if (biz && biz.status === 'suspended') {
          return res.status(403).json({
            success: false,
            message: 'This hotel business account has been suspended by the platform administrator.',
            code: 'BUSINESS_SUSPENDED',
          });
        }
      }
    }

    const role = (liveManager && liveManager.role) || decoded.role || 'manager';
    const authorizedBranches = await ManagerModel.getAuthorizedBranches(decoded.id, role);
    const authorizedBranchIds = authorizedBranches.map(b => Number(b.id));

    // Attach decoded manager data and branch permissions to request
    req.manager = {
      id: decoded.id,
      name: (liveManager && liveManager.name) || decoded.name,
      email: (liveManager && liveManager.email) || decoded.email,
      role: role,
      status: (liveManager && liveManager.status) || 'active',
      business_id: liveManager ? liveManager.business_id : 1,
      authorizedBranches,
      authorizedBranchIds,
    };

    next();
  } catch (err) {
    const isExpired = err.message.toLowerCase().includes('expired');
    return res.status(401).json({
      success: false,
      message: isExpired
        ? 'Your manager session has expired. Please log in again.'
        : 'Invalid or malformed authentication token.',
    });
  }
}

/**
 * Server-Side Anti-IDOR Branch Access Middleware
 * Ensures a manager cannot access or modify resources belonging to another branch.
 */
export function requireBranchAccess(paramName = 'branchId') {
  return (req, res, next) => {
    if (!req.manager) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before branch authorization check.',
      });
    }

    // Super Admin / Owner has universal business-wide branch access
    if (req.manager.role === 'super_admin' || req.manager.role === 'owner') {
      return next();
    }

    // Extract requested branchId from params, query, or body
    const rawBranchId = req.params[paramName] || req.query[paramName] || req.body?.[paramName];
    if (!rawBranchId || rawBranchId === 'all') {
      return next();
    }

    const targetBranchId = Number(rawBranchId);
    if (!req.manager.authorizedBranchIds.includes(targetBranchId)) {
      console.warn(`[Security Alert: IDOR Blocked] Manager #${req.manager.id} (${req.manager.email}) attempted unauthorized access to branch #${targetBranchId}`);
      return res.status(403).json({
        success: false,
        message: "Access denied: You are not authorized to access this branch's data.",
        code: 'FORBIDDEN_BRANCH_ACCESS',
      });
    }

    next();
  };
}

/**
 * Super Admin Role Middleware
 * Restricts system-wide administrative operations (e.g. creating branches, provisioning managers)
 */
export function requireSuperAdmin(req, res, next) {
  if (!req.manager) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  if (req.manager.role !== 'super_admin' && req.manager.role !== 'owner') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Super Admin authorization required.',
      code: 'FORBIDDEN_SUPER_ADMIN',
    });
  }

  next();
}
