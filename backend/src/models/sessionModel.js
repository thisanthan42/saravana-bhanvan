import crypto from 'crypto';
import { query } from '../config/database.js';

/**
 * Generates an unpredictable, cryptographically random feedback session token.
 * Format: sbsess_<32_hex_characters>
 */
export function generateSessionToken() {
  const randomPart = crypto.randomBytes(16).toString('hex');
  return `sbsess_${randomPart}`;
}

/**
 * Hash client IP for privacy-preserving rate/abuse tracing
 */
export function hashClientIp(ip = '') {
  if (!ip) return null;
  return crypto.createHash('sha256').update(String(ip)).digest('hex').substring(0, 16);
}

export const SessionModel = {
  /**
   * Create a new active feedback session bound optionally to a QR token
   */
  async create({ qrToken = null, clientIp = '' } = {}) {
    const sessionToken = generateSessionToken();
    const ipHash = hashClientIp(clientIp);

    const sql = `
      INSERT INTO feedback_sessions (session_token, qr_token, status, client_ip_hash)
      VALUES ($1, $2, $3, $4)
      RETURNING id, session_token, qr_token, status, created_at;
    `;

    const result = await query(sql, [sessionToken, qrToken || null, 'active', ipHash]);
    return result.rows[0];
  },

  /**
   * Find a feedback session by token
   */
  async findByToken(sessionToken) {
    if (!sessionToken || typeof sessionToken !== 'string') return null;

    const sql = `
      SELECT id, session_token, qr_token, status, feedback_id, client_ip_hash, created_at, completed_at
      FROM feedback_sessions
      WHERE session_token = $1
      LIMIT 1;
    `;

    const result = await query(sql, [sessionToken.trim()]);
    return result.rows[0] || null;
  },

  /**
   * Atomically claim an active session and mark it as completed.
   * Uses WHERE status = 'active' to ensure race condition immunity.
   * Returns the updated session record if claimed, or null if already completed/missing.
   */
  async claimAndComplete(sessionToken, feedbackId = null) {
    if (!sessionToken || typeof sessionToken !== 'string') return null;

    const sql = `
      UPDATE feedback_sessions
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP, feedback_id = $2
      WHERE session_token = $1 AND status = 'active'
      RETURNING id, session_token, status, completed_at, feedback_id;
    `;

    const result = await query(sql, [sessionToken.trim(), feedbackId]);
    return result.rows[0] || null;
  },
};
