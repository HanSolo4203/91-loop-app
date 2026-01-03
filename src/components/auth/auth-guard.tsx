'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface AuthGuardProps {
  children: React.ReactNode;
}

// Cache admin status in memory to avoid repeated checks
let cachedAdminStatus: { userId: string; isAdmin: boolean; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function AuthGuard({ children }: AuthGuardProps) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate checks
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const checkAuth = async () => {
      try {
        // Check cache first
        const now = Date.now();
        if (cachedAdminStatus && (now - cachedAdminStatus.timestamp) < CACHE_DURATION) {
          // Use cached session check - verify it's still valid
          const { data: { session } } = await supabase.auth.getSession();
          if (session && session.user.id === cachedAdminStatus.userId && cachedAdminStatus.isAdmin) {
            setIsAdmin(true);
            setLoading(false);
            return;
          }
        }

        // Get session and user in parallel
        const [sessionResult, userResult] = await Promise.all([
          supabase.auth.getSession(),
          supabase.auth.getUser()
        ]);
        
        const { data: { session }, error: sessionError } = sessionResult;
        const { data: { user }, error: userError } = userResult;
        
        if (sessionError || userError) {
          console.error('Auth fetch error:', sessionError || userError);
          // If refresh token is invalid or missing, force sign-out and reset storage
          if (sessionError?.message?.toLowerCase().includes('refresh token') || 
              userError?.message?.toLowerCase().includes('refresh token')) {
            cachedAdminStatus = null;
            await supabase.auth.signOut();
            router.replace('/login');
            setLoading(false);
            return;
          }
        }

        if (!session || !user) {
          cachedAdminStatus = null;
          router.replace('/login');
          setLoading(false);
          return;
        }

        // Check if user is admin - use user.id from getUser() which is faster
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single<{ role: 'admin' | 'user' }>();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          cachedAdminStatus = null;
          await supabase.auth.signOut();
          router.replace('/login');
          setLoading(false);
          return;
        }

        const adminStatus = profile?.role === 'admin';
        
        // Cache the result
        cachedAdminStatus = {
          userId: user.id,
          isAdmin: adminStatus,
          timestamp: now
        };

        if (adminStatus) {
          setIsAdmin(true);
        } else {
          // User is not admin, sign out and redirect
          cachedAdminStatus = null;
          await supabase.auth.signOut();
          router.replace('/login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        cachedAdminStatus = null;
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Clear cache on auth state change
      cachedAdminStatus = null;
      
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login');
      } else if (session) {
        // Re-check admin status on auth change
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single<{ role: 'admin' | 'user' }>();

        if (profile?.role === 'admin') {
          // Update cache
          cachedAdminStatus = {
            userId: session.user.id,
            isAdmin: true,
            timestamp: Date.now()
          };
          setIsAdmin(true);
        } else {
          await supabase.auth.signOut();
          router.push('/login');
        }
      }
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [router]);

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
