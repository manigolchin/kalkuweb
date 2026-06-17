/**
 * Tests for `fillBlankMeta` (importMeta.ts) — the helper that lifts an
 * imported Kalkulation-Vorlage's header block (BV → Projektname, Bieter, AG,
 * Leistung, Vergabe-Nr., Abgabe) into a project that hasn't been filled in yet.
 *
 * Contract:
 *  - A blank project ('Neues Projekt' / empty) adopts every non-empty file field.
 *  - A project that already carries a real name/Bieter keeps them (never
 *    clobbered when a template is appended), but still gets its EMPTY fields
 *    filled.
 *  - The importer fallback name 'Importiertes LV' counts as a placeholder.
 *  - Empty/whitespace file fields never overwrite anything.
 */
import { describe, test, expect } from 'vitest';
import { fillBlankMeta, type ImportMeta } from '../importMeta';

type Meta = ImportMeta;

const FILE: Meta = {
  name: 'Blücherhof Kiel',
  client: 'Heinrich Karstens Bauunternehmung GmbH & Co. KG',
  service: 'Elektroinstallation',
  tenderNumber: '25-3-019',
  deadline: '29.05.26 um 23:56 Uhr',
  bidder: 'Otto Speetzen Elektrotechnik GmbH',
};

const BLANK: Meta = {
  name: 'Neues Projekt',
  client: '',
  service: '',
  tenderNumber: '',
  deadline: '',
  bidder: '',
};

describe('fillBlankMeta', () => {
  test('blank project adopts every field from the imported file', () => {
    expect(fillBlankMeta(BLANK, FILE)).toEqual({
      name: 'Blücherhof Kiel',
      client: 'Heinrich Karstens Bauunternehmung GmbH & Co. KG',
      service: 'Elektroinstallation',
      tenderNumber: '25-3-019',
      deadline: '29.05.26 um 23:56 Uhr',
      bidder: 'Otto Speetzen Elektrotechnik GmbH',
    });
  });

  test('a truly empty name ("") is also treated as a placeholder', () => {
    const patch = fillBlankMeta({ ...BLANK, name: '' }, FILE);
    expect(patch.name).toBe('Blücherhof Kiel');
  });

  test('the importer fallback name "Importiertes LV" is a placeholder', () => {
    const patch = fillBlankMeta({ ...BLANK, name: 'Importiertes LV' }, FILE);
    expect(patch.name).toBe('Blücherhof Kiel');
  });

  test('a real, user-set name and bidder are NOT overwritten', () => {
    const current: Meta = {
      name: 'Sanierung Marktstraße 12',
      client: 'Stadt Saarbrücken',
      service: 'Trockenbau',
      tenderNumber: 'SB-2026-07',
      deadline: '01.07.26',
      bidder: 'Müller Bau GmbH',
    };
    expect(fillBlankMeta(current, FILE)).toEqual({});
  });

  test('keeps the existing name/bidder but still fills the empty fields', () => {
    const current: Meta = {
      name: 'Mein Projekt',
      client: '',
      service: 'Elektro',
      tenderNumber: '',
      deadline: '',
      bidder: 'Bestehender Bieter GmbH',
    };
    expect(fillBlankMeta(current, FILE)).toEqual({
      client: 'Heinrich Karstens Bauunternehmung GmbH & Co. KG',
      tenderNumber: '25-3-019',
      deadline: '29.05.26 um 23:56 Uhr',
    });
  });

  test('whitespace-only current values count as blank', () => {
    const patch = fillBlankMeta({ ...BLANK, name: '   ', bidder: '  ' }, FILE);
    expect(patch.name).toBe('Blücherhof Kiel');
    expect(patch.bidder).toBe('Otto Speetzen Elektrotechnik GmbH');
  });

  test('empty file fields never overwrite, and values are trimmed', () => {
    const sparseFile: Meta = {
      name: '  Anbau Mensa  ',
      client: '',
      service: '   ',
      tenderNumber: 'S-2026-27',
      deadline: '',
      bidder: '',
    };
    expect(fillBlankMeta(BLANK, sparseFile)).toEqual({
      name: 'Anbau Mensa',
      tenderNumber: 'S-2026-27',
    });
  });
});
