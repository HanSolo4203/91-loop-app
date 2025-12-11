import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';

// Helper function to get user from request (via token or cookies)
async function getCurrentUser(request: NextRequest): Promise<{ userId: string | null; isAdmin: boolean }> {
  try {
    // Try to get token from Authorization header first
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      
      if (!error && user) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        return { 
          userId: user.id, 
          isAdmin: profile?.role === 'admin' || false 
        };
      }
    }

    // Fallback: try to get session from cookies
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

    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session?.user) {
      console.error('Session error:', error);
      return { userId: null, isAdmin: false };
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return { userId: null, isAdmin: false };
    }

    return { 
      userId: session.user.id, 
      isAdmin: profile?.role === 'admin' || false 
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return { userId: null, isAdmin: false };
  }
}

// GET /api/users - List all users (admin only)
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const { isAdmin } = await getCurrentUser(request);
    
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required', data: null },
        { status: 403 }
      );
    }

    // Fetch all users with their profiles
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users', data: null },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data: profiles || [], error: null },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/users error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null },
      { status: 500 }
    );
  }
}

// POST /api/users - Create a new user (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const { isAdmin } = await getCurrentUser(request);
    
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required', data: null },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, full_name, role = 'user' } = body;

    // Validate required fields
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required', data: null },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters', data: null },
        { status: 400 }
      );
    }

    if (role && !['admin', 'user'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Role must be either "admin" or "user"', data: null },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(email);
    if (existingUser?.user) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists', data: null },
        { status: 409 }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: full_name || null,
      },
    });

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError);
      return NextResponse.json(
        { success: false, error: authError?.message || 'Failed to create user', data: null },
        { status: 500 }
      );
    }

    // Create profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email.trim().toLowerCase(),
        full_name: full_name || null,
        role: role,
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Try to clean up auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { success: false, error: 'Failed to create user profile', data: null },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        data: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        },
        error: null 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/users error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null },
      { status: 500 }
    );
  }
}

