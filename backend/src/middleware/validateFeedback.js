import { QRModel } from '../models/qrModel.js';
import { SessionModel } from '../models/sessionModel.js';

const VALID_RATINGS = ['Good', 'Average', 'Bad'];

// Helper to normalize strings to Title Case ('good' -> 'Good')
function normalizeRating(val) {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim().toLowerCase();
  if (trimmed === 'good') return 'Good';
  if (trimmed === 'average') return 'Average';
  if (trimmed === 'bad') return 'Bad';
  return val.trim();
}

/**
 * Strict server-side validation middleware for customer feedback submissions
 */
export async function validateFeedback(req, res, next) {
  const body = req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request body. JSON payload expected.',
    });
  }

  const errors = [];

  // 1. Overall Rating Validation (Required: integer 1 to 5)
  const rawOverall = body.overall_rating !== undefined ? body.overall_rating : body.overallRating;
  const overallRating = Number(rawOverall);

  if (rawOverall === undefined || rawOverall === null || rawOverall === '') {
    errors.push({
      field: 'overall_rating',
      message: 'Overall star rating is required.',
    });
  } else if (!Number.isInteger(overallRating) || overallRating < 1 || overallRating > 5) {
    errors.push({
      field: 'overall_rating',
      message: 'Overall rating must be an integer between 1 and 5 stars.',
    });
  }

  // 2. Specific Ratings Validation (Required: 'Good' | 'Average' | 'Bad')
  const specificFields = [
    { key: 'service_rating', alt: 'serviceRating', label: 'Service' },
    { key: 'cleanliness_rating', alt: 'cleanlinessRating', label: 'Cleanliness' },
    { key: 'toilet_rating', alt: 'toiletRating', label: 'Toilet/Restroom' },
    { key: 'parking_rating', alt: 'parkingRating', label: 'Parking facility' },
    { key: 'food_rating', alt: 'foodRating', label: 'Food' },
    { key: 'staff_behaviour_rating', alt: 'staffBehaviourRating', label: 'Staff behaviour' },
  ];

  const normalizedRatings = {};

  for (const { key, alt, label } of specificFields) {
    const rawVal = body[key] !== undefined ? body[key] : body[alt];

    if (!rawVal || typeof rawVal !== 'string' || rawVal.trim() === '') {
      errors.push({
        field: key,
        message: `${label} rating is required.`,
      });
      continue;
    }

    const normalized = normalizeRating(rawVal);
    if (!VALID_RATINGS.includes(normalized)) {
      errors.push({
        field: key,
        message: `${label} rating must be either 'Good', 'Average', or 'Bad'.`,
      });
    } else {
      normalizedRatings[key] = normalized;
    }
  }

  // 3. Optional Comment Validation (Max 1000 characters & Control-Char Sanitization)
  const rawComment = body.comment !== undefined ? body.comment : (body.customerComment || body.customer_comment);
  let sanitizedComment = null;

  if (rawComment !== undefined && rawComment !== null) {
    if (typeof rawComment !== 'string') {
      errors.push({
        field: 'comment',
        message: 'Comment must be a text string.',
      });
    } else {
      // Strip control characters / null bytes while preserving readable text
      sanitizedComment = rawComment.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '').trim();
      if (sanitizedComment.length > 1000) {
        errors.push({
          field: 'comment',
          message: 'Comment must not exceed 1000 characters.',
        });
      }
    }
  }

  // 4. Session Validation & Idempotency Check (Part 8)
  const rawSessionToken = body.session_token || body.sessionToken || null;
  if (rawSessionToken && typeof rawSessionToken === 'string') {
    const sessionRecord = await SessionModel.findByToken(rawSessionToken);
    if (sessionRecord && sessionRecord.status === 'completed') {
      console.warn(`[Security Alert: Duplicate Session Attempt] Token ${rawSessionToken} already completed.`);
      return res.status(409).json({
        success: false,
        message: 'This feedback session has already been completed.',
        code: 'SESSION_ALREADY_COMPLETED',
      });
    }
  }

  // 5. Branch & Table Binding via QR Token (Server Authority)
  let resolvedBranch = body.branch_id || body.branchId || (body.hotel && body.hotel.branch) || null;
  let resolvedTable = body.table_id || body.tableId || (body.hotel && body.hotel.tableNumber) || null;
  let legacySessionToken = body.customer_session_token || body.submissionId || null;

  const rawToken = body.token || body.qr_token || body.qrToken || (legacySessionToken && String(legacySessionToken).startsWith('sb_') ? legacySessionToken : null);
  if (rawToken) {
    const qrRecord = await QRModel.findByToken(rawToken);
    if (!qrRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired feedback QR code.',
      });
    }
    if (!qrRecord.active || qrRecord.table_active === false) {
      return res.status(400).json({
        success: false,
        message: 'This feedback QR code is currently inactive and cannot accept submissions.',
      });
    }
    // Server authority: override branch and table with verified QR metadata
    resolvedBranch = qrRecord.branch_name;
    resolvedTable = `Table ${qrRecord.table_number}`;
    legacySessionToken = qrRecord.public_token;
  }

  // If validation fails, return 400 with friendly structured errors
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed. Please complete all required rating questions.',
      errors,
    });
  }

  // Attach sanitized and normalized payload to request object for controller
  req.validatedFeedback = {
    overall_rating: overallRating,
    service_rating: normalizedRatings.service_rating,
    cleanliness_rating: normalizedRatings.cleanliness_rating,
    toilet_rating: normalizedRatings.toilet_rating,
    parking_rating: normalizedRatings.parking_rating,
    food_rating: normalizedRatings.food_rating,
    staff_behaviour_rating: normalizedRatings.staff_behaviour_rating,
    comment: sanitizedComment || null,
    branch_id: resolvedBranch ? String(resolvedBranch).slice(0, 50) : null,
    table_id: resolvedTable ? String(resolvedTable).slice(0, 50) : null,
    customer_session_token: legacySessionToken ? String(legacySessionToken).slice(0, 100) : null,
    session_token: rawSessionToken ? String(rawSessionToken).slice(0, 64) : null,
    token: rawToken || null,
  };

  next();
}
