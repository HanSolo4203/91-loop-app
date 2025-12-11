import { NextRequest, NextResponse } from 'next/server';
import { getClientFavoriteCategoryIds, setClientFavoriteCategory } from '@/lib/services/client-favorites';

// GET /api/clients/:id/favorites - fetch favorite linen category ids for a client
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = await getClientFavoriteCategoryIds(id);

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
      favorites: result.data || [],
    },
  });
}

// POST /api/clients/:id/favorites - toggle a favorite linen category for a client
export async function POST(
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

    const { linen_category_id: linenCategoryId, favorite, created_by: createdBy } = body;

    if (!linenCategoryId || typeof linenCategoryId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'linen_category_id is required',
          data: null,
        },
        { status: 400 }
      );
    }

    // Default to marking as favorite when not specified
    const shouldFavorite = favorite !== undefined ? Boolean(favorite) : true;

    const result = await setClientFavoriteCategory(id, linenCategoryId, shouldFavorite, createdBy);

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
      data: result.data,
    });
  } catch (error) {
    console.error('POST /api/clients/[id]/favorites error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save favorite',
        data: null,
      },
      { status: 500 }
    );
  }
}

