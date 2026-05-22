import { createHash } from 'node:crypto';
import { desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { auditEvents, type AuditEvent } from '../schema.js';

export type AuditInsert = {
  shareId?: string | null;
  projectId?: string | null;
  eventType: AuditEvent['eventType'];
  actorKind: AuditEvent['actorKind'];
  actorRef?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  payload?: Record<string, unknown>;
};

const GENESIS_PREV_HASH = '0'.repeat(64);

// Per-process monotonic clock for audit timestamps. Two events that land in
// the same millisecond would otherwise tie on `created_at` and the
// tie-breaker is `id` — but nanoid ids sort unpredictably, so the tip
// selection (DESC) could pick a different row than the verify iteration
// (ASC) expects, falsely flagging the chain as tampered. Bumping the next
// timestamp by 1 ms past the last write guarantees strict monotonicity.
let lastAuditWriteMs = 0;
function nextMonotonicMs(): number {
  const now = Date.now();
  const next = now > lastAuditWriteMs ? now : lastAuditWriteMs + 1;
  lastAuditWriteMs = next;
  return next;
}

function canonical(obj: Record<string, unknown>): string {
  // Stable key ordering = stable hash. JSON.stringify(obj, Object.keys(obj).sort())
  // is not enough because nested objects also need sorting.
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return JSON.stringify(obj);
  }
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) {
    const v = (obj as Record<string, unknown>)[k];
    sorted[k] = v && typeof v === 'object' && !Array.isArray(v) ? JSON.parse(canonical(v as Record<string, unknown>)) : v;
  }
  return JSON.stringify(sorted);
}

/**
 * In-process async mutex. The audit chain's correctness depends on the
 * tip read + the insert being one atomic operation per logical writer.
 * Without a lock, two concurrent `recordAuditEvent` calls can race:
 *
 *   T1: read tip → prevHash = A
 *   T2: read tip → prevHash = A     ← same tip!
 *   T1: insert {prevHash: A, rowHash: B}
 *   T2: insert {prevHash: A, rowHash: C}   ← chain forks
 *
 * `verifyAuditChain` then sees row 2's prevHash (A) ≠ row 1's rowHash (B)
 * and flags the chain as tampered. Single-process Node serialises with
 * a chained-promise lock; multi-instance deploys would need a row-level
 * lock or `BEGIN IMMEDIATE` in sqlite (better-sqlite3 doesn't expose
 * transactions over drizzle's async API cleanly).
 *
 * Caught by panel-api/test/round9-shares-public.test.ts (Round 9).
 */
let auditChainTail: Promise<unknown> = Promise.resolve();
function withAuditLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = auditChainTail.then(fn, fn);
  // Keep the chain alive even if a particular caller rejects.
  auditChainTail = run.catch(() => undefined);
  return run;
}

/** Insert one event, chained to the previous tip-hash. Serialised in-process
 *  by `withAuditLock` so concurrent callers can't race on the tip read. For
 *  a multi-instance deploy this needs a row-level lock (e.g. `BEGIN IMMEDIATE`
 *  in sqlite, or `SELECT … FOR UPDATE` in Postgres). */
export async function recordAuditEvent(input: AuditInsert): Promise<AuditEvent> {
  return withAuditLock(async () => {
    const id = nanoid(16);
    const createdAt = new Date(nextMonotonicMs());
    const payload = input.payload ?? {};

    const tip = await db
      .select({ rowHash: auditEvents.rowHash })
      .from(auditEvents)
      .orderBy(desc(auditEvents.createdAt), desc(auditEvents.id))
      .limit(1);
    const prevHash = tip[0]?.rowHash || GENESIS_PREV_HASH;

    const canonicalBody = canonical({
      id,
      shareId: input.shareId ?? null,
      projectId: input.projectId ?? null,
      eventType: input.eventType,
      actorKind: input.actorKind,
      actorRef: input.actorRef ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      payload,
      createdAtMs: createdAt.getTime(),
    });
    const rowHash = createHash('sha256').update(prevHash + canonicalBody).digest('hex');

    await db.insert(auditEvents).values({
      id,
      shareId: input.shareId ?? null,
      projectId: input.projectId ?? null,
      eventType: input.eventType,
      actorKind: input.actorKind,
      actorRef: input.actorRef ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      payload,
      prevHash,
      rowHash,
      createdAt,
    });

    return {
      id,
      shareId: input.shareId ?? null,
      projectId: input.projectId ?? null,
      eventType: input.eventType,
      actorKind: input.actorKind,
      actorRef: input.actorRef ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      payload,
      prevHash,
      rowHash,
      createdAt,
    };
  });
}

/** Verify the chain end-to-end. Returns the index of the first tampered row, or null. */
export async function verifyAuditChain(): Promise<number | null> {
  const rows = await db
    .select()
    .from(auditEvents)
    .orderBy(auditEvents.createdAt, auditEvents.id);
  let prev = GENESIS_PREV_HASH;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.prevHash !== prev) return i;
    const canonicalBody = canonical({
      id: r.id,
      shareId: r.shareId,
      projectId: r.projectId,
      eventType: r.eventType,
      actorKind: r.actorKind,
      actorRef: r.actorRef,
      ip: r.ip,
      userAgent: r.userAgent,
      payload: r.payload,
      createdAtMs: r.createdAt.getTime(),
    });
    const expected = createHash('sha256').update(prev + canonicalBody).digest('hex');
    if (expected !== r.rowHash) return i;
    prev = r.rowHash;
  }
  return null;
}
