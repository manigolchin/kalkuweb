# Revision banner: "neue Version verfügbar" on both sides

## Acceptance criteria

**Calculator side (project drift warning):**

- [ ] When the project's `updatedAt` is newer than the share's
      `snapshottedAt` AND the diff returned by `resnapshotPreview` is
      non-empty (added/changed/removed > 0), show an amber banner on
      `ProjectDetail.tsx` and within the "Bestehende Links" list in
      `ShareDialog.tsx`: "Snapshot N Tage / X Positionen veraltet —
      jetzt aktualisieren?" with one-click button into the existing
      `ResnapshotDialog`.
- [ ] Banner is dismissible per share (localStorage), with auto re-show
      after another save.
- [ ] When the calculator commits the re-snapshot, optionally flag it as
      `materialUpdate: boolean` (price/quantity change) vs.
      `cosmeticUpdate: boolean` (typo / longText fix). Stored on the new
      snapshot version.

**Customer side (new-version available):**

- [ ] If a share has been re-snapshotted since the customer last viewed
      it (`lastViewedAt < latestSnapshottedAt`), `ShareView.tsx` shows a
      prominent banner at the top of `<main>`:
      "Ein aktualisiertes Angebot liegt vor — Sie sehen Version vN.
      Was hat sich geändert?" with an expandable summary (uses the same
      diff data as `resnapshotPreview`).
- [ ] If the previous snapshot the customer saw was flagged
      `materialUpdate`, banner uses amber tone; if `cosmeticUpdate`,
      muted slate tone.
- [ ] If the customer already approved an older snapshot, banner reads
      instead: "Sie haben Version vN angenommen. Es gibt jetzt
      Version vN+1 — bitte erneut prüfen" — and the
      "Angebot annehmen" button is disabled until the customer
      acknowledges the new version (single-click "Neue Version
      gesehen" checkbox).
- [ ] The fingerprint hash in the footer (`ShareView.tsx:436-446`)
      already exists — banner cross-links to it for verification.

## Suggested implementation

Server-side (out of repo) needs to track a `snapshotHistory[]` per share
(snapshot version, hash, snapshottedAt, optional updateKind flag).
Already implied by commit `7c302e3` ("hash-chained audit log") — likely
exists; just needs to be returned on `ShareSummary` and
`CustomerViewPayload`.

For the calculator-side drift warning, extend `ShareSummary` with a
`projectUpdatedSinceSnapshot: boolean` (cheap to compute server-side as
`project.updatedAt > share.snapshottedAt`). Add a derived
`isStale = share.projectUpdatedSinceSnapshot` and render banner in
`ShareDialog.tsx` above the "Bestehende Links" list and on
`ProjectDetail.tsx` next to the existing share count. Reuse
`ResnapshotDialog` for the diff preview + commit.

For the customer-side banner, extend `CustomerViewPayload` with a
`previousSnapshot?: { version: number; hash: string; snapshottedAt: string }`
field (the snapshot the customer most recently saw, derived from
session/cookie tracking of `lastViewedAt`). If `previousSnapshot.hash !==
snapshotHash`, render the banner. Diff summary uses the same
`resnapshotPreview`-shaped data but inverted (previous → current).

The "approved older version, must re-acknowledge" case is the
load-bearing one — without it, the calculator could re-snapshot a price
*up* after the customer accepted the lower version and trap them. This
is also why `materialUpdate` flag matters: a cosmetic re-snapshot must
NOT invalidate an existing approval, but a price change must.

## Touch points

- `src/features/kalkulation/types.ts` — extend `ShareSummary` with
  `projectUpdatedSinceSnapshot: boolean` and optional
  `lastSnapshotKind: 'material' | 'cosmetic'`; extend
  `CustomerViewPayload` with optional `previousSnapshot` and
  `acknowledgedApproval` fields
- `src/features/kalkulation/ShareDialog.tsx` — stale-snapshot banner on
  existing-shares list (~line 525); also flag in the `Stat`
  components inside `ResnapshotDialog` (line 734) to let the
  calculator mark the update as material vs. cosmetic
- `src/features/kalkulation/ProjectDetail.tsx` — top-level banner when
  any active share is stale (snapshot button area, ~line 297)
- `src/pages/ShareView.tsx` — new `<RevisionBanner>` at the top of
  `<main>` (above the project-meta card, ~line 247); approval-block
  amendment in `ActionSection` to require re-acknowledgement when
  customer previously approved an older snapshot
- `src/lib/api.ts` — `public.acknowledgeRevision(token, hash)` endpoint
  to record that the customer saw the new version
- Server-side: per-share snapshot history, drift flag, material/cosmetic
  field on snapshot rows
