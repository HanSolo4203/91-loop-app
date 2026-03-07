import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('rfid_items')
      .select('*')
      .order('status', { ascending: true }) // near_end first
      .order('washes_remaining', { ascending: true }) // lowest first
      .order('category');

    if (error) {
      console.error('Error fetching rfid items:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch RFID items' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    console.error('Error in GET /api/rfid-data/items:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
