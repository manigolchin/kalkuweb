/**
 * Type declarations for ozParser.mjs (kept as plain JS so node:test can run
 * it directly without a TS loader).
 */

export type CellLike = { v?: unknown; t?: string; f?: string } | null | undefined;

export type RowClassification = 'group' | 'position' | 'buffer';

export type RowLike = {
  oz?: unknown;
  A?: unknown;
  B?: unknown;
  C?: unknown;
  D?: unknown;
  E?: unknown;
  F?: unknown;
};

export function ozSegments(raw: unknown): string[];
export function ozKey(raw: unknown): string;
export function ozLevel(raw: unknown): number;
export function classifyRow(row: RowLike): RowClassification;
export function isErrorCell(cell: CellLike): boolean;

export const ERROR_LITERALS: ReadonlySet<string>;
