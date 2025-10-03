/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/batches/next-paper-id - Returns suggested next Paper Batch ID as zero-padded numeric string (e.g., 001)
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('batches')
      .select('paper_batch_id')
      .order('paper_batch_id', { ascending: false })
      .limit(1000);

    if (error) {
      return NextResponse.json({ success: false, error: error.message, data: null }, { status: 500 });
    }

    let maxNum = 0;
    (data || []).forEach((row: any) => {
      if (typeof row.paper_batch_id === 'string') {
        const match = row.paper_batch_id.match(/(\d{1,})$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
    });

    const next = maxNum + 1;
    const id = String(next).padStart(3, '0');

    return NextResponse.json({ success: true, error: null, data: { id, next } }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Internal server error', data: null }, { status: 500 });
  }
}


