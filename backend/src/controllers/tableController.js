import { query } from '../config/database.js';

export const TableController = {
  /**
   * GET /api/manager/tables
   * Retrieve tables for an authorized branch
   */
  async list(req, res, next) {
    try {
      const { branchId = 1 } = req.query;
      const bId = Number(branchId);

      // IDOR check: Verify branch access
      if (req.manager.role !== 'super_admin' && req.manager.role !== 'owner') {
        if (!req.manager.authorizedBranchIds.includes(bId)) {
          return res.status(403).json({
            success: false,
            message: "Access denied: You are not authorized to view tables for this branch.",
            code: 'FORBIDDEN_BRANCH_ACCESS',
          });
        }
      }

      const sql = `
        SELECT t.id, t.branch_id, t.table_number, t.active, t.created_at,
               b.name AS branch_name, b.code AS branch_code,
               qr.id AS qr_id, qr.public_token AS qr_token, qr.active AS qr_active
        FROM tables t
        JOIN branches b ON t.branch_id = b.id
        LEFT JOIN qr_codes qr ON qr.table_id = t.id
        WHERE t.branch_id = $1
        ORDER BY t.id ASC;
      `;
      const result = await query(sql, [bId]);

      return res.status(200).json({
        success: true,
        count: result.rows.length,
        branchId: bId,
        data: result.rows,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/manager/tables
   * Create a new dining table in an authorized branch
   */
  async create(req, res, next) {
    try {
      const { branchId = 1, tableNumber } = req.body || {};

      if (!tableNumber || String(tableNumber).trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Table number or identifier is required.',
        });
      }

      const cleanTableNumber = String(tableNumber).trim().replace(/^Table\s+/i, '');
      const bId = Number(branchId);

      // IDOR check: Verify branch access
      if (req.manager.role !== 'super_admin' && req.manager.role !== 'owner') {
        if (!req.manager.authorizedBranchIds.includes(bId)) {
          return res.status(403).json({
            success: false,
            message: "Access denied: You are not authorized to create tables for this branch.",
            code: 'FORBIDDEN_BRANCH_ACCESS',
          });
        }
      }

      // Check for table number collision in this specific branch
      const existing = await query(
        'SELECT id FROM tables WHERE branch_id = $1 AND table_number = $2 LIMIT 1;',
        [bId, cleanTableNumber]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Table ${cleanTableNumber} already exists in this branch.`,
          code: 'TABLE_ALREADY_EXISTS',
        });
      }

      const sql = `
        INSERT INTO tables (branch_id, table_number, active)
        VALUES ($1, $2, $3)
        RETURNING id, branch_id, table_number, active, created_at;
      `;
      const result = await query(sql, [bId, cleanTableNumber, true]);

      return res.status(201).json({
        success: true,
        message: `Table ${cleanTableNumber} created successfully.`,
        data: result.rows[0],
      });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          message: 'A table with this number already exists in this branch.',
          code: 'TABLE_ALREADY_EXISTS',
        });
      }
      next(error);
    }
  },

  /**
   * PATCH /api/manager/tables/:id/status
   * Toggle table active status
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

      // Check table and branch ownership
      const tableCheck = await query('SELECT id, branch_id FROM tables WHERE id = $1 LIMIT 1;', [Number(id)]);
      if (tableCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Table not found.',
        });
      }

      const tableBranchId = Number(tableCheck.rows[0].branch_id);
      if (req.manager.role !== 'super_admin' && req.manager.role !== 'owner') {
        if (!req.manager.authorizedBranchIds.includes(tableBranchId)) {
          return res.status(403).json({
            success: false,
            message: "Access denied: You are not authorized to modify tables for this branch.",
            code: 'FORBIDDEN_BRANCH_ACCESS',
          });
        }
      }

      const sql = `UPDATE tables SET active = $1 WHERE id = $2 RETURNING id, branch_id, table_number, active, updated_at;`;
      const result = await query(sql, [Boolean(active), Number(id)]);

      return res.status(200).json({
        success: true,
        message: `Table ${result.rows[0].table_number} successfully ${result.rows[0].active ? 'activated' : 'deactivated'}.`,
        data: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  },
};
