/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { 
  createBatch, 
  getBatches
} from '@/lib/services/batches';
import type { 
  CreateBatchRequest,
  BatchSearchFilters 
} from '@/lib/services/batches';
import { cachedJsonResponse } from '@/lib/utils/api-cache';

// Revalidate every 60 seconds for GET requests
export const revalidate = 60;

// POST /api/batches - Create a new batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Request body must be a valid JSON object',
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate required fields (paper_batch_id is optional and may be generated)
    const requiredFields = ['client_id', 'pickup_date', 'items'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          {
            success: false,
            error: `${field} is required`,
            data: null,
          },
          { status: 400 }
        );
      }
    }

    // Validate items array
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Items must be a non-empty array',
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate each item
    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      if (!item || typeof item !== 'object') {
        return NextResponse.json(
          {
            success: false,
            error: `Item ${i + 1} must be an object`,
            data: null,
          },
          { status: 400 }
        );
      }

      if (!item.linen_category_id) {
        return NextResponse.json(
          {
            success: false,
            error: `Item ${i + 1}: linen_category_id is required`,
            data: null,
          },
          { status: 400 }
        );
      }

      if (typeof item.quantity_sent !== 'number' || item.quantity_sent < 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Item ${i + 1}: quantity_sent must be a non-negative number`,
            data: null,
          },
          { status: 400 }
        );
      }
    }

    // Create batch request object
    const batchRequest: CreateBatchRequest = {
      paper_batch_id: body.paper_batch_id,
      client_id: body.client_id,
      pickup_date: body.pickup_date,
      status: body.status || 'pickup',
      notes: body.notes || null,
      items: body.items,
    };

    // Create the batch
    const result = await createBatch(batchRequest);
    
    if (!result.success) {
      const statusCode = result.error?.includes('already exists') ? 409 : 
                        result.error?.includes('not found') ? 404 :
                        result.error?.includes('Validation failed') ? 400 : 500;
      
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          data: null,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        success: true,
        error: null,
        data: result.data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/batches error:', error);
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          data: null,
        },
        { status: 400 }
      );
    }

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

// GET /api/batches - Fetch batches with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const filters: BatchSearchFilters = {};
    
    // Pagination parameters
    const page = searchParams.get('page');
    const pageSize = searchParams.get('page_size');
    
    if (page) {
      const pageNum = parseInt(page, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        return NextResponse.json(
          {
            success: false,
            error: 'Page must be a positive integer',
            data: null,
          },
          { status: 400 }
        );
      }
      filters.page = pageNum;
    }

    if (pageSize) {
      const pageSizeNum = parseInt(pageSize, 10);
      if (isNaN(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > 100) {
        return NextResponse.json(
          {
            success: false,
            error: 'Page size must be between 1 and 100',
            data: null,
          },
          { status: 400 }
        );
      }
      filters.page_size = pageSizeNum;
    }

    // Filter parameters
    const clientId = searchParams.get('client_id');
    if (clientId) {
      filters.client_id = clientId;
    }

    const status = searchParams.get('status');
    if (status) {
      if (!['pickup', 'washing', 'completed', 'delivered'].includes(status)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid status. Must be one of: pickup, washing, completed, delivered',
            data: null,
          },
          { status: 400 }
        );
      }
      filters.status = status as any;
    }

    const dateFrom = searchParams.get('date_from');
    if (dateFrom) {
      const date = new Date(dateFrom);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid date_from format. Use YYYY-MM-DD',
            data: null,
          },
          { status: 400 }
        );
      }
      filters.date_from = dateFrom;
    }

    const dateTo = searchParams.get('date_to');
    if (dateTo) {
      const date = new Date(dateTo);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid date_to format. Use YYYY-MM-DD',
            data: null,
          },
          { status: 400 }
        );
      }
      filters.date_to = dateTo;
    }

    const hasDiscrepancy = searchParams.get('has_discrepancy');
    if (hasDiscrepancy) {
      if (!['true', 'false'].includes(hasDiscrepancy)) {
        return NextResponse.json(
          {
            success: false,
            error: 'has_discrepancy must be true or false',
            data: null,
          },
          { status: 400 }
        );
      }
      filters.has_discrepancy = hasDiscrepancy === 'true';
    }

    const searchText = searchParams.get('search');
    if (searchText) {
      filters.search_text = searchText;
    }

    // Fetch batches
    const result = await getBatches(filters);
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          data: null,
        },
        { status: 500 }
      );
    }

    return cachedJsonResponse(
      {
        success: true,
        error: null,
        data: result.data,
      },
      'dynamic' // Batches change frequently
    );
  } catch (error) {
    console.error('GET /api/batches error:', error);
    
    return cachedJsonResponse(
      {
        success: false,
        error: 'Internal server error',
        data: null,
      },
      'noCache',
      500
    );
  }
}

// Handle unsupported methods
export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use POST to create batches.',
      data: null,
    },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use individual batch endpoints for updates.',
      data: null,
    },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use individual batch endpoints for deletion.',
      data: null,
    },
    { status: 405 }
  );
}
