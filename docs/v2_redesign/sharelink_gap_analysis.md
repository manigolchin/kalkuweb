# Share-link gap analysis (2026-05-22)

Audit of the customer share-link flow against a 16-item spec. Scope: the
flow that lets a calculator create a sharable view of a Kalkulation for a
construction customer, capture approval/change-requests, and surface them
back to the calculator.

Files audited:
- `src/features/kalkulation/ShareDialog.tsx` — calculator-side dialog
- `src/pages/ShareView.tsx` — public customer route `/share/:token`
- `src/features/kalkulation/types.ts` — `ShareSettings`, `ShareResponse`,
  `ShareSummary`, `CustomerViewPayload`, `Position`
- `src/features/kalkulation/FeedbackInbox.tsx` — calculator's view of
  customer responses
- `src/lib/api.ts` — `shares`, `inbox`, `notifications`, `public` slices

## Security boundary — internal-field leakage scan

This was the central concern. **No internal Position fields leak into the
customer view.** The defense is structural, not just visual:

- `CustomerViewPayload.positions` (`types.ts:171-182`) is a narrow shape
  containing **only** `id, oz, shortText, longText, quantity, unit,
  isHeader, sortOrder, ep, gp`. Cost components (`materialCost`,
  `timeMinutes`, `nuCost`), EP breakdown (`epLohn`, `epMaterial`,
  `epGeraet`, `epNu`), `positionType`, `internalNote`, `hinweisText`,
  `aufmassFormula`, `visibleToCustomer` are **structurally absent** —
  they cannot be rendered because they are not on the wire payload.
- `ShareView.tsx` only destructures from `payload.positions` (see
  `:166`, `:323-365`). The fields it touches per row are
  `id, oz, shortText, longText, quantity, unit, ep, gp, isHeader` —
  all customer-safe.
- `ShareDialog.tsx` shows the calculator the internal positions in an
  amber `<details>` block (`:419-436`) labeled "werden nie geteilt", and
  pre-filters internal `positionType`s out of `shareablePositions`
  (`:59-65`) so they cannot even be checked. `INTERNAL_POSITION_TYPES`
  (`types.ts:3-8`) is the single source of truth.

**Suspect lines (low risk, worth knowing):**
- `ShareDialog.tsx:430` — renders `POSITION_TYPE_LABELS[...]` for internal
  positions, but only inside the calculator-side dialog, never to
  customer. Safe.
- `types.ts:240` — `internalNote: string` on `Termin`, not on `Position`
  in customer payload. Unrelated to the share-link path.

Sole defense-in-depth gap: the server endpoint backing
`api.public.getShare(token)` is what actually decides which fields to
return. The client is read-only on a narrow shape, but the test that
**the server never returns** `materialCost`/`internalNote`/etc. is
**not visible from the client repo** — recommend a server-side test
that asserts `Object.keys(payload.positions[0])` is the closed set
listed above.

## ✅ Shipped (9 items)

- **Spec item 1 (one-click unguessable URL)**: `ShareDialog.tsx:611-619`
  "Link erstellen" button → `api.shares.create` returns a `token`; URL
  built as `${window.location.origin}/share/${token}` (`:234`). Tokens
  are server-generated (length unknown from client; truncated display
  uses `slice(0, 12)` suggesting ≥12 chars).
- **Spec item 2 (no login required)**: `ShareView.tsx:46` calls
  `api.public.getShare(token)` with no auth; route is mounted publicly.
  No password prompt anywhere in the file.
- **Spec item 3 (customer view excludes internal fields)**: See
  "internal-field leakage scan" above. `CustomerViewPayload.positions`
  (`types.ts:171-182`) is a closed narrow shape; ShareView only renders
  from it.
- **Spec item 6 (Gesamtes LV akzeptieren)**: `ShareView.tsx:642-657`
  green "Angebot annehmen" button, gated by `settings.allowApproval`.
  Sticky bottom bar repeats it (`:474-483`). Posts to
  `api.public.approve` (`api.ts:222-229`).
- **Spec item 7 (Änderungen gewünscht)**: `ShareView.tsx:659-674`
  amber "Rückmeldung senden (N)" button, gated by
  `settings.allowChangeRequests`. Posts to `api.public.requestChanges`
  (`api.ts:230-242`).
- **Spec item 9 (sync back to calculator)**: `FeedbackInbox.tsx:24-26`
  pulls `api.inbox.list()`; `api.notifications.unread` and
  `markViewed` exist (`api.ts:164-172`) wiring an unread badge.
- **Spec item 10 (attribution: who, what, when)**:
  `FeedbackInbox.tsx:138-146` renders `customerName`, `customerEmail`,
  `respondedAt` per response; per-position changes are listed with
  type label (`:152-170`). `ShareResponse` also carries `ip` and
  `userAgent` (`types.ts:128-138`) for audit purposes.
- **Spec item 12 (partial-LV sharing)**: `ShareDialog.tsx:340-417`
  per-row checkbox selection, "Alle/Keine" bulk toggles, live count
  "N / M sichtbar". Plus reusable `ViewPreset`s
  (`ShareDialog.tsx:280-338`, `api.presets.*`) so recurring customer
  archetypes (e.g. "Privatkunde", "AG", "Sub") can be one-click applied.
- **Spec item 15 (PDF mirror)**: `ShareView.tsx:224-232` header has a
  Download button linking to `/api/panel/share/${token}/pdf`. Backend
  endpoint is referenced but not in this repo.

## ⚠️ Partial (5 items)

- **Spec item 4 (per-position comments — side panel)**: Per-position
  comments **exist** at `ShareView.tsx:354-362` and `PositionFeedback`
  at `:491-566`, with 3 types (modify/remove/comment), placeholder
  copy per type, and a discard control. **Gap:** UI is an
  **inline expandable block below the row**, not a sliding side panel
  as specified. On mobile the inline form is arguably better; on
  desktop a true side panel would let the customer keep the row
  visible while writing. Suggested close: keep inline as default,
  add a desktop-only `position: sticky` companion or `<dialog>` for
  ≥`md` breakpoint.
- **Spec item 5 (global comments at the top)**: `generalMessage`
  textarea exists (`ShareView.tsx:630-638`) but lives in the action
  section **at the bottom**, after the position list. Customer may
  miss it on long LVs. Suggested close: add a second
  "Allgemeine Anmerkung" callout at the top, between the project-meta
  card and the positions section, bound to the same `generalMessage`
  state.
- **Spec item 8 (capture name + email on first comment)**: Name (required)
  and email (optional) are captured in `ActionSection` at submit time
  (`ShareView.tsx:606-628`), and pre-filled from
  `settings.customerName/Email` if the calculator entered them. **Gap:**
  the spec wants capture **on first comment** (i.e. as soon as the
  customer types into any `PositionFeedback`), which would let the
  calculator attribute a single in-progress comment even if the
  customer never hits submit. Currently the customer can type 10
  per-position comments and abandon the page; nothing is sent.
- **Spec item 11 (change log of revisions)**: Re-snapshot flow exists
  (`ShareDialog.tsx:654-805`): preview of added/changed/removed
  positions vs current snapshot, plus delta on Netto. Snapshot version
  + hash are surfaced to customer in the footer
  (`ShareView.tsx:436-446`). **Gap:** the calculator can only see the
  diff between *current* project and *current* snapshot. There is
  **no UI listing the full chain** of snapshots (v1 → v2 → v3) per
  share, no way to view "what did the customer see on 2026-05-10".
  Commit `7c302e3` mentions "hash-chained audit log" — the data is
  there server-side but no UI surfaces it.
- **Spec item 13 (link expiry date)**: `ShareSettings.bindefristDays`
  exists (`types.ts:102`); customer sees a countdown
  "Gültig bis DD.MM.YYYY" / "Bindefrist abgelaufen"
  (`ShareView.tsx:282-302`). **Gap (two parts):** (a) the ShareDialog
  has **no input** for `bindefristDays` — it can only be set via a
  saved preset, so most shares ship with `undefined` and fall back to
  the 30-day default; (b) `isExpired` is **computed client-side and
  purely cosmetic** — the API still returns the payload after expiry,
  so a customer who keeps the tab open or revisits the URL can still
  accept "vor abgelaufenem" angebot. Distinct from `bindefristDays`,
  there is no hard `expiresAt` link-revocation date.

## ❌ Missing (2 items)

- **Spec item 14 (password protection)**: No password field on
  `ShareSettings` (`types.ts:93-103`), no password input in
  ShareDialog, no password prompt in ShareView, no
  `api.public.unlockShare` endpoint. ShareDialog explicitly warns
  "Wer den Link kennt, sieht das Angebot — Link sicher per
  E-Mail/WhatsApp versenden" (`:603-606`) — the team is aware this
  is the security model. For customers who forward links carelessly
  (common in family-business B2C), an optional password is the
  standard mitigation.
- **Spec item 16 (revision banner: "neue Version verfügbar")**: Two
  flavors are missing. (a) **Calculator side:** when the calculator
  saves new positions but the existing share is still pinned to an
  older snapshot, there is no banner on the project page or in
  ShareDialog warning "Snapshot ist X Tage / N Änderungen veraltet —
  jetzt aktualisieren?". `resnapshotPreview` returns a useful diff
  but it's only fetched if the calculator clicks the refresh icon
  (`ShareDialog.tsx:549-555`). (b) **Customer side:** if the
  calculator does re-snapshot, the customer's already-open tab will
  silently show stale data on next reload — no "Ein aktualisiertes
  Angebot liegt vor" banner. Also: if the calculator wants to
  send a *minor* update (typo fix) vs. a *material* update (price
  change), there's no way to flag the difference.
