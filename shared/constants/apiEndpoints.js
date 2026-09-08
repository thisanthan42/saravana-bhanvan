/**
 * Master REST API Endpoints Dictionary
 */
export const API_ENDPOINTS = {
  PUBLIC: {
    ROOT: '/api',
    HEALTH: '/api/health',
    SESSION: '/api/public/session',
    QR_RESOLVE: '/api/public/qr/:token',
    FEEDBACK_SUBMIT: '/api/feedback',
  },
  MANAGER: {
    LOGIN: '/api/manager/login',
    ME: '/api/manager/me',
    LOGOUT: '/api/manager/logout',
    FEEDBACK_LIST: '/api/manager/feedback',
    FEEDBACK_DETAIL: '/api/manager/feedback/:id',
    QR_LIST: '/api/manager/qr',
    QR_GENERATE: '/api/manager/qr',
    QR_STATUS: '/api/manager/qr/:id/status',
  },
  ADMIN: {
    OVERVIEW: '/api/admin/overview',
    BUSINESSES: '/api/admin/businesses',
    BRANCHES: '/api/admin/branches',
    MANAGERS: '/api/admin/managers',
    AUDIT_LOGS: '/api/admin/audit',
  },
};
