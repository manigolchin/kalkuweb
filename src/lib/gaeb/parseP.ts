import type { Position } from './types';

type PParseResult = {
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
 * GAEB 2000 ("Pseudo-format") parser.
 *
 * Files use #begin[Type] / #end[Type] block markers and [Key]Value[end] tag
 * pairs. Texts are usually wrapped in RTF: {\rtf1...content...}.
 *
 * Structure:
 *   #begin[GAEB]
 *     #begin[GAEBInfo] ...
 *     #begin[PrjInfo] ...
 *     #begin[Vergabe]
 *       [DP]83[end]
 *       #begin[LV]
 *         #begin[LVInfo] ...
 *         #begin[LVBereich]               <-- title / group, OZ defines level
 *           [OZ]01[end]
 *           [BezTx]Main Building[end]
 *           #begin[LVBereich] ...
 *             #begin[Position]
 *               [OZ]0102001[end]
 *               [Menge]600[end]
 *               [ME]m³[end]
 *               #begin[Beschreibung]
 *                 [Langtext]{\rtf1...}[end]
 *                 [Kurztext]{\rtf1...}[end]
 */
export function parseGaebP(text: string): PParseResult {
  const tokens = tokenize(text);
  const projectName = findTag(tokens, ['PrjInfo'], 'Name');
  const projectDescription = findTag(tokens, ['PrjInfo'], 'Beschreib') ||
                             findTag(tokens, ['PrjInfo'], 'Bez');
  const currency = findTag(tokens, ['PrjInfo'], 'Wae') || 'EUR';
  const awardingAuthority = findTag(tokens, ['Vergabe', 'AG', 'Adresse'], 'Name1');
  const date = findTag(tokens, ['LV', 'LVInfo'], 'Datum') ||
               findTag(tokens, ['GAEBInfo'], 'Datum');

  const positions: Position[] = [];
  const groups: { oz: string; label: string; level: number }[] = [];

  walk(tokens, [], { positions, groups }, 0);

  const estimatedValue = positions.reduce((sum, p) => sum + (p.gp ?? 0), 0);

  return {
    projectName,
    projectDescription,
    awardingAuthority,
    currency,
    positions,
    groups,
    estimatedValue: estimatedValue > 0 ? estimatedValue : undefined,
    date,
  };
}

type Token =
  | { kind: 'begin'; name: string }
  | { kind: 'end'; name: string }
  | { kind: 'tag'; key: string; value: string };

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  const lines = src.split(/\r?\n/);
  let buffer = '';
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (buffer) {
      // Continuing a multi-line tag value — look for [end]
      buffer += '\n' + line;
      const endIdx = buffer.indexOf('[end]');
      if (endIdx !== -1) {
        // emit
        const m = buffer.match(/^\[([^\]]+)\](.*)\[end\]/s);
        if (m) out.push({ kind: 'tag', key: m[1], value: m[2] });
        buffer = '';
      }
      continue;
    }

    if (line.startsWith('#begin[')) {
      const m = line.match(/^#begin\[([^\]]+)\]/);
      if (m) out.push({ kind: 'begin', name: m[1] });
      continue;
    }
    if (line.startsWith('#end[')) {
      const m = line.match(/^#end\[([^\]]+)\]/);
      if (m) out.push({ kind: 'end', name: m[1] });
      continue;
    }
    if (line.startsWith('[')) {
      // Single-line tag [Key]Value[end]
      const m = line.match(/^\[([^\]]+)\](.*?)\[end\]\s*$/);
      if (m) {
        out.push({ kind: 'tag', key: m[1], value: m[2] });
      } else {
        // Multi-line tag — value continues on next lines until [end]
        buffer = line;
      }
    }
  }
  return out;
}

function findTag(tokens: Token[], pathHint: string[], key: string): string | undefined {
  const stack: string[] = [];
  for (const t of tokens) {
    if (t.kind === 'begin') stack.push(t.name);
    else if (t.kind === 'end') stack.pop();
    else if (t.kind === 'tag' && t.key === key) {
      if (pathHint.every((h) => stack.includes(h))) return stripRtf(t.value);
    }
  }
  return undefined;
}

function walk(
  tokens: Token[],
  _ctx: string[],
  result: { positions: Position[]; groups: { oz: string; label: string; level: number }[] },
  startIdx: number,
): number {
  let i = startIdx;
  const stack: string[] = [];
  let currentPos: Partial<Position> | null = null;
  let inBeschreibung = false;
  let currentArea: { oz: string; level: number } | null = null;

  while (i < tokens.length) {
    const t = tokens[i];

    if (t.kind === 'begin') {
      stack.push(t.name);
      if (t.name === 'Position') {
        currentPos = {
          oz: '',
          pos: '',
          kurztext: '',
          langtext: '',
          einheit: '',
          level: currentArea?.level ?? 0,
          type: 'item',
        };
      } else if (t.name === 'LVBereich') {
        // Start of an area — OZ/BezTx will follow
        currentArea = { oz: '', level: stack.filter((x) => x === 'LVBereich').length - 1 };
      } else if (t.name === 'Beschreibung') {
        inBeschreibung = true;
      }
    } else if (t.kind === 'end') {
      if (t.name === 'Position' && currentPos && currentPos.oz) {
        result.positions.push(currentPos as Position);
        currentPos = null;
      } else if (t.name === 'LVBereich' && currentArea) {
        currentArea = null;
      } else if (t.name === 'Beschreibung') {
        inBeschreibung = false;
      }
      stack.pop();
    } else if (t.kind === 'tag') {
      if (currentPos && stack.includes('Position')) {
        switch (t.key) {
          case 'OZ':
            currentPos.oz = t.value.trim();
            currentPos.pos = t.value.trim();
            break;
          case 'Menge':
            currentPos.menge = parseGermanNumber(t.value);
            break;
          case 'FrMenge':
            if (t.value.trim().toUpperCase() === 'J') {
              currentPos.qtyTBD = true;
            }
            break;
          case 'ME':
            currentPos.einheit = t.value.trim();
            break;
          case 'EP':
            currentPos.ep = parseGermanNumber(t.value);
            break;
          case 'GB':
          case 'GP':
            currentPos.gp = parseGermanNumber(t.value);
            break;
          case 'Kurztext':
            if (inBeschreibung) {
              currentPos.kurztext = stripRtf(t.value);
            }
            break;
          case 'Langtext':
            if (inBeschreibung) {
              currentPos.langtext = stripRtf(t.value);
            }
            break;
        }
        // Compute GP if missing
        if (currentPos.gp == null && currentPos.menge != null && currentPos.ep != null) {
          currentPos.gp = currentPos.menge * currentPos.ep;
        }
      } else if (currentArea && stack.includes('LVBereich')) {
        if (t.key === 'OZ') {
          currentArea.oz = t.value.trim();
        } else if (t.key === 'BezTx') {
          const label = stripRtf(t.value).trim();
          if (currentArea.oz) {
            result.groups.push({ oz: currentArea.oz, label, level: currentArea.level });
          }
        }
      }
    }
    i++;
  }
  return i;
}

function stripRtf(s: string): string {
  if (!s) return '';
  // {\rtf1Foo bar} → Foo bar  (a very loose RTF stripper that's good enough
  // for the simple texts emitted by GAEB tools)
  let out = s.trim();
  if (out.startsWith('{') && out.endsWith('}')) {
    out = out.slice(1, -1);
  }
  out = out.replace(/^\\rtf\d+\s*/, '');
  out = out.replace(/\\par\b/g, '\n');
  out = out.replace(/\\line\b/g, '\n');
  out = out.replace(/\\fonttbl[\s\S]*?\}/g, '');
  out = out.replace(/\\colortbl[\s\S]*?;/g, '');
  out = out.replace(/\{\\[*\\][^{}]*\}/g, '');
  out = out.replace(/\\[a-zA-Z]+-?\d*\s?/g, '');
  out = out.replace(/[{}]/g, '');
  return out.replace(/\s+/g, ' ').trim();
}

function parseGermanNumber(text: string): number {
  if (!text) return NaN;
  const cleaned = text.trim();
  if (!cleaned) return NaN;
  if (/[\d.]+,\d/.test(cleaned)) return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  return parseFloat(cleaned.replace(/\s/g, '').replace(/,/g, '.'));
}
