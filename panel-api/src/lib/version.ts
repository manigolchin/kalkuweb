/**
 * Reads the panel-api package.json `version` field once at module load.
 *
 * Used by the `/api/panel/health` endpoint so operators can correlate the
 * deployed binary with a known commit / release. Falling back to `'unknown'`
 * if the file is missing or unreadable keeps the health endpoint a 200 even
 * when packaging is unusual (e.g. inside an unusual container layer).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FALLBACK = 'unknown';

function readVersion(): string {
  try {
    // __dirname-equivalent for ESM. lib/ → src/ → panel-api/ → package.json
    const here = dirname(fileURLToPath(import.meta.url));
    // From src/lib → ../../package.json (works at both src + dist layouts).
    const candidates = [
      join(here, '..', '..', 'package.json'),
      join(here, '..', '..', '..', 'package.json'),
    ];
    for (const path of candidates) {
      try {
        const raw = readFileSync(path, 'utf8');
        const pkg = JSON.parse(raw) as { name?: string; version?: string };
        if (pkg && typeof pkg.version === 'string' && pkg.version.length > 0) {
          return pkg.version;
        }
      } catch {
        // try next candidate
      }
    }
  } catch {
    /* fall through */
  }
  return FALLBACK;
}

/** Frozen at module load — cheap to read repeatedly. */
export const PACKAGE_VERSION: string = readVersion();

/** Re-export as a function for tests + future overrides. */
export function getVersion(): string {
  return PACKAGE_VERSION;
}
