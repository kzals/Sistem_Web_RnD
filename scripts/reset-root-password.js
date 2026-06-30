/**
 * CLI: Reset password user ROOT langsung di database.
 *
 * Usage:
 *   node scripts/reset-root-password.js <password-baru>
 *   node scripts/reset-root-password.js <password-baru> --env path/to/.env
 *
 * Prasyarat:
 *   - Akses ke file system server (file .env lokal / database config)
 *   - Library mssql sudah terinstall (ada di package.json)
 */

const path = require('node:path');
const fs = require('node:fs');
const readline = require('node:readline');
const sql = require('mssql');
const { hashPassword } = require('./lib/hash-password');

// ──────────────────────────────────────────────
// 1. Parse argument CLI
// ──────────────────────────────────────────────
const args = process.argv.slice(2);
const envFlagIndex = args.indexOf('--env');
const newPassword = args.filter((a) => !a.startsWith('--') && (envFlagIndex === -1 || (a !== args[envFlagIndex] && a !== args[envFlagIndex + 1]))).pop();
const envPath = envFlagIndex >= 0 && args[envFlagIndex + 1]
  ? path.resolve(args[envFlagIndex + 1])
  : path.resolve(__dirname, '..', '.env.local');

// ──────────────────────────────────────────────
// Helper: konfirmasi via stdin
// ──────────────────────────────────────────────
function askConfirmation(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ──────────────────────────────────────────────
// 2. Helper: load file .env
// ──────────────────────────────────────────────
function loadEnv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

// ──────────────────────────────────────────────
// 3. Main
// ──────────────────────────────────────────────
async function main() {
  if (!newPassword) {
    console.error('Usage: node scripts/reset-root-password.js <password-baru>');
    console.error('       node scripts/reset-root-password.js <password-baru> --env path/to/.env');
    process.exit(1);
  }

  // Fix 2: Validasi panjang password
  if (newPassword.length < 6) {
    console.error('Password minimal 6 karakter');
    process.exit(1);
  }

  if (!fs.existsSync(envPath)) {
    console.error(`File tidak ditemukan: ${envPath}`);
    process.exit(1);
  }

  const env = loadEnv(envPath);

  const config = {
    server: env.DB_SERVER || 'localhost',
    database: env.DB_DATABASE,
    user: env.DB_USER || 'sa',
    password: env.DB_PASSWORD || '',
    port: parseInt(env.DB_PORT || '1433', 10),
    connectionTimeout: 15000,
    options: {
      encrypt: env.DB_ENCRYPT === 'true',
      trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    },
  };

  console.log(`Connecting to ${config.server}...`);

  let pool;
  try {
    pool = await sql.connect(config);
  } catch (err) {
    console.error('Gagal koneksi ke database:', err.message);
    process.exit(1);
  }

  // Fix 4: Cek apakah tabel users ada
  const tableCheck = await pool.request().query(`
    SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'users'
  `);
  if (Number(tableCheck.recordset[0]?.cnt || 0) === 0) {
    console.error('Tabel "users" tidak ditemukan di database. Pastikan aplikasi sudah pernah dijalankan.');
    await pool.close();
    process.exit(1);
  }

  // Cari user ROOT aktif
  const result = await pool.request().query(`
    SELECT user_id, user_dept, roles
    FROM users
    WHERE LOWER(LTRIM(RTRIM(ISNULL(roles, '')))) = 'root'
      AND ISNULL(is_active, 1) = 1
    ORDER BY user_id ASC
  `);

  if (result.recordset.length === 0) {
    console.error('Tidak ditemukan user ROOT aktif di database.');
    await pool.close();
    process.exit(1);
  }

  // Fix 3: Tampilkan semua user root dan minta konfirmasi
  console.log('');
  console.log('Ditemukan user ROOT aktif:');
  result.recordset.forEach((u, i) => {
    console.log(`  ${i + 1}. ID: ${u.user_id}  |  Dept: ${u.user_dept}  |  Role: ${u.roles}`);
  });
  console.log('');

  let targetUser;
  if (result.recordset.length === 1) {
    targetUser = result.recordset[0];
    console.log(`Password akan direset untuk: "${targetUser.user_dept}" (ID: ${targetUser.user_id})`);
    const confirm = await askConfirmation(`Password baru: "${newPassword}". Lanjutkan? (y/N) `);
    if (confirm !== 'y' && confirm !== 'yes') {
      console.log('Dibatalkan.');
      await pool.close();
      process.exit(0);
    }
  } else {
    const answer = await askConfirmation(`Ditemukan ${result.recordset.length} user ROOT. Reset password untuk SEMUA user? (y/N) `);
    if (answer !== 'y' && answer !== 'yes') {
      console.log('Dibatalkan.');
      await pool.close();
      process.exit(0);
    }
  }

  const hashed = hashPassword(newPassword);

  if (targetUser) {
    // Reset satu user
    await pool.request()
      .input('userId', sql.Int, targetUser.user_id)
      .input('passwordHash', sql.NVarChar(sql.MAX), hashed)
      .query(`
        UPDATE users
        SET password_hash = @passwordHash,
            login_sessions = NULL,
            updated_at = SYSDATETIME()
        WHERE user_id = @userId
      `);

    console.log(`Password untuk ROOT user "${targetUser.user_dept}" (ID: ${targetUser.user_id}) berhasil direset.`);

    // Fix 6: Audit trail
    writeAuditLog(`ROOT password direset: user_id=${targetUser.user_id}, dept=${targetUser.user_dept}`);
  } else {
    // Reset semua user root
    for (const u of result.recordset) {
      await pool.request()
        .input('userId', sql.Int, u.user_id)
        .input('passwordHash', sql.NVarChar(sql.MAX), hashed)
        .query(`
          UPDATE users
          SET password_hash = @passwordHash,
              login_sessions = NULL,
              updated_at = SYSDATETIME()
          WHERE user_id = @userId
        `);

      console.log(`Password untuk ROOT user "${u.user_dept}" (ID: ${u.user_id}) berhasil direset.`);
      writeAuditLog(`ROOT password direset: user_id=${u.user_id}, dept=${u.user_dept}`);
    }
  }

  console.log('Semua sesi login user ini telah dihapus — wajib login ulang.');

  await pool.close();
  process.exit(0);
}

// Fix 6: Audit trail
function writeAuditLog(message) {
  try {
    const logDir = path.resolve(__dirname, '..', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logLine = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(path.join(logDir, 'reset-password-audit.log'), logLine, 'utf8');
    console.log(`Audit trail: logs/reset-password-audit.log`);
  } catch (err) {
    console.warn('Gagal menulis audit trail:', err.message);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
