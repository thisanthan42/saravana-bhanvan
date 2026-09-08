import { ManagerModel } from '../models/managerModel.js';
import { AuthService } from '../services/authService.js';

/**
 * Manager Authentication Controller
 */
export const ManagerAuthController = {
  /**
   * POST /api/manager/login
   * Authenticate hotel manager and return signed JWT token
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body || {};

      if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required strings',
        });
      }

      const cleanEmail = email.trim().toLowerCase();
      const manager = await ManagerModel.findByEmail(cleanEmail);

      if (!manager) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. Please check your email and password.',
        });
      }

      // Verify Scrypt password hash
      const isValid = AuthService.verifyPassword(password, manager.password_hash);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. Please check your email and password.',
        });
      }

      // Check account suspension status
      if (manager.status === 'suspended') {
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended by the administrator.',
          code: 'ACCOUNT_SUSPENDED',
        });
      }

      // Check business suspension status if assigned
      if (manager.business_id) {
        const biz = await ManagerModel.getBusinessStatus(manager.business_id);
        if (biz && biz.status === 'suspended') {
          return res.status(403).json({
            success: false,
            message: 'This hotel business account has been suspended by the platform administrator.',
            code: 'BUSINESS_SUSPENDED',
          });
        }
      }

      // Fetch authorized branches
      const authorizedBranches = await ManagerModel.getAuthorizedBranches(manager.id, manager.role);

      // Issue JWT valid for 8 hours
      const token = AuthService.signToken({
        id: manager.id,
        name: manager.name,
        email: manager.email,
        role: manager.role,
      });

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        manager: {
          id: manager.id,
          name: manager.name,
          email: manager.email,
          role: manager.role,
          authorizedBranches,
          authorizedBranchIds: authorizedBranches.map(b => b.id),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/manager/me
   * Retrieve currently authenticated manager profile
   */
  async me(req, res) {
    return res.status(200).json({
      success: true,
      manager: req.manager,
    });
  },

  /**
   * GET /api/manager/users
   * Super Admin endpoint: List all managers and their branch assignments
   */
  async listUsers(req, res, next) {
    try {
      const users = await ManagerModel.findAllWithBranches();
      return res.status(200).json({
        success: true,
        count: users.length,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/manager/users
   * Super Admin endpoint: Provision a new manager and assign branches
   */
  async createUser(req, res, next) {
    try {
      const { name, email, password, role = 'manager', branchIds = [] } = req.body || {};

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, and password are required.',
        });
      }

      const cleanEmail = email.trim().toLowerCase();
      const existing = await ManagerModel.findByEmail(cleanEmail);
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'A manager with this email already exists.',
          code: 'EMAIL_ALREADY_EXISTS',
        });
      }

      const created = await ManagerModel.create({
        name: name.trim(),
        email: cleanEmail,
        password,
        role: role === 'super_admin' ? 'super_admin' : 'manager',
      });

      // Assign to specified branches
      const assigned = [];
      if (Array.isArray(branchIds)) {
        for (const bId of branchIds) {
          const assignRes = await ManagerModel.assignBranch(created.id, Number(bId));
          if (assignRes) assigned.push(Number(bId));
        }
      }

      const branches = await ManagerModel.getAuthorizedBranches(created.id, created.role);

      return res.status(201).json({
        success: true,
        message: 'Manager created and assigned successfully.',
        data: {
          id: created.id,
          name: created.name,
          email: created.email,
          role: created.role,
          branches,
          branchIds: branches.map(b => b.id),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/manager/logout
   * Logout session endpoint
   */
  async logout(req, res) {
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  },
};
