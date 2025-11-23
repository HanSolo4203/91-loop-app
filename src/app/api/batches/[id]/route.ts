/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { 
  getBatchById, 
  updateBatch
} from '@/lib/services/batch-details';
import type { 
  BatchDetailsServiceResponse,
  BatchUpdateData
} from '@/lib/services/batch-details';
import { cachedJsonResponse } from '@/lib/utils/api-cache';

// Revalidate every 60 seconds
export const revalidate = 60;

// GET /api/batches/[id] - Get complete batch details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate batch ID
    if (!id || typeof id !== 'string') {
      return cachedJsonResponse(
        {
          success: false,
          error: 'Batch ID is required and must be a string',
          data: null,
        } as BatchDetailsServiceResponse<null>,
        'noCache',
        400
      );
    }

    // Get batch details
    const result = await getBatchById(id);
    
    if (!result.success) {
      const statusCode = result.error?.includes('not found') ? 404 : 500;
      return cachedJsonResponse(
        {
          success: false,
          error: result.error,
          data: null,
        } as BatchDetailsServiceResponse<null>,
        'noCache',
        statusCode
      );
    }

    return cachedJsonResponse(
      {
        success: true,
        error: null,
        data: result.data,
      } as BatchDetailsServiceResponse<any>,
      'dynamic' // Batch details change frequently
    );
  } catch (error) {
    console.error('GET /api/batches/[id] error:', error);
    
    return cachedJsonResponse(
      {
        success: false,
        error: 'Internal server error',
        data: null,
      } as BatchDetailsServiceResponse<null>,
      'noCache',
      500
    );
  }
}

// PATCH /api/batches/[id] - Update batch details
export async function PATCH(
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

    // Parse request body
    let updateData: BatchUpdateData;
    try {
      updateData = await request.json();
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

    // Validate update data
    if (!updateData || typeof updateData !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Update data is required and must be an object',
          data: null,
        } as BatchDetailsServiceResponse<null>,
        { status: 400 }
      );
    }

    // Check if at least one field is provided
    const allowedFields = ['status', 'notes', 'pickup_date', 'delivery_date'];
    const providedFields = Object.keys(updateData).filter(key => 
      allowedFields.includes(key) && updateData[key as keyof BatchUpdateData] !== undefined
    );

    if (providedFields.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `At least one field must be provided. Allowed fields: ${allowedFields.join(', ')}`,
          data: null,
        } as BatchDetailsServiceResponse<null>,
        { status: 400 }
      );
    }

    // Validate field types
    if (updateData.status && typeof updateData.status !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Status must be a string',
          data: null,
        } as BatchDetailsServiceResponse<null>,
        { status: 400 }
      );
    }

    if (updateData.notes !== undefined && updateData.notes !== null && typeof updateData.notes !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Notes must be a string or null',
          data: null,
        } as BatchDetailsServiceResponse<null>,
        { status: 400 }
      );
    }

    if (updateData.pickup_date && typeof updateData.pickup_date !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Pickup date must be a string',
          data: null,
        } as BatchDetailsServiceResponse<null>,
        { status: 400 }
      );
    }

    if (updateData.delivery_date && typeof updateData.delivery_date !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Delivery date must be a string',
          data: null,
        } as BatchDetailsServiceResponse<null>,
        { status: 400 }
      );
    }

    // Update the batch
    const result = await updateBatch(id, updateData);
    
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

    return NextResponse.json(
      {
        success: true,
        error: null,
        data: result.data,
      } as BatchDetailsServiceResponse<any>,
      { status: 200 }
    );
  } catch (error) {
    console.error('PATCH /api/batches/[id] error:', error);
    
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
      error: 'Method not allowed. Use GET to retrieve batch details or PATCH to update batch.',
      data: null,
    } as BatchDetailsServiceResponse<null>,
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use GET to retrieve batch details or PATCH to update batch.',
      data: null,
    } as BatchDetailsServiceResponse<null>,
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Batch deletion is not supported.',
      data: null,
    } as BatchDetailsServiceResponse<null>,
    { status: 405 }
  );
}