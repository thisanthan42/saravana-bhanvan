import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:5000';
let totalPassed = 0;
let totalFailed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    totalPassed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    totalFailed++;
  }
}

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================================');
  console.log('🧪 Running Saravana Bhavan Manager API & Authentication Test Suite');
  console.log('====================================================================\n');

  let managerToken = '';

  try {
    // TEST 1: Login with invalid credentials
    console.log('Test Suite 1: Manager Login Authentication');
    const badLogin = await request('POST', '/api/manager/login', {
      email: 'manager@saravanabhavan.com',
      password: 'WrongPassword123!',
    });
    assert(badLogin.status === 401, 'Rejects incorrect password with 401');
    assert(badLogin.body.success === false, 'Returns success: false on failed login');
    assert(badLogin.body.message === 'Invalid username or password.', 'Uses non-enumerating generic error message');

    // TEST 2: Login with missing fields
    const emptyLogin = await request('POST', '/api/manager/login', { email: '' });
    assert(emptyLogin.status === 400, 'Rejects empty credentials with 400');

    // TEST 3: Login with valid credentials
    const validLogin = await request('POST', '/api/manager/login', {
      email: process.env.DEFAULT_MANAGER_EMAIL || 'manager@saravanabhavan.com',
      password: process.env.DEFAULT_MANAGER_PASSWORD || 'Saravana@2026!',
    });
    assert(validLogin.status === 200, 'Accepts valid manager credentials with 200');
    assert(validLogin.body.success === true, 'Returns success: true');
    assert(typeof validLogin.body.token === 'string' && validLogin.body.token.length > 20, 'Returns signed JWT token');
    assert(validLogin.body.manager && validLogin.body.manager.email, 'Returns manager profile without password');
    assert(validLogin.body.manager.password_hash === undefined, 'Never exposes password_hash in response');
    managerToken = validLogin.body.token;

    // TEST 4: Protected GET /api/manager/me without token
    console.log('\nTest Suite 2: Route Protection & Session Verification');
    const unauthMe = await request('GET', '/api/manager/me');
    assert(unauthMe.status === 401, 'Blocks unauthenticated GET /api/manager/me with 401');

    // TEST 5: GET /api/manager/me with valid token
    const authMe = await request('GET', '/api/manager/me', null, {
      Authorization: `Bearer ${managerToken}`,
    });
    assert(
      authMe.body.manager && (authMe.body.manager.role === 'manager' || authMe.body.manager.role === 'super_admin'),
      'Returns decoded manager role (manager or super_admin)'
    );

    // TEST 6: Protected GET /api/manager/feedback without token
    const unauthFeedback = await request('GET', '/api/manager/feedback');
    assert(unauthFeedback.status === 401, 'Blocks unauthenticated GET /api/manager/feedback with 401');

    // TEST 7: Seed sample customer submissions for filtering verification
    console.log('\nTest Suite 3: Data Ingestion & Need Action Derivation');
    // 7A: 5-Star perfect experience (No action needed)
    await request('POST', '/api/feedback', {
      overall_rating: 5,
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
      comment: 'Superb filter coffee and crispy ghee roast!',
    });

    // 7B: 4-Star with Service Bad (Requires Action)
    await request('POST', '/api/feedback', {
      overall_rating: 4,
      service_rating: 'Bad',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Average',
      comment: 'Food was delicious but waited 30 minutes for service.',
    });

    // 7C: 2-Star negative experience (Requires Action)
    await request('POST', '/api/feedback', {
      overall_rating: 2,
      service_rating: 'Average',
      cleanliness_rating: 'Average',
      toilet_rating: 'Bad',
      parking_rating: 'Bad',
      food_rating: 'Average',
      staff_behaviour_rating: 'Average',
      comment: 'Parking was crowded and restroom was not clean.',
    });

    // TEST 8: Manager retrieves feedback list and summary KPIs
    console.log('\nTest Suite 4: Manager Dashboard Filtering, Search & Metrics');
    const feedbackRes = await request('GET', '/api/manager/feedback', null, {
      Authorization: `Bearer ${managerToken}`,
    });
    assert(feedbackRes.status === 200, 'Authenticated manager receives feedback list');
    assert(feedbackRes.body.summary !== undefined, 'Includes summary KPI statistics');
    assert(typeof feedbackRes.body.summary.needs_action_count === 'number', 'Calculates needs_action_count in summary');
    assert(Array.isArray(feedbackRes.body.data), 'Returns data array');

    // TEST 9: Need Action filtering
    const needActionRes = await request('GET', '/api/manager/feedback?needsAction=true', null, {
      Authorization: `Bearer ${managerToken}`,
    });
    assert(needActionRes.status === 200, 'Filter needsAction=true returns 200');
    const allNeedAction = needActionRes.body.data.every((item) => item.needs_action === true);
    assert(allNeedAction, 'Every returned item has needs_action: true');
    const hasReasons = needActionRes.body.data.every((item) => Array.isArray(item.action_reasons) && item.action_reasons.length > 0);
    assert(hasReasons, 'Returned items have specific action_reasons explaining why');

    // TEST 10: Star Rating filtering
    const star5Res = await request('GET', '/api/manager/feedback?rating=5', null, {
      Authorization: `Bearer ${managerToken}`,
    });
    const all5Stars = star5Res.body.data.every((item) => item.overall_rating === 5);
    assert(all5Stars, 'Filter rating=5 returns only 5-star submissions');

    // TEST 11: Comment Search filtering
    const searchRes = await request('GET', '/api/manager/feedback?search=coffee', null, {
      Authorization: `Bearer ${managerToken}`,
    });
    assert(searchRes.status === 200, 'Search by keyword returns 200');
    assert(searchRes.body.data.some((item) => item.comment && item.comment.toLowerCase().includes('coffee')), 'Finds matching comment');

    // TEST 12: Pagination
    const pageRes = await request('GET', '/api/manager/feedback?page=1&limit=2', null, {
      Authorization: `Bearer ${managerToken}`,
    });
    assert(pageRes.body.data.length <= 2, 'Respects pagination limit parameter');
    assert(pageRes.body.pagination.current_page === 1, 'Returns current_page');
    assert(pageRes.body.pagination.total_pages >= 1, 'Returns total_pages calculation');

    // TEST 13: Manager Logout
    console.log('\nTest Suite 5: Logout Flow');
    const logoutRes = await request('POST', '/api/manager/logout', null, {
      Authorization: `Bearer ${managerToken}`,
    });
    assert(logoutRes.status === 200, 'POST /api/manager/logout returns 200');
    assert(logoutRes.body.success === true, 'Logout returns success: true');

    console.log('\n====================================================================');
    console.log(`📊 Test Summary: ${totalPassed} Passed, ${totalFailed} Failed`);
    console.log('====================================================================\n');

    process.exit(totalFailed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
