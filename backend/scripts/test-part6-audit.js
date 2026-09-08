import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:5000';
let passed = 0;
let failed = 0;

function assert(condition, name, details = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${name} ${details ? '- ' + details : ''}`);
    failed++;
  }
}

function req(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    const r = http.request(options, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(d) });
        } catch {
          resolve({ status: res.statusCode, body: d });
        }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function runPart6Audit() {
  console.log('========================================================================');
  console.log('📋 PART 6: COMPLETE INTEGRATION & ARCHITECTURE AUDIT');
  console.log('Saravana Bhavan Hotel Customer Feedback & Management System');
  console.log('========================================================================\n');

  try {
    // ------------------------------------------------------------------
    // CHECK 1: System Health & API Availability
    // ------------------------------------------------------------------
    console.log('SECTION 1: SYSTEM HEALTH & API AVAILABILITY');
    const healthRes = await req('GET', '/api/health');
    assert(healthRes.status === 200, '1.1 System health check returns 200 OK');
    assert(healthRes.body.service === 'Saravana Bhavan Feedback API', '1.2 Service name correctly identified');
    assert(healthRes.body.database !== undefined, '1.3 Database connection layer verified');

    // ------------------------------------------------------------------
    // CHECK 2: Complete Flow - Customer Feedback Submission
    // Exact scenario from Part 6 prompt:
    // Overall = 2 stars, Food = Bad, Service = Good, Comment = "Food was cold"
    // ------------------------------------------------------------------
    console.log('\nSECTION 2: COMPLETE FLOW - CUSTOMER SUBMISSION');
    const customerSubmission = {
      overall_rating: 2,
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Bad',
      staff_behaviour_rating: 'Good',
      comment: 'Food was cold',
      branch_id: 'BR-CENTRAL',
      table_id: 'Table 14',
      token: 'SB-QR-AUDIT-2026',
    };

    const submitRes = await req('POST', '/api/feedback', customerSubmission);
    assert(submitRes.status === 201, '2.1 Customer submission returns 201 Created');
    assert(submitRes.body.success === true, '2.2 Response indicates success: true');
    assert(submitRes.body.data && submitRes.body.data.id, '2.3 Database record ID returned');
    assert(submitRes.body.data && submitRes.body.data.submitted_at, '2.4 Submission timestamp returned');
    const submittedRecordId = submitRes.body.data.id;

    // ------------------------------------------------------------------
    // CHECK 3: Security - Customer Cannot Access Manager Endpoints
    // ------------------------------------------------------------------
    console.log('\nSECTION 3: SECURITY & PRIVACY GUARDS');
    const unauthFeedback = await req('GET', '/api/manager/feedback');
    assert(unauthFeedback.status === 401, '3.1 Unauthenticated GET /api/manager/feedback blocked with 401');

    const unauthMe = await req('GET', '/api/manager/me');
    assert(unauthMe.status === 401, '3.2 Unauthenticated GET /api/manager/me blocked with 401');

    const invalidTokenRes = await req('GET', '/api/manager/feedback', null, {
      Authorization: 'Bearer invalid-tampered-token-xyz',
    });
    assert(invalidTokenRes.status === 401, '3.3 Tampered/invalid JWT blocked with 401');

    // ------------------------------------------------------------------
    // CHECK 4: Manager Authentication
    // ------------------------------------------------------------------
    console.log('\nSECTION 4: MANAGER AUTHENTICATION');
    const loginRes = await req('POST', '/api/manager/login', {
      email: 'manager@saravanabhavan.com',
      password: process.env.DEFAULT_MANAGER_PASSWORD || 'Saravana@2026!',
    });
    assert(loginRes.status === 200, '4.1 Manager login succeeds with 200 OK');
    assert(!!loginRes.body.token, '4.2 Signed JWT token returned upon successful authentication');
    assert(
      loginRes.body.manager && (loginRes.body.manager.role === 'manager' || loginRes.body.manager.role === 'super_admin'),
      '4.3 Manager role verified (manager or super_admin)'
    );
    assert(!loginRes.body.manager.password_hash, '4.4 Password hash NEVER exposed to client');
    const token = loginRes.body.token;

    // Profile check
    const profileRes = await req('GET', '/api/manager/me', null, {
      Authorization: `Bearer ${token}`,
    });
    assert(profileRes.status === 200, '4.5 Protected profile retrieved via Bearer token');
    assert(profileRes.body.manager.email === 'manager@saravanabhavan.com', '4.6 Manager profile email matches');

    // ------------------------------------------------------------------
    // CHECK 5: Manager Dashboard Data Verification
    // Verify that the record submitted in Section 2 matches exactly in Dashboard
    // ------------------------------------------------------------------
    console.log('\nSECTION 5: MANAGER DASHBOARD DATA & CONTRACT INTEGRATION');
    const dashboardRes = await req('GET', '/api/manager/feedback', null, {
      Authorization: `Bearer ${token}`,
    });
    assert(dashboardRes.status === 200, '5.1 Manager feedback list retrieved with 200 OK');
    assert(Array.isArray(dashboardRes.body.data), '5.2 Feedback data returned as array');
    assert(dashboardRes.body.summary && dashboardRes.body.summary.total > 0, '5.3 Summary total count > 0');

    // Locate the specific record submitted in Section 2
    const targetRecord = dashboardRes.body.data.find((item) => Number(item.id) === Number(submittedRecordId));
    assert(!!targetRecord, `5.4 Submitted record #${submittedRecordId} found in manager dashboard data`);

    if (targetRecord) {
      assert(Number(targetRecord.overall_rating) === 2, '5.5 Overall rating matches exactly: 2 stars');
      assert(targetRecord.food_rating === 'Bad', '5.6 Food rating matches exactly: Bad');
      assert(targetRecord.service_rating === 'Good', '5.7 Service rating matches exactly: Good');
      assert(targetRecord.comment === 'Food was cold', '5.8 Customer comment matches exactly: "Food was cold"');
      assert(targetRecord.needs_action === true, '5.9 Need Action is derived as TRUE');
      assert(
        targetRecord.action_reason_text.includes('Overall rating: 2') &&
          targetRecord.action_reason_text.includes('Food: Bad'),
        '5.10 Action reasons contain both Overall rating and Food: Bad',
        targetRecord.action_reason_text
      );
      assert(
        targetRecord.customer_session_token === 'SB-QR-AUDIT-2026',
        '5.11 QR token safely stored and attached to session record'
      );
    }

    // ------------------------------------------------------------------
    // CHECK 6: Single Feedback Detail View
    // ------------------------------------------------------------------
    console.log('\nSECTION 6: SINGLE FEEDBACK DETAIL ENDPOINT');
    const detailRes = await req('GET', `/api/manager/feedback/${submittedRecordId}`, null, {
      Authorization: `Bearer ${token}`,
    });
    assert(detailRes.status === 200, '6.1 Single feedback detail returns 200 OK');
    assert(detailRes.body.data && detailRes.body.data.id === submittedRecordId, '6.2 Detail record ID matches');
    assert(detailRes.body.data.needs_action === true, '6.3 Detail record preserves Need Action derivation');

    // ------------------------------------------------------------------
    // CHECK 7: Need Action Logic Consistency
    // ------------------------------------------------------------------
    console.log('\nSECTION 7: NEED ACTION LOGIC CONSISTENCY AUDIT');
    // Ingest specific test items to verify each condition:
    // A: 5-star, all 'Good' -> needs_action: false
    const goodFeedback = await req('POST', '/api/feedback', {
      overall_rating: 5,
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
      comment: 'Flawless South Indian breakfast experience',
    });
    const goodId = goodFeedback.body.data.id;
    const goodDetail = await req('GET', `/api/manager/feedback/${goodId}`, null, {
      Authorization: `Bearer ${token}`,
    });
    assert(goodDetail.body.data.needs_action === false, '7.1 5-Star all-Good feedback has needs_action: false');

    // B: 4-star, Toilet 'Bad' -> needs_action: true
    const toiletBad = await req('POST', '/api/feedback', {
      overall_rating: 4,
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Bad',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
      comment: 'Restroom needed cleaning',
    });
    const toiletId = toiletBad.body.data.id;
    const toiletDetail = await req('GET', `/api/manager/feedback/${toiletId}`, null, {
      Authorization: `Bearer ${token}`,
    });
    assert(toiletDetail.body.data.needs_action === true, '7.2 4-Star with Toilet:Bad has needs_action: true');
    assert(toiletDetail.body.data.action_reason_text.includes('Toilet: Bad'), '7.3 Reason specifies Toilet: Bad');

    // C: 1-star, all 'Good' -> needs_action: true
    const oneStar = await req('POST', '/api/feedback', {
      overall_rating: 1,
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
      comment: 'Disappointed with overall experience',
    });
    const oneStarId = oneStar.body.data.id;
    const oneStarDetail = await req('GET', `/api/manager/feedback/${oneStarId}`, null, {
      Authorization: `Bearer ${token}`,
    });
    assert(oneStarDetail.body.data.needs_action === true, '7.4 1-Star feedback has needs_action: true');

    // D: Filter needsAction=true
    const actionOnlyRes = await req('GET', '/api/manager/feedback?needsAction=true', null, {
      Authorization: `Bearer ${token}`,
    });
    const allAction = actionOnlyRes.body.data.every((r) => r.needs_action === true);
    assert(allAction, '7.5 needsAction=true filter returns ONLY action-required records');

    // ------------------------------------------------------------------
    // CHECK 8: Filtering, Search, Sorting, Pagination
    // ------------------------------------------------------------------
    console.log('\nSECTION 8: FILTERING, SEARCH, SORTING & PAGINATION AUDIT');

    // 8.1 Star Filtering
    const star2Res = await req('GET', '/api/manager/feedback?rating=2', null, {
      Authorization: `Bearer ${token}`,
    });
    const all2Star = star2Res.body.data.every((r) => Number(r.overall_rating) === 2);
    assert(all2Star && star2Res.body.data.length > 0, '8.1 Rating=2 filter returns only 2-star feedback');

    // 8.2 Comment Search
    const searchRes = await req('GET', '/api/manager/feedback?search=cold', null, {
      Authorization: `Bearer ${token}`,
    });
    const foundCold = searchRes.body.data.some((r) => r.comment && r.comment.includes('cold'));
    assert(foundCold, '8.2 Comment search for "cold" finds the relevant record');

    // 8.3 Sorting
    const sortOldest = await req('GET', '/api/manager/feedback?sort=oldest', null, {
      Authorization: `Bearer ${token}`,
    });
    const sortNewest = await req('GET', '/api/manager/feedback?sort=newest', null, {
      Authorization: `Bearer ${token}`,
    });
    assert(
      new Date(sortNewest.body.data[0].created_at) >=
        new Date(sortNewest.body.data[sortNewest.body.data.length - 1].created_at),
      '8.3 Newest sorting produces descending chronological order'
    );
    assert(
      new Date(sortOldest.body.data[0].created_at) <=
        new Date(sortOldest.body.data[sortOldest.body.data.length - 1].created_at),
      '8.4 Oldest sorting produces ascending chronological order'
    );

    // 8.4 Pagination
    const pageRes = await req('GET', '/api/manager/feedback?page=1&limit=2', null, {
      Authorization: `Bearer ${token}`,
    });
    assert(pageRes.body.pagination.limit === 2, '8.5 Pagination limit parameter honored');
    assert(pageRes.body.pagination.currentPage === 1, '8.6 Current page parameter honored');
    assert(pageRes.body.pagination.totalPages >= 1, '8.7 Total pages correctly calculated');

    // ------------------------------------------------------------------
    // CHECK 9: Strict Validation & Negative Tests
    // ------------------------------------------------------------------
    console.log('\nSECTION 9: VALIDATION & ERROR RESILIENCE');

    // 9.1 Missing overall rating
    const missOverall = await req('POST', '/api/feedback', {
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
    });
    assert(missOverall.status === 400, '9.1 Missing overall_rating rejected with 400 Bad Request');

    // 9.2 Missing specific category rating
    const missCategory = await req('POST', '/api/feedback', {
      overall_rating: 5,
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
    });
    assert(missCategory.status === 400, '9.2 Missing service_rating rejected with 400 Bad Request');

    // 9.3 Invalid category value
    const invalidVal = await req('POST', '/api/feedback', {
      overall_rating: 5,
      service_rating: 'Excellent', // Must be Good/Average/Bad
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
    });
    assert(invalidVal.status === 400, '9.3 Invalid rating value "Excellent" rejected with 400 Bad Request');

    // 9.4 Excessive comment length (> 1000 chars)
    const longComment = await req('POST', '/api/feedback', {
      overall_rating: 5,
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
      comment: 'A'.repeat(1005),
    });
    assert(longComment.status === 400, '9.4 Comment exceeding 1000 characters rejected with 400 Bad Request');

    // ------------------------------------------------------------------
    // CHECK 10: Manager Logout Session
    // ------------------------------------------------------------------
    console.log('\nSECTION 10: LOGOUT VERIFICATION');
    const logoutRes = await req('POST', '/api/manager/logout', {}, {
      Authorization: `Bearer ${token}`,
    });
    assert(logoutRes.status === 200, '10.1 POST /api/manager/logout succeeds with 200 OK');

    // ------------------------------------------------------------------
    // SUMMARY
    // ------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(`📊 PART 6 AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Audit execution error:', err);
    process.exit(1);
  }
}

runPart6Audit();
