import { query } from '../config/database.js';

export const BranchController = {
  /**
   * GET /api/manager/branches
   * Returns branches authorized for the logged-in manager.
   * Super Admins see all branches; branch managers see only assigned branches.
   */
  async list(req, res, next) {
    try {
      if (req.manager.role === 'super_admin' || req.manager.role === 'owner') {
        const sql = `
          SELECT b.id, b.business_id, b.name, b.code, b.address, b.active, b.created_at,
                 COUNT(DISTINCT t.id) AS total_tables,
                 COUNT(DISTINCT fb.id) AS total_feedback
          FROM branches b
          LEFT JOIN tables t ON t.branch_id = b.id
          LEFT JOIN feedback fb ON fb.branch_id = CAST(b.id AS VARCHAR)
          GROUP BY b.id
          ORDER BY b.id ASC;
        `;
        const result = await query(sql);
        return res.status(200).json({
          success: true,
          count: result.rows.length,
          data: result.rows,
        });
      }

      // Branch Manager: return only their authorized branches
      return res.status(200).json({
        success: true,
        count: req.manager.authorizedBranches.length,
        data: req.manager.authorizedBranches,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/manager/branches
   * Super Admin endpoint: Create a new hotel branch
   */
  async create(req, res, next) {
    try {
      const { name, code, address, businessId = 1 } = req.body || {};

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Branch name is required.',
        });
      }

      if (!code || typeof code !== 'string' || code.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Branch unique code is required (e.g. SB-CBE).',
        });
      }

      const cleanCode = code.trim().toUpperCase();

      // Check for code uniqueness
      const existing = await query('SELECT id FROM branches WHERE code = $1 LIMIT 1;', [cleanCode]);
      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Branch with code "${cleanCode}" already exists.`,
          code: 'BRANCH_CODE_EXISTS',
        });
      }

      const sql = `
        INSERT INTO branches (business_id, name, code, address, active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, business_id, name, code, address, active, created_at;
      `;
      const result = await query(sql, [
        Number(businessId) || 1,
        name.trim(),
        cleanCode,
        address ? address.trim() : null,
        true,
      ]);

      return res.status(201).json({
        success: true,
        message: 'Branch created successfully.',
        data: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/manager/branches/:id/status
   * Super Admin endpoint: Activate or deactivate a branch
   */
  async toggleStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { active } = req.body || {};

      if (active === undefined || active === null) {
        return res.status(400).json({
          success: false,
          message: 'Boolean status "active" is required.',
        });
      }

      const sql = `UPDATE branches SET active = $1 WHERE id = $2 RETURNING id, name, code, active, updated_at;`;
      const result = await query(sql, [Boolean(active), Number(id)]);

      if (!result.rows[0]) {
        return res.status(404).json({
          success: false,
          message: 'Branch not found.',
        });
      }

      return res.status(200).json({
        success: true,
        message: `Branch "${result.rows[0].name}" successfully ${result.rows[0].active ? 'activated' : 'deactivated'}.`,
        data: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  },
};
