import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

// Configure SSL if required by cloud providers (e.g. Neon, Supabase, Heroku, Render)
const isProduction = process.env.NODE_ENV === 'production';
const sslConfig = connectionString && (connectionString.includes('sslmode=require') || isProduction)
  ? { rejectUnauthorized: false }
  : false;

export const pool = new Pool({
  connectionString: connectionString || 'postgresql://postgres:postgres@localhost:5432/saravana_bhavan_db',
  ssl: sslConfig,
  max: 20, // Maximum pool connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

import { AuthService } from '../services/authService.js';

// In-memory fallback storage when PostgreSQL server is not locally running
const defaultSuperAdminHash = AuthService.hashPassword(process.env.DEFAULT_MANAGER_PASSWORD || 'test123');
const defaultCbeManagerHash = AuthService.hashPassword('Coimbatore@2026!');

const memoryFeedbackStore = [];
const memorySessionStore = [];
let memoryFeedbackAutoId = 1;
let memorySessionAutoId = 1;
let isPostgresAvailable = null;

// Multi-Branch and RBAC Stores
let memoryBusinessAutoId = 2;
let memoryBranchAutoId = 4;
let memoryTableAutoId = 9;
let memoryQRAutoId = 7;
let memoryManagerAutoId = 3;
let memoryManagerBranchAutoId = 2;
let memoryAuditLogAutoId = 2;

const memoryBusinessStore = [
  {
    id: 1,
    name: 'Saravana Bhavan Hotel',
    status: 'active',
    contact_email: 'support@saravanabhavan.com',
    contact_phone: '+91 44 2811 1234',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const memoryBranchStore = [
  {
    id: 1,
    business_id: 1,
    name: 'Chennai Central',
    code: 'SB-CENTRAL',
    address: 'Poonamallee High Rd, Chennai',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    business_id: 1,
    name: 'Coimbatore Gandhipuram',
    code: 'SB-CBE',
    address: 'Cross Cut Rd, Gandhipuram, Coimbatore',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    business_id: 1,
    name: 'Bangalore Indiranagar',
    code: 'SB-BLR',
    address: '100ft Road, Indiranagar, Bangalore',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const memoryTableStore = [
  // Branch 1: Chennai Central (14, 1, 2)
  { id: 1, branch_id: 1, table_number: '14', active: true, created_at: new Date().toISOString() },
  { id: 2, branch_id: 1, table_number: '1', active: true, created_at: new Date().toISOString() },
  { id: 3, branch_id: 1, table_number: '2', active: true, created_at: new Date().toISOString() },
  // Branch 2: Coimbatore Gandhipuram (1, 2, 3) - demonstrates independent table numbers!
  { id: 4, branch_id: 2, table_number: '1', active: true, created_at: new Date().toISOString() },
  { id: 5, branch_id: 2, table_number: '2', active: true, created_at: new Date().toISOString() },
  { id: 6, branch_id: 2, table_number: '3', active: true, created_at: new Date().toISOString() },
  // Branch 3: Bangalore Indiranagar (1, 2)
  { id: 7, branch_id: 3, table_number: '1', active: true, created_at: new Date().toISOString() },
  { id: 8, branch_id: 3, table_number: '2', active: true, created_at: new Date().toISOString() },
];

const memoryQRStore = [
  {
    id: 1,
    table_id: 1,
    public_token: 'sb_tbl14_init2026',
    active: true,
    scan_count: 0,
    last_scanned_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    table_id: 2,
    public_token: 'sb_tbl1_init2026',
    active: true,
    scan_count: 0,
    last_scanned_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    table_id: 3,
    public_token: 'sb_tbl2_init2026',
    active: true,
    scan_count: 0,
    last_scanned_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 4,
    table_id: 1,
    public_token: 'SB-QR-AUDIT-2026',
    active: true,
    scan_count: 0,
    last_scanned_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 5,
    table_id: 4, // Coimbatore Table 1
    public_token: 'sb_cbe_tbl1_init2026',
    active: true,
    scan_count: 0,
    last_scanned_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 6,
    table_id: 5, // Coimbatore Table 2
    public_token: 'sb_cbe_tbl2_init2026',
    active: true,
    scan_count: 0,
    last_scanned_at: null,
    created_at: new Date().toISOString(),
  },
];

const memoryManagerStore = [
  {
    id: 1,
    name: 'Saravana Bhavan General Manager',
    email: 'manager@saravanabhavan.com',
    password_hash: defaultSuperAdminHash,
    role: 'super_admin',
    status: 'active',
    business_id: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Coimbatore Branch Manager',
    email: 'coimbatore.manager@saravanabhavan.com',
    password_hash: defaultCbeManagerHash,
    role: 'manager',
    status: 'active',
    business_id: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const memoryManagerBranchStore = [
  { id: 1, manager_id: 2, branch_id: 2, created_at: new Date().toISOString() },
];

const memoryAuditLogStore = [
  {
    id: 1,
    user_id: 1,
    action: 'PLATFORM_BOOTSTRAP',
    entity_type: 'system',
    entity_id: 1,
    details: { message: 'Saravana Bhavan Super Admin Platform online' },
    created_at: new Date().toISOString(),
  },
];

/**
 * Check if the PostgreSQL database is reachable
 */
export async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() AS current_time');
    client.release();
    isPostgresAvailable = true;
    return {
      connected: true,
      time: result.rows[0].current_time,
      mode: 'PostgreSQL Pool',
    };
  } catch (error) {
    isPostgresAvailable = false;
    return {
      connected: false,
      error: error.message,
      mode: 'In-Memory Fallback (PostgreSQL not connected)',
    };
  }
}

/**
 * Execute a SQL query against PostgreSQL with automatic graceful fallback
 */
export async function query(text, params = []) {
  // If we already know Postgres is connected or haven't checked yet
  if (isPostgresAvailable !== false) {
    try {
      const start = Date.now();
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Database Query] executed in ${duration}ms: ${text.slice(0, 80)}...`);
      }
      isPostgresAvailable = true;
      return res;
    } catch (err) {
      // If connection refused, mark Postgres as unavailable and fallback gracefully
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message.includes('connect')) {
        console.warn(`[Database Warning] PostgreSQL connection refused. Using local fallback store for development.`);
        isPostgresAvailable = false;
      } else {
        // Query syntax or constraint error should throw
        throw err;
      }
    }
  }

  // Graceful in-memory fallback for local development without active PostgreSQL server
  const upperText = text.trim().toUpperCase();

  // 1. Manager Inserts
  if (upperText.includes('INSERT INTO MANAGERS')) {
    const newMgr = {
      id: memoryManagerAutoId++,
      name: params[0],
      email: params[1],
      password_hash: params[2],
      role: params[3] || 'manager',
      status: params[4] || 'active',
      business_id: params[5] ? Number(params[5]) : 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryManagerStore.push(newMgr);
    return { rows: [newMgr], rowCount: 1 };
  }

  // 2. Manager Selects
  if (upperText.includes('FROM MANAGERS')) {
    if (upperText.includes('LOWER(EMAIL)')) {
      const targetEmail = String(params[0] || '').toLowerCase();
      const found = memoryManagerStore.find(m => m.email.toLowerCase() === targetEmail);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }
    if (upperText.includes('WHERE ID =')) {
      const targetId = Number(params[0]);
      const found = memoryManagerStore.find(m => m.id === targetId);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }
    // Return all managers enriched with business name and assigned branches
    const enriched = memoryManagerStore.map(m => {
      const biz = memoryBusinessStore.find(b => b.id === (m.business_id || 1)) || { name: 'Saravana Bhavan Hotel' };
      const mbRows = memoryManagerBranchStore.filter(mb => mb.manager_id === m.id);
      const branches = mbRows.map(mb => {
        const br = memoryBranchStore.find(b => b.id === mb.branch_id);
        return br ? { id: br.id, name: br.name, code: br.code } : null;
      }).filter(Boolean);

      return {
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        status: m.status || 'active',
        business_id: m.business_id || 1,
        business_name: biz.name,
        assigned_branches: branches,
        created_at: m.created_at,
        updated_at: m.updated_at,
      };
    });
    return { rows: enriched, rowCount: enriched.length };
  }

  // 2.b Manager Updates (role, status, password)
  if (upperText.includes('UPDATE MANAGERS')) {
    if (upperText.includes('SET STATUS =')) {
      const newStatus = String(params[0]);
      const targetId = Number(params[1]);
      const found = memoryManagerStore.find(m => m.id === targetId);
      if (found) {
        found.status = newStatus;
        found.updated_at = new Date().toISOString();
        return { rows: [found], rowCount: 1 };
      }
    }
    if (upperText.includes('SET PASSWORD_HASH =')) {
      const newHash = String(params[0]);
      const targetId = Number(params[1]);
      const found = memoryManagerStore.find(m => m.id === targetId);
      if (found) {
        found.password_hash = newHash;
        found.updated_at = new Date().toISOString();
        return { rows: [found], rowCount: 1 };
      }
    }
    if (upperText.includes('SET ROLE =')) {
      const newRole = String(params[0]);
      const targetId = Number(params[1]);
      const found = memoryManagerStore.find(m => m.id === targetId);
      if (found) {
        found.role = newRole;
        found.updated_at = new Date().toISOString();
        return { rows: [found], rowCount: 1 };
      }
    }
    return { rows: [], rowCount: 0 };
  }

  // 2.c Delete Manager Branches (for reassignment)
  if (upperText.includes('DELETE FROM MANAGER_BRANCHES WHERE MANAGER_ID =')) {
    const targetMgrId = Number(params[0]);
    const initialLen = memoryManagerBranchStore.length;
    for (let i = memoryManagerBranchStore.length - 1; i >= 0; i--) {
      if (memoryManagerBranchStore[i].manager_id === targetMgrId) {
        memoryManagerBranchStore.splice(i, 1);
      }
    }
    return { rows: [], rowCount: initialLen - memoryManagerBranchStore.length };
  }

  // 2.d Business Management Queries
  if (upperText.includes('INSERT INTO BUSINESSES')) {
    const newBiz = {
      id: memoryBusinessAutoId++,
      name: String(params[0]),
      status: params[1] || 'active',
      contact_email: params[2] || null,
      contact_phone: params[3] || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryBusinessStore.push(newBiz);
    return { rows: [newBiz], rowCount: 1 };
  }

  if (upperText.includes('UPDATE BUSINESSES')) {
    if (upperText.includes('SET STATUS =')) {
      const newStatus = String(params[0]);
      const targetId = Number(params[1]);
      const found = memoryBusinessStore.find(b => b.id === targetId);
      if (found) {
        found.status = newStatus;
        found.updated_at = new Date().toISOString();
        return { rows: [found], rowCount: 1 };
      }
    }
    return { rows: [], rowCount: 0 };
  }

  if (upperText.includes('FROM BUSINESSES')) {
    if (upperText.includes('WHERE ID =')) {
      const targetId = Number(params[0]);
      const found = memoryBusinessStore.find(b => b.id === targetId);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }
    const enriched = memoryBusinessStore.map(biz => {
      const branches = memoryBranchStore.filter(b => b.business_id === biz.id);
      const managers = memoryManagerStore.filter(m => (m.business_id === biz.id || (!m.business_id && biz.id === 1)) && m.role !== 'super_admin');
      const branchIds = branches.map(b => b.id);
      const feedbackCount = memoryFeedbackStore.filter(f => branchIds.includes(Number(f.branch_id))).length;
      return {
        ...biz,
        branch_count: branches.length,
        manager_count: managers.length,
        feedback_count: feedbackCount,
      };
    });
    return { rows: enriched, rowCount: enriched.length };
  }

  // 2.e Audit Logs Queries
  if (upperText.includes('INSERT INTO AUDIT_LOGS')) {
    const newLog = {
      id: memoryAuditLogAutoId++,
      user_id: params[0] !== undefined ? Number(params[0]) : null,
      action: String(params[1]),
      entity_type: String(params[2]),
      entity_id: params[3] !== undefined ? Number(params[3]) : null,
      details: typeof params[4] === 'string' ? JSON.parse(params[4] || '{}') : (params[4] || {}),
      created_at: new Date().toISOString(),
    };
    memoryAuditLogStore.unshift(newLog);
    return { rows: [newLog], rowCount: 1 };
  }

  if (upperText.includes('FROM AUDIT_LOGS')) {
    const enriched = memoryAuditLogStore.map(log => {
      const mgr = memoryManagerStore.find(m => m.id === log.user_id);
      return {
        ...log,
        user_name: mgr ? mgr.name : 'System Admin',
        user_email: mgr ? mgr.email : 'system@saravanabhavan.com',
      };
    });
    return { rows: enriched, rowCount: enriched.length };
  }

  // 3. Feedback Sessions Inserts, Updates & Selects (Part 8)
  if (upperText.includes('INSERT INTO FEEDBACK_SESSIONS')) {
    const sessionToken = String(params[0]);
    if (memorySessionStore.some(s => s.session_token === sessionToken)) {
      const err = new Error('duplicate key value violates unique constraint "feedback_sessions_session_token_key"');
      err.code = '23505';
      throw err;
    }
    const newSession = {
      id: memorySessionAutoId++,
      session_token: sessionToken,
      qr_token: params[1] || null,
      status: params[2] || 'active',
      client_ip_hash: params[3] || null,
      feedback_id: null,
      created_at: new Date().toISOString(),
      completed_at: null,
    };
    memorySessionStore.push(newSession);
    return { rows: [newSession], rowCount: 1 };
  }

  if (upperText.includes('UPDATE FEEDBACK_SESSIONS')) {
    const token = String(params[0]);
    const feedbackId = params[1] !== undefined ? Number(params[1]) : null;
    const found = memorySessionStore.find(s => s.session_token === token);
    if (found && found.status === 'active') {
      found.status = 'completed';
      found.completed_at = new Date().toISOString();
      if (feedbackId) found.feedback_id = feedbackId;
      return { rows: [found], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  if (upperText.includes('FROM FEEDBACK_SESSIONS')) {
    if (upperText.includes('SESSION_TOKEN =')) {
      const token = String(params[0]);
      const found = memorySessionStore.find(s => s.session_token === token);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }
    return { rows: memorySessionStore, rowCount: memorySessionStore.length };
  }

  // 4. Feedback Inserts
  if (upperText.includes('INSERT INTO FEEDBACK (')) {
    const sessionToken = params[11] || null;
    if (sessionToken && memoryFeedbackStore.some(f => f.session_token === sessionToken)) {
      const err = new Error('duplicate key value violates unique constraint "feedback_session_token_key"');
      err.code = '23505';
      throw err;
    }
    const newRecord = {
      id: memoryFeedbackAutoId++,
      overall_rating: params[0],
      service_rating: params[1],
      cleanliness_rating: params[2],
      toilet_rating: params[3],
      parking_rating: params[4],
      food_rating: params[5],
      staff_behaviour_rating: params[6],
      comment: params[7] || null,
      branch_id: params[8] || null,
      table_id: params[9] || null,
      customer_session_token: params[10] || null,
      session_token: sessionToken,
      created_at: new Date().toISOString(),
    };
    memoryFeedbackStore.unshift(newRecord);
    return {
      rows: [newRecord],
      rowCount: 1,
    };
  }

  // 4. Feedback Selects (All / Metrics / Filters / Single Item by ID)
  if (upperText.includes('FROM FEEDBACK')) {
    if (upperText.includes('WHERE ID =')) {
      const targetId = Number(params[0]);
      const found = memoryFeedbackStore.find(f => Number(f.id) === targetId);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }
    return {
      rows: memoryFeedbackStore,
      rowCount: memoryFeedbackStore.length,
    };
  }

  // 5. Branches Selects, Inserts & Updates
  if (upperText.includes('INSERT INTO BRANCHES')) {
    const newBranch = {
      id: memoryBranchAutoId++,
      business_id: Number(params[0]) || 1,
      name: String(params[1]),
      code: String(params[2]).toUpperCase(),
      address: params[3] || null,
      active: params[4] !== undefined ? Boolean(params[4]) : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryBranchStore.push(newBranch);
    return { rows: [newBranch], rowCount: 1 };
  }

  if (upperText.includes('UPDATE BRANCHES')) {
    if (upperText.includes('SET ACTIVE =')) {
      const activeState = Boolean(params[0]);
      const targetId = Number(params[1]);
      const found = memoryBranchStore.find(b => Number(b.id) === targetId);
      if (found) {
        found.active = activeState;
        found.updated_at = new Date().toISOString();
        return { rows: [found], rowCount: 1 };
      }
    }
    if (upperText.includes('SET NAME =')) {
      const targetId = Number(params[3]);
      const found = memoryBranchStore.find(b => Number(b.id) === targetId);
      if (found) {
        found.name = String(params[0]);
        found.code = String(params[1]).toUpperCase();
        found.address = params[2] || null;
        found.updated_at = new Date().toISOString();
        return { rows: [found], rowCount: 1 };
      }
    }
    return { rows: [], rowCount: 0 };
  }

  if (upperText.includes('FROM BRANCHES')) {
    if (upperText.includes('CODE =')) {
      const targetCode = String(params[0] || '').toUpperCase();
      const found = memoryBranchStore.find(b => b.code === targetCode);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }
    if (upperText.includes('WHERE ID =')) {
      const targetId = Number(params[0]);
      const found = memoryBranchStore.find(b => Number(b.id) === targetId);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }
    if (upperText.includes('ACTIVE = TRUE')) {
      const actives = memoryBranchStore.filter(b => b.active);
      return { rows: actives, rowCount: actives.length };
    }
    const enriched = memoryBranchStore.map(br => {
      const biz = memoryBusinessStore.find(bz => bz.id === br.business_id) || { name: 'Saravana Bhavan Hotel' };
      const tables = memoryTableStore.filter(t => t.branch_id === br.id);
      const tableIds = tables.map(t => t.id);
      const qrs = memoryQRStore.filter(q => tableIds.includes(q.table_id));
      const feedbacks = memoryFeedbackStore.filter(f => Number(f.branch_id) === br.id);
      return {
        ...br,
        business_name: biz.name,
        table_count: tables.length,
        qr_count: qrs.length,
        feedback_count: feedbacks.length,
      };
    });
    return { rows: enriched, rowCount: enriched.length };
  }

  // 5.b Manager Branches Junction Table
  if (upperText.includes('INSERT INTO MANAGER_BRANCHES')) {
    const newMB = {
      id: memoryManagerBranchAutoId++,
      manager_id: Number(params[0]),
      branch_id: Number(params[1]),
      created_at: new Date().toISOString(),
    };
    memoryManagerBranchStore.push(newMB);
    return { rows: [newMB], rowCount: 1 };
  }

  if (upperText.includes('FROM MANAGER_BRANCHES')) {
    if (upperText.includes('JOIN BRANCHES')) {
      const mId = Number(params[0]);
      const matches = memoryManagerBranchStore.filter(mb => mb.manager_id === mId);
      const joined = matches
        .map(mb => {
          const br = memoryBranchStore.find(b => b.id === mb.branch_id);
          if (!br) return null;
          return {
            id: br.id,
            name: br.name,
            code: br.code,
            address: br.address,
            active: br.active,
            branch_id: br.id,
            branch_name: br.name,
            branch_code: br.code,
            manager_id: mb.manager_id,
          };
        })
        .filter(Boolean)
        .filter(b => b.active !== false);
      return { rows: joined, rowCount: joined.length };
    }

    if (params.length >= 2) {
      const mId = Number(params[0]);
      const bId = Number(params[1]);
      const found = memoryManagerBranchStore.find(mb => mb.manager_id === mId && mb.branch_id === bId);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    if (params.length === 1) {
      const mId = Number(params[0]);
      const matches = memoryManagerBranchStore.filter(mb => mb.manager_id === mId);
      return { rows: matches, rowCount: matches.length };
    }

    return { rows: memoryManagerBranchStore, rowCount: memoryManagerBranchStore.length };
  }

  // 6. Tables Selects / Inserts / Updates
  if (upperText.includes('INSERT INTO TABLES')) {
    const branchId = Number(params[0]);
    const tableNumber = String(params[1]).trim();
    // Unique table check per branch
    const exists = memoryTableStore.find(t => t.branch_id === branchId && String(t.table_number) === tableNumber);
    if (exists) {
      const err = new Error('duplicate key value violates unique constraint "uq_branch_table"');
      err.code = '23505';
      throw err;
    }
    const newTable = {
      id: memoryTableAutoId++,
      branch_id: branchId,
      table_number: tableNumber,
      active: params[2] !== undefined ? Boolean(params[2]) : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryTableStore.push(newTable);
    return { rows: [newTable], rowCount: 1 };
  }

  if (upperText.includes('UPDATE TABLES')) {
    if (upperText.includes('SET ACTIVE =')) {
      const activeState = Boolean(params[0]);
      const targetId = Number(params[1]);
      const found = memoryTableStore.find(t => Number(t.id) === targetId);
      if (found) {
        found.active = activeState;
        found.updated_at = new Date().toISOString();
        return { rows: [found], rowCount: 1 };
      }
    }
    return { rows: [], rowCount: 0 };
  }

  if (upperText.includes('FROM TABLES')) {
    if (upperText.includes('BRANCH_ID =') && upperText.includes('TABLE_NUMBER =')) {
      const bId = Number(params[0]);
      const tNum = String(params[1]);
      const found = memoryTableStore.find(t => t.branch_id === bId && String(t.table_number) === tNum);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }
    if (upperText.includes('BRANCH_ID =')) {
      const bId = Number(params[0]);
      const matches = memoryTableStore.filter(t => t.branch_id === bId);
      return { rows: matches, rowCount: matches.length };
    }
    if (upperText.includes('WHERE ID =')) {
      const targetId = Number(params[0]);
      const found = memoryTableStore.find(t => Number(t.id) === targetId);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }
    return { rows: memoryTableStore, rowCount: memoryTableStore.length };
  }

  // 7. QR Codes Inserts, Updates, and Selects
  if (upperText.includes('INSERT INTO QR_CODES')) {
    const newQR = {
      id: memoryQRAutoId++,
      table_id: Number(params[0]),
      public_token: String(params[1]),
      active: params[2] !== undefined ? Boolean(params[2]) : true,
      scan_count: 0,
      last_scanned_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryQRStore.unshift(newQR);
    return { rows: [newQR], rowCount: 1 };
  }

  if (upperText.includes('UPDATE QR_CODES')) {
    if (upperText.includes('SET ACTIVE =')) {
      const newActive = Boolean(params[0]);
      const targetId = Number(params[1]);
      const found = memoryQRStore.find(q => Number(q.id) === targetId);
      if (found) {
        found.active = newActive;
        found.updated_at = new Date().toISOString();
        return { rows: [found], rowCount: 1 };
      }
    }
    if (upperText.includes('SCAN_COUNT = SCAN_COUNT + 1')) {
      const targetToken = String(params[0]);
      const found = memoryQRStore.find(q => q.public_token === targetToken);
      if (found) {
        found.scan_count += 1;
        found.last_scanned_at = new Date().toISOString();
        return { rows: [found], rowCount: 1 };
      }
    }
    return { rows: [], rowCount: 0 };
  }

  // Joined QR query lookup (e.g. findByToken or list)
  if (upperText.includes('FROM QR_CODES')) {
    // Helper to join a QR item with its Table and Branch
    const enrichQR = (qr) => {
      const table = memoryTableStore.find(t => t.id === qr.table_id) || {};
      const branch = memoryBranchStore.find(b => b.id === table.branch_id) || {};
      const biz = memoryBusinessStore.find(bz => bz.id === branch.business_id) || { name: 'Saravana Bhavan Hotel' };
      return {
        ...qr,
        table_number: table.table_number || 'N/A',
        table_active: table.active !== false,
        branch_id: branch.id,
        branch_name: branch.name || 'Saravana Bhavan',
        branch_code: branch.code || 'SB-MAIN',
        business_name: biz.name || 'Saravana Bhavan Hotel',
      };
    };

    if (upperText.includes('PUBLIC_TOKEN =')) {
      const token = String(params[0]);
      const found = memoryQRStore.find(q => q.public_token === token);
      return { rows: found ? [enrichQR(found)] : [], rowCount: found ? 1 : 0 };
    }

    if (upperText.includes('WHERE QR.ID =') || upperText.includes('WHERE ID =')) {
      const targetId = Number(params[0]);
      const found = memoryQRStore.find(q => Number(q.id) === targetId);
      return { rows: found ? [enrichQR(found)] : [], rowCount: found ? 1 : 0 };
    }

    const allJoined = memoryQRStore.map(enrichQR);
    return { rows: allJoined, rowCount: allJoined.length };
  }

  return { rows: [], rowCount: 0 };
}
