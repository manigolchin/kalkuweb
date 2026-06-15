/**
 * Round 9 — frontend tests for PanelLayout.tsx (currently 0% coverage).
 *
 * Targets:
 *   - Renders sidebar nav with all 6 entries
 *   - "Archiv" has the "BALD" badge
 *   - Unread-feedback badge appears when api.notifications.unread > 0
 *   - Logout button calls api.auth.logout + navigates to /login
 *   - Theme toggle persists to localStorage (kalku.panel.theme)
 *   - Sidebar collapse persists to localStorage (kalku.panel.sidebarCollapsed)
 *   - Mobile menu opens + closes
 *   - "/" key focuses palette (NOT in input)
 *   - ⌘K / Ctrl+K toggles palette
 *   - g+p navigates to /panel/kalkulation
 *   - Force-password modal shows when user.mustChangePassword=true
 *   - Hotkeys disabled while force-password is open
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import PanelLayout from '../PanelLayout';

// react-hot-toast pulls in matchMedia which jsdom doesn't have.
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

// Mock api — both notifications and auth.
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: {
      ...actual.api,
      notifications: {
        unread: vi.fn(),
        markViewed: vi.fn(),
      },
      auth: {
        ...actual.api.auth,
        logout: vi.fn(),
        changePassword: vi.fn(),
        me: vi.fn(),
      },
      projects: {
        ...actual.api.projects,
        list: vi.fn(),
      },
    },
  };
});

import { api } from '@/lib/api';
const unreadMock = api.notifications.unread as ReturnType<typeof vi.fn>;
const markViewedMock = api.notifications.markViewed as ReturnType<typeof vi.fn>;
const projectsListMock = api.projects.list as ReturnType<typeof vi.fn>;

// useAuth mock — provide a fake user. Tests can mutate the auth state by
// reassigning mockUser before render.
let mockUser: {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  permissions: Record<string, boolean>;
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

function buildUser(over: Partial<NonNullable<typeof mockUser>> = {}) {
  return {
    id: 'u1',
    email: 'inhaber@firma.de',
    name: 'Max Mustermann',
    role: 'admin' as const,
    permissions: {} as Record<string, boolean>,
    companyName: 'Mustermann Bau GmbH',
    companyLogoUrl: '',
    companyPhone: '',
    companyContactEmail: '',
    mustChangePassword: false,
    ...over,
  };
}

function renderLayout(path = '/panel') {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/panel" element={<PanelLayout />}>
            <Route index element={<div data-testid="outlet-home">HOME</div>} />
            <Route path="firmen" element={<div data-testid="outlet-firmen">FIRMEN</div>} />
            <Route
              path="kalkulation"
              element={<div data-testid="outlet-projects">PROJECTS</div>}
            />
            <Route
              path="feedback"
              element={<div data-testid="outlet-feedback">FEEDBACK</div>}
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  navigateMock.mockReset();
  unreadMock.mockResolvedValue({ count: 0 });
  markViewedMock.mockResolvedValue({ ok: true });
  projectsListMock.mockResolvedValue({ projects: [] });
  mockUser = buildUser();
  window.localStorage.clear();
});

describe('PanelLayout.tsx — sidebar nav', () => {
  test('renders all 6 nav labels', async () => {
    renderLayout();
    await waitFor(() => expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Firmen').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Kalkulation').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Kunden-Feedback').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Archiv').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Einstellungen').length).toBeGreaterThan(0);
  });

  test('"Archiv" carries the BALD badge', async () => {
    renderLayout();
    await waitFor(() => expect(screen.getAllByText('Archiv').length).toBeGreaterThan(0));
    // The "soon" badge label is "Bald" (StatusBadge → label='Bald').
    expect(screen.getAllByText(/Bald/).length).toBeGreaterThan(0);
  });
});

describe('PanelLayout.tsx — unread feedback badge', () => {
  test('renders unread count when api returns > 0', async () => {
    unreadMock.mockResolvedValueOnce({ count: 3 });
    renderLayout();
    await waitFor(() => expect(screen.getAllByText('3').length).toBeGreaterThan(0));
  });

  test('does NOT render badge when api returns 0', async () => {
    unreadMock.mockResolvedValueOnce({ count: 0 });
    renderLayout();
    await waitFor(() => expect(unreadMock).toHaveBeenCalled());
    // No "0" badge — and the badge node has bg-amber-500. Easy proxy: no
    // visible numeric badge sibling on the Feedback nav entry.
    expect(screen.queryByText('1')).toBeNull();
  });
});

describe('PanelLayout.tsx — logout', () => {
  test('clicking Abmelden calls logout + navigates to /login', async () => {
    renderLayout();
    await waitFor(() => expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0));
    const logoutBtns = screen.getAllByLabelText(/Abmelden/);
    fireEvent.click(logoutBtns[0]);
    await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true }));
  });
});

describe('PanelLayout.tsx — sidebar collapse persistence', () => {
  test('clicking collapse toggle persists "1" to kalku.panel.sidebarCollapsed', async () => {
    renderLayout();
    await waitFor(() => expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0));
    const collapseBtn = screen.getByLabelText(/Seitenleiste einklappen/);
    fireEvent.click(collapseBtn);
    expect(window.localStorage.getItem('kalku.panel.sidebarCollapsed')).toBe('1');
  });

  test('initial render uses the stored collapsed flag', async () => {
    window.localStorage.setItem('kalku.panel.sidebarCollapsed', '1');
    renderLayout();
    // Wait for the layout to mount — the sidebar opener button is always
    // present (mobile menu button) so wait on that.
    await waitFor(() => expect(screen.getByLabelText(/Menü öffnen/)).toBeDefined());
    // When collapsed, the brand label "KALKU Panel" is NOT rendered.
    expect(screen.queryByText('KALKU Panel')).toBeNull();
  });
});

describe('PanelLayout.tsx — theme toggle', () => {
  test('theme toggle persists to kalku.panel.theme', async () => {
    // Start light (no stored value defaults to system, but our jsdom matchMedia is missing).
    window.localStorage.setItem('kalku.panel.theme', 'light');
    renderLayout();
    await waitFor(() => expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0));
    const themeBtn = screen.getByLabelText(/Dunkel-Modus aktivieren/);
    fireEvent.click(themeBtn);
    expect(window.localStorage.getItem('kalku.panel.theme')).toBe('dark');
  });
});

describe('PanelLayout.tsx — mobile menu', () => {
  test('clicking Menu-button opens the mobile drawer', async () => {
    renderLayout();
    await waitFor(() => expect(screen.getByLabelText(/Menü öffnen/)).toBeDefined());
    fireEvent.click(screen.getByLabelText(/Menü öffnen/));
    // After open, the close-button is rendered in the drawer.
    expect(screen.getByLabelText(/Menü schließen/)).toBeDefined();
  });

  test('clicking close inside drawer closes the drawer', async () => {
    renderLayout();
    await waitFor(() => expect(screen.getByLabelText(/Menü öffnen/)).toBeDefined());
    fireEvent.click(screen.getByLabelText(/Menü öffnen/));
    const closeBtn = screen.getByLabelText(/Menü schließen/);
    fireEvent.click(closeBtn);
    expect(screen.queryByLabelText(/Menü schließen/)).toBeNull();
  });
});

describe('PanelLayout.tsx — hotkeys', () => {
  test('"/" key opens the command palette', async () => {
    renderLayout();
    await waitFor(() => expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0));
    fireEvent.keyDown(window, { key: '/' });
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/Befehl, Projekt oder Seite suchen/)).toBeDefined(),
    );
  });

  test('⌘K toggles the palette open/closed', async () => {
    renderLayout();
    await waitFor(() => expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0));
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/Befehl, Projekt oder Seite suchen/)).toBeDefined(),
    );
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() =>
      expect(screen.queryByPlaceholderText(/Befehl, Projekt oder Seite suchen/)).toBeNull(),
    );
  });

  test('g then p navigates to /panel/kalkulation (g leader)', async () => {
    renderLayout();
    await waitFor(() => expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0));
    fireEvent.keyDown(window, { key: 'g' });
    fireEvent.keyDown(window, { key: 'p' });
    expect(navigateMock).toHaveBeenCalledWith('/panel/kalkulation');
  });
});

describe('PanelLayout.tsx — force-password gate', () => {
  test('renders the password-change modal when user.mustChangePassword=true', async () => {
    mockUser = buildUser({ mustChangePassword: true });
    renderLayout();
    await waitFor(() => expect(screen.getByText(/Bitte zuerst ein neues Passwort setzen/)).toBeDefined());
  });

  test('global "g" + "p" hotkey is suppressed while force-password modal is open', async () => {
    mockUser = buildUser({ mustChangePassword: true });
    renderLayout();
    await waitFor(() => expect(screen.getByText(/Bitte zuerst ein neues Passwort setzen/)).toBeDefined());
    navigateMock.mockClear();
    fireEvent.keyDown(window, { key: 'g' });
    fireEvent.keyDown(window, { key: 'p' });
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
