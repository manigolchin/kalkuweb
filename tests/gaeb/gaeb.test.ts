/**
 * GAEB parsers + exporter suite (50 tests) — IDs G-001..G-050.
 *
 * Targets:
 *   - src/lib/gaeb/parseXml.ts  (X81/X83/X84 + ÖNorm A2063)
 *   - src/lib/gaeb/parseAscii.ts (D81-D89)
 *   - src/lib/gaeb/parseP.ts     (P81-P94 / GAEB 2000)
 *   - src/lib/gaeb/export.ts     (csv/xlsx/json/pdf/gaeb-xml/gaeb-90)
 *
 * Environment notes:
 *   - vitest runs in `node` environment per vitest.config.ts.
 *   - parseXml.ts uses globalThis.DOMParser → polyfilled via @xmldom/xmldom in beforeAll.
 *   - export.ts uses document/URL.createObjectURL → stubbed minimally below.
 *   - PDF export is smoke-tested (no real PDF parse).
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
  parseGaebText,
  exportCsv,
  exportJson,
  exportGaebXml,
  exportGaeb90,
  exportExcel,
  exportPdf,
  DEFAULT_COLUMNS,
  type ParsedGaeb,
} from '@/lib/gaeb';

// ── DOM polyfills (test-only) ────────────────────────────────────────────────
// parseXml.ts uses globalThis.DOMParser + element.querySelector + the
// Node.TEXT_NODE / Node.ELEMENT_NODE constants. happy-dom supports all of
// these (full XML parsing including querySelector + getElementsByTagName)
// and runs cleanly in vitest's `node` environment.
beforeAll(async () => {
  const { Window } = await import('happy-dom');
  const win = new Window();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  g.DOMParser = win.DOMParser;
  g.Node = win.Node;

  // Capture every Blob the exporters try to download, so tests can read them.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__capturedBlobs = [] as Blob[];

  if (typeof document === 'undefined') {
    const anchorMock = {
      href: '',
      download: '',
      click: () => {},
      remove: () => {},
    };
    g.document = {
      createElement: (_tag: string) => ({ ...anchorMock }),
      body: { appendChild: () => {}, removeChild: () => {} },
    };
  }

  // jsPDF leans on a window-ish object; provide a minimal shim. jsPDF only
  // needs a few properties to live in a node env. navigator is read-only in
  // recent Node, so guard the assignment.
  if (typeof (globalThis as { window?: unknown }).window === 'undefined') {
    g.window = g;
  }
  if (!('navigator' in g) || g.navigator == null) {
    try {
      g.navigator = { userAgent: 'node' };
    } catch {
      // Node 22+ navigator is a read-only global — already defined, leave it.
    }
  }

  // URL.createObjectURL — wire it so exporters capture the Blob.
  const origCreate = URL.createObjectURL;
  URL.createObjectURL = (obj: Blob | MediaSource) => {
    if (obj instanceof Blob) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).__capturedBlobs.push(obj);
    }
    return 'blob://test/' + Math.random().toString(36).slice(2);
  };
  URL.revokeObjectURL = origCreate ? URL.revokeObjectURL : () => {};
});

// Convenience: drain captured blobs since last call and return them.
function takeBlobs(): Blob[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const arr = (globalThis as any).__capturedBlobs as Blob[];
  const copy = arr.slice();
  arr.length = 0;
  return copy;
}

async function blobText(b: Blob): Promise<string> {
  // Blob.text() is supported in Node 18+.
  return await b.text();
}

// ── Inline fixtures ──────────────────────────────────────────────────────────

const X83_MINIMAL = `<?xml version="1.0" encoding="utf-8"?>
<GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA83/3.2">
  <GAEBInfo>
    <Version>3.2</Version>
    <Date>2026-05-01</Date>
  </GAEBInfo>
  <PrjInfo>
    <NamePrj>Schulneubau Musterstadt</NamePrj>
    <Cur>EUR</Cur>
  </PrjInfo>
  <Award>
    <DP>83</DP>
    <OWN><Address><Name1>Stadt Musterstadt</Name1></Address></OWN>
    <BoQ>
      <BoQInfo><Name>LV Rohbau</Name></BoQInfo>
      <BoQBody>
        <BoQCtgy RNoPart="01">
          <LblTx>Erdarbeiten</LblTx>
          <BoQBody>
            <Itemlist>
              <Item RNoPart="001">
                <Qty>120,000</Qty>
                <QU>m3</QU>
                <Description>
                  <CompleteText>
                    <OutlineText><OutlTxt><TextOutlTxt><span>Oberboden abtragen</span></TextOutlTxt></OutlTxt></OutlineText>
                    <DetailTxt><Text><p><span>Mutterboden abtragen, lagern,</span></p><p><span>seitlich auf der Baustelle.</span></p></Text></DetailTxt>
                  </CompleteText>
                </Description>
              </Item>
              <Item RNoPart="002" Bedarfsposition="Yes">
                <Qty>50,000</Qty>
                <QU>m2</QU>
                <Description><CompleteText>
                  <OutlineText><OutlTxt><TextOutlTxt><span>Bedarfsposition Bodentausch</span></TextOutlTxt></OutlTxt></OutlineText>
                </CompleteText></Description>
              </Item>
              <Item RNoPart="003" Wahlposition="Yes">
                <Qty>10,000</Qty>
                <QU>St</QU>
                <Description><CompleteText>
                  <OutlineText><OutlTxt><TextOutlTxt><span>Wahlposition</span></TextOutlTxt></OutlTxt></OutlineText>
                </CompleteText></Description>
              </Item>
              <Item RNoPart="004" Eventualposition="Yes">
                <Qty>5,000</Qty>
                <QU>St</QU>
                <Description><CompleteText>
                  <OutlineText><OutlTxt><TextOutlTxt><span>Eventualposition</span></TextOutlTxt></OutlTxt></OutlineText>
                </CompleteText></Description>
              </Item>
              <Item RNoPart="005" Zuschlagsposition="Yes">
                <Qty>1,000</Qty>
                <QU>%</QU>
                <Description><CompleteText>
                  <OutlineText><OutlTxt><TextOutlTxt><span>Zuschlagsposition</span></TextOutlTxt></OutlTxt></OutlineText>
                </CompleteText></Description>
              </Item>
              <Item RNoPart="006">
                <QtyTBD>Yes</QtyTBD>
                <QU>m2</QU>
                <Description><CompleteText>
                  <OutlineText><OutlTxt><TextOutlTxt><span>Menge offen</span></TextOutlTxt></OutlTxt></OutlineText>
                </CompleteText></Description>
              </Item>
            </Itemlist>
          </BoQBody>
        </BoQCtgy>
      </BoQBody>
    </BoQ>
  </Award>
</GAEB>`;

const X84_WITH_PRICES = `<?xml version="1.0" encoding="utf-8"?>
<GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA84/3.2">
  <GAEBInfo><Version>3.2</Version></GAEBInfo>
  <PrjInfo><NamePrj>Angebot Beispiel</NamePrj><Cur>EUR</Cur></PrjInfo>
  <Award>
    <DP>84</DP>
    <Bidder><Address><Name1>Mustermann Bau GmbH</Name1></Address></Bidder>
    <BoQ>
      <BoQBody>
        <Itemlist>
          <Item RNoPart="001">
            <Qty>10,000</Qty>
            <QU>m3</QU>
            <UP>50,00</UP>
            <IT>500,00</IT>
            <Description><CompleteText>
              <OutlineText><OutlTxt><TextOutlTxt><span>Position Eins</span></TextOutlTxt></OutlTxt></OutlineText>
            </CompleteText></Description>
          </Item>
          <Item RNoPart="002">
            <Qty>4,000</Qty>
            <QU>St</QU>
            <UP>25,00</UP>
            <IT>100,00</IT>
            <Description><CompleteText>
              <OutlineText><OutlTxt><TextOutlTxt><span>Position Zwei</span></TextOutlTxt></OutlTxt></OutlineText>
            </CompleteText></Description>
          </Item>
        </Itemlist>
      </BoQBody>
    </BoQ>
  </Award>
</GAEB>`;

const X81_MINIMAL = `<?xml version="1.0" encoding="utf-8"?>
<GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA81/3.2">
  <GAEBInfo><Version>3.2</Version></GAEBInfo>
  <PrjInfo><NamePrj>X81 Test</NamePrj></PrjInfo>
  <Award>
    <DP>81</DP>
    <BoQ><BoQBody><Itemlist>
      <Item RNoPart="001">
        <Qty>1,000</Qty><QU>St</QU>
        <Description><CompleteText>
          <OutlineText><OutlTxt><TextOutlTxt><span>X81-Pos</span></TextOutlTxt></OutlTxt></OutlineText>
        </CompleteText></Description>
      </Item>
    </Itemlist></BoQBody></BoQ>
  </Award>
</GAEB>`;

const X83_EMPTY_BOQ = `<?xml version="1.0" encoding="utf-8"?>
<GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA83/3.2">
  <GAEBInfo><Version>3.2</Version></GAEBInfo>
  <PrjInfo><NamePrj>Leeres LV</NamePrj></PrjInfo>
  <Award>
    <DP>83</DP>
    <BoQ><BoQBody></BoQBody></BoQ>
  </Award>
</GAEB>`;

const X83_NESTED_GROUPS = `<?xml version="1.0" encoding="utf-8"?>
<GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA83/3.2">
  <GAEBInfo><Version>3.2</Version></GAEBInfo>
  <PrjInfo><NamePrj>Nested</NamePrj></PrjInfo>
  <Award><DP>83</DP><BoQ><BoQBody>
    <BoQCtgy RNoPart="01"><LblTx>Bauwerk</LblTx><BoQBody>
      <BoQCtgy RNoPart="01"><LblTx>EG</LblTx><BoQBody>
        <BoQCtgy RNoPart="01"><LblTx>Foyer</LblTx><BoQBody>
          <Itemlist>
            <Item RNoPart="001">
              <Qty>2,000</Qty><QU>m2</QU>
              <Description><CompleteText>
                <OutlineText><OutlTxt><TextOutlTxt><span>Tiefe Position</span></TextOutlTxt></OutlTxt></OutlineText>
              </CompleteText></Description>
            </Item>
          </Itemlist>
        </BoQBody></BoQCtgy>
      </BoQBody></BoQCtgy>
    </BoQBody></BoQCtgy>
  </BoQBody></BoQ></Award>
</GAEB>`;

const ONORM_A2063 = `<?xml version="1.0" encoding="utf-8"?>
<ON-LB xmlns="http://www.austrostandards.at/A2063" OENorm="A2063">
  <KGGL PosNr="01">
    <Bezeichnung>Hauptgruppe</Bezeichnung>
    <LG PosNr="0101">
      <Bezeichnung>Leistungsgruppe</Bezeichnung>
      <ULG PosNr="010101">
        <Bezeichnung>Untergruppe</Bezeichnung>
        <GL PosNr="01010101">
          <Bezeichnung>Grundleistung</Bezeichnung>
        </GL>
      </ULG>
    </LG>
  </KGGL>
  <Position PosNr="01010101A">
    <Stichwort>ÖNorm Position</Stichwort>
    <Langtext>Eine Position mit Langtext</Langtext>
    <PosMenge>15,500</PosMenge>
    <ME>m2</ME>
    <EP>20,00</EP>
    <GP>310,00</GP>
  </Position>
  <Datum>2026-05-15</Datum>
  <Waehrung>EUR</Waehrung>
</ON-LB>`;

// ── ASCII (GAEB-90) record builders ─────────────────────────────────────────
// After stripping the leading 2-char code (`21`/`11`/...), the layout for a
// position record `rest` (0-indexed slices) is:
//   oz      [0..9)    9 chars
//   flags   [9..12)   3 chars
//   filler  [12..23) 11 chars
//   menge   [23..37) 14 chars (digits, 3 implicit decimals)
//   einheit [37..41)  4 chars
//   ep      [41..55) 14 chars (digits, 2 implicit decimals)
//   gp      [55..69) 14 chars (digits, 2 implicit decimals)
function pad(s: string, n: number) { return s.padEnd(n, ' ').slice(0, n); }
function num14(n: number, decimals: number): string {
  return Math.round(n * Math.pow(10, decimals)).toString().padStart(14, '0');
}
// Real GAEB-90 lines always carry a 6-digit line number at cols 75-80. parseAscii
// strips it via `.replace(/\s*\d{6}\s*$/, '')`. We append a fake line number
// so the regex doesn't chop the GP field (which itself is all digits).
let __lineNo = 1;
function lineNo(): string { return String(__lineNo++).padStart(6, '0'); }
function pos21(opts: {
  oz: string;
  flags?: string;
  menge?: number; // human number (e.g. 120 means 120 m3)
  einheit?: string;
  ep?: number;
  gp?: number;
  qtyTBD?: boolean;
}): string {
  const oz = pad(opts.oz, 9);
  const flags = pad(opts.flags ?? 'NNN', 3);
  const filler = pad('', 11);
  let menge: string;
  if (opts.qtyTBD) {
    menge = pad('X', 14);
  } else if (opts.menge == null) {
    menge = pad('', 14);
  } else {
    menge = num14(opts.menge, 3);
  }
  const einheit = pad(opts.einheit ?? '', 4);
  const ep = opts.ep == null ? pad('', 14) : num14(opts.ep, 2);
  const gp = opts.gp == null ? pad('', 14) : num14(opts.gp, 2);
  // Pad to 74 then append a 6-digit line number, matching real GAEB-90 layout.
  const core = '21' + oz + flags + filler + menge + einheit + ep + gp;
  return core.padEnd(74, ' ') + lineNo();
}

const D83_MINIMAL = [
  // raw lines without line-number suffix; parseAscii strips a trailing 6-digit
  // line number if present, but accepts lines without one too.
  '00        83L                                                 1122PPP009',
  '01Beispielprojekt Rohbau                  20260501',
  '02Beispielprojekt Rohbau',
  '03Stadt Muster',
  '11010      ',
  '12   Erdarbeiten',
  pos21({ oz: '01001', menge: 120, einheit: 'm3' }),
  '25   Oberboden abtragen',
  '26   Mutterboden abtragen,',
  '26   lagern auf der Baustelle.',
  pos21({ oz: '01002', flags: 'BNN', menge: 50, einheit: 'm2' }),
  '25   Bedarfsposition',
  '99',
].join('\n');

const D84_WITH_PRICES = [
  '00        84L                                                 1122PPP009',
  '02Angebot Test',
  pos21({ oz: '01001', menge: 10, einheit: 'm3', ep: 50, gp: 500 }),
  '25   Position Eins',
  pos21({ oz: '01002', menge: 4, einheit: 'St', ep: 25, gp: 100 }),
  '25   Position Zwei',
  '99',
].join('\n');

const D83_QTYTBD = [
  '00        83L                                                 1122PPP009',
  '02QtyTbd Test',
  pos21({ oz: '01001', qtyTBD: true, einheit: 'm2' }),
  '25   Menge offen',
  '99',
].join('\n');

const D83_WITH_UMLAUTS = [
  '00        83L                                                 1122PPP009',
  '02Straße & Brücke Test',
  '11010      ',
  '12   Erdarbeiten für Straße',
  pos21({ oz: '01001', menge: 10, einheit: 'm2' }),
  '25   Fläche säubern, prüfen, übergeben',
  '99',
].join('\n');

const P83_MINIMAL = `#begin[GAEB]
#begin[GAEBInfo]
[Datum]2026-05-01[end]
#end[GAEBInfo]
#begin[PrjInfo]
[Name]Pseudo Projekt[end]
[Wae]EUR[end]
#end[PrjInfo]
#begin[Vergabe]
[DP]83[end]
#begin[LV]
#begin[LVInfo]
[Datum]2026-05-01[end]
#end[LVInfo]
#begin[LVBereich]
[OZ]01[end]
[BezTx]Erdarbeiten[end]
#begin[Position]
[OZ]01001[end]
[Menge]120,000[end]
[ME]m3[end]
#begin[Beschreibung]
[Kurztext]Oberboden abtragen[end]
[Langtext]Mutterboden abtragen, lagern.[end]
#end[Beschreibung]
#end[Position]
#begin[Position]
[OZ]01002[end]
[FrMenge]J[end]
[Menge]0[end]
[ME]m2[end]
#begin[Beschreibung]
[Kurztext]Frei Menge[end]
#end[Beschreibung]
#end[Position]
#end[LVBereich]
#end[LV]
#end[Vergabe]
#end[GAEB]
`;

const P84_WITH_PRICES = `#begin[GAEB]
#begin[PrjInfo]
[Name]Angebot Pseudo[end]
[Wae]EUR[end]
#end[PrjInfo]
#begin[Vergabe]
[DP]84[end]
#begin[LV]
#begin[LVBereich]
[OZ]01[end]
[BezTx]Hauptgruppe[end]
#begin[Position]
[OZ]01001[end]
[Menge]10,000[end]
[ME]m3[end]
[EP]50,00[end]
[GB]500,00[end]
#begin[Beschreibung]
[Kurztext]Position Eins[end]
#end[Beschreibung]
#end[Position]
#begin[Position]
[OZ]01002[end]
[Menge]4,000[end]
[ME]St[end]
[EP]25,00[end]
[GB]100,00[end]
#begin[Beschreibung]
[Kurztext]Position Zwei[end]
#end[Beschreibung]
#end[Position]
#end[LVBereich]
#end[LV]
#end[Vergabe]
#end[GAEB]
`;

const P94_MINIMAL = `#begin[GAEB]
#begin[PrjInfo]
[Name]P94 Nachtrag[end]
[Wae]EUR[end]
#end[PrjInfo]
#begin[Vergabe]
[DP]94[end]
#begin[LV]
#begin[LVBereich]
[OZ]01[end]
[BezTx]Nachtragspositionen[end]
#begin[Position]
[OZ]01001N[end]
[Menge]3,000[end]
[ME]St[end]
[EP]100,00[end]
[GB]300,00[end]
#begin[Beschreibung]
[Kurztext]Nachtragsposition[end]
#end[Beschreibung]
#end[Position]
#end[LVBereich]
#end[LV]
#end[Vergabe]
#end[GAEB]
`;

const P_NAN_INPUT = `#begin[GAEB]
#begin[PrjInfo]
[Name]NaN Guard[end]
#end[PrjInfo]
#begin[Vergabe]
[DP]84[end]
#begin[LV]
#begin[LVBereich]
[OZ]01[end]
[BezTx]Test[end]
#begin[Position]
[OZ]01001[end]
[Menge]abc[end]
[ME]St[end]
[EP]xyz[end]
#begin[Beschreibung]
[Kurztext]Garbage Numbers[end]
#end[Beschreibung]
#end[Position]
#end[LVBereich]
#end[LV]
#end[Vergabe]
#end[GAEB]
`;

const parse = (text: string, name: string, ext: string) =>
  parseGaebText(text, name, text.length, ext, 'auto');

// =============================================================================
// 3A. parseXml — X81/X83/X84 + ÖNorm (G-001..G-020)
// =============================================================================
describe('3A. parseXml — X81/X83/X84 + ÖNorm', () => {
  it('G-001 X83 minimal fixture parses', () => {
    const p = parse(X83_MINIMAL, 'test.x83', 'x83');
    expect(p.format).toMatch(/^gaeb-xml-3\./);
    expect(p.projectName).toBe('Schulneubau Musterstadt');
    expect(p.positionCount).toBeGreaterThan(0);
  });

  it('G-002 X83 — positions extracted with oz/kurztext/menge/einheit', () => {
    const p = parse(X83_MINIMAL, 'test.x83', 'x83');
    const first = p.positions[0];
    expect(first.oz).toContain('001');
    expect(first.kurztext).toBe('Oberboden abtragen');
    expect(first.menge).toBeCloseTo(120, 3);
    expect(first.einheit).toBe('m3');
  });

  it('G-003 X83 — langtext multiline preserved (paragraph breaks)', () => {
    const p = parse(X83_MINIMAL, 'test.x83', 'x83');
    const first = p.positions[0];
    expect(first.langtext).toContain('Mutterboden abtragen');
    expect(first.langtext).toContain('seitlich auf der Baustelle');
    // paragraph break preserved as a newline
    expect(first.langtext).toMatch(/\n/);
  });

  it('G-004 X83 — groups (BoQCtgy) populated', () => {
    const p = parse(X83_MINIMAL, 'test.x83', 'x83');
    expect(p.groups.length).toBeGreaterThan(0);
    expect(p.groups.some((g) => g.label === 'Erdarbeiten')).toBe(true);
  });

  it('G-005 X83 — bedarfsposition flag detected', () => {
    const p = parse(X83_MINIMAL, 'test.x83', 'x83');
    const bed = p.positions.find((x) => x.pos === '002');
    expect(bed?.bedarfsposition).toBe(true);
  });

  it('G-006 X83 — wahlposition flag detected', () => {
    const p = parse(X83_MINIMAL, 'test.x83', 'x83');
    const wahl = p.positions.find((x) => x.pos === '003');
    expect(wahl?.wahlposition).toBe(true);
  });

  it('G-007 X83 — eventualposition flag detected', () => {
    const p = parse(X83_MINIMAL, 'test.x83', 'x83');
    const ev = p.positions.find((x) => x.pos === '004');
    expect(ev?.eventualposition).toBe(true);
  });

  it('G-008 X83 — zuschlagsposition flag detected', () => {
    const p = parse(X83_MINIMAL, 'test.x83', 'x83');
    const zu = p.positions.find((x) => x.pos === '005');
    expect(zu?.zuschlagsposition).toBe(true);
  });

  it('G-009 X83 — qtyTBD when QtyTBD=Yes set', () => {
    const p = parse(X83_MINIMAL, 'test.x83', 'x83');
    const tbd = p.positions.find((x) => x.pos === '006');
    expect(tbd?.qtyTBD).toBe(true);
  });

  it('G-010 X84 — estimated value sum from <IT> across all items', () => {
    const p = parse(X84_WITH_PRICES, 'angebot.x84', 'x84');
    expect(p.estimatedValue).toBeCloseTo(600, 2);
  });

  it('G-011 X84 — EP and GP extracted from <UP>/<IT>', () => {
    const p = parse(X84_WITH_PRICES, 'angebot.x84', 'x84');
    const a = p.positions[0];
    expect(a.ep).toBeCloseTo(50, 2);
    expect(a.gp).toBeCloseTo(500, 2);
  });

  it('G-012 X84 — bidder field captured', () => {
    const p = parse(X84_WITH_PRICES, 'angebot.x84', 'x84');
    expect(p.bidder).toBe('Mustermann Bau GmbH');
  });

  it('G-013 X81 — same shape as X83 (no prices yet)', () => {
    const p = parse(X81_MINIMAL, 'lv.x81', 'x81');
    expect(p.format).toMatch(/^gaeb-xml-3\./);
    expect(p.positions[0].kurztext).toBe('X81-Pos');
    expect(p.positions[0].ep).toBeUndefined();
  });

  it('G-014 ÖNorm — A2063 detection', () => {
    const p = parse(ONORM_A2063, 'lv.onlv', 'onlv');
    expect(p.format).toBe('onorm-a2063');
  });

  it('G-015 ÖNorm — Lg / Lggr-family groups populated (regression)', () => {
    const p = parse(ONORM_A2063, 'lv.onlv', 'onlv');
    expect(p.groups.length).toBeGreaterThanOrEqual(4);
    const labels = p.groups.map((g) => g.label);
    expect(labels).toContain('Hauptgruppe');
    expect(labels).toContain('Leistungsgruppe');
    expect(labels).toContain('Untergruppe');
    expect(labels).toContain('Grundleistung');
  });

  it('G-016 malformed XML → format unknown, no crash', () => {
    const p = parse('<not-xml<<<', 'broken.x83', 'x83');
    // Implementation policy: parser tolerates parse errors by returning empty,
    // and sniffFormat marks ext-based gaeb-xml-3.2 unless content is empty.
    expect(p.positionCount).toBe(0);
    // format will be 'unknown' or 'gaeb-xml-3.2' (kept from sniff)
    expect(['unknown', 'gaeb-xml-3.2']).toContain(p.format);
  });

  it('G-017 empty BoQ → 0 positions', () => {
    const p = parse(X83_EMPTY_BOQ, 'leer.x83', 'x83');
    expect(p.positionCount).toBe(0);
    expect(p.projectName).toBe('Leeres LV');
  });

  it('G-018 nested groups extract leaf position', () => {
    const p = parse(X83_NESTED_GROUPS, 'nested.x83', 'x83');
    expect(p.positions.length).toBe(1);
    expect(p.positions[0].kurztext).toBe('Tiefe Position');
    expect(p.groups.length).toBeGreaterThanOrEqual(3);
  });

  it('G-019 currency defaults to EUR', () => {
    const p = parse(X81_MINIMAL, 'lv.x81', 'x81');
    expect(p.currency).toBe('EUR');
  });

  it('G-020 estimatedValue ignores NaN positions (regression guard)', () => {
    // A doc with a non-numeric <IT> shouldn't poison the total.
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA84/3.2">
  <PrjInfo><NamePrj>NaN Guard</NamePrj></PrjInfo>
  <Award><DP>84</DP><BoQ><BoQBody><Itemlist>
    <Item RNoPart="001"><Qty>1,000</Qty><QU>St</QU><UP>10,00</UP><IT>10,00</IT>
      <Description><CompleteText>
        <OutlineText><OutlTxt><TextOutlTxt><span>Gut</span></TextOutlTxt></OutlTxt></OutlineText>
      </CompleteText></Description>
    </Item>
    <Item RNoPart="002"><Qty>x</Qty><QU>St</QU><UP>abc</UP><IT>xyz</IT>
      <Description><CompleteText>
        <OutlineText><OutlTxt><TextOutlTxt><span>Garbage</span></TextOutlTxt></OutlTxt></OutlineText>
      </CompleteText></Description>
    </Item>
  </Itemlist></BoQBody></BoQ></Award>
</GAEB>`;
    const p = parse(xml, 'g.x84', 'x84');
    expect(p.estimatedValue).toBeDefined();
    expect(Number.isFinite(p.estimatedValue!)).toBe(true);
    expect(p.estimatedValue).toBeCloseTo(10, 2);
  });
});

// =============================================================================
// 3B. parseAscii — D81/D83/D84/D89 (G-021..G-035)
// =============================================================================
describe('3B. parseAscii — D81/D83/D84', () => {
  it('G-021 D83 minimal parses without throwing', () => {
    const p = parse(D83_MINIMAL, 'lv.d83', 'd83');
    expect(p.format).toBe('gaeb-90');
    expect(p.positionCount).toBeGreaterThan(0);
  });

  it('G-022 D83 — positions extracted with oz/kurztext/menge/einheit', () => {
    const p = parse(D83_MINIMAL, 'lv.d83', 'd83');
    const first = p.positions[0];
    expect(first.oz).toBe('01001');
    expect(first.kurztext).toBe('Oberboden abtragen');
    expect(first.menge).toBeCloseTo(120, 3);
    expect(first.einheit).toBe('m3');
  });

  it('G-023 D83 — langtext joined across continuation lines', () => {
    const p = parse(D83_MINIMAL, 'lv.d83', 'd83');
    const first = p.positions[0];
    expect(first.langtext).toContain('Mutterboden abtragen');
    expect(first.langtext).toContain('lagern auf der Baustelle');
  });

  it('G-024 D84 — EP/GP extracted from 21-record price slots', () => {
    const p = parse(D84_WITH_PRICES, 'angebot.d84', 'd84');
    const first = p.positions[0];
    expect(first.ep).toBeCloseTo(50, 2);
    expect(first.gp).toBeCloseTo(500, 2);
  });

  it('G-025 D89 (Aufmaß) — basic position lines tolerated', () => {
    const d89 = [
      '00        89L                                                 1122PPP009',
      '02Aufmass-Test',
      pos21({ oz: '01001', menge: 5, einheit: 'm' }),
      '25   Aufmass-Pos',
      '99',
    ].join('\n');
    const p = parse(d89, 'auf.d89', 'd89');
    expect(p.format).toBe('gaeb-90');
    expect(p.positions[0].oz).toBe('01001');
    expect(p.positions[0].menge).toBeCloseTo(5, 3);
  });

  it('G-026 Group lines (11/12) → entries in groups[]', () => {
    const p = parse(D83_MINIMAL, 'lv.d83', 'd83');
    expect(p.groups.length).toBeGreaterThan(0);
    expect(p.groups[0].label).toBe('Erdarbeiten');
  });

  it('G-027 Encoding — UTF-8 with German umlauts round-trips intact', () => {
    const p = parse(D83_WITH_UMLAUTS, 'um.d83', 'd83');
    expect(p.projectName).toContain('Straße');
    expect(p.projectName).toContain('Brücke');
    expect(p.groups[0]?.label).toBe('Erdarbeiten für Straße');
    expect(p.positions[0]?.kurztext).toContain('Fläche');
    expect(p.positions[0]?.kurztext).toContain('prüfen');
  });

  it('G-028 Encoding — Win-1252 fallback path lives in readFileAsText', () => {
    // The fallback decoder lives in parse.ts → readFileAsText, which only runs
    // through parseGaebFile(File). We can't test the FileReader path from
    // node, but the heuristic is text-based: if the string contains �
    // (replacement chars), it would trigger fallback in the File path. We
    // verify parseGaebText itself does NOT mangle Win-1252 already-decoded
    // strings (since the caller passes already-decoded text).
    const txt = D83_WITH_UMLAUTS; // pre-decoded as utf-8
    const p = parse(txt, 'um.d83', 'd83');
    expect(p.projectName).not.toContain('�');
  });

  it('G-029 Whitespace tolerance — trailing spaces stripped from fields', () => {
    const p = parse(D83_MINIMAL, 'lv.d83', 'd83');
    expect(p.positions[0].einheit).toBe('m3'); // no trailing space
    expect(p.positions[0].kurztext.trim()).toBe(p.positions[0].kurztext);
  });

  it('G-030 NaN propagation to total guarded (no NaN estimatedValue)', () => {
    // Inject a bogus 21-record where the menge field is non-digit garbage.
    const bad = [
      '00        83L                                                 1122PPP009',
      '02Test',
      '2101001    NNN         00000010000m2                                          ',
      '25   Gute Position',
      '2101002    NNN         garbagegarbagm2              garbagegarbgarbageGarbag',
      '25   Schlechte Position',
      '99',
    ].join('\n');
    const p = parse(bad, 'b.d83', 'd83');
    expect(p.estimatedValue === undefined || Number.isFinite(p.estimatedValue)).toBe(true);
  });

  it('G-031 Position with X-filled menge → qtyTBD', () => {
    const p = parse(D83_QTYTBD, 'tbd.d83', 'd83');
    const first = p.positions[0];
    expect(first.qtyTBD).toBe(true);
    expect(first.menge).toBeUndefined();
  });

  it('G-032 OZ digits-only preserved (no padding mangling)', () => {
    const p = parse(D83_MINIMAL, 'lv.d83', 'd83');
    expect(p.positions[0].oz).toMatch(/^[0-9]+$/);
  });

  it('G-033 Empty text → 0 positions, no throw', () => {
    const p = parse('', 'empty.d83', 'd83');
    expect(p.positionCount).toBe(0);
  });

  it('G-034 Garbage extension w/o GAEB content → format=unknown', () => {
    const p = parse('Hello world!\nNot a GAEB file at all.', 'foo.txt', 'txt');
    expect(p.format).toBe('unknown');
  });

  it('G-035 Blank lines tolerated', () => {
    const withBlanks = D83_MINIMAL.split('\n').flatMap((l) => [l, '']).join('\n');
    const p = parse(withBlanks, 'lv.d83', 'd83');
    expect(p.positionCount).toBeGreaterThan(0);
    expect(p.positions[0].kurztext).toBe('Oberboden abtragen');
  });
});

// =============================================================================
// 3C. parseP — P81/P84/P94 (G-036..G-045)
// =============================================================================
describe('3C. parseP — P81/P84/P94 (GAEB 2000)', () => {
  it('G-036 P83 (P81-family) parses', () => {
    const p = parse(P83_MINIMAL, 'lv.p83', 'p83');
    expect(p.format).toBe('gaeb-2000');
    expect(p.projectName).toBe('Pseudo Projekt');
    expect(p.positionCount).toBeGreaterThan(0);
  });

  it('G-037 P84 — EP extracted', () => {
    const p = parse(P84_WITH_PRICES, 'a.p84', 'p84');
    const first = p.positions[0];
    expect(first.ep).toBeCloseTo(50, 2);
    expect(first.gp).toBeCloseTo(500, 2);
  });

  it('G-038 P94 (Nachtrag) parses', () => {
    const p = parse(P94_MINIMAL, 'n.p94', 'p94');
    expect(p.format).toBe('gaeb-2000');
    expect(p.positions[0].oz).toBe('01001N');
  });

  it('G-039 NaN guard — non-numeric menge/ep do NOT poison total', () => {
    const p = parse(P_NAN_INPUT, 'nan.p84', 'p84');
    expect(p.estimatedValue === undefined || Number.isFinite(p.estimatedValue)).toBe(true);
    // The single bogus position should not produce a finite ep/gp
    const pos = p.positions[0];
    if (pos) {
      expect(pos.ep === undefined || Number.isFinite(pos.ep)).toBe(true);
      expect(pos.menge === undefined || Number.isFinite(pos.menge)).toBe(true);
      expect(pos.gp === undefined || Number.isFinite(pos.gp)).toBe(true);
    }
  });

  it('G-040 Group context preserved (LVBereich → groups[])', () => {
    const p = parse(P83_MINIMAL, 'lv.p83', 'p83');
    expect(p.groups.length).toBeGreaterThan(0);
    expect(p.groups[0].label).toBe('Erdarbeiten');
    expect(p.groups[0].oz).toBe('01');
  });

  it('G-041 Currency parsed from [Wae]', () => {
    const p = parse(P83_MINIMAL, 'lv.p83', 'p83');
    expect(p.currency).toBe('EUR');
  });

  it('G-042 FrMenge=J → qtyTBD on position', () => {
    const p = parse(P83_MINIMAL, 'lv.p83', 'p83');
    const tbd = p.positions.find((x) => x.oz === '01002');
    expect(tbd?.qtyTBD).toBe(true);
  });

  it('G-043 Position count matches fixture', () => {
    const p = parse(P83_MINIMAL, 'lv.p83', 'p83');
    expect(p.positionCount).toBe(2);
    const p84 = parse(P84_WITH_PRICES, 'a.p84', 'p84');
    expect(p84.positionCount).toBe(2);
  });

  it('G-044 estimatedValue is finite (no NaN)', () => {
    const p = parse(P84_WITH_PRICES, 'a.p84', 'p84');
    expect(p.estimatedValue).toBeDefined();
    expect(Number.isFinite(p.estimatedValue!)).toBe(true);
    expect(p.estimatedValue).toBeCloseTo(600, 2);
  });

  it('G-045 Empty P-file → 0 positions, no throw', () => {
    const empty = '#begin[GAEB]\n#begin[PrjInfo]\n[Name]Empty[end]\n#end[PrjInfo]\n#end[GAEB]\n';
    const p = parse(empty, 'e.p83', 'p83');
    expect(p.positionCount).toBe(0);
    expect(p.projectName).toBe('Empty');
  });
});

// =============================================================================
// 3D. Exporter — CSV / XLSX / GAEB-XML / GAEB-90 / PDF / JSON (G-046..G-050)
// =============================================================================
describe('3D. Exporter (csv/xlsx/json/pdf/gaeb-xml/gaeb-90)', () => {
  const sample: ParsedGaeb = {
    filename: 'sample.x83',
    size: 1000,
    format: 'gaeb-xml-3.2',
    formatLabel: 'GAEB DA XML 3.2',
    projectName: 'Test Projekt',
    awardingAuthority: 'Stadt Test',
    currency: 'EUR',
    positionCount: 2,
    positions: [
      {
        oz: '01.001',
        pos: '01.001',
        kurztext: 'Erste Position',
        langtext: 'Zeile eins\nZeile zwei\nZeile drei',
        einheit: 'm3',
        menge: 10,
        ep: 50,
        gp: 500,
        level: 0,
        type: 'item',
      },
      {
        oz: '01.002.003.004.005', // 15-digit-equivalent → will trigger truncation warning in GAEB-90 export
        pos: '01.002.003.004.005',
        kurztext: 'Zweite Position',
        langtext: 'Kurze Beschreibung',
        einheit: 'St',
        menge: 4,
        ep: 25,
        gp: 100,
        level: 0,
        type: 'item',
      },
    ],
    groups: [{ oz: '01', label: 'Hauptgruppe', level: 0 }],
    estimatedValue: 600,
    hasLongtext: true,
  };

  it('G-046 CSV — CRLF lines + multi-line langtext preserved inside quoted field', async () => {
    takeBlobs();
    exportCsv(sample, {
      textMode: 'both',
      columns: { ...DEFAULT_COLUMNS, langtext: true },
    });
    const blobs = takeBlobs();
    expect(blobs.length).toBe(1);
    const text = await blobText(blobs[0]);
    // BOM check via raw bytes — Blob.text() strips the BOM during decoding,
    // so we inspect the underlying bytes directly.
    const bytes = new Uint8Array(await blobs[0].arrayBuffer());
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);

    // CRLF separates rows
    expect(text).toContain('\r\n');
    // Header columns
    expect(text).toMatch(/OZ;Kurztext;Langtext;Einheit;Menge;EP;GP/);
    // Langtext embedded newlines preserved inside quotes (literal LF inside "...")
    expect(text).toMatch(/"Zeile eins\nZeile zwei\nZeile drei"/);
    // SUMME row at end
    expect(text).toContain('SUMME netto');
  });

  it('G-047 GAEB-90 export — OZ truncation warns via console.warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    takeBlobs();
    try {
      exportGaeb90(sample);
    } finally {
      const calls = spy.mock.calls.map((c) => String(c[0]));
      spy.mockRestore();
      expect(calls.some((m) => /truncat/i.test(m) && /OZ/.test(m))).toBe(true);
    }
    const blobs = takeBlobs();
    expect(blobs.length).toBe(1);
  });

  it('G-048 PDF export — smoke test returns non-empty without throwing', async () => {
    // exportPdf uses doc.save() which writes to disk via Node FS by default.
    // We monkey-patch save on the jsPDF prototype indirectly: jsPDF saves to the
    // filesystem in node — that's fine; we just don't assert on file. Smoke test.
    let err: unknown = null;
    try {
      // Reduce surface area: no cover / no toc to avoid font subset complications.
      await exportPdf(sample, {
        textMode: 'kurz',
        withPrices: true,
        withCover: false,
        withToc: false,
        withSummary: true,
        signatureOmit: true,
        mengeBelow: false,
      });
    } catch (e) {
      err = e;
    }
    expect(err).toBeNull();
  });

  it('G-049 XLSX export — sheet header row contains the expected columns', async () => {
    // XLSX.writeFile writes to disk in cwd. Redirect to a temp dir so we can
    // read the file back without polluting the repo, then clean up.
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kalku-xlsx-'));
    const origCwd = process.cwd();
    process.chdir(tmp);
    let outPath = '';
    try {
      await exportExcel(sample, {
        textMode: 'kurz',
        columns: DEFAULT_COLUMNS,
      });
      const files = fs.readdirSync(tmp).filter((f) => f.endsWith('.xlsx'));
      expect(files.length).toBeGreaterThan(0);
      outPath = path.join(tmp, files[0]);
      const data = fs.readFileSync(outPath);
      const XLSX = await import('xlsx');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wb = (XLSX as any).read(data, { type: 'buffer' });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aoa = (XLSX as any).utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
      const headerRow = aoa.find((r) => Array.isArray(r) && r.includes('OZ')) as string[];
      expect(headerRow).toBeDefined();
      expect(headerRow).toContain('OZ');
      expect(headerRow).toContain('Kurztext');
      expect(headerRow).toContain('Einheit');
      expect(headerRow).toContain('Menge');
      expect(headerRow).toContain('EP €');
      expect(headerRow).toContain('GP €');
    } finally {
      process.chdir(origCwd);
      try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  it('G-050 JSON export — payload parses back and contains positions', async () => {
    takeBlobs();
    exportJson(sample);
    const blobs = takeBlobs();
    expect(blobs.length).toBe(1);
    const text = await blobText(blobs[0]);
    const obj = JSON.parse(text);
    expect(obj.projectName).toBe('Test Projekt');
    expect(obj.format).toBe('gaeb-xml-3.2');
    expect(Array.isArray(obj.positions)).toBe(true);
    expect(obj.positions.length).toBe(2);
    expect(obj.positions[0].oz).toBe('01.001');
    expect(obj.estimatedValue).toBe(600);
  });
});

// Smoke check that exportGaebXml at least serializes (covered implicitly above,
// but the round-trip is a nice sanity check given the tight scope of G-050).
describe('3D-bonus. exportGaebXml round-trip sanity', () => {
  it('exportGaebXml produces a parseable GAEB-DA-XML 3.2 doc', async () => {
    const sample: ParsedGaeb = {
      filename: 's.x83', size: 0,
      format: 'gaeb-xml-3.2', formatLabel: 'GAEB DA XML 3.2',
      projectName: 'RT', currency: 'EUR', positionCount: 1,
      positions: [{
        oz: '001', pos: '001', kurztext: 'Pos 1', langtext: 'Long', einheit: 'm', menge: 1, ep: 2, gp: 2,
        level: 0, type: 'item',
      }],
      groups: [], hasLongtext: true,
    };
    takeBlobs();
    exportGaebXml(sample);
    const blobs = takeBlobs();
    const xml = await blobText(blobs[0]);
    const re = parseGaebText(xml, 'rt.x83', xml.length, 'x83', 'auto');
    expect(re.positionCount).toBe(1);
    expect(re.positions[0].kurztext).toBe('Pos 1');
  });
});
