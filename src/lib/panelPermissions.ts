import type { PanelPermissionKey } from '@/features/kalkulation/types';

/**
 * Canonical list of gateable panel areas, in sidebar order. Mirrors
 * PANEL_PERMISSION_KEYS in panel-api/src/schema.ts — keep the two in sync.
 * Dashboard + Einstellungen are always available and are not listed.
 */
export const PANEL_PERMISSION_KEYS: readonly PanelPermissionKey[] = [
  'kalkulation',
  'firmen',
  'vorlagen',
  'feedback',
  'submissionskarte',
];

export const PANEL_PERMISSION_LABELS: Record<
  PanelPermissionKey,
  { label: string; description: string }
> = {
  kalkulation: {
    label: 'Kalkulation',
    description: 'Projekte kalkulieren, LV importieren, Angebote teilen',
  },
  firmen: {
    label: 'Firmen',
    description: 'Firmen-Verzeichnis & Ausschreibungen einsehen',
  },
  vorlagen: {
    label: 'Vorlagen',
    description: 'Positions-Vorlagen anlegen & verwalten',
  },
  feedback: {
    label: 'Kunden-Feedback',
    description: 'Rückmeldungen & Kommentare der Kunden',
  },
  submissionskarte: {
    label: 'Submissionskarte',
    description: 'Link zur Submissionskarte (preisanfrage)',
  },
};

type PermissionCarrier = {
  role?: string;
  permissions?: Partial<Record<PanelPermissionKey, boolean>> | null;
} | null | undefined;

/** True if `user` may access the given area. Admins implicitly pass; for
 *  everyone else the effective map decides. Null-safe so test mocks and the
 *  loading state never throw. */
export function hasPanelPermission(user: PermissionCarrier, key: PanelPermissionKey): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.[key] === true;
}

export function isPanelAdmin(user: { role?: string } | null | undefined): boolean {
  return user?.role === 'admin';
}
