import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Test basic connection
    const { error: connectionError } = await supabaseAdmin
      .from('clients')
      .select('count')
      .limit(1);

    if (connectionError) {
      return NextResponse.json({
        success: false,
        error: `Database connection error: ${connectionError.message}`,
        data: null
      }, { status: 500 });
    }

    // Test if we have any clients
    const { data: clients, error: clientsError } = await supabaseAdmin
      .from('clients')
      .select('id, name, created_at')
      .limit(5);

    if (clientsError) {
      return NextResponse.json({
        success: false,
        error: `Clients query error: ${clientsError.message}`,
        data: null
      }, { status: 500 });
    }

    // Test if we have any batches
    const { data: batches, error: batchesError } = await supabaseAdmin
      .from('batches')
      .select('id, paper_batch_id, status, created_at')
      .limit(5);

    if (batchesError) {
      return NextResponse.json({
        success: false,
        error: `Batches query error: ${batchesError.message}`,
        data: null
      }, { status: 500 });
    }

    // Test if we have any linen categories
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from('linen_categories')
      .select('id, name, price_per_item')
      .limit(5);

    if (categoriesError) {
      return NextResponse.json({
        success: false,
        error: `Categories query error: ${categoriesError.message}`,
        data: null
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      error: null,
      data: {
        connection: 'OK',
        clients: clients || [],
        batches: batches || [],
        categories: categories || [],
        summary: {
          clientsCount: clients?.length || 0,
          batchesCount: batches?.length || 0,
          categoriesCount: categories?.length || 0
        }
      }
    });

  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      data: null
    }, { status: 500 });
  }
}
