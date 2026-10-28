import { NextRequest, NextResponse } from 'next/server';
import { getClientLinenLayout, replaceClientLinenLayout } from '@/lib/services/client-linen-layouts';

// GET /api/clients/:id/layout - ordered linen category ids for a client.
// `layout: null` means the client has no saved list yet.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getClientLinenLayout(id);

  if (!result.success) {
    const status = result.error?.includes('Invalid') ? 400 : 500;
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        data: null,
      },
      { status }
    );
  }

  return NextResponse.json({
    success: true,
    error: null,
    data: {
      layout: result.data,
    },
  });
}

// PUT /api/clients/:id/layout - replace the client's linen list and order.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Request body must be a JSON object',
          data: null,
        },
        { status: 400 }
      );
    }

    const categoryIds = body.category_ids;

    if (!Array.isArray(categoryIds)) {
      return NextResponse.json(
        {
          success: false,
          error: 'category_ids must be an array',
          data: null,
        },
        { status: 400 }
      );
    }

    const result = await replaceClientLinenLayout(id, categoryIds);

    if (!result.success) {
      const status = result.error?.includes('Invalid') || result.error?.includes('must') ? 400 : 500;
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          data: null,
        },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      error: null,
      data: {
        layout: result.data,
      },
    });
  } catch (error) {
    console.error('PUT /api/clients/[id]/layout error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save layout',
        data: null,
      },
      { status: 500 }
    );
  }
}
