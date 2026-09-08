/**
 * Master Test Suite Runner for Saravana Bhavan Customer Feedback Platform
 * 
 * Runs all 9 comprehensive test suites sequentially:
 * 1. test-api.js (Core Feedback Ingestion & Validation)
 * 2. test-manager-api.js (Manager JWT Authentication & Profile)
 * 3. test-part5-complete.js (Manager Feedback Dashboard & 24 Checks)
 * 4. test-part6-audit.js (Complete Integration & Contract Verification)
 * 5. test-part7-qr.js (Cryptographic QR Resolution & Table Binding)
 * 6. test-part8-abuse.js (Idempotency, Anti-Replay, Session & XSS Protection)
 * 7. test-part9-multibranch.js (Multi-Branch Scoping, RBAC & Anti-IDOR)
 * 8. test-part10-superadmin.js (Super Admin Control Panel & Suspension Engine)
 * 9. test-part10-audit.js (Production Readiness, HTTP Security Headers & End-to-End Audit)
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const suites = [
  { name: 'Suite 1: Core API & Validation', file: 'test-api.js' },
  { name: 'Suite 2: Manager Authentication & JWT', file: 'test-manager-api.js' },
  { name: 'Suite 3: Manager Dashboard 24-Check Verification', file: 'test-part5-complete.js' },
  { name: 'Suite 4: Integration & Contract Audit', file: 'test-part6-audit.js' },
  { name: 'Suite 5: Cryptographic QR Code System', file: 'test-part7-qr.js' },
  { name: 'Suite 6: Abuse, Idempotency & Duplicate Protection', file: 'test-part8-abuse.js' },
  { name: 'Suite 7: Multi-Branch & Anti-IDOR RBAC', file: 'test-part9-multibranch.js' },
  { name: 'Suite 8: Super Admin Platform Control Panel', file: 'test-part10-superadmin.js' },
  { name: 'Suite 9: Part 10 Production Readiness & Security Audit', file: 'test-part10-audit.js' },
  { name: 'Suite 10: Critical QR Flow End-to-End Hardening', file: 'test-e2e-qr-hardening.js' },
];

function runScript(filePath) {
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, [filePath], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
      env: process.env,
    });

    proc.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

async function runAll() {
  console.log('========================================================================');
  console.log('👑 SARAVANA BHAVAN HOTEL: MASTER END-TO-END VERIFICATION RUNNER');
  console.log('Running 9 comprehensive automated test suites...');
  console.log('========================================================================\n');

  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < suites.length; i++) {
    const suite = suites[i];
    console.log(`\n▶️  [${i + 1}/${suites.length}] Executing: ${suite.name} (${suite.file})...`);
    const fullPath = path.join(__dirname, suite.file);
    const success = await runScript(fullPath);
    results.push({ ...suite, success });
    if (!success) {
      console.error(`❌ Suite failed: ${suite.name}`);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  const totalPassed = results.filter(r => r.success).length;
  const totalFailed = results.filter(r => !r.success).length;

  console.log('\n========================================================================');
  console.log('📊 MASTER TEST SUITE EXECUTION SUMMARY');
  console.log('========================================================================');
  results.forEach((r, idx) => {
    const mark = r.success ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${mark} - Suite ${idx + 1}: ${r.name}`);
  });

  console.log('------------------------------------------------------------------------');
  console.log(`Total Suites: ${suites.length} | Passed: ${totalPassed} | Failed: ${totalFailed} | Time: ${durationSec}s`);
  if (totalFailed === 0) {
    console.log('🎉 100% OF ALL TEST SUITES PASSED! SYSTEM IS VERIFIED PRODUCTION-READY.');
  } else {
    console.error(`⚠️ ${totalFailed} SUITE(S) FAILED.`);
  }
  console.log('========================================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('Fatal master test runner error:', err);
  process.exit(1);
});
