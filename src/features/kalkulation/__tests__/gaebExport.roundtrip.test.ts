/**
 * GAEB export — round-trip fidelity & adversarial edge cases.
 *
 * A GAEB file is only "good" if a compliant consumer can read the prices back.
 * The strongest proxy is a round-trip through the project's OWN parser:
 *   ProjectData → projectToParsedGaeb → buildGaebXml/buildGaeb90 → parseGaebText
 * and assert nothing was lost.
 *
 * The property suite runs 1000 seeded-random priced Angebote (deterministic,
 * reproducible — the seed is the case index) and checks, per case:
 *   • GAEB DA XML is well-formed (DOMParser finds no <parsererror>)
 *   • every emitted item round-trips (oz, einheit, Menge, EP, GP, texts)
 *   • GAEB 90 records stay on the fixed-column grid and round-trip the numbers
 *
 * The edge block pins the specific bugs the audit found: the GAEB-90 column
 * drift, the XML decimal-separator corruption, control-char XML poisoning,
 * windows-1252 byte width, negatives/overflow, OZ truncation, empty/headers.
 */
import { describe, test, expect } from 'vitest';
import { projectToParsedGaeb } from '../exportFormats';
import { buildGaebXml, buildGaeb90, encodeWin1252, parseGaebText } from '@/lib/gaeb';
import type { ParsedGaeb } from '@/lib/gaeb';
import { makeBlankPosition, DEFAULT_CALC_PARAMS, calculatePosition } from '../calc';
import type { ProjectData, Position, CalcParams } from '../types';

// ── deterministic RNG ────────────────────────────────────────────────────────
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// All win1252-safe, whitespace-free tokens — incl. the 5 XML specials, German
// umlauts, € and an em-dash — so text round-trips exactly to its normalised form.
const WORDS = [
  'Beton', 'C25/30', 'Stahl', 'Mörtel', 'Größe', 'Höhe', 'Maße', 'Türöffnung',
  'Abdichtung', 'K30', 'Estrich', '30%', '&', '<Pos>', '"Zarge"', '€/m²', '—', 'DN100',
];
const UNITS = ['m²', 'm³', 'St', 'kg', 'm', 't', 'h', 'l', 'psch', ''];
// eslint-disable-next-line no-control-regex -- matches the control chars escXml strips
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;
const normText = (s: string) => s.replace(CONTROL, '').replace(/\s+/g, ' ').trim();

function pos(over: Partial<Position> & { id: string; sortOrder: number }): Position {
  return { ...makeBlankPosition(over.id, over.sortOrder), ...over };
}

function randText(rnd: () => number, maxWords = 6): string {
  const n = Math.floor(rnd() * (maxWords + 1));
  return Array.from({ length: n }, () => WORDS[Math.floor(rnd() * WORDS.length)]).join(' ');
}
function randQty(rnd: () => number): number {
  const r = rnd();
  if (r < 0.1) return 0;
  if (r < 0.45) return Math.floor(rnd() * 500) + 1;
  if (r < 0.8) return Math.round(rnd() * 1_000_000) / 1000; // up to 3 decimals
  return Math.round(rnd() * 10_000_00) / 100;
}
function randCost(rnd: () => number): number {
  return rnd() < 0.2 ? 0 : Math.round(rnd() * 500_000) / 100;
}
function randCalc(rnd: () => number): CalcParams {
  return {
    ...DEFAULT_CALC_PARAMS,
    mwst: rnd() < 0.5 ? 0.19 : 0.07,
    materialZuschlag: Math.round(rnd() * 30) / 100,
    nuZuschlag: Math.round(rnd() * 30) / 100,
    verrechnungslohn: 20 + Math.round(rnd() * 6000) / 100,
    geraeteStundensatz: Math.round(rnd() * 5000) / 100,
    zeitabzug: Math.round((rnd() * 30 - 10)),
    zielAufschlag: Math.round(rnd() * 150) / 100, // 0 … 1.5
  };
}

function randProject(rnd: () => number): ProjectData {
  const count = Math.floor(rnd() * 40);
  const positions: Position[] = [];
  let titel = 0;
  let sub = 0;
  for (let i = 0; i < count; i++) {
    const isHeader = rnd() < 0.2;
    if (isHeader) {
      titel += 1;
      sub = 0;
      positions.push(pos({ id: `h${i}`, sortOrder: i, oz: `${titel}`, shortText: randText(rnd, 4), isHeader: true }));
    } else {
      sub += 1;
      const oz = titel > 0 ? `${titel}.${sub}` : `${i + 1}`;
      positions.push(
        pos({
          id: `p${i}`,
          sortOrder: i,
          oz,
          shortText: randText(rnd, 5),
          longText: rnd() < 0.6 ? randText(rnd, 6) : '',
          unit: UNITS[Math.floor(rnd() * UNITS.length)],
          quantity: randQty(rnd),
          materialCost: randCost(rnd),
          timeMinutes: rnd() < 0.7 ? Math.round(rnd() * 12000) / 100 : 0,
          nuCost: randCost(rnd),
        }),
      );
    }
  }
  return {
    name: randText(rnd, 3) || 'BV',
    client: randText(rnd, 2),
    service: randText(rnd, 2),
    tenderNumber: `VG-${Math.floor(rnd() * 100000)}`,
    deadline: '2026-07-01',
    bidder: rnd() < 0.8 ? `${randText(rnd, 1) || 'Bau'} GmbH` : '',
    calcParams: randCalc(rnd),
    positions,
  };
}

const items = (parsed: ParsedGaeb) => parsed.positions.filter((p) => p.type !== 'group');

describe('GAEB export — round-trip over 1000 generated Angebote', () => {
  test('GAEB DA XML (.x84): well-formed + every item round-trips', { timeout: 60_000 }, () => {
    for (let i = 0; i < 1000; i++) {
      const rnd = mulberry32(i + 1);
      const data = randProject(rnd);
      const parsed = projectToParsedGaeb(data);
      const xml = buildGaebXml(parsed, '84');

      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      expect(doc.querySelector('parsererror'), `case ${i}: malformed XML`).toBeNull();

      const re = parseGaebText(xml, 'a.x84', xml.length, 'x84', 'gaeb-xml');
      const its = items(parsed);
      expect(re.positions.length, `case ${i}: item count`).toBe(its.length);
      for (let k = 0; k < its.length; k++) {
        const it = its[k];
        const rp = re.positions[k];
        const at = `case ${i} pos ${k} (oz=${it.oz})`;
        expect(rp.oz, `${at} oz`).toBe(it.oz);
        expect(rp.einheit || '', `${at} einheit`).toBe(it.einheit || '');
        expect(rp.menge ?? 0, `${at} menge`).toBeCloseTo(it.menge ?? 0, 3);
        expect(rp.ep ?? 0, `${at} ep`).toBeCloseTo(it.ep ?? 0, 2);
        expect(rp.gp ?? 0, `${at} gp`).toBeCloseTo(it.gp ?? 0, 2);
        expect(rp.kurztext, `${at} kurztext`).toBe(normText(it.kurztext));
        expect(rp.langtext, `${at} langtext`).toBe(normText(it.langtext));
      }
    }
  });

  test('GAEB 90 (.d84): fixed-column grid + numbers + texts round-trip', { timeout: 60_000 }, () => {
    for (let i = 0; i < 1000; i++) {
      const rnd = mulberry32(1000 + i);
      const data = randProject(rnd);
      const parsed = projectToParsedGaeb(data);
      const d = buildGaeb90(parsed, '84');

      for (const line of d.split('\r\n')) {
        expect([80, 81], `case ${i}: record width "${line.slice(0, 4)}" len=${line.length}`).toContain(line.length);
      }

      const re = parseGaebText(d, 'a.d84', d.length, 'd84', 'gaeb-90');
      const its = items(parsed);
      expect(re.positions.length, `case ${i}: item count`).toBe(its.length);
      for (let k = 0; k < its.length; k++) {
        const it = its[k];
        const rp = re.positions[k];
        const at = `case ${i} pos ${k} (oz=${it.oz})`;
        expect(rp.oz, `${at} oz`).toBe(it.oz.replace(/\./g, '').slice(0, 9).trim());
        expect(rp.einheit || '', `${at} einheit`).toBe((it.einheit || '').slice(0, 4).trim());
        expect(rp.menge ?? 0, `${at} menge`).toBeCloseTo(Math.round((it.menge ?? 0) * 1000) / 1000, 3);
        expect(rp.ep ?? 0, `${at} ep`).toBeCloseTo(Math.round((it.ep ?? 0) * 100) / 100, 2);
        expect(rp.gp ?? 0, `${at} gp`).toBeCloseTo(Math.round((it.gp ?? 0) * 100) / 100, 2);
        expect(rp.kurztext, `${at} kurztext`).toBe(normText(it.kurztext));
      }
    }
  });
});

// Hand-built ParsedGaeb so the edge assertions don't depend on the converter.
function gaeb(items_: Array<Partial<ParsedGaeb['positions'][number]> & { oz: string }>, meta: Partial<ParsedGaeb> = {}): ParsedGaeb {
  return {
    filename: 'e.x84', size: 0, format: 'gaeb-xml-3.2', formatLabel: 'GAEB DA XML 3.2',
    currency: 'EUR', positionCount: items_.length, groups: [], hasLongtext: false,
    positions: items_.map((p) => ({ pos: p.oz, kurztext: '', langtext: '', einheit: '', level: 0, type: 'item' as const, ...p })),
    ...meta,
  };
}

describe('GAEB export — edge cases (the audit findings)', () => {
  test('GAEB-90 column alignment: Menge/EP/GP/Einheit round-trip exactly (the 9→11 space fix)', () => {
    const g = gaeb([{ oz: '1.1', menge: 10, einheit: 'm³', ep: 123.45, gp: 1234.5, kurztext: 'Aushub' }]);
    const re = parseGaebText(buildGaeb90(g, '84'), 'e.d84', 0, 'd84', 'gaeb-90');
    expect(re.positions).toHaveLength(1);
    expect(re.positions[0].menge).toBe(10);
    expect(re.positions[0].einheit).toBe('m³');
    expect(re.positions[0].ep).toBeCloseTo(123.45, 2);
    expect(re.positions[0].gp).toBeCloseTo(1234.5, 2);
  });

  test('XML decimal separator: 12.5 / 1234.56 survive (not multiplied ×10/×100)', () => {
    const g = gaeb([{ oz: '1', menge: 2.5, ep: 12.5, gp: 1234.56 }]);
    const re = parseGaebText(buildGaebXml(g, '84'), 'e.x84', 0, 'x84', 'gaeb-xml');
    expect(re.positions[0].menge).toBeCloseTo(2.5, 3);
    expect(re.positions[0].ep).toBeCloseTo(12.5, 2);
    expect(re.positions[0].gp).toBeCloseTo(1234.56, 2);
  });

  test('XML escaping: & < > " round-trip in OZ and text', () => {
    const g = gaeb([{ oz: 'A&B<1>', kurztext: 'Stahl & "Beton" <Typ>', langtext: 'a < b & c > d', menge: 1, ep: 1, gp: 1 }]);
    const xml = buildGaebXml(g, '84');
    expect(new DOMParser().parseFromString(xml, 'application/xml').querySelector('parsererror')).toBeNull();
    const re = parseGaebText(xml, 'e.x84', 0, 'x84', 'gaeb-xml');
    expect(re.positions[0].oz).toBe('A&B<1>');
    expect(re.positions[0].kurztext).toBe('Stahl & "Beton" <Typ>');
    expect(re.positions[0].langtext).toBe('a < b & c > d');
  });

  test('XML control chars are stripped, not allowed to poison the document', () => {
    const g = gaeb([{ oz: '1', kurztext: 'A\x0bB\x0cC\x00D', menge: 1, ep: 1, gp: 1 }]);
    const xml = buildGaebXml(g, '84');
    expect(new DOMParser().parseFromString(xml, 'application/xml').querySelector('parsererror')).toBeNull();
    const re = parseGaebText(xml, 'e.x84', 0, 'x84', 'gaeb-xml');
    expect(re.positions).toHaveLength(1);
    expect(re.positions[0].kurztext).toBe('ABCD');
  });

  test('XML numbers never use exponential notation', () => {
    const g = gaeb([{ oz: '1', menge: 0.0000001, ep: 1e-7, gp: 1234567.89 }]);
    const xml = buildGaebXml(g, '84');
    expect(xml).not.toMatch(/[eE][+-]?\d/); // no 1e-7 / 1.2e+21
    expect(new DOMParser().parseFromString(xml, 'application/xml').querySelector('parsererror')).toBeNull();
  });

  test('GAEB-90 windows-1252 encoding: 1 byte per char, correct code points', () => {
    const bytes = encodeWin1252('Größe €'); // G r ö ß e ␠ €
    expect(bytes.length).toBe('Größe €'.length); // 1 byte/char → fixed width preserved
    expect(bytes[2]).toBe(0xf6); // ö
    expect(bytes[3]).toBe(0xdf); // ß
    expect(bytes[6]).toBe(0x80); // €  (U+20AC → 0x80)
    expect(encodeWin1252('\u{1F600}')[0]).toBe(0x3f); // unmappable → '?'
  });

  test('GAEB-90 negative & overflow values keep the fixed-column grid', () => {
    const d = buildGaeb90(gaeb([
      { oz: '1', menge: -5, einheit: 'm', ep: -10, gp: -50 },
      { oz: '2', menge: 1, einheit: 'm', ep: 99_999_999, gp: 1e13 },
    ]), '84');
    for (const line of d.split('\r\n')) expect([80, 81]).toContain(line.length);
  });

  test('GAEB-90 OZ longer than 9 digits is truncated to the field width', () => {
    const re = parseGaebText(buildGaeb90(gaeb([{ oz: '1234567890123', menge: 1, ep: 1, gp: 1 }]), '84'), 'e.d84', 0, 'd84', 'gaeb-90');
    expect(re.positions[0].oz.length).toBeLessThanOrEqual(9);
    expect(re.positions[0].oz).toBe('123456789');
  });

  test('GAEB-90 hard-splits a word longer than the 70-col text field', () => {
    const long = 'X'.repeat(160);
    const d = buildGaeb90(gaeb([{ oz: '1', kurztext: long, menge: 1, ep: 1, gp: 1 }]), '84');
    const r25 = d.split('\r\n').filter((l) => l.startsWith('25'));
    expect(r25.length).toBeGreaterThanOrEqual(3); // 160 / 70 → 3 lines
    for (const line of r25) expect(line.length).toBeLessThanOrEqual(81);
  });

  test('group/header rows are NOT emitted as priced items in either format', () => {
    const data: ProjectData = {
      name: 'BV', client: 'AG', service: 'S', tenderNumber: 'T', deadline: '', bidder: 'B GmbH',
      calcParams: { ...DEFAULT_CALC_PARAMS },
      positions: [
        pos({ id: 'h1', sortOrder: 0, oz: '1', shortText: 'Erdarbeiten', isHeader: true }),
        pos({ id: 'p1', sortOrder: 1, oz: '1.1', shortText: 'Aushub', unit: 'm³', quantity: 5, materialCost: 3 }),
      ],
    };
    const parsed = projectToParsedGaeb(data);
    const reXml = parseGaebText(buildGaebXml(parsed, '84'), 'a.x84', 0, 'x84', 'gaeb-xml');
    const re90 = parseGaebText(buildGaeb90(parsed, '84'), 'a.d84', 0, 'd84', 'gaeb-90');
    expect(reXml.positions).toHaveLength(1);
    expect(reXml.positions[0].oz).toBe('1.1');
    expect(re90.positions).toHaveLength(1);
  });

  test('Bidder (DA84 Angebot) survives the XML round-trip', () => {
    const re = parseGaebText(buildGaebXml(gaeb([{ oz: '1', menge: 1, ep: 1, gp: 1 }], { bidder: 'Muster Bau GmbH', awardingAuthority: 'Stadt SB' }), '84'), 'e.x84', 0, 'x84', 'gaeb-xml');
    expect(re.bidder).toBe('Muster Bau GmbH');
    expect(re.awardingAuthority).toBe('Stadt SB');
  });

  test('empty project & headers-only produce valid, item-free output', () => {
    const empty = projectToParsedGaeb({ name: 'X', client: '', service: '', tenderNumber: '', deadline: '', bidder: '', calcParams: { ...DEFAULT_CALC_PARAMS }, positions: [] });
    expect(new DOMParser().parseFromString(buildGaebXml(empty, '84'), 'application/xml').querySelector('parsererror')).toBeNull();
    expect(parseGaebText(buildGaeb90(empty, '84'), 'a.d84', 0, 'd84', 'gaeb-90').positions).toHaveLength(0);

    const headersOnly = projectToParsedGaeb({
      name: 'X', client: '', service: '', tenderNumber: '', deadline: '', bidder: '', calcParams: { ...DEFAULT_CALC_PARAMS },
      positions: [pos({ id: 'h', sortOrder: 0, oz: '1', shortText: 'Titel', isHeader: true })],
    });
    expect(parseGaebText(buildGaebXml(headersOnly, '84'), 'a.x84', 0, 'x84', 'gaeb-xml').positions).toHaveLength(0);
  });

  test('exported prices reflect the live calc (zielAufschlag is baked in)', () => {
    const base: ProjectData = {
      name: 'X', client: '', service: '', tenderNumber: '', deadline: '', bidder: '',
      calcParams: { ...DEFAULT_CALC_PARAMS, zielAufschlag: 0.25 },
      positions: [pos({ id: 'p1', sortOrder: 0, oz: '1', unit: 'm', quantity: 4, materialCost: 100, timeMinutes: 0 })],
    };
    const expectedGp = calculatePosition(base.positions[0], base.calcParams).gp;
    const re = parseGaebText(buildGaebXml(projectToParsedGaeb(base), '84'), 'a.x84', 0, 'x84', 'gaeb-xml');
    expect(re.positions[0].gp).toBeCloseTo(Math.round(expectedGp * 100) / 100, 2);
  });
});
