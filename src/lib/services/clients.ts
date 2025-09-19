import { supabaseAdmin } from '@/lib/supabase';
import type { 
  Client, 
  ClientInsert, 
  ClientUpdate 
} from '@/types/database';

// Custom error class for client service errors
export class ClientServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ClientServiceError';
  }
}

// Service response types
export interface ClientServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

// Request types
export interface ClientSearchFilters {
  search_text?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export interface CreateClientRequest {
  name: string;
  contact_number?: string;
  email?: string;
  address?: string;
  is_active?: boolean;
}

/**
 * Search clients by name, email, or contact number
 * @param query - Search query
 * @param filters - Additional filters
 * @returns Promise<ClientServiceResponse<Client[]>>
 */
export async function searchClients(
  query: string,
  filters: ClientSearchFilters = {}
): Promise<ClientServiceResponse<Client[]>> {
  try {
    if (!query || query.trim().length === 0) {
      throw new ClientServiceError(
        'Search query is required',
        'INVALID_QUERY',
        400
      );
    }

    const searchTerm = query.trim();
    const page = filters.page || 1;
    const pageSize = Math.min(filters.page_size || 20, 100);
    const offset = (page - 1) * pageSize;

    let dbQuery = supabaseAdmin
      .from('clients')
      .select('*', { count: 'exact' })
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,contact_number.ilike.%${searchTerm}%`);

    // Apply additional filters
    if (filters.is_active !== undefined) {
      dbQuery = dbQuery.eq('is_active', filters.is_active);
    }

    // Apply pagination and ordering
    dbQuery = dbQuery
      .order('name', { ascending: true })
      .range(offset, offset + pageSize - 1);

    const { data, error, count } = await dbQuery;

    if (error) {
      throw new ClientServiceError(
        `Failed to search clients: ${error.message}`,
        'SEARCH_ERROR',
        500
      );
    }

    return {
      data: data || [],
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof ClientServiceError) {
      return {
        data: null,
        error: error.message,
        success: false,
      };
    }

    return {
      data: null,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false,
    };
  }
}

/**
 * Get all clients with optional filtering and pagination
 * @param filters - Filter and pagination options
 * @returns Promise<ClientServiceResponse<{ clients: Client[]; total: number; page: number; pageSize: number }>>
 */
export async function getAllClients(
  filters: ClientSearchFilters = {}
): Promise<ClientServiceResponse<{ clients: Client[]; total: number; page: number; pageSize: number }>> {
  try {
    const page = filters.page || 1;
    const pageSize = Math.min(filters.page_size || 20, 100);
    const offset = (page - 1) * pageSize;

    let query = supabaseAdmin
      .from('clients')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters.search_text) {
      const searchTerm = filters.search_text.trim();
      query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,contact_number.ilike.%${searchTerm}%`);
    }

    // Apply pagination and ordering
    query = query
      .order('name', { ascending: true })
      .range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new ClientServiceError(
        `Failed to fetch clients: ${error.message}`,
        'FETCH_ERROR',
        500
      );
    }

    return {
      data: {
        clients: data || [],
        total: count || 0,
        page,
        pageSize,
      },
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof ClientServiceError) {
      return {
        data: null,
        error: error.message,
        success: false,
      };
    }

    return {
      data: null,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false,
    };
  }
}

/**
 * Get a single client by ID
 * @param id - Client UUID
 * @returns Promise<ClientServiceResponse<Client>>
 */
export async function getClientById(id: string): Promise<ClientServiceResponse<Client>> {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new ClientServiceError(
        'Invalid client ID format',
        'INVALID_ID',
        400
      );
    }

    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ClientServiceError(
          'Client not found',
          'NOT_FOUND',
          404
        );
      }
      throw new ClientServiceError(
        `Failed to fetch client: ${error.message}`,
        'FETCH_ERROR',
        500
      );
    }

    return {
      data,
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof ClientServiceError) {
      return {
        data: null,
        error: error.message,
        success: false,
      };
    }

    return {
      data: null,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false,
    };
  }
}

/**
 * Create a new client
 * @param clientData - Client data
 * @returns Promise<ClientServiceResponse<Client>>
 */
export async function createClient(clientData: CreateClientRequest): Promise<ClientServiceResponse<Client>> {
  try {
    // Validate client data
    const validation = validateClientData(clientData);
    if (!validation.isValid) {
      throw new ClientServiceError(
        `Validation failed: ${validation.errors.join(', ')}`,
        'VALIDATION_ERROR',
        400
      );
    }

    // Check if client with same name already exists
    const { data: existingClient, error: checkError } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('name', clientData.name.trim())
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw new ClientServiceError(
        `Failed to check existing client: ${checkError.message}`,
        'CHECK_EXISTING_ERROR',
        500
      );
    }

    if (existingClient) {
      throw new ClientServiceError(
        'Client with this name already exists',
        'DUPLICATE_CLIENT',
        409
      );
    }

    // Check if email already exists (if provided)
    if (clientData.email) {
      const { data: existingEmail, error: emailCheckError } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('email', clientData.email.trim())
        .single();

      if (emailCheckError && emailCheckError.code !== 'PGRST116') {
        throw new ClientServiceError(
          `Failed to check existing email: ${emailCheckError.message}`,
          'CHECK_EMAIL_ERROR',
          500
        );
      }

      if (existingEmail) {
        throw new ClientServiceError(
          'Client with this email already exists',
          'DUPLICATE_EMAIL',
          409
        );
      }
    }

    // Create client
    const clientInsert: ClientInsert = {
      name: clientData.name.trim(),
      contact_number: clientData.contact_number?.trim() || null,
      email: clientData.email?.trim() || null,
      address: clientData.address?.trim() || null,
      is_active: clientData.is_active !== undefined ? clientData.is_active : true,
    };

    const { data, error } = await supabaseAdmin
      .from('clients')
      .insert(clientInsert)
      .select()
      .single();

    if (error) {
      throw new ClientServiceError(
        `Failed to create client: ${error.message}`,
        'CREATE_ERROR',
        500
      );
    }

    return {
      data,
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof ClientServiceError) {
      return {
        data: null,
        error: error.message,
        success: false,
      };
    }

    return {
      data: null,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false,
    };
  }
}

/**
 * Update an existing client
 * @param id - Client UUID
 * @param clientData - Updated client data
 * @returns Promise<ClientServiceResponse<Client>>
 */
export async function updateClient(id: string, clientData: Partial<CreateClientRequest>): Promise<ClientServiceResponse<Client>> {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new ClientServiceError(
        'Invalid client ID format',
        'INVALID_ID',
        400
      );
    }

    // Validate client data
    const validation = validateClientData(clientData, true);
    if (!validation.isValid) {
      throw new ClientServiceError(
        `Validation failed: ${validation.errors.join(', ')}`,
        'VALIDATION_ERROR',
        400
      );
    }

    // Check if client exists
    const { data: existingClient, error: fetchError } = await supabaseAdmin
      .from('clients')
      .select('id, name, email')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new ClientServiceError(
          'Client not found',
          'NOT_FOUND',
          404
        );
      }
      throw new ClientServiceError(
        `Failed to fetch client: ${fetchError.message}`,
        'FETCH_ERROR',
        500
      );
    }

    // Check for duplicate name (if name is being updated)
    if (clientData.name && clientData.name.trim() !== existingClient.name) {
      const { data: duplicateName, error: nameCheckError } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('name', clientData.name.trim())
        .neq('id', id)
        .single();

      if (nameCheckError && nameCheckError.code !== 'PGRST116') {
        throw new ClientServiceError(
          `Failed to check duplicate name: ${nameCheckError.message}`,
          'CHECK_NAME_ERROR',
          500
        );
      }

      if (duplicateName) {
        throw new ClientServiceError(
          'Client with this name already exists',
          'DUPLICATE_CLIENT',
          409
        );
      }
    }

    // Check for duplicate email (if email is being updated)
    if (clientData.email && clientData.email.trim() !== existingClient.email) {
      const { data: duplicateEmail, error: emailCheckError } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('email', clientData.email.trim())
        .neq('id', id)
        .single();

      if (emailCheckError && emailCheckError.code !== 'PGRST116') {
        throw new ClientServiceError(
          `Failed to check duplicate email: ${emailCheckError.message}`,
          'CHECK_EMAIL_ERROR',
          500
        );
      }

      if (duplicateEmail) {
        throw new ClientServiceError(
          'Client with this email already exists',
          'DUPLICATE_EMAIL',
          409
        );
      }
    }

    // Prepare update data
    const updateData: ClientUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (clientData.name !== undefined) {
      updateData.name = clientData.name.trim();
    }
    if (clientData.contact_number !== undefined) {
      updateData.contact_number = clientData.contact_number?.trim() || null;
    }
    if (clientData.email !== undefined) {
      updateData.email = clientData.email?.trim() || null;
    }
    if (clientData.address !== undefined) {
      updateData.address = clientData.address?.trim() || null;
    }
    if (clientData.is_active !== undefined) {
      updateData.is_active = clientData.is_active;
    }

    const { data, error } = await supabaseAdmin
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new ClientServiceError(
        `Failed to update client: ${error.message}`,
        'UPDATE_ERROR',
        500
      );
    }

    return {
      data,
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof ClientServiceError) {
      return {
        data: null,
        error: error.message,
        success: false,
      };
    }

    return {
      data: null,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false,
    };
  }
}

/**
 * Validate client data
 * @param clientData - Client data to validate
 * @param isUpdate - Whether this is an update operation
 * @returns { isValid: boolean; errors: string[] }
 */
function validateClientData(clientData: Partial<CreateClientRequest>, isUpdate: boolean = false): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate name
  if (!isUpdate || clientData.name !== undefined) {
    if (!clientData.name || clientData.name.trim().length === 0) {
      errors.push('Client name is required');
    } else if (clientData.name.length > 255) {
      errors.push('Client name must be 255 characters or less');
    }
  }

  // Validate contact number
  if (clientData.contact_number !== undefined && clientData.contact_number) {
    if (clientData.contact_number.length > 50) {
      errors.push('Contact number must be 50 characters or less');
    }
    // Basic phone number validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(clientData.contact_number.replace(/[\s\-\(\)]/g, ''))) {
      errors.push('Invalid contact number format');
    }
  }

  // Validate email
  if (clientData.email !== undefined && clientData.email) {
    if (clientData.email.length > 255) {
      errors.push('Email must be 255 characters or less');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientData.email)) {
      errors.push('Invalid email format');
    }
  }

  // Validate address
  if (clientData.address !== undefined && clientData.address) {
    if (clientData.address.length > 500) {
      errors.push('Address must be 500 characters or less');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get client statistics
 * @param id - Client UUID (optional, if not provided returns stats for all clients)
 * @returns Promise<ClientServiceResponse<any>>
 */
export async function getClientStats(id?: string): Promise<ClientServiceResponse<any>> {
  try {
    if (id) {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        throw new ClientServiceError(
          'Invalid client ID format',
          'INVALID_ID',
          400
        );
      }

      // Get stats for specific client using the database function
      const { data, error } = await supabaseAdmin
        .rpc('get_client_stats', { client_uuid: id });

      if (error) {
        throw new ClientServiceError(
          `Failed to get client stats: ${error.message}`,
          'STATS_ERROR',
          500
        );
      }

      return {
        data: data?.[0] || null,
        error: null,
        success: true,
      };
    }

    // Get overall client statistics
    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('id, name, is_active');

    if (error) {
      throw new ClientServiceError(
        `Failed to get client stats: ${error.message}`,
        'STATS_ERROR',
        500
      );
    }

    const stats = {
      total_clients: data?.length || 0,
      active_clients: data?.filter(c => c.is_active).length || 0,
      inactive_clients: data?.filter(c => !c.is_active).length || 0,
    };

    return {
      data: stats,
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof ClientServiceError) {
      return {
        data: null,
        error: error.message,
        success: false,
      };
    }

    return {
      data: null,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false,
    };
  }
}
