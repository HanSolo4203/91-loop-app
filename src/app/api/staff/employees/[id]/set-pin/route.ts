import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/clocking';

/* eslint-disable @typescript-eslint/no-explicit-any */

// POST /api/staff/employees/[id]/set-pin — admin only
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { isAdmin } = await getCurrentUser(request);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const pin = typeof body?.pin === 'string' ? body.pin.trim() : '';

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: 'PIN must be exactly 4 digits' },
        { status: 400 }
      );
    }

    const { data: employee, error: empError } = await (supabaseAdmin as any)
      .from('employees')
      .select('id')
      .eq('id', id)
      .single();

    if (empError || !employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const pinHash = await bcrypt.hash(pin, 10);

    const { error: updateError } = await (supabaseAdmin as any)
      .from('employees')
      .update({
        clock_pin: pin,
        pin_hash: pinHash,
      })
      .eq('id', id);

    if (updateError) {
      console.error('set-pin update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to set PIN' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/staff/employees/[id]/set-pin error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
