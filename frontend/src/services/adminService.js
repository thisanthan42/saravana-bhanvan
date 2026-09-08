/**
 * Saravana Bhavan Super Admin Service - Client API Layer (Part 10)
 */

import { managerStorage } from './managerService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function adminFetch(endpoint, options = {}) {
  const token = managerStorage.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    managerStorage.clearToken();
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Session expired. Please log in again.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Admin request failed with status ${response.status}`);
  }

  return data;
}

/**
 * Fetch 8 live calculated platform summary metrics
 */
export async function fetchAdminStats() {
  return await adminFetch('/api/admin/stats');
}

/**
 * List all hotel businesses
 */
export async function fetchBusinesses() {
  return await adminFetch('/api/admin/businesses');
}

/**
 * Create a new hotel business
 */
export async function createBusiness({ name, contactEmail, contactPhone, status = 'active' }) {
  return await adminFetch('/api/admin/businesses', {
    method: 'POST',
    body: JSON.stringify({ name, contactEmail, contactPhone, status }),
  });
}

/**
 * Toggle business status (active / suspended)
 */
export async function toggleBusinessStatus(id, status) {
  return await adminFetch(`/api/admin/businesses/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

/**
 * List all manager accounts with business and branch assignments
 */
export async function fetchAdminManagers() {
  return await adminFetch('/api/admin/managers');
}

/**
 * Create a new manager account
 */
export async function createAdminManager({
  name,
  email,
  password,
  role = 'manager',
  status = 'active',
  businessId = 1,
  branchIds = [],
}) {
  return await adminFetch('/api/admin/managers', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role, status, businessId, branchIds }),
  });
}

/**
 * Toggle manager account status (active / suspended)
 */
export async function toggleManagerStatus(id, status) {
  return await adminFetch(`/api/admin/managers/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

/**
 * Update branch assignments for a manager
 */
export async function updateManagerBranches(id, branchIds) {
  return await adminFetch(`/api/admin/managers/${id}/branches`, {
    method: 'PATCH',
    body: JSON.stringify({ branchIds }),
  });
}

/**
 * Securely reset a manager's password
 */
export async function resetManagerPassword(id, password) {
  return await adminFetch(`/api/admin/managers/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

/**
 * List all branches across all businesses
 */
export async function fetchAdminBranches() {
  return await adminFetch('/api/admin/branches');
}

/**
 * Create a new branch for any business
 */
export async function createAdminBranch({ name, code, address, businessId = 1 }) {
  return await adminFetch('/api/admin/branches', {
    method: 'POST',
    body: JSON.stringify({ name, code, address, businessId }),
  });
}

/**
 * Toggle branch active status
 */
export async function toggleBranchStatus(id, active) {
  return await adminFetch(`/api/admin/branches/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
}

/**
 * Fetch chronological platform audit logs
 */
export async function fetchAuditLogs(limit = 50) {
  return await adminFetch(`/api/admin/audit-logs?limit=${limit}`);
}
