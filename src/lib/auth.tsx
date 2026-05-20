import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError } from './api';
import type { AuthUser } from '@/features/kalkulation/types';

type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'unauthenticated'; user: null };

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: AuthUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { user } = await api.auth.me();
      if (mounted.current) setState({ status: 'authenticated', user });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        if (mounted.current) setState({ status: 'unauthenticated', user: null });
      } else {
        if (mounted.current) setState({ status: 'unauthenticated', user: null });
      }
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await api.auth.login(email, password);
    setState({ status: 'authenticated', user });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // swallow — we're clearing local state anyway
    }
    setState({ status: 'unauthenticated', user: null });
  }, []);

  const setUser = useCallback((u: AuthUser) => {
    setState({ status: 'authenticated', user: u });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout, refresh, setUser }),
    [state, login, logout, refresh, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
