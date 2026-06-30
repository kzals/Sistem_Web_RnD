/**
 * Shared hash function — digunakan oleh:
 * - scripts/reset-root-password.js (CLI fallback)
 * - src/lib/password.ts       (login via Next.js)
 *
 * Jaga konsistensi agar format hash tetap sama di kedua environment.
 */
const crypto = require('node:crypto');

function sha256(input) {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

function hashPassword(inputPassword) {
  return `sha256:${sha256(String(inputPassword || ''))}`;
}

module.exports = { hashPassword };
