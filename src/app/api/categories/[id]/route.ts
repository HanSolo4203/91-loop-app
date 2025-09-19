import { NextRequest, NextResponse } from 'next/server';
import { 
  getCategoryById, 
  updateCategoryPrice, 
  getCategoryStats,
  PricingServiceError 
} from '@/lib/services/pricing';
import type { 
  ApiResponse, 
  LinenCategory 
} from '@/types/database';

// GET /api/categories/[id] - Get a single category by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate ID parameter
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category ID is required',
          data: null,
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Check if this is a stats request
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('stats') === 'true';

    // Get category data
    const result = await getCategoryById(id);
    
    if (!result.success) {
      const statusCode = result.error?.includes('not found') ? 404 : 500;
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          data: null,
        } as ApiResponse<null>,
        { status: statusCode }
      );
    }

    // If stats are requested, get them as well
    if (includeStats && result.data) {
      const statsResult = await getCategoryStats(id);
      
      if (statsResult.success) {
        return NextResponse.json(
          {
            success: true,
            error: null,
            data: {
              category: result.data,
              stats: statsResult.data,
            },
          } as ApiResponse<{ category: LinenCategory; stats: any }>,
          { status: 200 }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        error: null,
        data: result.data,
      } as ApiResponse<LinenCategory>,
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/categories/[id] error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        data: null,
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

// PATCH /api/categories/[id] - Update a single category
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate ID parameter
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category ID is required',
          data: null,
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Request body must be a valid JSON object',
          data: null,
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Handle different update types
    const { price, name, is_active } = body;

    // If updating price specifically
    if (price !== undefined) {
      if (typeof price !== 'number') {
        return NextResponse.json(
          {
            success: false,
            error: 'Price must be a number',
            data: null,
          } as ApiResponse<null>,
          { status: 400 }
        );
      }

      if (price < 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Price must be non-negative',
            data: null,
          } as ApiResponse<null>,
          { status: 400 }
        );
      }

      const result = await updateCategoryPrice(id, price);
      
      if (!result.success) {
        const statusCode = result.error?.includes('not found') ? 404 : 500;
        return NextResponse.json(
          {
            success: false,
            error: result.error,
            data: null,
          } as ApiResponse<null>,
          { status: statusCode }
        );
      }

      return NextResponse.json(
        {
          success: true,
          error: null,
          data: result.data,
        } as ApiResponse<LinenCategory>,
        { status: 200 }
      );
    }

    // Handle other field updates (name, is_active, etc.)
    // This would require additional service functions for full CRUD operations
    // For now, we'll return an error for unsupported updates
    return NextResponse.json(
      {
        success: false,
        error: 'Only price updates are currently supported. Use the price field to update pricing.',
        data: null,
      } as ApiResponse<null>,
      { status: 400 }
    );
  } catch (error) {
    console.error('PATCH /api/categories/[id] error:', error);
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          data: null,
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        data: null,
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use POST /api/categories to create new categories.',
      data: null,
    } as ApiResponse<null>,
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use PATCH for partial updates.',
      data: null,
    } as ApiResponse<null>,
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Category deletion is not implemented.',
      data: null,
    } as ApiResponse<null>,
    { status: 405 }
  );
}
