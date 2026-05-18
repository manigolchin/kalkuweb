import type { GaebFormat, Position } from './types';

type XmlParseResult = {
  projectName?: string;
  projectDescription?: string;
  awardingAuthority?: string;
  bidder?: string;
  currency: string;
  positions: Position[];
  groups: { oz: string; label: string; level: number }[];
  estimatedValue?: number;
  date?: string;
  version?: string;
  format: GaebFormat;
};

// Recursively concatenate the visible text content of <Text> / <DetailTxt> /
// <OutlineText> XML blobs (which use <p>, <span>, <br>, <ul>, <li>, <b>, <i> ...).
// We keep paragraph breaks so the resulting Langtext is readable.
function extractRichText(node: Element | null): string {
  if (!node) return '';
  const out: string[] = [];
  function walk(n: Node) {
    if (n.nodeType === Node.TEXT_NODE) {
      const t = n.textContent;
      if (t && t.trim()) out.push(t);
      return;
    }
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const el = n as Element;
    const local = (el.localName || el.tagName || '').toLowerCase();
    const isBlock = local === 'p' || local === 'br' || local === 'li' || local === 'ul' || local === 'ol';
    if (isBlock && out.length) out.push('\n');
    el.childNodes.forEach(walk);
    if (isBlock) out.push('\n');
  }
  node.childNodes.forEach(walk);
  return out.join('').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

// querySelector that ignores namespace prefixes by using *[localName=…].
function ql(root: Element | Document, ...names: string[]): Element | null {
  for (const name of names) {
    const found = root.querySelector(name);
    if (found) return found;
  }
  // Try without namespaces
  for (const name of names) {
    const found = Array.from(root.getElementsByTagName('*')).find(
      (el) => (el.localName || el.tagName).toLowerCase() === name.toLowerCase(),
    );
    if (found) return found as Element;
  }
  return null;
}

function detectFormat(doc: Document): GaebFormat {
  // GAEB DA XML 3.x: <GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA83/3.2">
  const root = doc.documentElement;
  const ns = root.getAttribute('xmlns') ?? '';
  const tagName = (root.localName || root.tagName).toLowerCase();

  if (tagName === 'gaeb' || ns.includes('gaeb.de')) {
    const versionEl = ql(doc, 'Version');
    const v = versionEl?.textContent?.trim() ?? '';
    if (v.startsWith('3.1')) return 'gaeb-xml-3.1';
    if (v.startsWith('3.3')) return 'gaeb-xml-3.3';
    if (v.startsWith('3.2')) return 'gaeb-xml-3.2';
    // Default GAEB XML 3.x
    return 'gaeb-xml-3.2';
  }

  if (tagName === 'onorm' || ns.includes('austrostandards') || ns.includes('a2063')) {
    return 'onorm-a2063';
  }

  return 'unknown';
}

export function parseGaebXml(xml: string): XmlParseResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');

  // DOMParser errors land inside the doc as a <parsererror> element. We don't
  // treat that as fatal — return empty.
  if (doc.querySelector('parsererror')) {
    return {
      currency: 'EUR',
      positions: [],
      groups: [],
      format: 'unknown',
    };
  }

  const format = detectFormat(doc);

  if (format === 'onorm-a2063') {
    return parseOnorm(doc);
  }

  return parseGaebDaXml(doc, format);
}

function parseGaebDaXml(doc: Document, format: GaebFormat): XmlParseResult {
  const projectName =
    ql(doc, 'NamePrjGes')?.textContent?.trim() ||
    ql(doc, 'NamePrj')?.textContent?.trim() ||
    ql(doc, 'LblPrj')?.textContent?.trim();
  const projectDescription = ql(doc, 'Descrip')?.textContent?.replace(/\s+/g, ' ').trim();
  const date = ql(doc, 'Date')?.textContent?.trim();
  const version = ql(doc, 'Version')?.textContent?.trim();
  const currency = ql(doc, 'Cur')?.textContent?.trim() || 'EUR';
  const awardingAuthority =
    ql(doc, 'OWN')?.querySelector('Name1')?.textContent?.trim() ||
    ql(doc, 'OWN')?.querySelector('Name')?.textContent?.trim();
  const bidder =
    ql(doc, 'Bidder')?.querySelector('Name1')?.textContent?.trim() ||
    ql(doc, 'LblBdr')?.textContent?.trim();

  const positions: Position[] = [];
  const groups: { oz: string; label: string; level: number }[] = [];
  let totalSum = 0;

  // Find the BoQ root — there's always one <BoQ> per file (English track),
  // or a <Vergabe>/<LV> for older German Track A files.
  const boq = ql(doc, 'BoQ', 'LV', 'Vergabe') || doc.documentElement;

  function walkBody(body: Element, parentOz: string, level: number) {
    // Items live in Itemlist > Item (English track) — also direct Position
    // under LVBereich for older German files.
    const itemlists = Array.from(body.children).filter((c) => {
      const n = (c.localName || c.tagName);
      return n === 'Itemlist' || n === 'PositionListe';
    });
    for (const il of itemlists) {
      for (const item of Array.from(il.children).filter((c) => {
        const n = (c.localName || c.tagName);
        return n === 'Item' || n === 'Position';
      })) {
        const rnoPart = item.getAttribute('RNoPart') || '';
        const oz = parentOz ? `${parentOz}.${rnoPart}` : rnoPart;

        const desc = ql(item, 'Description');
        const completeText = desc ? ql(desc, 'CompleteText') : null;
        const detailTxt = completeText ? ql(completeText, 'DetailTxt') : null;
        const outlineText = completeText ? ql(completeText, 'OutlineText') : null;

        // Kurztext = OutlineText (single-line summary, shown in tables)
        const outlTxt = outlineText
          ? ql(outlineText, 'OutlTxt', 'TextOutlTxt')
          : null;
        const kurztext = extractRichText(outlTxt) || '';

        // Langtext = DetailTxt (full description, multi-paragraph)
        const langtext = detailTxt ? extractRichText(ql(detailTxt, 'Text') || detailTxt) : '';

        const qtyEl = ql(item, 'Qty');
        const qtyTbdEl = ql(item, 'QtyTBD');
        const qtyTBD = qtyTbdEl?.textContent?.trim().toLowerCase() === 'yes';
        const menge = qtyEl ? parseGermanNumber(qtyEl.textContent ?? '') : undefined;
        const einheit = ql(item, 'QU')?.textContent?.trim() ?? '';

        // UP = Einheitspreis, IT = Gesamtbetrag (only present in X84/D84)
        const upEl = ql(item, 'UP');
        const itEl = ql(item, 'IT');
        const ep = upEl ? parseGermanNumber(upEl.textContent ?? '') : undefined;
        let gp = itEl ? parseGermanNumber(itEl.textContent ?? '') : undefined;
        if (gp == null && menge != null && ep != null) {
          gp = menge * ep;
        }
        if (gp != null && !Number.isNaN(gp)) totalSum += gp;

        // Position type flags from GAEB
        const bedarfspos =
          ql(item, 'PerfDescr')?.textContent?.trim() === 'Yes' ||
          item.getAttribute('Bedarfsposition') === 'Yes';
        const wahlpos = item.getAttribute('Wahlposition') === 'Yes';

        positions.push({
          oz,
          pos: rnoPart || oz,
          kurztext: kurztext.replace(/\s+/g, ' ').trim(),
          langtext: langtext.trim(),
          einheit,
          menge: menge != null && !Number.isNaN(menge) ? menge : undefined,
          ep: ep != null && !Number.isNaN(ep) ? ep : undefined,
          gp: gp != null && !Number.isNaN(gp) ? gp : undefined,
          level,
          type: 'item',
          qtyTBD,
          bedarfsposition: bedarfspos || undefined,
          wahlposition: wahlpos || undefined,
        });
      }
    }

    // Sub-categories (groups / titles) — English BoQCtgy or German LVBereich
    const ctgys = Array.from(body.children).filter((c) => {
      const n = (c.localName || c.tagName);
      return n === 'BoQCtgy' || n === 'LVBereich';
    });
    for (const ctgy of ctgys) {
      const rnoPart = ctgy.getAttribute('RNoPart') || ql(ctgy, 'OZ')?.textContent?.trim() || '';
      const oz = parentOz ? `${parentOz}.${rnoPart}` : rnoPart;
      const label =
        extractRichText(ql(ctgy, 'LblTx', 'BezTx')) ||
        ql(ctgy, 'LblTx', 'BezTx')?.textContent?.trim() ||
        '';
      if (rnoPart || label) groups.push({ oz, label, level });
      const subBody = ql(ctgy, 'BoQBody', 'LVBereich');
      if (subBody) walkBody(subBody, oz, level + 1);
    }
  }

  const body = ql(boq, 'BoQBody', 'LV');
  if (body) walkBody(body, '', 0);

  return {
    projectName,
    projectDescription,
    awardingAuthority,
    bidder,
    currency,
    positions,
    groups,
    estimatedValue: totalSum > 0 ? totalSum : undefined,
    date,
    version,
    format,
  };
}

function parseOnorm(doc: Document): XmlParseResult {
  // ÖNORM A2063: similar idea but different element names.
  // <onorm:LB>...<KGGL>...<LG>...<ULG>...<GL>...<Position>...</Position>
  const projectName =
    ql(doc, 'BezKurz', 'BezLang', 'NamePrj')?.textContent?.trim() ||
    doc.documentElement.getAttribute('OENorm') || undefined;
  const date = ql(doc, 'Datum')?.textContent?.trim();
  const currency = ql(doc, 'Waehrung')?.textContent?.trim() || 'EUR';

  const positions: Position[] = [];
  const groups: { oz: string; label: string; level: number }[] = [];
  let totalSum = 0;

  // ÖNorm uses <Position> elements
  const posElements = Array.from(doc.getElementsByTagName('*')).filter(
    (el) => (el.localName || el.tagName) === 'Position',
  );
  for (const p of posElements) {
    const oz = p.getAttribute('PosNr') || ql(p, 'PosNr')?.textContent?.trim() || '';
    const kurztext = ql(p, 'Stichwort', 'StichwortPos')?.textContent?.trim() || '';
    const langtext = extractRichText(ql(p, 'Langtext', 'PosTxt'));
    const menge = parseGermanNumber(ql(p, 'PosMenge', 'Menge')?.textContent ?? '');
    const einheit = ql(p, 'ME', 'Einheit')?.textContent?.trim() || '';
    const ep = parseGermanNumber(ql(p, 'EP', 'Einheitspreis')?.textContent ?? '');
    const gp = parseGermanNumber(ql(p, 'GP', 'Gesamtpreis')?.textContent ?? '');
    if (gp && !Number.isNaN(gp)) totalSum += gp;

    positions.push({
      oz,
      pos: oz,
      kurztext,
      langtext,
      einheit,
      menge: !Number.isNaN(menge) ? menge : undefined,
      ep: !Number.isNaN(ep) ? ep : undefined,
      gp: !Number.isNaN(gp) ? gp : (menge && ep ? menge * ep : undefined),
      level: 0,
      type: 'item',
    });
  }

  return {
    projectName,
    currency,
    positions,
    groups,
    estimatedValue: totalSum > 0 ? totalSum : undefined,
    date,
    format: 'onorm-a2063',
  };
}

function parseGermanNumber(text: string): number {
  if (!text) return NaN;
  const cleaned = text.trim().replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.');
  // If both . and , exist, the , is the decimal separator
  if (/[\d.]+,\d/.test(text)) {
    const n = parseFloat(text.replace(/\./g, '').replace(',', '.'));
    return n;
  }
  return parseFloat(cleaned);
}
