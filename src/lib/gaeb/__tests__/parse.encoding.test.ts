/**
 * Encoding regression for GAEB 90 (ASCII) imports.
 *
 * GAEB 90 files come from DOS tooling and are CP437-encoded: ü=0x81, ä=0x84,
 * ö=0x94, ß=0xE1. The reader used to fall back to windows-1252 for any
 * non-UTF-8 file, which turned "Flächen" into "Fl„chen" and "für" into "f r"
 * (0x84 is „ and 0x81 is undefined in windows-1252). The reader now decodes
 * CP437 when its umlaut bytes dominate, while still honouring genuinely
 * windows-1252 / UTF-8 files.
 */

import { describe, test, expect } from 'vitest';
import { parseGaebFile } from '@/lib/gaeb';

const CP437: Record<string, number> = {
  ä: 0x84, ö: 0x94, ü: 0x81, Ä: 0x8e, Ö: 0x99, Ü: 0x9a, ß: 0xe1,
};
const WIN1252: Record<string, number> = {
  ä: 0xe4, ö: 0xf6, ü: 0xfc, Ä: 0xc4, Ö: 0xd6, Ü: 0xdc, ß: 0xdf,
};

function encode(text: string, map: Record<string, number>): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    out[i] = map[text[i]] ?? text.charCodeAt(i);
  }
  return out;
}

// Minimal GAEB 90 (ASCII): "00 …" header so the sniffer routes to the ASCII
// parser, a project name (02), one position (21) + Kurztext (25), EOF (99).
const SAMPLE = [
  '00       83',
  '02Gebäude Süd',
  '21000100',
  '25Außenwände prüfen für Größe',
  '99',
].join('\n');

function fileFrom(bytes: Uint8Array, name = 'sample.d83'): File {
  // Copy into a fresh ArrayBuffer-backed view so the File constructor accepts
  // it as a BlobPart under TS's generic Uint8Array<ArrayBufferLike> typing.
  return new File([new Uint8Array(bytes)], name);
}

describe('GAEB 90 (ASCII) encoding', () => {
  test('decodes a CP437-encoded file with correct umlauts', async () => {
    const parsed = await parseGaebFile(fileFrom(encode(SAMPLE, CP437)));
    expect(parsed.format).toBe('gaeb-90');
    expect(parsed.projectName).toBe('Gebäude Süd');
    expect(parsed.positions[0]?.kurztext).toBe('Außenwände prüfen für Größe');
  });

  test('still decodes a windows-1252-encoded file correctly', async () => {
    const parsed = await parseGaebFile(fileFrom(encode(SAMPLE, WIN1252)));
    expect(parsed.projectName).toBe('Gebäude Süd');
    expect(parsed.positions[0]?.kurztext).toBe('Außenwände prüfen für Größe');
  });

  test('leaves a clean UTF-8 file untouched', async () => {
    const parsed = await parseGaebFile(fileFrom(new TextEncoder().encode(SAMPLE)));
    expect(parsed.projectName).toBe('Gebäude Süd');
    expect(parsed.positions[0]?.kurztext).toBe('Außenwände prüfen für Größe');
  });
});
