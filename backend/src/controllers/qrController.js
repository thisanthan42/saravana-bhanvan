import { QRModel } from '../models/qrModel.js';
import { SessionModel } from '../models/sessionModel.js';
import dotenv from 'dotenv';

dotenv.config();

function getPublicAppUrl() {
  const isProd = process.env.NODE_ENV === 'production';
  let url = process.env.PUBLIC_APP_URL;

  if (!url) {
    if (isProd) {
      // In production without PUBLIC_APP_URL, find first HTTPS origin in CORS_ORIGIN
      const origins = (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean);
      const httpsOrigin = origins.find(o => o.startsWith('https://'));
      url = httpsOrigin || 'https://feedback.saravanabhavan.com';
    } else {
      // In development, default to frontend Vite dev server
      url = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',')[0].trim() : 'http://localhost:3000';
    }
  }

  // Strip trailing slashes
  url = url.replace(/\/+$/, '');

  // Critical Production Guard: NEVER allow localhost, 127.0.0.1, or 0.0.0.0 in production QRs
  if (isProd && (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('0.0.0.0'))) {
    console.warn('[QR Warning] Production environment detected with localhost PUBLIC_APP_URL. Falling back to secure HTTPS domain.');
    url = 'https://feedback.saravanabhavan.com';
  }

  return url;
}

export const QRController = {
  /**
   * GET /api/public/qr/:token
   * Public QR Token Resolution Endpoint
   * Returns minimal public feedback information (zero internal IDs or table/branch details)
   */
  async resolvePublic(req, res, next) {
    try {
      const { token } = req.params;

      if (!token || typeof token !== 'string' || token.trim().length === 0) {
        return res.status(400).json({
          success: false,
          valid: false,
          active: false,
          message: 'Invalid QR token format.',
        });
      }

      const qrRecord = await QRModel.findByToken(token.trim());

      // If token does not exist, or QR is deactivated, or Table is deactivated
      if (!qrRecord || !qrRecord.active || qrRecord.table_active === false) {
        return res.status(404).json({
          success: false,
          valid: false,
          active: false,
          message: 'Sorry, this feedback QR code is no longer available.',
        });
      }

      // Increment scan counter in the background
      QRModel.incrementScan(token).catch(err => console.warn('[QR Scan Metric Error]', err.message));

      // Create an active feedback session for this scan (Part 8)
      const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
      const clientIp = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '';
      const session = await SessionModel.create({
        qrToken: qrRecord.public_token,
        clientIp,
      });

      // Customer-safe response without exposing internal branch/table data
      return res.status(200).json({
        success: true,
        valid: true,
        active: true,
        data: {
          hotel_name: qrRecord.business_name || 'Saravana Bhavan Hotel',
          welcome_title: 'Welcome to Saravana Bhavan',
          welcome_subtitle: 'Your experience is our greatest recipe for improvement.',
          session_token: session.session_token,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/manager/qr
   * Protected Manager Endpoint: Retrieve all QR codes with branch authorization
   */
  async list(req, res, next) {
    try {
      const { branchId, active } = req.query;
      const isSuperAdmin = req.manager?.role === 'super_admin' || req.manager?.role === 'owner';

      // Anti-IDOR: Check if branch is specified
      if (branchId && branchId !== 'all') {
        const targetBId = Number(branchId);
        if (!isSuperAdmin && !req.manager.authorizedBranchIds.includes(targetBId)) {
          return res.status(403).json({
            success: false,
            message: "Access denied: You are not authorized to view QR codes for this branch.",
            code: 'FORBIDDEN_BRANCH_ACCESS',
          });
        }
      }

      let records = await QRModel.findAll({ branchId, active });

      // Scope to authorized branches for branch managers
      if (!isSuperAdmin) {
        records = records.filter(r => req.manager.authorizedBranchIds.includes(Number(r.branch_id)));
      }

      const publicBaseUrl = getPublicAppUrl();

      const enriched = records.map(r => ({
        id: r.id,
        table_id: r.table_id,
        table_number: r.table_number,
        branch_id: r.branch_id,
        branch_name: r.branch_name,
        branch_code: r.branch_code,
        public_token: r.public_token,
        public_url: `${publicBaseUrl}/q/${r.public_token}`,
        active: r.active,
        scan_count: r.scan_count || 0,
        last_scanned_at: r.last_scanned_at,
        created_at: r.created_at,
      }));

      return res.status(200).json({
        success: true,
        count: enriched.length,
        data: enriched,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/manager/qr
   * Protected Manager Endpoint: Generate a new QR code for a specific table in authorized branch
   */
  async generate(req, res, next) {
    try {
      const { branchId = 1, tableNumber } = req.body;
      const bId = Number(branchId) || 1;
      const isSuperAdmin = req.manager?.role === 'super_admin' || req.manager?.role === 'owner';

      // Anti-IDOR Check:
      if (!isSuperAdmin && !req.manager.authorizedBranchIds.includes(bId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You are not authorized to generate QR codes for this branch.",
          code: 'FORBIDDEN_BRANCH_ACCESS',
        });
      }

      if (!tableNumber || String(tableNumber).trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Table number is required to generate a QR code.',
        });
      }

      const newQR = await QRModel.create({
        branchId: bId,
        tableNumber: String(tableNumber).trim(),
      });

      const publicBaseUrl = getPublicAppUrl();

      return res.status(201).json({
        success: true,
        message: 'QR code generated successfully.',
        data: {
          id: newQR.id,
          table_id: newQR.table_id,
          table_number: newQR.table_number,
          branch_id: newQR.branch_id,
          branch_name: newQR.branch_name,
          public_token: newQR.public_token,
          public_url: `${publicBaseUrl}/q/${newQR.public_token}`,
          active: newQR.active,
          created_at: newQR.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/manager/qr/:id/status
   * Protected Manager Endpoint: Toggle QR code active/inactive status
   */
  async toggleStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { active } = req.body;
      const isSuperAdmin = req.manager?.role === 'super_admin' || req.manager?.role === 'owner';

      if (active === undefined || active === null) {
        return res.status(400).json({
          success: false,
          message: 'Status "active" (true or false) is required.',
        });
      }

      // Check QR branch authorization
      const qrRecord = await QRModel.findById(id);
      if (!qrRecord) {
        return res.status(404).json({
          success: false,
          message: 'QR code record not found.',
        });
      }

      if (!isSuperAdmin && !req.manager.authorizedBranchIds.includes(Number(qrRecord.branch_id))) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You are not authorized to modify QR codes for this branch.",
          code: 'FORBIDDEN_BRANCH_ACCESS',
        });
      }

      const updated = await QRModel.toggleActive(id, Boolean(active));

      return res.status(200).json({
        success: true,
        message: `QR code successfully ${updated.active ? 'activated' : 'deactivated'}.`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/manager/branches
   * Protected Manager Endpoint: Retrieve authorized branches for dropdown selections
   */
  async listBranches(req, res, next) {
    try {
      if (req.manager?.role === 'super_admin' || req.manager?.role === 'owner') {
        const branches = await QRModel.listBranches();
        return res.status(200).json({
          success: true,
          data: branches,
        });
      }

      // Return only authorized branches for branch manager
      return res.status(200).json({
        success: true,
        data: req.manager?.authorizedBranches || [],
      });
    } catch (error) {
      next(error);
    }
  },
};
