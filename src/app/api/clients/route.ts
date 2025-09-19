import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllClients, 
  searchClients, 
  createClient,
  ClientServiceError 
} from '@/lib/services/clients';
import type { 
  ClientServiceResponse, 
  CreateClientRequest,
  ClientSearchFilters 
} from '@/lib/services/clients';

// GET /api/clients - Fetch clients with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const search = searchParams.get('search');
    const isActive = searchParams.get('is_active');
    const page = searchParams.get('page');
    const pageSize = searchParams.get('page_size');

    // Handle search request
    if (search) {
      const filters: ClientSearchFilters = {};
      
      if (isActive) {
        if (!['true', 'false'].includes(isActive)) {
          return NextResponse.json(
            {
              success: false,
              error: 'is_active must be true or false',
              data: null,
            } as ClientServiceResponse<null>,
            { status: 400 }
          );
        }
        filters.is_active = isActive === 'true';
      }

      if (page) {
        const pageNum = parseInt(page, 10);
        if (isNaN(pageNum) || pageNum < 1) {
          return NextResponse.json(
            {
              success: false,
              error: 'Page must be a positive integer',
              data: null,
            } as ClientServiceResponse<null>,
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
            } as ClientServiceResponse<null>,
            { status: 400 }
          );
        }
        filters.page_size = pageSizeNum;
      }

      const result = await searchClients(search, filters);
      
      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
            data: null,
          } as ClientServiceResponse<null>,
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          error: null,
          data: result.data,
        } as ClientServiceResponse<any>,
        { status: 200 }
      );
    }

    // Handle regular fetch request
    const filters: ClientSearchFilters = {};
    
    if (isActive) {
      if (!['true', 'false'].includes(isActive)) {
        return NextResponse.json(
          {
            success: false,
            error: 'is_active must be true or false',
            data: null,
          } as ClientServiceResponse<null>,
          { status: 400 }
        );
      }
      filters.is_active = isActive === 'true';
    }

    if (page) {
      const pageNum = parseInt(page, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        return NextResponse.json(
          {
            success: false,
            error: 'Page must be a positive integer',
            data: null,
          } as ClientServiceResponse<null>,
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
          } as ClientServiceResponse<null>,
          { status: 400 }
        );
      }
      filters.page_size = pageSizeNum;
    }

    const result = await getAllClients(filters);
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          data: null,
        } as ClientServiceResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        error: null,
        data: result.data,
      } as ClientServiceResponse<any>,
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/clients error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        data: null,
      } as ClientServiceResponse<null>,
      { status: 500 }
    );
  }
}

// POST /api/clients - Create a new client
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
        } as ClientServiceResponse<null>,
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Client name is required',
          data: null,
        } as ClientServiceResponse<null>,
        { status: 400 }
      );
    }

    // Create client request object
    const clientRequest: CreateClientRequest = {
      name: body.name,
      contact_number: body.contact_number || undefined,
      email: body.email || undefined,
      address: body.address || undefined,
      is_active: body.is_active !== undefined ? body.is_active : true,
    };

    // Create the client
    const result = await createClient(clientRequest);
    
    if (!result.success) {
      const statusCode = result.error?.includes('already exists') ? 409 : 
                        result.error?.includes('Validation failed') ? 400 : 500;
      
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          data: null,
        } as ClientServiceResponse<null>,
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        success: true,
        error: null,
        data: result.data,
      } as ClientServiceResponse<any>,
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/clients error:', error);
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          data: null,
        } as ClientServiceResponse<null>,
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        data: null,
      } as ClientServiceResponse<null>,
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use POST to create clients.',
      data: null,
    } as ClientServiceResponse<null>,
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use individual client endpoints for updates.',
      data: null,
    } as ClientServiceResponse<null>,
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use individual client endpoints for deletion.',
      data: null,
    } as ClientServiceResponse<null>,
    { status: 405 }
  );
}
