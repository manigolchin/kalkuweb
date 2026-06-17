/* Header-block lifting for the Kalkulation-Vorlage importer.
 *
 * When a Vorlage is imported into a project that hasn't been filled in yet,
 * we lift its top-left header (BV → Projektname, Bieter, AG, Leistung,
 * Vergabe-Nr., Abgabe) into the project. This is what makes "Excel importieren"
 * name the project the same way "Kalkulation starten" from a Firma's
 * Ausschreibung does. Kept framework-agnostic so it can be unit-tested without
 * the ProjectDetail component tree.
 */

import type { ProjectData } from './types';

/** The subset of project meta the importer can lift from a file's header. */
export type ImportMeta = Pick<
  ProjectData,
  'name' | 'client' | 'service' | 'tenderNumber' | 'deadline' | 'bidder'
>;

/** Names a freshly-created project carries before it has been filled in — the
 *  blank-project default ('Neues Projekt') and the importer's own fallback
 *  ('Importiertes LV'). A name matching one of these counts as "not yet set",
 *  so an imported Vorlage may overwrite it with the real BV. */
const PLACEHOLDER_PROJECT_NAMES = new Set(['', 'neues projekt', 'importiertes lv']);

function isBlankMetaValue(v: string | undefined): boolean {
  return !v || v.trim() === '';
}

/**
 * Lift the header block of an imported Kalkulation-Vorlage into a project that
 * doesn't have those fields set yet. Only EMPTY destination fields are filled —
 * a project that already carries a real name/Bieter (e.g. one started from a
 * Firma's Ausschreibung) is never clobbered when a template is *appended* to
 * it. Returns the (possibly empty) patch to merge into the project data.
 */
export function fillBlankMeta(current: ImportMeta, file: ImportMeta): Partial<ProjectData> {
  const patch: Partial<ProjectData> = {};
  const nameIsPlaceholder = PLACEHOLDER_PROJECT_NAMES.has((current.name ?? '').trim().toLowerCase());
  if (nameIsPlaceholder && file.name.trim()) patch.name = file.name.trim();
  if (isBlankMetaValue(current.client) && file.client.trim()) patch.client = file.client.trim();
  if (isBlankMetaValue(current.service) && file.service.trim()) patch.service = file.service.trim();
  if (isBlankMetaValue(current.tenderNumber) && file.tenderNumber.trim()) patch.tenderNumber = file.tenderNumber.trim();
  if (isBlankMetaValue(current.deadline) && file.deadline.trim()) patch.deadline = file.deadline.trim();
  if (isBlankMetaValue(current.bidder) && file.bidder.trim()) patch.bidder = file.bidder.trim();
  return patch;
}
