import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface BatchItem {
  rfid_number: string;
  category: string;
  qty_washed_this_batch: number;
  washes_remaining_after: number;
  price_per_wash: number;
  line_total: number;
}

interface SaveBatchPayload {
  batch_ref: string;
  location: string;
  scanned_by: string;
  scan_date: string;
  total_items: number;
  total_washes: number;
  subtotal: number;
  vat_amount: number;
  grand_total: number;
  items: BatchItem[];
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('rfid_batches')
      .select('*')
      .order('scan_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rfid batches:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch batches' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    console.error('Error in GET /api/rfid-data/batches:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SaveBatchPayload;
    const {
      batch_ref,
      location,
      scanned_by,
      scan_date,
      total_items,
      total_washes,
      subtotal,
      vat_amount,
      grand_total,
      items,
    } = body;

    if (
      !batch_ref ||
      !location ||
      typeof total_items !== 'number' ||
      typeof subtotal !== 'number' ||
      typeof vat_amount !== 'number' ||
      typeof grand_total !== 'number' ||
      !Array.isArray(items)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing required fields: batch_ref, location, total_items, subtotal, vat_amount, grand_total, items',
        },
        { status: 400 }
      );
    }

    const { data: batch, error: batchError } = await supabaseAdmin
      .from('rfid_batches')
      .insert({
        batch_ref,
        location,
        scanned_by: scanned_by || null,
        scan_date: scan_date || new Date().toISOString().split('T')[0],
        total_items,
        total_washes: total_washes ?? total_items,
        subtotal,
        vat_amount,
        grand_total,
        status: 'draft',
      })
      .select()
      .single();

    if (batchError || !batch) {
      console.error('Error inserting batch:', batchError);
      return NextResponse.json(
        { success: false, error: `Failed to save batch: ${batchError?.message}` },
        { status: 500 }
      );
    }

    const batchItems = items.map((item: BatchItem) => ({
      batch_id: batch.id,
      rfid_number: item.rfid_number,
      category: item.category,
      qty_washed_this_batch: item.qty_washed_this_batch ?? 1,
      washes_remaining_after: item.washes_remaining_after ?? 0,
      price_per_wash: item.price_per_wash ?? 0,
      line_total: item.line_total ?? 0,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('rfid_batch_items')
      .insert(batchItems);

    if (itemsError) {
      await supabaseAdmin.from('rfid_batches').delete().eq('id', batch.id);
      return NextResponse.json(
        { success: false, error: `Failed to save items: ${itemsError.message}` },
        { status: 500 }
      );
    }

    for (const item of items) {
      const totalWashes = 500 - item.washes_remaining_after;
      const status =
        item.washes_remaining_after < 50
          ? 'near_end'
          : item.washes_remaining_after <= 0
            ? 'retired'
            : 'active';

      await supabaseAdmin.from('rfid_items').upsert(
        {
          rfid_number: item.rfid_number,
          category: item.category,
          total_washes_lifetime: totalWashes,
          washes_remaining: item.washes_remaining_after,
          status,
          last_seen: new Date().toISOString(),
          location: location || null,
        },
        { onConflict: 'rfid_number' }
      );
    }

    return NextResponse.json({
      success: true,
      data: batch,
      message: 'Batch saved successfully',
    });
  } catch (err) {
    console.error('Error in POST /api/rfid-data/batches:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
