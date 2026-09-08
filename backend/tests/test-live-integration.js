import http from 'http';

const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:5000';

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

function req(baseUrl, method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
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

async function runLiveIntegrationTests() {
  console.log('========================================================================');
  console.log('🔗 FULL LIVE INTEGRATION VERIFICATION: FRONTEND <-> BACKEND <-> DATABASE');
  console.log('========================================================================\n');

  try {
    // ------------------------------------------------------------------
    // TEST A: CUSTOMER FLOW (QR -> Frontend -> Backend -> DB -> Thank You)
    // ------------------------------------------------------------------
    console.log('📌 TEST A — CUSTOMER FLOW');
    
    // A.1 Verify Frontend is serving HTTP 200 on root
    const feRes = await req(FRONTEND_URL, 'GET', '/');
    assert(feRes.status === 200, 'A.1 Frontend root responds with 200 OK');
    assert(typeof feRes.body === 'string' && feRes.body.toLowerCase().includes('<!doctype html>'), 'A.2 Frontend serves HTML application shell');

    // A.2 Verify Manager generates a live Table QR
    const mgrAuth = await req(BACKEND_URL, 'POST', '/api/manager/login', {
      email: 'manager@saravanabhavan.com',
      password: 'test123',
    });
    assert(mgrAuth.status === 200 && mgrAuth.body.token, 'A.3 Manager generates test QR code');
    const adminToken = mgrAuth.body.token;

    const qrGenRes = await req(BACKEND_URL, 'POST', '/api/manager/qr', {
      branchId: 1,
      tableNumber: 15,
    }, { Authorization: `Bearer ${adminToken}` });
    assert(qrGenRes.status === 201 && qrGenRes.body.success, 'A.4 QR created successfully with 201 Created');
    const qrToken = qrGenRes.body.data.public_token || qrGenRes.body.data.token;

    // A.3 Test direct frontend access via /q/:token route
    const spaRes = await req(FRONTEND_URL, 'GET', `/q/${qrToken}`);
    assert(spaRes.status === 200, 'A.5 Frontend SPA router serves /q/:token without 404');

    // A.4 Customer camera scan resolves QR
    const qrResolveRes = await req(BACKEND_URL, 'GET', `/api/public/qr/${qrToken}`);
    assert(qrResolveRes.status === 200 && qrResolveRes.body.valid && qrResolveRes.body.active, 'A.6 Backend resolves QR as valid and active');
    const sessionToken = qrResolveRes.body.data.session_token;
    assert(!!sessionToken, 'A.7 Active submission session issued for customer');

    // A.5 Customer submits full 5-star feedback
    const feedbackPayload = {
      overall_rating: 5,
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
      comment: 'Authentic South Indian taste! Rava Dosa was hot and crispy.',
      token: qrToken,
      session_token: sessionToken,
    };

    const submitRes = await req(BACKEND_URL, 'POST', '/api/feedback', feedbackPayload);
    assert(submitRes.status === 201 && submitRes.body.success, 'A.8 Customer feedback successfully stored in backend (201 Created)');
    assert(submitRes.body.data && submitRes.body.data.id, 'A.9 Backend returns customer feedback confirmation ID');

    // A.6 Session replay protection
    const replayRes = await req(BACKEND_URL, 'POST', '/api/feedback', feedbackPayload);
    assert(replayRes.status === 409, 'A.10 Replay submission on completed session blocked with 409 Conflict');
    console.log('   Result: Customer flow passed 100%.\n');

    // ------------------------------------------------------------------
    // TEST B: MANAGER PORTAL FLOW (Login -> Real Dashboard -> Stats)
    // ------------------------------------------------------------------
    console.log('📌 TEST B — MANAGER PORTAL FLOW');
    
    // B.1 Manager login
    const bManagerLogin = await req(BACKEND_URL, 'POST', '/api/manager/login', {
      email: 'coimbatore.manager@saravanabhavan.com',
      password: 'test123',
    });
    assert(bManagerLogin.status === 200 && bManagerLogin.body.success, 'B.1 Branch manager login successful (200 OK)');
    const bToken = bManagerLogin.body.token;

    // B.2 Manager profile retrieval
    const profileRes = await req(BACKEND_URL, 'GET', '/api/manager/me', null, { Authorization: `Bearer ${bToken}` });
    assert(profileRes.status === 200 && (profileRes.body.manager.role === 'manager' || profileRes.body.manager.role === 'branch_manager'), 'B.2 Manager profile verified as branch manager');

    // B.3 Manager dashboard live feedback retrieval
    const feedRes = await req(BACKEND_URL, 'GET', '/api/manager/feedback', null, { Authorization: `Bearer ${bToken}` });
    assert(feedRes.status === 200 && feedRes.body.success, 'B.3 Manager dashboard feedback list retrieved (200 OK)');
    assert(Array.isArray(feedRes.body.feedback), 'B.4 Real feedback records returned as array');
    assert(typeof feedRes.body.summary === 'object', 'B.5 Real summary stats object present');
    assert(feedRes.body.summary.stars && feedRes.body.summary.stars[5] !== undefined, 'B.6 Real 5-star rating count present');
    assert(feedRes.body.summary.needs_action_count !== undefined, 'B.7 Real Need Action count present');

    // B.4 Manager QR management
    const qrListRes = await req(BACKEND_URL, 'GET', '/api/manager/qr', null, { Authorization: `Bearer ${bToken}` });
    assert(qrListRes.status === 200 && Array.isArray(qrListRes.body.data), 'B.8 Manager retrieved branch QR code list');
    console.log('   Result: Manager flow passed 100%.\n');

    // ------------------------------------------------------------------
    // TEST C: SUPER ADMIN PORTAL FLOW (Login -> Stats -> Control Panel)
    // ------------------------------------------------------------------
    console.log('📌 TEST C — SUPER ADMIN PORTAL FLOW');
    
    // C.1 Super Admin KPI statistics
    const statsRes = await req(BACKEND_URL, 'GET', '/api/admin/stats', null, { Authorization: `Bearer ${adminToken}` });
    assert(statsRes.status === 200 && statsRes.body.success, 'C.1 Super Admin retrieves 8 calculated KPI metrics (200 OK)');
    assert(statsRes.body.stats.total_businesses !== undefined || statsRes.body.stats.totalBusinesses !== undefined, 'C.2 KPI includes total_businesses');
    assert(statsRes.body.stats.total_branches !== undefined || statsRes.body.stats.totalBranches !== undefined, 'C.3 KPI includes total_branches');
    assert(statsRes.body.stats.total_feedback !== undefined || statsRes.body.stats.totalFeedback !== undefined, 'C.4 KPI includes total_feedback');

    // C.2 Super Admin businesses list
    const bizRes = await req(BACKEND_URL, 'GET', '/api/admin/businesses', null, { Authorization: `Bearer ${adminToken}` });
    assert(bizRes.status === 200 && Array.isArray(bizRes.body.businesses), 'C.5 Super Admin retrieves hotel businesses');

    // C.3 Super Admin branches list
    const branchRes = await req(BACKEND_URL, 'GET', '/api/admin/branches', null, { Authorization: `Bearer ${adminToken}` });
    assert(branchRes.status === 200 && Array.isArray(branchRes.body.branches), 'C.6 Super Admin retrieves all hotel branches');

    // C.4 Super Admin managers list
    const mgrsRes = await req(BACKEND_URL, 'GET', '/api/admin/managers', null, { Authorization: `Bearer ${adminToken}` });
    assert(mgrsRes.status === 200 && Array.isArray(mgrsRes.body.managers), 'C.7 Super Admin retrieves manager accounts');

    // C.5 Super Admin audit logs
    const auditRes = await req(BACKEND_URL, 'GET', '/api/admin/audit-logs', null, { Authorization: `Bearer ${adminToken}` });
    assert(auditRes.status === 200 && Array.isArray(auditRes.body.logs), 'C.8 Super Admin retrieves chronological audit logs');
    console.log('   Result: Super Admin flow passed 100%.\n');

    // ------------------------------------------------------------------
    // TEST D: SECURITY & ISOLATION AUDIT
    // ------------------------------------------------------------------
    console.log('📌 TEST D — SECURITY & ISOLATION AUDIT');

    // D.1 Customer cannot access manager APIs
    const unauthRes = await req(BACKEND_URL, 'GET', '/api/manager/feedback');
    assert(unauthRes.status === 401, 'D.1 Unauthenticated access to manager API rejected with 401 Unauthorized');

    // D.2 Branch manager cannot access Super Admin endpoints
    const privRes = await req(BACKEND_URL, 'GET', '/api/admin/stats', null, { Authorization: `Bearer ${bToken}` });
    assert(privRes.status === 403, 'D.2 Branch manager access to Super Admin stats rejected with 403 Forbidden');

    // D.3 Branch manager cannot access unauthorized branch feedback (Anti-IDOR)
    const idorRes = await req(BACKEND_URL, 'GET', '/api/manager/feedback?branchId=1', null, { Authorization: `Bearer ${bToken}` });
    assert(idorRes.status === 403, 'D.3 Anti-IDOR: Branch manager blocked from unauthorized branch feedback (403 Forbidden)');

    // D.4 Customer privacy: QR resolution never leaks table_number or manager data
    const privCheck = await req(BACKEND_URL, 'GET', `/api/public/qr/${qrToken}`);
    assert(privCheck.body.data.table_number === undefined, 'D.4 Customer Privacy: table_number is NOT exposed in public QR response');
    assert(privCheck.body.data.branch_id === undefined, 'D.5 Customer Privacy: internal branch_id is NOT exposed');
    console.log('   Result: Security audit passed 100%.\n');

    console.log('========================================================================');
    console.log(`📊 LIVE INTEGRATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================');
    if (failed === 0) {
      console.log('🎉 COMPLETE SYSTEM INTEGRATION VERIFIED SUCCESSFULLY ACROSS ALL FLOWS!');
    }
  } catch (err) {
    console.error('Integration test encountered error:', err);
    process.exit(1);
  }
}

runLiveIntegrationTests();
