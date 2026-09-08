import { query } from '../config/database.js';

/**
 * Business Model - Hotel Enterprise Data Access Layer
 */
export const BusinessModel = {
  /**
   * List all businesses with branch, manager, and feedback counts
   */
  async findAll() {
    const text = `
      SELECT id, name, status, contact_email, contact_phone, created_at, updated_at
      FROM businesses
      ORDER BY id ASC;
    `;
    const res = await query(text);
    return res.rows || [];
  },

  /**
   * Find business by ID
   */
  async findById(id) {
    const text = `
      SELECT id, name, status, contact_email, contact_phone, created_at, updated_at
      FROM businesses
      WHERE id = $1
      LIMIT 1;
    `;
    const res = await query(text, [Number(id)]);
    return res.rows[0] || null;
  },

  /**
   * Create a new hotel business
   */
  async create({ name, status = 'active', contactEmail = null, contactPhone = null }) {
    const text = `
      INSERT INTO businesses (name, status, contact_email, contact_phone)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, status, contact_email, contact_phone, created_at;
    `;
    const res = await query(text, [name.trim(), status, contactEmail, contactPhone]);
    return res.rows[0];
  },

  /**
   * Update business status (active / suspended)
   */
  async updateStatus(id, status) {
    const text = `
      UPDATE businesses
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, status, updated_at;
    `;
    const res = await query(text, [status, Number(id)]);
    return res.rows[0] || null;
  },

  /**
   * Retrieve platform-wide calculated KPI statistics for Super Admin dashboard
   */
  async getPlatformStats() {
    // 1. Businesses counts
    const bizRes = await query(`SELECT id, status FROM businesses;`);
    const businesses = bizRes.rows || [];
    const totalBusinesses = businesses.length;
    const activeBusinesses = businesses.filter(b => b.status === 'active').length;
    const suspendedBusinesses = totalBusinesses - activeBusinesses;

    // 2. Managers counts
    const mgrRes = await query(`SELECT id, status, role FROM managers;`);
    const managers = mgrRes.rows || [];
    const regularManagers = managers.filter(m => m.role !== 'super_admin');
    const totalManagers = regularManagers.length;
    const activeManagers = regularManagers.filter(m => m.status === 'active').length;
    const suspendedManagers = totalManagers - activeManagers;

    // 3. Branches count
    const brRes = await query(`SELECT id, active FROM branches;`);
    const branches = brRes.rows || [];
    const totalBranches = branches.length;
    const activeBranches = branches.filter(b => b.active).length;

    // 4. QR Codes count
    const qrRes = await query(`SELECT id, active FROM qr_codes;`);
    const qrs = qrRes.rows || [];
    const totalQRCodes = qrs.length;
    const activeQRCodes = qrs.filter(q => q.active).length;

    // 5. Total Feedback
    const fbRes = await query(`SELECT id FROM feedback;`);
    const totalFeedback = (fbRes.rows || []).length;

    return {
      totalBusinesses,
      total_businesses: totalBusinesses,
      activeBusinesses,
      active_businesses: activeBusinesses,
      suspendedBusinesses,
      suspended_businesses: suspendedBusinesses,
      totalManagers,
      total_managers: totalManagers,
      activeManagers,
      active_managers: activeManagers,
      suspendedManagers,
      suspended_managers: suspendedManagers,
      totalBranches,
      total_branches: totalBranches,
      activeBranches,
      active_branches: activeBranches,
      totalQRCodes,
      total_qrcodes: totalQRCodes,
      total_qr_codes: totalQRCodes,
      activeQRCodes,
      active_qrcodes: activeQRCodes,
      totalFeedback,
      total_feedback: totalFeedback,
    };
  },
};
