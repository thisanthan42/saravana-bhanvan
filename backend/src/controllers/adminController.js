import { BusinessModel } from '../models/businessModel.js';
import { ManagerModel } from '../models/managerModel.js';
import { AuditModel } from '../models/auditModel.js';
import { query } from '../config/database.js';

/**
 * Super Admin & Platform Owner Controller
 */
export const AdminController = {
  /**
   * GET /api/admin/stats
   * Retrieve platform-wide KPI statistics
   */
  async getStats(req, res, next) {
    try {
      const stats = await BusinessModel.getPlatformStats();
      return res.status(200).json({
        success: true,
        stats,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/admin/businesses
   * List all hotel businesses with branch/manager/feedback metrics
   */
  async listBusinesses(req, res, next) {
    try {
      const businesses = await BusinessModel.findAll();
      return res.status(200).json({
        success: true,
        businesses,
        count: businesses.length,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/businesses
   * Create a new hotel business
   */
  async createBusiness(req, res, next) {
    try {
      const { name, contactEmail, contactPhone, status = 'active' } = req.body || {};

      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Business name is required.',
        });
      }

      const business = await BusinessModel.create({
        name: name.trim(),
        status: status === 'suspended' ? 'suspended' : 'active',
        contactEmail: contactEmail ? String(contactEmail).trim() : null,
        contactPhone: contactPhone ? String(contactPhone).trim() : null,
      });

      await AuditModel.log({
        userId: req.manager.id,
        action: 'BUSINESS_CREATED',
        entityType: 'business',
        entityId: business.id,
        details: { name: business.name, status: business.status },
      });

      return res.status(201).json({
        success: true,
        message: `Business '${business.name}' created successfully.`,
        business,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/admin/businesses/:id/status
   * Toggle business status (active / suspended)
   */
  async toggleBusinessStatus(req, res, next) {
    try {
      const businessId = Number(req.params.id);
      const { status } = req.body || {};

      if (!status || !['active', 'suspended'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be either 'active' or 'suspended'.",
        });
      }

      const updated = await BusinessModel.updateStatus(businessId, status);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Business not found.',
        });
      }

      await AuditModel.log({
        userId: req.manager.id,
        action: status === 'suspended' ? 'BUSINESS_SUSPENDED' : 'BUSINESS_ACTIVATED',
        entityType: 'business',
        entityId: businessId,
        details: { name: updated.name, status },
      });

      return res.status(200).json({
        success: true,
        message: `Business status updated to '${status}'.`,
        business: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/admin/managers
   * List all managers with assigned branches and business info
   */
  async listManagers(req, res, next) {
    try {
      const managers = await ManagerModel.findAllWithBranches();
      return res.status(200).json({
        success: true,
        managers,
        count: managers.length,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/managers
   * Create a new manager and optionally assign branches
   */
  async createManager(req, res, next) {
    try {
      const { name, email, password, role = 'manager', status = 'active', businessId = 1, branchIds = [] } = req.body || {};

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, and password are required to create a manager.',
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long.',
        });
      }

      // Check for duplicate email
      const existing = await ManagerModel.findByEmail(email);
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Manager with email '${email}' already exists.`,
        });
      }

      const manager = await ManagerModel.create({
        name: name.trim(),
        email: email.trim(),
        password,
        role: role === 'super_admin' ? 'super_admin' : 'manager',
        status: status === 'suspended' ? 'suspended' : 'active',
        businessId: Number(businessId) || 1,
      });

      // Assign branches
      if (Array.isArray(branchIds) && branchIds.length > 0) {
        for (const bId of branchIds) {
          await ManagerModel.assignBranch(manager.id, bId);
        }
      }

      const assignedBranches = await ManagerModel.getAuthorizedBranches(manager.id, manager.role);

      await AuditModel.log({
        userId: req.manager.id,
        action: 'MANAGER_CREATED',
        entityType: 'manager',
        entityId: manager.id,
        details: { email: manager.email, role: manager.role, status: manager.status },
      });

      return res.status(201).json({
        success: true,
        message: `Manager '${manager.name}' created successfully.`,
        manager: {
          ...manager,
          branches: assignedBranches,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/admin/managers/:id/status
   * Activate or suspend a manager account
   */
  async toggleManagerStatus(req, res, next) {
    try {
      const managerId = Number(req.params.id);
      const { status } = req.body || {};

      if (!status || !['active', 'suspended'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be either 'active' or 'suspended'.",
        });
      }

      // Prevent Super Admin from suspending their own active session
      if (managerId === req.manager.id && status === 'suspended') {
        return res.status(400).json({
          success: false,
          message: 'You cannot suspend your own currently active Super Admin account.',
        });
      }

      const updated = await ManagerModel.updateStatus(managerId, status);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Manager not found.',
        });
      }

      await AuditModel.log({
        userId: req.manager.id,
        action: status === 'suspended' ? 'MANAGER_SUSPENDED' : 'MANAGER_ACTIVATED',
        entityType: 'manager',
        entityId: managerId,
        details: { name: updated.name, email: updated.email, status },
      });

      return res.status(200).json({
        success: true,
        message: `Manager account '${updated.email}' has been set to '${status}'.`,
        manager: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/admin/managers/:id/branches
   * Update branch assignments for a manager
   */
  async updateManagerBranches(req, res, next) {
    try {
      const managerId = Number(req.params.id);
      const { branchIds = [] } = req.body || {};

      if (!Array.isArray(branchIds)) {
        return res.status(400).json({
          success: false,
          message: 'branchIds must be an array of numeric branch IDs.',
        });
      }

      const branches = await ManagerModel.updateBranches(managerId, branchIds);

      await AuditModel.log({
        userId: req.manager.id,
        action: 'MANAGER_BRANCHES_UPDATED',
        entityType: 'manager',
        entityId: managerId,
        details: { branchIds },
      });

      return res.status(200).json({
        success: true,
        message: 'Manager branch assignments updated successfully.',
        managerId,
        branches,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/managers/:id/reset-password
   * Securely reset manager password
   */
  async resetManagerPassword(req, res, next) {
    try {
      const managerId = Number(req.params.id);
      const { password } = req.body || {};

      if (!password || typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters long.',
        });
      }

      const updated = await ManagerModel.resetPassword(managerId, password);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Manager not found.',
        });
      }

      await AuditModel.log({
        userId: req.manager.id,
        action: 'MANAGER_PASSWORD_RESET',
        entityType: 'manager',
        entityId: managerId,
        details: { email: updated.email, resetBy: req.manager.email },
      });

      return res.status(200).json({
        success: true,
        message: `Password for '${updated.email}' reset successfully.`,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/admin/branches
   * Universal branches listing across all businesses
   */
  async listBranches(req, res, next) {
    try {
      const sql = `SELECT * FROM branches ORDER BY id ASC;`;
      const result = await query(sql);
      return res.status(200).json({
        success: true,
        branches: result.rows || [],
        count: (result.rows || []).length,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/branches
   * Create a branch for any business
   */
  async createBranch(req, res, next) {
    try {
      const { name, code, address, businessId = 1 } = req.body || {};

      if (!name || !code) {
        return res.status(400).json({
          success: false,
          message: 'Branch name and branch code are required.',
        });
      }

      const cleanCode = code.trim().toUpperCase();

      // Check unique code
      const checkRes = await query(`SELECT id FROM branches WHERE code = $1;`, [cleanCode]);
      if (checkRes.rows && checkRes.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Branch code '${cleanCode}' already exists.`,
        });
      }

      const insertSql = `
        INSERT INTO branches (business_id, name, code, address, active)
        VALUES ($1, $2, $3, $4, true)
        RETURNING id, business_id, name, code, address, active, created_at;
      `;
      const insertRes = await query(insertSql, [Number(businessId), name.trim(), cleanCode, address || null]);
      const branch = insertRes.rows[0];

      await AuditModel.log({
        userId: req.manager.id,
        action: 'BRANCH_CREATED',
        entityType: 'branch',
        entityId: branch.id,
        details: { name: branch.name, code: branch.code, businessId },
      });

      return res.status(201).json({
        success: true,
        message: `Branch '${branch.name}' created successfully.`,
        branch,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/admin/branches/:id/status
   * Toggle branch active status
   */
  async toggleBranchStatus(req, res, next) {
    try {
      const branchId = Number(req.params.id);
      const { active } = req.body || {};

      const sql = `
        UPDATE branches
        SET active = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, name, code, active;
      `;
      const result = await query(sql, [Boolean(active), branchId]);
      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Branch not found.',
        });
      }

      const branch = result.rows[0];

      await AuditModel.log({
        userId: req.manager.id,
        action: branch.active ? 'BRANCH_ACTIVATED' : 'BRANCH_DEACTIVATED',
        entityType: 'branch',
        entityId: branch.id,
        details: { name: branch.name, code: branch.code, active: branch.active },
      });

      return res.status(200).json({
        success: true,
        message: `Branch status updated.`,
        branch,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/admin/audit-logs
   * List platform owner audit events
   */
  async listAuditLogs(req, res, next) {
    try {
      const limit = Number(req.query.limit) || 50;
      const logs = await AuditModel.listRecent(limit);
      return res.status(200).json({
        success: true,
        logs,
        count: logs.length,
      });
    } catch (error) {
      next(error);
    }
  },
};
