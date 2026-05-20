import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
