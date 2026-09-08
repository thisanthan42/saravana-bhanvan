# Database Architecture & PostgreSQL Migrations

This directory contains database schemas, relational migrations, and database initialization scripts for the Hotel Customer Feedback SaaS platform.

## Relational Schema Hierarchy
1. `businesses` — Multi-tenant hotel enterprise entities
2. `branches` — Physical hotel branches per business
3. `tables` — Dining tables scoped per branch (composite unique: branch_id + table_number)
4. `qr_codes` — Cryptographic opaque tokens (`sb_<random>`) bound authoritatively to tables
5. `feedback` — Customer feedback submissions (1–5 overall stars, 6 category ratings, comments)
6. `feedback_sessions` — Ephemeral submission tokens enforcing atomic idempotency (anti-double-click)
7. `managers` — Manager accounts with bcrypt password hashes and roles (super_admin, manager)
8. `manager_branches` — RBAC junction table scoping managers to authorized branches
9. `audit_logs` — Immutable chronological log of governance actions

## Running Migrations
To run transactional non-destructive migrations against your PostgreSQL database:
```bash
npm run migrate --workspace=backend
```
or from within the backend directory:
```bash
npm run migrate
```
