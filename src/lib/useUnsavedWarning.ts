/**
 * Browser-native warning when the user tries to navigate away from a page
 * with unsaved changes. Returns nothing — pure side-effect hook.
 *
 * Used by ProjectPreisspiegel and ProjectActuals (Nachkalk), both of which
 * mutate local state on every edit but only persist when the user clicks
 * Save. Without this guard, reloading the tab or following a link silently
 * loses everything (called out in the 2026-05-23 audit).
 *
 * The string we return from the handler is ignored by modern browsers —
 * they show a generic message — but we still need to set returnValue +
 * call preventDefault for the prompt to appear. The German copy is a
 * fallback for the few browsers that still surface it.
 */
import { useEffect } from 'react';

export function useUnsavedWarning(when: boolean): void {
  useEffect(() => {
    if (!when) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = 'Sie haben ungespeicherte Änderungen.';
      return e.returnValue;
    }
    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
    };
  }, [when]);
}
