import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { Database } from '@/types/database';

interface RFIDRecord {
  'RFID Number'?: string;
  'Category'?: string;
  'Status'?: string;
  'Condition'?: string;
  'Location'?: string;
  'User'?: string;
  'QTY Washed'?: string;
  'Washes Remaining'?: string;
  'Assigned Location'?: string;
  'Date Assigned'?: string;
  'Date/Time'?: string;
  [key: string]: string | number | undefined;
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('rfid_data')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching RFID data:', error);
      return NextResponse.json({ error: 'Failed to fetch RFID data' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in GET /api/rfid-data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { rfidRecords } = body as { rfidRecords?: RFIDRecord[] };
    
    if (!rfidRecords || !Array.isArray(rfidRecords)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // Helper function to parse date strings (handles MM/DD/YY format)
    const parseDate = (dateStr: string | undefined): string | null => {
      if (!dateStr || dateStr.trim() === '') return null;
      try {
        // Try parsing the date string
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        return date.toISOString();
      } catch {
        return null;
      }
    };

    // Transform the data to match our database schema
    const transformedRecords = rfidRecords.map((record): Database['public']['Tables']['rfid_data']['Insert'] => ({
      rfid_number: record['RFID Number'] || '',
      category: record['Category'] || '',
      status: record['Status'] || '',
      condition: record['Condition'] || null,
      location: record['Location'] || null,
      user_name: record['User'] || null,
      qty_washed: parseInt(record['QTY Washed'] || '0') || 0,
      washes_remaining: parseInt(record['Washes Remaining'] || '0') || 0,
      assigned_location: record['Assigned Location'] || null,
      date_assigned: parseDate(record['Date Assigned']),
      date_time: parseDate(record['Date/Time']),
    }));

    const { data, error } = await supabaseAdmin
      .from('rfid_data')
      .insert(transformedRecords)
      .select();

    if (error) {
      console.error('Error inserting RFID data:', error);
      return NextResponse.json({ error: 'Failed to insert RFID data' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'RFID data inserted successfully', 
      count: data.length,
      data 
    });
  } catch (error) {
    console.error('Error in POST /api/rfid-data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { error } = await supabaseAdmin
      .from('rfid_data')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (error) {
      console.error('Error deleting RFID data:', error);
      return NextResponse.json({ error: 'Failed to delete RFID data' }, { status: 500 });
    }

    return NextResponse.json({ message: 'All RFID data deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/rfid-data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
