/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllCategories, 
  bulkUpdatePricing, 
  searchCategories,
  getCategoryStats
} from '@/lib/services/pricing';
import type { 
  ApiResponse, 
  PaginatedResponse, 
  LinenCategory 
} from '@/types/database';

// GET /api/categories - Fetch all categories with optional pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : undefined;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined;
    const search = searchParams.get('search');
    const stats = searchParams.get('stats') === 'true';

    // Validate pagination parameters
    if (page !== undefined && (isNaN(page) || page < 1)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Page must be a positive integer',
          data: null,
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    if (pageSize !== undefined && (isNaN(pageSize) || pageSize < 1 || pageSize > 100)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Page size must be between 1 and 100',
          data: null,
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Handle search request
    if (search) {
      const result = await searchCategories(search, includeInactive);
      
      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
            data: null,
          } as ApiResponse<null>,
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          error: null,
          data: result.data,
        } as ApiResponse<LinenCategory[]>,
        { status: 200 }
      );
    }

    // Handle stats request
    if (stats) {
      const result = await getCategoryStats();
      
      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
            data: null,
          } as ApiResponse<null>,
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          error: null,
          data: result.data,
        } as ApiResponse<any>,
        { status: 200 }
      );
    }

    // Handle regular fetch request
    const result = await getAllCategories(includeInactive, page, pageSize);
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          data: null,
        } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        error: null,
        data: result.data,
      } as ApiResponse<LinenCategory[] | PaginatedResponse<LinenCategory>>,
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/categories error:', error);
    
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

// PATCH /api/categories - Bulk update pricing for multiple categories
export async function PATCH(request: NextRequest) {
  try {
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

    const { updates } = body;

    // Validate updates array
    if (!Array.isArray(updates)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Updates must be an array',
          data: null,
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    if (updates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Updates array cannot be empty',
          data: null,
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Validate each update object
    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      
      if (!update || typeof update !== 'object') {
        return NextResponse.json(
          {
            success: false,
            error: `Update at index ${i} must be an object`,
            data: null,
          } as ApiResponse<null>,
          { status: 400 }
        );
      }

      if (!update.id || typeof update.id !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: `Update at index ${i} must have a valid id field`,
            data: null,
          } as ApiResponse<null>,
          { status: 400 }
        );
      }

      if (typeof update.price !== 'number') {
        return NextResponse.json(
          {
            success: false,
            error: `Update at index ${i} must have a valid price field`,
            data: null,
          } as ApiResponse<null>,
          { status: 400 }
        );
      }

      if (update.price < 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Update at index ${i} price must be non-negative`,
            data: null,
          } as ApiResponse<null>,
          { status: 400 }
        );
      }
    }

    // Perform bulk update
    const result = await bulkUpdatePricing(updates);
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          data: null,
        } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        error: null,
        data: result.data,
      } as ApiResponse<any>,
      { status: 200 }
    );
  } catch (error) {
    console.error('PATCH /api/categories error:', error);
    
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
      error: 'Method not allowed. Use PATCH for bulk updates.',
      data: null,
    } as ApiResponse<null>,
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use PATCH for bulk updates.',
      data: null,
    } as ApiResponse<null>,
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use individual category endpoints for deletion.',
      data: null,
    } as ApiResponse<null>,
    { status: 405 }
  );
}
