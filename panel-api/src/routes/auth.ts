import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { users } from '../schema.js';
import {
  COOKIE_MAX_AGE_DAYS,
  COOKIE_NAME,
  hashPassword,
  signToken,
  verifyPassword,
} from '../lib/auth.js';
import { requireAuth, type AuthVariables } from '../lib/middleware.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  current: z.string().min(1),
  next: z.string().min(8),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  companyName: z.string().optional(),
  companyLogoUrl: z.string().optional(),
});

export const authRoute = new Hono<{ Variables: AuthVariables }>()
  .post('/login', async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'invalid_input' }, 400);
    }
    const { email, password } = parsed.data;
    const user = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
    if (!user) {
      return c.json({ error: 'invalid_credentials' }, 401);
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return c.json({ error: 'invalid_credentials' }, 401);
    }
    const token = await signToken({ sub: user.id, email: user.email });
    const isProd = process.env.NODE_ENV === 'production';
    setCookie(c, COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'Lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE_DAYS * 24 * 60 * 60,
    });
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyName: user.companyName,
        companyLogoUrl: user.companyLogoUrl,
        mustChangePassword: user.mustChangePassword,
      },
    });
  })

  .post('/logout', async (c) => {
    deleteCookie(c, COOKIE_NAME, { path: '/' });
    return c.json({ ok: true });
  })

  .get('/me', requireAuth, async (c) => {
    const userId = c.get('userId');
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return c.json({ error: 'unauthorized' }, 401);
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyName: user.companyName,
        companyLogoUrl: user.companyLogoUrl,
        mustChangePassword: user.mustChangePassword,
      },
    });
  })

  .post('/change-password', requireAuth, async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'invalid_input', detail: parsed.error.issues }, 400);
    }
    const userId = c.get('userId');
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return c.json({ error: 'unauthorized' }, 401);
    const ok = await verifyPassword(parsed.data.current, user.passwordHash);
    if (!ok) return c.json({ error: 'invalid_current_password' }, 400);
    const newHash = await hashPassword(parsed.data.next);
    await db
      .update(users)
      .set({ passwordHash: newHash, mustChangePassword: false, updatedAt: new Date() })
      .where(eq(users.id, userId));
    return c.json({ ok: true });
  })

  .put('/profile', requireAuth, async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'invalid_input' }, 400);
    const userId = c.get('userId');
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.companyName !== undefined) patch.companyName = parsed.data.companyName;
    if (parsed.data.companyLogoUrl !== undefined) patch.companyLogoUrl = parsed.data.companyLogoUrl;
    await db.update(users).set(patch).where(eq(users.id, userId));
    const updated = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!updated) return c.json({ error: 'not_found' }, 404);
    return c.json({
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        companyName: updated.companyName,
        companyLogoUrl: updated.companyLogoUrl,
        mustChangePassword: updated.mustChangePassword,
      },
    });
  });
