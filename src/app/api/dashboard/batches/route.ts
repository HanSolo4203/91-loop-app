import { NextRequest, NextResponse } from 'next/server';
import { 
  getRecentBatches, 
  AnalyticsServiceError 
} from '@/lib/services/analytics';
import type { 
  AnalyticsServiceResponse 
} from '@/lib/services/analytics';

// GET /api/dashboard/batches - Get recent batches with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const status = searchParams.get('status');
    const client_id = searchParams.get('client_id');
    const has_discrepancy = searchParams.get('has_discrepancy');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');

    // Validate and set default values
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    // Validate limit
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'Limit must be between 1 and 100',
          data: null,
        } as AnalyticsServiceResponse<null>,
        { status: 400 }
      );
    }

    // Validate offset
    if (isNaN(offsetNum) || offsetNum < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Offset must be a non-negative number',
          data: null,
        } as AnalyticsServiceResponse<null>,
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status && !['pickup', 'processing', 'delivery', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid status. Must be one of: pickup, processing, delivery, completed, cancelled',
          data: null,
        } as AnalyticsServiceResponse<null>,
        { status: 400 }
      );
    }

    // Validate has_discrepancy if provided
    if (has_discrepancy && !['true', 'false'].includes(has_discrepancy)) {
      return NextResponse.json(
        {
          success: false,
          error: 'has_discrepancy must be true or false',
          data: null,
        } as AnalyticsServiceResponse<null>,
        { status: 400 }
      );
    }

    // Validate date formats if provided
    if (date_from) {
      const date = new Date(date_from);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid date_from format. Use YYYY-MM-DD',
            data: null,
          } as AnalyticsServiceResponse<null>,
          { status: 400 }
        );
      }
    }

    if (date_to) {
      const date = new Date(date_to);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid date_to format. Use YYYY-MM-DD',
            data: null,
          } as AnalyticsServiceResponse<null>,
          { status: 400 }
        );
      }
    }

    // Get recent batches
    const result = await getRecentBatches(limitNum, offsetNum);
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          data: null,
        } as AnalyticsServiceResponse<null>,
        { status: 500 }
      );
    }

    // Apply additional filters if provided
    let filteredBatches = result.data || [];

    if (status) {
      filteredBatches = filteredBatches.filter(batch => batch.status === status);
    }

    if (client_id) {
      filteredBatches = filteredBatches.filter(batch => batch.client_name.toLowerCase().includes(client_id.toLowerCase()));
    }

    if (has_discrepancy) {
      const hasDiscrepancy = has_discrepancy === 'true';
      filteredBatches = filteredBatches.filter(batch => batch.has_discrepancy === hasDiscrepancy);
    }

    if (date_from) {
      filteredBatches = filteredBatches.filter(batch => batch.pickup_date >= date_from!);
    }

    if (date_to) {
      filteredBatches = filteredBatches.filter(batch => batch.pickup_date <= date_to!);
    }

    // Calculate pagination metadata
    const totalCount = filteredBatches.length;
    const hasMore = offsetNum + limitNum < totalCount;
    const currentPage = Math.floor(offsetNum / limitNum) + 1;
    const totalPages = Math.ceil(totalCount / limitNum);

    // Apply pagination to filtered results
    const paginatedBatches = filteredBatches.slice(offsetNum, offsetNum + limitNum);

    const response = {
      batches: paginatedBatches,
      pagination: {
        total: totalCount,
        limit: limitNum,
        offset: offsetNum,
        page: currentPage,
        totalPages,
        hasMore
      },
      filters: {
        status: status || null,
        client_id: client_id || null,
        has_discrepancy: has_discrepancy ? has_discrepancy === 'true' : null,
        date_from: date_from || null,
        date_to: date_to || null
      }
    };

    return NextResponse.json(
      {
        success: true,
        error: null,
        data: response,
      } as AnalyticsServiceResponse<any>,
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/dashboard/batches error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        data: null,
      } as AnalyticsServiceResponse<null>,
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use GET to retrieve batches.',
      data: null,
    } as AnalyticsServiceResponse<null>,
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use GET to retrieve batches.',
      data: null,
    } as AnalyticsServiceResponse<null>,
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use GET to retrieve batches.',
      data: null,
    } as AnalyticsServiceResponse<null>,
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use GET to retrieve batches.',
      data: null,
    } as AnalyticsServiceResponse<null>,
    { status: 405 }
  );
}