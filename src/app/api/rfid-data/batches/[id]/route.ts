import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Batch ID required' },
        { status: 400 }
      );
    }

    const { data: batch, error: batchError } = await supabaseAdmin
      .from('rfid_batches')
      .select('*')
      .eq('id', id)
      .single();

    if (batchError || !batch) {
      return NextResponse.json(
        { success: false, error: 'Batch not found' },
        { status: 404 }
      );
    }

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('rfid_batch_items')
      .select('*')
      .eq('batch_id', id)
      .order('category');

    if (itemsError) {
      console.error('Error fetching batch items:', itemsError);
    }

    return NextResponse.json({
      success: true,
      data: { ...batch, items: items ?? [] },
    });
  } catch (err) {
    console.error('Error in GET /api/rfid-data/batches/[id]:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
