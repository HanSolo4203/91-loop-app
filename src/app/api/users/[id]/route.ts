import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import bcrypt from 'bcryptjs';
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

// PATCH /api/users/[id] - Update a user (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin access
    const { isAdmin } = await getCurrentUser(request);
    
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required', data: null },
        { status: 403 }
      );
    }

    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required', data: null },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email, full_name, role, password, kiosk_pin } = body;

    // Validate role if provided
    if (role && !['admin', 'user'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Role must be either "admin" or "user"', data: null },
        { status: 400 }
      );
    }

    // Validate email if provided
    if (email && (typeof email !== 'string' || !email.includes('@'))) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required', data: null },
        { status: 400 }
      );
    }

    // Validate password if provided
    if (password && (typeof password !== 'string' || password.length < 6)) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters', data: null },
        { status: 400 }
      );
    }

    const pinProvided = kiosk_pin !== undefined;
    const pin =
      typeof kiosk_pin === 'string' && kiosk_pin.trim() !== ''
        ? kiosk_pin.trim()
        : null;
    if (pinProvided && pin && !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: 'Kiosk PIN must be exactly 4 digits', data: null },
        { status: 400 }
      );
    }

    // Update auth user if email or password is provided
    if (email || password) {
      const updateData: { email?: string; password?: string } = {};
      if (email) {
        updateData.email = email.trim().toLowerCase();
      }
      if (password) {
        updateData.password = password;
      }

      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, updateData);
      
      if (authError) {
        console.error('Error updating auth user:', authError);
        return NextResponse.json(
          { success: false, error: authError.message || 'Failed to update user', data: null },
          { status: 500 }
        );
      }
    }

    // Load current role when needed for PIN rules
    let effectiveRole: 'admin' | 'user' | null = role ?? null;
    if (!effectiveRole && pinProvided) {
      const { data: current } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', id)
        .single();
      effectiveRole = (current?.role as 'admin' | 'user' | undefined) ?? null;
    }

    if (pinProvided && pin && effectiveRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Kiosk PIN can only be set for admin users', data: null },
        { status: 400 }
      );
    }

    // Update profile
    const updateData: {
      email?: string;
      full_name?: string | null;
      role?: 'admin' | 'user';
      kiosk_pin?: string | null;
      kiosk_pin_hash?: string | null;
    } = {};
    if (email) {
      updateData.email = email.trim().toLowerCase();
    }
    if (full_name !== undefined) {
      updateData.full_name = full_name || null;
    }
    if (role) {
      updateData.role = role as 'admin' | 'user';
    }

    if (pinProvided) {
      if (role === 'user' || (!pin && effectiveRole !== 'admin')) {
        updateData.kiosk_pin = null;
        updateData.kiosk_pin_hash = null;
      } else if (pin) {
        updateData.kiosk_pin = pin;
        updateData.kiosk_pin_hash = await bcrypt.hash(pin, 10);
      } else {
        // Empty string = clear PIN
        updateData.kiosk_pin = null;
        updateData.kiosk_pin_hash = null;
      }
    } else if (role === 'user') {
      // Demoting to user clears kiosk PIN
      updateData.kiosk_pin = null;
      updateData.kiosk_pin_hash = null;
    }

    // Only update if there are fields to update
    if (Object.keys(updateData).length > 0) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', id)
        .select('id, email, full_name, role, kiosk_pin, created_at, updated_at')
        .single();

      if (profileError) {
        console.error('Error updating profile:', profileError);
        const message =
          profileError.code === '23505'
            ? 'That kiosk PIN is already in use by another admin'
            : 'Failed to update user profile';
        return NextResponse.json(
          { success: false, error: message, data: null },
          { status: profileError.code === '23505' ? 409 : 500 }
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
            kiosk_pin: profile.kiosk_pin ?? null,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
          },
          error: null 
        },
        { status: 200 }
      );
    }

    // If no fields to update, return current profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, kiosk_pin, created_at, updated_at')
      .eq('id', id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { success: false, error: 'User not found', data: null },
        { status: 404 }
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
          kiosk_pin: profile.kiosk_pin ?? null,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        },
        error: null 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('PATCH /api/users/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null },
      { status: 500 }
    );
  }
}

