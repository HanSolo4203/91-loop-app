/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getBatchInvoice } from '@/lib/services/analytics';
import type { AnalyticsServiceResponse } from '@/lib/services/analytics';

// GET /api/dashboard/reports/batch-invoice?batchId=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json(
        {
          success: false,
          error: 'batchId is required',
          data: null,
        } as AnalyticsServiceResponse<null>,
        { status: 400 }
      );
    }

    const result = await getBatchInvoice(batchId);
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

    return NextResponse.json(
      {
        success: true,
        error: null,
        data: result.data,
      } as AnalyticsServiceResponse<any>,
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/dashboard/reports/batch-invoice error:', error);
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


