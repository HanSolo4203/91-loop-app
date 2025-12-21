'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Clears bad/expired auth state if Supabase reports missing refresh token.
 * Helps recover from broken local storage sessions (common after browser privacy resets).
 */
export function RefreshTokenGuard() {
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { error } = await supabase.auth.getSession();
        if (error && error.message?.toLowerCase().includes('refresh token')) {
          // Force local sign-out to clear stale tokens, then reload to login
          await supabase.auth.signOut();
          if (mounted) {
            window.location.href = '/login';
          }
        }
      } catch (err) {
        // Fail silently; normal auth guard will handle navigation
        console.error('RefreshTokenGuard check failed:', err);
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  return null;
}


