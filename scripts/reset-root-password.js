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

const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const sql = require('mssql');

// ──────────────────────────────────────────────
// 1. Parse argument CLI
// ──────────────────────────────────────────────
const args = process.argv.slice(2);
const envFlagIndex = args.indexOf('--env');
const newPassword = args.find((a, i) => !a.startsWith('--') && i !== envFlagIndex + 1 && (envFlagIndex === -1 || i !== envFlagIndex));
const envPath = envFlagIndex >= 0 && args[envFlagIndex + 1]
  ? path.resolve(args[envFlagIndex + 1])
  : path.resolve(__dirname, '..', '.env.local');

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
// 3. Helper: hash password (sama dengan auth.ts)
// ──────────────────────────────────────────────
function hashPassword(inputPassword) {
  const hash = crypto.createHash('sha256').update(inputPassword, 'utf8').digest('hex');
  return `sha256:${hash}`;
}

// ──────────────────────────────────────────────
// 4. Main
// ──────────────────────────────────────────────
async function main() {
  if (!newPassword) {
    console.error('Usage: node scripts/reset-root-password.js <password-baru>');
    console.error('       node scripts/reset-root-password.js <password-baru> --env path/to/.env');
    process.exit(1);
  }

  if (!fs.existsSync(envPath)) {
    console.error(`File tidak ditemukan: ${envPath}`);
    process.exit(1);
  }

  const env = loadEnv(envPath);

  const config = {
    server: env.DB_SERVER || 'localhost',
    database: env.DB_DATABASE || 'TestDB',
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

  // Cari user ROOT aktif pertama
  const result = await pool.request().query(`
    SELECT TOP 1 user_id, user_dept, roles
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

  const user = result.recordset[0];
  const hashed = hashPassword(newPassword);

  await pool.request()
    .input('userId', sql.Int, user.user_id)
    .input('passwordHash', sql.NVarChar(sql.MAX), hashed)
    .query(`
      UPDATE users
      SET password_hash = @passwordHash,
          login_sessions = NULL,
          updated_at = SYSDATETIME()
      WHERE user_id = @userId
    `);

  console.log(`Password untuk ROOT user "${user.user_dept}" (ID: ${user.user_id}) berhasil direset.`);
  console.log('Semua sesi login user ini telah dihapus — wajib login ulang.');

  await pool.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
