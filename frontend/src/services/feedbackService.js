/**
 * Saravana Bhavan Feedback Service
 * 
 * Future-proof client-side service layer designed to connect directly
 * to a backend API (e.g. POST /api/v1/feedback) in subsequent steps.
 */

// Generate a random customer-friendly reference ID e.g., SB-89241
function generateSubmissionId() {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `SB-${randomNum}`;
}

// Extract table, branch, and future QR token details from path or query params
export function getDiningContext() {
  if (typeof window === 'undefined') {
    return { branch: '', table: '', token: '' };
  }

  const params = new URLSearchParams(window.location.search);
  const branch = params.get('branch') || '';
  const table = params.get('table') ? `Table ${params.get('table')}` : '';
  let token = params.get('token') || '';

  // Also support clean /q/:token and /feedback/q/:token path patterns
  if (!token) {
    const pathname = window.location.pathname;
    const match = pathname.match(/(?:\/feedback)?\/q\/([^/?#]+)/i);
    if (match && match[1]) {
      token = match[1].trim();
    }
  }

  return { branch, table, token };
}

// Session keys to prevent duplicate submissions and track session idempotency
const SESSION_STORAGE_KEY = 'sb_feedback_submitted';
const SESSION_TOKEN_KEY = 'sb_feedback_session_token';

export function getOrCreateSessionToken() {
  try {
    let token = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (!token) {
      token = `sbsess_${Math.random().toString(36).substring(2, 12)}${Math.random().toString(36).substring(2, 12)}`;
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    }
    return token;
  } catch {
    return `sbsess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }
}

export function setSessionToken(token) {
  try {
    if (token) sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  } catch {
    // Ignore storage errors
  }
}

export function hasSubmittedInSession() {
  try {
    return !!sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return false;
  }
}

export function getSessionSubmissionData() {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSessionFeedback() {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // Ignore storage errors
  }
}

// Configurable Backend API URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Validate and resolve a public QR token with the backend
 */
export async function resolveQRToken(token) {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    return { valid: false, message: 'Invalid QR token' };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/public/qr/${encodeURIComponent(token.trim())}`);
    const data = await res.json().catch(() => null);

    if (res.ok && data?.valid && data?.active) {
      if (data.data?.session_token) {
        setSessionToken(data.data.session_token);
      }
      return {
        valid: true,
        active: true,
        data: data.data,
      };
    }

    return {
      valid: false,
      active: false,
      message: data?.message || 'Sorry, this feedback QR code is no longer available.',
    };
  } catch (err) {
    console.warn('[QR Resolution Error]', err);
    return {
      valid: false,
      active: false,
      message: 'Unable to connect to verification server. Please check your network or contact hotel staff.',
    };
  }
}

/**
 * Submit customer feedback to the backend REST API.
 * Returns { success: true, data } on successful database insertion.
 * Returns { success: false, message } with friendly error if network or server fails.
 */
export async function submitFeedback({
  overallRating,
  serviceRating,
  cleanlinessRating,
  toiletRating,
  parkingRating,
  foodRating,
  staffBehaviourRating,
  customerComment = '',
  qrToken = '',
}) {
  const diningContext = getDiningContext();
  const submissionId = generateSubmissionId();
  const sessionToken = getOrCreateSessionToken();
  const submittedAt = new Date().toISOString();
  const effectiveToken = qrToken || diningContext.token || undefined;

  // Backend API payload matching PostgreSQL schema
  const apiPayload = {
    overall_rating: Number(overallRating),
    service_rating: serviceRating,
    cleanliness_rating: cleanlinessRating,
    toilet_rating: toiletRating,
    parking_rating: parkingRating,
    food_rating: foodRating,
    staff_behaviour_rating: staffBehaviourRating,
    comment: customerComment.trim() || null,
    branch_id: diningContext.branch || undefined,
    table_id: diningContext.table || undefined,
    customer_session_token: submissionId,
    session_token: sessionToken,
    token: effectiveToken,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiPayload),
    });

    const result = await response.json().catch(() => null);

    // Duplicate submission detection (Part 8: 409 Conflict)
    if (response.status === 409) {
      return {
        success: false,
        code: 'SESSION_ALREADY_COMPLETED',
        message: result?.message || 'This feedback session has already been completed.',
      };
    }

    if (!response.ok || !result?.success) {
      return {
        success: false,
        message: result?.message || 'Server rejected feedback submission.',
        errors: result?.errors || [],
      };
    }

    const finalPayload = {
      id: result?.data?.id || submissionId,
      submittedAt: result?.data?.submitted_at || submittedAt,
      sessionToken: result?.data?.session_token || sessionToken,
      dining: {
        branch: diningContext.branch,
        tableNumber: diningContext.table,
      },
      ratings: {
        overall: Number(overallRating),
        service: serviceRating,
        cleanliness: cleanlinessRating,
        toilet: toiletRating,
        parking: parkingRating,
        food: foodRating,
        staffBehaviour: staffBehaviourRating,
      },
      customerComment: customerComment.trim(),
    };

    // Store in session storage ONLY upon verified successful backend submission
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(finalPayload));
    } catch {
      // Ignore storage errors
    }

    return {
      success: true,
      data: finalPayload,
      message: 'Feedback submitted successfully',
    };
  } catch (networkError) {
    console.error('[Feedback API Network Error] Connection to backend failed:', networkError.message);
    return {
      success: false,
      message: "We couldn't submit your feedback right now. Please try again.",
    };
  }
}
