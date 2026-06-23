/**
 * Live-Zusammenarbeit — integration tests for the collaborator access grants,
 * presence heartbeat, and change-poll added 2026-06-23 so several panel users
 * can edit one calculation at once ("mehrere Leute gleichzeitig an einer
 * Kalkulation", boss request).
 *
 * Same conventions as round9-auth-projects.test.ts: per-file temp DB, lazy
 * imports after env is set, real JWT cookies, unique nanoid users/projects.
 */
import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';

const tmpDir = mkdtempSync(join(tmpdir(), 'kalku-collab-'));
process.env.DB_PATH = join(tmpDir, 'collab.db');
process.env.JWT_SECRET = 'collab-secret-' + Math.random().toString(36).slice(2);

const { db, runMigrations } = await import('../src/db.js');
const schema = await import('../src/schema.js');
const auth = await import('../src/lib/auth.js');
const collab = await import('../src/lib/collab.js');
const { projectsRoute } = await import('../src/routes/projects.js');
const { nanoid } = await import('nanoid');

const app = new Hono();
app.route('/projects', projectsRoute);

before(() => {
  runMigrations();
});

beforeEach(() => {
  collab._resetPresence();
});

async function seedUser(opts: { role?: 'admin' | 'user'; isActive?: boolean } = {}) {
  const id = nanoid(16);
  const email = `${id}@test.local`.toLowerCase();
  const now = new Date();
  await db.insert(schema.users).values({
    id,
    email,
    passwordHash: await auth.hashPassword('TestPassword12345!'),
    name: 'User ' + id.slice(0, 4),
    role: opts.role ?? 'user',
    isActive: opts.isActive ?? true,
    companyName: '',
    companyLogoUrl: '',
    companyPhone: '',
    companyContactEmail: '',
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now,
  });
  return { id, email };
}

async function cookie(userId: string, email: string): Promise<string> {
  return `${auth.COOKIE_NAME}=${await auth.signToken({ sub: userId, email })}`;
}

function projectData(over: Partial<schema.ProjectData> = {}): schema.ProjectData {
  return {
    name: 'Shared Calc',
    client: 'Kunde',
    service: 'Service',
    tenderNumber: 'T-1',
    deadline: '2026-12-31',
    bidder: 'Bieter',
    calcParams: {
      mittellohn: 30,
      verrechnungslohn: 49.9,
      materialZuschlag: 0.12,
      nuZuschlag: 0.12,
      geraeteZuschlagPct: 0.1,
      geraeteStundensatz: 0.5,
      zeitabzug: 0,
      tagesstunden: 8,
      personaleinsatz: 3,
      mwst: 0.19,
    },
    positions: [],
    ...over,
  };
}

async function seedProject(ownerId: string): Promise<string> {
  const id = nanoid(16);
  const now = new Date();
  await db.insert(schema.projects).values({
    id,
    ownerId,
    data: projectData(),
    versionNumber: 1,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

const json = (body: unknown, headers: Record<string, string>) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

describe('Live-Zusammenarbeit — access grants', () => {
  test('coworker cannot open a project until granted, then can edit', async () => {
    const owner = await seedUser();
    const coworker = await seedUser();
    const pid = await seedProject(owner.id);
    const ownerCookie = await cookie(owner.id, owner.email);
    const coCookie = await cookie(coworker.id, coworker.email);

    // Before grant: 404 for the coworker on both read + write.
    let res = await app.request(`/projects/${pid}`, { headers: { Cookie: coCookie } });
    assert.equal(res.status, 404, 'coworker has no access before grant');

    // Owner grants by email.
    res = await app.request(
      `/projects/${pid}/collaborators`,
      json({ email: coworker.email }, { Cookie: ownerCookie }),
    );
    assert.equal(res.status, 200, 'owner can add collaborator');

    // After grant: coworker can read.
    res = await app.request(`/projects/${pid}`, { headers: { Cookie: coCookie } });
    assert.equal(res.status, 200, 'coworker can now read');
    const detail = (await res.json()) as { role: string; updatedAt: string };
    assert.equal(detail.role, 'collaborator');

    // And write.
    res = await app.request(`/projects/${pid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: coCookie },
      body: JSON.stringify({ data: projectData({ name: 'Edited by coworker' }) }),
    });
    assert.equal(res.status, 200, 'coworker can now write');
  });

  test('owner sees the project as role=owner; shared project shows in coworker list', async () => {
    const owner = await seedUser();
    const coworker = await seedUser();
    const pid = await seedProject(owner.id);
    const ownerCookie = await cookie(owner.id, owner.email);
    const coCookie = await cookie(coworker.id, coworker.email);

    await app.request(
      `/projects/${pid}/collaborators`,
      json({ userId: coworker.id }, { Cookie: ownerCookie }),
    );

    const ownerView = await (
      await app.request(`/projects/${pid}`, { headers: { Cookie: ownerCookie } })
    ).json();
    assert.equal((ownerView as { role: string }).role, 'owner');

    const list = (await (
      await app.request('/projects', { headers: { Cookie: coCookie } })
    ).json()) as { projects: Array<{ id: string; role: string }> };
    const entry = list.projects.find((p) => p.id === pid);
    assert.ok(entry, 'shared project appears in coworker list');
    assert.equal(entry.role, 'collaborator');
  });

  test('collaborator cannot manage team or delete; owner-only', async () => {
    const owner = await seedUser();
    const coworker = await seedUser();
    const other = await seedUser();
    const pid = await seedProject(owner.id);
    const ownerCookie = await cookie(owner.id, owner.email);
    const coCookie = await cookie(coworker.id, coworker.email);

    await app.request(
      `/projects/${pid}/collaborators`,
      json({ userId: coworker.id }, { Cookie: ownerCookie }),
    );

    // Collaborator cannot add others.
    let res = await app.request(
      `/projects/${pid}/collaborators`,
      json({ userId: other.id }, { Cookie: coCookie }),
    );
    assert.equal(res.status, 403, 'collaborator cannot add others');

    // Collaborator cannot delete the project (owner-only).
    res = await app.request(`/projects/${pid}`, {
      method: 'DELETE',
      headers: { Cookie: coCookie },
    });
    assert.equal(res.status, 404, 'collaborator cannot delete the shared calc');

    // canManage flags differ.
    const ownerRoster = (await (
      await app.request(`/projects/${pid}/collaborators`, { headers: { Cookie: ownerCookie } })
    ).json()) as { canManage: boolean; collaborators: unknown[] };
    assert.equal(ownerRoster.canManage, true);
    assert.equal(ownerRoster.collaborators.length, 1);

    const coRoster = (await (
      await app.request(`/projects/${pid}/collaborators`, { headers: { Cookie: coCookie } })
    ).json()) as { canManage: boolean };
    assert.equal(coRoster.canManage, false);
  });

  test('collaborator can remove themselves (leave); access then revoked', async () => {
    const owner = await seedUser();
    const coworker = await seedUser();
    const pid = await seedProject(owner.id);
    const ownerCookie = await cookie(owner.id, owner.email);
    const coCookie = await cookie(coworker.id, coworker.email);

    await app.request(
      `/projects/${pid}/collaborators`,
      json({ userId: coworker.id }, { Cookie: ownerCookie }),
    );

    const res = await app.request(`/projects/${pid}/collaborators/${coworker.id}`, {
      method: 'DELETE',
      headers: { Cookie: coCookie },
    });
    assert.equal(res.status, 200, 'collaborator leaves');

    const after = await app.request(`/projects/${pid}`, { headers: { Cookie: coCookie } });
    assert.equal(after.status, 404, 'access revoked after leaving');
  });

  test('assignable-users lists candidates minus owner + existing + inactive', async () => {
    const owner = await seedUser();
    const alice = await seedUser();
    const bob = await seedUser();
    const inactive = await seedUser({ isActive: false });
    const pid = await seedProject(owner.id);
    const ownerCookie = await cookie(owner.id, owner.email);

    // Alice is already a collaborator → must NOT appear as a candidate.
    await app.request(
      `/projects/${pid}/collaborators`,
      json({ userId: alice.id }, { Cookie: ownerCookie }),
    );

    const res = await app.request(`/projects/${pid}/assignable-users`, {
      headers: { Cookie: ownerCookie },
    });
    assert.equal(res.status, 200);
    const { users } = (await res.json()) as { users: Array<{ id: string }> };
    const ids = users.map((u) => u.id);
    assert.ok(ids.includes(bob.id), 'free user is a candidate');
    assert.ok(!ids.includes(owner.id), 'owner is not a candidate');
    assert.ok(!ids.includes(alice.id), 'existing collaborator is not a candidate');
    assert.ok(!ids.includes(inactive.id), 'inactive user is not a candidate');
  });

  test('assignable-users is manager-only (collaborator gets 403)', async () => {
    const owner = await seedUser();
    const coworker = await seedUser();
    const pid = await seedProject(owner.id);
    const ownerCookie = await cookie(owner.id, owner.email);
    const coCookie = await cookie(coworker.id, coworker.email);
    await app.request(
      `/projects/${pid}/collaborators`,
      json({ userId: coworker.id }, { Cookie: ownerCookie }),
    );

    const res = await app.request(`/projects/${pid}/assignable-users`, {
      headers: { Cookie: coCookie },
    });
    assert.equal(res.status, 403, 'a plain collaborator cannot read the user directory');
  });

  test('add-collaborator returns 404 (not 403) to a non-member — no existence oracle', async () => {
    const owner = await seedUser();
    const stranger = await seedUser();
    const victim = await seedUser();
    const pid = await seedProject(owner.id);
    const strangerCookie = await cookie(stranger.id, stranger.email);

    // A plain user who is neither owner nor collaborator must get the SAME 404
    // as for a non-existent project, so they can't probe which ids exist.
    const real = await app.request(
      `/projects/${pid}/collaborators`,
      json({ userId: victim.id }, { Cookie: strangerCookie }),
    );
    assert.equal(real.status, 404, 'existing-but-inaccessible project → 404');

    const missing = await app.request(
      `/projects/does-not-exist/collaborators`,
      json({ userId: victim.id }, { Cookie: strangerCookie }),
    );
    assert.equal(missing.status, 404, 'non-existent project → 404 (indistinguishable)');
  });

  test('presence sweep prunes peers past the TTL', async () => {
    const owner = await seedUser();
    const pid = await seedProject(owner.id);
    const t0 = 1_000_000;
    // Two peers heartbeat at t0.
    collab.heartbeat(pid, { userId: 'u1', name: 'One' }, false, t0);
    collab.heartbeat(pid, { userId: 'u2', name: 'Two' }, false, t0);
    // u2 refreshes just before the sweep; u1 has gone silent past the TTL.
    collab.heartbeat(pid, { userId: 'u2', name: 'Two' }, false, t0 + collab.PRESENCE_TTL_MS - 1);
    collab.sweep(t0 + collab.PRESENCE_TTL_MS + 1);
    // After the sweep u1 is gone; u2 (seen from u1's perspective) remains.
    const peersFromU1 = collab.heartbeat(
      pid,
      { userId: 'u1', name: 'One' },
      false,
      t0 + collab.PRESENCE_TTL_MS + 2,
    );
    assert.ok(
      peersFromU1.some((p) => p.userId === 'u2'),
      'u2 still present (refreshed in time)',
    );
  });

  test('admin (non-owner) can manage collaborators', async () => {
    const owner = await seedUser();
    const admin = await seedUser({ role: 'admin' });
    const coworker = await seedUser();
    const pid = await seedProject(owner.id);
    const adminCookie = await cookie(admin.id, admin.email);

    // Admin is not owner and not yet a collaborator → still 404 on read…
    const read = await app.request(`/projects/${pid}`, { headers: { Cookie: adminCookie } });
    assert.equal(read.status, 404, 'admin gets no implicit read access');

    // …but POST collaborators resolves access=exists and admin canManage, so it
    // succeeds (admin grants the coworker).
    const res = await app.request(
      `/projects/${pid}/collaborators`,
      json({ userId: coworker.id }, { Cookie: adminCookie }),
    );
    assert.equal(res.status, 200, 'admin can grant access');
  });
});

describe('Live-Zusammenarbeit — head poll + presence', () => {
  test('head returns updatedAt + version and bumps after a save', async () => {
    const owner = await seedUser();
    const pid = await seedProject(owner.id);
    const ownerCookie = await cookie(owner.id, owner.email);

    const head1 = (await (
      await app.request(`/projects/${pid}/head`, { headers: { Cookie: ownerCookie } })
    ).json()) as { updatedAt: number; versionNumber: number };
    assert.equal(typeof head1.updatedAt, 'number');
    assert.equal(head1.versionNumber, 1);

    await app.request(`/projects/${pid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: ownerCookie },
      body: JSON.stringify({ data: projectData({ name: 'changed' }) }),
    });

    const head2 = (await (
      await app.request(`/projects/${pid}/head`, { headers: { Cookie: ownerCookie } })
    ).json()) as { updatedAt: number };
    assert.ok(head2.updatedAt >= head1.updatedAt, 'head updatedAt advances after save');
  });

  test('presence heartbeat surfaces the other person', async () => {
    const owner = await seedUser();
    const coworker = await seedUser();
    const pid = await seedProject(owner.id);
    const ownerCookie = await cookie(owner.id, owner.email);
    const coCookie = await cookie(coworker.id, coworker.email);
    await app.request(
      `/projects/${pid}/collaborators`,
      json({ userId: coworker.id }, { Cookie: ownerCookie }),
    );

    // Owner beats first → no peers yet.
    let res = await app.request(`/projects/${pid}/presence`, json({ editing: false }, { Cookie: ownerCookie }));
    let body = (await res.json()) as { peers: Array<{ userId: string; editing: boolean }> };
    assert.equal(body.peers.length, 0);

    // Coworker beats (editing) → sees the owner.
    res = await app.request(`/projects/${pid}/presence`, json({ editing: true }, { Cookie: coCookie }));
    body = (await res.json()) as { peers: Array<{ userId: string; editing: boolean }> };
    assert.equal(body.peers.length, 1);
    assert.equal(body.peers[0].userId, owner.id);

    // Owner beats again → now sees the coworker, flagged editing.
    res = await app.request(`/projects/${pid}/presence`, json({ editing: false }, { Cookie: ownerCookie }));
    body = (await res.json()) as { peers: Array<{ userId: string; editing: boolean }> };
    assert.equal(body.peers.length, 1);
    assert.equal(body.peers[0].userId, coworker.id);
    assert.equal(body.peers[0].editing, true);

    // Coworker leaves → owner no longer sees them.
    await app.request(`/projects/${pid}/presence/leave`, { method: 'POST', headers: { Cookie: coCookie } });
    res = await app.request(`/projects/${pid}/presence`, json({ editing: false }, { Cookie: ownerCookie }));
    body = (await res.json()) as { peers: unknown[] };
    assert.equal(body.peers.length, 0);
  });

  test('optimistic guard still fires across collaborators (drives client merge)', async () => {
    const owner = await seedUser();
    const coworker = await seedUser();
    const pid = await seedProject(owner.id);
    const ownerCookie = await cookie(owner.id, owner.email);
    const coCookie = await cookie(coworker.id, coworker.email);
    await app.request(
      `/projects/${pid}/collaborators`,
      json({ userId: coworker.id }, { Cookie: ownerCookie }),
    );

    const t0 = (await (
      await app.request(`/projects/${pid}/head`, { headers: { Cookie: ownerCookie } })
    ).json()) as { updatedAt: number };

    // Coworker saves with the shared baseline → succeeds.
    const coSave = await app.request(`/projects/${pid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: coCookie },
      body: JSON.stringify({ data: projectData({ name: 'coworker edit' }), expectedUpdatedAt: t0.updatedAt }),
    });
    assert.equal(coSave.status, 200);

    // Owner saves with the now-stale baseline → 409 (client will merge + retry).
    const ownerSave = await app.request(`/projects/${pid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: ownerCookie },
      body: JSON.stringify({ data: projectData({ name: 'owner edit' }), expectedUpdatedAt: t0.updatedAt }),
    });
    assert.equal(ownerSave.status, 409, 'stale save is rejected so no silent overwrite');
    const conflict = (await ownerSave.json()) as { error: string; currentUpdatedAt: number };
    assert.equal(conflict.error, 'version_conflict');
    assert.ok(conflict.currentUpdatedAt > t0.updatedAt);
  });
});
