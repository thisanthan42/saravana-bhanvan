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
    const custASubmit = await req('POST', '/api/feedback', {\n      overall_rating: 5,\n      service_rating: 'Good',\n      cleanliness_rating: 'Good',\n      toilet_rating: 'Good',\n      parking_rating: 'Good',\n      food_rating: 'Good',\n      staff_behaviour_rating: 'Good',\n      comment: 'Customer A diner experience',\n      token: 'sb_tbl14_init2026',\n      session_token: sessionCustA,\n    });\n    assert(custASubmit.status === 201, '5.1 Customer A successfully submits with Table 14 QR');\n\n    // Customer B arrives later at same Table 14, receives new session\n    const sessionCustB = (await req('POST', '/api/public/session', { qr_token: 'sb_tbl14_init2026' })).body.data.session_token;\n    assert(sessionCustA !== sessionCustB, '5.2 Customer B receives distinct session token');\n\n    const custBSubmit = await req('POST', '/api/feedback', {\n      overall_rating: 4,\n      service_rating: 'Good',\n      cleanliness_rating: 'Good',\n      toilet_rating: 'Good',\n      parking_rating: 'Good',\n      food_rating: 'Good',\n      staff_behaviour_rating: 'Good',\n      comment: 'Customer B diner experience at same table',\n      token: 'sb_tbl14_init2026',\n      session_token: sessionCustB,\n    });\n    assert(custBSubmit.status === 201, '5.3 Customer B successfully submits with same Table 14 QR');\n\n    // ------------------------------------------------------------------\n    // TEST 6: XSS & HTML Injection Safety\n    // ------------------------------------------------------------------\n    console.log('\\nTEST 6: XSS & Malicious Input Handling');\n    const xssSession = (await req('POST', '/api/public/session', { qr_token: 'sb_tbl14_init2026' })).body.data.session_token;\n    const xssPayload = {\n      overall_rating: 3,\n      service_rating: 'Average',\n      cleanliness_rating: 'Good',\n      toilet_rating: 'Good',\n      parking_rating: 'Good',\n      food_rating: 'Good',\n      staff_behaviour_rating: 'Good',\n      comment: '<script>alert(\"XSS Attack!\");</script><img src=\"x\" onerror=\"alert(1)\">Special & chars',\n      token: 'sb_tbl14_init2026',\n      session_token: xssSession,\n    };\n    const xssRes = await req('POST', '/api/feedback', xssPayload);\n    assert(xssRes.status === 201, '6.1 Submission with script tags accepted without crashing');\n    const xssRecordId = xssRes.body.data.id;\n\n    // Verify manager receives it safely as plain text\n    const loginRes = await req('POST', '/api/manager/login', {\n      email: 'manager@saravanabhavan.com',\n      password: process.env.DEFAULT_MANAGER_PASSWORD || 'Saravana@2026!',\n    });\n    const managerToken = loginRes.body.token;\n\n    const managerFeedbackRes = await req('GET', `/api/manager/feedback/${xssRecordId}`, null, {\n      Authorization: `Bearer ${managerToken}`,\n    });\n    assert(managerFeedbackRes.status === 200, '6.2 Manager retrieved feedback item');\n    assert(\n      managerFeedbackRes.body.data.comment.includes('<script>'),\n      '6.3 Comment stored safely as raw text without server-side execution'\n    );\n\n    // ------------------------------------------------------------------\n    // TEST 7: Request Size & Comment Length Limits\n    // ------------------------------------------------------------------\n    console.log('\\nTEST 7: Payload Size & Comment Length Limits');\n    const longSession = (await req('POST', '/api/public/session', { qr_token: 'sb_tbl14_init2026' })).body.data.session_token;\n    const oversizedComment = 'A'.repeat(1050); // Exceeds 1000 char limit\n\n    const longRes = await req('POST', '/api/feedback', {\n      overall_rating: 5,\n      service_rating: 'Good',\n      cleanliness_rating: 'Good',\n      toilet_rating: 'Good',\n      parking_rating: 'Good',\n      food_rating: 'Good',\n      staff_behaviour_rating: 'Good',\n      comment: oversizedComment,\n      session_token: longSession,\n    });\n    assert(longRes.status === 400, '7.1 Comment exceeding 1000 characters rejected with 400 Bad Request');\n    assert(longRes.body.message.includes('Validation failed') || longRes.body.message.includes('1000'), '7.2 Validation message references character limit');\n\n    // ------------------------------------------------------------------\n    // TEST 8: Strict Backend Validation (Non-bypassable)\n    // ------------------------------------------------------------------\n    console.log('\\nTEST 8: Backend Validation Guards');\n    const invalidRatingRes = await req('POST', '/api/feedback', {\n      overall_rating: 6, // Out of range\n      service_rating: 'Good',\n      cleanliness_rating: 'Good',\n      toilet_rating: 'Good',\n      parking_rating: 'Good',\n      food_rating: 'Good',\n      staff_behaviour_rating: 'Good',\n    });\n    assert(invalidRatingRes.status === 400, '8.1 Out-of-range rating (6 stars) rejected with 400');\n\n    const invalidCategoryRes = await req('POST', '/api/feedback', {\n      overall_rating: 5,\n      service_rating: 'Exceptional', // Invalid option\n      cleanliness_rating: 'Good',\n      toilet_rating: 'Good',\n      parking_rating: 'Good',\n      food_rating: 'Good',\n      staff_behaviour_rating: 'Good',\n    });\n    assert(invalidCategoryRes.status === 400, '8.2 Invalid category rating (\"Exceptional\") rejected with 400');\n\n    // ------------------------------------------------------------------\n    // TEST 9: Inactive & Invalid QR Handling\n    // ------------------------------------------------------------------\n    console.log('\\nTEST 9: Inactive and Invalid QR Safeguards');\n    const badQRInit = await req('POST', '/api/public/session', { qr_token: 'non_existent_fake_qr' });\n    assert(badQRInit.status === 400, '9.1 Session creation with non-existent QR rejected with 400');\n\n    // ------------------------------------------------------------------\n    // TEST 10: Manager Dashboard Verification of Clean Data\n    // ------------------------------------------------------------------\n    console.log('\\nTEST 10: Manager Dashboard Verification');\n    const dashRes = await req('GET', '/api/manager/feedback', null, {\n      Authorization: `Bearer ${managerToken}`,\n    });\n    assert(dashRes.status === 200, '10.1 Manager dashboard feedback fetched successfully');\n    assert(Array.isArray(dashRes.body.data), '10.2 Feedback records returned as array');\n    \n    // Ensure all stored records have valid session tracking\n    const rec1 = dashRes.body.data.find(r => Number(r.id) === Number(feedbackId1));\n    assert(!!rec1, '10.3 Stored record found in manager list');\n    assert(rec1.table_id === 'Table 14', '10.4 Table correctly identified as Table 14');\n\n    // ------------------------------------------------------------------\n    // SUMMARY\n    // ------------------------------------------------------------------\n    console.log('\\n========================================================================');\n    console.log(`📊 PART 8 VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);\n    console.log('========================================================================');\n\n    if (failed > 0) {\n      process.exit(1);\n    }\n  } catch (err) {\n    console.error('Test execution error:', err);\n    process.exit(1);\n  }\n}\n\nrunPart8Verification();\n