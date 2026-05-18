import type { Position } from './types';

type AsciiParseResult = {
  projectName?: string;
  projectDescription?: string;
  awardingAuthority?: string;
  currency: string;
  positions: Position[];
  groups: { oz: string; label: string; level: number }[];
  estimatedValue?: number;
  date?: string;
};

/**
 * GAEB 90 (ASCII) DA81 / DA83 / DA84 parser.
 *
 * Record format (fixed-column, columns are 1-based):
 *   00       Header — DA code in cols 11-12, OZ-mask in cols 41-…
 *   01       Project info + date
 *   02       Project name
 *   03       Awarding authority / OWN name
 *   06       Number of EP components + labels (in DA84/D84)
 *   08?      Currency
 *   11       Hierarchy node (group / Bereich)        — OZ in cols 3-11
 *   12       Group name (continuation lines OK)
 *   21       Position record                          — OZ in cols 3-11
 *              cols 12-14    flags (NNN)
 *              cols 26-39    Menge (decimal, 3 implicit decimals)
 *              cols 40-43    ME / Einheit
 *              cols 44-57    EP (optional, D84 only)
 *              cols 58-71    GP
 *   25       Kurztext (continuation lines OK)
 *   26       Langtext (continuation lines OK)
 *   31       End-of-group marker
 *   99       End-of-file marker
 *
 * Each line is terminated by the line number in cols 75-80 (we trim that off).
 */
export function parseGaebAscii(text: string): AsciiParseResult {
  const lines = text.split(/\r?\n/);
  const positions: Position[] = [];
  const groups: { oz: string; label: string; level: number }[] = [];

  let projectName: string | undefined;
  let projectDescription: string | undefined;
  let awardingAuthority: string | undefined;
  let date: string | undefined;
  let currency = 'EUR';
  let totalSum = 0;

  let currentPos: Position | null = null;
  let currentGroup: { oz: string; label: string; level: number } | null = null;
  let textBuffer: { target: 'kurz' | 'lang' | 'group' | 'project' | null; lines: string[] } = {
    target: null,
    lines: [],
  };

  function flushTextBuffer() {
    if (!textBuffer.target || textBuffer.lines.length === 0) {
      textBuffer = { target: null, lines: [] };
      return;
    }
    // Join continuation lines preserving paragraph breaks
    const joined = textBuffer.lines
      .map((l) => l.trim())
      .filter(Boolean)
      .join(' ');

    switch (textBuffer.target) {
      case 'kurz':
        if (currentPos) currentPos.kurztext = joined;
        break;
      case 'lang':
        if (currentPos) currentPos.langtext = joined;
        break;
      case 'group':
        if (currentGroup) currentGroup.label = joined;
        break;
      case 'project':
        projectName = joined;
        break;
    }
    textBuffer = { target: null, lines: [] };
  }

  for (const raw of lines) {
    if (!raw) continue;
    // Strip line-number from cols 75-80 (last 6 chars if all digits)
    const trimmed = raw.replace(/\s*\d{6}\s*$/, '');
    if (trimmed.length < 2) continue;

    const code = trimmed.slice(0, 2);
    const rest = trimmed.slice(2);

    // Text-continuation records (25, 26, 12, 01) MUST be processed first.
    // T-blocks (T0/T9) are header/program info — skip.
    if (code === 'T0' || code === 'T9' || code === '70') continue;

    switch (code) {
      case '00': {
        flushTextBuffer();
        // Header — DA code in cols 11-12 (after stripping "00")
        break;
      }
      case '01': {
        flushTextBuffer();
        // Project description (cols 3-42) + date (cols 43-50)
        projectDescription = rest.slice(0, 40).trim();
        const dateRaw = rest.slice(40, 48).trim();
        if (dateRaw) date = dateRaw;
        break;
      }
      case '02': {
        flushTextBuffer();
        projectName = rest.trim();
        break;
      }
      case '03': {
        flushTextBuffer();
        awardingAuthority = rest.trim();
        break;
      }
      case '08': {
        flushTextBuffer();
        // Currency
        const cur = rest.slice(0, 6).trim();
        if (cur) currency = cur;
        break;
      }
      case '11': {
        // Hierarchy node — OZ in cols 3-11 = `rest.slice(0, 9)`
        flushTextBuffer();
        currentPos = null;
        const oz = rest.slice(0, 9).trim();
        const level = oz.length / 2; // rough heuristic
        currentGroup = { oz, label: '', level };
        groups.push(currentGroup);
        break;
      }
      case '12': {
        // Group name continuation (multi-line)
        if (currentGroup) {
          if (textBuffer.target !== 'group') {
            flushTextBuffer();
            textBuffer = { target: 'group', lines: [rest] };
          } else {
            textBuffer.lines.push(rest);
          }
        }
        break;
      }
      case '21': {
        flushTextBuffer();
        currentPos = parsePositionRecord(rest);
        if (currentPos) {
          positions.push(currentPos);
          if (currentPos.gp != null) totalSum += currentPos.gp;
        }
        break;
      }
      case '23': {
        // Price record (D84): cols 12-22 EP (10 chars, 2 implicit decimals),
        // col 23 EPZPF, cols 24-35 GB (12 chars, 2 implicit decimals).
        // Matches the same OZ as the most-recent `21` record.
        flushTextBuffer();
        if (currentPos) {
          const ozOnLine = rest.slice(0, 9).trim();
          // Verify OZ matches current position
          if (!ozOnLine || ozOnLine === currentPos.oz) {
            const ep = parseEpField(rest.slice(9, 20));
            const gp = parseEpField(rest.slice(21, 33));
            if (ep != null && !Number.isNaN(ep)) currentPos.ep = ep;
            if (gp != null && !Number.isNaN(gp)) {
              const oldGp = currentPos.gp ?? 0;
              currentPos.gp = gp;
              totalSum += gp - oldGp;
            }
          }
        }
        break;
      }
      case '25': {
        if (currentPos) {
          if (textBuffer.target !== 'kurz') {
            flushTextBuffer();
            textBuffer = { target: 'kurz', lines: [rest] };
          } else {
            textBuffer.lines.push(rest);
          }
        }
        break;
      }
      case '26': {
        if (currentPos) {
          if (textBuffer.target !== 'lang') {
            flushTextBuffer();
            textBuffer = { target: 'lang', lines: [rest] };
          } else {
            textBuffer.lines.push(rest);
          }
        }
        break;
      }
      case '31':
      case '99': {
        flushTextBuffer();
        currentPos = null;
        currentGroup = null;
        break;
      }
      default: {
        // 36 = quantity computation, 37 = subtitle, etc. — skip for now
        break;
      }
    }
  }
  flushTextBuffer();

  return {
    projectName,
    projectDescription,
    awardingAuthority,
    currency,
    positions,
    groups,
    estimatedValue: totalSum > 0 ? totalSum : undefined,
    date,
  };
}

function parsePositionRecord(rest: string): Position {
  // rest = everything after the "21" code, so original cols 3..end.
  const oz = rest.slice(0, 9).trim();
  // Flags at original cols 12-14 = rest.slice(9, 12)
  const flags = rest.slice(9, 12);

  // The official spec is fairly strict on column positions, but in the wild,
  // some files pad with extra spaces. We probe two layouts:
  //
  //   Strict GAEB 90:  Menge cols 26-39, Unit 40-43, EP 44-57, GP 58-71
  //   For "21" record after stripping "21", that's: 23-36, 37-40, 41-54, 55-68
  //
  // Also some files use "X" in the menge slot to mean "BedarfsPos / Frei".
  const menge = parseMengeField(rest.slice(23, 37));
  const einheit = rest.slice(37, 41).trim();
  const ep = parseEpField(rest.slice(41, 55));
  const gp = parseEpField(rest.slice(55, 69));

  const qtyTBD = /X/i.test(rest.slice(23, 37));

  return {
    oz,
    pos: oz,
    kurztext: '',
    langtext: '',
    einheit,
    menge: !qtyTBD && menge != null && !Number.isNaN(menge) ? menge : undefined,
    ep: ep != null && !Number.isNaN(ep) ? ep : undefined,
    gp: gp != null && !Number.isNaN(gp) ? gp : (menge && ep ? menge * ep : undefined),
    level: 0,
    type: 'item',
    qtyTBD: qtyTBD || undefined,
    bedarfsposition: flags.includes('B') || undefined,
  };
}

function parseMengeField(raw: string): number | null {
  if (!raw) return null;
  const clean = raw.trim();
  if (!clean) return null;
  if (/^X+$/i.test(clean)) return null;
  // GAEB 90 stores numbers as plain digits with implicit 3 decimal places.
  if (/^[0-9]+$/.test(clean)) {
    const n = parseInt(clean, 10);
    return n / 1000;
  }
  return parseGermanNumber(raw);
}

function parseEpField(raw: string): number | null {
  if (!raw) return null;
  const clean = raw.trim();
  if (!clean) return null;
  if (/^[0-9]+$/.test(clean)) {
    const n = parseInt(clean, 10);
    return n / 100;
  }
  return parseGermanNumber(raw);
}

function parseGermanNumber(text: string): number {
  if (!text) return NaN;
  if (/[\d.]+,\d/.test(text)) return parseFloat(text.replace(/\./g, '').replace(',', '.'));
  return parseFloat(text.trim().replace(/\s/g, '').replace(/,/g, '.'));
}
