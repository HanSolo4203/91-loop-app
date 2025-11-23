/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { 
  getMonthlyStats, 
  getRevenueByMonth, 
  getTopClients, 
  getDiscrepancyReport,
  getDashboardOverview
} from '@/lib/services/analytics';
import type { 
  AnalyticsServiceResponse 
} from '@/lib/services/analytics';
import { cachedJsonResponse } from '@/lib/utils/api-cache';

// Revalidate every 60 seconds
export const revalidate = 60;

// GET /api/dashboard/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const month = searchParams.get('month'); // Format: YYYY-MM
    const year = searchParams.get('year');
    const type = searchParams.get('type') || 'overview'; // overview, monthly, revenue, clients, discrepancies

    // Handle different types of statistics requests
    switch (type) {
      case 'overview':
        return handleOverviewRequest();
      
      case 'monthly':
        return handleMonthlyRequest(month, year);
      
      case 'revenue':
        return handleRevenueRequest(year);
      
      case 'clients':
        return handleClientsRequest();
      
      case 'discrepancies':
        return handleDiscrepanciesRequest();
      
      default:
    return cachedJsonResponse(
      {
        success: false,
        error: 'Invalid type parameter. Must be one of: overview, monthly, revenue, clients, discrepancies',
        data: null,
      } as AnalyticsServiceResponse<null>,
      'noCache',
      400
    );
    }
  } catch (error) {
    console.error('GET /api/dashboard/stats error:', error);
    
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

// Handle overview statistics request
async function handleOverviewRequest() {
  try {
    const result = await getDashboardOverview();
    
    if (!result.success) {
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

    return cachedJsonResponse(
      {
        success: true,
        error: null,
        data: result.data,
      } as AnalyticsServiceResponse<any>,
      'dynamic' // Stats change frequently
    );
  } catch (error) {
    console.error('Overview request error:', error);
    return cachedJsonResponse(
      {
        success: false,
        error: 'Failed to fetch overview statistics',
        data: null,
      } as AnalyticsServiceResponse<null>,
      'noCache',
      500
    );
  }
}

// Handle monthly statistics request
async function handleMonthlyRequest(month: string | null, year: string | null) {
  try {
    let targetYear: number;
    let targetMonth: number;

    if (month) {
      // Parse YYYY-MM format
      const monthParts = month.split('-');
      if (monthParts.length !== 2) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid month format. Use YYYY-MM',
            data: null,
          } as AnalyticsServiceResponse<null>,
          { status: 400 }
        );
      }

      targetYear = parseInt(monthParts[0], 10);
      targetMonth = parseInt(monthParts[1], 10);

      if (isNaN(targetYear) || isNaN(targetMonth)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid month format. Use YYYY-MM',
            data: null,
          } as AnalyticsServiceResponse<null>,
          { status: 400 }
        );
      }
    } else if (year) {
      // Use current month of specified year
      targetYear = parseInt(year, 10);
      if (isNaN(targetYear)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid year format',
            data: null,
          } as AnalyticsServiceResponse<null>,
          { status: 400 }
        );
      }
      targetMonth = new Date().getMonth() + 1;
    } else {
      // Use current month and year
      const now = new Date();
      targetYear = now.getFullYear();
      targetMonth = now.getMonth() + 1;
    }

    const result = await getMonthlyStats(targetYear, targetMonth);
    
    if (!result.success) {
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

    return cachedJsonResponse(
      {
        success: true,
        error: null,
        data: result.data,
      } as AnalyticsServiceResponse<any>,
      'dynamic' // Stats change frequently
    );
  } catch (error) {
    console.error('Monthly request error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch monthly statistics',
        data: null,
      } as AnalyticsServiceResponse<null>,
      { status: 500 }
    );
  }
}

// Handle revenue data request
async function handleRevenueRequest(year: string | null) {
  try {
    let targetYear: number;

    if (year) {
      targetYear = parseInt(year, 10);
      if (isNaN(targetYear)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid year format',
            data: null,
          } as AnalyticsServiceResponse<null>,
          { status: 400 }
        );
      }
    } else {
      // Use current year
      targetYear = new Date().getFullYear();
    }

    const result = await getRevenueByMonth(targetYear);
    
    if (!result.success) {
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

    return cachedJsonResponse(
      {
        success: true,
        error: null,
        data: result.data,
      } as AnalyticsServiceResponse<any>,
      'dynamic' // Stats change frequently
    );
  } catch (error) {
    console.error('Revenue request error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch revenue data',
        data: null,
      } as AnalyticsServiceResponse<null>,
      { status: 500 }
    );
  }
}

// Handle top clients request
async function handleClientsRequest() {
  try {
    const result = await getTopClients(10);
    
    if (!result.success) {
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

    return cachedJsonResponse(
      {
        success: true,
        error: null,
        data: result.data,
      } as AnalyticsServiceResponse<any>,
      'dynamic' // Stats change frequently
    );
  } catch (error) {
    console.error('Clients request error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch top clients',
        data: null,
      } as AnalyticsServiceResponse<null>,
      { status: 500 }
    );
  }
}

// Handle discrepancies request
async function handleDiscrepanciesRequest() {
  try {
    const result = await getDiscrepancyReport();
    
    if (!result.success) {
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

    return cachedJsonResponse(
      {
        success: true,
        error: null,
        data: result.data,
      } as AnalyticsServiceResponse<any>,
      'dynamic' // Stats change frequently
    );
  } catch (error) {
    console.error('Discrepancies request error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch discrepancy report',
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
      error: 'Method not allowed. Use GET to retrieve statistics.',
      data: null,
    } as AnalyticsServiceResponse<null>,
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use GET to retrieve statistics.',
      data: null,
    } as AnalyticsServiceResponse<null>,
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use GET to retrieve statistics.',
      data: null,
    } as AnalyticsServiceResponse<null>,
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use GET to retrieve statistics.',
      data: null,
    } as AnalyticsServiceResponse<null>,
    { status: 405 }
  );
}
