'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session fetch error:', error);
          // If refresh token is invalid or missing, force sign-out and reset storage
          if (error.message?.toLowerCase().includes('refresh token')) {
            await supabase.auth.signOut();
            router.replace('/login');
            setLoading(false);
            return;
          }
        }

        if (!session) {
          router.replace('/login');
          setLoading(false);
          return;
        }

        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single() as { data: { role: 'admin' | 'user' } | null };

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          await supabase.auth.signOut();
          router.replace('/login');
          setLoading(false);
          return;
        }

        if (profile?.role === 'admin') {
          setIsAdmin(true);
        } else {
          // User is not admin, sign out and redirect
          await supabase.auth.signOut();
          router.replace('/login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login');
      } else if (session) {
        // Re-check admin status on auth change
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single() as { data: { role: 'admin' | 'user' } | null };

        if (profile?.role !== 'admin') {
          await supabase.auth.signOut();
          router.push('/login');
        }
      }
    });

    return () => subscription.unsubscribe();
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
