import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/test-batch?paper_id=015 - Check if a batch exists
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paperId = searchParams.get('paper_id');
    
    if (!paperId) {
      return NextResponse.json(
        {
          success: false,
          error: 'paper_id query parameter is required',
          data: null,
        },
        { status: 400 }
      );
    }

    // Search for batch by paper_batch_id (case-insensitive, partial match)
    const { data, error } = await supabaseAdmin
      .from('batches')
      .select(`
        id,
        paper_batch_id,
        system_batch_id,
        pickup_date,
        created_at,
        status,
        total_amount,
        client:clients(id, name)
      `)
      .ilike('paper_batch_id', `%${paperId}%`)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Database error: ${error.message}`,
          data: null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        error: null,
        data: {
          matches: data || [],
          count: data?.length || 0,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/test-batch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        data: null,
      },
      { status: 500 }
    );
  }
}


