import { query } from '../config/database.js';
import { AuthService } from '../services/authService.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Manager Model - Data Access Layer
 */
export const ManagerModel = {
  /**
   * Find manager by email (case-insensitive)
   * @param {string} email 
   */
  async findByEmail(email) {
    if (!email) return null;
    let cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === 'manager' || cleanEmail === 'admin') {
      cleanEmail = (process.env.DEFAULT_MANAGER_EMAIL || 'manager@saravanabhavan.com').toLowerCase();
    }

    const text = `
      SELECT id, name, email, password_hash, role, status, business_id, created_at, updated_at
      FROM managers
      WHERE LOWER(email) = $1
      LIMIT 1;
    `;
    const result = await query(text, [cleanEmail]);
    return result.rows[0] || null;
  },

  /**
   * Find manager by ID
   * @param {number|string} id 
   */
  async findById(id) {
    if (!id) return null;

    const text = `
      SELECT id, name, email, role, status, business_id, created_at, updated_at
      FROM managers
      WHERE id = $1
      LIMIT 1;
    `;
    const result = await query(text, [id]);
    return result.rows[0] || null;
  },

  /**
   * Create a new manager account
   */
  async create({ name, email, password, role = 'manager', status = 'active', businessId = 1 }) {
    const cleanEmail = email.trim().toLowerCase();
    const passwordHash = AuthService.hashPassword(password);

    const text = `
      INSERT INTO managers (name, email, password_hash, role, status, business_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, role, status, business_id, created_at;
    `;
    const result = await query(text, [name.trim(), cleanEmail, passwordHash, role, status, businessId]);
    return result.rows[0];
  },

  /**
   * Seed the default development manager account if one doesn't exist
   */
  async ensureDefaultManager() {
    const defaultEmail = (process.env.DEFAULT_MANAGER_EMAIL || 'manager@saravanabhavan.com').toLowerCase();
    const defaultPassword = process.env.DEFAULT_MANAGER_PASSWORD || 'test123';
    const defaultName = process.env.DEFAULT_MANAGER_NAME || 'Saravana Bhavan General Manager';

    try {
      const existing = await this.findByEmail(defaultEmail);
      if (!existing) {
        const created = await this.create({
          name: defaultName,
          email: defaultEmail,
          password: defaultPassword,
          role: 'super_admin',
        });
        console.log(`[Manager Seed] Created initial Super Admin account: ${defaultEmail}`);
        return created;
      }

      // Sync password hash if DEFAULT_MANAGER_PASSWORD was changed
      if (!AuthService.verifyPassword(defaultPassword, existing.password_hash)) {
        const newHash = AuthService.hashPassword(defaultPassword);
        await query('UPDATE managers SET password_hash = $1 WHERE id = $2;', [newHash, existing.id]);
        existing.password_hash = newHash;
        console.log(`[Manager Seed] Updated password hash for default manager: ${defaultEmail}`);
      }

      return existing;
    } catch (err) {
      console.warn(`[Manager Seed Warning] Could not ensure default manager: ${err.message}`);
      return null;
    }
  },

  /**
   * Retrieve list of branches that a manager is authorized to access.
   * If manager is super_admin or owner, returns all active branches.
   * If manager is branch manager, returns only explicitly assigned branches.
   */
  async getAuthorizedBranches(managerId, role) {
    if (role === 'super_admin' || role === 'owner') {
      const sql = `SELECT id, name, code, address, active FROM branches WHERE active = true ORDER BY id ASC;`;
      const res = await query(sql);
      return res.rows || [];
    }

    // Branch manager: query junction table
    const sql = `
      SELECT b.id, b.name, b.code, b.address, b.active
      FROM manager_branches mb
      JOIN branches b ON mb.branch_id = b.id
      WHERE mb.manager_id = $1 AND b.active = true
      ORDER BY b.id ASC;
    `;
    const res = await query(sql, [Number(managerId)]);
    return res.rows || [];
  },

  /**
   * Assign a manager to a branch in manager_branches
   */
  async assignBranch(managerId, branchId) {
    const checkSql = `SELECT id FROM manager_branches WHERE manager_id = $1 AND branch_id = $2;`;
    const checkRes = await query(checkSql, [Number(managerId), Number(branchId)]);
    if (checkRes.rows.length > 0) return checkRes.rows[0];

    const sql = `INSERT INTO manager_branches (manager_id, branch_id) VALUES ($1, $2) RETURNING id, manager_id, branch_id;`;
    const res = await query(sql, [Number(managerId), Number(branchId)]);
    return res.rows[0];
  },

  /**
   * Update manager account status (active / suspended)
   */
  async updateStatus(id, status) {
    const text = `
      UPDATE managers
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, email, role, status;
    `;
    const res = await query(text, [status, Number(id)]);
    return res.rows[0] || null;
  },

  /**
   * Reset manager password securely
   */
  async resetPassword(id, newPassword) {
    const passwordHash = AuthService.hashPassword(newPassword);
    const text = `
      UPDATE managers
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, email;
    `;
    const res = await query(text, [passwordHash, Number(id)]);
    return res.rows[0] || null;
  },

  /**
   * Reassign branches for a manager
   */
  async updateBranches(managerId, branchIds = []) {
    const mId = Number(managerId);
    // Delete existing
    await query(`DELETE FROM manager_branches WHERE manager_id = $1;`, [mId]);

    // Insert new
    for (const bId of branchIds) {
      await query(`INSERT INTO manager_branches (manager_id, branch_id) VALUES ($1, $2);`, [mId, Number(bId)]);
    }

    return await this.getAuthorizedBranches(mId, 'manager');
  },

  /**
   * Check status of a business
   */
  async getBusinessStatus(businessId) {
    const text = `SELECT id, name, status FROM businesses WHERE id = $1 LIMIT 1;`;
    const res = await query(text, [Number(businessId)]);
    return res.rows[0] || null;
  },

  /**
   * List all managers with their assigned branches (for Super Admin management)
   */
  async findAllWithBranches() {
    const sql = `
      SELECT m.id, m.name, m.email, m.role, m.status, m.business_id, m.created_at
      FROM managers m
      ORDER BY m.id ASC;
    `;
    const res = await query(sql);
    const managers = res.rows || [];

    const enriched = await Promise.all(
      managers.map(async (m) => {
        const branches = await this.getAuthorizedBranches(m.id, m.role);
        return {
          ...m,
          branches,
          branchIds: branches.map(b => b.id),
        };
      })
    );

    return enriched;
  },
};
