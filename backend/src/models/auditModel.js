import { query } from '../config/database.js';

/**
 * Audit Model - Records administrative platform events
 */
export const AuditModel = {
  /**
   * Log an administrative action
   * @param {Object} param0
   */
  async log({ userId, action, entityType, entityId, details = {} }) {
    try {
      const text = `
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, action, entity_type, entity_id, created_at;
      `;
      const res = await query(text, [
        userId || null,
        action,
        entityType,
        entityId || null,
        typeof details === 'string' ? details : JSON.stringify(details),
      ]);
      return res.rows[0];
    } catch (err) {
      console.warn(`[Audit Log Warning] Failed to write audit event: ${err.message}`);
      return null;
    }
  },

  /**
   * List recent audit logs
   * @param {number} limit 
   */
  async listRecent(limit = 50) {
    const text = `
      SELECT id, user_id, action, entity_type, entity_id, details, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT $1;
    `;
    const res = await query(text, [Number(limit)]);
    return res.rows || [];
  },
};
