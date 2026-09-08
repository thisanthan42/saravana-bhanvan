/**
 * Saravana Bhavan Manager Service - Client API Layer
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const TOKEN_KEY = 'sb_manager_jwt_token';
const MANAGER_KEY = 'sb_manager_profile';

export const managerStorage = {
  getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || null;
  },
  setToken(token, manager) {
    sessionStorage.setItem(TOKEN_KEY, token);
    if (manager) {
      sessionStorage.setItem(MANAGER_KEY, JSON.stringify(manager));
    }
  },
  clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(MANAGER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(MANAGER_KEY);
  },
  getManager() {
    const raw = sessionStorage.getItem(MANAGER_KEY) || localStorage.getItem(MANAGER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
};

/**
 * Perform an authenticated manager API request
 */
async function managerFetch(endpoint, options = {}) {
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

  // Handle unauthorized or expired sessions
  if (response.status === 401) {
    managerStorage.clearToken();
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Session expired. Please log in again.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

/**
 * Manager Login
 */
export async function managerLogin(email, password) {
  const response = await fetch(`${API_BASE_URL}/api/manager/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Invalid username or password.');
  }

  // Save token and profile to session storage
  managerStorage.setToken(data.token, data.manager);
  return data;
}

/**
 * Retrieve Current Manager Profile
 */
export async function getManagerProfile() {
  return await managerFetch('/api/manager/me');
}

/**
 * Manager Logout
 */
export async function managerLogout() {
  try {
    await managerFetch('/api/manager/logout', { method: 'POST' });
  } catch (e) {
    console.warn('Logout notification error:', e);
  } finally {
    managerStorage.clearToken();
  }
}

/**
 * Fetch Manager Feedback with Filtering, Search, Sorting, and Pagination
 */
export async function fetchManagerFeedback({
  rating = 'all',
  needsAction = 'all',
  search = '',
  dateRange = 'all',
  startDate = null,
  endDate = null,
  sort = 'newest',
  page = 1,
  limit = 20,
  branchId = null,
} = {}) {
  const params = new URLSearchParams();
  if (rating && rating !== 'all') params.append('rating', rating);
  if (needsAction && needsAction !== 'all') params.append('needsAction', String(needsAction));
  if (search && search.trim()) params.append('search', search.trim());
  if (dateRange && dateRange !== 'all') params.append('dateRange', dateRange);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (sort) params.append('sort', sort);
  if (page) params.append('page', String(page));
  if (limit) params.append('limit', String(limit));
  if (branchId && branchId !== 'all') params.append('branchId', String(branchId));

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  return await managerFetch(`/api/manager/feedback${queryStr}`);
}

/**
 * Fetch All QR Codes for Manager Management
 */
export async function fetchManagerQRs({ branchId, active } = {}) {
  const params = new URLSearchParams();
  if (branchId && branchId !== 'all') params.append('branchId', branchId);
  if (active !== undefined && active !== null && active !== 'all') params.append('active', String(active));

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  return await managerFetch(`/api/manager/qr${queryStr}`);
}

/**
 * Generate a New Table QR Code
 */
export async function generateManagerQR({ branchId = 1, tableNumber }) {
  return await managerFetch('/api/manager/qr', {
    method: 'POST',
    body: JSON.stringify({ branchId, tableNumber }),
  });
}

/**
 * Toggle Active / Inactive Status of a QR Code
 */
export async function toggleQRStatus(id, active) {
  return await managerFetch(`/api/manager/qr/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ active: Boolean(active) }),
  });
}

/**
 * Fetch List of Branches Accessible to Logged-In User
 */
export async function fetchBranches() {
  return await managerFetch('/api/manager/branches');
}

/**
 * Create a New Hotel Branch (Super Admin)
 */
export async function createBranch({ name, code, address }) {
  return await managerFetch('/api/manager/branches', {
    method: 'POST',
    body: JSON.stringify({ name, code, address }),
  });
}

/**
 * Fetch Tables for a Branch
 */
export async function fetchTables({ branchId = 1 } = {}) {
  return await managerFetch(`/api/manager/tables?branchId=${branchId}`);
}

/**
 * Create a Table in an Authorized Branch
 */
export async function createTable({ branchId = 1, tableNumber }) {
  return await managerFetch('/api/manager/tables', {
    method: 'POST',
    body: JSON.stringify({ branchId, tableNumber }),
  });
}

/**
 * Fetch Managers with Branch Assignments (Super Admin)
 */
export async function fetchManagers() {
  return await managerFetch('/api/manager/users');
}

/**
 * Create a New Branch Manager and Assign Branches (Super Admin)
 */
export async function createManager({ name, email, password, role = 'manager', branchIds = [] }) {
  return await managerFetch('/api/manager/users', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role, branchIds }),
  });
}

