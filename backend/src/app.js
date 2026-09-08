import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import feedbackRoutes from './routes/feedbackRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

// Enable reverse proxy trust (for accurate client IP detection behind Render/Vercel/Cloudflare)
app.set('trust proxy', 1);

// 1. CORS Configuration for Frontend Connectivity & Production Security
const rawOrigins = process.env.CORS_ORIGIN || 'http://localhost:3000';
const allowedOrigins = rawOrigins.split(',').map(o => o.trim()).filter(Boolean);
const isProd = process.env.NODE_ENV === 'production';

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl, Postman, native mobile apps)
      if (!origin) return callback(null, true);

      // Check if origin is explicitly configured in CORS_ORIGIN
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // In local development, also allow localhost and private LAN IPs for multi-device testing
      if (!isProd && (origin.startsWith('http://localhost:') || origin.startsWith('http://10.') || origin.startsWith('http://192.168.'))) {
        return callback(null, true);
      }

      // Otherwise reject unauthorized origin in production
      callback(new Error('Blocked by CORS policy'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-manager-key'],
    credentials: true,
  })
);

// 2. Standard HTTP Security Headers (Zero extra dependencies)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// 3. Request Parsing with payload size limit (security against DoS)
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// 3. API Routes
app.use('/api', feedbackRoutes);

// 3.b Public QR Route Direct Access Fallback
// If a customer hits the backend server directly with /q/:token, redirect cleanly to frontend application
app.get(['/q/:token', '/feedback/q/:token'], (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  let publicAppUrl = process.env.PUBLIC_APP_URL;
  if (!publicAppUrl) {
    if (isProd) {
      const origins = (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean);
      const httpsOrigin = origins.find(o => o.startsWith('https://'));
      publicAppUrl = httpsOrigin || 'https://feedback.saravanabhavan.com';
    } else {
      publicAppUrl = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',')[0].trim() : 'http://localhost:3000';
    }
  }
  publicAppUrl = publicAppUrl.replace(/\/+$/, '');
  const { token } = req.params;
  return res.redirect(302, `${publicAppUrl}/q/${encodeURIComponent(token)}`);
});

// 3.c Root Health Check Route Alias
app.get('/health', (req, res) => {
  return res.redirect(307, '/api/health');
});

// Pretty-print all JSON responses with 2 spaces
app.set('json spaces', 2);

// 4. Root Welcome & Interactive API Dashboard
app.get('/', (req, res) => {
  // If client specifically requests JSON (like curl or API client)
  if (req.headers.accept && req.headers.accept.includes('application/json') && !req.headers.accept.includes('text/html')) {
    return res.status(200).json({
      service: 'Saravana Bhavan Hotel Feedback API',
      version: '1.0.0',
      status: 'online',
      port: process.env.PORT || 5000,
      endpoints: {
        submit_feedback: 'POST /api/feedback',
        health_check: 'GET /api/health',
        manager_login: 'POST /api/manager/login',
        manager_profile: 'GET /api/manager/me (Protected)',
        manager_feedback: 'GET /api/manager/feedback (Protected, Filtering, Search, Need Action)',
      },
    });
  }

  // Otherwise serve rich HTML dashboard
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Saravana Bhavan Feedback Engine API</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      background: #FDFBF7;
      color: #1C1917;
      line-height: 1.5;
      padding: 40px 20px;
    }
    .container {
      max-width: 780px;
      margin: 0 auto;
    }
    .header {
      background: white;
      border: 1px solid #E7E5E4;
      border-radius: 24px;
      padding: 36px;
      box-shadow: 0 10px 30px -10px rgba(0,0,0,0.05);
      text-align: center;
      position: relative;
      overflow: hidden;
      margin-bottom: 24px;
    }
    .header::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 6px;
      background: linear-gradient(90deg, #D97706, #B45309, #92400E);
    }
    .badge-status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      color: #065F46;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 9999px;
      margin-bottom: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      background: #10B981;
      border-radius: 50%;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.3);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.2); }
    }
    h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 28px;
      color: #78350F;
      margin-bottom: 6px;
    }
    .sub {
      color: #78716C;
      font-size: 14px;
    }
    .btn-main {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: linear-gradient(135deg, #D97706, #B45309);
      color: white;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      padding: 14px 28px;
      border-radius: 14px;
      margin-top: 18px;
      box-shadow: 0 8px 20px -4px rgba(180, 83, 9, 0.35);
      transition: all 0.2s ease;
      cursor: pointer;
      border: none;
    }
    .btn-main:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 24px -4px rgba(180, 83, 9, 0.45);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .card {
      background: white;
      border: 1px solid #E7E5E4;
      border-radius: 18px;
      padding: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.03);
    }
    .card-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #A8A29E;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .card-val {
      font-size: 16px;
      font-weight: 700;
      color: #292524;
    }
    .tester {
      background: white;
      border: 1px solid #E7E5E4;
      border-radius: 20px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.04);
    }
    .tester h2 {
      font-size: 17px;
      font-weight: 800;
      margin-bottom: 6px;
      color: #1C1917;
    }
    .tester p {
      font-size: 13px;
      color: #78716C;
      margin-bottom: 16px;
    }
    .btn-test {
      background: #059669;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }
    .btn-test:hover { background: #047857; }
    .response-box {
      margin-top: 14px;
      background: #1C1917;
      color: #34D399;
      font-family: monospace;
      font-size: 12px;
      padding: 14px;
      border-radius: 10px;
      white-space: pre-wrap;
      display: none;
      overflow-x: auto;
    }
    .endpoint-list {
      list-style: none;
      font-size: 13px;
      border-top: 1px solid #F5F5F4;
      padding-top: 14px;
      margin-top: 14px;
    }
    .endpoint-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #F5F5F4;
    }
    .method {
      display: inline-block;
      font-weight: 800;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .post { background: #E0E7FF; color: #3730A3; }
    .get { background: #D1FAE5; color: #065F46; }
    .url { font-family: monospace; font-weight: 600; color: #44403C; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge-status">
        <span class="pulse-dot"></span>
        Backend REST API Online & Active
      </div>
      <h1>Saravana Bhavan Hotel</h1>
      <p class="sub">Customer Feedback Engine & PostgreSQL Persistence Layer</p>
      
      <a href="http://localhost:3000/" class="btn-main" target="_blank">
        🌟 Open Customer Feedback Website (Port 3000) &rarr;
      </a>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-label">Server Status</div>
        <div class="card-val" style="color: #059669;">● Port 5000 Active</div>
      </div>
      <div class="card">
        <div class="card-label">Allowed Client</div>
        <div class="card-val">http://localhost:3000</div>
      </div>
      <div class="card">
        <div class="card-label">Database Layer</div>
        <div class="card-val">PostgreSQL Pool (Active)</div>
      </div>
    </div>

    <div class="tester">
      <h2>Interactive Live API Tester</h2>
      <p>Click below to send a live test feedback payload to <code style="background:#F5F5F4; padding:2px 6px; border-radius:4px;">POST /api/feedback</code> and view the real-time database response:</p>
      <button class="btn-test" onclick="sendTestFeedback()">⚡ Send Live Test Feedback</button>
      <a href="/api/health" target="_blank" style="margin-left: 10px; font-size: 13px; color: #D97706; font-weight: 600; text-decoration: none;">View JSON Health Check &rarr;</a>
      
      <div id="output" class="response-box"></div>

      <ul class="endpoint-list">
        <li class="endpoint-item">
          <div><span class="method post">POST</span> <span class="url">/api/feedback</span></div>
          <span style="color:#78716C; font-size:12px;">Customer submission</span>
        </li>
        <li class="endpoint-item">
          <div><span class="method get">GET</span> <span class="url">/api/health</span></div>
          <span style="color:#78716C; font-size:12px;">Diagnostics & DB check</span>
        </li>
        <li class="endpoint-item">
          <div><span class="method post">POST</span> <span class="url">/api/manager/login</span></div>
          <span style="color:#2563EB; font-size:11px; font-weight:700;">Manager Login (JWT)</span>
        </li>
        <li class="endpoint-item">
          <div><span class="method get">GET</span> <span class="url">/api/manager/feedback</span></div>
          <span style="color:#DC2626; font-size:11px; font-weight:700;">401 Protected (Manager Dashboard API)</span>
        </li>
      </ul>
    </div>
  </div>

  <script>
    async function sendTestFeedback() {
      const output = document.getElementById('output');
      output.style.display = 'block';
      output.style.color = '#FDE68A';
      output.textContent = 'Sending test payload to POST /api/feedback...';

      try {
        const res = await fetch('/api/feedback', {
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
            comment: 'Crispy ghee roast dosa and filter coffee were exceptional!'
          })
        });

        const data = await res.json();
        output.style.color = res.ok ? '#34D399' : '#F87171';
        output.textContent = 'HTTP ' + res.status + ' ' + (res.ok ? 'SUCCESS' : 'ERROR') + '\\n' + JSON.stringify(data, null, 2);
      } catch (err) {
        output.style.color = '#F87171';
        output.textContent = 'Network Error: ' + err.message;
      }
    }
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
});

// 5. 404 Handler
app.use(notFoundHandler);

// 6. Central Error Handler
app.use(errorHandler);

export default app;
