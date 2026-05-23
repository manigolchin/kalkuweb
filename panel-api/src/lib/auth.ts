import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { nanoid } from 'nanoid';

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[FATAL] JWT_SECRET env not set in production. Refusing to start with an ephemeral secret.');
    process.exit(1);
  }
  console.warn('[WARN] JWT_SECRET env not set — using random per-process secret (sessions reset on restart). OK for dev only.');
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'DEV-ONLY-' + nanoid(32)
);

export const COOKIE_NAME = 'kalku_session';
export const COOKIE_MAX_AGE_DAYS = 30;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Pre-computed bcrypt hash of a random password. Used by the login route as
 *  a constant-time decoy when the email is unknown, so unknown-user latency
 *  matches valid-user-wrong-password latency. Prevents user-enumeration via
 *  response time. */
export const DUMMY_PASSWORD_HASH =
  '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.M.tZ/3FbDxhKfNmZ0w8GKqRLW2Ia';

export async function signToken(payload: { sub: string; email: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE_DAYS}d`)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<{ sub: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (typeof payload.sub === 'string' && typeof payload.email === 'string') {
      return { sub: payload.sub, email: payload.email };
    }
    return null;
  } catch {
    return null;
  }
}
