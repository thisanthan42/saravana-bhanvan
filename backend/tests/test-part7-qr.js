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

async function runPart7QRVerification() {
  console.log('========================================================================');
  console.log('📱 PART 7: SECURE QR CODE SYSTEM VERIFICATION');
  console.log('Saravana Bhavan Hotel Customer Feedback Platform');
  console.log('========================================================================\n');

  try {
    // ------------------------------------------------------------------
    // TEST 1: Public QR Token Resolution (Valid Seeded Token)
    // ------------------------------------------------------------------
    console.log('TEST 1: Public Resolution of Valid QR Token (Table 14)');
    const publicQR = await req('GET', '/api/public/qr/sb_tbl14_init2026');
    assert(publicQR.status === 200, '1.1 Public QR resolution returns 200 OK');
    assert(publicQR.body.valid === true, '1.2 QR marked as valid');
    assert(publicQR.body.active === true, '1.3 QR marked as active');
    assert(publicQR.body.data && publicQR.body.data.hotel_name, '1.4 Hotel name returned in public data');

    // PRIVACY CHECK: verify no table_number, branch_id, or internal table ID leaked in public response
    assert(publicQR.body.data.table_number === undefined, '1.5 Customer privacy: table_number NOT leaked');
    assert(publicQR.body.data.branch_name === undefined, '1.6 Customer privacy: branch_name NOT leaked');
    assert(publicQR.body.data.branch_id === undefined, '1.7 Customer privacy: branch_id NOT leaked');
    assert(publicQR.body.data.table_id === undefined, '1.8 Customer privacy: table_id NOT leaked');

    // ------------------------------------------------------------------
    // TEST 2: Public Resolution of Invalid & Non-Existent QR Token
    // ------------------------------------------------------------------
    console.log('\nTEST 2: Public Resolution of Invalid Token');
    const invalidQR = await req('GET', '/api/public/qr/non_existent_fake_token_123');
    assert(invalidQR.status === 404, '2.1 Non-existent token returns 404');
    assert(invalidQR.body.valid === false, '2.2 Marked as valid: false');
    assert(
      invalidQR.body.message === 'Sorry, this feedback QR code is no longer available.',
      '2.3 Friendly customer message displayed'
    );

    // ------------------------------------------------------------------
    // TEST 3: Customer Feedback Submission with QR Token
    // ------------------------------------------------------------------
    console.log('\nTEST 3: Customer Submission with Valid QR Token (Server-Side Authority)');
    const submitWithQR = await req('POST', '/api/feedback', {
      overall_rating: 5,
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
      comment: 'Excellent lunch at Table 14',
      token: 'sb_tbl14_init2026',
      // Intentionally pass fake table_id from client to test server override
      table_id: 'Fake Table 99',
    });
    assert(submitWithQR.status === 201, '3.1 Feedback submission with QR token returns 201 Created');
    const qrFeedbackId = submitWithQR.body.data.id;

    // ------------------------------------------------------------------
    // TEST 4: Manager Authentication
    // ------------------------------------------------------------------
    console.log('\nTEST 4: Manager Authentication');
    const loginRes = await req('POST', '/api/manager/login', {
      email: 'manager@saravanabhavan.com',
      password: process.env.DEFAULT_MANAGER_PASSWORD || 'Saravana@2026!',
    });
    assert(loginRes.status === 200 && !!loginRes.body.token, '4.1 Manager login succeeds');
    const managerToken = loginRes.body.token;

    // ------------------------------------------------------------------
    // TEST 5: Verify Server-Side Authority on Stored Feedback
    // ------------------------------------------------------------------
    console.log('\nTEST 5: Verify Server Authority (Table 14 Bound, Fake Table 99 Overridden)');
    const feedbackItem = await req('GET', `/api/manager/feedback/${qrFeedbackId}`, null, {
      Authorization: `Bearer ${managerToken}`,
    });
    assert(feedbackItem.status === 200, '5.1 Manager retrieved submitted feedback item');
    assert(feedbackItem.body.data.table_id === 'Table 14', '5.2 Table correctly resolved to "Table 14"');
    assert(feedbackItem.body.data.branch_id === 'Chennai Central', '5.3 Branch correctly resolved to "Chennai Central"');
    assert(
      feedbackItem.body.data.customer_session_token === 'sb_tbl14_init2026',
      '5.4 QR public token preserved as session reference'
    );

    // ------------------------------------------------------------------
    // TEST 6: Manager QR Management - List QRs
    // ------------------------------------------------------------------
    console.log('\nTEST 6: Manager QR Management - List');
    const qrListRes = await req('GET', '/api/manager/qr', null, {
      Authorization: `Bearer ${managerToken}`,
    });
    assert(qrListRes.status === 200, '6.1 Manager GET /api/manager/qr returns 200 OK');
    assert(Array.isArray(qrListRes.body.data), '6.2 QR records returned as array');
    assert(qrListRes.body.data.length >= 3, '6.3 Seeded QRs present (Table 14, Table 1, Table 2)');
    const table14QR = qrListRes.body.data.find(q => q.table_number === '14');
    assert(!!table14QR, '6.4 Table 14 QR record found in management list');
    assert(table14QR && (table14QR.public_url.includes('/q/') || table14QR.public_url.includes('?token=')), '6.5 Public URL properly generated with token');

    // ------------------------------------------------------------------
    // TEST 7: Manager QR Management - Generate New Table QR
    // ------------------------------------------------------------------
    console.log('\nTEST 7: Manager QR Management - Generate New Table QR (Table 25)');
    const genRes = await req('POST', '/api/manager/qr', {
      branchId: 1,
      tableNumber: '25',
    }, {
      Authorization: `Bearer ${managerToken}`,
    });
    assert(genRes.status === 201, '7.1 New QR generated with 201 Created');
    assert(genRes.body.data.table_number === '25', '7.2 Table number is 25');
    assert(genRes.body.data.public_token.startsWith('sb_'), '7.3 Token has secure "sb_" prefix');
    assert(genRes.body.data.public_token.length >= 20, '7.4 Token has sufficient cryptographic length');
    const newQRToken = genRes.body.data.public_token;
    const newQRId = genRes.body.data.id;

    // Verify newly generated QR resolves immediately
    const verifyNew = await req('GET', `/api/public/qr/${newQRToken}`);
    assert(verifyNew.status === 200 && verifyNew.body.valid === true, '7.5 Newly generated QR immediately resolvable');

    // ------------------------------------------------------------------
    // TEST 8: Manager QR Deactivation & Customer Block
    // ------------------------------------------------------------------
    console.log('\nTEST 8: Manager Deactivates QR (Table 25)');
    const deactRes = await req('PATCH', `/api/manager/qr/${newQRId}/status`, {
      active: false,
    }, {
      Authorization: `Bearer ${managerToken}`,
    });
    assert(deactRes.status === 200, '8.1 Deactivation returns 200 OK');
    assert(deactRes.body.data.active === false, '8.2 Record status updated to active: false');

    // Public resolution should now return 404 unavailable
    const checkDeactivated = await req('GET', `/api/public/qr/${newQRToken}`);
    assert(checkDeactivated.status === 404, '8.3 Deactivated QR returns 404');
    assert(checkDeactivated.body.active === false, '8.4 Deactivated QR marked as active: false');

    // Submission with deactivated QR must be rejected
    const blockedSubmit = await req('POST', '/api/feedback', {
      overall_rating: 4,
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
      comment: 'Attempt on inactive QR',
      token: newQRToken,
    });
    assert(blockedSubmit.status === 400, '8.5 Submission to inactive QR rejected with 400 Bad Request');
    assert(
      blockedSubmit.body.message.includes('inactive'),
      '8.6 Explains that QR is inactive and cannot accept submissions'
    );

    // ------------------------------------------------------------------
    // TEST 9: Manager Reactivates QR
    // ------------------------------------------------------------------
    console.log('\nTEST 9: Manager Reactivates QR (Table 25)');
    const reactRes = await req('PATCH', `/api/manager/qr/${newQRId}/status`, {
      active: true,
    }, {
      Authorization: `Bearer ${managerToken}`,
    });
    assert(reactRes.status === 200 && reactRes.body.data.active === true, '9.1 Reactivation returns active: true');

    // Now submission succeeds
    const allowedSubmit = await req('POST', '/api/feedback', {
      overall_rating: 5,
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
      comment: 'Submitted after reactivation',
      token: newQRToken,
    });
    assert(allowedSubmit.status === 201, '9.2 Submission to reactivated QR succeeds with 201 Created');

    // ------------------------------------------------------------------
    // TEST 10: Security Guard - Unauthenticated Access Blocked
    // ------------------------------------------------------------------
    console.log('\nTEST 10: Security Guards on Manager QR Endpoints');
    const unauthList = await req('GET', '/api/manager/qr');
    assert(unauthList.status === 401, '10.1 Unauthenticated GET /api/manager/qr blocked with 401');

    const unauthGen = await req('POST', '/api/manager/qr', { tableNumber: '99' });
    assert(unauthGen.status === 401, '10.2 Unauthenticated POST /api/manager/qr blocked with 401');

    const unauthStatus = await req('PATCH', `/api/manager/qr/${newQRId}/status`, { active: false });
    assert(unauthStatus.status === 401, '10.3 Unauthenticated PATCH /api/manager/qr/:id/status blocked with 401');

    // ------------------------------------------------------------------
    // SUMMARY
    // ------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(`📊 PART 7 QR VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runPart7QRVerification();
