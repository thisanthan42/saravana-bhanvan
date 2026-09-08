import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/database.js';
import { AuthService } from '../src/services/authService.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('---------------------------------------------------------');
  console.log('ðŸ”„ Saravana Bhavan Database Migration Runner');
  console.log('---------------------------------------------------------');

  const schemaPath = fs.existsSync(path.join(__dirname, 'schema', 'schema.sql')) ? path.join(__dirname, 'schema', 'schema.sql') : path.join(__dirname, 'schema.sql');
  
  if (!fs.existsSync(schemaPath)) {
    console.error(`âŒ Schema file not found at: ${schemaPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, 'utf-8');
  const client = await pool.connect().catch((err) => {
    console.error('âŒ Could not connect to PostgreSQL database.');
    console.error(`Reason: ${err.message}`);
    console.error('\nPlease verify your DATABASE_URL in .env before running migrations.');
    process.exit(1);
  });

  try {
    console.log('ðŸ“¦ Executing schema.sql migration transaction...');
    await client.query('BEGIN');
    await client.query(sql);

    // Backward-compatible column addition for feedback session_token
    await client.query('ALTER TABLE feedback ADD COLUMN IF NOT EXISTS session_token VARCHAR(64) UNIQUE;');

    // Seed default Super Admin manager account if not exists
    const defaultEmail = (process.env.DEFAULT_MANAGER_EMAIL || 'manager@saravanabhavan.com').toLowerCase();
    const defaultPassword = process.env.DEFAULT_MANAGER_PASSWORD || 'test123';
    const defaultName = process.env.DEFAULT_MANAGER_NAME || 'Saravana Bhavan General Manager';

    let superAdminId;
    const checkRes = await client.query('SELECT id FROM managers WHERE LOWER(email) = $1', [defaultEmail]);
    const hashed = AuthService.hashPassword(defaultPassword);
    if (checkRes.rows.length === 0) {
      const insMgr = await client.query(
        'INSERT INTO managers (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [defaultName, defaultEmail, hashed, 'super_admin']
      );
      superAdminId = insMgr.rows[0].id;
      console.log(`ðŸ‘¤ Initial Super Admin account seeded: ${defaultEmail}`);
    } else {
      superAdminId = checkRes.rows[0].id;
      await client.query("UPDATE managers SET role = 'super_admin', password_hash = $1 WHERE id = $2", [hashed, superAdminId]);
    }

    // Seed default business
    let bizRes = await client.query('SELECT id FROM businesses LIMIT 1');
    let bizId;
    if (bizRes.rows.length === 0) {
      const insBiz = await client.query(
        'INSERT INTO businesses (name) VALUES ($1) RETURNING id',
        ['Saravana Bhavan Hotel']
      );
      bizId = insBiz.rows[0].id;
      console.log('ðŸ¢ Initial business seeded: Saravana Bhavan Hotel');
    } else {
      bizId = bizRes.rows[0].id;
    }

    // Seed Multiple Branches (Part 9): Chennai Central, Coimbatore, Bangalore
    const branchesSeed = [
      { name: 'Chennai Central', code: 'SB-CENTRAL', address: 'Poonamallee High Rd, Chennai' },
      { name: 'Coimbatore Gandhipuram', code: 'SB-CBE', address: 'Cross Cut Rd, Gandhipuram, Coimbatore' },
      { name: 'Bangalore Indiranagar', code: 'SB-BLR', address: '100ft Road, Indiranagar, Bangalore' },
    ];

    const branchMap = {}; // code -> branchId
    for (const b of branchesSeed) {
      let bRes = await client.query('SELECT id FROM branches WHERE code = $1', [b.code]);
      if (bRes.rows.length === 0) {
        const insB = await client.query(
          'INSERT INTO branches (business_id, name, code, address, active) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [bizId, b.name, b.code, b.address, true]
        );
        branchMap[b.code] = insB.rows[0].id;
        console.log(`ðŸ“ Branch seeded: ${b.name} (${b.code})`);
      } else {
        branchMap[b.code] = bRes.rows[0].id;
      }
    }

    const chennaiBranchId = branchMap['SB-CENTRAL'];
    const cbeBranchId = branchMap['SB-CBE'];
    const blrBranchId = branchMap['SB-BLR'];

    // Seed Dedicated Branch Manager for Coimbatore
    const cbeEmail = 'coimbatore.manager@saravanabhavan.com';
    const cbePass = 'Coimbatore@2026!';
    const cbeCheck = await client.query('SELECT id FROM managers WHERE LOWER(email) = $1', [cbeEmail]);
    let cbeManagerId;
    if (cbeCheck.rows.length === 0) {
      const hashedCbe = AuthService.hashPassword(cbePass);
      const insCbe = await client.query(
        'INSERT INTO managers (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
        ['Coimbatore Branch Manager', cbeEmail, hashedCbe, 'manager']
      );
      cbeManagerId = insCbe.rows[0].id;
      console.log(`ðŸ‘¤ Coimbatore Branch Manager seeded: ${cbeEmail}`);
    } else {
      cbeManagerId = cbeCheck.rows[0].id;
    }

    // Assign Coimbatore Manager to Coimbatore Branch in manager_branches
    if (cbeManagerId && cbeBranchId) {
      const mbCheck = await client.query(
        'SELECT id FROM manager_branches WHERE manager_id = $1 AND branch_id = $2',
        [cbeManagerId, cbeBranchId]
      );
      if (mbCheck.rows.length === 0) {
        await client.query(
          'INSERT INTO manager_branches (manager_id, branch_id) VALUES ($1, $2)',
          [cbeManagerId, cbeBranchId]
        );
        console.log(`ðŸ”— Assigned ${cbeEmail} to branch ID ${cbeBranchId} (Coimbatore)`);
      }
    }

    // Seed tables per branch with independent table numbers
    const branchTablesSeed = [
      { branchId: chennaiBranchId, tables: ['14', '1', '2'] },
      { branchId: cbeBranchId, tables: ['1', '2', '3'] },
      { branchId: blrBranchId, tables: ['1', '2'] },
    ];

    for (const bt of branchTablesSeed) {
      for (const tNum of bt.tables) {
        let tRes = await client.query(
          'SELECT id FROM tables WHERE branch_id = $1 AND table_number = $2',
          [bt.branchId, tNum]
        );
        let tableId;
        if (tRes.rows.length === 0) {
          const insTable = await client.query(
            'INSERT INTO tables (branch_id, table_number, active) VALUES ($1, $2, $3) RETURNING id',
            [bt.branchId, tNum, true]
          );
          tableId = insTable.rows[0].id;
        } else {
          tableId = tRes.rows[0].id;
        }

        // Check if QR code exists for this table
        const qrRes = await client.query('SELECT id, public_token FROM qr_codes WHERE table_id = $1', [tableId]);
        if (qrRes.rows.length === 0) {
          const token = `sb_${bt.branchId === chennaiBranchId && tNum === '14' ? 'tbl14_init2026' : (Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12))}`;
          await client.query(
            'INSERT INTO qr_codes (table_id, public_token, active) VALUES ($1, $2, $3)',
            [tableId, token, true]
          );
          console.log(`ðŸ“± Seeded QR code for Branch ${bt.branchId} Table ${tNum} (token: ${token})`);
        }
      }
    }

    await client.query('COMMIT');

    console.log('âœ… Migration executed successfully!');
    console.log('âœ… Tables "feedback", "managers", "businesses", "branches", "tables", "qr_codes" verified.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('âŒ Migration failed and rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    console.log('---------------------------------------------------------');
  }
}

runMigration();

