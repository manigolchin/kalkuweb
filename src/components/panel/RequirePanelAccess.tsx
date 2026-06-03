import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { hasPanelPermission, PANEL_PERMISSION_LABELS } from '@/lib/panelPermissions';
import type { PanelPermissionKey } from '@/features/kalkulation/types';

/**
 * Route-level gate for a panel feature area. Hides the page (renders a
 * "kein Zugriff" notice) when the signed-in user lacks `permission`. Admins
 * always pass. Complements the sidebar nav filtering so a deep link can't
 * bypass the gate. This is UI-level enforcement; the panel-api still scopes
 * data to the owning user.
 */
export function RequirePanelAccess({
  permission,
  children,
}: {
  permission: PanelPermissionKey;
  children: ReactNode;
}) {
  const { user } = useAuth();
  if (hasPanelPermission(user, permission)) {
    return <>{children}</>;
  }
  return (
    <div className="max-w-2xl">
      <div className="mt-2 flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-4">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">Kein Zugriff</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Sie haben keinen Zugriff auf den Bereich „{PANEL_PERMISSION_LABELS[permission].label}".
            Bitte wenden Sie sich an einen Administrator.
          </p>
          <Link to="/panel" className="mt-2 inline-block text-sm font-medium text-primary-600 dark:text-primary-300 hover:underline">
            Zurück zum Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
