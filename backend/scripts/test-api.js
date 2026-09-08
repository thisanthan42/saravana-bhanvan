/**
 * Automated API Testing Suite for Saravana Bhavan Backend
 * 
 * Runs end-to-end verification of all endpoints, validation logic,
 * security guards, and error responses.
 */
import http from 'http';
import app from '../src/app.js';

const PORT = 5099; // Isolated test port
let server;
let passedCount = 0;
let totalCount = 0;

function assert(condition, message) {
  totalCount++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function makeRequest(path, options = {}) {
  const url = `http://localhost:${PORT}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const status = response.status;
  let json = null;
  try {
    json = await response.json();
  } catch {
    // Non-JSON
  }

  return { status, json };
}

async function runTests() {
  console.log('===========================================================');
  console.log('🧪 Running Saravana Bhavan Backend API Test Suite');
  console.log('===========================================================');

  // Start test server
  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });

  try {
    // -----------------------------------------------------------------
    // TEST 1: Health Check Endpoint
    // -----------------------------------------------------------------
    console.log('\n[Test 1] Health Check (GET /api/health)');
    {
      const res = await makeRequest('/api/health');
      assert(res.status === 200, 'Returns HTTP 200 OK');
      assert(res.json?.success === true, 'Returns success: true');
      assert(res.json?.database !== undefined, 'Includes database diagnostic status');
      assert(!JSON.stringify(res.json).includes('password'), 'Does not leak database password');
    }

    // -----------------------------------------------------------------
    // TEST 2: Valid Feedback Submission (POST /api/feedback)
    // -----------------------------------------------------------------
    console.log('\n[Test 2] Valid Feedback Submission (POST /api/feedback)');
    {
      const payload = {
        overall_rating: 5,
        service_rating: 'Good',
        cleanliness_rating: 'Good',
        toilet_rating: 'Average',
        parking_rating: 'Good',
        food_rating: 'Good',
        staff_behaviour_rating: 'Good',
        comment: 'Crispy ghee roast dosa and aromatic filter coffee were exceptional!',
        branch_id: 'branch-central',
        table_id: 'table-14',
      };

      const res = await makeRequest('/api/feedback', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      assert(res.status === 201, 'Returns HTTP 201 Created');
      assert(res.json?.success === true, 'Returns success: true');
      assert(res.json?.message === 'Feedback submitted successfully', 'Returns friendly success message');
      assert(res.json?.data?.id !== undefined, 'Returns generated submission ID');
      assert(res.json?.data?.submitted_at !== undefined, 'Returns submission timestamp');
    }

    // -----------------------------------------------------------------
    // TEST 3: Validation - Missing Overall Rating
    // -----------------------------------------------------------------
    console.log('\n[Test 3] Validation Failure - Missing Overall Rating');
    {
      const payload = {
        service_rating: 'Good',
        cleanliness_rating: 'Good',
        toilet_rating: 'Average',
        parking_rating: 'Good',
        food_rating: 'Good',
        staff_behaviour_rating: 'Good',
      };

      const res = await makeRequest('/api/feedback', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      assert(res.status === 400, 'Rejects with HTTP 400 Bad Request');
      assert(res.json?.success === false, 'Returns success: false');
      assert(
        res.json?.errors?.some((e) => e.field === 'overall_rating'),
        'Identifies missing overall_rating in error list'
      );
    }

    // -----------------------------------------------------------------
    // TEST 4: Validation - Invalid Star Range (> 5)
    // -----------------------------------------------------------------
    console.log('\n[Test 4] Validation Failure - Star Rating Out of Range (6 Stars)');
    {
      const payload = {
        overall_rating: 6,
        service_rating: 'Good',
        cleanliness_rating: 'Good',
        toilet_rating: 'Good',
        parking_rating: 'Good',
        food_rating: 'Good',
        staff_behaviour_rating: 'Good',
      };

      const res = await makeRequest('/api/feedback', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      assert(res.status === 400, 'Rejects with HTTP 400 Bad Request');
      assert(
        res.json?.errors?.some((e) => e.message.includes('1 and 5')),
        'Error message clarifies valid range 1-5'
      );
    }

    // -----------------------------------------------------------------
    // TEST 5: Validation - Invalid Rating Option ('Terrible')
    // -----------------------------------------------------------------
    console.log('\n[Test 5] Validation Failure - Invalid Rating Value ("Terrible")');
    {
      const payload = {
        overall_rating: 4,
        service_rating: 'Terrible', // Invalid! Must be Good / Average / Bad
        cleanliness_rating: 'Good',
        toilet_rating: 'Average',
        parking_rating: 'Good',
        food_rating: 'Good',
        staff_behaviour_rating: 'Good',
      };

      const res = await makeRequest('/api/feedback', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      assert(res.status === 400, 'Rejects with HTTP 400 Bad Request');
      assert(
        res.json?.errors?.some((e) => e.field === 'service_rating'),
        'Identifies service_rating as invalid'
      );
    }

    // -----------------------------------------------------------------
    // TEST 6: Valid Feedback - Optional Comment Omitted
    // -----------------------------------------------------------------
    console.log('\n[Test 6] Valid Submission with Optional Comment Omitted');
    {
      const payload = {
        overall_rating: 4,
        service_rating: 'Good',
        cleanliness_rating: 'Average',
        toilet_rating: 'Average',
        parking_rating: 'Average',
        food_rating: 'Good',
        staff_behaviour_rating: 'Good',
        // comment omitted
      };

      const res = await makeRequest('/api/feedback', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      assert(res.status === 201, 'Succeeds with HTTP 201 Created without comment');
      assert(res.json?.data?.id !== undefined, 'Generates submission ID');
    }

    // -----------------------------------------------------------------
    // TEST 7: Security Guard - Public Attempt to Access All Feedback
    // -----------------------------------------------------------------
    console.log('\n[Test 7] Security Guard - Unauthorized GET /api/feedback');
    {
      const res = await makeRequest('/api/feedback'); // No manager key provided

      assert(res.status === 401 || res.status === 403, 'Rejects unauthorized public access with HTTP 401/403');
      assert(res.json?.success === false, 'Returns success: false');
      assert(
        res.json?.message?.includes('Manager authentication required'),
        'Confirms manager authentication is strictly required'
      );
    }

    // -----------------------------------------------------------------
    // TEST 8: Manager Access with Key (GET /api/feedback)
    // -----------------------------------------------------------------
    console.log('\n[Test 8] Protected Manager Access with Valid Key');
    {
      const res = await makeRequest('/api/feedback', {
        headers: {
          'x-manager-key': process.env.MANAGER_API_SECRET || 'saravana_secret_manager_key_change_in_production',
        },
      });

      assert(res.status === 200, 'Allows authorized manager with HTTP 200 OK');
      assert(Array.isArray(res.json?.data), 'Returns records array for manager');
      assert(res.json?.summary !== undefined, 'Returns feedback metrics summary');
    }

    // -----------------------------------------------------------------
    // TEST 9: 404 Unknown Route Handling
    // -----------------------------------------------------------------
    console.log('\n[Test 9] Unknown Route Error Handling (GET /api/nonexistent)');
    {
      const res = await makeRequest('/api/nonexistent');
      assert(res.status === 404, 'Returns clean HTTP 404 Not Found');
      assert(res.json?.success === false, 'Returns clean JSON error structure');
    }

  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('\n===========================================================');
  console.log(`📊 Test Results: ${passedCount} / ${totalCount} Passed`);
  if (passedCount === totalCount) {
    console.log('🎉 ALL BACKEND API TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('❌ SOME TESTS FAILED');
    process.exit(1);
  }
  console.log('===========================================================');
}

runTests();
