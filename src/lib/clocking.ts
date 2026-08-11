import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';

export {
  getSastDateString,
  formatSastTime,
  formatSastDateTime,
  formatDurationMinutes,
  getSastMinutesSinceMidnight,
  stripPinHash,
  SAST_TIMEZONE,
} from '@/lib/clocking-utils';

export async function getCurrentUser(
  request: NextRequest
): Promise<{ userId: string | null; isAdmin: boolean }> {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const {
        data: { user },
        error,
      } = await supabaseAdmin.auth.getUser(token);

      if (!error && user) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        return {
          userId: user.id,
          isAdmin: profile?.role === 'admin' || false,
        };
      }
    }

    const response = new NextResponse();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set(name, value, options);
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set(name, '', { ...options, maxAge: 0 });
          },
        },
      }
    );

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.user) {
      return { userId: null, isAdmin: false };
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      return { userId: null, isAdmin: false };
    }

    return {
      userId: session.user.id,
      isAdmin: profile?.role === 'admin' || false,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return { userId: null, isAdmin: false };
  }
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
