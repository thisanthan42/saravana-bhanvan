import { FeedbackModel, matchesBranch } from '../models/feedbackModel.js';
import { SessionModel } from '../models/sessionModel.js';
import { QRModel } from '../models/qrModel.js';
import { testConnection } from '../config/database.js';

/**
 * Feedback Controller - Request Handlers
 */
export const FeedbackController = {
  /**
   * POST /api/public/session
   * Public endpoint to initialize a new feedback session
   */
  async initSession(req, res, next) {
    try {
      const { qr_token, token } = req.body || {};
      const requestedQR = qr_token || token || null;

      if (requestedQR) {
        const qrRecord = await QRModel.findByToken(requestedQR);
        if (!qrRecord || !qrRecord.active || qrRecord.table_active === false) {
          return res.status(400).json({
            success: false,
            message: 'Invalid or inactive feedback QR code.',
          });
        }
      }

      const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
      const clientIp = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '';

      const session = await SessionModel.create({
        qrToken: requestedQR,
        clientIp,
      });

      return res.status(201).json({
        success: true,
        message: 'Feedback session initialized',
        data: {
          session_token: session.session_token,
          qr_token: session.qr_token,
          status: session.status,
          created_at: session.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/feedback
   * Public customer feedback submission endpoint with atomic idempotency and duplicate defense
   */
  async submit(req, res, next) {
    try {
      const validatedData = req.validatedFeedback;
      let sessionToken = validatedData.session_token;

      // 1. Atomic session claiming for race condition & idempotency defense
      if (sessionToken) {
        const sessionRecord = await SessionModel.findByToken(sessionToken);
        if (sessionRecord) {
          if (sessionRecord.status === 'completed') {
            console.warn(`[Security Alert: Blocked Replay/Duplicate] Session already completed: ${sessionToken}`);
            return res.status(409).json({
              success: false,
              message: 'This feedback session has already been completed.',
              code: 'SESSION_ALREADY_COMPLETED',
            });
          }
          // Attempt atomic status transition from 'active' to 'completed'
          const claimed = await SessionModel.claimAndComplete(sessionToken);
          if (!claimed) {
            console.warn(`[Security Alert: Blocked Concurrent Race Condition] Session ${sessionToken}`);
            return res.status(409).json({
              success: false,
              message: 'This feedback session has already been completed.',
              code: 'SESSION_ALREADY_COMPLETED',
            });
          }
        } else {
          // If session token was provided by client but not pre-registered in DB, claim it
          const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
          const clientIp = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '';
          try {
            await SessionModel.create({
              qrToken: validatedData.token || null,
              clientIp,
            });
            await SessionModel.claimAndComplete(sessionToken);
          } catch (err) {
            if (err.code === '23505') {
              return res.status(409).json({
                success: false,
                message: 'This feedback session has already been completed.',
                code: 'SESSION_ALREADY_COMPLETED',
              });
            }
            throw err;
          }
        }
      } else {
        // Auto-generate fresh session token for legacy submissions / test scripts
        const newSession = await SessionModel.create({
          qrToken: validatedData.token || null,
          clientIp: req.ip || '',
        });
        sessionToken = newSession.session_token;
        validatedData.session_token = sessionToken;
        await SessionModel.claimAndComplete(sessionToken);
      }

      // Derive internal branch_id and table_id from QR code record (customer cannot manipulate)
      const qrTokenToLookup = validatedData.token || null;
      if (qrTokenToLookup) {
        const qrRecord = await QRModel.findByToken(qrTokenToLookup);
        if (qrRecord) {
          validatedData.branch_id = qrRecord.branch_name || String(qrRecord.branch_id);
          const rawTableNum = String(qrRecord.table_number);
          validatedData.table_id = rawTableNum.startsWith('Table') ? rawTableNum : `Table ${rawTableNum}`;
        }
      } else if (!validatedData.branch_id) {
        validatedData.branch_id = 'Chennai Central'; // Default: Chennai Central
      }

      // 2. Insert into database
      let record;
      try {
        record = await FeedbackModel.create(validatedData);
      } catch (insertError) {
        if (insertError.code === '23505') {
          console.warn(`[Database Unique Constraint Violation] Duplicate session_token: ${sessionToken}`);
          return res.status(409).json({
            success: false,
            message: 'This feedback session has already been completed.',
            code: 'SESSION_ALREADY_COMPLETED',
          });
        }
        throw insertError;
      }

      console.log(`[Feedback Ingestion] Created feedback #${record.id} for session ${sessionToken}`);

      return res.status(201).json({
        success: true,
        message: 'Feedback submitted successfully',
        data: {
          id: record.id,
          session_token: sessionToken,
          submitted_at: record.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/manager/feedback (also supports GET /api/feedback with manager auth)
   * Protected endpoint for manager dashboard with filtering, search, sorting & pagination
   */
  async getAll(req, res, next) {
    try {
      const {
        rating = 'all',
        needsAction = 'all',
        search = '',
        dateRange = 'all',
        startDate = null,
        endDate = null,
        sort = 'newest',
        page = 1,
        limit = 20,
        branchId,
      } = req.query;

      const isSuperAdmin = req.manager?.role === 'super_admin' || req.manager?.role === 'owner';
      let effectiveBranchId = branchId && branchId !== 'all' ? String(branchId) : null;
      let allowedBranchIds = null;

      // Server-Side Anti-IDOR Check:
      if (effectiveBranchId) {
        if (!isSuperAdmin) {
          const targetNum = Number(effectiveBranchId);
          if (!req.manager.authorizedBranchIds.includes(targetNum)) {
            console.warn(`[Security Alert: IDOR Blocked] Manager #${req.manager.id} requested unauthorized branch #${effectiveBranchId} feedback`);
            return res.status(403).json({
              success: false,
              message: "Access denied: You are not authorized to view feedback for this branch.",
              code: 'FORBIDDEN_BRANCH_ACCESS',
            });
          }
        }
      } else if (!isSuperAdmin) {
        // Scope to manager's authorized branches
        if (req.manager.authorizedBranchIds.length === 1) {
          effectiveBranchId = String(req.manager.authorizedBranchIds[0]);
        } else if (req.manager.authorizedBranchIds.length > 1) {
          allowedBranchIds = req.manager.authorizedBranchIds;
        } else {
          // No assigned branch
          effectiveBranchId = '-1';
        }
      }

      const [paginatedResult, metrics] = await Promise.all([
        FeedbackModel.findAll({
          rating,
          needsAction,
          search,
          dateRange,
          startDate,
          endDate,
          sort,
          page,
          limit,
          branchId: effectiveBranchId,
          allowedBranchIds,
        }),
        FeedbackModel.getMetrics(effectiveBranchId, allowedBranchIds),
      ]);

      return res.status(200).json({
        success: true,
        summary: metrics,
        pagination: paginatedResult.pagination,
        currentPage: paginatedResult.pagination.currentPage,
        totalPages: paginatedResult.pagination.totalPages,
        totalResults: paginatedResult.pagination.totalResults,
        limit: paginatedResult.pagination.limit,
        count: paginatedResult.records.length,
        data: paginatedResult.records,
        feedback: paginatedResult.records,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/manager/feedback/:id
   * Protected endpoint to retrieve single feedback item details
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const item = await FeedbackModel.findById(id);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Feedback record not found',
        });
      }

      // Check branch authorization
      const isSuperAdmin = req.manager?.role === 'super_admin' || req.manager?.role === 'owner';
      if (!isSuperAdmin && item.branch_id) {
        const isAuthorized = req.manager.authorizedBranchIds.some(bId => matchesBranch(item.branch_id, bId));
        if (!isAuthorized) {
          return res.status(403).json({
            success: false,
            message: "Access denied: You are not authorized to view feedback for this branch.",
            code: 'FORBIDDEN_BRANCH_ACCESS',
          });
        }
      }

      return res.status(200).json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/health
   * System health check & database connectivity test
   */
  async health(req, res) {
    const dbStatus = await testConnection();

    return res.status(200).json({
      success: true,
      service: 'Saravana Bhavan Feedback API',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbStatus,
    });
  },
};
