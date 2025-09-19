import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    // Check if we already have data
    const { data: existingClients } = await supabaseAdmin
      .from('clients')
      .select('id')
      .limit(1);

    if (existingClients && existingClients.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Database already contains data. Seeding skipped.',
        data: null
      }, { status: 400 });
    }

    // Create sample clients
    const { data: clients, error: clientsError } = await supabaseAdmin
      .from('clients')
      .insert([
        {
          name: 'Hotel Paradise',
          contact_person: 'John Smith',
          email: 'john@hotelparadise.co.za',
          phone: '+27 11 123 4567',
          address: '123 Main Street, Johannesburg, 2000',
          billing_address: '123 Main Street, Johannesburg, 2000',
          status: 'active'
        },
        {
          name: 'Restaurant Elite',
          contact_person: 'Sarah Johnson',
          email: 'sarah@restaurantelite.co.za',
          phone: '+27 21 987 6543',
          address: '456 Oak Avenue, Cape Town, 8001',
          billing_address: '456 Oak Avenue, Cape Town, 8001',
          status: 'active'
        },
        {
          name: 'Spa Retreat',
          contact_person: 'Mike Wilson',
          email: 'mike@sparetreat.co.za',
          phone: '+27 31 555 0123',
          address: '789 Pine Road, Durban, 4001',
          billing_address: '789 Pine Road, Durban, 4001',
          status: 'active'
        }
      ] as any)
      .select();

    if (clientsError) {
      throw new Error(`Failed to create clients: ${clientsError.message}`);
    }

    // Create sample linen categories
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from('linen_categories')
      .insert([
        {
          name: 'Bath Towels',
          price_per_item: 15.50,
          is_active: true
        },
        {
          name: 'Hand Towels',
          price_per_item: 8.75,
          is_active: true
        },
        {
          name: 'Bath Sheets',
          price_per_item: 25.00,
          is_active: true
        },
        {
          name: 'Face Cloths',
          price_per_item: 5.25,
          is_active: true
        },
        {
          name: 'Bath Mats',
          price_per_item: 18.90,
          is_active: true
        }
      ] as any)
      .select();

    if (categoriesError) {
      throw new Error(`Failed to create categories: ${categoriesError.message}`);
    }

    // Create sample batches
    const sampleBatches = [
      {
        paper_batch_id: 'PB-2024-01-001',
        client_id: (clients as any)[0].id,
        pickup_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        status: 'completed',
        notes: 'Regular pickup - all items accounted for',
        total_amount: 450.00
      },
      {
        paper_batch_id: 'PB-2024-01-002',
        client_id: (clients as any)[1].id,
        pickup_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        status: 'processing',
        notes: 'Large batch - processing in progress',
        total_amount: 680.50
      },
      {
        paper_batch_id: 'PB-2024-01-003',
        client_id: (clients as any)[2].id,
        pickup_date: new Date().toISOString(), // Today
        status: 'pickup',
        notes: 'Scheduled for pickup today',
        total_amount: 320.75
      }
    ];

    const { data: batches, error: batchesError } = await supabaseAdmin
      .from('batches')
      .insert(sampleBatches as any)
      .select();

    if (batchesError) {
      throw new Error(`Failed to create batches: ${batchesError.message}`);
    }

    // Create sample batch items
    const batchItems = [
      // Batch 1 items
      {
        batch_id: (batches as any)[0].id,
        linen_category_id: (categories as any)[0].id,
        quantity_sent: 20,
        quantity_received: 20,
        price_per_item: (categories as any)[0].unit_price
      },
      {
        batch_id: (batches as any)[0].id,
        linen_category_id: (categories as any)[1].id,
        quantity_sent: 15,
        quantity_received: 15,
        price_per_item: (categories as any)[1].unit_price
      },
      {
        batch_id: (batches as any)[0].id,
        linen_category_id: (categories as any)[2].id,
        quantity_sent: 8,
        quantity_received: 8,
        price_per_item: (categories as any)[2].unit_price
      },
      // Batch 2 items
      {
        batch_id: (batches as any)[1].id,
        linen_category_id: (categories as any)[0].id,
        quantity_sent: 25,
        quantity_received: 24,
        price_per_item: (categories as any)[0].unit_price
      },
      {
        batch_id: (batches as any)[1].id,
        linen_category_id: (categories as any)[3].id,
        quantity_sent: 30,
        quantity_received: 30,
        price_per_item: (categories as any)[3].unit_price
      },
      {
        batch_id: (batches as any)[1].id,
        linen_category_id: (categories as any)[4].id,
        quantity_sent: 12,
        quantity_received: 12,
        price_per_item: (categories as any)[4].unit_price
      },
      // Batch 3 items
      {
        batch_id: (batches as any)[2].id,
        linen_category_id: (categories as any)[1].id,
        quantity_sent: 18,
        quantity_received: 0,
        price_per_item: (categories as any)[1].unit_price
      },
      {
        batch_id: (batches as any)[2].id,
        linen_category_id: (categories as any)[2].id,
        quantity_sent: 6,
        quantity_received: 0,
        price_per_item: (categories as any)[2].unit_price
      }
    ];

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('batch_items')
      .insert(batchItems as any)
      .select();

    if (itemsError) {
      throw new Error(`Failed to create batch items: ${itemsError.message}`);
    }

    return NextResponse.json({
      success: true,
      error: null,
      data: {
        message: 'Sample data created successfully',
        summary: {
          clients: clients.length,
          categories: categories.length,
          batches: batches.length,
          batchItems: items.length
        }
      }
    });

  } catch (error) {
    console.error('Seed data error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to seed data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      data: null
    }, { status: 500 });
  }
}
