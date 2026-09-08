# Database Schema & Entity Relationships

```text
businesses (1) ───< branches (N) ───< tables (N) ─── (1) qr_codes
                        │
                        └───< feedback (N)
                        │
                        └───< manager_branches (N) >─── (1) managers
```

## Tables
1. `businesses`: Multi-tenant organization records
2. `branches`: Individual hotel restaurant locations
3. `tables`: Dining tables within each branch
4. `qr_codes`: Cryptographic 24-character public tokens
5. `managers`: Branch managers & Super Admins (Scrypt hash)
6. `manager_branches`: Explicit branch assignment mapping
7. `feedback`: Customer ratings, category scores, and text
8. `feedback_sessions`: Idempotency keys preventing duplicates
9. `audit_logs`: Chronological administrative audit trail
