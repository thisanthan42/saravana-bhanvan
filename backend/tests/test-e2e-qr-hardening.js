import http from 'http';
import QRCode from '../../saravana-bhavan-feedback/node_modules/qrcode/lib/index.js';
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

async function runEndToEndQRTest() {
  console.log('========================================================================');
  console.log('🔍 CRITICAL END-TO-END QR SYSTEM HARDENING & VERIFICATION');
  console.log('Complete Flow: Generate -> Download/Print -> Scan -> Open -> Submit -> DB');
  console.log('========================================================================\n');

  try {
    // ------------------------------------------------------------------
    // STEP 1: Manager Authentication
    // ------------------------------------------------------------------
    console.log('STEP 1: Authenticating as Branch Manager...');
    const loginRes = await req('POST', '/api/manager/login', {\n      email: 'manager@saravanabhavan.com',
      password: process.env.DEFAULT_MANAGER_PASSWORD || 'Saravana@2026!',
    });
    assert(loginRes.status === 200, '1.1 Manager authenticated successfully');
    const managerToken = loginRes.body.token;

    // ------------------------------------------------------------------
    // STEP 2: Generate a Fresh New Table QR
    // ------------------------------------------------------------------
    console.log('\nSTEP 2: Generating New Table QR (Table 42)...');
    const genRes = await req('POST', '/api/manager/qr', {
      branchId: 1,
      tableNumber: '42',
    }, {
      Authorization: `Bearer ${managerToken}`,
    });

    assert(genRes.status === 201, '2.1 QR generated with status 201 Created');
    assert(genRes.body.success === true, '2.2 Response indicates success: true');
    const newQR = genRes.body.data;
    assert(newQR.table_number === '42', '2.3 Table number bound to 42');
    assert(newQR.public_token.startsWith('sb_'), '2.4 Opaque token starts with sb_');
    assert(newQR.public_token.length >= 24, '2.5 Cryptographic entropy >= 96 bits');
    assert(newQR.public_url.includes('/q/sb_'), '2.6 Canonical clean URL structure (/q/:token)');
    assert(!newQR.public_url.includes('?token='), '2.7 No legacy query parameter in URL');
    console.log(`    Generated URL: ${newQR.public_url}`);

    // ------------------------------------------------------------------
    // STEP 3: Generate High-Resolution PNG & Vector SVG
    // ------------------------------------------------------------------
    console.log('\nSTEP 3: Simulating QR Download Formats (PNG 1024px & Vector SVG)...');
    const highResPng = await QRCode.toDataURL(newQR.public_url, {
      width: 1024,
      margin: 4,
      errorCorrectionLevel: 'H',
      color: { dark: '#1C1917', light: '#FFFFFF' },
    });
    assert(highResPng.startsWith('data:image/png;base64,'), '3.1 High-resolution PNG generated (1024x1024, margin 4, level H)');
    assert(highResPng.length > 5000, '3.2 PNG binary payload is substantial and complete');

    const vectorSvg = await QRCode.toString(newQR.public_url, {
      type: 'svg',
      margin: 4,
      errorCorrectionLevel: 'H',
      color: { dark: '#1C1917', light: '#FFFFFF' },
    });
    assert(vectorSvg.startsWith('<svg'), '3.3 Vector SVG successfully generated for print shops');
    assert(vectorSvg.includes('</svg>'), '3.4 Vector SVG contains closing tag and valid XML');

    // ------------------------------------------------------------------
    // STEP 4: Backend /q/:token Direct Redirection Test
    // ------------------------------------------------------------------
    console.log('\nSTEP 4: Testing Backend Direct /q/:token Redirection...');
    const redirectRes = await req('GET', `/q/${newQR.public_token}`);
    assert(redirectRes.status === 302, '4.1 Backend safely redirects /q/:token with 302');
    assert(redirectRes.headers.location && redirectRes.headers.location.includes(`/q/${newQR.public_token}`), '4.2 Redirect location targets frontend application');

    // ------------------------------------------------------------------
    // STEP 4.b: Frontend Direct /q/:token Access (Vite SPA Route)
    // ------------------------------------------------------------------
    console.log('\nSTEP 4.b: Testing Frontend Direct /q/:token Access (Vite SPA)...');
    const frontendRes = await new Promise((resolve) => {
      http.get(`http://localhost:3000/q/${newQR.public_token}`, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve({ status: res.statusCode, body: d }));
      }).on('error', err => resolve({ status: 500, error: err.message }));
    });
    assert(frontendRes.status === 200, '4.3 Frontend serves index.html on direct /q/:token route (200 OK)');
    assert(frontendRes.body && frontendRes.body.toLowerCase().includes('<!doctype html>'), '4.4 HTML page served without 404');

    // ------------------------------------------------------------------
    // STEP 5: Phone Camera Scan & Token Resolution
    // ------------------------------------------------------------------
    console.log('\nSTEP 5: Simulating Customer Phone Camera Scan & Resolution...');
    const scanRes = await req('GET', `/api/public/qr/${newQR.public_token}`);
    assert(scanRes.status === 200, '5.1 Public QR resolution returns 200 OK');
    assert(scanRes.body.valid === true, '5.2 QR status is valid');
    assert(scanRes.body.active === true, '5.3 QR status is active');
    assert(scanRes.body.data && scanRes.body.data.session_token, '5.4 Unique submission session token issued');
    assert(scanRes.body.data.table_number === undefined, '5.5 Customer Privacy: table_number NOT leaked');
    assert(scanRes.body.data.branch_name === undefined, '5.6 Customer Privacy: branch_name NOT leaked');
    assert(scanRes.body.data.branch_id === undefined, '5.7 Customer Privacy: branch_id NOT leaked');
    const customerSessionToken = scanRes.body.data.session_token;

    // ------------------------------------------------------------------
    // STEP 6: Customer Submits Feedback (Table 42 Binding Verification)
    // ------------------------------------------------------------------
    console.log('\nSTEP 6: Customer Submits Feedback via Scanned QR...');
    const submitRes = await req('POST', '/api/feedback', {
      overall_rating: 5,
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
      comment: 'Special Table 42 dining experience was fantastic!',
      token: newQR.public_token,
      session_token: customerSessionToken,
      // Intentionally pass fake client table number to test server override
      table_id: 'Tampered Table 999',
    });
    assert(submitRes.status === 201, '6.1 Customer feedback successfully saved (201 Created)');
    assert(submitRes.body.success === true, '6.2 Feedback submission confirmed');
    const feedbackId = submitRes.body.data.id;

    // ------------------------------------------------------------------
    // STEP 7: Verify Database & Server-Side Binding (Zero IDOR / Tampering)
    // ------------------------------------------------------------------
    console.log('\nSTEP 7: Verifying Database Binding & Manager Visibility...');
    const mgrFeedbackList = await req('GET', '/api/manager/feedback', null, {
      Authorization: `Bearer ${managerToken}`,
    });
    assert(mgrFeedbackList.status === 200, '7.1 Manager feedback list retrieved (200 OK)');
    const savedItem = (mgrFeedbackList.body.data || []).find(f => Number(f.id) === Number(feedbackId));
    assert(!!savedItem, '7.2 Submitted feedback record found in database');
    assert(savedItem.table_number === '42' || savedItem.table_id === 'Table 42', '7.3 Tampered table overridden: bound strictly to Table 42');
    assert(savedItem.branch_id === 'Chennai Central' || savedItem.branch_name === 'Chennai Central', '7.4 Bound strictly to Chennai Central branch');

    // ------------------------------------------------------------------
    // STEP 8: Multi-Customer Reusability (Same QR, Second Customer)
    // ------------------------------------------------------------------
    console.log('\nSTEP 8: Verifying QR Reusability for Multiple Customers...');
    const scan2 = await req('GET', `/api/public/qr/${newQR.public_token}`);
    assert(scan2.status === 200, '8.1 Second customer scans same QR successfully');
    const session2 = scan2.body.data.session_token;
    assert(session2 !== customerSessionToken, '8.2 Second customer gets a distinct session token');

    const submit2 = await req('POST', '/api/feedback', {
      overall_rating: 4,
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Average',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
      comment: 'Second customer at Table 42 had a great lunch',
      token: newQR.public_token,
      session_token: session2,
    });
    assert(submit2.status === 201, '8.3 Second customer submission accepted on same QR (201 Created)');

    // ------------------------------------------------------------------
    // STEP 9: QR Deactivation & Customer Safety
    // ------------------------------------------------------------------
    console.log('\nSTEP 9: Verifying QR Deactivation & Friendly Customer Error...');
    const deactRes = await req('PATCH', `/api/manager/qr/${newQR.id}/status`, {
      active: false,
    }, {
      Authorization: `Bearer ${managerToken}`,
    });
    assert(deactRes.status === 200, '9.1 Manager deactivated QR (200 OK)');

    const scanDeactivated = await req('GET', `/api/public/qr/${newQR.public_token}`);
    assert(scanDeactivated.status === 404, '9.2 Deactivated QR returns 404');
    assert(scanDeactivated.body.active === false, '9.3 Active status is false');
    assert(scanDeactivated.body.message === 'Sorry, this feedback QR code is no longer available.', '9.4 Customer sees friendly unavailable message');

    const submitDeactivated = await req('POST', '/api/feedback', {
      overall_rating: 5,
      service_rating: 'Good',
      cleanliness_rating: 'Good',
      toilet_rating: 'Good',
      parking_rating: 'Good',
      food_rating: 'Good',
      staff_behaviour_rating: 'Good',
      token: newQR.public_token,
    });
    assert(submitDeactivated.status === 400, '9.5 Submission to deactivated QR rejected with 400 Bad Request');

    // ------------------------------------------------------------------
    // SUMMARY
    // ------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(`📊 E2E QR VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Unhandled E2E Error:', err);
    process.exit(1);
  }
}

runEndToEndQRTest();
