import { and, eq } from 'drizzle-orm';
import { db } from '../db.js';
import { projects, projectCollaborators } from '../schema.js';

/**
 * Live-Zusammenarbeit helpers — who may edit a project, and who is editing it
 * right now. Backs the boss's "mehrere Leute gleichzeitig an einer Kalkulation"
 * (2026-06-23) on the existing panel-api (no Cloudflare backend needed).
 */

/**
 * True when `userId` may open + edit `projectId`: the owner, or anyone with an
 * explicit collaborator grant. Returns the owner id too so callers can label
 * the owner in the UI without a second query. `null` = project does not exist.
 */
export async function resolveProjectAccess(
  projectId: string,
  userId: string,
): Promise<{ canAccess: boolean; isOwner: boolean; ownerId: string } | null> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { ownerId: true },
  });
  if (!project) return null;
  if (project.ownerId === userId) {
    return { canAccess: true, isOwner: true, ownerId: project.ownerId };
  }
  const grant = await db.query.projectCollaborators.findFirst({
    where: and(
      eq(projectCollaborators.projectId, projectId),
      eq(projectCollaborators.userId, userId),
    ),
    columns: { id: true },
  });
  return { canAccess: Boolean(grant), isOwner: false, ownerId: project.ownerId };
}

// ── Presence (ephemeral, in-memory) ──────────────────────────────────────────
// A coworker counts as "present" while their tab sends a heartbeat. We keep this
// in process memory on purpose: presence is throwaway state (lost on restart =
// fine, the next heartbeat repopulates it within seconds) and storing it in
// SQLite would mean a write every few seconds per open tab. panel-api runs as a
// single node process, so one Map is the whole truth.

/** How long after the last heartbeat a peer is still considered present. */
export const PRESENCE_TTL_MS = 20_000;

export type PresencePeer = {
  userId: string;
  name: string;
  /** Last heartbeat (epoch ms). */
  lastSeen: number;
  /** True if the tab reported it has unsaved local edits in flight. */
  editing: boolean;
};

// projectId → (userId → peer). One entry per user even with several tabs open
// (last heartbeat wins), so the bar shows people, not tabs.
const presenceByProject = new Map<string, Map<string, PresencePeer>>();

function prune(peers: Map<string, PresencePeer>, now: number): void {
  for (const [userId, peer] of peers) {
    if (now - peer.lastSeen > PRESENCE_TTL_MS) peers.delete(userId);
  }
}

/**
 * Record a heartbeat for `user` on `projectId` and return the other live peers
 * (self excluded). Pass `now` for testability.
 */
export function heartbeat(
  projectId: string,
  user: { userId: string; name: string },
  editing: boolean,
  now: number = Date.now(),
): PresencePeer[] {
  let peers = presenceByProject.get(projectId);
  if (!peers) {
    peers = new Map();
    presenceByProject.set(projectId, peers);
  }
  peers.set(user.userId, { userId: user.userId, name: user.name, lastSeen: now, editing });
  prune(peers, now);
  if (peers.size === 0) presenceByProject.delete(projectId);
  return [...peers.values()].filter((p) => p.userId !== user.userId);
}

/** Drop a user's presence immediately (tab close / navigate away). */
export function leave(projectId: string, userId: string): void {
  const peers = presenceByProject.get(projectId);
  if (!peers) return;
  peers.delete(userId);
  if (peers.size === 0) presenceByProject.delete(projectId);
}

/**
 * Reclaim presence for fully-abandoned projects. heartbeat() only prunes the
 * project it touches, so a project whose last viewer hard-closed the tab (no
 * leave ever sent) would keep its stale entry for the process lifetime. This
 * sweep, run on an interval, prunes every project and drops the empty ones.
 * Exported + `now`-injectable for the unit test.
 */
export function sweep(now: number = Date.now()): void {
  for (const [projectId, peers] of presenceByProject) {
    prune(peers, now);
    if (peers.size === 0) presenceByProject.delete(projectId);
  }
}

// Single process-wide sweep timer. unref() so it never keeps the Node process
// (or a test runner) alive on its own.
const sweepTimer = setInterval(() => sweep(), PRESENCE_TTL_MS);
sweepTimer.unref?.();

/** Test-only: wipe all presence state between cases. */
export function _resetPresence(): void {
  presenceByProject.clear();
}
