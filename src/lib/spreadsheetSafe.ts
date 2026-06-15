/**
 * CSV / spreadsheet formula-injection guard (CWE-1236).
 *
 * Excel and LibreOffice evaluate a cell whose text begins with `=`, `+`, `-`,
 * `@`, or a leading TAB/CR as a live formula when the file is opened — which a
 * crafted value can abuse for DDE command execution or silent data exfiltration
 * (`=HYPERLINK(...)`, `=WEBSERVICE(...)`, `=cmd|'/c …'!A0`). Much of what this
 * app exports (Bezeichnung, OZ, Bieter, Auftraggeber, …) originates from a
 * third-party GAEB/LV the bidder *received*, so it must be treated as untrusted.
 *
 * Prefixing a single apostrophe forces the reader to treat the value as text.
 * Legitimate LV strings start with a letter or digit, so this only ever fires on
 * a malicious or genuinely formula-shaped value; numbers are exported as numeric
 * cells and never pass through here.
 */
export function guardSpreadsheetFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** Map a string cell through the guard; pass non-strings (numbers, formula
 *  objects) through untouched. Convenience for the row-array export sinks. */
export function guardCell<T>(cell: T): T | string {
  return typeof cell === 'string' ? guardSpreadsheetFormula(cell) : cell;
}
