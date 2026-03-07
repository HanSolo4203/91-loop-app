'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard consumes AuthProvider context. Auth state is checked once in AuthProvider
 * (mounted at root layout) and persists across page navigations - no re-check on route change.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return <>{children}</>;
}
