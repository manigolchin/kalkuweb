/**
 * Round 10 — tests for the PanelErrorBoundary.
 *
 * Covers:
 *   - Renders children when no error
 *   - Catches a throwing child and renders the German fallback card
 *   - Shows the error message inside the card
 *   - Shows the "Neu laden" button
 *   - "Neu laden" click calls window.location.reload
 *   - Resets hasError when location.pathname changes (via the resetKey prop
 *     on the inner class component — exercised directly to avoid spinning
 *     up a real router for each rerender)
 *   - Dev mode logs to console.error
 *   - Doesn't crash on null/undefined children
 *   - Recovers cleanly after re-mount
 *   - Works inside HelmetProvider + MemoryRouter (the panel's real environment)
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactElement } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import PanelErrorBoundary, { PanelErrorBoundaryInner } from '../PanelErrorBoundary';

/**
 * Tiny throw-on-mount component used to exercise the boundary.
 * Throwing inside render is what triggers componentDidCatch / getDerivedStateFromError.
 *
 * The explicit `JSX.Element` return type keeps TS happy (a `void`-returning
 * function isn't a valid JSX component, but the `throw` is reachable so the
 * fake return is dead code).
 */
function Boom({ message = 'kapow' }: { message?: string }): ReactElement {
  throw new Error(message);
}

function OkChild({ label = 'inside' }: { label?: string }) {
  return <span data-testid="ok-child">{label}</span>;
}

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  // React 19 still logs uncaught child errors to the console even when
  // a boundary catches them. Silence the noise so test output is readable.
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe('PanelErrorBoundary — happy path', () => {
  test('renders children unchanged when nothing throws', () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <PanelErrorBoundary>
            <OkChild label="hello" />
          </PanelErrorBoundary>
        </MemoryRouter>
      </HelmetProvider>,
    );
    expect(screen.getByTestId('ok-child').textContent).toBe('hello');
    expect(screen.queryByText(/Etwas ist schiefgegangen/)).toBeNull();
  });

  test('does NOT throw when children are null', () => {
    expect(() =>
      render(
        <HelmetProvider>
          <MemoryRouter>
            <PanelErrorBoundary>{null}</PanelErrorBoundary>
          </MemoryRouter>
        </HelmetProvider>,
      ),
    ).not.toThrow();
  });

  test('does NOT throw when children are undefined', () => {
    expect(() =>
      render(
        <HelmetProvider>
          <MemoryRouter>
            <PanelErrorBoundary>{undefined}</PanelErrorBoundary>
          </MemoryRouter>
        </HelmetProvider>,
      ),
    ).not.toThrow();
  });
});

describe('PanelErrorBoundary — catch + fallback', () => {
  test('renders the German fallback when a child throws', () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <PanelErrorBoundary>
            <Boom message="oh no" />
          </PanelErrorBoundary>
        </MemoryRouter>
      </HelmetProvider>,
    );
    expect(screen.getByText(/Etwas ist schiefgegangen/)).toBeDefined();
  });

  test('shows the error.message verbatim in the fallback card', () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <PanelErrorBoundary>
            <Boom message="UPSTREAM_404_no_firma" />
          </PanelErrorBoundary>
        </MemoryRouter>
      </HelmetProvider>,
    );
    expect(screen.getByText('UPSTREAM_404_no_firma')).toBeDefined();
  });

  test('renders a "Neu laden" button in the fallback', () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <PanelErrorBoundary>
            <Boom />
          </PanelErrorBoundary>
        </MemoryRouter>
      </HelmetProvider>,
    );
    expect(screen.getByRole('button', { name: /Neu laden/ })).toBeDefined();
  });

  test('"Neu laden" calls window.location.reload', () => {
    // jsdom's window.location.reload is non-configurable. Replace `location`
    // itself with a minimal proxy that captures the reload call, then restore
    // the original location after the test.
    const realLocation = window.location;
    const reloadSpy = vi.fn();
    // Use `as never` to bypass the very-strict Location type — we only need
    // .reload for this test.
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...realLocation, reload: reloadSpy } as unknown as Location,
    });
    try {
      render(
        <HelmetProvider>
          <MemoryRouter>
            <PanelErrorBoundary>
              <Boom />
            </PanelErrorBoundary>
          </MemoryRouter>
        </HelmetProvider>,
      );
      fireEvent.click(screen.getByRole('button', { name: /Neu laden/ }));
      expect(reloadSpy).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        writable: true,
        value: realLocation,
      });
    }
  });

  test('logs to console.error in dev mode', () => {
    // import.meta.env.DEV is `true` under vitest, so the boundary logs.
    render(
      <HelmetProvider>
        <MemoryRouter>
          <PanelErrorBoundary>
            <Boom message="dev-log-check" />
          </PanelErrorBoundary>
        </MemoryRouter>
      </HelmetProvider>,
    );
    // At minimum, the boundary's own log call landed — the spy was hit.
    // (React also logs the original error, so we don't pin an exact count.)
    expect(errorSpy).toHaveBeenCalled();
    // And our specific prefix is in the captured calls.
    const matched = errorSpy.mock.calls.some(
      (args: unknown[]) =>
        typeof args[0] === 'string' && args[0].includes('[PanelErrorBoundary]'),
    );
    expect(matched).toBe(true);
  });
});

describe('PanelErrorBoundary — reset on route change', () => {
  test('flipping resetKey clears the error so children re-render', () => {
    // Drive the inner class component directly — simpler than swapping out
    // a child between renders to flip the throw on/off.
    const { rerender } = render(
      <PanelErrorBoundaryInner resetKey="/panel/firmen">
        <Boom message="first" />
      </PanelErrorBoundaryInner>,
    );
    expect(screen.getByText(/Etwas ist schiefgegangen/)).toBeDefined();

    // After route change (resetKey flips), the boundary clears + re-renders children.
    rerender(
      <PanelErrorBoundaryInner resetKey="/panel/kalkulation">
        <OkChild label="recovered" />
      </PanelErrorBoundaryInner>,
    );
    expect(screen.queryByText(/Etwas ist schiefgegangen/)).toBeNull();
    expect(screen.getByTestId('ok-child').textContent).toBe('recovered');
  });

  test('integration: clicking a sidebar Link to a different route clears the boundary', () => {
    // Simulate the real panel: two routes, one of which throws.
    // After navigation, the boundary should reset and the new route renders.
    function Sidebar() {
      return (
        <nav>
          <Link to="/panel/safe" data-testid="link-safe">
            Safe
          </Link>
          <Link to="/panel/broken" data-testid="link-broken">
            Broken
          </Link>
        </nav>
      );
    }
    function App() {
      return (
        <>
          <Sidebar />
          <PanelErrorBoundary>
            <Routes>
              <Route path="/panel/safe" element={<OkChild label="safe-page" />} />
              <Route path="/panel/broken" element={<Boom message="route-throw" />} />
            </Routes>
          </PanelErrorBoundary>
        </>
      );
    }
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/panel/broken']}>
          <App />
        </MemoryRouter>
      </HelmetProvider>,
    );
    // Boom — boundary shows fallback.
    expect(screen.getByText(/Etwas ist schiefgegangen/)).toBeDefined();
    // Click "Safe" — route changes, boundary resets, safe page renders.
    fireEvent.click(screen.getByTestId('link-safe'));
    expect(screen.queryByText(/Etwas ist schiefgegangen/)).toBeNull();
    expect(screen.getByTestId('ok-child').textContent).toBe('safe-page');
  });
});

describe('PanelErrorBoundary — recovery after unmount', () => {
  test('a second mount of the boundary starts in a fresh state', () => {
    const { unmount } = render(
      <HelmetProvider>
        <MemoryRouter>
          <PanelErrorBoundary>
            <Boom message="first" />
          </PanelErrorBoundary>
        </MemoryRouter>
      </HelmetProvider>,
    );
    expect(screen.getByText(/Etwas ist schiefgegangen/)).toBeDefined();
    unmount();

    render(
      <HelmetProvider>
        <MemoryRouter>
          <PanelErrorBoundary>
            <OkChild label="after-remount" />
          </PanelErrorBoundary>
        </MemoryRouter>
      </HelmetProvider>,
    );
    expect(screen.queryByText(/Etwas ist schiefgegangen/)).toBeNull();
    expect(screen.getByTestId('ok-child').textContent).toBe('after-remount');
  });
});
