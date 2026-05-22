/**
 * Panel-route error boundary — catches render errors inside `<Outlet />`
 * so a single broken page does NOT take down the whole panel chrome.
 *
 * Pattern:
 *   <PanelErrorBoundary>
 *     <Outlet />
 *   </PanelErrorBoundary>
 *
 * Behaviour:
 *   - When a descendant throws, render a German fallback card with the
 *     error message + "Neu laden" button (full page reload).
 *   - Reset its `hasError` flag automatically when `location.pathname`
 *     changes — so the user can navigate away from the broken page via
 *     the sidebar without re-mounting the whole panel.
 *   - In dev mode (Vite `import.meta.env.DEV`), log the error to
 *     `console.error`. In production: swallow (no external tracker).
 *
 * Why a class component? React 19 still requires `componentDidCatch` /
 * `getDerivedStateFromError` to actually catch render errors — hooks
 * have no equivalent.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';

type Props = {
  children?: ReactNode;
  /** Reset key — when this changes, the boundary clears `hasError`. */
  resetKey?: string;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

class PanelErrorBoundaryInner extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Dev only — production has no external error tracker wired.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isDev = (import.meta as any).env?.DEV === true;
    if (isDev) {
      console.error('[PanelErrorBoundary] caught render error:', error, info);
    }
  }

  componentDidUpdate(prevProps: Props): void {
    // When the route changes (resetKey flips), forget the previous error
    // so navigating away from the broken page works without a full reload.
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleReload = () => {
    if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const message = this.state.error?.message ?? 'Unbekannter Fehler.';
      return (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-6"
          data-testid="panel-error-boundary"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/60 shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-300" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-rose-900 dark:text-rose-100">
                Etwas ist schiefgegangen
              </h2>
              <p className="text-sm text-rose-800 dark:text-rose-200 mt-1 leading-relaxed">
                Diese Seite konnte nicht angezeigt werden. Sie können oben links zu einer
                anderen Seite navigieren — oder die Seite neu laden.
              </p>
              <pre className="mt-3 text-xs text-rose-900/80 dark:text-rose-200/80 bg-white/60 dark:bg-rose-950/40 rounded border border-rose-200 dark:border-rose-900/60 px-2 py-1.5 whitespace-pre-wrap break-words font-mono">
                {message}
              </pre>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Neu laden
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children ?? null;
  }
}

/**
 * Default export — thin functional wrapper that pulls `location.pathname`
 * out of react-router so the class boundary can reset on navigation.
 *
 * Exported separately so consumers can pass children via the standard
 * React tree (no special props required).
 */
export default function PanelErrorBoundary({ children }: { children?: ReactNode }) {
  const location = useLocation();
  return (
    <PanelErrorBoundaryInner resetKey={location.pathname}>
      {children}
    </PanelErrorBoundaryInner>
  );
}

/** Exposed for tests that want to drive the boundary without a router. */
export { PanelErrorBoundaryInner };
