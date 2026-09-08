-- ====================================================================
-- Saravana Bhavan Hotel - Production Database Schema
-- Tables: feedback, managers
-- Database: PostgreSQL (v12+)
-- ====================================================================

-- 1. Create Feedback Table
CREATE TABLE IF NOT EXISTS feedback (
  id BIGSERIAL PRIMARY KEY,
  
  -- Section A: Overall 5-Star Experience Rating (1-5)
  overall_rating SMALLINT NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  
  -- Section B: 6 Specific Experience Ratings (Good / Average / Bad)
  service_rating VARCHAR(10) NOT NULL CHECK (service_rating IN ('Good', 'Average', 'Bad')),
  cleanliness_rating VARCHAR(10) NOT NULL CHECK (cleanliness_rating IN ('Good', 'Average', 'Bad')),
  toilet_rating VARCHAR(10) NOT NULL CHECK (toilet_rating IN ('Good', 'Average', 'Bad')),
  parking_rating VARCHAR(10) NOT NULL CHECK (parking_rating IN ('Good', 'Average', 'Bad')),
  food_rating VARCHAR(10) NOT NULL CHECK (food_rating IN ('Good', 'Average', 'Bad')),
  staff_behaviour_rating VARCHAR(10) NOT NULL CHECK (staff_behaviour_rating IN ('Good', 'Average', 'Bad')),
  
  -- Section C: Optional Customer Comment
  comment TEXT NULL,
  
  -- Future Architecture: Branch and Table Identification (Invisible to customer)
  branch_id VARCHAR(50) NULL,
  table_id VARCHAR(50) NULL,
  
  -- Session / Anti-spam tracking foundation
  customer_session_token VARCHAR(100) NULL,
  session_token VARCHAR(64) NULL UNIQUE,
  
  -- Audit Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Performance & Query Optimization Indexes for Feedback
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_overall_rating ON feedback (overall_rating);
CREATE INDEX IF NOT EXISTS idx_feedback_branch_id ON feedback (branch_id);
CREATE INDEX IF NOT EXISTS idx_feedback_table_id ON feedback (table_id);
CREATE INDEX IF NOT EXISTS idx_feedback_session_token ON feedback (session_token);

-- 2. Create Managers Table (Manager Authentication & Roles)
CREATE TABLE IF NOT EXISTS managers (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'manager',
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active' | 'suspended'
  business_id BIGINT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_managers_email ON managers (email);
CREATE INDEX IF NOT EXISTS idx_managers_status ON managers (status);

-- ====================================================================
-- 3. Multi-Branch & QR Code Infrastructure (Part 7)
-- ====================================================================

-- Businesses Table
CREATE TABLE IF NOT EXISTS businesses (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active' | 'suspended'
  contact_email VARCHAR(150) NULL,
  contact_phone VARCHAR(50) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses (status);

-- Branches Table
CREATE TABLE IF NOT EXISTS branches (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  address VARCHAR(255) NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_branches_business_id ON branches (business_id);

-- Tables (Dining Tables per Branch)
CREATE TABLE IF NOT EXISTS tables (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  table_number VARCHAR(50) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_branch_table UNIQUE (branch_id, table_number)
);

CREATE INDEX IF NOT EXISTS idx_tables_branch_id ON tables (branch_id);

-- QR Codes Table (Opaque Cryptographically Random Tokens)
CREATE TABLE IF NOT EXISTS qr_codes (
  id BIGSERIAL PRIMARY KEY,
  table_id BIGINT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  public_token VARCHAR(64) NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  scan_count INT NOT NULL DEFAULT 0,
  last_scanned_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_token ON qr_codes (public_token);
CREATE INDEX IF NOT EXISTS idx_qr_codes_table_id ON qr_codes (table_id);

-- ====================================================================
-- 4. Customer Feedback Sessions & Idempotency (Part 8)
-- ====================================================================
CREATE TABLE IF NOT EXISTS feedback_sessions (
  id BIGSERIAL PRIMARY KEY,
  session_token VARCHAR(64) NOT NULL UNIQUE,
  qr_token VARCHAR(64) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active' | 'completed'
  feedback_id BIGINT NULL REFERENCES feedback(id) ON DELETE SET NULL,
  client_ip_hash VARCHAR(64) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_sessions_token ON feedback_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_feedback_sessions_status ON feedback_sessions (status);

-- ====================================================================
-- 5. Manager-to-Branch Association & RBAC (Part 9)
-- ====================================================================
CREATE TABLE IF NOT EXISTS manager_branches (
  id BIGSERIAL PRIMARY KEY,
  manager_id BIGINT NOT NULL REFERENCES managers(id) ON DELETE CASCADE,
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_manager_branch UNIQUE (manager_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_manager_branches_mgr ON manager_branches (manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_branches_br ON manager_branches (branch_id);

-- ====================================================================
-- 6. Platform Administration & Audit Logs (Part 10)
-- ====================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NULL REFERENCES managers(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id BIGINT NULL,
  details JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
