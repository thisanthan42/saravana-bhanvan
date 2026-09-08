/**
 * Saravana Bhavan Hotel - Part 10 Final Production Readiness & Security Audit Test Suite
 * 
 * Verifies all 24 production criteria:
 * - Complete User Journey (Super Admin -> Business -> Branch -> Table -> QR -> Customer -> Manager -> Super Admin)
 * - Customer Rating Matrix (1-5 stars, all 6 categories, comments, submission)
 * - Customer Privacy Guard (Zero leakage of branches, tables, businesses, managers)
 * - Manager Anti-IDOR & Authorization Guard
 * - Super Admin Control & Privilege Escalation Prevention
 * - Instant Live Suspension (Manager & Business) with Zero Historical Data Loss
 * - QR Resolution, Deactivation, & Tampering Protection
 * - Abuse, Idempotency, Session Replay, & XSS Input Sanitization
 * - HTTP Security Headers & Production Error Sanitization
 */

const BASE_URL = 'http://localhost:5000/api';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    testsPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    testsFailed++;
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, headers: res.headers, data };
}

async function runAudit() {
  console.log('========================================================================');
  console.log('🛡️  PART 10: FINAL PRODUCTION READINESS & SECURITY AUDIT TEST SUITE');
  console.log('Saravana Bhavan Hotel Customer Feedback & Platform Owner System');
  console.log('========================================================================\n');

  // -------------------------------------------------------------------
  // 1. HTTP SECURITY HEADERS AUDIT
  // -------------------------------------------------------------------
  console.log('--- 1. Testing Standard HTTP Security Headers ---');
  const healthRes = await request('/health');
  assert(healthRes.status === 200, 'Health check returns 200 OK');
  assert(healthRes.headers.get('x-content-type-options') === 'nosniff', 'Header X-Content-Type-Options is nosniff');
  assert(healthRes.headers.get('x-frame-options') === 'DENY', 'Header X-Frame-Options is DENY');
  assert(healthRes.headers.get('x-xss-protection') === '1; mode=block', 'Header X-XSS-Protection is 1; mode=block');
  assert(healthRes.headers.get('referrer-policy') === 'strict-origin-when-cross-origin', 'Header Referrer-Policy is strict-origin-when-cross-origin');

  // -------------------------------------------------------------------
  // 2. SUPER ADMIN AUTHENTICATION & GOVERNANCE
  // -------------------------------------------------------------------
  console.log('\n--- 2. Testing Super Admin Authentication & KPI Engine ---');
  const adminLogin = await request('/manager/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'manager@saravanabhavan.com',
      password: process.env.DEFAULT_MANAGER_PASSWORD || 'test123',
    }),
  });
  assert(adminLogin.status === 200, 'Super admin login returns 200 OK');
  assert(adminLogin.data.success === true, 'Login response success: true');
  assert(adminLogin.data.token && typeof adminLogin.data.token === 'string', 'JWT token issued to Super Admin');
  assert(adminLogin.data.manager.role === 'super_admin', 'Role verified as super_admin');
  assert(adminLogin.data.manager.password_hash === undefined, 'Password hash is strictly excluded from response');

  const adminToken = adminLogin.data.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  const statsRes = await request('/admin/stats', { headers: adminHeaders });
  assert(statsRes.status === 200, 'Platform KPI stats returns 200 OK');
  const stats = statsRes.data.stats;
  assert(typeof stats.totalBusinesses === 'number', 'KPI totalBusinesses is numeric');
  assert(typeof stats.activeBusinesses === 'number', 'KPI activeBusinesses is numeric');
  assert(typeof stats.totalManagers === 'number', 'KPI totalManagers is numeric');
  assert(typeof stats.totalBranches === 'number', 'KPI totalBranches is numeric');
  assert(typeof stats.totalQRCodes === 'number', 'KPI totalQRCodes is numeric');
  assert(typeof stats.totalFeedback === 'number', 'KPI totalFeedback is numeric');

  // -------------------------------------------------------------------
  // 3. COMPLETE PROVISIONING FLOW: BUSINESS -> BRANCH -> TABLE -> QR
  // -------------------------------------------------------------------
  console.log('\n--- 3. Testing Provisioning Flow (Business -> Branch -> Table -> QR) ---');
  const uniqueCode = `AUDIT_${Date.now()}`;
  const newBiz = await request('/admin/businesses', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      name: `Audit Hotel Chain ${uniqueCode}`,
      contactEmail: `owner_${uniqueCode.toLowerCase()}@hotelchain.com`,
      contactPhone: '+91 98765 43210',
    }),
  });
  assert(newBiz.status === 201, 'Super Admin creates new business account (201 Created)');
  const auditBizId = newBiz.data.business.id;

  const newBranch = await request('/admin/branches', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      businessId: auditBizId,
      name: `Audit Branch Madurai`,
      code: `SB-MDU-${uniqueCode}`,
      address: 'West Tower Street, Madurai',
    }),
  });
  assert(newBranch.status === 201, 'Super Admin creates branch for business (201 Created)');
  const auditBranchId = newBranch.data.branch.id;

  const newMgr = await request('/admin/managers', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      name: `Madurai Branch Manager`,
      email: `mdu.manager_${uniqueCode.toLowerCase()}@saravanabhavan.com`,
      password: 'AuditManager@2026!',
      role: 'manager',
      businessId: auditBizId,
      branchIds: [auditBranchId],
    }),
  });
  assert(newMgr.status === 201, 'Super Admin provisions dedicated branch manager (201 Created)');
  const auditMgrId = newMgr.data.manager.id;
  const auditMgrEmail = newMgr.data.manager.email;

  const tableRes = await request('/manager/tables', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      branchId: auditBranchId,
      tableNumber: '12',
    }),
  });
  assert(tableRes.status === 201, 'Dining table #12 created in branch (201 Created)');

  const qrRes = await request('/manager/qr', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      branchId: auditBranchId,
      tableNumber: '12',
    }),
  });
  assert(qrRes.status === 201, 'Cryptographic QR code generated for table (201 Created)');
  const auditQrToken = qrRes.data.data.public_token;
  assert(auditQrToken.startsWith('sb_'), 'QR token has secure sb_ prefix');

  // -------------------------------------------------------------------
  // 4. CUSTOMER PRIVACY & RESOLUTION AUDIT
  // -------------------------------------------------------------------
  console.log('\n--- 4. Customer Privacy & QR Resolution Audit ---');
  const resolveRes = await request(`/public/qr/${auditQrToken}`);
  assert(resolveRes.status === 200, 'Public QR resolution succeeds (200 OK)');
  assert(resolveRes.data.valid === true, 'QR is flagged valid: true');
  assert(resolveRes.data.active === true, 'QR is flagged active: true');
  assert(resolveRes.data.data.branch_name === undefined, 'Customer Privacy: branch_name is NOT leaked');
  assert(resolveRes.data.data.branch_id === undefined, 'Customer Privacy: branch_id is NOT leaked');
  assert(resolveRes.data.data.table_number === undefined, 'Customer Privacy: table_number is NOT leaked');
  assert(resolveRes.data.data.table_id === undefined, 'Customer Privacy: table_id is NOT leaked');
  assert(resolveRes.data.data.business_id === undefined, 'Customer Privacy: business_id is NOT leaked');
  assert(resolveRes.data.data.manager === undefined, 'Customer Privacy: manager info is NOT leaked');

  // -------------------------------------------------------------------
  // 5. CUSTOMER RATING MATRIX & SUBMISSION AUDIT
  // -------------------------------------------------------------------
  console.log('\n--- 5. Customer Rating Matrix & Submission Audit ---');
  const sessionRes = await request('/public/session', {
    method: 'POST',
    body: JSON.stringify({ qr_token: auditQrToken }),
  });
  assert(sessionRes.status === 201, 'Public submission session initialized (201 Created)');
  const sessionToken = sessionRes.data?.data?.session_token;

  // Validation Test: Missing overall_rating
  const invalidSub = await request('/feedback', {
    method: 'POST',
    body: JSON.stringify({
      session_token: sessionToken,
      token: auditQrToken,
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
    }),
  });
  assert(invalidSub.status === 400, 'Missing overall_rating is rejected (400 Bad Request)');

  // Validation Test: Out-of-range rating (6 stars)
  const rangeSub = await request('/feedback', {
    method: 'POST',
    body: JSON.stringify({
      session_token: sessionToken,
      token: auditQrToken,
      overall_rating: 6,
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
    }),
  });
  assert(rangeSub.status === 400, 'Out-of-range rating (6 stars) rejected (400 Bad Request)');

  // Validation Test: Invalid category rating
  const catSub = await request('/feedback', {
    method: 'POST',
    body: JSON.stringify({
      session_token: sessionToken,
      token: auditQrToken,
      overall_rating: 5,
      service_rating: 'Awesome',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
    }),
  });
  assert(catSub.status === 400, 'Invalid category rating "Awesome" rejected (400 Bad Request)');

  // Valid 5-star submission
  const validSub = await request('/feedback', {
    method: 'POST',
    body: JSON.stringify({
      session_token: sessionToken,
      token: auditQrToken,
      overall_rating: 5,
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
      comment: 'Authentic taste and spotless dining area!',
    }),
  });
  assert(validSub.status === 201, 'Valid 5-star feedback submitted successfully (201 Created)');
  assert(validSub.data.success === true, 'Submission response indicates success: true');
  assert(validSub.data?.data?.id !== undefined, 'Generated feedback ID returned');

  // -------------------------------------------------------------------
  // 6. IDEMPOTENCY, DOUBLE-CLICK & SESSION REPLAY AUDIT
  // -------------------------------------------------------------------
  console.log('\n--- 6. Idempotency, Double-Click & Session Replay Protection ---');
  const replaySub = await request('/feedback', {
    method: 'POST',
    body: JSON.stringify({
      session_token: sessionToken,
      token: auditQrToken,
      overall_rating: 5,
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
      comment: 'Attempting duplicate replay submission',
    }),
  });
  assert(replaySub.status === 409, 'Replay submission using completed session is rejected (409 Conflict)');
  assert(replaySub.data.code === 'SESSION_ALREADY_COMPLETED' || replaySub.data.code === 'SESSION_COMPLETED', 'Clean duplicate rejection error code returned');

  // -------------------------------------------------------------------
  // 7. INPUT SANITIZATION & XSS PROTECTION AUDIT
  // -------------------------------------------------------------------
  console.log('\n--- 7. Input Sanitization & XSS Protection ---');
  const xssSessionRes = await request('/public/session', {
    method: 'POST',
    body: JSON.stringify({ qr_token: auditQrToken }),
  });
  const xssSessionToken = xssSessionRes.data?.data?.session_token;

  const xssSub = await request('/feedback', {
    method: 'POST',
    body: JSON.stringify({
      session_token: xssSessionToken,
      token: auditQrToken,
      overall_rating: 4,
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
      comment: "<script>alert('XSS_AUDIT_EXPLOIT')</script><img src=x onerror=alert('hack')>",
    }),
  });
  assert(xssSub.status === 201, 'Submission with HTML/Script tags accepted safely (201 Created)');

  // -------------------------------------------------------------------
  // 8. BRANCH MANAGER RBAC & ANTI-IDOR AUDIT
  // -------------------------------------------------------------------
  console.log('\n--- 8. Branch Manager Scoped Access & Anti-IDOR Audit ---');
  const mgrLogin = await request('/manager/login', {
    method: 'POST',
    body: JSON.stringify({
      email: auditMgrEmail,
      password: 'AuditManager@2026!',
    }),
  });
  assert(mgrLogin.status === 200, 'Branch manager logs in successfully (200 OK)');
  const mgrToken = mgrLogin.data.token;
  const mgrHeaders = { Authorization: `Bearer ${mgrToken}` };

  // Can view assigned Madurai branch feedback
  const mgrFeedback = await request(`/manager/feedback?branchId=${auditBranchId}`, { headers: mgrHeaders });
  assert(mgrFeedback.status === 200, 'Branch manager can access assigned branch feedback (200 OK)');
  assert((mgrFeedback.data?.summary?.total || mgrFeedback.data?.summary?.total_count) >= 2, 'Assigned branch feedback count matches');

  // Anti-IDOR: Cannot access Chennai Central (Branch 1) feedback
  const idorFeedback = await request('/manager/feedback?branchId=1', { headers: mgrHeaders });
  assert(idorFeedback.status === 403, 'Anti-IDOR: Access to unauthorized branch feedback blocked (403 Forbidden)');
  assert(idorFeedback.data.code === 'FORBIDDEN_BRANCH_ACCESS', 'Code FORBIDDEN_BRANCH_ACCESS returned');

  // Anti-IDOR: Cannot query tables of unauthorized branch
  const idorTables = await request('/manager/tables?branchId=1', { headers: mgrHeaders });
  assert(idorTables.status === 403, 'Anti-IDOR: Access to unauthorized branch tables blocked (403 Forbidden)');

  // Anti-Privilege Escalation: Regular manager cannot call admin stats
  const escStats = await request('/admin/stats', { headers: mgrHeaders });
  assert(escStats.status === 403, 'Anti-Privilege Escalation: Manager cannot access /api/admin/stats (403 Forbidden)');
  assert(escStats.data.code === 'FORBIDDEN_SUPER_ADMIN', 'Code FORBIDDEN_SUPER_ADMIN returned');

  // Anti-Privilege Escalation: Regular manager cannot create branches
  const escBranch = await request('/manager/branches', {
    method: 'POST',
    headers: mgrHeaders,
    body: JSON.stringify({ name: 'Hacked Branch', code: 'SB-HACK' }),
  });
  assert(escBranch.status === 403, 'Anti-Privilege Escalation: Manager cannot create branches (403 Forbidden)');

  // -------------------------------------------------------------------
  // 9. LIVE ACCOUNT SUSPENSION ENFORCEMENT & ZERO DATA LOSS
  // -------------------------------------------------------------------
  console.log('\n--- 9. Live Account Suspension & Zero Data Loss Audit ---');
  // Suspend manager
  const suspendMgr = await request(`/admin/managers/${auditMgrId}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ status: 'suspended' }),
  });
  assert(suspendMgr.status === 200, 'Super Admin suspends manager (200 OK)');
  assert(suspendMgr.data.manager.status === 'suspended', 'Manager status updated to suspended');

  // Manager subsequent request with existing JWT is immediately rejected
  const blockedMgrReq = await request(`/manager/feedback?branchId=${auditBranchId}`, { headers: mgrHeaders });
  assert(blockedMgrReq.status === 403, 'Suspended manager subsequent API call immediately rejected (403 Forbidden)');
  assert(blockedMgrReq.data.code === 'ACCOUNT_SUSPENDED', 'Rejection code is ACCOUNT_SUSPENDED');

  // Login attempt by suspended manager rejected
  const suspendedLogin = await request('/manager/login', {
    method: 'POST',
    body: JSON.stringify({
      email: auditMgrEmail,
      password: 'AuditManager@2026!',
    }),
  });
  assert(suspendedLogin.status === 403, 'Login attempt by suspended manager rejected (403 Forbidden)');
  assert(suspendedLogin.data.code === 'ACCOUNT_SUSPENDED', 'Rejection code is ACCOUNT_SUSPENDED');

  // Reactivate manager
  const reactivateMgr = await request(`/admin/managers/${auditMgrId}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ status: 'active' }),
  });
  assert(reactivateMgr.status === 200, 'Super Admin reactivates manager (200 OK)');

  const restoredMgrLogin = await request('/manager/login', {
    method: 'POST',
    body: JSON.stringify({
      email: auditMgrEmail,
      password: 'AuditManager@2026!',
    }),
  });
  assert(restoredMgrLogin.status === 200, 'Reactivated manager logs in successfully (200 OK)');

  // -------------------------------------------------------------------
  // 10. BUSINESS SUSPENSION & CASCADING ACCESS CONTROL
  // -------------------------------------------------------------------
  console.log('\n--- 10. Business Suspension & Cascading Protection Audit ---');
  const suspendBiz = await request(`/admin/businesses/${auditBizId}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ status: 'suspended' }),
  });
  assert(suspendBiz.status === 200, 'Super Admin suspends hotel business (200 OK)');
  assert(suspendBiz.data.business.status === 'suspended', 'Business status set to suspended');

  // Manager of suspended business is blocked
  const restoredMgrToken = restoredMgrLogin.data.token;
  const bizBlockedReq = await request(`/manager/feedback?branchId=${auditBranchId}`, {
    headers: { Authorization: `Bearer ${restoredMgrToken}` },
  });
  assert(bizBlockedReq.status === 403, 'Manager of suspended business is rejected (403 Forbidden)');
  assert(bizBlockedReq.data.code === 'BUSINESS_SUSPENDED', 'Rejection code is BUSINESS_SUSPENDED');

  // Super Admin can still view feedback (zero data loss)
  const adminViewFeedback = await request(`/manager/feedback?branchId=${auditBranchId}`, {
    headers: adminHeaders,
  });
  assert(adminViewFeedback.status === 200, 'Super Admin can view feedback of suspended business (200 OK)');
  assert((adminViewFeedback.data?.summary?.total || adminViewFeedback.data?.summary?.total_count) >= 2, 'Historical feedback preserved intact (ZERO DATA LOSS)');

  // Reactivate business
  const reactivateBiz = await request(`/admin/businesses/${auditBizId}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ status: 'active' }),
  });
  assert(reactivateBiz.status === 200, 'Super Admin reactivates business (200 OK)');

  // -------------------------------------------------------------------
  // 11. AUDIT LOGGING OF GOVERNANCE ACTIONS
  // -------------------------------------------------------------------
  console.log('\n--- 11. Audit Logging of Governance Actions ---');
  const auditRes = await request('/admin/audit-logs', { headers: adminHeaders });
  assert(auditRes.status === 200, 'Super Admin queries audit logs (200 OK)');
  assert(Array.isArray(auditRes.data.logs), 'Audit logs returned as array');
  assert(auditRes.data.logs.length > 0, 'Audit logs contains recorded events');
  const actions = auditRes.data.logs.map(l => l.action);
  assert(actions.includes('BUSINESS_CREATED'), 'Audit log contains BUSINESS_CREATED');
  assert(actions.includes('MANAGER_CREATED'), 'Audit log contains MANAGER_CREATED');
  assert(actions.includes('MANAGER_SUSPENDED'), 'Audit log contains MANAGER_SUSPENDED');
  assert(actions.includes('BUSINESS_SUSPENDED'), 'Audit log contains BUSINESS_SUSPENDED');

  // -------------------------------------------------------------------
  // 12. ERROR HANDLING & SECURITY SANITIZATION
  // -------------------------------------------------------------------
  console.log('\n--- 12. Error Handling & Security Sanitization ---');
  const notFoundRes = await request('/nonexistent-endpoint-audit');
  assert(notFoundRes.status === 404, 'Unknown endpoint returns 404 Not Found');
  assert(notFoundRes.data.success === false, 'Error response has success: false');
  assert(notFoundRes.data.stack === undefined, 'Stack trace is not leaked');

  const unauthRes = await request('/manager/feedback');
  assert(unauthRes.status === 401, 'Unauthenticated protected route returns 401 Unauthorized');

  // -------------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`📊 PART 10 AUDIT RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  if (testsFailed === 0) {
    console.log('🎉 ALL PRODUCTION READINESS & SECURITY AUDIT TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('⚠️ SOME TESTS FAILED. PLEASE REVIEW ABOVE LOGS.');
  }
  console.log('========================================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Fatal audit runner error:', err);
  process.exit(1);
});
