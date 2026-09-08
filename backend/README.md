# Saravana Bhavan Hotel — Customer Feedback & Enterprise Management Backend

Production-ready Express.js and PostgreSQL backend API platform for Saravana Bhavan Hotel's customer feedback system, multi-branch operations, and Super Admin Platform Owner control panel.

---

## 🏛️ Architecture Overview

The backend is built around a secure three-tier governance model:

1. **Public Customer Ingestion Layer (`/api/feedback`, `/api/public/*`)**:
   - Cryptographic QR token resolution (`GET /api/public/qr/:token`)
   - Unique submission session initialization (`POST /api/public/session`)
   - Server-side authoritative table & branch binding (zero customer manipulation)
   - Atomic idempotency & double-click protection (`409 Conflict: SESSION_ALREADY_COMPLETED`)
   - 100% customer privacy: zero exposure of internal IDs, branch IDs, table numbers, or managers

2. **Branch Manager Scoped Operations (`/api/manager/*`)**:
   - JWT authentication (`POST /api/manager/login`) with bcrypt password hashing
   - Scoped branch access & Anti-IDOR enforcement (`requireBranchAccess`)
   - Live account status checking (instant revocation with `403 ACCOUNT_SUSPENDED` / `403 BUSINESS_SUSPENDED`)
   - Server-side feedback filtering, Need Action automatic derivation, search, sorting & pagination
   - Table & QR management within authorized branches

3. **Super Admin / Platform Owner Control Panel (`/api/admin/*`)**:
   - Universal authority guarded by `requireSuperAdmin`
   - Platform KPI calculation (Businesses, Managers, Branches, Tables, QRs, Feedback)
   - Business & Hotel account management (`active` $\leftrightarrow$ `suspended`)
   - Manager provisioning, password resets, and branch reassignments
   - Anti-privilege escalation & self-suspension safeguards
   - Administrative audit log trail (`audit_logs`)

---

## 🗄️ Database Architecture

### PostgreSQL Tables
- `feedback`: Customer submissions with 1–5 stars and 6 category ratings (`Good`, `Average`, `Bad`).
- `managers`: Manager accounts with hashed passwords (`bcrypt`), roles (`super_admin`, `manager`), and status (`active`, `suspended`).
- `businesses`: Hotel enterprise entities with status (`active`, `suspended`).
- `branches`: Physical hotel locations belonging to a business.
- `tables`: Dining tables scoped per branch with unique constraint `(branch_id, table_number)`.
- `qr_codes`: Unpredictable tokens (`sb_<random>`) linking tables to public feedback URLs.
- `feedback_sessions`: Ephemeral submission sessions enforcing single-use per submission session.
- `manager_branches`: Junction table mapping managers to authorized branches (RBAC).
- `audit_logs`: Immutable chronological log of administrative governance actions.

### Non-Destructive Migrations
Run schema migration and initial seed:
```bash
npm run migrate
```
The migration runner (`src/database/migrate.js`) wraps all schema changes in a transaction with rollback protection and uses `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` to ensure existing customer feedback is never lost.

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env`:
```ini
# Server Port
PORT=5000

# Environment (development | production)
NODE_ENV=production

# PostgreSQL Connection String
DATABASE_URL=postgresql://user:password@host:5432/saravana_bhavan_db?sslmode=require

# Frontend Client URL allowed by CORS (comma-separated if multiple)
CORS_ORIGIN=https://feedback.saravanabhavan.com

# Public Frontend URL encoded into Table QR Codes
PUBLIC_APP_URL=https://feedback.saravanabhavan.com

# Manager JWT Secret (High-entropy random key)
JWT_SECRET=your_strong_random_jwt_secret_at_least_32_chars

# Default Initial Super Admin Credentials
DEFAULT_MANAGER_NAME=Saravana Bhavan General Manager
DEFAULT_MANAGER_EMAIL=manager@saravanabhavan.com
DEFAULT_MANAGER_PASSWORD=YourStrongSuperAdminPassword2026!
```

---

## 🧪 Automated Testing Suite

Run the full automated master test suite (all 10 suites, 390+ assertions):
```bash
npm run test-all
```

Individual test suites:
- `npm run test-api` - Core API validation & submission
- `npm run test-manager` - Manager JWT authentication
- `npm run test-part5` - Manager dashboard 24-check verification
- `npm run test-part6` - Full integration & contract audit
- `npm run test-part7` - Cryptographic QR code system
- `npm run test-part8` - Abuse, idempotency & duplicate protection
- `npm run test-part9` - Multi-branch RBAC & anti-IDOR
- `npm run test-part10` - Super admin platform control panel
- `npm run test-audit` - Part 10 final production readiness & security audit
- `npm run test-qr` - Suite 10: Critical QR Flow End-to-End Hardening
