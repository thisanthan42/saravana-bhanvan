-- ====================================================================
-- Saravana Bhavan Hotel — Initial Production Seed Data
-- ====================================================================

-- 1. Seed Default Business
INSERT INTO businesses (id, name, status, created_at)
VALUES (1, 'Saravana Bhavan Hotel', 'active', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 2. Seed Physical Branches
INSERT INTO branches (id, business_id, name, code, address, active, created_at)
VALUES 
  (1, 1, 'Chennai Central', 'SB-CENTRAL', 'Poonamallee High Rd, Chennai', true, CURRENT_TIMESTAMP),
  (2, 1, 'Coimbatore Gandhipuram', 'SB-CBE', 'Cross Cut Rd, Gandhipuram, Coimbatore', true, CURRENT_TIMESTAMP),
  (3, 1, 'Bangalore Indiranagar', 'SB-BLR', '100ft Road, Indiranagar, Bangalore', true, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Dining Tables
INSERT INTO tables (id, branch_id, table_number, created_at)
VALUES 
  (1, 1, '14', CURRENT_TIMESTAMP),
  (2, 1, '1', CURRENT_TIMESTAMP),
  (3, 1, '2', CURRENT_TIMESTAMP),
  (4, 2, '1', CURRENT_TIMESTAMP),
  (5, 2, '2', CURRENT_TIMESTAMP),
  (6, 2, '3', CURRENT_TIMESTAMP),
  (7, 3, '1', CURRENT_TIMESTAMP),
  (8, 3, '2', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 4. Seed Cryptographic Table QR Codes
INSERT INTO qr_codes (id, table_id, public_token, active, scan_count, created_at)
VALUES
  (1, 1, 'sb_init_token_table14_2026', true, 0, CURRENT_TIMESTAMP),
  (2, 2, 'sb_tbl1_init2026', true, 0, CURRENT_TIMESTAMP),
  (3, 3, 'sb_tbl2_init2026', true, 0, CURRENT_TIMESTAMP),
  (4, 4, 'sb_cbe_tbl1_init2026', true, 0, CURRENT_TIMESTAMP),
  (5, 5, 'sb_cbe_tbl2_init2026', true, 0, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 5. Seed Initial Managers
INSERT INTO managers (id, name, email, password_hash, role, status, business_id, created_at)
VALUES
  (1, 'Saravana Bhavan General Manager', 'manager@saravanabhavan.com', 'scrypt$seedhash$superadmin', 'super_admin', 'active', 1, CURRENT_TIMESTAMP),
  (2, 'Coimbatore Branch Manager', 'coimbatore.manager@saravanabhavan.com', 'scrypt$seedhash$cbemanager', 'manager', 'active', 1, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 6. Seed Manager-to-Branch RBAC Junction Binding
INSERT INTO manager_branches (manager_id, branch_id)
VALUES (2, 2)
ON CONFLICT (manager_id, branch_id) DO NOTHING;
