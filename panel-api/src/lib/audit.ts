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

/** Insert one event, chained to the previous tip-hash. Single-process safe; for a
 *  multi-instance deploy we'd want a SELECT … FOR UPDATE around the tip read. */
export async function recordAuditEvent(input: AuditInsert): Promise<AuditEvent> {
  const id = nanoid(16);
  const createdAt = new Date();
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
