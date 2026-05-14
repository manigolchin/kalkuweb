# 07b — UX & Conversion Review der neuen kalku.de

> **Stand:** 14. Mai 2026
> **Reviewer:** Unabhängiger UX-/Conversion-Audit
> **Scope:** Alle 18 Seiten + 7 Sections + Layout-Komponenten in `src/`
> **Vergleichsbasis:** [docs/06c-conversion-pipedrive.md](./06c-conversion-pipedrive.md), [docs/06b-wireframes.md](./06b-wireframes.md)

---

## 1. Executive Summary

**UX-Score: 6.0 / 10.**

Die Seite hat ein sauberes, ruhiges Tailwind-Layout, eine klare Brand-Stimme („Sie unterschreiben.") und einen primären grünen CTA, der konsequent eingesetzt wird. Form-Multistep, Tools, Sticky Mobile CTA und Trust-Elemente (4 Teams, Cases, Inhaber-Quote) sind handwerklich solide gebaut. Das ist eine starke Basis.

Aber: zwischen Plan (06c) und Bau (src/) klaffen **drei substanzielle Lücken**, die Conversion direkt kosten:

1. **Cal.com-Embed fehlt komplett** (Kontakt.tsx:65 zeigt nur „Cal.com-Embed folgt"). Funnel 1 + Funnel 3 aus 06c sind damit halb-broken — Ready-to-buy-Visitor finden keinen Termin-Picker, müssen den Multistep durchlaufen.
2. **Self-Check Eligibility fehlt** (06c §3.2 nicht implementiert). Damit landen alle Anfragen — auch 1-Mann-Betriebe — im selben Funnel; keine Vor-Filterung, mehr Müll-Leads im Vertrieb, höhere Lost-Quote.
3. **Exit-Intent-Modal fehlt** (06c §6, Wireframe 0.4 nicht gebaut). Whitepaper-Lead-Magnet als Backup-Pfad fehlt; Bouncer = vollständig verloren.

Dazu drei kleinere strukturelle Defekte: Form hat keine Field-Level-Validation-Errors (nur disabled Button), Multistep persistiert State nicht (06c §8 ignoriert), und auf Konditionen + Home gibt es jeweils zwei nahezu identische CTAs nebeneinander mit gleichem grünen Button-Stil.

**Launch-fertig?** — **Nein, P0-Blockers vorhanden.** Ohne Cal.com-Embed und Form-Backend ist „Erstgespräch vereinbaren" nur halb funktional. 4–6 Stunden Implementierung schließen die schlimmsten Lücken; Self-Check + Exit-Intent sind Phase-5-Material.

---

## 2. Findings nach Severity

### P0 — Blocker (vor Launch fixen)

#### P0-1 — Cal.com-Embed fehlt auf Kontakt-Seite

**Stelle:** `src/pages/Kontakt.tsx:62-66`

```tsx
<div className="card text-center">
  <Calendar className="w-7 h-7 text-emerald-600 mx-auto mb-3" />
  <p className="font-semibold text-gray-900 mb-1">Termin online</p>
  <p className="text-xs text-gray-500">Cal.com-Embed folgt</p>
</div>
```

**Problem:** Die Termin-Card sieht aus wie ein klickbarer Conversion-Pfad, ist aber tot. Visitor mit High-Intent („Ready-to-buy", Funnel 3 in 06c) landet im Multistep-Form (3 Schritte, ~12 Felder), statt sofort einen Slot wählen zu können — ein Drop-Off von geschätzt 30–50 % auf dieser Card.

**Lösung:** Cal.com-Inline-Embed integrieren, identisch zu 06c §3.7. Mindestlösung als Übergang:

```tsx
<a
  href={SERVICES.calBookingUrl}
  target="_blank"
  rel="noopener noreferrer"
  className="card card-hover text-center"
>
  <Calendar className="w-7 h-7 text-emerald-600 mx-auto mb-3" />
  <p className="font-semibold text-gray-900 mb-1">Termin online</p>
  <p className="text-sm text-gray-600">15 Min · kostenlos</p>
</a>
```

Vollständige Lösung: `<iframe src="https://cal.com/kalku/15min" min-h-[640px]>` als eigene Section unter dem Multi-Step-Form mit `id="cal"` für Anchor-Links aus Sticky-Mobile-Bar.

**Impact:** ~+15–25 % Conversion auf Kontakt-Seite (High-Intent-Verteilung).

---

#### P0-2 — MultiStepForm hat keinen Backend-Endpoint

**Stelle:** `src/components/forms/MultiStepForm.tsx:73-80`

```tsx
async function submit(e: React.FormEvent) {
  // ...
  // TODO Phase 3.4 backend: POST /api/forms/submit (Pipedrive async push + retry queue)
  await new Promise((r) => setTimeout(r, 600));
  setSent(true);
}
```

**Problem:** Der Form simuliert ein Submit nur lokal — das Lead landet **nirgendwo**. Auch GAEB-Konverter (`src/pages/GaebKonverter.tsx:140-143`) und Kalkulator (`src/pages/Kalkulator.tsx:101-106`) haben dieselben TODOs. Wer launcht, ohne diese drei Endpoints, verliert jeden Lead.

**Lösung:** Phase 3.4 (06c §2.5) bauen — `POST /api/forms/submit` mit asynchroner Retry-Queue, eigene `form_submissions`-Tabelle als Source of Truth, Pipedrive-Push als Worker. Ohne Backend keine Launch.

**Impact:** Ohne Fix sind 100 % der Leads verloren.

---

#### P0-3 — Mobile-Nav-Button hat keine Min-Touch-Target-Größe

**Stelle:** `src/components/layout/Nav.tsx:65-73`

```tsx
<button
  type="button"
  className="md:hidden p-2 -mr-2 text-gray-700"
  ...
>
  {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
</button>
```

**Problem:** `p-2` = 8px Padding um 24px-Icon = nur **40×40 px Touch-Target**. Apple-HIG fordert 44×44, Material Design 48×48. Auf kleinen iPhones wird der Hamburger schwer zu treffen — direkter Conversion-Killer.

**Lösung:** `p-2` → `p-3` ändern (= 48×48 px). Identisch für FaqItem-Toggle (`src/components/ui/FaqItem.tsx:27-32`) — der hat **gar kein** Padding um die Klickfläche, nur `flex items-start justify-between gap-4 text-left`. Dort `py-3` ergänzen, um die ganze Reihe als Touch-Target zu nutzen.

**Impact:** Reduziert Mis-Tap-Rate um geschätzt 5–8 % auf Mobile, vor allem bei Senioren (Boss-Zielgruppe „GF, 50+").

---

#### P0-4 — `.btn` ist mit py-2 auf Mobile zu klein

**Stelle:** `src/index.css:25-27`

```css
.btn {
  @apply inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium ...;
}
```

**Problem:** `py-2` mit `text-base` ergibt etwa 36–38 px Höhe — unter 44 px. `.btn-lg` (py-3 → ~44 px) ist OK, aber alle Standard-Buttons (z. B. Pricing-Tile-CTA, Form-Weiter-Buttons) sind zu klein. Sichtbar im MultiStepForm-Footer und auf Pricing-Tiles.

**Lösung:** `.btn` von `py-2` auf `py-2.5` (40 px) anheben oder konsequent `.btn-lg` an Conversion-relevanten Stellen verwenden. Sticky-Mobile-CTA hat `py-2.5` = 38 px — das ist mit Icon zwar OK, aber knapp. **Besser:** `py-3` auf der Sticky-Bar (z. B. `src/components/StickyMobileCta.tsx:35`).

**Impact:** Hebt Mobile-Tap-Rate, vor allem bei mittleren Conversion-Buttons (Pricing-CTA → Form).

---

### P1 — Hoch (vor Launch oder direkt nach Launch)

#### P1-1 — Konditionen-Hero hat zwei nahezu identische primäre CTAs (Hero + finale CTA-Section)

**Stelle:** `src/pages/Konditionen.tsx:63-65` (Hero-CTA „Beratung vereinbaren") und `src/pages/Konditionen.tsx:156-158` (Footer-CTA „Erstgespräch vereinbaren") plus `PricingTiles` (`src/components/sections/PricingTiles.tsx:60-69`) mit drei weiteren grünen CTAs.

**Problem:** Innerhalb einer Seite sind 5 grün-pulsierende CTA-Buttons („Beratung vereinbaren", 3× „Beratung vereinbaren" auf Pricing-Karten, „Erstgespräch vereinbaren" am Schluss) — alle führen zum selben Ziel `/kontakt/`. Drei Probleme:

1. **CTA-Müdigkeit:** Visitor ist nach 3 grünen Buttons abgestumpft.
2. **Inkonsistente Sprache:** „Beratung vereinbaren" vs. „Erstgespräch vereinbaren" — gleicher Vorgang, zwei Begriffe. Wirkt unprofessionell.
3. **Zu wenig sekundärer CTA:** Auf Konditionen wäre ein „Konditions-PDF herunterladen" oder „Mit Inhaber telefonieren" als sekundäre Option naheliegend.

**Lösung:**
- Sprachvereinheitlichung: Überall „Erstgespräch vereinbaren". Ändere `PricingTiles.tsx:67` und `Konditionen.tsx:64` entsprechend. Suche+Ersetze in der ganzen Codebase.
- Konditionen-Hero: nur **einen** primären CTA + sekundären Outline-Button (z. B. „Direkt anrufen: 0681 41096430").
- Pricing-Tiles: Nur die **mittlere (Beliebt)** Karte hat einen `btn-primary`, die zwei anderen `btn-outline` — Hierarchie wird sichtbar.

**Impact:** Klarere Hierarchie, weniger Decision-Fatigue. Conversion-Lift auf Konditionen ~5–10 %.

---

#### P1-2 — MultiStepForm zeigt keine Field-Level-Validation-Errors

**Stelle:** `src/components/forms/MultiStepForm.tsx:65-67, 192-201`

```tsx
const step1Valid = data.firma && data.gewerk && ...;
// Button ist disabled wenn step1Valid false ist
<button disabled={!step1Valid} onClick={() => setStep(2)}>Weiter</button>
```

**Problem:** Wenn der User auf einem Mobile-Bildschirm scrollt, sieht er nicht, **welches** Feld fehlt. Der Weiter-Button ist disabled, aber es gibt keine Indikation, dass Feld X required ist und Feld Y nicht. Kein Pflicht-Sternchen `*`, kein Hint-Text, kein roter Rand bei Touch+Leave.

**Lösung:**
1. Pflicht-Felder mit `*` im Label markieren — `<label>Firma *</label>`. Vorschlag: zentrale `<Field required>`-Prop.
2. Bei Klick auf disabled „Weiter": Form-Validation triggern, fehlende Felder rot rahmen + Inline-Error-Text. So wie 06c §3.1 vorsah („Bitte geben Sie Ihren Firmennamen an.").
3. Telefon-Validierung als „recommended, not required" (06c sagt das explizit) — aktuell `required`.
4. `aria-invalid="true"` und `aria-describedby` auf fehlerhaften Feldern für Screenreader.

**Impact:** Reduziert Form-Abbruch (Form-Abandonment-Rate sinkt typisch um 10–15 % bei klarer Validation).

---

#### P1-3 — Form-State wird nicht persistiert (06c §8 ignoriert)

**Stelle:** `src/components/forms/MultiStepForm.tsx:56-57`

```tsx
const [data, setData] = useState<FormState>({ ...INITIAL, gewerk: defaultGewerk ?? '' });
```

**Problem:** Wenn ein Visitor Schritt 2 ausfüllt, dann den Tab schließt und 30 min später zurückkommt — alle Daten weg, muss von vorne anfangen. Mobile-User wechseln oft Apps; das ist real.

**Lösung:** localStorage-Persistence wie in 06c §8.1 spezifiziert. Mit 24h-TTL, Re-Hydrate-Banner („Anfrage von gestern weiterführen?"), Self-Cleanup bei Submit.

```tsx
useEffect(() => {
  const saved = localStorage.getItem('kalku_form_erstgespraech');
  if (saved) { /* re-hydrate, zeige Banner */ }
}, []);
useEffect(() => {
  if (step > 1) localStorage.setItem('kalku_form_erstgespraech', JSON.stringify({ data, step, ts: Date.now() }));
}, [data, step]);
```

**Impact:** Recovery-Rate um 5–8 %, vor allem mobile Multi-Touch-Tab-Switcher.

---

#### P1-4 — Self-Check Eligibility fehlt komplett (06c §3.2)

**Stelle:** Nirgendwo implementiert. `MINDESTVORAUSSETZUNGEN` aus `src/lib/constants.ts:57-61` sind als Datenstruktur vorhanden und werden in `Konditionen.tsx:120-127` als statische Tiles gerendert, aber **nicht** als interaktiver Self-Check.

**Problem:** Ohne Vor-Filter landen 1–2-Mann-Betriebe und Visitor außerhalb der Gewerke im selben Funnel wie qualifizierte Leads. Vertriebsteam siebt manuell — teuer, frustrierend. Plan in 06c sah explizit ein 4-Fragen-Widget vor mit drei Outcomes (4×Ja → Cal.com, 3×Ja → Multistep, ≤2 → Tools-Empfehlung).

**Lösung:** Neue Komponente `src/components/SelfCheckEligibility.tsx`, eingebunden auf:
- `Ablauf.tsx` (zwischen Steps und FAQ)
- `Konditionen.tsx` (statt der reinen Tiles in §MINDESTVORAUSSETZUNGEN)
- `LeistungenIndex.tsx` als CTA-Sidebar

State-Management komplett client-side, kein Backend nötig. Output = entweder Cal.com-Anchor, Multistep-Prefill oder Tool-Tile-Liste. Der `defaultGewerk`-Prop (`MultiStepForm.tsx:51-53`) wird so genutzt, wie er sollte.

**Impact:** Lead-Qualität steigt, Lost-Reason `too_small`/`no_references` sinkt. Sichtbarer Mittelpunkt für „Trust": klare Rules-of-Engagement.

---

#### P1-5 — Exit-Intent-Modal fehlt komplett (06c §6, Wireframe 0.4)

**Stelle:** Nicht implementiert. Whitepaper „7 Fehler in der VOB-Kalkulation" existiert noch nicht.

**Problem:** Bouncer (Visitor verlässt Tab) = vollständig verloren. Plan sah explizit eine Whitepaper-Capture-Möglichkeit als zweiter Conversion-Pfad vor — Recherche-Visitor (Intent A in 06c §1.1) ist die größte Visitor-Kategorie und braucht ein Vehikel, das nicht „Erstgespräch jetzt" verlangt.

**Lösung in zwei Schritten:**
1. **P1 (jetzt):** Skeleton-Komponente bauen, nur Email-Capture + DSGVO + „PDF folgt" als Honest-State. Sammelt Leads, Whitepaper-Versand kommt später.
2. **P2 (Phase 5):** Whitepaper-Inhalt liefern (8–12 Seiten PDF), Versand automatisieren.

Trigger-Logik aus 06c §6.1: `mouseleave` mit `clientY < 10`, scroll-depth ≥ 25 %, dwell ≥ 15 s, frequency-cap 30 Tage via localStorage, **nicht** auf `/tools/*` und `/kontakt/`.

**Impact:** ~2–4 % zusätzliche Lead-Capture vom Bounce-Traffic. Größter Hebel für Recherche-Phase-Visitor.

---

#### P1-6 — Tool-zu-Service-Bridge ist zu schwach

**Stelle:** `src/pages/GaebKonverter.tsx:333-348` und `src/pages/Kalkulator.tsx:264-280`

```tsx
<Link to="/konditionen/" className="btn btn-success">
  Konditionen ansehen <ArrowRight className="w-4 h-4" />
</Link>
```

**Problem:** Der Cross-CTA „Wir kalkulieren Ihre komplette Submission" verlinkt auf `/konditionen/` — nicht auf `/kontakt/`. Visitor wird einen weiteren Klick (Konditionen → CTA → Kontakt → Form) erwarten — das ist unnötig. Außerdem: identischer Wortlaut auf beiden Tool-Seiten („Wir kalkulieren Ihre komplette Submission. Ab 200 € pro LV — Festpreis. Auch über Nacht.") — wirkt boilerplate.

**Lösung:**
- Link direkt auf `/kontakt/` (Form ist auf der Seite, eine Klick weniger).
- **Kontextueller Cross-CTA pro Tool:**
  - GAEB-Konverter: „Wir bepreisen das LV, das Sie gerade hochgeladen haben — schicken Sie uns die Datei direkt."
  - Kalkulator: „Aus 5 Positionen wird eine ganze Submission — wir füllen den Rest."
- Optional: GAEB-Konverter könnte einen „Diese Datei direkt ans KALKU-Team" Button haben, der die parsed File + E-Mail in den `MultiStepForm` Schritt 2 prefüllt → reduziert Tool-zu-Lead-Friction radikal.

**Impact:** Tool-zu-Service-Conversion +30–50 % (basierend auf Branchen-Benchmark für kontextuelle Upsells).

---

#### P1-7 — `BlogPost.tsx` ist nur ein Placeholder

**Stelle:** `src/pages/BlogPost.tsx:1-16`

**Problem:** Alle 6 Blog-Post-Cards in `BlogIndex.tsx` linken auf `/blog/<slug>/`, aber jede führt zu einer Placeholder-Seite mit „Diese Seite folgt in Phase 3.3.". SEO + Trust-Killer. Visitor klickt aus der Liste, bekommt 1 Satz, geht weg.

**Lösung:** Entweder Blog-Posts in dieser Phase liefern (mindestens 2–3), oder Blog-Index hat kein Klick-Linking auf nicht-existente Posts. Stattdessen: Blog-Cards als „bald verfügbar"-Tiles mit Newsletter-Subscribe darunter. Oder Blog-Tab im Nav vor Launch verstecken.

**Impact:** Vermeidet Trust-Verlust durch leere Seiten.

---

#### P1-8 — Pricing-Tiles haben CTAs ohne Hierarchie

**Stelle:** `src/components/sections/PricingTiles.tsx:60-69`

```tsx
<Link
  to="/kontakt/"
  className={cn(
    'btn w-full justify-center',
    featured ? 'btn-primary' : 'btn-outline',
  )}
>
  Beratung vereinbaren
  <ArrowRight className="w-4 h-4" />
</Link>
```

**Problem:** „Featured" Tile (PAKET M) verwendet `btn-primary` (blau), die anderen `btn-outline` (transparent). Aber überall sonst auf der Site ist der Conversion-Button **grün** (`btn-success`). Pricing-Tile-CTA ist plötzlich blau — Visitor erkennt es nicht als „kaufen". Außerdem: identischer Wortlaut auf 3 Karten ohne Differenzierung.

**Lösung:**
- Featured-Karte: `btn-success` (grün, der Site-CTA-Standard).
- Andere zwei: `btn-outline` (Sekundär).
- Optional Wortlaut differenzieren („Einzelfall besprechen" / „PAKET M wählen" / „PAKET L anfragen") — macht jede Karte zu einer eigenen Decision.

**Impact:** Klarere Hierarchie, höhere Klickrate auf empfohlene Karte.

---

#### P1-9 — Telefon `tel:` auf Desktop ohne Fallback

**Stelle:** `src/components/layout/Footer.tsx:67-69`, `src/pages/Kontakt.tsx:42-46`, `src/pages/UeberUns.tsx:78-81`

**Problem:** Desktop-Browser verhalten sich bei `tel:`-Klick uneinheitlich (Skype-Prompt, Facetime, gar nichts). 06c §5.3 schlug `data-clipboard`-Fallback + Toast „Nummer kopiert" vor — nicht implementiert.

**Lösung:** Custom-Hook `<TelLink>` der auf Desktop einen Click-Handler addet (Copy-to-Clipboard + Toast), auf Mobile nur `tel:`-Link bleibt. Pattern:

```tsx
function TelLink({ phone, children, className }) {
  const isMobile = useMatchMedia('(max-width: 768px)');
  if (isMobile) return <a href={telHref(phone)} className={className}>{children}</a>;
  return <button onClick={() => { navigator.clipboard.writeText(phone); toast('Nummer kopiert'); }} className={className}>{children}</button>;
}
```

**Impact:** Verhindert Frust auf Desktop-Klick — kleines Feature, hoher Trust.

---

### P2 — Mittel (Phase 5+)

#### P2-1 — Sticky-Mobile-Bar erscheint zu früh und ist nicht dismissable

**Stelle:** `src/components/StickyMobileCta.tsx:14-24`

```tsx
useEffect(() => {
  function onScroll() { setVisible(window.scrollY > 400); }
  ...
}, []);
```

**Problem:**
- 400 px Scroll-Tiefe ist sehr früh (auf Mobile praktisch direkt nach dem Hero, oft nach 1.5 Bildschirmen). 06c §5.1 sah „30 % Scroll-Tiefe ODER 8 s Verweildauer" vor — beides angemessener.
- Es gibt **keine Dismiss-Option** (kein X-Button). Wenn Visitor die Bar wegklicken will, geht das nicht. 06c verlangte explizit „Schließbar via X, Re-Trigger erst nach 24 h".
- Die Bar `hidden md:hidden` ist immer auf Mobile sichtbar — kollidiert mit Tastatur-Eingaben in iOS Safari (überdeckt Form-Felder).

**Lösung:**
- Trigger ändern auf `Math.max(window.scrollY / document.body.scrollHeight, dwellSeconds / 8)` ≥ 0.3 (entspricht 06c-Spezifikation).
- X-Close-Button rechts hinzufügen mit `localStorage.setItem('kalku_sticky_dismissed_at', Date.now())`, Re-Trigger erst nach 24 h.
- Bar ausblenden, wenn `document.activeElement` ein Input/Textarea ist (verhindert Keyboard-Overlap).
- Auf `/kontakt/` deaktivieren (Visitor ist schon da).
- Position rechts neben Termin-Button: konkurrierende „Termin"-CTA in der Bar plus „Erstgespräch" im Hauptcontent ergibt zu viele Hooks.

**Impact:** Höhere User-Acceptance, weniger ärgerliche UX-Erlebnisse.

---

#### P2-2 — WhatsApp-Text ist generisch (06c §5.2 ignoriert)

**Stelle:** `src/components/StickyMobileCta.tsx:41-43`, `src/pages/Kontakt.tsx:48-49`

Aktueller Text: `"Hallo KALKU, ich habe eine Frage zu Ihrer Kalkulationsdienstleistung."` (Sticky) und `"Hallo KALKU, ich habe eine Frage."` (Kontakt)

**Problem:** 06c §5.2 sah pro Page-Context einen anderen WhatsApp-Text vor (z. B. auf `/leistungen/galabau/` → „Hallo, ich habe eine Frage zu Ihrer GaLaBau-Kalkulation: "). Das hilft dem Vertrieb, sofort zu wissen, woher der Kontakt kommt.

**Lösung:** `whatsappHref(phone, contextText)` in einen `useWhatsappContext()`-Hook wrappen, der Page-Path liest und passenden Text generiert. Mapping aus 06c §5.2 übernehmen.

**Impact:** Vertrieb startet WhatsApp-Gespräche kontextstark, Visitor muss nicht erst „Hallo, ich war auf eurer GaLaBau-Seite ..." schreiben.

---

#### P2-3 — FAQ-Strategie: Konditionen-FAQ wiederholt Pricing-Inhalt

**Stelle:** `src/pages/Konditionen.tsx:14-39`

**Problem:** Die 6 FAQ-Antworten sind sehr gut formuliert, aber:
- FAQ #1 („Wann wird die Pauschale fällig?") ist kein FAQ, sondern eine Pricing-Detail — gehört in die Pricing-Tile-Hover-Card oder in eine Footnote unter den Tiles.
- FAQ #5 („Welche Kündigungsfrist hat die Monatspauschale?") wird bereits in den Pricing-Bullets genannt („Monatlich kündbar — keine Mindestlaufzeit").
- Doppelung: Loyalität+Gebietsschutz wird im Hero, im eigenen Section-Block UND in der FAQ behandelt.

Fehlt:
- „Wie verläuft das Erstgespräch konkret? Was wird gefragt?" (häufigste First-Touch-Frage)
- „Was kostet ein typisches LV als Beispiel?" (Konkretion über Pauschalen-Range)
- „Wie schnell bekomme ich eine Rückmeldung am Wochenende?" (Zeit-Promise)

**Lösung:** FAQ neu kuratieren mit Fokus auf „nicht beantwortet im Pricing-Block". Vorschlag: 6 neue Fragen, davon 4 vom Boss validiert.

**Impact:** Reduziert kognitive Wiederholung, bessere Pre-Sales-Antworten.

---

#### P2-4 — Gewerk-Seite hat nur generische FAQ (3 Fragen, identisch)

**Stelle:** `src/pages/Gewerk.tsx:41-54` (`FAQ_GENERIC`)

**Problem:** Alle 7 Gewerk-Seiten zeigen die **gleichen** 3 FAQ-Fragen. Kein Gewerk-spezifischer Inhalt. SEO-Penalty (duplicate content), Trust-Verlust („wirken sie wirklich Spezialisten?").

**Lösung:** Pro Gewerk 3–5 spezifische FAQs in `TRADES`-Datenstruktur ergänzen. Beispiel:
- Elektro: „Können Sie BMA-Kalkulation nach DIN 14675?" / „Welche Großhändler-Preise nutzen Sie für Sonepar/Eldis-Material?"
- GaLaBau: „Pflasterflächen mit DIN 18318 — ist das in der Pauschale?"
- Schadstoff: „Asbest nach TRGS 519 — sind die KMF-Kategorien 1–3 abgedeckt?"

Dann TRADES-Type um `faqs?: { q: string; a: string }[]` erweitern.

**Impact:** SEO-Boost auf Long-Tail-Queries, Trust pro Gewerk.

---

#### P2-5 — Footer hat keine NAP-konsistente Struktur (Schema.org)

**Stelle:** `src/components/layout/Footer.tsx:42-77`

**Problem:** NAP wird gerendert, aber kein `itemScope itemType="https://schema.org/LocalBusiness"`-Markup. Schema-Graph ist auf `Home.tsx:32` als `<script type="application/ld+json">` deklariert (gut!), aber das ist nicht auf jeder Seite vorhanden — Konditionen, Kontakt etc. haben kein Schema. Local-SEO leidet.

**Lösung:** `<LocalBusinessJsonLd>`-Komponente bauen und in `Layout.tsx` global einbinden. Jede Seite bekommt das Schema „on top".

**Impact:** Local-SEO-Sichtbarkeit, Knowledge-Panel-Chancen.

---

#### P2-6 — Floating Founder-Photo-Placeholder wirkt unfertig

**Stelle:** `src/components/sections/FounderTrust.tsx:11-22`, `src/pages/UeberUns.tsx:51-60`

**Problem:** Die „AC"-Avatar-Placeholder mit Text „Foto folgt — Inhaber-Portrait wird ergänzt" steht prominent in der Hero-Section von `/ueber-uns/` und wiederholt sich im FounderTrust auf Home. Wirkt zwei Mal mehr-als-WIP. Visitor sieht: „Das ist eine Baustelle, die haben sich nicht mal die Mühe gemacht ein Foto zu machen."

**Lösung:** Echtes Foto besorgen — höchste Phase-5-Priorität für Trust-Boost. Übergangslösung: AI-generiertes anonymes Foto + Disclaimer im Alt-Tag oder weniger prominenter Avatar (Initialen ohne „Foto folgt"-Hinweis).

**Impact:** Trust-Boost direkt sichtbar.

---

#### P2-7 — Kontakt-Map ist Placeholder

**Stelle:** `src/pages/UeberUns.tsx:160-162`

```tsx
<div className="aspect-[4/3] rounded-2xl ... flex items-center justify-center border border-gray-100">
  <p className="text-sm text-gray-400">Map-Embed folgt</p>
</div>
```

**Problem:** Genauso wie Founder-Photo: stört Trust. Auch fehlt auf `Kontakt.tsx` die Map ganz.

**Lösung:** Statisches OpenStreetMap-Bild (keine JS-Map, keine Cookies) oder Cookie-Banner-konformer Mapbox-Embed. NAP-Adresse `Berliner Promenade 15, 66111 Saarbrücken` ist bekannt.

**Impact:** Local-Trust + visuelle Vollständigkeit.

---

#### P2-8 — Ablauf-Seite linked nicht auf interaktiven Self-Check (siehe P1-4)

**Stelle:** `src/pages/Ablauf.tsx`

**Problem:** Ablauf-Seite ist eine ausgezeichnete „Researching"-Visitor-Page (Intent A in 06c). Genau hier sollte der Self-Check zwischen Steps und FAQ stehen. Auch der MINDESTVORAUSSETZUNGEN-Text aus 06c §3.1 (Hint bei „1–3 MA" → Tools) fehlt im MultiStepForm.

**Lösung:** Wenn P1-4 (Self-Check) gebaut ist, hier integrieren. Zusätzlich im MultiStepForm bei Auswahl „1–3 MA": Inline-Hint („Hinweis: Wir arbeiten ab 3 Mitarbeitern, da Sie für öffentliche Ausschreibungen entsprechende Eignungsnachweise benötigen. Sie sind unsicher? → Probieren Sie unsere [kostenlosen Tools](/tools/).").

**Impact:** Self-Selection statt Vertriebs-Filter.

---

#### P2-9 — Newsletter-Form fehlt (06c §3.5)

**Stelle:** `src/pages/BlogIndex.tsx:133-144`

```tsx
<p className="text-sm text-gray-400">Newsletter-Form folgt in Phase 3.4.</p>
```

**Problem:** Researching-Visitor (Intent A) bleibt ohne Bindung. Auch im Footer fehlt Newsletter-Field.

**Lösung:** Listmonk + DOI-Form bauen (Phase 5). Übergangslösung: simple Email-Capture mit DSGVO + Hint „Newsletter folgt — wir speichern Ihre Adresse für die erste Ausgabe".

**Impact:** Recherche-Visitor in der Pipeline halten.

---

#### P2-10 — Hero-CTA-Pair benutzt zwei sehr unterschiedliche Visual-Schwergewichte

**Stelle:** `src/pages/Home.tsx:51-59`

```tsx
<Link to="/kontakt/" className="btn btn-success btn-lg">
  Erstgespräch vereinbaren <ArrowRight className="w-4 h-4" />
</Link>
<Link to="/konditionen/" className="btn btn-outline btn-lg">
  Konditionen ansehen
</Link>
```

**Problem:** Funktioniert OK — primärer grüner CTA, sekundärer Outline. Aber: „Konditionen ansehen" wird von Visitor selten geklickt, der echte Sekundär-CTA wäre „Erst die Tools probieren" (für Intent A) oder „Direkt anrufen". Die Konditionen-Seite ist nicht das, was Visitor primär sucht — er sucht **Vertrauen**.

**Lösung:** Sekundärer CTA tauschen gegen „Tools kostenlos testen" oder „0681 41096430 anrufen". A/B-Test (Phase 5) wäre hier ideal.

**Impact:** Sekundär-Conversion-Lift, vor allem bei „Researching"-Visitor.

---

## 3. Conversion-Pfad-Map (Hauptseiten)

| Seite | Primärer CTA | Sekundärer CTA | Klicks bis Lead | Bemerkung |
|---|---|---|---|---|
| `/` Home | „Erstgespräch vereinbaren" (Hero, grün) | „Konditionen ansehen" (Outline) | 2 (→ Kontakt → Form-Submit) | Klar. Sekundär könnte stärker sein (P2-10). |
| `/leistungen/` LeistungenIndex | (kein expliziter CTA in Hero) | Trade-Tile-Klick | 3 (→ Gewerk → Kontakt → Submit) | **Schwach.** Sollte Hero-CTA haben („Welches Gewerk passt? Erstgespräch."). |
| `/leistungen/<slug>/` Gewerk | „<Trade>-Submission anfragen" (grün) | „Konditionen" (Outline) | 2 | Gut. Aber `defaultGewerk`-Param wird nicht übergeben — Form startet leer. **Bug.** |
| `/ablauf/` Ablauf | Footer-CTA „Erstgespräch vereinbaren" | (keiner) | 2 | Lang scrollen. Inline-CTA nach Step 02 fehlt. |
| `/konditionen/` Konditionen | Hero + Pricing (3) + Footer = 5 grüne CTAs | (keiner als Outline) | 2 | **CTA-Müdigkeit.** Siehe P1-1, P1-8. |
| `/ueber-uns/` UeberUns | Footer-CTA „Erstgespräch vereinbaren" | Telefon (Inline) | 2 | OK. Foto-Placeholder ist Trust-Killer. |
| `/referenzen/` ReferenzenIndex | „Referenzen im Erstgespräch besprechen" | (keiner) | 2 | OK. |
| `/tools/` ToolsIndex | (kein CTA) | Tool-Tile-Klick | 4+ (→ Tool → Email-Capture → später → Sales) | **Lead-Magnet-Pfad lang.** |
| `/tools/gaeb-konverter/` GaebKonverter | „Premium-Auswertung" (Email-Capture) | „Konditionen" (Cross-CTA) | 1–2 (Email genügt) | OK. Cross-CTA zu schwach (P1-6). |
| `/tools/kalkulator/` Kalkulator | „Premium-Auswertung" (Email-Capture) | „Konditionen" | 1–2 | OK. |
| `/blog/` BlogIndex | (kein CTA — Newsletter-Placeholder) | Post-Tile-Klick (broken P1-7) | ∞ | **Tot.** Post-Pages sind Placeholder. |
| `/kontakt/` Kontakt | Multistep-Form + 3 Direkt-CTAs (Tel/WA/Mail) + Termin-Card (broken) | Telefon | 1 (Form-Submit) | **P0-1.** Termin-Card tot. |

**Erkenntnis:** Nur `Gewerk.tsx` (mit defekter Prefill, siehe Bug oben) hat Klicks-bis-Lead = 2 mit funktionalem Pfad. Tools-Pfad zur Sales = 4+ Touchpoints (zu lang ohne Self-Check). Kontakt selbst hat einen toten Termin-Card.

**Bug entdeckt:** `Gewerk.tsx:90-93` linked auf `/kontakt/` ohne Prefill-Mechanismus, obwohl `MultiStepForm` (`MultiStepForm.tsx:51-53`) einen `defaultGewerk`-Prop akzeptiert. Quick-Win: Per URL-Param `?gewerk=elektro` an `/kontakt/` linken, Kontakt liest Param und gibt ihn an Form.

---

## 4. Form-Audit (MultiStepForm)

### 4.1 Felder-Übersicht

| # | Schritt | Feld | Type | Required | 06c-Plan |
|---|---|---|---|---|---|
| 1 | 1 | Firma | text | yes | yes |
| 2 | 1 | Gewerk | select | yes | yes |
| 3 | 1 | Einzugsgebiet | text | yes | yes |
| 4 | 1 | Radius | select | yes | yes |
| 5 | 1 | Mitarbeiter | select | yes | yes |
| 6 | 2 | Vorname | text | yes | yes |
| 7 | 2 | Nachname | text | yes | yes |
| 8 | 2 | E-Mail | email | yes | yes |
| 9 | 2 | Telefon | tel | yes | **„recommended", nicht required** (06c §3.1) |
| 10 | 2 | Anfrage | textarea | optional | yes |
| 11 | 3 | DSGVO-Checkbox | checkbox | yes | yes |

**Fehlt aus 06c §3.1:**
- „Weitere Gewerke" (Multi-Select, optional) — 06c sieht es vor
- „Position im Unternehmen" (Single-Option, optional) — 06c sieht es vor
- „Submission-Termin" (Date, optional) — 06c sieht es vor
- Honeypot-Field (06c §4.1) — Spam-Schutz fehlt komplett
- UTM-Capture in Hidden-Fields (06c §7.1) — keine Attribution
- Newsletter-Opt-In auf Schritt 3 (optional, default OFF) — 06c §3.1 Schritt 3

### 4.2 Validation-Strategie

**Aktuell:**
```tsx
const step1Valid = data.firma && data.gewerk && data.einzugsgebiet && data.radius && data.mitarbeiter;
```
Nur Truthiness-Check, kein Field-Level-Feedback (siehe P1-2).

**Friction-Punkte:**
- Pflicht-Sterne `*` fehlen — User errät, was required ist (siehe P1-2).
- E-Mail-Validation via `data.email.includes('@')` ist zu schwach. RFC-5322-konformes Format-Check fehlt.
- Telefon required: zwingt User der nur per Mail kommunizieren will, eine Nummer zu erfinden. Sollte „recommended" sein.

**Error-States:**
Aktuell unsichtbar — Button bleibt einfach disabled. User-Feedback Null. Fix in P1-2 vorgeschlagen.

### 4.3 Persistence

**Aktuell:** Keine. Tab schließen = State weg. Fix in P1-3.

### 4.4 Successful-Submit-State

**Stelle:** `MultiStepForm.tsx:82-96`

```tsx
<h3>Vielen Dank, {data.vorname}!</h3>
<p>Wir haben Ihre Anfrage erhalten und melden uns innerhalb eines Werktags telefonisch unter {data.telefon}.</p>
<p>Bei dringenden Submissionen rufen Sie uns gerne direkt an.</p>
```

**Problem:** Der Backup-Pfad (Telefonnummer als klickbarer Link) fehlt. 06c §3.1 verlangte explizit „📞 +49 681 41096430" und „💬 WhatsApp"-Links als Backup. Auch Cal.com-Link „Möchten Sie direkt einen Termin vorschlagen?" fehlt.

**Lösung:** Success-State mit:
1. Bestätigung
2. „Direkt einen Termin?" → Cal.com-Link
3. „Sofort jemanden erreichen?" → tel: + WhatsApp

### 4.5 Mobile-Form

- Container `card max-w-xl mx-auto` ist mobil OK.
- Schritt-Progress visualisiert (3 Bars).
- Step 1 hat 5 Felder + 1 Sub-Grid (Radius/MA) — knapp scrollfrei auf iPhone-SE-Viewport.
- Step 2 hat 5 Felder — scrollt eine halbe Seite.
- Step 3 hat eine Zusammenfassung + Checkbox — Übersicht gut.

**Verbesserung:** Auf Step 1 könnte „Einzugsgebiet" + „Radius" zu einem Pair-Field zusammengefasst werden (`PLZ` + `Radius` als Combobox).

---

## 5. Mobile-Audit

### Was funktioniert

| Aspekt | Befund |
|---|---|
| Tailwind responsive Breakpoints | konsistent (`md:hidden` etc.) |
| Hero-Layout | Mockup wird ausgeblendet (`hidden lg:block`) — gut |
| Container-Padding | `px-4 sm:px-6 lg:px-8` — angemessen |
| Sticky-Mobile-CTA | erscheint, hat 3 Optionen (Anrufen / WhatsApp / Termin) |
| Form-Inputs | `w-full px-3 py-2` — mobile-tauglich |
| Form-Progress | Bars + Schritt-Label gut lesbar |

### Was bricht / fehlt

| # | Aspekt | Befund | Severity |
|---|---|---|---|
| M-1 | Hamburger-Touch-Target nur 40 px | `Nav.tsx:67` `p-2 -mr-2` | P0 |
| M-2 | Standard-`.btn` nur 36 px hoch | `index.css:25-27` `py-2` | P0 |
| M-3 | FaqItem-Toggle ohne Padding-Buffer | `FaqItem.tsx:27-32` | P0 |
| M-4 | Sticky-Bar erscheint zu früh (400px = ~halbe Hero) | `StickyMobileCta.tsx:17` | P2 |
| M-5 | Sticky-Bar nicht dismissable | komplett | P2 |
| M-6 | Sticky-Bar überdeckt iOS Safari Tastatur-Inputs | kein Hide-Pattern | P2 |
| M-7 | Termin-Button in Sticky-Bar zeigt auf `/kontakt/` (= ganze Seite-Reload statt Anchor zur Cal.com) | `StickyMobileCta.tsx:50` | P1 |
| M-8 | WhatsApp-Text generisch (P2-2) | überall | P2 |
| M-9 | Multistep-Form ist nicht swipe-fähig (typische Mobile-Erwartung) | komplett | P2 |
| M-10 | Pricing-Tiles auf Mobile nicht scrollbar/swipeable, sondern stapelbar | `PricingTiles.tsx:31` `grid lg:grid-cols-3` | P2 |
| M-11 | iOS Safari-Form-Fokus-Zoom (Input < 16 px Font) | `.input` hat keine explizite `font-size: 16px` | P1 |
| M-12 | tel:-Klick ohne Desktop-Fallback (P1-9) | überall | P1 |

### Trust-Signale auf Mobile (pro Hauptseite)

| Seite | Trust-Element zwischen Headline und CTA? |
|---|---|
| Home | Ja (Trust-Pills: 48h, 7 Gewerke, ab 200€) — gut |
| Konditionen | Nein — direkt Pricing-Tiles |
| Ablauf | Nein — direkt 5 Steps |
| Über uns | Inhaber-Portrait (Placeholder) |
| Referenzen | Hero-Subtitle erwähnt Loyalität — schwach |
| Tools | Nein — direkt Tool-Tiles |
| Kontakt | „kostenlos, unverbindlich" — schwach |
| Gewerk | Pricing-Eyebrow + Pill — schwach |

**Empfehlung:** Auf Konditionen, Ablauf, Tools, Kontakt jeweils einen Trust-Strip (Stats / Stars / Garantie) zwischen H1 und ersten CTA einbauen — analog zum Home-Hero.

---

## 6. Empfehlung — Top 5 Quick-Wins für Phase 5 (vor Launch)

| # | Aktion | Effort | Impact |
|---|---|---|---|
| 1 | **Backend-Endpoint `POST /api/forms/submit` bauen** + alle 3 Forms (MultiStep, GAEB, Kalkulator) verkabeln. **Ohne diesen Schritt verlierst du jeden Lead.** | 2 PT | Existential |
| 2 | **Cal.com-Embed in Kontakt.tsx** (mindestens Link-Variante als Hotfix; Inline-Embed als richtige Lösung). Sticky-Mobile-Bar-Termin-Button auf `/kontakt/#cal` linken. | 0.5 PT | +15–25 % auf Kontakt-Conversion |
| 3 | **Mobile-Touch-Targets fixen** (P0-3, P0-4): Hamburger `p-3`, `.btn` `py-2.5`, FaqItem `py-3`, Sticky-Bar `py-3`. | 0.25 PT | +5 % Mobile-Tap-Success |
| 4 | **MultiStepForm Field-Level-Validation** (P1-2): Pflicht-Sternchen, Inline-Errors bei Click, Telefon „recommended" statt required. + **Honeypot** für Spam-Schutz (`MultiStepForm.tsx:127`-Bereich, hidden input). | 1 PT | +10 % Form-Completion |
| 5 | **Gewerk-CTA-Prefill-Bug fixen**: `Gewerk.tsx:90-93` muss `?gewerk=<slug>` an `/kontakt/` weitergeben; `Kontakt.tsx` muss URL-Param lesen und an `MultiStepForm` als `defaultGewerk` übergeben. | 0.25 PT | +5 % Gewerk-zu-Lead |

**Gesamtaufwand:** ~4 Personentage. Danach ist die Site launchfähig auf einem soliden Fundament.

### Phase-5+-Roadmap (post-Launch, datengetrieben)

| # | Feature | Notiz |
|---|---|---|
| 6 | Self-Check Eligibility (P1-4) | Trennt Müll-Leads sauber, verbessert Lead-Qualität |
| 7 | Exit-Intent Whitepaper (P1-5) | Bouncer-Recovery |
| 8 | Form-Persistence (P1-3) | Recovery-Lift |
| 9 | Pro-Gewerk-FAQ (P2-4) | SEO + Trust |
| 10 | Foto + Map | Trust-Boost |
| 11 | Newsletter-Form + Listmonk | Researching-Visitor binden |
| 12 | A/B-Test-Stack (GrowthBook) | erst ab ~3.000 Visits/Variant sinnvoll |

---

## Anhang A — Code-Smells & Bug-Hinweise (geringfügig, in Quick-Wins eingebettet)

- `Konditionen.tsx:64` Wortlaut „Beratung vereinbaren" vs. Site-Standard „Erstgespräch vereinbaren" — Inkonsistenz, siehe P1-1.
- `PricingTiles.tsx:67` derselbe Inkonsistenz-Fall.
- `Gewerk.tsx:90-93` Prefill-Bug, siehe Conversion-Pfad-Map (Sektion 3, Bemerkung).
- `BlogPost.tsx` ist ein Placeholder, der 6 BlogIndex-Cards toten Linking gibt (P1-7).
- `Kontakt.tsx:62-66` Termin-Card ist optisch ein klickbares Element, aber technisch ein toter `<div>` (P0-1).
- `MultiStepForm.tsx:73-80`, `GaebKonverter.tsx:140-143`, `Kalkulator.tsx:101-106` haben alle `// TODO Phase 3.4 backend`-Marker — drei separate Endpoints zu bauen (P0-2).
- `UeberUns.tsx:51-60` und `FounderTrust.tsx:11-22` zwei identische Foto-Placeholder (P2-6).
- `UeberUns.tsx:160-162` Map-Placeholder (P2-7).
- `BlogIndex.tsx:141` Newsletter-Placeholder (P2-9).

---

**Ende des Reviews.**
