import { query } from '../config/database.js';

/**
 * Derives whether a feedback item requires immediate manager action,
 * and provides human-readable reasons.
 * 
 * Condition:
 * - Overall rating is 1 star OR
 * - Overall rating is 2 stars OR
 * - Any specific category is rated 'Bad'
 */
export function deriveActionStatus(item) {
  const reasons = [];

  if (item.overall_rating <= 2) {
    reasons.push(`Overall rating: ${item.overall_rating} ${item.overall_rating === 1 ? 'star' : 'stars'}`);
  }
  if (item.service_rating === 'Bad') {
    reasons.push('Service: Bad');
  }
  if (item.cleanliness_rating === 'Bad') {
    reasons.push('Cleanliness: Bad');
  }
  if (item.toilet_rating === 'Bad') {
    reasons.push('Toilet: Bad');
  }
  if (item.parking_rating === 'Bad') {
    reasons.push('Parking: Bad');
  }
  if (item.food_rating === 'Bad') {
    reasons.push('Food: Bad');
  }
  if (item.staff_behaviour_rating === 'Bad') {
    reasons.push('Staff Behaviour: Bad');
  }

  return {
    needs_action: reasons.length > 0,
    action_reasons: reasons,
    action_reason_text: reasons.join(' + '),
  };
}

export function matchesBranch(recordBranchId, targetBranchId) {
  if (!recordBranchId || !targetBranchId) return false;
  if (String(recordBranchId) === String(targetBranchId)) return true;
  const lower = String(recordBranchId).toLowerCase();
  const target = String(targetBranchId).toLowerCase();
  if (lower.includes(target) || target.includes(lower)) return true;
  if (String(targetBranchId) === '1' && lower.includes('chennai')) return true;
  if (String(targetBranchId) === '2' && lower.includes('coimbatore')) return true;
  if (String(targetBranchId) === '3' && lower.includes('bangalore')) return true;
  if (lower.includes('madurai') && (String(targetBranchId) === '4' || Number(targetBranchId) >= 4 || target.includes('madurai'))) return true;
  return false;
}

/**
 * Feedback Model - Data Access Layer
 */
export const FeedbackModel = {
  /**
   * Insert a new feedback submission record
   */
  async create(data) {
    const text = `
      INSERT INTO feedback (
        overall_rating,
        service_rating,
        cleanliness_rating,
        toilet_rating,
        parking_rating,
        food_rating,
        staff_behaviour_rating,
        comment,
        branch_id,
        table_id,
        customer_session_token,
        session_token
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, created_at;
    `;

    const params = [
      data.overall_rating,
      data.service_rating,
      data.cleanliness_rating,
      data.toilet_rating,
      data.parking_rating,
      data.food_rating,
      data.staff_behaviour_rating,
      data.comment,
      data.branch_id,
      data.table_id,
      data.customer_session_token,
      data.session_token || null,
    ];

    const result = await query(text, params);
    return result.rows[0];
  },

  /**
   * Find a single feedback item by ID
   */
  async findById(id) {
    const text = `SELECT * FROM feedback WHERE id = $1 LIMIT 1;`;
    const result = await query(text, [id]);
    if (!result.rows[0]) return null;

    const row = result.rows[0];
    const { needs_action, action_reasons, action_reason_text } = deriveActionStatus(row);
    return { ...row, needs_action, action_reasons, action_reason_text };
  },

  /**
   * Retrieve feedback records with server-side filtering, search, sorting, and pagination
   */
  async findAll({
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
    allowedBranchIds = null,
  } = {}) {
    // 1. Fetch raw candidates (supports both PostgreSQL and graceful in-memory dev fallback)
    const result = await query('SELECT * FROM feedback ORDER BY created_at DESC;');
    let rows = (result.rows || []).map(row => {
      const { needs_action, action_reasons, action_reason_text } = deriveActionStatus(row);
      return { ...row, needs_action, action_reasons, action_reason_text };
    });

    // 2. Filter by branch_id if provided or scope to allowed branches
    if (branchId && branchId !== 'all') {
      rows = rows.filter(r => matchesBranch(r.branch_id, branchId));
    } else if (allowedBranchIds && Array.isArray(allowedBranchIds)) {
      rows = rows.filter(r => allowedBranchIds.some(bId => matchesBranch(r.branch_id, bId)));
    }

    // 3. Filter by Star Rating (1-5 or 'all')
    if (rating && rating !== 'all') {
      const numericRating = Number(rating);
      if (!isNaN(numericRating) && numericRating >= 1 && numericRating <= 5) {
        rows = rows.filter(r => Number(r.overall_rating) === numericRating);
      }
    }

    // 4. Filter by Need Action
    if (needsAction === 'true' || needsAction === true) {
      rows = rows.filter(r => r.needs_action === true);
    } else if (needsAction === 'false' || needsAction === false) {
      rows = rows.filter(r => r.needs_action === false);
    }

    // 5. Filter by Date Range (Preset or Custom)
    if (dateRange && dateRange !== 'all') {
      const now = new Date().getTime();
      let thresholdMs = 0;
      if (dateRange === 'today') {
        thresholdMs = 24 * 60 * 60 * 1000;
      } else if (dateRange === '7days') {
        thresholdMs = 7 * 24 * 60 * 60 * 1000;
      } else if (dateRange === '30days') {
        thresholdMs = 30 * 24 * 60 * 60 * 1000;
      }

      if (thresholdMs > 0) {
        rows = rows.filter(r => {
          const itemTime = new Date(r.created_at).getTime();
          return now - itemTime <= thresholdMs;
        });
      }
    }

    // Custom Start and End Dates
    if (startDate) {
      const startMs = new Date(startDate).getTime();
      if (!isNaN(startMs)) {
        rows = rows.filter(r => new Date(r.created_at).getTime() >= startMs);
      }
    }
    if (endDate) {
      const endMs = new Date(endDate).getTime();
      if (!isNaN(endMs)) {
        const safeEndMs = endDate.includes('T') ? endMs : endMs + 24 * 60 * 60 * 1000 - 1;
        rows = rows.filter(r => new Date(r.created_at).getTime() <= safeEndMs);
      }
    }

    // 6. Search within Customer Comments (Safe Case-Insensitive)
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const term = search.trim().toLowerCase();
      rows = rows.filter(r => r.comment && r.comment.toLowerCase().includes(term));
    }

    // 7. Sort Order
    if (sort === 'oldest') {
      rows.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else {
      // Default: newest first
      rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // 8. Pagination calculation
    const totalRecords = rows.length;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 100);
    const totalPages = Math.ceil(totalRecords / safeLimit) || 1;
    const offset = (safePage - 1) * safeLimit;
    const paginatedRows = rows.slice(offset, offset + safeLimit);

    return {
      records: paginatedRows,
      pagination: {
        totalResults: totalRecords,
        total_records: totalRecords,
        totalPages: totalPages,
        total_pages: totalPages,
        currentPage: safePage,
        current_page: safePage,
        limit: safeLimit,
        has_next_page: safePage < totalPages,
        has_prev_page: safePage > 1,
      },
    };
  },

  /**
   * Get feedback summary metrics for Manager Dashboard KPI Cards
   */
  async getMetrics(branchId = null, allowedBranchIds = null) {
    const result = await query('SELECT * FROM feedback;');
    let rows = result.rows || [];

    if (branchId && branchId !== 'all') {
      rows = rows.filter(r => matchesBranch(r.branch_id, branchId));
    } else if (allowedBranchIds && Array.isArray(allowedBranchIds)) {
      rows = rows.filter(r => allowedBranchIds.some(bId => matchesBranch(r.branch_id, bId)));
    }

    const total = rows.length;
    const starCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let needsActionCount = 0;
    let ratingSum = 0;

    rows.forEach(r => {
      const stars = Number(r.overall_rating);
      if (starCounts[stars] !== undefined) {
        starCounts[stars] += 1;
      }
      ratingSum += stars;

      const { needs_action } = deriveActionStatus(r);
      if (needs_action) {
        needsActionCount += 1;
      }
    });

    const averageRating = total > 0 ? (ratingSum / total).toFixed(1) : '0.0';

    return {
      total,
      average_rating: averageRating,
      stars: starCounts,
      needs_action_count: needsActionCount,
    };
  },
};
