# Saravana Bhavan Hotel Customer Feedback SaaS Platform

A production-ready, full-stack, enterprise Customer Feedback SaaS platform built for Saravana Bhavan Hotel.

Features an anonymous mobile-first dining feedback experience via table QR codes, scoped branch manager analytics dashboards, and a complete Platform Owner Super Admin control center.

---

## 🏗️ Master Project Architecture

```text
C:\hotel-feedback-saas/
│
├── frontend/                     # React 18 + Vite 6 Client Application
│   ├── public/                   # Static assets & SPA routing (_redirects)
│   ├── src/
│   │   ├── components/           # Reusable UI elements (Star rating, rating cards, modals)
│   │   ├── pages/                # Top-level screen views (Customer, Manager, Super Admin)
│   │   ├── routes/               # Client-side route constants & token extractors
│   │   ├── services/             # Typed API integration clients (feedback, manager, admin)
│   │   ├── data/                 # Hospitality questions configuration
│   │   ├── styles/               # Styling tokens & Tailwind directives (index.css)
│   │   ├── App.jsx               # Application router & layout controller
│   │   ├── main.jsx              # React DOM entrypoint
│   │   └── pages/index.js        # Page exports
│   ├── index.html                # HTML5 shell
│   ├── package.json              # Frontend dependencies
│   ├── tailwind.config.js        # Luxury hospitality styling tokens
│   ├── vercel.json               # Vercel SPA rewrite configuration
│   ├── vite.config.js            # Vite build & bundler configuration
│   ├── .env.example              # Frontend environment template
│   └── README.md                 # Frontend technical documentation
│
├── backend/                      # Node.js + Express 4 REST API
│   ├── src/
│   │   ├── config/               # PostgreSQL database pool & mock fallback
│   │   ├── controllers/          # Route controllers (feedback, auth, QR, admin)
│   │   ├── middleware/           # JWT auth, RBAC, rate limiting, error handling
│   │   ├── models/               # Data access models (PostgreSQL queries)
│   │   ├── routes/               # Express route definitions
│   │   ├── services/             # Scrypt hashing, JWT issuance & verification
│   │   └── app.js                # Express app assembly & CORS security
│   ├── database/                 # Dedicated Database Schemas & Migrations Layer
│   │   ├── schema/               # Baseline SQL definitions (schema.sql, managersSchema.sql)
│   │   ├── migrations/           # Versioned SQL migrations (001_initial, 002_rbac)
│   │   ├── seeds/                # Seed data SQL (001_initial_seeds.sql)
│   │   ├── migrate.js            # Transactional migration & seed runner
│   │   └── README.md             # Database architecture & indexing guide
│   ├── tests/                    # 11 Automated backend test suites (390+ checks)
│   ├── scripts/                  # Test execution aliases
│   ├── server.js                 # Server entrypoint & port listener
│   ├── Procfile                  # Process definition for PaaS
│   ├── render.yaml               # Render Blueprint cloud deployment manifest
│   ├── package.json              # Backend dependencies & test scripts
│   ├── .env.example              # Backend environment template
│   └── README.md                 # Backend documentation
│
├── shared/                       # Shared domain models & constants
│   ├── constants/                # User roles, feedback categories, API endpoints
│   └── types/                    # Standard API response contracts
│
├── deployment/                   # Cloud hosting configurations & guides
│   ├── render/                   # Render backend blueprint & Procfile
│   ├── vercel/                   # Vercel frontend rewrite configuration
│   ├── environment/              # Unified sanitized .env templates
│   └── documentation/            # Pre-flight deployment checklist & rollout guide
│
├── docs/                         # Engineering documentation
│   ├── architecture/             # Architecture overview & component breakdown
│   ├── api/                      # OpenAPI-style REST API specifications
│   ├── database/                 # Entity relationships & schema reference
│   └── deployment/               # Cloud hosting infrastructure guide
│
├── scripts/                      # Developer workflow scripts
│   ├── development/              # 1-Click launcher (start-both.bat)
│   ├── testing/                  # Batch test verification scripts
│   └── deployment/               # Deployment health check scripts
│
├── .gitignore                    # Global Git ignore rules (zero secrets committed)
├── .env.example                  # Monorepo sanitized environment template
├── package.json                  # Monorepo root package & workspace scripts
├── README.md                     # Master project documentation
└── start-both.bat                # 1-Click launcher for both backend & frontend
```

---

## 🚀 Quick Start

### 1-Click Launch (Windows)
Double-click `start-both.bat` or run in PowerShell:
```powershell
.\start-both.bat
```

### Manual Launch
```powershell
# Root Monorepo Commands:
npm run dev:backend       # Starts backend API on port 5000
npm run dev:frontend      # Starts frontend client on port 3000

# Or navigate directly:
cd backend && node server.js
cd frontend && npm run dev
```

---

## 🌐 Application Access Points

| Portal | URL | Demo Credentials |
| :--- | :--- | :--- |
| **Customer Feedback** | `http://localhost:3000` | Direct or scan table QR code |
| **Active Table QR Session** | `http://localhost:3000/q/T1-SB-CENTRAL` | Table 1 - Chennai Central |
| **Manager Portal** | `http://localhost:3000/manager/login` | `manager@saravanabhavan.com` / `test123` |
| **Branch Manager (Coimbatore)** | `http://localhost:3000/manager/login` | `coimbatore.manager@saravanabhavan.com` / `Coimbatore@2026!` |
| **Super Admin Control Center** | `http://localhost:3000/admin` | Requires Super Admin manager login |
| **Backend API Root** | `http://localhost:5000/api` | Public health & discovery directory |

---

## 🧪 Automated Verification & Testing

```powershell
# Run all automated integration suites:
npm run test

# Run database migrations:
npm run migrate

# Run production frontend build:
npm run build
```
