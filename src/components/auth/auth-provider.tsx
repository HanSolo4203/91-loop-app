'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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

  const checkAuth = useCallback(async () => {
    const currentPath = pathnameRef.current;
    try {
      const now = Date.now();

      // Fast path: use cache if valid
      if (cachedAdminStatus && (now - cachedAdminStatus.timestamp) < CACHE_DURATION) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id === cachedAdminStatus.userId && cachedAdminStatus.isAdmin) {
          setIsAdmin(true);
          setLoading(false);
          return;
        }
      }

      const [sessionResult, userResult] = await Promise.all([
        supabase.auth.getSession(),
        supabase.auth.getUser(),
      ]);

      const { data: { session }, error: sessionError } = sessionResult;
      const { data: { user }, error: userError } = userResult;

      if (sessionError || userError) {
        const msg = (sessionError || userError)?.message?.toLowerCase() ?? '';
        if (msg.includes('refresh token')) {
          cachedAdminStatus = null;
          await supabase.auth.signOut();
          if (currentPath !== '/login') router.replace('/login');
        }
        setLoading(false);
        return;
      }

      if (!session || !user) {
        cachedAdminStatus = null;
        if (currentPath !== '/login') router.replace('/login');
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single<{ role: 'admin' | 'user' }>();

      if (profileError || profile?.role !== 'admin') {
        cachedAdminStatus = null;
        await supabase.auth.signOut();
        if (currentPath !== '/login') router.replace('/login');
        setLoading(false);
        return;
      }

      cachedAdminStatus = { userId: user.id, isAdmin: true, timestamp: now };
      setIsAdmin(true);
    } catch (err) {
      console.error('Auth check error:', err);
      cachedAdminStatus = null;
      if (currentPath !== '/login') router.replace('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      cachedAdminStatus = null;

      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login');
      } else if (session) {
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
      }
    });

    return () => subscription?.unsubscribe();
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
