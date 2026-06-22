import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, ne, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import {
  users,
  projects,
  effectivePermissions,
  PANEL_PERMISSION_KEYS,
  type PanelPermissions,
  type User,
} from '../schema.js';
import { hashPassword } from '../lib/auth.js';
import { requireAuth, requireAdmin, type AuthVariables } from '../lib/middleware.js';

/** Initial password handed to the admin when none was typed. */
function generatePassword(): string {
  return 'kalku-' + nanoid(12);
}

/** Keep only known permission keys with boolean values — defends the DB
 *  against unknown/garbage keys arriving from the client. */
function sanitizePermissions(input: unknown): PanelPermissions {
  const out: PanelPermissions = {};
  if (input && typeof input === 'object') {
    for (const key of PANEL_PERMISSION_KEYS) {
      const v = (input as Record<string, unknown>)[key];
      if (typeof v === 'boolean') out[key] = v;
    }
  }
  return out;
}

/** Admin-facing projection: includes isActive + the raw assigned permission
 *  map (what the admin actually set) alongside the effective map (what the
 *  user gets after the admin-implies-all rule). Never leaks the hash. */
function serializeAdminUser(u: User, projectCount = 0) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    isActive: u.isActive,
    permissions: sanitizePermissions(u.permissions),
    effectivePermissions: effectivePermissions(u),
    companyName: u.companyName,
    companyPhone: u.companyPhone,
    companyContactEmail: u.companyContactEmail,
    mustChangePassword: u.mustChangePassword,
    projectCount,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}


const permissionsSchema = z.record(z.string(), z.boolean());

const createUserSchema = z.object({
  email: z.string().email().max(200),
  name: z.string().min(1).max(200),
  // Omitted → a password is generated and returned to the admin once.
  password: z.string().min(12).max(200).optional(),
  role: z.enum(['admin', 'user']).default('user'),
  permissions: permissionsSchema.optional(),
  companyName: z.string().max(200).optional(),
  companyPhone: z.string().max(64).optional(),
  companyContactEmail: z.string().max(200).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().max(200).optional(),
  role: z.enum(['admin', 'user']).optional(),
  permissions: permissionsSchema.optional(),
  isActive: z.boolean().optional(),
  companyName: z.string().max(200).optional(),
  companyPhone: z.string().max(64).optional(),
  companyContactEmail: z.string().max(200).optional(),
});

const resetPasswordSchema = z.object({
  // Omitted → a password is generated and returned once.
  password: z.string().min(12).max(200).optional(),
});

export const adminRoute = new Hono<{ Variables: AuthVariables }>()
  .use('/admin/*', requireAuth, requireAdmin)

  // ─── List all users ──────────────────────────────────────────────────
  .get('/admin/users', async (c) => {
    const all = await db.query.users.findMany();
    const counts = await db
      .select({ ownerId: projects.ownerId, n: sql<number>`count(*)` })
      .from(projects)
      .groupBy(projects.ownerId);
    const countMap = new Map(counts.map((r) => [r.ownerId, Number(r.n)]));
    const sorted = [...all].sort((a, b) => a.email.localeCompare(b.email));
    return c.json({
      users: sorted.map((u) => serializeAdminUser(u, countMap.get(u.id) ?? 0)),
      permissionKeys: PANEL_PERMISSION_KEYS,
    });
  })

  // ─── Create a user ───────────────────────────────────────────────────
  .post('/admin/users', async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'invalid_input', detail: parsed.error.issues }, 400);
    }
    const email = parsed.data.email.toLowerCase();
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existing) return c.json({ error: 'email_taken' }, 409);

    const generated = parsed.data.password === undefined;
    const password = parsed.data.password ?? generatePassword();
    const now = new Date();
    const id = nanoid(16);
    await db.insert(users).values({
      id,
      email,
      passwordHash: await hashPassword(password),
      name: parsed.data.name,
      role: parsed.data.role,
      isActive: true,
      permissions: sanitizePermissions(parsed.data.permissions),
      companyName: parsed.data.companyName ?? '',
      companyLogoUrl: '',
      companyPhone: parsed.data.companyPhone ?? '',
      companyContactEmail: parsed.data.companyContactEmail ?? '',
      // Admin-created accounts always change their initial password on first
      // login — the same ForcePasswordChange gate the seed user hits.
      mustChangePassword: true,
      createdAt: now,
      updatedAt: now,
    });
    const created = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!created) return c.json({ error: 'create_failed' }, 500);
    return c.json(
      {
        user: serializeAdminUser(created, 0),
        // Returned exactly once — the admin must copy it now. Only present
        // when we generated it (if the admin typed one, they already have it).
        generatedPassword: generated ? password : undefined,
      },
      201,
    );
  })

  // ─── Update a user ───────────────────────────────────────────────────
  .patch('/admin/users/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => null);
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'invalid_input', detail: parsed.error.issues }, 400);
    }
    const target = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!target) return c.json({ error: 'not_found' }, 404);

    const isSelf = id === c.get('userId');
    const d = parsed.data;

    // Self-protection: an admin cannot lock themselves out.
    if (isSelf && d.role === 'user') return c.json({ error: 'cannot_demote_self' }, 400);
    if (isSelf && d.isActive === false) return c.json({ error: 'cannot_deactivate_self' }, 400);

    const demotingAdmin = target.role === 'admin' && d.role === 'user';
    const deactivatingAdmin = target.role === 'admin' && d.isActive === false;
    const guardLastAdmin = demotingAdmin || deactivatingAdmin;

    // Email change must stay unique.
    if (d.email !== undefined) {
      const nextEmail = d.email.toLowerCase();
      if (nextEmail !== target.email) {
        const clash = await db.query.users.findFirst({ where: eq(users.email, nextEmail) });
        if (clash) return c.json({ error: 'email_taken' }, 409);
      }
    }

    const patch: Partial<User> = { updatedAt: new Date() };
    if (d.name !== undefined) patch.name = d.name;
    if (d.email !== undefined) patch.email = d.email.toLowerCase();
    if (d.role !== undefined) patch.role = d.role;
    if (d.isActive !== undefined) patch.isActive = d.isActive;
    if (d.permissions !== undefined) patch.permissions = sanitizePermissions(d.permissions);
    if (d.companyName !== undefined) patch.companyName = d.companyName;
    if (d.companyPhone !== undefined) patch.companyPhone = d.companyPhone;
    if (d.companyContactEmail !== undefined) patch.companyContactEmail = d.companyContactEmail;

    // Last-admin protection: count OTHER active admins and apply the patch in
    // ONE synchronous SQLite transaction so two concurrent demotions can't both
    // pass the check and drop the panel to zero admins (a TOCTOU that bricks the
    // whole team — recovery needs DB surgery). (Audit P1.)
    try {
      db.transaction((tx) => {
        if (guardLastAdmin) {
          const others = tx
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.role, 'admin'), eq(users.isActive, true), ne(users.id, id)))
            .all();
          if (others.length === 0) throw new Error('LAST_ADMIN');
        }
        tx.update(users).set(patch).where(eq(users.id, id)).run();
      });
    } catch (e) {
      if (e instanceof Error && e.message === 'LAST_ADMIN') {
        return c.json({ error: 'last_admin' }, 400);
      }
      throw e;
    }

    const updated = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!updated) return c.json({ error: 'not_found' }, 404);
    return c.json({ user: serializeAdminUser(updated) });
  })

  // ─── Reset a user's password ─────────────────────────────────────────
  .post('/admin/users/:id/reset-password', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const parsed = resetPasswordSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return c.json({ error: 'invalid_input', detail: parsed.error.issues }, 400);
    }
    const target = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!target) return c.json({ error: 'not_found' }, 404);

    const generated = parsed.data.password === undefined;
    const password = parsed.data.password ?? generatePassword();
    await db
      .update(users)
      .set({
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
    return c.json({ ok: true, generatedPassword: generated ? password : undefined });
  });
