'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // User is logged in, redirect to dashboard
          router.push('/dashboard');
        } else {
          // User is not logged in, redirect to login
          router.push('/login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // On error, redirect to login
        router.push('/login');
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-slate-600">Loading...</p>
      </div>
    </div>
  );
}