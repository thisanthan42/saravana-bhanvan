import { Router } from 'express';
import { FeedbackController } from '../controllers/feedbackController.js';
import { ManagerAuthController } from '../controllers/managerAuthController.js';
import { QRController } from '../controllers/qrController.js';
import { validateFeedback } from '../middleware/validateFeedback.js';
import { requireManagerAuth } from '../middleware/managerAuthMiddleware.js';
import {
  feedbackSubmitLimiter,
  sessionInitLimiter,
  qrResolveLimiter,
  managerLoginLimiter,
} from '../middleware/rateLimiter.js';

const router = Router();

// ====================================================================
// 1. PUBLIC STATUS & CUSTOMER ENDPOINTS
// ====================================================================

/**
 * @route   GET /api
 * @desc    API Root Status & Discovery Endpoint
 * @access  Public
 */
router.get(['/', ''], (req, res) => {
  return res.status(200).json({
    success: true,
    service: 'Saravana Bhavan Hotel Feedback API',
    status: 'online',
    version: '1.0.0',
    message: 'Saravana Bhavan Hotel Feedback API is active and operational.',
    endpoints: {
      health_check: 'GET /api/health',
      customer_feedback: 'POST /api/feedback',
      session_init: 'POST /api/public/session',
      qr_resolve: 'GET /api/public/qr/:token',
      manager_login: 'POST /api/manager/login',
      manager_feedback: 'GET /api/manager/feedback (Protected)',
    },
  });
});

/**
 * @route   POST /api/feedback
 * @desc    Submit customer feedback with rate limiting and idempotency
 * @access  Public (Guest)
 */
router.post('/feedback', feedbackSubmitLimiter, validateFeedback, FeedbackController.submit);

/**
 * @route   POST /api/public/session
 * @desc    Initialize a feedback submission session (binds optionally to QR token)
 * @access  Public
 */
router.post('/public/session', sessionInitLimiter, FeedbackController.initSession);

/**
 * @route   GET /api/public/qr/:token
 * @desc    Public QR resolution endpoint (returns minimal safe public info & active session)
 * @access  Public
 */
router.get('/public/qr/:token', qrResolveLimiter, QRController.resolvePublic);

/**
 * @route   GET /api/health
 * @desc    System and database health check
 * @access  Public
 */
router.get('/health', FeedbackController.health);

// ====================================================================
// 2. MANAGER AUTHENTICATION ENDPOINTS
// ====================================================================

/**
 * @route   POST /api/manager/login
 * @desc    Manager login with rate limiting, email and password, returns JWT token
 * @access  Public
 */
router.post('/manager/login', managerLoginLimiter, ManagerAuthController.login);

/**
 * @route   GET /api/manager/me
 * @desc    Retrieve currently authenticated manager profile
 * @access  Protected (Manager Only)
 */
router.get('/manager/me', requireManagerAuth, ManagerAuthController.me);

/**
 * @route   POST /api/manager/logout
 * @desc    Manager logout session
 * @access  Public / Protected
 */
router.post('/manager/logout', ManagerAuthController.logout);

// ====================================================================
// 3. PROTECTED MANAGER FEEDBACK DASHBOARD ENDPOINTS
// ====================================================================

/**
 * @route   GET /api/manager/feedback
 * @desc    Retrieve submitted feedback with filtering, search, sorting & pagination
 * @access  Protected (Manager Only)
 */
router.get('/manager/feedback', requireManagerAuth, FeedbackController.getAll);

/**
 * @route   GET /api/manager/feedback/:id
 * @desc    Retrieve single feedback item detail
 * @access  Protected (Manager Only)
 */
router.get('/manager/feedback/:id', requireManagerAuth, FeedbackController.getById);

/**
 * @route   DELETE /api/manager/feedback/:id
 * @desc    Delete a feedback record by ID
 * @access  Protected (Manager Only)
 */
router.delete('/manager/feedback/:id', requireManagerAuth, FeedbackController.deleteById);

/**
 * @route   PATCH /api/manager/feedback/:id/star
 * @desc    Toggle star/favorite status on a feedback record
 * @access  Protected (Manager Only)
 */
router.patch('/manager/feedback/:id/star', requireManagerAuth, FeedbackController.toggleStar);

/**
 * @route   GET /api/feedback
 * @desc    Backwards-compatible alias for manager reporting
 * @access  Protected (Manager Only)
 */
router.get('/feedback', requireManagerAuth, FeedbackController.getAll);

import { BranchController } from '../controllers/branchController.js';
import { TableController } from '../controllers/tableController.js';
import { requireSuperAdmin, requireBranchAccess } from '../middleware/managerAuthMiddleware.js';

// ====================================================================
// 4. PROTECTED MANAGER QR CODE MANAGEMENT ENDPOINTS (Part 7 & 9)
// ====================================================================

/**
 * @route   GET /api/manager/qr
 * @desc    List all generated QR codes for tables/branches
 * @access  Protected (Manager Only)
 */
router.get('/manager/qr', requireManagerAuth, QRController.list);

/**
 * @route   POST /api/manager/qr
 * @desc    Generate a new QR code for a specific branch & table
 * @access  Protected (Manager Only)
 */
router.post('/manager/qr', requireManagerAuth, QRController.generate);

/**
 * @route   PATCH /api/manager/qr/:id/status
 * @desc    Activate or deactivate a table QR code
 * @access  Protected (Manager Only)
 */
router.patch('/manager/qr/:id/status', requireManagerAuth, QRController.toggleStatus);

// ====================================================================
// 5. PROTECTED MULTI-BRANCH MANAGEMENT ENDPOINTS (Part 9)
// ====================================================================

/**
 * @route   GET /api/manager/branches
 * @desc    List branches accessible to the authenticated manager
 * @access  Protected (Manager / Super Admin)
 */
router.get('/manager/branches', requireManagerAuth, BranchController.list);

/**
 * @route   POST /api/manager/branches
 * @desc    Create a new hotel branch (Super Admin only)
 * @access  Protected (Super Admin)
 */
router.post('/manager/branches', requireManagerAuth, requireSuperAdmin, BranchController.create);

/**
 * @route   PATCH /api/manager/branches/:id/status
 * @desc    Activate or deactivate a branch (Super Admin only)
 * @access  Protected (Super Admin)
 */
router.patch('/manager/branches/:id/status', requireManagerAuth, requireSuperAdmin, BranchController.toggleStatus);

// ====================================================================
// 6. PROTECTED DINING TABLE MANAGEMENT ENDPOINTS (Part 9)
// ====================================================================

/**
 * @route   GET /api/manager/tables
 * @desc    List tables for an authorized branch
 * @access  Protected (Manager / Super Admin)
 */
router.get('/manager/tables', requireManagerAuth, TableController.list);

/**
 * @route   POST /api/manager/tables
 * @desc    Create a dining table in an authorized branch
 * @access  Protected (Manager / Super Admin)
 */
router.post('/manager/tables', requireManagerAuth, TableController.create);

/**
 * @route   PATCH /api/manager/tables/:id/status
 * @desc    Toggle table active status
 * @access  Protected (Manager / Super Admin)
 */
router.patch('/manager/tables/:id/status', requireManagerAuth, TableController.toggleStatus);

// ====================================================================
// 7. SUPER ADMIN MANAGER USER MANAGEMENT (Part 9)
// ====================================================================

/**
 * @route   GET /api/manager/users
 * @desc    List all managers and their branch assignments
 * @access  Protected (Super Admin)
 */
router.get('/manager/users', requireManagerAuth, requireSuperAdmin, ManagerAuthController.listUsers);

/**
 * @route   POST /api/manager/users
 * @desc    Provision a new manager and assign branch(es)
 * @access  Protected (Super Admin)
 */
router.post('/manager/users', requireManagerAuth, requireSuperAdmin, ManagerAuthController.createUser);

import { AdminController } from '../controllers/adminController.js';

// ====================================================================
// 8. SUPER ADMIN & PLATFORM OWNER CONTROL PANEL ENDPOINTS (Part 10)
// ====================================================================

/**
 * @route   GET /api/admin/stats
 * @desc    Get 8 calculated KPI summary metrics for Platform Owner
 * @access  Protected (Super Admin)
 */
router.get('/admin/stats', requireManagerAuth, requireSuperAdmin, AdminController.getStats);

/**
 * @route   GET /api/admin/businesses
 * @desc    List all businesses with metrics
 * @access  Protected (Super Admin)
 */
router.get('/admin/businesses', requireManagerAuth, requireSuperAdmin, AdminController.listBusinesses);

/**
 * @route   POST /api/admin/businesses
 * @desc    Create a new business
 * @access  Protected (Super Admin)
 */
router.post('/admin/businesses', requireManagerAuth, requireSuperAdmin, AdminController.createBusiness);

/**
 * @route   PATCH /api/admin/businesses/:id/status
 * @desc    Activate or suspend a business
 * @access  Protected (Super Admin)
 */
router.patch('/admin/businesses/:id/status', requireManagerAuth, requireSuperAdmin, AdminController.toggleBusinessStatus);

/**
 * @route   GET /api/admin/managers
 * @desc    List all managers with status, business and branch assignments
 * @access  Protected (Super Admin)
 */
router.get('/admin/managers', requireManagerAuth, requireSuperAdmin, AdminController.listManagers);

/**
 * @route   POST /api/admin/managers
 * @desc    Create a new manager
 * @access  Protected (Super Admin)
 */
router.post('/admin/managers', requireManagerAuth, requireSuperAdmin, AdminController.createManager);

/**
 * @route   PATCH /api/admin/managers/:id/status
 * @desc    Activate or suspend a manager account
 * @access  Protected (Super Admin)
 */
router.patch('/admin/managers/:id/status', requireManagerAuth, requireSuperAdmin, AdminController.toggleManagerStatus);

/**
 * @route   PATCH /api/admin/managers/:id/branches
 * @desc    Update branch assignments for a manager
 * @access  Protected (Super Admin)
 */
router.patch('/admin/managers/:id/branches', requireManagerAuth, requireSuperAdmin, AdminController.updateManagerBranches);

/**
 * @route   POST /api/admin/managers/:id/reset-password
 * @desc    Reset manager password securely
 * @access  Protected (Super Admin)
 */
router.post('/admin/managers/:id/reset-password', requireManagerAuth, requireSuperAdmin, AdminController.resetManagerPassword);

/**
 * @route   GET /api/admin/branches
 * @desc    List all branches across all businesses
 * @access  Protected (Super Admin)
 */
router.get('/admin/branches', requireManagerAuth, requireSuperAdmin, AdminController.listBranches);

/**
 * @route   POST /api/admin/branches
 * @desc    Create a new branch for any business
 * @access  Protected (Super Admin)
 */
router.post('/admin/branches', requireManagerAuth, requireSuperAdmin, AdminController.createBranch);

/**
 * @route   PATCH /api/admin/branches/:id/status
 * @desc    Toggle branch active status
 * @access  Protected (Super Admin)
 */
router.patch('/admin/branches/:id/status', requireManagerAuth, requireSuperAdmin, AdminController.toggleBranchStatus);

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Retrieve platform owner audit log events
 * @access  Protected (Super Admin)
 */
router.get('/admin/audit-logs', requireManagerAuth, requireSuperAdmin, AdminController.listAuditLogs);

export default router;
