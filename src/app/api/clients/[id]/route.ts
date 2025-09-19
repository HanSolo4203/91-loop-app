import { NextRequest, NextResponse } from 'next/server';
import { 
  getClientById, 
  updateClient,
  ClientServiceError 
} from '@/lib/services/clients';
import type { 
  ClientServiceResponse 
} from '@/lib/services/clients';

// GET /api/clients/[id] - Get a single client by ID
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
          error: 'Client ID is required',
          data: null,
        } as ClientServiceResponse<null>,
        { status: 400 }
      );
    }

    // Get client data
    const result = await getClientById(id);
    
    if (!result.success) {
      const statusCode = result.error?.includes('not found') ? 404 : 
                        result.error?.includes('Invalid') ? 400 : 500;
      
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
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/clients/[id] error:', error);
    
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

// PATCH /api/clients/[id] - Update a single client
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
          error: 'Client ID is required',
          data: null,
        } as ClientServiceResponse<null>,
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
        } as ClientServiceResponse<null>,
        { status: 400 }
      );
    }

    // Update the client
    const result = await updateClient(id, body);
    
    if (!result.success) {
      const statusCode = result.error?.includes('not found') ? 404 : 
                        result.error?.includes('already exists') ? 409 :
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
      { status: 200 }
    );
  } catch (error) {
    console.error('PATCH /api/clients/[id] error:', error);
    
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
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use POST /api/clients to create new clients.',
      data: null,
    } as ClientServiceResponse<null>,
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use PATCH for partial updates.',
      data: null,
    } as ClientServiceResponse<null>,
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Client deletion is not implemented yet.',
      data: null,
    } as ClientServiceResponse<null>,
    { status: 405 }
  );
}
