/**
 * Round 9 — frontend tests for Login.tsx (currently 0% coverage).
 *
 * Targets:
 *   - Renders form (email + password + submit)
 *   - Submits via useAuth().login(email, password)
 *   - Successful login → navigates to /panel
 *   - Wrong-credentials (401) shows German error chip
 *   - 400 shows generic-validation chip
 *   - 500 falls back to "Anmeldung fehlgeschlagen…"
 *   - Email/Password required HTML attribute
 *   - Password input type=password
 *   - Loading state disables submit while in-flight
 *   - "Zurück zu kalku.de" link present
 *   - Password autocomplete is "current-password" (NOT "off") so managers work
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Login from '../Login';

// react-hot-toast's <Toaster /> reads window.matchMedia at mount; jsdom
// doesn't provide it. Stub it just in case any indirect import wires in.
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

// Mock the auth context — Login calls useAuth() to get login/status.
const loginMock = vi.fn();
let mockAuthStatus: 'loading' | 'authenticated' | 'unauthenticated' = 'unauthenticated';
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    status: mockAuthStatus,
    user: null,
    login: loginMock,
    logout: vi.fn(),
    refresh: vi.fn(),
    setUser: vi.fn(),
  }),
}));

// We import the real ApiError for the 401/400 instanceof check inside Login.
import { ApiError } from '@/lib/api';

function renderLogin() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  navigateMock.mockReset();
  loginMock.mockReset();
  mockAuthStatus = 'unauthenticated';
});

describe('Login.tsx — render', () => {
  test('renders an email + password field + Anmelden submit', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('ihre@firma.de')).toBeDefined();
    expect(screen.getByPlaceholderText('••••••••')).toBeDefined();
    expect(screen.getByRole('button', { name: /Anmelden/ })).toBeDefined();
  });

  test('"Zurück zu kalku.de" back-link is present', () => {
    renderLogin();
    expect(screen.getByText(/Zurück zu kalku\.de/)).toBeDefined();
  });

  test('shows the "Zugang vergessen?" hint', () => {
    renderLogin();
    expect(screen.getByText(/Zugang vergessen\?/)).toBeDefined();
  });

  test('renders no error chip by default', () => {
    renderLogin();
    // The chip is only rendered when error state is set; verify it isn't.
    expect(screen.queryByText(/Anmeldung fehlgeschlagen/)).toBeNull();
    expect(screen.queryByText(/E-Mail oder Passwort/)).toBeNull();
  });
});

describe('Login.tsx — form attributes', () => {
  test('email field has required + type=email', () => {
    renderLogin();
    const email = screen.getByPlaceholderText('ihre@firma.de') as HTMLInputElement;
    expect(email.required).toBe(true);
    expect(email.type).toBe('email');
  });

  test('password field is type=password and required', () => {
    renderLogin();
    const pw = screen.getByPlaceholderText('••••••••') as HTMLInputElement;
    expect(pw.type).toBe('password');
    expect(pw.required).toBe(true);
  });

  test('password autocomplete is "current-password" (lets password managers fill)', () => {
    renderLogin();
    const pw = screen.getByPlaceholderText('••••••••') as HTMLInputElement;
    expect(pw.autocomplete).toBe('current-password');
    expect(pw.autocomplete).not.toBe('off');
  });
});

describe('Login.tsx — submit happy path', () => {
  test('submitting calls login(email lowercased + trimmed, password)', async () => {
    loginMock.mockResolvedValueOnce(undefined);
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('ihre@firma.de'), {
      target: { value: '  USER@FIRMA.DE  ' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'Secret123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Anmelden/ }));
    await waitFor(() => expect(loginMock).toHaveBeenCalledTimes(1));
    expect(loginMock).toHaveBeenCalledWith('user@firma.de', 'Secret123!');
  });

  test('successful login → navigates to /panel by default', async () => {
    loginMock.mockResolvedValueOnce(undefined);
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('ihre@firma.de'), {
      target: { value: 'a@b.de' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'pw' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Anmelden/ }));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/panel', { replace: true }));
  });
});

describe('Login.tsx — submit error paths', () => {
  test('401 → "E-Mail oder Passwort stimmt nicht."', async () => {
    loginMock.mockRejectedValueOnce(new ApiError(401, { error: 'invalid' }, '401'));
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('ihre@firma.de'), {
      target: { value: 'a@b.de' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'bad' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Anmelden/ }));
    await waitFor(() =>
      expect(screen.getByText(/E-Mail oder Passwort stimmt nicht/)).toBeDefined(),
    );
    expect(navigateMock).not.toHaveBeenCalled();
  });

  test('400 → "Bitte gültige E-Mail und Passwort eingeben."', async () => {
    loginMock.mockRejectedValueOnce(new ApiError(400, { error: 'bad_req' }, '400'));
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('ihre@firma.de'), {
      target: { value: 'x@y.de' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'pw' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Anmelden/ }));
    await waitFor(() =>
      expect(screen.getByText(/Bitte gültige E-Mail und Passwort/)).toBeDefined(),
    );
  });

  test('500 → generic "Anmeldung fehlgeschlagen…" fallback chip', async () => {
    loginMock.mockRejectedValueOnce(new ApiError(500, { error: 'internal' }, '500'));
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('ihre@firma.de'), {
      target: { value: 'x@y.de' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'pw' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Anmelden/ }));
    await waitFor(() => expect(screen.getByText(/Anmeldung fehlgeschlagen/)).toBeDefined());
  });

  test('non-ApiError (network failure) also falls back to generic chip', async () => {
    loginMock.mockRejectedValueOnce(new Error('network down'));
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('ihre@firma.de'), {
      target: { value: 'x@y.de' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'pw' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Anmelden/ }));
    await waitFor(() => expect(screen.getByText(/Anmeldung fehlgeschlagen/)).toBeDefined());
  });
});

describe('Login.tsx — loading state', () => {
  test('submit button is disabled while login is in-flight', async () => {
    let resolve: () => void = () => {};
    loginMock.mockReturnValueOnce(new Promise<void>((r) => (resolve = r)));
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('ihre@firma.de'), {
      target: { value: 'a@b.de' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'pw' },
    });
    const btn = screen.getByRole('button', { name: /Anmelden/ }) as HTMLButtonElement;
    fireEvent.click(btn);
    // Re-query after state flush
    await waitFor(() => expect((screen.getByRole('button', { name: /Anmelden/ }) as HTMLButtonElement).disabled).toBe(true));
    // resolve so React doesn't warn about unresolved state
    resolve();
  });
});

describe('Login.tsx — already-authenticated redirect', () => {
  test('when status="authenticated" → navigates to /panel', async () => {
    mockAuthStatus = 'authenticated';
    renderLogin();
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/panel', { replace: true }));
  });
});
