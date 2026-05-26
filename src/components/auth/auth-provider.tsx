'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { withAuthTimeout, AUTH_CHECK_TIMEOUT_MS } from '@/lib/auth-timeout';
import { clearStaleAuthSession, isRefreshTokenError } from '@/lib/auth-session';

interface AuthState {
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

// Cache admin status in memory - persists across navigations
let cachedAdminStatus: { userId: string; isAdmin: boolean; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const checkInFlightRef = useRef(false);

  const checkAuth = useCallback(async () => {
    if (checkInFlightRef.current) return;
    checkInFlightRef.current = true;

    const currentPath = pathnameRef.current;
    try {
      const now = Date.now();

      // Fast path: use cache if valid (single getSession, not getUser)
      if (cachedAdminStatus && now - cachedAdminStatus.timestamp < CACHE_DURATION) {
        const { data: { session }, error: cacheError } = await withAuthTimeout(
          supabase.auth.getSession(),
          AUTH_CHECK_TIMEOUT_MS,
          'Session cache check'
        );
        if (cacheError && isRefreshTokenError(cacheError)) {
          cachedAdminStatus = null;
          await clearStaleAuthSession();
          if (currentPath !== '/login') router.replace('/login');
          return;
        }
        if (session?.user?.id === cachedAdminStatus.userId && cachedAdminStatus.isAdmin) {
          setIsAdmin(true);
          return;
        }
      }

      const { data: { session }, error: sessionError } = await withAuthTimeout(
        supabase.auth.getSession(),
        AUTH_CHECK_TIMEOUT_MS,
        'Session check'
      );

      if (sessionError) {
        if (isRefreshTokenError(sessionError)) {
          cachedAdminStatus = null;
          await clearStaleAuthSession();
          if (currentPath !== '/login') router.replace('/login');
        }
        return;
      }

      if (!session?.user) {
        cachedAdminStatus = null;
        if (currentPath !== '/login') router.replace('/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single<{ role: 'admin' | 'user' }>();

      if (profileError || profile?.role !== 'admin') {
        cachedAdminStatus = null;
        await supabase.auth.signOut();
        if (currentPath !== '/login') router.replace('/login');
        return;
      }

      cachedAdminStatus = { userId: session.user.id, isAdmin: true, timestamp: now };
      setIsAdmin(true);
    } catch (err) {
      console.error('Auth check error:', err);
      cachedAdminStatus = null;
      if (currentPath !== '/login') router.replace('/login');
    } finally {
      checkInFlightRef.current = false;
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Never leave the loading screen stuck indefinitely
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, AUTH_CHECK_TIMEOUT_MS + 500);

    void checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;

      cachedAdminStatus = null;

      if (event === 'SIGNED_OUT' || !session) {
        setIsAdmin(false);
        router.push('/login');
        return;
      }

      void (async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single<{ role: 'admin' | 'user' }>();

        if (profile?.role === 'admin') {
          cachedAdminStatus = {
            userId: session.user.id,
            isAdmin: true,
            timestamp: Date.now(),
          };
          setIsAdmin(true);
        } else {
          await supabase.auth.signOut();
          router.push('/login');
        }
      })();
    });

    return () => {
      clearTimeout(loadingTimeout);
      subscription?.unsubscribe();
    };
  }, [checkAuth, router]);

  return (
    <AuthContext.Provider value={{ loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return { loading: true, isAdmin: false };
  }
  return ctx;
}
