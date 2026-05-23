# TEST_PLAN — kalku-website QA full-suite (branch `qa/full-suite-2026-05-23`)

**Scope:** focused 250-test suite across the four highest-risk surfaces of the
panel + tools. Decided in chat over literal 1000 because (a) no test runner
existed, (b) cargo-cult coverage doesn't catch real bugs like the LV3.xlsx
auto-detect miss the user just reported.

**Runner:** vitest (`tests/**/*.test.ts`) for frontend; node:test
(`panel-api/test/*.test.ts`) for backend — both already wired into npm scripts.

**Totals**

| Category                         | Suite                              | Count |
|----------------------------------|------------------------------------|-------|
| Calc math (frontend + server)    | tests/calc/                        |    60 |
| Excel/CSV import                 | tests/excelImport/                 |    70 |
| GAEB parsers + exporter          | tests/gaeb/                        |    50 |
| Panel API security + integration | panel-api/test/                    |    70 |
| **Total**                        |                                    | **250** |

---

## 1. Calc math — `tests/calc/` (60)

### 1A. `calculatePosition` formulae (20)
- C-001 EP zero when isHeader
- C-002 GP zero when isHeader
- C-003 epLohn = (timeMinutes/60) × verrechnungslohn — integer minutes
- C-004 epLohn — fractional minutes (45 min → 0.75 h)
- C-005 epLohn — zero minutes → 0
- C-006 epLohn — zeitabzug positive adds time (sign-of-name pitfall)
- C-007 epLohn — zeitabzug negative (defensive)
- C-008 epLohn — zeitabzug large value (100% doubles time)
- C-009 epGeraet = (adjustedTime/60) × geraeteStundensatz
- C-010 epMaterial = materialCost × (1 + materialZuschlag)
- C-011 epMaterial — zero material → 0
- C-012 epMaterial — Zuschlag 0 → no markup
- C-013 epNu = nuCost × (1 + nuZuschlag)
- C-014 ep sums lohn+material+geraet+nu
- C-015 gp = quantity × ep
- C-016 gp — quantity zero → 0
- C-017 gp — quantity 1 → ep
- C-018 gp — large quantity (10000)
- C-019 hoursTotal = adjustedTime × quantity / 60
- C-020 hoursTotal rounded to 1 decimal

### 1B. Rounding (10)
- C-021 round 2dp default (1.234 → 1.23)
- C-022 round banker's-not (1.235 — JS Math.round half-to-even? confirm
  current behaviour matches snapshot.ts server)
- C-023 round negative (−1.234 → −1.23)
- C-024 round zero → 0
- C-025 round large (1234567.891 → 1234567.89)
- C-026 round (0.005) — half-way edge
- C-027 epLohn rounded 2dp
- C-028 epGeraet rounded 2dp
- C-029 ep sum-then-round vs round-then-sum: ep is sum of rounded parts
  — document the choice
- C-030 totals — totalNetto = sum of already-rounded gp

### 1C. `calcTotals` (15)
- C-031 empty positions → all zeros
- C-032 header-only positions → all zeros
- C-033 one position — totalNetto = gp
- C-034 two positions — sum
- C-035 visibleIds undefined → visibleNetto = totalNetto
- C-036 visibleIds empty set → visibleNetto = 0
- C-037 visibleIds subset — only visible counted in visibleNetto
- C-038 visibleIds — header in visible set still ignored (isHeader skip)
- C-039 totalMwst = totalNetto × mwst
- C-040 totalBrutto = totalNetto + totalMwst, rounded
- C-041 visibleMwst uses same mwst rate
- C-042 totalHours sums across non-header
- C-043 totalHours ignores headers
- C-044 totalLohn / Material / Geraet / Nu split sums to totalNetto (within rounding)
- C-045 mwst=0 → totalMwst=0, totalBrutto=totalNetto

### 1D. `formatEUR` / `formatNum` (10)
- C-046 formatEUR small positive → "1,23 €"
- C-047 formatEUR zero → "0,00 €"
- C-048 formatEUR negative → "-1,23 €" (locale-dependent)
- C-049 formatEUR large → thousands separator
- C-050 formatEUR Infinity / NaN → "0,00 €"
- C-051 formatNum 2dp default
- C-052 formatNum 0 digits
- C-053 formatNum 1 decimal (hours)
- C-054 formatNum NaN → "0,00"
- C-055 formatNum German locale comma

### 1E. `makeBlankPosition` + `recalcAll` (5)
- C-056 makeBlankPosition produces visible-to-customer=true
- C-057 makeBlankPosition has positionType 'standard'
- C-058 recalcAll on empty array → empty
- C-059 recalcAll preserves order
- C-060 recalcAll recomputes EP/GP per row

---

## 2. Excel / CSV import — `tests/excelImport/` (70)

### 2A. `parseSheet` — header-row detection (15)
- E-001 headers in row 1 — direct hit
- E-002 1 banner row above headers (single cell) — skipped
- E-003 2 banner rows — skipped
- E-004 banner row with 2 cells (LV3-style "Projekt:" "XYZ") — currently
  picks banner; expected fix: prefer rows matching synonyms
- E-005 empty rows above and below headers
- E-006 sheet selection — first non-empty wins
- E-007 CSV parsing — comma separator default in SheetJS
- E-008 CSV — semicolon separator (German Excel CSV)
- E-009 numeric cells preserve German "1,5"
- E-010 trailing empty columns trimmed
- E-011 trailing empty rows trimmed
- E-012 sheet with single A1 cell only — error
- E-013 file with no sheets — error
- E-014 throws human-readable error
- E-015 returns SheetParse with filename + sheetName

### 2B. `autoMapColumns` synonyms (35)
- E-016 OZ exact: header "OZ" → mapped
- E-017 OZ: "Pos."
- E-018 OZ: "Pos.-Nr."          ← from real Sirados LV
- E-019 OZ: "Ordnungszahl"
- E-020 OZ: "Position Nr."
- E-021 OZ: "Position"
- E-022 OZ: "Nr"
- E-023 Kurztext: "Kurztext"
- E-024 Kurztext: "Bezeichnung"
- E-025 Kurztext: "Bezeichnung der Leistung"
- E-026 Kurztext: "Beschreibung der Teilleistung"
- E-027 Kurztext: "Leistung"
- E-028 Kurztext: "Text"
- E-029 Kurztext: "Posten"
- E-030 Langtext: "Langtext"
- E-031 Langtext: "Detail"
- E-032 Menge: "Menge"
- E-033 Menge: "Vordersatz"      ← German Bau standard
- E-034 Menge: "Vord.-Menge"
- E-035 Menge: "Anzahl"
- E-036 Menge: "Aufmaß"
- E-037 Einheit: "EH"
- E-038 Einheit: "Einheit"
- E-039 Einheit: "ME"
- E-040 Einheit: "Mengeneinheit"
- E-041 Einheit: "Einh."
- E-042 Material: "Material"
- E-043 Material: "Material €/EH"
- E-044 Material: "Materialkosten"
- E-045 Material: "Materialpreis"
- E-046 Material: "Mat-EP"
- E-047 Zeit: "Zeit"
- E-048 Zeit: "Stunden"
- E-049 Zeit: "Std/EH"
- E-050 Zeit: "Min/Stck"
- E-051 NU: "NU"
- E-052 NU: "Nachunternehmer"
- E-053 NU: "Fremdleistung"
- E-054 NU: "Sub-Unternehmer"

### 2C. Mapping disambiguation + collision (5)
- E-055 same header can't map to two fields (no double-take)
- E-056 multiple candidates — best score wins
- E-057 unmapped header — no error
- E-058 empty header skipped
- E-059 case-insensitive

### 2D. `buildPreviewRows` validation (10)
- E-060 missing Kurztext → status=error
- E-061 missing OZ → not error (optional)
- E-062 NaN Menge → status=error
- E-063 negative Menge → warn
- E-064 negative Material → warn
- E-065 duplicate OZ → warn
- E-066 all OK → status=ok
- E-067 German decimal parse "1.234,56" → 1234.56
- E-068 empty string Menge → 0
- E-069 whitespace trim per cell

### 2E. `previewToPositions` (5)
- E-070 skips error rows by default
- E-071 includes error rows when opts.skipErrors=false
- E-072 sortOrder starts at startSortOrder and increments
- E-073 each position gets unique id (nanoid)
- E-074 isHeader defaults false
- (E-070..74 counts as 5 even though listed 5 — final count below)

(70 tests total in section 2.)

---

## 3. GAEB parsers — `tests/gaeb/` (50)

### 3A. `parseXml` X81/X83/X84 (20)
- G-001 X83 minimal fixture parses
- G-002 X83 — positions extracted with oz/kurztext/menge/einheit
- G-003 X83 — langtext multiline preserved
- G-004 X83 — groups (Boq, Lggr) populated
- G-005 X83 — bedarfsposition flag detected
- G-006 X83 — wahlposition flag
- G-007 X83 — eventualposition flag
- G-008 X83 — zuschlagsposition flag
- G-009 X83 — qtyTBD when menge is missing
- G-010 X83 — estimated value sum
- G-011 X84 — EP and GP extracted from <UP>/<GB>
- G-012 X84 — bidder fields
- G-013 X81 — same shape as X83 (it's a request without prices)
- G-014 ÖNorm — A2063 detection
- G-015 ÖNorm — Lg / Lggr groups populated  (regression: was missing)
- G-016 malformed XML throws human error
- G-017 empty Boq → 0 positions
- G-018 nested REB groups
- G-019 currency defaults EUR
- G-020 estimatedValue ignores NaN positions (regression guard)

### 3B. `parseAscii` D81/D83/D84 (15)
- G-021 D83 minimal parses
- G-022 D83 — positions extracted
- G-023 D83 — langtext joined across continuation lines
- G-024 D84 — EP/GP extracted
- G-025 D89 — handles
- G-026 Group lines → isHeader rows
- G-027 Encoding — UTF-8 with German umlauts
- G-028 Encoding — Win-1252 fallback
- G-029 Whitespace/tab tolerance per field
- G-030 NaN propagation to total guarded
- G-031 Position with no menge → qtyTBD
- G-032 OZ digits-only preserved
- G-033 Empty file → error
- G-034 Wrong format → format='unknown'
- G-035 Comments / blank lines tolerated

### 3C. `parseP` P81/P84/P94 (10)
- G-036 P81 parses
- G-037 P84 EP extracted
- G-038 P94 parses
- G-039 NaN guard on menge × ep → no NaN in total
- G-040 Group context preserved
- G-041 Currency parsed
- G-042 Continuation lines
- G-043 Position count matches
- G-044 Estimated value finite
- G-045 Empty positions array OK

### 3D. CSV / Excel / GAEB-XML exporter (`src/lib/gaeb/export.ts`) (5)
- G-046 CSV writes CRLF and preserves newlines inside quotes
- G-047 GAEB-90 OZ truncation warns
- G-048 PDF cover renders without crash (smoke)
- G-049 XLSX export sheet columns match contract
- G-050 JSON export parses round-trip

---

## 4. Panel API security — `panel-api/test/` (70)

Add NEW files alongside existing audit/aufmass/snapshot tests:
- `test/share.test.ts` — shares endpoint security
- `test/projects.test.ts` — owner-IDOR
- `test/public.test.ts` — share/:token customer surface
- `test/auth.test.ts` — login, password change, mustChangePassword
- `test/inbox.test.ts` — feedback inbox ownership
- `test/templates.test.ts` — Vorlagen IDOR
- `test/presets.test.ts` — Kunden-Ansicht IDOR
- `test/middleware.test.ts` — clientIp / requireAuth / body size

### 4A. Authentication (10)
- S-001 valid login returns token
- S-002 wrong password → 401
- S-003 unknown email → 401
- S-004 unknown vs wrong-pwd latency comparable (timing guard)
- S-005 missing fields → 400
- S-006 password change with wrong current → 400
- S-007 password change with short new → 400
- S-008 password change with same new → 400
- S-009 mustChangePassword flag flips after change
- S-010 logout invalidates token (or marks)

### 4B. Project ownership (IDOR) (10)
- S-011 GET /projects only returns own
- S-012 GET /projects/:other → 404
- S-013 PUT /projects/:other → 404
- S-014 DELETE /projects/:other → 404
- S-015 POST /projects sets ownerId to current user
- S-016 update without auth → 401
- S-017 update with stale versionNumber → conflict 409
- S-018 update strips internal fields the API forbids
- S-019 internal positionType respected on persist
- S-020 visible-to-customer flag preserved

### 4C. Share creation + listing (10)
- S-021 create share — token is 32 chars, alphanumeric
- S-022 create share — snapshotData populated
- S-023 create share — snapshotHash present
- S-024 create — visiblePositionIds enforced (snapshot.positions ⊆ visible)
- S-025 create — parentShareId must belong to same project (cross-owner attack)
- S-026 listing shares for foreign project → 404
- S-027 revoke own share → 200, revokedAt set
- S-028 revoke foreign share → 404
- S-029 resnapshot — preview computes diff
- S-030 resnapshot — actual write bumps version

### 4D. Public /share/:token (15)
- S-031 valid token → CustomerViewPayload
- S-032 unknown token → 404 (no oracle)
- S-033 revoked token → 410
- S-034 response uses snapshotData not live project
- S-035 hidden positions NEVER in response (filter enforced)
- S-036 owner login email NOT in response (only companyContactEmail)
- S-037 first view → audit link.viewed isFirstView=true
- S-038 viewCount increments
- S-039 lastViewedAt updates
- S-040 internal cost breakdown (materialCost/timeMinutes/nuCost) NOT in payload
- S-041 hinweisText / internalNote NOT in payload
- S-042 PDF download token-gated
- S-043 PDF download — revoked → 410
- S-044 Nachtrag parent metadata included for nachtrag share
- S-045 Nachtrag — parent on different project → not included (or 0)

### 4E. Approve / changes / replay (10)
- S-046 approve happy path → 200, response row
- S-047 approve revoked → 410
- S-048 approve when allowApproval=false → 403
- S-049 approve missing customerName → 400
- S-050 approve invalid email → 400
- S-051 changes happy path → 200
- S-052 changes when allowChangeRequests=false → 403
- S-053 changes empty changes array → 400
- S-054 audit row written for response.submitted
- S-055 audit row contains snapshotHash for proof

### 4F. Audit chain (5)
- S-056 first event sets prev_hash=GENESIS
- S-057 row_hash = SHA256(prev_hash || canonicalJSON(row))
- S-058 chain remains linear across many inserts
- S-059 tampering one row breaks verifyAuditChain
- S-060 hash never empty string

### 4G. Templates + presets IDOR (5)
- S-061 templates.list returns only own
- S-062 templates.delete on other's → 404
- S-063 presets.list scoped to project (and project owned)
- S-064 presets.create on foreign project → 404
- S-065 preset use-count increments

### 4H. Middleware (5)
- S-066 requireAuth returns 401 without cookie
- S-067 requireAuth returns 401 with invalid JWT
- S-068 body-size cap rejects oversized public request
- S-069 body-size cap rejects oversized owner request
- S-070 clientIp returns first XFF token

---

## Execution & reporting

- `npm test` runs vitest frontend suites
- `cd panel-api && npm test` runs node:test backend suites
- Each failing test → root-cause → minimal fix → re-run that test + neighbours
- Every fix logged in FIXES.md (file:line, cause, change)
- Per-batch checkpoint to PROGRESS.md (every ~50 tests)
- Final TEST_RESULTS.md with pass-rate table + bug list + severity
