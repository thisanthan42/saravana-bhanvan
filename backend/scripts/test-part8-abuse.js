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
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(d) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: d });
        }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function runPart8Verification() {
  console.log('========================================================================');
  console.log('🛡️ PART 8: DUPLICATE FEEDBACK & ABUSE PROTECTION AUDIT');
  console.log('Saravana Bhavan Hotel Customer Feedback Platform');
  console.log('========================================================================\n');

  try {
    // ------------------------------------------------------------------
    // TEST 1: Session Initialization Endpoint
    // ------------------------------------------------------------------
    console.log('TEST 1: Session Initialization (POST /api/public/session)');
    const initRes = await req('POST', '/api/public/session', { qr_token: 'sb_tbl14_init2026' });
    assert(initRes.status === 201, '1.1 Session initialization returns 201 Created');
    assert(!!initRes.body.data && !!initRes.body.data.session_token, '1.2 Cryptographic session_token returned');
    assert(initRes.body.data.session_token.startsWith('sbsess_'), '1.3 Session token has secure sbsess_ prefix');
    const sessionToken1 = initRes.body.data.session_token;

    // ------------------------------------------------------------------
    // TEST 2: Normal Valid Submission with Session
    // ------------------------------------------------------------------
    console.log('\nTEST 2: Normal Valid Submission (Single Click)');
    const validFeedback = {
      overall_rating: 5,
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
      comment: 'Superb breakfast at Table 14',
      token: 'sb_tbl14_init2026',
      session_token: sessionToken1,
    };
    const submit1 = await req('POST', '/api/feedback', validFeedback);
    assert(submit1.status === 201, '2.1 Valid feedback submission returns 201 Created');
    assert(submit1.body.success === true, '2.2 Submission marked success: true');
    assert(!!submit1.body.data.id, '2.3 Record ID returned');
    const feedbackId1 = submit1.body.data.id;

    // ------------------------------------------------------------------
    // TEST 3: Double-Click / Replay Attack with Same Session Token
    // ------------------------------------------------------------------
    console.log('\nTEST 3: Double-Click & Replay Protection (Same Session Resubmitted)');
    const submitDuplicate = await req('POST', '/api/feedback', validFeedback);
    assert(
      submitDuplicate.status === 409 || submitDuplicate.status === 400,
      '3.1 Duplicate submission with completed session rejected (409 Conflict)',
      `Status: ${submitDuplicate.status}`
    );
    assert(submitDuplicate.body.success === false, '3.2 Response indicates success: false');
    assert(
      submitDuplicate.body.code === 'SESSION_ALREADY_COMPLETED' ||
      submitDuplicate.body.message.includes('already been completed'),
      '3.3 Explains friendly reason: session already completed',
      submitDuplicate.body.message
    );

    // ------------------------------------------------------------------
    // TEST 4: Race Condition Protection (Simultaneous Parallel Requests)
    // ------------------------------------------------------------------
    console.log('\nTEST 4: Race Condition Protection (Simultaneous Parallel Requests)');
    const sessionRes2 = await req('POST', '/api/public/session', { qr_token: 'sb_tbl14_init2026' });
    const raceSessionToken = sessionRes2.body.data.session_token;

    const racePayload = {
      overall_rating: 4,
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
      comment: 'Testing simultaneous requests',
      token: 'sb_tbl14_init2026',
      session_token: raceSessionToken,
    };

    // Fire both requests concurrently
    const [raceRes1, raceRes2] = await Promise.all([
      req('POST', '/api/feedback', racePayload),
      req('POST', '/api/feedback', racePayload),
    ]);

    const statuses = [raceRes1.status, raceRes2.status];
    const createdCount = statuses.filter(s => s === 201).length;
    const blockedCount = statuses.filter(s => s === 409 || s === 400).length;

    assert(createdCount === 1, '4.1 Exactly ONE of the simultaneous requests succeeded (201 Created)');
    assert(blockedCount === 1, '4.2 Exactly ONE of the simultaneous requests was safely blocked (409 Conflict)');

    // ------------------------------------------------------------------
    // TEST 5: Table QR Reusability for Multiple Customers
    // ------------------------------------------------------------------
    console.log('\nTEST 5: Table QR Reusability Across Multiple Customers');
    // Customer A submits with Table 14
    const sessionCustA = (await req('POST', '/api/public/session', { qr_token: 'sb_tbl14_init2026' })).body.data.session_token;
    const custASubmit = await req('POST', '/api/feedback', {
      overall_rating: 5,
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
      comment: 'Customer A diner experience',
      token: 'sb_tbl14_init2026',
      session_token: sessionCustA,
    });
    assert(custASubmit.status === 201, '5.1 Customer A successfully submits with Table 14 QR');

    // Customer B arrives later at same Table 14, receives new session
    const sessionCustB = (await req('POST', '/api/public/session', { qr_token: 'sb_tbl14_init2026' })).body.data.session_token;
    assert(sessionCustA !== sessionCustB, '5.2 Customer B receives distinct session token');

    const custBSubmit = await req('POST', '/api/feedback', {
      overall_rating: 4,
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
      comment: 'Customer B diner experience at same table',
      token: 'sb_tbl14_init2026',
      session_token: sessionCustB,
    });
    assert(custBSubmit.status === 201, '5.3 Customer B successfully submits with same Table 14 QR');

    // ------------------------------------------------------------------
    // TEST 6: XSS & HTML Injection Safety
    // ------------------------------------------------------------------
    console.log('\nTEST 6: XSS & Malicious Input Handling');
    const xssSession = (await req('POST', '/api/public/session', { qr_token: 'sb_tbl14_init2026' })).body.data.session_token;
    const xssPayload = {
      overall_rating: 3,
      service_rating: 'Average',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
      comment: '<script>alert("XSS Attack!");</script><img src="x" onerror="alert(1)">Special & chars',
      token: 'sb_tbl14_init2026',
      session_token: xssSession,
    };
    const xssRes = await req('POST', '/api/feedback', xssPayload);
    assert(xssRes.status === 201, '6.1 Submission with script tags accepted without crashing');
    const xssRecordId = xssRes.body.data.id;

    // Verify manager receives it safely as plain text
    const loginRes = await req('POST', '/api/manager/login', {
      email: 'manager@saravanabhavan.com',
      password: process.env.DEFAULT_MANAGER_PASSWORD || 'Saravana@2026!',
    });
    const managerToken = loginRes.body.token;

    const managerFeedbackRes = await req('GET', `/api/manager/feedback/${xssRecordId}`, null, {
      Authorization: `Bearer ${managerToken}`,
    });
    assert(managerFeedbackRes.status === 200, '6.2 Manager retrieved feedback item');
    assert(
      managerFeedbackRes.body.data.comment.includes('<script>'),
      '6.3 Comment stored safely as raw text without server-side execution'
    );

    // ------------------------------------------------------------------
    // TEST 7: Request Size & Comment Length Limits
    // ------------------------------------------------------------------
    console.log('\nTEST 7: Payload Size & Comment Length Limits');
    const longSession = (await req('POST', '/api/public/session', { qr_token: 'sb_tbl14_init2026' })).body.data.session_token;
    const oversizedComment = 'A'.repeat(1050); // Exceeds 1000 char limit

    const longRes = await req('POST', '/api/feedback', {
      overall_rating: 5,
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
      comment: oversizedComment,
      session_token: longSession,
    });
    assert(longRes.status === 400, '7.1 Comment exceeding 1000 characters rejected with 400 Bad Request');
    assert(longRes.body.message.includes('Validation failed') || longRes.body.message.includes('1000'), '7.2 Validation message references character limit');

    // ------------------------------------------------------------------
    // TEST 8: Strict Backend Validation (Non-bypassable)
    // ------------------------------------------------------------------
    console.log('\nTEST 8: Backend Validation Guards');
    const invalidRatingRes = await req('POST', '/api/feedback', {
      overall_rating: 6, // Out of range
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
    });
    assert(invalidRatingRes.status === 400, '8.1 Out-of-range rating (6 stars) rejected with 400');

    const invalidCategoryRes = await req('POST', '/api/feedback', {
      overall_rating: 5,
      service_rating: 'Exceptional', // Invalid option
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
    });
    assert(invalidCategoryRes.status === 400, '8.2 Invalid category rating ("Exceptional") rejected with 400');

    // ------------------------------------------------------------------
    // TEST 9: Inactive & Invalid QR Handling
    // ------------------------------------------------------------------
    console.log('\nTEST 9: Inactive and Invalid QR Safeguards');
    const badQRInit = await req('POST', '/api/public/session', { qr_token: 'non_existent_fake_qr' });
    assert(badQRInit.status === 400, '9.1 Session creation with non-existent QR rejected with 400');

    // ------------------------------------------------------------------
    // TEST 10: Manager Dashboard Verification of Clean Data
    // ------------------------------------------------------------------
    console.log('\nTEST 10: Manager Dashboard Verification');
    const dashRes = await req('GET', '/api/manager/feedback', null, {
      Authorization: `Bearer ${managerToken}`,
    });
    assert(dashRes.status === 200, '10.1 Manager dashboard feedback fetched successfully');
    assert(Array.isArray(dashRes.body.data), '10.2 Feedback records returned as array');
    
    // Ensure all stored records have valid session tracking
    const rec1 = dashRes.body.data.find(r => Number(r.id) === Number(feedbackId1));
    assert(!!rec1, '10.3 Stored record found in manager list');
    assert(rec1.table_id === 'Table 14', '10.4 Table correctly identified as Table 14');

    // ------------------------------------------------------------------
    // SUMMARY
    // ------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(`📊 PART 8 VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runPart8Verification();
