import crypto from 'crypto';
import { query } from '../config/database.js';

/**
 * Generates an unpredictable, cryptographically random public token.
 * Example: 'sb_7f8a91b2c3d4e5f67890abcd'
 */
export function generateSecureToken() {
  const randomPart = crypto.randomBytes(12).toString('hex');
  return `sb_${randomPart}`;
}

export const QRModel = {
  /**
   * Find a QR code record and its associated table/branch by its public token
   */
  async findByToken(token) {
    if (!token || typeof token !== 'string') return null;

    const sql = `
      SELECT 
        qr.id, qr.table_id, qr.public_token, qr.active, qr.scan_count, qr.last_scanned_at, qr.created_at,
        t.table_number, t.active AS table_active,
        b.id AS branch_id, b.name AS branch_name, b.code AS branch_code,
        biz.name AS business_name
      FROM qr_codes qr
      JOIN tables t ON qr.table_id = t.id
      JOIN branches b ON t.branch_id = b.id
      JOIN businesses biz ON b.business_id = biz.id
      WHERE qr.public_token = $1
      LIMIT 1;
    `;

    const result = await query(sql, [token.trim()]);
    return result.rows[0] || null;
  },

  /**
   * Find a QR code by primary key ID
   */
  async findById(id) {
    const sql = `
      SELECT 
        qr.id, qr.table_id, qr.public_token, qr.active, qr.scan_count, qr.last_scanned_at, qr.created_at,
        t.table_number, t.active AS table_active,
        b.id AS branch_id, b.name AS branch_name, b.code AS branch_code,
        biz.name AS business_name
      FROM qr_codes qr
      JOIN tables t ON qr.table_id = t.id
      JOIN branches b ON t.branch_id = b.id
      JOIN businesses biz ON b.business_id = biz.id
      WHERE qr.id = $1
      LIMIT 1;
    `;

    const result = await query(sql, [Number(id)]);
    return result.rows[0] || null;
  },

  /**
   * List all QR codes for manager management
   */
  async findAll({ branchId = null, active = null } = {}) {
    const sql = `
      SELECT 
        qr.id, qr.table_id, qr.public_token, qr.active, qr.scan_count, qr.last_scanned_at, qr.created_at,
        t.table_number, t.active AS table_active,
        b.id AS branch_id, b.name AS branch_name, b.code AS branch_code,
        biz.name AS business_name
      FROM qr_codes qr
      JOIN tables t ON qr.table_id = t.id
      JOIN branches b ON t.branch_id = b.id
      JOIN businesses biz ON b.business_id = biz.id
      ORDER BY qr.created_at DESC;
    `;

    const result = await query(sql);
    let rows = result.rows || [];

    if (branchId) {
      rows = rows.filter(r => Number(r.branch_id) === Number(branchId));
    }
    if (active !== null && active !== undefined && active !== 'all') {
      const boolActive = active === 'true' || active === true;
      rows = rows.filter(r => r.active === boolActive);
    }

    return rows;
  },

  /**
   * Create or find table, then generate a new QR code
   */
  async create({ branchId = 1, tableNumber }) {
    if (!tableNumber || String(tableNumber).trim() === '') {
      throw new Error('Table number is required');
    }

    const cleanTableNum = String(tableNumber).trim().replace(/^Table\s+/i, '');

    // 1. Check if table already exists in this branch
    let tableRes = await query(
      'SELECT id, branch_id, table_number, active FROM tables WHERE branch_id = $1 AND table_number = $2 LIMIT 1;',
      [Number(branchId), cleanTableNum]
    );

    let tableId;
    if (tableRes.rows.length === 0) {
      const newTableRes = await query(
        'INSERT INTO tables (branch_id, table_number, active) VALUES ($1, $2, $3) RETURNING id;',
        [Number(branchId), cleanTableNum, true]
      );
      tableId = newTableRes.rows[0].id;
    } else {
      tableId = tableRes.rows[0].id;
    }

    // 2. Generate a fresh, cryptographically unpredictable public token
    const publicToken = generateSecureToken();

    // 3. Insert new QR code record
    const qrRes = await query(
      'INSERT INTO qr_codes (table_id, public_token, active) VALUES ($1, $2, $3) RETURNING id;',
      [tableId, publicToken, true]
    );

    const newId = qrRes.rows[0].id;
    return await this.findById(newId);
  },

  /**
   * Toggle active status of a QR code
   */
  async toggleActive(id, activeState) {
    const sql = `UPDATE qr_codes SET active = $1 WHERE id = $2 RETURNING id, active;`;
    const result = await query(sql, [Boolean(activeState), Number(id)]);
    if (!result.rows[0]) return null;
    return await this.findById(id);
  },

  /**
   * Increment scan count and touch last_scanned_at
   */
  async incrementScan(token) {
    const sql = `UPDATE qr_codes SET scan_count = scan_count + 1 WHERE public_token = $1 RETURNING id, scan_count;`;
    await query(sql, [String(token).trim()]);
  },

  /**
   * Get all active branches (for manager dropdowns)
   */
  async listBranches() {
    const sql = `SELECT id, name, code, address, active FROM branches WHERE active = true ORDER BY name ASC;`;
    const result = await query(sql);
    return result.rows || [];
  },
};
