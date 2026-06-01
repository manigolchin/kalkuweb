/**
 * Coverage for the GET /inbox feedback enrichment (routes/inbox.ts).
 *
 * The enrichment under test:
 *   - entry.project.bidder      → from projects.data.bidder
 *   - responses[].payload.changes[] gain resolved .oz + .shortText from the
 *     share's frozen snapshotData.positions (matched by positionId). A
 *     positionId absent from the snapshot passes through untouched.
 *   - entry.comments[]          → built from positionComments for the share,
 *     each comment's shortText resolved from snapshotData by positionOz
 *     (null when the OZ isn't in the snapshot).
 *   - a share with ONLY comments (no responses, viewCount 0) is INCLUDED.
 *   - top-level viewerLastSeenAt = users.lastFeedbackViewedAt as ISO (null unset)
 *   - revoked shares stay excluded; generatedAt is ISO.
 *
 * Mirrors round9-misc-routes.test.ts for the DB_PATH-before-import singleton
 * pattern, runMigrations() in before(), and the signed-JWT auth cookie.
 */

import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';

// MUST happen before any import that resolves db.js — the module instantiates
// a singleton SQLite handle at import time from process.env.DB_PATH.
const tmpDir = mkdtempSync(join(tmpdir(), 'kalku-inbox-fb-'));
process.env.DB_PATH = join(tmpDir, 'test.db');
process.env.JWT_SECRET = 'inbox-fb-secret-' + Math.random().toString(36).slice(2);

const { db, runMigrations } = await import('../src/db.js');
const schema = await import('../src/schema.js');
const { inboxRoute } = await import('../src/routes/inbox.js');
const { signToken, COOKIE_NAME } = await import('../src/lib/auth.js');
const { nanoid } = await import('nanoid');

type ShareSnapshot = import('../src/schema.js').ShareSnapshot;

const inboxApp = new Hono();
inboxApp.route('/api', inboxRoute);

async function ownerCookie(userId: string, email: string): Promise<string> {
  const token = await signToken({ sub: userId, email });
  return `${COOKIE_NAME}=${token}`;
}

async function seedUser(
  opts: { email?: string; name?: string; lastFeedbackViewedAt?: Date | null } = {},
): Promise<{ id: string; email: string }> {
  const id = nanoid(16);
  const email = opts.email ?? `${id}@test.local`;
  const now = new Date();
  await db.insert(schema.users).values({
    id,
    email,
    passwordHash: 'unused',
    name: opts.name ?? 'Test',
    companyName: 'TestCo',
    companyLogoUrl: '',
    companyPhone: '',
    companyContactEmail: '',
    mustChangePassword: false,
    lastFeedbackViewedAt: opts.lastFeedbackViewedAt ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return { id, email };
}

type SeedProjectOpts = {
  ownerId: string;
  name?: string;
  client?: string;
  service?: string;
  bidder?: string;
};
async function seedProject(opts: SeedProjectOpts): Promise<string> {
  const id = nanoid(16);
  const now = new Date();
  await db.insert(schema.projects).values({
    id,
    ownerId: opts.ownerId,
    data: {
      name: opts.name ?? 'Test Project',
      client: opts.client ?? 'Test Client',
      service: opts.service ?? 'Test Service',
      tenderNumber: '',
      deadline: '',
      bidder: opts.bidder ?? '',
      calcParams: {
        mittellohn: 30,
        verrechnungslohn: 50,
        materialZuschlag: 0.12,
        nuZuschlag: 0.12,
        geraeteZuschlagPct: 0.1,
        geraeteStundensatz: 0.5,
        zeitabzug: 0,
        tagesstunden: 8,
        personaleinsatz: 3,
        mwst: 0.19,
        zielAufschlag: 0,
      },
      positions: [],
    },
    versionNumber: 1,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

/** Minimal snapshot position; matches the ShareSnapshot['positions'][number]
 *  shape (extra fields are fine for the JSON column). */
function snapPos(
  id: string,
  oz: string,
  shortText: string,
  extra: Partial<{ quantity: number; unit: string; ep: number; gp: number; isHeader: boolean }> = {},
) {
  return {
    id,
    oz,
    shortText,
    longText: '',
    quantity: extra.quantity ?? 1,
    unit: extra.unit ?? 'St',
    isHeader: extra.isHeader ?? false,
    sortOrder: 0,
    ep: extra.ep ?? 100,
    gp: extra.gp ?? 100,
  };
}

type SeedShareOpts = {
  projectId: string;
  viewCount?: number;
  lastViewedAt?: Date | null;
  revoked?: boolean;
  snapshotData?: ShareSnapshot | null;
};
async function seedShare(opts: SeedShareOpts): Promise<{ id: string; token: string }> {
  const id = nanoid(16);
  const token = nanoid(32);
  await db.insert(schema.shares).values({
    id,
    projectId: opts.projectId,
    token,
    visiblePositionIds: [],
    settings: {
      brandHeader: 'co-branded',
      allowApproval: true,
      allowChangeRequests: true,
      showTotals: true,
      showMwst: true,
    },
    snapshotData: opts.snapshotData ?? null,
    snapshotHash: null,
    snapshotVersion: 1,
    passwordHash: null,
    expiresAt: null,
    createdAt: new Date(),
    viewCount: opts.viewCount ?? 0,
    lastViewedAt: opts.lastViewedAt ?? null,
    revokedAt: opts.revoked ? new Date() : null,
  });
  return { id, token };
}

type ChangeItem = { positionId: string; type: 'modify' | 'remove' | 'comment'; text: string };
async function seedResponse(opts: {
  shareId: string;
  message?: string;
  changes?: ChangeItem[];
  responseType?: 'approve' | 'changes' | 'reject';
  respondedAt?: Date;
}): Promise<void> {
  await db.insert(schema.shareResponses).values({
    id: nanoid(16),
    shareId: opts.shareId,
    responseType: opts.responseType ?? 'changes',
    customerName: null,
    customerEmail: null,
    ip: null,
    userAgent: null,
    payload: { message: opts.message, changes: opts.changes },
    respondedAt: opts.respondedAt ?? new Date(),
  });
}

async function seedComment(opts: {
  shareId: string;
  positionOz: string;
  intent: 'accept' | 'change_menge' | 'change_fabrikat' | 'negotiate_ep' | 'other';
  text?: string;
  authorName?: string | null;
  createdAt?: Date;
}): Promise<string> {
  const id = nanoid(16);
  await db.insert(schema.positionComments).values({
    id,
    shareId: opts.shareId,
    positionOz: opts.positionOz,
    intent: opts.intent,
    text: opts.text ?? 'Anmerkung',
    authorName: opts.authorName ?? null,
    authorEmail: null,
    ip: null,
    userAgent: null,
    createdAt: opts.createdAt ?? new Date(),
    resolvedAt: null,
  });
  return id;
}

async function cleanupAll(): Promise<void> {
  await db.delete(schema.positionComments);
  await db.delete(schema.shareResponses);
  await db.delete(schema.shares);
  await db.delete(schema.projects);
  await db.delete(schema.users);
}

before(() => {
  runMigrations();
});

beforeEach(async () => {
  await cleanupAll();
});

/* ─── response shape used by several assertions ─────────────────────── */

type Entry = {
  project: {
    id: string;
    name: string;
    client: string;
    bidder: string;
    service: string;
  } | null;
  share: { id: string; token: string; viewCount: number };
  responses: Array<{
    payload: {
      message?: string;
      changes?: Array<{ positionId: string; type: string; text: string; oz?: string; shortText?: string }>;
    };
  }>;
  comments: Array<{
    id: string;
    positionOz: string;
    shortText: string | null;
    intent: string;
    text: string;
    authorName: string | null;
  }>;
};
type InboxBody = { entries: Entry[]; generatedAt: string; viewerLastSeenAt: string | null };

async function getInbox(owner: { id: string; email: string }): Promise<InboxBody> {
  const res = await inboxApp.request('/api/inbox', {
    headers: { Cookie: await ownerCookie(owner.id, owner.email) },
  });
  assert.equal(res.status, 200);
  return (await res.json()) as InboxBody;
}

/* ─── project.bidder ────────────────────────────────────────────────── */

describe('GET /inbox — project.bidder enrichment', () => {
  test('returns project.bidder from projects.data.bidder', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({
      ownerId: owner.id,
      name: 'Neubau Halle 4',
      client: 'Stadt Saarbrücken',
      bidder: 'Elektro Müller GmbH',
    });
    await seedShare({ projectId, viewCount: 1 });

    const body = await getInbox(owner);
    assert.equal(body.entries.length, 1);
    assert.equal(body.entries[0].project?.bidder, 'Elektro Müller GmbH');
    // client (Auftraggeber) stays distinct from bidder (Firma).
    assert.equal(body.entries[0].project?.client, 'Stadt Saarbrücken');
  });

  test('bidder falls back to empty string when unset', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id, bidder: '' });
    await seedShare({ projectId, viewCount: 1 });

    const body = await getInbox(owner);
    assert.equal(body.entries[0].project?.bidder, '');
  });
});

/* ─── changes[] oz + shortText resolution ───────────────────────────── */

describe('GET /inbox — changes[] resolved from snapshot', () => {
  const snapshot: ShareSnapshot = {
    snapshottedAt: new Date().toISOString(),
    projectVersionNumber: 1,
    project: {
      name: 'P',
      client: 'C',
      service: 'elektro',
      tenderNumber: '',
      deadline: '',
      mwst: 0.19,
    },
    positions: [
      snapPos('p1', '1.1', 'LED-Leuchte'),
      snapPos('p2', '1.2', 'Kabelkanal'),
    ],
  };

  test('a change whose positionId is in the snapshot gains oz + shortText', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const { id: shareId } = await seedShare({ projectId, snapshotData: snapshot });
    await seedResponse({
      shareId,
      message: 'Bitte 2 Positionen ändern',
      changes: [{ positionId: 'p1', type: 'modify', text: 'Andere Leuchte' }],
    });

    const body = await getInbox(owner);
    const change = body.entries[0].responses[0].payload.changes![0];
    assert.equal(change.positionId, 'p1');
    assert.equal(change.oz, '1.1');
    assert.equal(change.shortText, 'LED-Leuchte');
    // original fields preserved
    assert.equal(change.type, 'modify');
    assert.equal(change.text, 'Andere Leuchte');
  });

  test('resolves each change independently against its own snapshot position', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const { id: shareId } = await seedShare({ projectId, snapshotData: snapshot });
    await seedResponse({
      shareId,
      changes: [
        { positionId: 'p2', type: 'remove', text: 'streichen' },
        { positionId: 'p1', type: 'modify', text: 'ändern' },
      ],
    });

    const body = await getInbox(owner);
    const changes = body.entries[0].responses[0].payload.changes!;
    assert.equal(changes.length, 2);
    assert.equal(changes[0].oz, '1.2');
    assert.equal(changes[0].shortText, 'Kabelkanal');
    assert.equal(changes[1].oz, '1.1');
    assert.equal(changes[1].shortText, 'LED-Leuchte');
  });

  test('a change whose positionId is NOT in the snapshot passes through unchanged', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const { id: shareId } = await seedShare({ projectId, snapshotData: snapshot });
    await seedResponse({
      shareId,
      changes: [{ positionId: 'ghost-id', type: 'comment', text: 'unbekannt' }],
    });

    const body = await getInbox(owner);
    const change = body.entries[0].responses[0].payload.changes![0];
    assert.equal(change.positionId, 'ghost-id');
    assert.equal(change.type, 'comment');
    assert.equal(change.text, 'unbekannt');
    // no resolved fields injected
    assert.ok(!('oz' in change), 'oz must NOT be present for an unmatched positionId');
    assert.ok(!('shortText' in change), 'shortText must NOT be present for an unmatched positionId');
  });

  test('mixed matched + unmatched changes in one response', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const { id: shareId } = await seedShare({ projectId, snapshotData: snapshot });
    await seedResponse({
      shareId,
      changes: [
        { positionId: 'p1', type: 'modify', text: 'bekannt' },
        { positionId: 'nope', type: 'modify', text: 'unbekannt' },
      ],
    });

    const body = await getInbox(owner);
    const changes = body.entries[0].responses[0].payload.changes!;
    assert.equal(changes[0].oz, '1.1');
    assert.equal(changes[0].shortText, 'LED-Leuchte');
    assert.ok(!('oz' in changes[1]));
    assert.ok(!('shortText' in changes[1]));
  });

  test('with no snapshot, changes pass through unchanged (no crash)', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const { id: shareId } = await seedShare({ projectId, snapshotData: null });
    await seedResponse({
      shareId,
      changes: [{ positionId: 'p1', type: 'modify', text: 'x' }],
    });

    const body = await getInbox(owner);
    const change = body.entries[0].responses[0].payload.changes![0];
    assert.equal(change.positionId, 'p1');
    assert.ok(!('oz' in change));
    assert.ok(!('shortText' in change));
  });

  test('message is preserved alongside enriched changes', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const { id: shareId } = await seedShare({ projectId, snapshotData: snapshot });
    await seedResponse({
      shareId,
      message: 'Gesamtnachricht',
      changes: [{ positionId: 'p1', type: 'modify', text: 'x' }],
    });

    const body = await getInbox(owner);
    assert.equal(body.entries[0].responses[0].payload.message, 'Gesamtnachricht');
  });

  test('a response with an empty changes[] is left untouched', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const { id: shareId } = await seedShare({ projectId, snapshotData: snapshot });
    await seedResponse({ shareId, message: 'Nur Text', changes: [] });

    const body = await getInbox(owner);
    const payload = body.entries[0].responses[0].payload;
    assert.equal(payload.message, 'Nur Text');
    assert.deepEqual(payload.changes, []);
  });
});

/* ─── comments[] ────────────────────────────────────────────────────── */

describe('GET /inbox — comments[] from positionComments', () => {
  const snapshot: ShareSnapshot = {
    snapshottedAt: new Date().toISOString(),
    projectVersionNumber: 1,
    project: { name: 'P', client: 'C', service: 'elektro', tenderNumber: '', deadline: '', mwst: 0.19 },
    positions: [snapPos('p1', '1.1', 'LED-Leuchte'), snapPos('p2', '2.5', 'Verteilerschrank')],
  };

  test('comments[] is built per share and shortText resolves from snapshot by positionOz', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const { id: shareId } = await seedShare({ projectId, snapshotData: snapshot });
    const cId = await seedComment({
      shareId,
      positionOz: '1.1',
      intent: 'negotiate_ep',
      text: 'EP zu hoch',
      authorName: 'Kunde Schmidt',
    });

    const body = await getInbox(owner);
    assert.equal(body.entries[0].comments.length, 1);
    const cm = body.entries[0].comments[0];
    assert.equal(cm.id, cId);
    assert.equal(cm.positionOz, '1.1');
    assert.equal(cm.shortText, 'LED-Leuchte');
    assert.equal(cm.intent, 'negotiate_ep');
    assert.equal(cm.text, 'EP zu hoch');
    assert.equal(cm.authorName, 'Kunde Schmidt');
  });

  test('comment shortText is null when its positionOz is not in the snapshot', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const { id: shareId } = await seedShare({ projectId, snapshotData: snapshot });
    await seedComment({ shareId, positionOz: '9.9', intent: 'other', text: 'unbekannte OZ' });

    const body = await getInbox(owner);
    assert.equal(body.entries[0].comments.length, 1);
    assert.equal(body.entries[0].comments[0].positionOz, '9.9');
    assert.equal(body.entries[0].comments[0].shortText, null);
  });

  test('comment shortText is null when the share has no snapshot at all', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const { id: shareId } = await seedShare({ projectId, snapshotData: null });
    await seedComment({ shareId, positionOz: '1.1', intent: 'accept' });

    const body = await getInbox(owner);
    assert.equal(body.entries[0].comments[0].shortText, null);
  });

  test('all five intents round-trip through comments[]', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const { id: shareId } = await seedShare({ projectId, snapshotData: snapshot });
    const intents = ['accept', 'change_menge', 'change_fabrikat', 'negotiate_ep', 'other'] as const;
    for (const intent of intents) {
      await seedComment({ shareId, positionOz: '2.5', intent, text: intent });
    }

    const body = await getInbox(owner);
    const got = body.entries[0].comments.map((c) => c.intent).sort();
    assert.deepEqual(got, [...intents].sort());
    // each one resolved its shortText from OZ 2.5
    for (const c of body.entries[0].comments) {
      assert.equal(c.shortText, 'Verteilerschrank');
    }
  });
});

/* ─── inclusion / exclusion rules ───────────────────────────────────── */

describe('GET /inbox — inclusion rules with comments', () => {
  const snapshot: ShareSnapshot = {
    snapshottedAt: new Date().toISOString(),
    projectVersionNumber: 1,
    project: { name: 'P', client: 'C', service: 'elektro', tenderNumber: '', deadline: '', mwst: 0.19 },
    positions: [snapPos('p1', '1.1', 'LED-Leuchte')],
  };

  test('a share with ONLY comments (no responses, viewCount 0) IS included', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const { id: shareId } = await seedShare({ projectId, viewCount: 0, snapshotData: snapshot });
    await seedComment({ shareId, positionOz: '1.1', intent: 'change_menge', text: 'Menge anpassen' });

    const body = await getInbox(owner);
    assert.equal(body.entries.length, 1, 'comment-only share must surface in the inbox');
    assert.equal(body.entries[0].share.id, shareId);
    assert.equal(body.entries[0].share.viewCount, 0);
    assert.equal(body.entries[0].responses.length, 0);
    assert.equal(body.entries[0].comments.length, 1);
  });

  test('a share with neither responses, comments, nor views is still excluded', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    await seedShare({ projectId, viewCount: 0, snapshotData: snapshot });

    const body = await getInbox(owner);
    assert.equal(body.entries.length, 0);
  });

  test('revoked share with comments stays excluded', async () => {
    const owner = await seedUser();
    const projectId = await seedProject({ ownerId: owner.id });
    const { id: shareId } = await seedShare({
      projectId,
      revoked: true,
      viewCount: 5,
      snapshotData: snapshot,
    });
    await seedComment({ shareId, positionOz: '1.1', intent: 'accept' });
    await seedResponse({ shareId, changes: [{ positionId: 'p1', type: 'modify', text: 'x' }] });

    const body = await getInbox(owner);
    assert.equal(body.entries.length, 0, 'revoked shares never surface, even with activity');
  });
});

/* ─── viewerLastSeenAt + generatedAt ────────────────────────────────── */

describe('GET /inbox — viewerLastSeenAt + generatedAt', () => {
  test('viewerLastSeenAt is null when users.lastFeedbackViewedAt is unset', async () => {
    const owner = await seedUser({ lastFeedbackViewedAt: null });
    const body = await getInbox(owner);
    assert.equal(body.viewerLastSeenAt, null);
  });

  test('viewerLastSeenAt is the ISO of users.lastFeedbackViewedAt when set', async () => {
    const seen = new Date('2026-05-20T09:30:00.000Z');
    const owner = await seedUser({ lastFeedbackViewedAt: seen });
    const body = await getInbox(owner);
    assert.equal(body.viewerLastSeenAt, seen.toISOString());
  });

  test('viewerLastSeenAt is present even with zero entries', async () => {
    const seen = new Date('2026-01-01T00:00:00.000Z');
    const owner = await seedUser({ lastFeedbackViewedAt: seen });
    const body = await getInbox(owner);
    assert.deepEqual(body.entries, []);
    assert.equal(body.viewerLastSeenAt, seen.toISOString());
  });

  test('generatedAt is a valid ISO timestamp', async () => {
    const owner = await seedUser();
    const body = await getInbox(owner);
    assert.match(body.generatedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    assert.ok(!Number.isNaN(new Date(body.generatedAt).getTime()));
  });
});

/* ─── combined: responses + comments on the same share ──────────────── */

describe('GET /inbox — combined response + comment enrichment', () => {
  test('a single share carries both enriched responses and resolved comments', async () => {
    const snapshot: ShareSnapshot = {
      snapshottedAt: new Date().toISOString(),
      projectVersionNumber: 1,
      project: { name: 'P', client: 'C', service: 'elektro', tenderNumber: '', deadline: '', mwst: 0.19 },
      positions: [snapPos('p1', '1.1', 'LED-Leuchte'), snapPos('p2', '1.2', 'Kabelkanal')],
    };
    const owner = await seedUser({ lastFeedbackViewedAt: new Date('2026-05-01T00:00:00.000Z') });
    const projectId = await seedProject({ ownerId: owner.id, bidder: 'Firma X' });
    const { id: shareId } = await seedShare({ projectId, viewCount: 2, snapshotData: snapshot });
    await seedResponse({
      shareId,
      message: 'Anmerkungen',
      changes: [{ positionId: 'p2', type: 'modify', text: 'Querschnitt erhöhen' }],
    });
    await seedComment({ shareId, positionOz: '1.1', intent: 'change_fabrikat', text: 'Anderes Fabrikat' });

    const body = await getInbox(owner);
    assert.equal(body.entries.length, 1);
    const e = body.entries[0];
    assert.equal(e.project?.bidder, 'Firma X');
    // response change resolved
    assert.equal(e.responses[0].payload.changes![0].oz, '1.2');
    assert.equal(e.responses[0].payload.changes![0].shortText, 'Kabelkanal');
    // comment resolved
    assert.equal(e.comments[0].positionOz, '1.1');
    assert.equal(e.comments[0].shortText, 'LED-Leuchte');
    assert.equal(e.comments[0].intent, 'change_fabrikat');
    // top-level cursor
    assert.equal(body.viewerLastSeenAt, '2026-05-01T00:00:00.000Z');
  });
});
