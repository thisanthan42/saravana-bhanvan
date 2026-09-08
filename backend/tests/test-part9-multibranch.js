/**
 * Saravana Bhavan Feedback Platform - Part 9 Multi-Branch & RBAC Automated Test Suite
 */

const API_BASE = 'http://localhost:5000/api';

async function runPart9Tests() {
  console.log('================================================================');
  console.log('🚀 Saravana Bhavan Part 9: Multi-Branch & RBAC Test Suite');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------------------
    // TEST 1: Super Admin Login & Universal Branch Visibility
    // ----------------------------------------------------------------
    console.log('\n--- 1. Testing Super Admin Login & All-Branch Visibility ---');
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
    assert(adminLoginData.success === true, 'Login response indicates success');
    assert(adminLoginData.manager.role === 'super_admin', 'Manager has super_admin role');
    const adminToken = adminLoginData.token;

    // Super Admin lists all branches
    const adminBranchesRes = await fetch(`${API_BASE}/manager/branches`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminBranchesData = await adminBranchesRes.json();
    assert(adminBranchesRes.status === 200, 'Super Admin lists branches successfully');
    assert(adminBranchesData.data.length >= 3, 'Super Admin sees all seeded branches (>= 3)');

    const branchNames = adminBranchesData.data.map(b => b.name);
    assert(branchNames.includes('Chennai Central'), 'Includes Chennai Central');
    assert(branchNames.includes('Coimbatore Gandhipuram'), 'Includes Coimbatore Gandhipuram');
    assert(branchNames.includes('Bangalore Indiranagar'), 'Includes Bangalore Indiranagar');

    // ----------------------------------------------------------------
    // TEST 2: Super Admin Branch Creation & Manager Provisioning
    // ----------------------------------------------------------------
    console.log('\n--- 2. Testing Super Admin Branch & Manager Provisioning ---');
    const newBranchCode = `SB-MDU-${Date.now()}`;
    const createBranchRes = await fetch(`${API_BASE}/manager/branches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Madurai Meenakshi',
        code: newBranchCode,
        address: 'West Tower St, Madurai',
      }),
    });
    const createBranchData = await createBranchRes.json();
    assert(createBranchRes.status === 201, 'Super admin creates new branch successfully');
    assert(createBranchData.data.code === newBranchCode, 'New branch code verified');
    const newBranchId = createBranchData.data.id;

    // Super Admin creates a new branch manager and assigns to Madurai
    const newManagerEmail = `madurai.manager.${Date.now()}@saravanabhavan.com`;
    const createUserRes = await fetch(`${API_BASE}/manager/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Madurai Branch Manager',
        email: newManagerEmail,
        password: 'Madurai@2026!',
        role: 'manager',
        branchIds: [newBranchId],
      }),
    });
    const createUserData = await createUserRes.json();
    assert(createUserRes.status === 201, 'Super Admin creates manager account');
    assert(createUserData.data.email === newManagerEmail, 'Manager email matches');
    assert(createUserData.data.branchIds.includes(newBranchId), 'Manager assigned to Madurai branch');

    // ----------------------------------------------------------------
    // TEST 3: Branch Manager Login & Scoped Access
    // ----------------------------------------------------------------
    console.log('\n--- 3. Testing Branch Manager Scoped Access (Coimbatore) ---');
    const cbeLoginRes = await fetch(`${API_BASE}/manager/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'coimbatore.manager@saravanabhavan.com',
        password: 'Coimbatore@2026!',
      }),
    });
    const cbeLoginData = await cbeLoginRes.json();

    assert(cbeLoginRes.status === 200, 'Coimbatore manager login returns 200');
    assert(cbeLoginData.manager.role === 'manager', 'Manager role is "manager"');
    const cbeToken = cbeLoginData.token;

    // Branch manager gets branches: should ONLY see assigned branch(es)
    const cbeBranchesRes = await fetch(`${API_BASE}/manager/branches`, {
      headers: { Authorization: `Bearer ${cbeToken}` },
    });
    const cbeBranchesData = await cbeBranchesRes.json();
    assert(cbeBranchesRes.status === 200, 'Branch manager can list assigned branches');
    assert(cbeBranchesData.data.length === 1, 'Branch manager sees exactly 1 assigned branch');
    assert(cbeBranchesData.data[0].id === 2, 'Assigned branch is Branch 2 (Coimbatore)');

    // ----------------------------------------------------------------
    // TEST 4: Anti-IDOR Enforcement: Unauthorized Cross-Branch Blocking
    // ----------------------------------------------------------------
    console.log('\n--- 4. Testing Anti-IDOR Protections (Must Return 403 Forbidden) ---');

    // IDOR Test 4.1: Coimbatore manager attempts to access Chennai Central feedback (branchId=1)
    const idorFeedbackRes = await fetch(`${API_BASE}/manager/feedback?branchId=1`, {
      headers: { Authorization: `Bearer ${cbeToken}` },
    });
    const idorFeedbackData = await idorFeedbackRes.json();
    assert(idorFeedbackRes.status === 403, 'IDOR Attempt on Feedback is blocked with HTTP 403');
    assert(idorFeedbackData.code === 'FORBIDDEN_BRANCH_ACCESS', 'Returns FORBIDDEN_BRANCH_ACCESS code');

    // IDOR Test 4.2: Coimbatore manager attempts to access Chennai Central QR codes (branchId=1)
    const idorQRRes = await fetch(`${API_BASE}/manager/qr?branchId=1`, {
      headers: { Authorization: `Bearer ${cbeToken}` },
    });
    const idorQRData = await idorQRRes.json();
    assert(idorQRRes.status === 403, 'IDOR Attempt on QR listing is blocked with HTTP 403');
    assert(idorQRData.code === 'FORBIDDEN_BRANCH_ACCESS', 'Returns FORBIDDEN_BRANCH_ACCESS code');

    // IDOR Test 4.3: Coimbatore manager attempts to access Chennai Central tables (branchId=1)
    const idorTablesRes = await fetch(`${API_BASE}/manager/tables?branchId=1`, {
      headers: { Authorization: `Bearer ${cbeToken}` },
    });
    const idorTablesData = await idorTablesRes.json();
    assert(idorTablesRes.status === 403, 'IDOR Attempt on Table listing is blocked with HTTP 403');
    assert(idorTablesData.code === 'FORBIDDEN_BRANCH_ACCESS', 'Returns FORBIDDEN_BRANCH_ACCESS code');

    // IDOR Test 4.4: Coimbatore manager attempts to generate QR for Chennai Central (branchId=1)
    const idorGenQRRes = await fetch(`${API_BASE}/manager/qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cbeToken}`,
      },
      body: JSON.stringify({ branchId: 1, tableNumber: '99' }),
    });
    assert(idorGenQRRes.status === 403, 'IDOR Attempt to generate QR for other branch is blocked with HTTP 403');

    // IDOR Test 4.5: Coimbatore manager attempts to create a branch (Super Admin restricted)
    const idorCreateBranchRes = await fetch(`${API_BASE}/manager/branches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cbeToken}`,
      },
      body: JSON.stringify({ name: 'Hacker Branch', code: 'SB-HACK' }),
    });
    assert(idorCreateBranchRes.status === 403, 'Branch manager blocked from creating branch (HTTP 403)');

    // IDOR Test 4.6: Coimbatore manager attempts to list manager users (Super Admin restricted)
    const idorUsersRes = await fetch(`${API_BASE}/manager/users`, {
      headers: { Authorization: `Bearer ${cbeToken}` },
    });
    assert(idorUsersRes.status === 403, 'Branch manager blocked from listing manager accounts (HTTP 403)');

    // ----------------------------------------------------------------
    // TEST 5: Table Scoping & Uniqueness Per Branch
    // ----------------------------------------------------------------
    console.log('\n--- 5. Testing Table Management & Scoping Per Branch ---');
    // Coimbatore Manager lists tables for Coimbatore
    const cbeTablesRes = await fetch(`${API_BASE}/manager/tables?branchId=2`, {
      headers: { Authorization: `Bearer ${cbeToken}` },
    });
    const cbeTablesData = await cbeTablesRes.json();
    assert(cbeTablesRes.status === 200, 'Coimbatore manager lists Coimbatore tables');
    assert(cbeTablesData.data.length >= 3, 'Coimbatore has seeded tables (Table 1, 2, 3)');

    // Verify Table 1 exists in Chennai AND Table 1 exists in Coimbatore independently
    const adminChennaiTablesRes = await fetch(`${API_BASE}/manager/tables?branchId=1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminChennaiTablesData = await adminChennaiTablesRes.json();
    const chennaiTable1 = adminChennaiTablesData.data.find(t => String(t.table_number) === '1');
    const cbeTable1 = cbeTablesData.data.find(t => String(t.table_number) === '1');

    assert(Boolean(chennaiTable1), 'Table 1 exists in Chennai Central');
    assert(Boolean(cbeTable1), 'Table 1 exists in Coimbatore Gandhipuram');
    assert(chennaiTable1.id !== cbeTable1.id, 'Chennai Table 1 and Coimbatore Table 1 have different database IDs');

    // Test Table duplicate collision in same branch
    const dupTableRes = await fetch(`${API_BASE}/manager/tables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cbeToken}`,
      },
      body: JSON.stringify({ branchId: 2, tableNumber: '1' }),
    });
    assert(dupTableRes.status === 409, 'Duplicate Table 1 in Coimbatore rejected with HTTP 409 Conflict');

    // Create a new unique table in Coimbatore
    const newCbeTableNumber = `T${Date.now().toString().slice(-4)}`;
    const newTableRes = await fetch(`${API_BASE}/manager/tables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cbeToken}`,
      },
      body: JSON.stringify({ branchId: 2, tableNumber: newCbeTableNumber }),
    });
    const newTableData = await newTableRes.json();
    assert(newTableRes.status === 201, `New unique Table ${newCbeTableNumber} created in Coimbatore`);
    assert(newTableData.data.branch_id === 2, 'Table belongs to Branch 2');

    // Generate QR for table in Coimbatore
    const genQRRes = await fetch(`${API_BASE}/manager/qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cbeToken}`,
      },
      body: JSON.stringify({ branchId: 2, tableNumber: newCbeTableNumber }),
    });
    const genQRData = await genQRRes.json();
    assert(genQRRes.status === 201, `QR generated for Coimbatore Table ${newCbeTableNumber}`);
    assert(genQRData.data.branch_id === 2, 'Generated QR belongs to Branch 2');
    const newCbeQRToken = genQRData.data.public_token;

    // ----------------------------------------------------------------
    // TEST 6: Customer Flow via Coimbatore QR & Zero Leakage
    // ----------------------------------------------------------------
    console.log('\n--- 6. Testing Customer Feedback Submission via Coimbatore QR ---');
    // Customer scans QR
    const qrResolveRes = await fetch(`${API_BASE}/public/qr/${newCbeQRToken}`);
    const qrResolveData = await qrResolveRes.json();
    assert(qrResolveRes.status === 200, 'Customer resolves Coimbatore QR');
    assert(qrResolveData.data.branch_name === undefined, 'Customer response does NOT leak branch name');
    assert(qrResolveData.data.branch_id === undefined, 'Customer response does NOT leak branch_id');
    assert(qrResolveData.data.table_number === undefined, 'Customer response does NOT leak table_number');

    const customerSession = qrResolveData.data.session_token;

    // Customer submits feedback
    const feedbackPayload = {
      overall_rating: 4,
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Average',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
      comment: 'Excellent South Indian lunch in Coimbatore branch!',
      token: newCbeQRToken,
      session_token: customerSession,
    };

    const submitRes = await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackPayload),
    });
    const submitData = await submitRes.json();
    assert(submitRes.status === 201, 'Customer feedback submission accepted');
    const createdFeedbackId = submitData.data.id;

    // Verify Coimbatore Manager sees this feedback in Coimbatore branch
    const cbeFeedbackRes = await fetch(`${API_BASE}/manager/feedback?branchId=2`, {
      headers: { Authorization: `Bearer ${cbeToken}` },
    });
    const cbeFeedbackData = await cbeFeedbackRes.json();
    assert(cbeFeedbackRes.status === 200, 'Coimbatore manager retrieves feedback');
    const foundInCbe = cbeFeedbackData.data.find(f => f.id === createdFeedbackId);
    assert(Boolean(foundInCbe), 'Submitted feedback appears in Coimbatore manager dashboard');

    // Verify Chennai query does NOT include Coimbatore feedback
    const chennaiFeedbackRes = await fetch(`${API_BASE}/manager/feedback?branchId=1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const chennaiFeedbackData = await chennaiFeedbackRes.json();
    const foundInChennai = chennaiFeedbackData.data.find(f => f.id === createdFeedbackId);
    assert(!foundInChennai, 'Submitted Coimbatore feedback is NOT present in Chennai Central query');

    console.log('\n================================================================');
    console.log(`📊 Part 9 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('💥 Uncaught Test Error:', err);
    process.exit(1);
  }
}

runPart9Tests();
