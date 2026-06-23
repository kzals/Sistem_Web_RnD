import { createHash, timingSafeEqual } from 'node:crypto';

function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function hashPassword(inputPassword: string): string {
  return `sha256:${sha256(String(inputPassword || ''))}`;
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function verifyPassword(inputPassword: string, storedPasswordHash: string): boolean {
  const stored = String(storedPasswordHash || '').trim();
  const input = String(inputPassword || '');
  if (!stored) return false;

  if (stored.toLowerCase().startsWith('sha256:')) {
    const hashedPart = stored.slice(7).trim().toLowerCase();
    return safeEqual(hashedPart, sha256(input));
  }

  // Support direct SHA256 hex string.
  if (/^[a-fA-F0-9]{64}$/.test(stored)) {
    return safeEqual(stored.toLowerCase(), sha256(input));
  }

  if (stored.startsWith('plain:')) {
    return safeEqual(stored.slice(6), input);
  }

  // Backward compatibility for existing plain-text values.
  return safeEqual(stored, input);
}
