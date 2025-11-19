'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type ProfileRole = { role: 'admin' | 'user' };
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate email format
      if (!email || !email.includes('@')) {
        setError('Please enter a valid email address');
        return;
      }

      // Validate password
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }

      console.log('Attempting login with:', { email, passwordLength: password.length });

      // Test basic connectivity first
      try {
        const { data: testData, error: testError } = await supabase
          .from('profiles')
          .select('count')
          .limit(1);
        
        console.log('Connection test:', { testData, testError });
      } catch (connError) {
        console.error('Connection test failed:', connError);
        setError('Unable to connect to server. Please check your internet connection.');
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      console.log('Login response:', { data, error });

      // Additional debugging
      if (error) {
        console.error('Detailed error:', {
          message: error.message,
          status: error.status,
          name: error.name,
        });
      }

      if (error) {
        console.error('Login error:', error);
        setError(error.message);
      } else if (data.user) {
        console.log('User authenticated:', data.user.id);
        
        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single<ProfileRole>();

        console.log('Profile check:', { profile, profileError });

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          setError('Failed to verify user permissions');
          await supabase.auth.signOut();
        } else if (profile?.role === 'admin') {
          console.log('Admin access granted');
          router.push('/dashboard');
        } else {
          console.log('Access denied - not admin');
          setError('Access denied. Admin privileges required.');
          await supabase.auth.signOut();
        }
      }
    } catch (err) {
      console.error('Login exception:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Bokeh circles */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-blue-400/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-32 right-20 w-24 h-24 bg-cyan-300/30 rounded-full blur-lg animate-bounce"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-blue-300/15 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-40 right-1/3 w-28 h-28 bg-cyan-400/25 rounded-full blur-lg animate-bounce"></div>
        <div className="absolute top-1/2 left-1/3 w-36 h-36 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-20 h-20 bg-cyan-200/30 rounded-full blur-md animate-bounce"></div>
        
        {/* Moving particles */}
        <div className="absolute top-20 left-1/2 w-2 h-2 bg-white/40 rounded-full animate-ping"></div>
        <div className="absolute top-40 right-1/3 w-1 h-1 bg-cyan-300/60 rounded-full animate-ping"></div>
        <div className="absolute bottom-32 left-1/5 w-3 h-3 bg-blue-200/50 rounded-full animate-ping"></div>
        <div className="absolute bottom-60 right-1/5 w-2 h-2 bg-white/30 rounded-full animate-ping"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-sm">
          {/* Receipt-style login form */}
          <div className="bg-gray-50/95 backdrop-blur-sm shadow-2xl p-6 relative overflow-hidden" style={{ 
            borderRadius: '8px 8px 12px 12px',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 4px 20px rgba(0,0,0,0.15)'
          }}>
            {/* Receipt header */}
            <div className="text-center mb-6 border-b-2 border-dashed border-gray-400 pb-4">
              <h1 className="text-xl font-bold text-gray-800 mb-1">RSL EXPRESS</h1>
              <p className="text-xs text-gray-600 font-mono">ADMIN ACCESS SYSTEM</p>
              <p className="text-xs text-gray-500 font-mono mt-1">CNPJ: 00.000.000/0001-00</p>
            </div>

            {/* Login form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="text-xs">
                  {error}
                </Alert>
              )}

              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-mono text-gray-700">
                  EMAIL
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="font-mono text-xs bg-white border-gray-400 focus:border-gray-600 focus:ring-gray-600 h-8"
                  placeholder="admin@rslexpress.com"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs font-mono text-gray-700">
                  PASSWORD
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="font-mono text-xs bg-white border-gray-400 focus:border-gray-600 focus:ring-gray-600 h-8"
                  placeholder="••••••••"
                />
              </div>

              <div className="pt-3 border-t-2 border-dashed border-gray-400">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gray-800 hover:bg-gray-900 text-white font-mono text-xs py-2 h-8"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner size="sm" className="mr-2" />
                      AUTHENTICATING...
                    </div>
                  ) : (
                    'SIGN IN'
                  )}
                </Button>
              </div>
            </form>

            {/* Receipt footer */}
            <div className="mt-4 text-center border-t-2 border-dashed border-gray-400 pt-3 pb-4">
              <p className="text-xs text-gray-600 font-mono">LIGHTING FAST LINEN SOLUTIONS</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
