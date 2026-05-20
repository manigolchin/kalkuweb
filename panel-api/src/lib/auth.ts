import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { nanoid } from 'nanoid';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'CHANGE-ME-IN-PROD-' + nanoid(32)
);

if (!process.env.JWT_SECRET) {
  console.warn('[WARN] JWT_SECRET env not set — using random per-process secret (sessions reset on restart)');
}

export const COOKIE_NAME = 'kalku_session';
export const COOKIE_MAX_AGE_DAYS = 30;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

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
