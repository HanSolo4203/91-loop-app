import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { RFIDInvoiceInsert, RFIDInvoiceItemInsert } from '@/types/database';

interface InvoiceLineItem {
  rfid_number: string;
  category: string;
  qty_washed: number;
  washes_remaining: number;
  price_per_wash: number;
  line_total: number;
}

interface InvoicePayload {
  invoice_number: string;
  location: string;
  generated_by: string;
  period_date: string;
  total_items: number;
  subtotal: number;
  vat_amount: number;
  grand_total: number;
  items: InvoiceLineItem[];
}

// GET - List all RFID invoices
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('rfid_invoices')
      .select(`
        *,
        items:rfid_invoice_items(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching RFID invoices:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch RFID invoices' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (error) {
    console.error('Error in GET /api/rfid-data/invoice:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Save a new RFID invoice with line items
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      invoice_number,
      location,
      generated_by,
      period_date,
      total_items,
      subtotal,
      vat_amount,
      grand_total,
      items,
    } = body as InvoicePayload;

    if (
      !invoice_number ||
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
          error: 'Missing required fields: invoice_number, location, total_items, subtotal, vat_amount, grand_total, items',
        },
        { status: 400 }
      );
    }

    const invoiceInsert: RFIDInvoiceInsert = {
      invoice_number,
      location,
      generated_by: generated_by || null,
      period_date: period_date || new Date().toISOString().split('T')[0],
      total_items,
      subtotal,
      vat_amount,
      grand_total,
    };

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('rfid_invoices')
      .insert(invoiceInsert)
      .select()
      .single();

    if (invoiceError) {
      console.error('Error inserting RFID invoice:', invoiceError);
      return NextResponse.json(
        { success: false, error: `Failed to save invoice: ${invoiceError.message}` },
        { status: 500 }
      );
    }

    if (items.length > 0) {
      const itemInserts: RFIDInvoiceItemInsert[] = items.map(
        (item: InvoiceLineItem) => ({
          rfid_invoice_id: invoice.id,
          rfid_number: item.rfid_number,
          category: item.category,
          qty_washed: item.qty_washed ?? 0,
          washes_remaining: item.washes_remaining ?? 0,
          price_per_wash: item.price_per_wash ?? 0,
          line_total: item.line_total ?? 0,
        })
      );

      const { error: itemsError } = await supabaseAdmin
        .from('rfid_invoice_items')
        .insert(itemInserts);

      if (itemsError) {
        console.error('Error inserting RFID invoice items:', itemsError);
        // Rollback invoice if items fail
        await supabaseAdmin.from('rfid_invoices').delete().eq('id', invoice.id);
        return NextResponse.json(
          {
            success: false,
            error: `Failed to save invoice items: ${itemsError.message}`,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: invoice,
      message: 'Invoice saved successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/rfid-data/invoice:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
