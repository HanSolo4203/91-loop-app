import { NextRequest, NextResponse } from 'next/server';
import { getBusinessSettings, upsertBusinessSettings } from '@/lib/services/business-settings';
import type { BusinessSettingsPayload } from '@/lib/services/business-settings';
import { cachedJsonResponse } from '@/lib/utils/api-cache';

// Revalidate every 1 hour (3600 seconds)
export const revalidate = 3600;

export async function GET() {
  const result = await getBusinessSettings();

  return cachedJsonResponse(
    {
      success: result.success,
      data: result.data,
      error: result.error,
    },
    'static', // Business settings rarely change
    result.statusCode || (result.success ? 200 : 500)
  );
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as BusinessSettingsPayload;

    const result = await upsertBusinessSettings(body);

    return NextResponse.json(
      {
        success: result.success,
        data: result.data,
        error: result.error,
      },
      { status: result.statusCode || (result.success ? 200 : 500) }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: 'Invalid JSON payload',
      },
      { status: 400 }
    );
  }
}

