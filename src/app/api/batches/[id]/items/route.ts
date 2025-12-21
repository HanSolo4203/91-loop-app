import { NextRequest, NextResponse } from 'next/server';
import { 
  getBatchItems
} from '@/lib/services/batch-details';
import { updateBatchItems as updateBatchItemsService } from '@/lib/services/batches';
import type { 
  BatchDetailsServiceResponse,
  BatchItemWithDetails
} from '@/lib/services/batch-details';
import type { Batch, BatchItem } from '@/types/database';

interface BatchItemsSummary {
  total_items: number;
  total_sent: number;
  total_received: number;
  total_sent_value: number;
  total_received_value: number;
  total_discrepancy_value: number;
  items_with_discrepancy: number;
  discrepancy_percentage: number;
}

interface BatchItemsApiResponse {
  items: BatchItemWithDetails[];
  summary: BatchItemsSummary;
  batch_id: string;
}

type UpdateBatchItemsResponse = {
  batch: Batch;
  items: BatchItem[];
};

// GET /api/batches/[id]/items - Get batch items with pricing calculations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate batch ID
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Batch ID is required and must be a string',
          data: null,
        } as BatchDetailsServiceResponse<null>,
        { status: 400 }
      );
    }

    // Get batch items
    const result = await getBatchItems(id);
    
    if (!result.success) {
      const statusCode = result.error?.includes('not found') ? 404 : 500;
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          data: null,
        } as BatchDetailsServiceResponse<null>,
        { status: statusCode }
      );
    }

    // Calculate summary statistics
    const items = result.data || [];
    const summary = {
      total_items: items.length,
      total_sent: items.reduce((sum, item) => sum + item.quantity_sent, 0),
      total_received: items.reduce((sum, item) => sum + item.quantity_received, 0),
      total_sent_value: items.reduce((sum, item) => sum + item.pricing.total_sent_value, 0),
      total_received_value: items.reduce((sum, item) => sum + item.pricing.total_received_value, 0),
      total_discrepancy_value: items.reduce((sum, item) => sum + item.pricing.discrepancy_value, 0),
      items_with_discrepancy: items.filter(item => item.discrepancy.quantity !== 0).length,
      discrepancy_percentage: items.length > 0 
        ? (items.filter(item => item.discrepancy.quantity !== 0).length / items.length) * 100 
        : 0
    };

    const response: BatchItemsApiResponse = {
      items,
      summary,
      batch_id: id
    };

    return NextResponse.json(
      {
        success: true,
        error: null,
        data: response,
      } as BatchDetailsServiceResponse<BatchItemsApiResponse>,
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/batches/[id]/items error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        data: null,
      } as BatchDetailsServiceResponse<null>,
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use GET to retrieve batch items.',
      data: null,
    } as BatchDetailsServiceResponse<null>,
    { status: 405 }
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Batch ID is required and must be a string',
          data: null,
        } as BatchDetailsServiceResponse<null>,
        { status: 400 }
      );
    }

    let payload: { items?: unknown; notes?: string; pickup_date?: string };
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          data: null,
        } as BatchDetailsServiceResponse<null>,
        { status: 400 }
      );
    }

    if (!payload.items || !Array.isArray(payload.items)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Request must include an items array',
          data: null,
        } as BatchDetailsServiceResponse<null>,
        { status: 400 }
      );
    }

    const result = await updateBatchItemsService(id, {
      items: payload.items,
      notes: payload.notes ?? undefined,
      pickup_date: payload.pickup_date,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          data: null,
        } as BatchDetailsServiceResponse<null>,
        { status: result.statusCode || (result.error?.includes('not found') ? 404 : 400) }
      );
    }

    return NextResponse.json(
      {
        success: true,
        error: null,
        data: result.data,
      } as BatchDetailsServiceResponse<UpdateBatchItemsResponse>,
      { status: 200 }
    );
  } catch (error) {
    console.error('PUT /api/batches/[id]/items error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        data: null,
      } as BatchDetailsServiceResponse<null>,
      { status: 500 }
    );
  }
}

export async function PATCH() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use GET to retrieve batch items.',
      data: null,
    } as BatchDetailsServiceResponse<null>,
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use GET to retrieve batch items.',
      data: null,
    } as BatchDetailsServiceResponse<null>,
    { status: 405 }
  );
}
