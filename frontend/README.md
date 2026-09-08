# Saravana Bhavan Hotel — Customer Feedback & Enterprise Management Frontend

Modern, mobile-first React + Vite frontend application powering Saravana Bhavan Hotel's customer feedback experience, branch manager analytics dashboard, and Platform Owner Super Admin control panel.

---

## 📱 User Interfaces & Routing

1. **Customer QR Experience (`/q/:token`, `/feedback/q/:token`, or `/?token=<qr_token>`)**:
   - Clean canonical path URL: `https://your-domain.com/q/:token`
   - Welcome Splash Screen (warm hospitality branding, auto-transitions in 2s)
   - 5-Star overall rating selector + 6 categorical cards (`Good`, `Average`, `Bad`)
   - Optional customer comment input
   - Instant client & server duplicate submission guard (session idempotency)
   - Friendly unavailable error screen if QR is inactive or invalid
   - Thank You confirmation page with back-button locking
   - Zero exposure of internal IDs, branch names, table numbers, or managers

2. **Branch Manager Portal (`/manager/login`, `/manager/dashboard`, `/manager/qr`)**:
   - Secure JWT login with session persistence
   - Scoped branch selector (for managers with multiple assigned branches)
   - Real-time KPI summary cards (Total, 5★, 4★, 3★, 2★, 1★, Need Action)
   - Server-side filter tabs, date presets, keyword comment search, and pagination
   - Table & QR Code generation: 1024x1024 High-Resolution PNG & Lossless Vector SVG
   - Interactive LAN IP / Public Host override for testing on local Wi-Fi
   - Live suspension modal notification and automatic logout on account deactivation

3. **Super Admin Enterprise Control Panel (`/admin`, `/admin/login`, `/admin/dashboard`)**:
   - Platform Owner dark-theme enterprise portal
   - 8 Live platform KPI cards
   - Multi-tenant hotel business creation and instant suspension
   - Manager provisioning, branch assignment, password resets, and account suspension
   - Universal branch, table, and master QR code registry
   - Universal feedback stream across all hotels and branches
   - Administrative audit trail

---

## ⚙️ Environment Configuration

Create `.env` based on `.env.example`:
```ini
# Backend API base URL (Local development)
VITE_API_URL=http://localhost:5000
```

For production deployment (Vercel, Netlify, Cloudflare):
```ini
# Backend API base URL (Production HTTPS API)
VITE_API_URL=https://your-backend-api.onrender.com
```

---

## 🌐 SPA Routing & Hosting Configuration

Direct visits to `/q/:token` or refreshes must rewrite to `/index.html` to avoid 404 errors:
- **Vercel**: Handled automatically via [`vercel.json`](vercel.json) (`rewrites: [{ "source": "/(.*)", "destination": "/index.html" }]`).
- **Netlify & Cloudflare Pages**: Handled automatically via [`public/_redirects`](public/_redirects) (`/* /index.html 200`), which builds into `dist/_redirects`.

---

## 🛠️ Build & Development Commands

```bash
# Run local development server (Port 3000)
npm run dev

# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```
