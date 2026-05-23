// S-056..S-060 — audit chain integrity (genesis, SHA-256 chain, linearity, tamper).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import Database from 'better-sqlite3';
import { setupTestDb, teardownTestDb } from './helpers.js';

let dbFile = '';

before(async () => {
  const r = setupTestDb('auditchain');
  dbFile = r.dbFile;
  const { runMigrations } = await import('../src/db.js');
  runMigrations();
});

after(() => {
  teardownTestDb();
});

const GENESIS = '0'.repeat(64);

function canonical(obj: any): string {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return JSON.stringify(obj);
  const sorted: any = {};
  for (const k of Object.keys(obj).sort()) {
    const v = obj[k];
    sorted[k] = v && typeof v === 'object' && !Array.isArray(v) ? JSON.parse(canonical(v)) : v;
  }
  return JSON.stringify(sorted);
}

async function resetTable() {
  const { db } = await import('../src/db.js');
  const { auditEvents } = await import('../src/schema.js');
  await db.delete(auditEvents);
}

test('S-056 — first audit event uses GENESIS (0×64) as prevHash', async () => {
  await resetTable();
  const { recordAuditEvent } = await import('../src/lib/audit.js');
  const e = await recordAuditEvent({
    eventType: 'share.created',
    actorKind: 'owner',
    payload: { x: 1 },
  });
  assert.equal(e.prevHash, GENESIS);
  assert.equal(e.rowHash.length, 64);
  assert.match(e.rowHash, /^[a-f0-9]{64}$/);
});

test('S-057 — rowHash = SHA256(prevHash || canonical_json(row_without_rowHash))', async () => {
  await resetTable();
  const { recordAuditEvent } = await import('../src/lib/audit.js');
  const e = await recordAuditEvent({
    shareId: 'sh-1',
    projectId: 'pr-1',
    eventType: 'link.viewed',
    actorKind: 'customer',
    actorRef: null,
    ip: '127.0.0.1',
    userAgent: 'UA',
    payload: { b: 2, a: 1 },
  });
  const recomputed = createHash('sha256')
    .update(
      e.prevHash +
        canonical({
          id: e.id,
          shareId: e.shareId,
          projectId: e.projectId,
          eventType: e.eventType,
          actorKind: e.actorKind,
          actorRef: e.actorRef,
          ip: e.ip,
          userAgent: e.userAgent,
          payload: e.payload,
          createdAtMs: e.createdAt.getTime(),
        }),
    )
    .digest('hex');
  assert.equal(e.rowHash, recomputed);
});

test('S-058 — chain stays linear across many inserts (verifyAuditChain returns null)', async () => {
  await resetTable();
  const { recordAuditEvent, verifyAuditChain } = await import('../src/lib/audit.js');
  let prev = GENESIS;
  for (let i = 0; i < 20; i++) {
    const e = await recordAuditEvent({
      eventType: 'link.viewed',
      actorKind: 'customer',
      payload: { i },
    });
    assert.equal(e.prevHash, prev, `event ${i} should chain off previous`);
    prev = e.rowHash;
  }
  const tampered = await verifyAuditChain();
  assert.equal(tampered, null);
});

test('S-059 — tampering one row breaks verifyAuditChain (returns row index)', async () => {
  await resetTable();
  const { recordAuditEvent, verifyAuditChain } = await import('../src/lib/audit.js');
  for (let i = 0; i < 5; i++) {
    await recordAuditEvent({ eventType: 'link.viewed', actorKind: 'customer', payload: { i } });
  }
  // Mutate row #2 payload outside the audit code path
  const sqlite = new Database(dbFile);
  const rows = sqlite.prepare('SELECT id FROM audit_events ORDER BY created_at, id').all() as Array<{ id: string }>;
  sqlite.prepare('UPDATE audit_events SET payload = ? WHERE id = ?').run(JSON.stringify({ tampered: true }), rows[2].id);
  sqlite.close();
  const tampered = await verifyAuditChain();
  assert.ok(tampered !== null, 'tamper must be caught');
  assert.equal(typeof tampered, 'number');
});

test('S-060 — rowHash and prevHash are never empty strings on any row', async () => {
  await resetTable();
  const { recordAuditEvent } = await import('../src/lib/audit.js');
  for (let i = 0; i < 3; i++) {
    await recordAuditEvent({ eventType: 'link.viewed', actorKind: 'customer', payload: { i } });
  }
  const { db } = await import('../src/db.js');
  const { auditEvents } = await import('../src/schema.js');
  const rows = await db.select().from(auditEvents);
  for (const r of rows) {
    assert.ok(r.rowHash && r.rowHash.length === 64, `rowHash empty for ${r.id}`);
    assert.ok(r.prevHash && r.prevHash.length === 64, `prevHash empty for ${r.id}`);
  }
});
