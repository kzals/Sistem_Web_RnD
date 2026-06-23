/**
 * Auth utility menggunakan Web Crypto API.
 * Bekerja di Edge runtime (middleware) maupun Node.js (API routes).
 */

export const AUTH_DISABLED = false;
export const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'auth_session_rnd_v1';
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 jam
const SESSION_ISSUER = process.env.SESSION_ISSUER || 'ui_web_rnd';
export type AppRole = 'rnd' | 'requester' | 'root';
export const AUTH_BYPASS_SESSION = {
  userId: 1,
  dept: 'RND',
  role: 'rnd' as const,
  userKey: 'RND',
};

export interface SessionPayload {
  userId: number;
  dept: string;
  role: AppRole;
  userKey: string;
  exp: number;
  iss: string;
}

export function normalizeAppRole(value: unknown): AppRole | null {
  const key = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!key) return null;
  if (key === 'root') return 'root';
  if (key === 'rnd' || key === 'rd') return 'rnd';
  if (key === 'requester' || key === 'design' || key === 'tic' || key === 'marketing') return 'requester';
  return null;
}

export function canAccessRequester(role: AppRole | null | undefined): boolean {
  return role === 'requester' || role === 'root';
}

export function canAccessRnd(role: AppRole | null | undefined): boolean {
  return role === 'rnd' || role === 'root';
}

export function canManageUsers(role: AppRole | null | undefined): boolean {
  return role === 'root';
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function fromBase64Url(str: string): ArrayBuffer {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const chars = atob(base64);
  const bytes = new Uint8Array(chars.length);
  for (let i = 0; i < chars.length; i++) {
    bytes[i] = chars.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function createSessionToken(params: {
  userId: number;
  dept: string;
  role: AppRole;
  userKey?: string;
}): Promise<string> {
  const secret = process.env.SESSION_SECRET ?? 'fallback-secret';
  const payload: SessionPayload = {
    userId: params.userId,
    dept: params.dept,
    role: params.role,
    userKey: (params.userKey || params.dept).trim(),
    exp: Date.now() + SESSION_DURATION_MS,
    iss: SESSION_ISSUER,
  };
  const payloadB64 = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await getHmacKey(secret);
  const sigBytes = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64))
  );
  return `${payloadB64}.${toBase64Url(sigBytes)}`;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secret = process.env.SESSION_SECRET ?? 'fallback-secret';
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx === -1) return null;

    const payloadB64 = token.substring(0, dotIdx);
    const sigB64 = token.substring(dotIdx + 1);

    const key = await getHmacKey(secret);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64Url(sigB64),
      new TextEncoder().encode(payloadB64)
    );
    if (!valid) return null;

    const payload: SessionPayload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(payloadB64))
    );
    if (payload.iss !== SESSION_ISSUER) return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
