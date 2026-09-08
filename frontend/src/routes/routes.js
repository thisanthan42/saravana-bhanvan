/**
 * Frontend Route Constants
 * Defines all client-side navigation URLs for the Saravana Bhavan Feedback Platform
 */
export const ROUTES = {
  HOME: '/',
  CUSTOMER_QR: '/q/:token',
  CUSTOMER_FEEDBACK_QR: '/feedback/q/:token',
  MANAGER_LOGIN: '/manager/login',
  MANAGER_DASHBOARD: '/manager',
  MANAGER_QR: '/manager/qr',
  SUPER_ADMIN: '/admin',
  SUPER_ADMIN_LOGIN: '/admin/login',
};

export function matchQRToken(pathname) {
  const match = pathname.match(/(?:\/feedback)?\/q\/([^/?#]+)/i);
  return match && match[1] ? match[1].trim() : '';
}
