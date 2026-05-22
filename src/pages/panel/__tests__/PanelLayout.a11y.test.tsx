/**
 * Round 10 — a11y tests for the skip-to-content link added to PanelLayout.
 *
 * What we verify:
 *   - The link is rendered + sr-only by default (invisible to sighted users).
 *   - Tab from page-load lands on the skip-link FIRST.
 *   - The link target id="main-content" exists on a <main>.
 *   - Skip-link removes sr-only on focus (focus:not-sr-only class).
 *   - Link copy is in German per the rest of the panel UI.
 *
 * Mocks mirror PanelLayout.test.tsx so the layout boots cleanly under jsdom.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import PanelLayout from '../PanelLayout';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: {
      ...actual.api,
      notifications: {
        unread: vi.fn().mockResolvedValue({ count: 0 }),
        markViewed: vi.fn().mockResolvedValue({ ok: true }),
      },
      auth: {
        ...actual.api.auth,
        logout: vi.fn(),
        changePassword: vi.fn(),
        me: vi.fn(),
      },
      projects: {
        ...actual.api.projects,
        list: vi.fn().mockResolvedValue({ projects: [] }),
      },
    },
  };
});

let mockUser: {
  id: string;
  email: string;
  name: string;
  companyName: string;
  companyLogoUrl: string;
  companyPhone: string;
  companyContactEmail: string;
  mustChangePassword: boolean;
} | null = null;
const logoutMock = vi.fn();
const setUserMock = vi.fn();
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    status: mockUser ? 'authenticated' : 'unauthenticated',
    user: mockUser,
    login: vi.fn(),
    logout: logoutMock,
    refresh: vi.fn(),
    setUser: setUserMock,
  }),
}));

function buildUser() {
  return {
    id: 'u1',
    email: 'inhaber@firma.de',
    name: 'Max',
    companyName: 'Mustermann Bau',
    companyLogoUrl: '',
    companyPhone: '',
    companyContactEmail: '',
    mustChangePassword: false,
  };
}

function renderLayout() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/panel']}>
        <Routes>
          <Route path="/panel" element={<PanelLayout />}>
            <Route index element={<div data-testid="outlet">HOME</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  navigateMock.mockReset();
  mockUser = buildUser();
  window.localStorage.clear();
});

describe('PanelLayout — skip-to-content link', () => {
  test('skip-link is rendered with sr-only class by default', async () => {
    renderLayout();
    await waitFor(() => expect(screen.getByText(/Zum Hauptinhalt springen/)).toBeDefined());
    const skip = screen.getByText(/Zum Hauptinhalt springen/);
    // sr-only — visually hidden until focused. Class must contain the literal
    // 'sr-only' Tailwind utility name and the focus override.
    expect(skip.className).toContain('sr-only');
    expect(skip.className).toContain('focus:not-sr-only');
  });

  test('skip-link has href="#main-content" and the target <main> has that id', async () => {
    renderLayout();
    await waitFor(() => expect(screen.getByText(/Zum Hauptinhalt springen/)).toBeDefined());
    const skip = screen.getByText(/Zum Hauptinhalt springen/) as HTMLAnchorElement;
    expect(skip.getAttribute('href')).toBe('#main-content');
    // The <main> element must carry id="main-content" so the anchor jumps to it.
    const main = document.querySelector('main#main-content');
    expect(main).not.toBeNull();
  });

  test('skip-link is the FIRST focusable element in the DOM order', async () => {
    renderLayout();
    await waitFor(() => expect(screen.getByText(/Zum Hauptinhalt springen/)).toBeDefined());
    // Collect the first focusable element on the page (skip-link should come
    // before sidebar links, menu buttons, palette opener, etc.). We assert by
    // DOM order — the harness doesn't simulate the browser's Tab algorithm.
    const focusables = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    );
    expect(focusables.length).toBeGreaterThan(0);
    expect(focusables[0].textContent).toMatch(/Zum Hauptinhalt springen/);
  });

  test('skip-link receives focus when programmatically focused (sanity)', async () => {
    renderLayout();
    await waitFor(() => expect(screen.getByText(/Zum Hauptinhalt springen/)).toBeDefined());
    const skip = screen.getByText(/Zum Hauptinhalt springen/) as HTMLAnchorElement;
    skip.focus();
    expect(document.activeElement).toBe(skip);
  });

  test('skip-link text is in German per panel UX convention', async () => {
    renderLayout();
    await waitFor(() => expect(screen.getByText(/Zum Hauptinhalt springen/)).toBeDefined());
    // "Skip to content" would be wrong here — assert exact German wording.
    expect(screen.getByText('Zum Hauptinhalt springen')).toBeDefined();
    expect(screen.queryByText(/Skip to (main )?content/i)).toBeNull();
  });
});
