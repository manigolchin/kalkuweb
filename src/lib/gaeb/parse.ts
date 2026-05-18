import type { ParsedGaeb, GaebFormat } from './types';
import { FORMAT_LABELS } from './types';
import { parseGaebXml } from './parseXml';
import { parseGaebAscii } from './parseAscii';
import { parseGaebP } from './parseP';

const ASCII_EXTS = new Set(['d81', 'd82', 'd83', 'd84', 'd85', 'd86', 'd87', 'd89']);
const XML_EXTS = new Set(['x81', 'x82', 'x83', 'x84', 'x85', 'x86', 'x87', 'x89', 'x93', 'x94', 'xml']);
const P_EXTS = new Set(['p81', 'p82', 'p83', 'p84', 'p85', 'p86', 'p89', 'p93', 'p94']);
const ONORM_EXTS = new Set(['onlv', 'onvm']);

export const ACCEPTED_EXTENSIONS = [
  ...XML_EXTS,
  ...ASCII_EXTS,
  ...P_EXTS,
  ...ONORM_EXTS,
].map((e) => '.' + e);

export type SourceFormatHint =
  | 'auto'
  | 'gaeb-xml'
  | 'gaeb-90'
  | 'gaeb-2000'
  | 'onorm-a2063'
  | 'd83';

function sniffFormat(text: string, ext: string): { kind: 'xml' | 'ascii' | 'p' | 'unknown'; format: GaebFormat } {
  const head = text.slice(0, 2000).trim();

  if (head.startsWith('<?xml') || head.startsWith('<GAEB') || head.startsWith('<')) {
    return { kind: 'xml', format: 'gaeb-xml-3.2' };
  }
  if (head.startsWith('#begin[') || head.includes('#begin[GAEB]')) {
    return { kind: 'p', format: 'gaeb-2000' };
  }
  // GAEB 90 starts with "T0" or "00" lines
  if (/^(T0|00\s)/.test(head)) {
    return { kind: 'ascii', format: 'gaeb-90' };
  }

  // Fall back to extension
  if (XML_EXTS.has(ext)) return { kind: 'xml', format: 'gaeb-xml-3.2' };
  if (ASCII_EXTS.has(ext)) return { kind: 'ascii', format: 'gaeb-90' };
  if (P_EXTS.has(ext)) return { kind: 'p', format: 'gaeb-2000' };
  if (ONORM_EXTS.has(ext)) return { kind: 'xml', format: 'onorm-a2063' };

  return { kind: 'unknown', format: 'unknown' };
}

export async function parseGaebFile(file: File, hint: SourceFormatHint = 'auto'): Promise<ParsedGaeb> {
  const text = await readFileAsText(file);
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  return parseGaebText(text, file.name, file.size, ext, hint);
}

export function parseGaebText(
  text: string,
  filename: string,
  size: number,
  ext: string,
  hint: SourceFormatHint = 'auto',
): ParsedGaeb {
  let kind: 'xml' | 'ascii' | 'p' | 'unknown';
  let format: GaebFormat;

  if (hint !== 'auto') {
    if (hint === 'gaeb-xml') { kind = 'xml'; format = 'gaeb-xml-3.2'; }
    else if (hint === 'gaeb-90') { kind = 'ascii'; format = 'gaeb-90'; }
    else if (hint === 'gaeb-2000') { kind = 'p'; format = 'gaeb-2000'; }
    else if (hint === 'onorm-a2063') { kind = 'xml'; format = 'onorm-a2063'; }
    else if (hint === 'd83') { kind = 'ascii'; format = 'gaeb-90'; }
    else { kind = 'unknown'; format = 'unknown'; }
  } else {
    const sniffed = sniffFormat(text, ext);
    kind = sniffed.kind;
    format = sniffed.format;
  }

  let result: ReturnType<typeof emptyResult>;
  if (kind === 'xml') {
    const parsed = parseGaebXml(text);
    if (parsed.format !== 'unknown') format = parsed.format;
    result = {
      projectName: parsed.projectName,
      projectDescription: parsed.projectDescription,
      awardingAuthority: parsed.awardingAuthority,
      bidder: parsed.bidder,
      currency: parsed.currency,
      positions: parsed.positions,
      groups: parsed.groups,
      estimatedValue: parsed.estimatedValue,
      date: parsed.date,
      version: parsed.version,
    };
  } else if (kind === 'ascii') {
    const parsed = parseGaebAscii(text);
    result = {
      projectName: parsed.projectName,
      projectDescription: parsed.projectDescription,
      awardingAuthority: parsed.awardingAuthority,
      bidder: undefined,
      currency: parsed.currency,
      positions: parsed.positions,
      groups: parsed.groups,
      estimatedValue: parsed.estimatedValue,
      date: parsed.date,
      version: undefined,
    };
  } else if (kind === 'p') {
    const parsed = parseGaebP(text);
    result = {
      projectName: parsed.projectName,
      projectDescription: parsed.projectDescription,
      awardingAuthority: parsed.awardingAuthority,
      bidder: undefined,
      currency: parsed.currency,
      positions: parsed.positions,
      groups: parsed.groups,
      estimatedValue: parsed.estimatedValue,
      date: parsed.date,
      version: undefined,
    };
  } else {
    result = emptyResult();
  }

  return {
    filename,
    size,
    format,
    formatLabel: FORMAT_LABELS[format],
    ...result,
    positionCount: result.positions.length,
    hasLongtext: result.positions.some((p) => p.langtext && p.langtext.length > 0),
  };
}

function emptyResult() {
  return {
    projectName: undefined as string | undefined,
    projectDescription: undefined as string | undefined,
    awardingAuthority: undefined as string | undefined,
    bidder: undefined as string | undefined,
    currency: 'EUR',
    positions: [] as ParsedGaeb['positions'],
    groups: [] as ParsedGaeb['groups'],
    estimatedValue: undefined as number | undefined,
    date: undefined as string | undefined,
    version: undefined as string | undefined,
  };
}

async function readFileAsText(file: File): Promise<string> {
  const utf8 = await readWithEncoding(file, 'utf-8');
  if ((utf8.match(/�/g) || []).length > 5) {
    return readWithEncoding(file, 'windows-1252');
  }
  return utf8;
}

function readWithEncoding(file: File, encoding: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, encoding);
  });
}
