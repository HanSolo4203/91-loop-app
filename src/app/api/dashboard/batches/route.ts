/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { 
  getRecentBatches
} from '@/lib/services/analytics';
import type { 
  AnalyticsServiceResponse 
} from '@/lib/services/analytics';
import { cachedJsonResponse } from '@/lib/utils/api-cache';

// Revalidate every 60 seconds
export const revalidate = 60;

// GET /api/dashboard/batches - Get recent batches with pagination
export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/dashboard/batches - Starting request');
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!serviceRoleKey,
      supabaseUrlLength: supabaseUrl?.length || 0,
      serviceRoleKeyLength: serviceRoleKey?.length || 0
    });
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing required environment variables');
      return cachedJsonResponse(
        {
          success: false,
          error: 'Server configuration error: Missing environment variables',
          data: null,
        } as AnalyticsServiceResponse<null>,
        'noCache',
        500
      );
    }
    
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
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      return cachedJsonResponse(
        {
          success: false,
          error: 'Limit must be between 1 and 1000',
          data: null,
        } as AnalyticsServiceResponse<null>,
        'noCache',
        400
      );
    }

    // Validate offset
    if (isNaN(offsetNum) || offsetNum < 0) {
      return cachedJsonResponse(
        {
          success: false,
          error: 'Offset must be a non-negative number',
          data: null,
        } as AnalyticsServiceResponse<null>,
        'noCache',
        400
      );
    }

    // Validate status if provided
    if (status) {
      const statusList = status.split(',').map(s => s.trim());
      const validStatuses = ['pickup', 'washing', 'completed', 'delivered'];
      const invalidStatuses = statusList.filter(s => !validStatuses.includes(s));
      
      if (invalidStatuses.length > 0) {
        return cachedJsonResponse(
          {
            success: false,
            error: `Invalid status values: ${invalidStatuses.join(', ')}. Must be one or more of: pickup, washing, completed, delivered`,
            data: null,
          } as AnalyticsServiceResponse<null>,
          'noCache',
          400
        );
      }
    }

    // Validate has_discrepancy if provided
    if (has_discrepancy && !['true', 'false'].includes(has_discrepancy)) {
      return cachedJsonResponse(
        {
          success: false,
          error: 'has_discrepancy must be true or false',
          data: null,
        } as AnalyticsServiceResponse<null>,
        'noCache',
        400
      );
    }

    // Validate date formats if provided
    if (date_from) {
      const date = new Date(date_from);
      if (isNaN(date.getTime())) {
        return cachedJsonResponse(
          {
            success: false,
            error: 'Invalid date_from format. Use YYYY-MM-DD',
            data: null,
          } as AnalyticsServiceResponse<null>,
          'noCache',
          400
        );
      }
    }

    if (date_to) {
      const date = new Date(date_to);
      if (isNaN(date.getTime())) {
        return cachedJsonResponse(
          {
            success: false,
            error: 'Invalid date_to format. Use YYYY-MM-DD',
            data: null,
          } as AnalyticsServiceResponse<null>,
          'noCache',
          400
        );
      }
    }

    // When date filters are applied, fetch more batches to account for additional filtering
    // This ensures we have enough results after filtering by status/client/discrepancy
    const fetchLimit = (date_from || date_to || status || client_id || has_discrepancy) 
      ? Math.min(limitNum * 5, 1000) // Fetch up to 5x the limit or 1000, whichever is smaller
      : limitNum;

    // Get recent batches with date filters applied in the query (more efficient)
    console.log('Calling getRecentBatches with:', { fetchLimit, offsetNum, date_from, date_to });
    // For date-filtered queries, start from offset 0 and fetch more, then paginate after filtering
    const queryOffset = (date_from || date_to || status || client_id || has_discrepancy) ? 0 : offsetNum;
    const result = await getRecentBatches(fetchLimit, queryOffset, date_from || undefined, date_to || undefined);
    
    console.log('getRecentBatches result:', { success: result.success, error: result.error, dataLength: result.data?.length });
    
    if (!result.success) {
      console.error('getRecentBatches failed:', result.error);
      return cachedJsonResponse(
        {
          success: false,
          error: result.error,
          data: null,
        } as AnalyticsServiceResponse<null>,
        'noCache',
        500
      );
    }

    // Apply additional filters if provided (status, client, discrepancy)
    let filteredBatches = result.data || [];

    if (status) {
      const statusList = status.split(',').map(s => s.trim());
      filteredBatches = filteredBatches.filter(batch => statusList.includes(batch.status));
    }

    if (client_id) {
      filteredBatches = filteredBatches.filter(batch => batch.client_name.toLowerCase().includes(client_id.toLowerCase()));
    }

    if (has_discrepancy) {
      const hasDiscrepancy = has_discrepancy === 'true';
      filteredBatches = filteredBatches.filter(batch => batch.has_discrepancy === hasDiscrepancy);
    }

    // Note: date_from and date_to filters are now applied in the database query, so no need to filter here

    // Calculate pagination metadata based on filtered results
    const totalCount = filteredBatches.length;
    
    // When date filters are applied and limit is high (>= 100), return all batches without pagination
    // This ensures all batches for a month are shown
    const shouldReturnAll = (date_from || date_to) && limitNum >= 100 && !status && !client_id && !has_discrepancy;
    
    const hasMore = shouldReturnAll ? false : offsetNum + limitNum < totalCount;
    const currentPage = shouldReturnAll ? 1 : Math.floor(offsetNum / limitNum) + 1;
    const totalPages = shouldReturnAll ? 1 : Math.ceil(totalCount / limitNum);

    // Apply pagination to filtered results (or return all if shouldReturnAll is true)
    const paginatedBatches = shouldReturnAll 
      ? filteredBatches 
      : filteredBatches.slice(offsetNum, offsetNum + limitNum);

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

    return cachedJsonResponse(
      {
        success: true,
        error: null,
        data: response,
      } as AnalyticsServiceResponse<any>,
      'dynamic' // Batches change frequently
    );
  } catch (error) {
    console.error('GET /api/dashboard/batches error:', error);
    
    return cachedJsonResponse(
      {
        success: false,
        error: 'Internal server error',
        data: null,
      } as AnalyticsServiceResponse<null>,
      'noCache',
      500
    );
  }
}

// Handle unsupported methods with consistent JSON + cache headers
export function POST() {
  return cachedJsonResponse(
    {
      success: false,
      error: 'Method not allowed. Use GET to retrieve batches.',
      data: null,
    } as AnalyticsServiceResponse<null>,
    'noCache',
    405
  );
}

export function PUT() {
  return cachedJsonResponse(
    {
      success: false,
      error: 'Method not allowed. Use GET to retrieve batches.',
      data: null,
    } as AnalyticsServiceResponse<null>,
    'noCache',
    405
  );
}

export function PATCH() {
  return cachedJsonResponse(
    {
      success: false,
      error: 'Method not allowed. Use GET to retrieve batches.',
      data: null,
    } as AnalyticsServiceResponse<null>,
    'noCache',
    405
  );
}

export function DELETE() {
  return cachedJsonResponse(
    {
      success: false,
      error: 'Method not allowed. Use GET to retrieve batches.',
      data: null,
    } as AnalyticsServiceResponse<null>,
    'noCache',
    405
  );
}