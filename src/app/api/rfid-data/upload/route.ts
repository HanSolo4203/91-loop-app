import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { supabaseAdmin } from '@/lib/supabase';
import { getPricePerWash } from '@/lib/constants/rfid-pricing';

const MAX_WASHES = 500;

async function getPriceMap(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const { data } = await supabaseAdmin
    .from('linen_categories')
    .select('name, price_per_wash, price_per_item');
  if (data) {
    for (const row of data) {
      const price = (row as { price_per_wash?: number; price_per_item?: number })
        .price_per_wash ?? (row as { price_per_item?: number }).price_per_item ?? 10;
      map.set(row.name, Number(price));
    }
  }
  return map;
}

interface CSVRow {
  'RFID Number'?: string;
  'Category'?: string;
  'Status'?: string;
  'Condition'?: string;
  'Location'?: string;
  'User'?: string;
  'QTY Washed'?: string;
  'Washes Remaining'?: string;
  'Assigned Location'?: string;
  [key: string]: string | number | undefined;
}

interface ProcessedItem {
  rfid_number: string;
  category: string;
  qty_washed_this_batch: number;
  washes_remaining_before: number;
  washes_remaining_after: number;
  price_per_wash: number;
  line_total: number;
  near_end_of_life: boolean;
  location: string;
  scanned_by: string;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file || !file.name.endsWith('.csv')) {
      return NextResponse.json(
        { success: false, error: 'Please upload a CSV file' },
        { status: 400 }
      );
    }

    const text = await file.text();
    const result = Papa.parse<CSVRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      transform: (v) => (typeof v === 'string' ? v.trim() : v),
    });

    if (result.errors.length > 0) {
      const critical = result.errors.filter(
        (e) => e.type === 'Quotes' || e.type === 'FieldMismatch'
      );
      if (critical.length > 0) {
        return NextResponse.json(
          { success: false, error: `CSV error: ${critical[0].message}` },
          { status: 400 }
        );
      }
    }

    const rows = (result.data as CSVRow[]).filter((row) =>
      Object.values(row).some((v) => v !== '' && v != null)
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'CSV is empty or contains no valid data' },
        { status: 400 }
      );
    }

    const required = ['RFID Number', 'Category'];
    const firstRow = rows[0];
    const missing = required.filter((col) => !(col in firstRow));
    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing columns: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch existing rfid_items to get current washes_remaining
    const rfidNumbers = rows
      .map((r) => String(r['RFID Number'] ?? '').trim())
      .filter(Boolean);
    const { data: existingItems } = await supabaseAdmin
      .from('rfid_items')
      .select('rfid_number, washes_remaining, total_washes_lifetime')
      .in('rfid_number', rfidNumbers);

    const existingMap = new Map(
      (existingItems ?? []).map((r) => [r.rfid_number, r])
    );

    const priceMap = await getPriceMap();
    const getPrice = (cat: string): number =>
      priceMap.get(cat) ?? getPricePerWash(cat);

    const processed: ProcessedItem[] = [];
    const categoryGroup: Record<string, { count: number; washes: number; price: number; subtotal: number }> = {};

    for (const row of rows) {
      const rfid = String(row['RFID Number'] ?? '').trim();
      const category = String(row['Category'] ?? '').trim();
      if (!rfid || !category) continue;

      const existing = existingMap.get(rfid);
      let washesRemainingBefore =
        existing?.washes_remaining ?? MAX_WASHES;
      let totalWashesLifetime = existing?.total_washes_lifetime ?? 0;

      // Deduct 1 from washes remaining, add 1 to qty washed (this batch = 1 per row)
      const qtyWashedThisBatch = 1;
      const washesRemainingAfter = Math.max(0, washesRemainingBefore - qtyWashedThisBatch);
      totalWashesLifetime += qtyWashedThisBatch;

      const nearEndOfLife = washesRemainingAfter < 50;

      const pricePerWash = getPrice(category);
      const lineTotal = Math.round(qtyWashedThisBatch * pricePerWash * 100) / 100;

      processed.push({
        rfid_number: rfid,
        category,
        qty_washed_this_batch: qtyWashedThisBatch,
        washes_remaining_before: washesRemainingBefore,
        washes_remaining_after: washesRemainingAfter,
        price_per_wash: pricePerWash,
        line_total: lineTotal,
        near_end_of_life: nearEndOfLife,
        location: String(row['Assigned Location'] ?? row['Location'] ?? ''),
        scanned_by: String(row['User'] ?? ''),
      });

      if (!categoryGroup[category]) {
        categoryGroup[category] = { count: 0, washes: 0, price: pricePerWash, subtotal: 0 };
      }
      categoryGroup[category].count += 1;
      categoryGroup[category].washes += qtyWashedThisBatch;
      categoryGroup[category].subtotal =
        Math.round((categoryGroup[category].subtotal + lineTotal) * 100) / 100;

      // Update map for next row if same RFID appears again (shouldn't in typical CSV)
      existingMap.set(rfid, {
        rfid_number: rfid,
        washes_remaining: washesRemainingAfter,
        total_washes_lifetime: totalWashesLifetime,
      });
    }

    const categoryBreakdown = Object.entries(categoryGroup).map(
      ([category, v]) => ({
        category,
        item_count: v.count,
        total_washes: v.washes,
        price_per_wash: v.price,
        subtotal: v.subtotal,
      })
    );

    const subtotal = Math.round(
      processed.reduce((s, i) => s + i.line_total, 0) * 100
    ) / 100;
    const vat_amount = Math.round(subtotal * 0.15 * 100) / 100;
    const grand_total = Math.round((subtotal + vat_amount) * 100) / 100;

    const location = processed[0]?.location || 'Unknown';
    const scanned_by = processed[0]?.scanned_by || '';
    const nearEndOfLifeItems = processed.filter((i) => i.near_end_of_life);

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    // Get next batch ref: RSL-RFID-YYYY-MM-DD-001
    const { count } = await supabaseAdmin
      .from('rfid_batches')
      .select('*', { count: 'exact', head: true })
      .like('batch_ref', `RSL-RFID-${dateStr}%`);

    const inc = (count ?? 0) + 1;
    const batch_ref = `RSL-RFID-${dateStr}-${String(inc).padStart(3, '0')}`;

    return NextResponse.json({
      success: true,
      data: {
        batch_ref,
        scan_date: dateStr,
        location,
        scanned_by,
        total_items: processed.length,
        total_washes: processed.reduce((s, i) => s + i.qty_washed_this_batch, 0),
        subtotal,
        vat_amount,
        grand_total,
        items: processed,
        category_breakdown: categoryBreakdown,
        near_end_of_life_items: nearEndOfLifeItems,
      },
    });
  } catch (err) {
    console.error('Error in POST /api/rfid-data/upload:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
