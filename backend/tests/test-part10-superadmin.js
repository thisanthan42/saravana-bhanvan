/**
 * Saravana Bhavan Part 10: Super Admin Control Panel Automated Test Suite
 * Tests platform owner statistics, business governance, manager suspension,
 * cascading business suspension, anti-privilege escalation, and audit logging.
 */

const API_BASE = 'http://localhost:5000/api';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runPart10Tests() {
  console.log('================================================================');
  console.log('👑 Saravana Bhavan Part 10: Super Admin Control Panel Test Suite');
  console.log('================================================================');

  try {
    // ----------------------------------------------------------------
    // TEST 1: Super Admin Login & Live Platform Stats
    // ----------------------------------------------------------------
    console.log('\n--- 1. Testing Super Admin Login & Platform Stats ---');
    const adminLoginRes = await fetch(`${API_BASE}/manager/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'manager@saravanabhavan.com',
        password: process.env.DEFAULT_MANAGER_PASSWORD || 'test123',
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200, 'Super admin login returns 200 OK');
    assert(adminLoginData.manager.role === 'super_admin', 'Role is super_admin');
    const adminToken = adminLoginData.token;

    const statsRes = await fetch(`${API_BASE}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statsData = await statsRes.json();
    assert(statsRes.status === 200, 'Stats endpoint returns 200 OK');
    assert(statsData.success === true, 'Stats success is true');
    assert(typeof statsData.stats.totalBusinesses === 'number' && statsData.stats.totalBusinesses >= 1, 'Total businesses is numeric and >= 1');
    assert(typeof statsData.stats.activeBusinesses === 'number', 'Active businesses count is numeric');
    assert(typeof statsData.stats.totalManagers === 'number', 'Total managers count is numeric');
    assert(typeof statsData.stats.totalBranches === 'number', 'Total branches count is numeric');
    assert(typeof statsData.stats.totalQRCodes === 'number', 'Total QR codes count is numeric');
    assert(typeof statsData.stats.totalFeedback === 'number', 'Total feedback count is numeric');

    // ----------------------------------------------------------------
    // TEST 2: Business Management (Create, List, Suspend, Activate)
    // ----------------------------------------------------------------
    console.log('\n--- 2. Testing Business/Hotel Management ---');
    const listBizRes = await fetch(`${API_BASE}/admin/businesses`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listBizData = await listBizRes.json();
    assert(listBizRes.status === 200, 'List businesses returns 200 OK');
    assert(listBizData.businesses.length >= 1, 'At least 1 business exists');
    assert(listBizData.businesses.some(b => b.name.includes('Saravana Bhavan')), 'Saravana Bhavan business is present');

    // Create new business
    const newBizName = `Hotel Royal Grand ${Date.now().toString().slice(-4)}`;
    const createBizRes = await fetch(`${API_BASE}/admin/businesses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: newBizName,
        contactEmail: 'contact@royalgrand.com',
        contactPhone: '+91 98765 43210',
      }),
    });
    const createBizData = await createBizRes.json();
    assert(createBizRes.status === 201, 'Create business returns 201 Created');
    assert(createBizData.business.name === newBizName, 'Created business name matches');
    assert(createBizData.business.status === 'active', 'Default business status is active');
    const createdBizId = createBizData.business.id;

    // Suspend business
    const suspendBizRes = await fetch(`${API_BASE}/admin/businesses/${createdBizId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'suspended' }),
    });
    const suspendBizData = await suspendBizRes.json();
    assert(suspendBizRes.status === 200, 'Suspend business returns 200 OK');
    assert(suspendBizData.business.status === 'suspended', 'Business status changed to suspended');

    // Reactivate business
    const activateBizRes = await fetch(`${API_BASE}/admin/businesses/${createdBizId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'active' }),
    });
    const activateBizData = await activateBizRes.json();
    assert(activateBizRes.status === 200, 'Reactivate business returns 200 OK');
    assert(activateBizData.business.status === 'active', 'Business status restored to active');

    // ----------------------------------------------------------------
    // TEST 3: Manager Management (Create, Reassign Branches, Password Reset)
    // ----------------------------------------------------------------
    console.log('\n--- 3. Testing Manager Management & Password Reset ---');
    const testMgrEmail = `salem.mgr.${Date.now().toString().slice(-4)}@saravanabhavan.com`;
    const createMgrRes = await fetch(`${API_BASE}/admin/managers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Salem Branch Manager',
        email: testMgrEmail,
        password: 'InitialPassword@2026!',
        role: 'manager',
        branchIds: [1],
      }),
    });
    const createMgrData = await createMgrRes.json();
    assert(createMgrRes.status === 201, 'Super Admin creates manager account');
    assert(createMgrData.manager.email === testMgrEmail, 'Manager email matches');
    const testMgrId = createMgrData.manager.id;

    // Securely reset password
    const resetPwdRes = await fetch(`${API_BASE}/admin/managers/${testMgrId}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ password: 'NewSecurePassword@2026!' }),
    });
    const resetPwdData = await resetPwdRes.json();
    assert(resetPwdRes.status === 200, 'Password reset returns 200 OK');
    assert(resetPwdData.success === true, 'Password reset succeeded');

    // Verify login with new password
    const newLoginRes = await fetch(`${API_BASE}/manager/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testMgrEmail,
        password: 'NewSecurePassword@2026!',
      }),
    });
    const newLoginData = await newLoginRes.json();
    assert(newLoginRes.status === 200, 'Manager logs in with reset password');
    const testMgrToken = newLoginData.token;

    // ----------------------------------------------------------------
    // TEST 4: Live Account Suspension Enforcement
    // ----------------------------------------------------------------
    console.log('\n--- 4. Testing Live Account Suspension Enforcement ---');
    // Verify active manager can access feedback
    const activeReq = await fetch(`${API_BASE}/manager/feedback`, {
      headers: { Authorization: `Bearer ${testMgrToken}` },
    });
    assert(activeReq.status === 200, 'Active manager can query feedback');

    // Super Admin suspends the manager
    const suspendMgrRes = await fetch(`${API_BASE}/admin/managers/${testMgrId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'suspended' }),
    });
    assert(suspendMgrRes.status === 200, 'Super admin suspends manager account');

    // Subsequent request with the ALREADY-ISSUED token must be rejected with 403
    const blockedReq = await fetch(`${API_BASE}/manager/feedback`, {
      headers: { Authorization: `Bearer ${testMgrToken}` },
    });
    const blockedData = await blockedReq.json();
    assert(blockedReq.status === 403, 'Suspended manager token is rejected with HTTP 403 Forbidden');
    assert(blockedData.code === 'ACCOUNT_SUSPENDED', 'Returns ACCOUNT_SUSPENDED code');

    // Login attempt while suspended must also be rejected
    const suspendedLoginRes = await fetch(`${API_BASE}/manager/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testMgrEmail,
        password: 'NewSecurePassword@2026!',
      }),
    });
    const suspendedLoginData = await suspendedLoginRes.json();
    assert(suspendedLoginRes.status === 403, 'Login attempt by suspended manager rejected with 403');
    assert(suspendedLoginData.code === 'ACCOUNT_SUSPENDED', 'Login rejection code is ACCOUNT_SUSPENDED');

    // Reactivate manager
    const reactivateRes = await fetch(`${API_BASE}/admin/managers/${testMgrId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'active' }),
    });
    assert(reactivateRes.status === 200, 'Super admin reactivates manager');

    const restoredReq = await fetch(`${API_BASE}/manager/feedback`, {
      headers: { Authorization: `Bearer ${testMgrToken}` },
    });
    assert(restoredReq.status === 200, 'Reactivated manager immediately regains access');

    // ----------------------------------------------------------------
    // TEST 5: Business Suspension Cascading Protection
    // ----------------------------------------------------------------
    console.log('\n--- 5. Testing Business Suspension Cascading Protection ---');
    // Create branch under createdBizId
    const hotelBranchRes = await fetch(`${API_BASE}/admin/branches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Royal Grand Main Branch',
        code: `RGM-${Date.now().toString().slice(-4)}`,
        businessId: createdBizId,
      }),
    });
    const hotelBranchData = await hotelBranchRes.json();
    assert(hotelBranchRes.status === 201, 'Created branch under secondary business');
    const hotelBranchId = hotelBranchData.branch.id;

    // Create manager under createdBizId
    const hotelMgrEmail = `royal.mgr.${Date.now().toString().slice(-4)}@royalgrand.com`;
    const hotelMgrRes = await fetch(`${API_BASE}/admin/managers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Royal Grand Manager',
        email: hotelMgrEmail,
        password: 'RoyalPassword@2026!',
        role: 'manager',
        businessId: createdBizId,
        branchIds: [hotelBranchId],
      }),
    });
    assert(hotelMgrRes.status === 201, 'Created manager for secondary business');

    // Login as hotel manager
    const hotelLoginRes = await fetch(`${API_BASE}/manager/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: hotelMgrEmail,
        password: 'RoyalPassword@2026!',
      }),
    });
    assert(hotelLoginRes.status === 200, 'Hotel manager logs in successfully');
    const hotelMgrToken = (await hotelLoginRes.json()).token;

    // Suspend the business
    await fetch(`${API_BASE}/admin/businesses/${createdBizId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'suspended' }),
    });

    // Hotel manager's requests should now be blocked with BUSINESS_SUSPENDED
    const hotelBlockedReq = await fetch(`${API_BASE}/manager/feedback`, {
      headers: { Authorization: `Bearer ${hotelMgrToken}` },
    });
    const hotelBlockedData = await hotelBlockedReq.json();
    assert(hotelBlockedReq.status === 403, 'Manager of suspended business is blocked with 403');
    assert(hotelBlockedData.code === 'BUSINESS_SUSPENDED', 'Error code is BUSINESS_SUSPENDED');

    // Hotel manager login is also blocked
    const hotelBlockedLogin = await fetch(`${API_BASE}/manager/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: hotelMgrEmail,
        password: 'RoyalPassword@2026!',
      }),
    });
    assert(hotelBlockedLogin.status === 403, 'Login to suspended business is rejected with 403');

    // ----------------------------------------------------------------
    // TEST 6: Anti-Privilege Escalation
    // ----------------------------------------------------------------
    console.log('\n--- 6. Testing Anti-Privilege Escalation ---');
    // Normal manager attempts to call admin stats
    const unauthorizedStats = await fetch(`${API_BASE}/admin/stats`, {
      headers: { Authorization: `Bearer ${testMgrToken}` },
    });
    assert(unauthorizedStats.status === 403, 'Branch manager calling admin stats gets 403 Forbidden');
    const unauthData = await unauthorizedStats.json();
    assert(unauthData.code === 'FORBIDDEN_SUPER_ADMIN', 'Returns FORBIDDEN_SUPER_ADMIN');

    // Normal manager attempts to create a business
    const unauthorizedCreateBiz = await fetch(`${API_BASE}/admin/businesses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testMgrToken}`,
      },
      body: JSON.stringify({ name: 'Hacked Hotel' }),
    });
    assert(unauthorizedCreateBiz.status === 403, 'Branch manager creating business gets 403 Forbidden');

    // Super Admin cannot suspend self
    const selfSuspendRes = await fetch(`${API_BASE}/admin/managers/${adminLoginData.manager.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'suspended' }),
    });
    assert(selfSuspendRes.status === 400, 'Super admin self-suspension is safely blocked with 400 Bad Request');

    // Unauthenticated access
    const unauthRes = await fetch(`${API_BASE}/admin/stats`);
    assert(unauthRes.status === 401, 'Unauthenticated admin access returns 401 Unauthorized');

    // ----------------------------------------------------------------
    // TEST 7: Audit Log Verification
    // ----------------------------------------------------------------
    console.log('\n--- 7. Testing Platform Audit Trail ---');
    const auditRes = await fetch(`${API_BASE}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditData = await auditRes.json();
    assert(auditRes.status === 200, 'Audit logs endpoint returns 200 OK');
    assert(Array.isArray(auditData.logs) && auditData.logs.length >= 3, 'Audit log contains administrative events');
    const hasBizCreated = auditData.logs.some(l => l.action === 'BUSINESS_CREATED');
    const hasMgrSuspended = auditData.logs.some(l => l.action === 'MANAGER_SUSPENDED');
    assert(hasBizCreated, 'Audit log recorded BUSINESS_CREATED');
    assert(hasMgrSuspended, 'Audit log recorded MANAGER_SUSPENDED');

    // ----------------------------------------------------------------
    // TEST 8: Customer Feedback Ingestion & Zero Leakage
    // ----------------------------------------------------------------
    console.log('\n--- 8. Testing Customer Flow Under Super Admin System ---');
    const qrRes = await fetch(`${API_BASE}/public/qr/sb_tbl14_init2026`);
    const qrData = await qrRes.json();
    assert(qrRes.status === 200, 'Public QR resolution works');
    assert(!qrData.branch_name && !qrData.table_number && !qrData.business_id, 'Customer response does NOT leak branch, table or business');

    // Submit feedback
    const submitRes = await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        overall_rating: 5,
        service_rating: 'Good',
        cleanliness_rating: 'Good',
        toilet_rating: 'Good',
        parking_rating: 'Good',
        food_rating: 'Good',
        staff_behaviour_rating: 'Good',
        comment: 'Verified pristine by Part 10 Super Admin testing suite',
        session_token: qrData.session_token,
      }),
    });
    assert(submitRes.status === 201, 'Customer feedback submission accepted');

    console.log('\n================================================================');
    console.log(`📊 Part 10 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('👑 ALL PART 10 SUPER ADMIN TESTS PASSED SUCCESSFULLY!');
    console.log('================================================================\n');

  } catch (err) {
    console.error(`\n💥 Test Suite Terminated with Error: ${err.message}`);
    process.exit(1);
  }
}

runPart10Tests();
