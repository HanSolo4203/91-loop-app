import { supabaseAdmin } from '@/lib/supabase';
import type { 
  LinenCategory, 
  LinenCategoryUpdate, 
  ApiResponse, 
  PaginatedResponse 
} from '@/types/database';

// Custom error class for pricing service errors
export class PricingServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'PricingServiceError';
  }
}

// Validation schemas
export interface PriceUpdateRequest {
  id: string;
  price: number;
}

export interface BulkPriceUpdateRequest {
  updates: PriceUpdateRequest[];
}

// Service response types
export interface PricingServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface BulkUpdateResult {
  updated: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

/**
 * Get all linen categories with their pricing information
 * @param includeInactive - Whether to include inactive categories
 * @param page - Page number for pagination (optional)
 * @param pageSize - Number of items per page (optional)
 * @returns Promise<PricingServiceResponse<LinenCategory[] | PaginatedResponse<LinenCategory>>>
 */
export async function getAllCategories(
  includeInactive: boolean = false,
  page?: number,
  pageSize?: number
): Promise<PricingServiceResponse<LinenCategory[] | PaginatedResponse<LinenCategory>>> {
  try {
    let query = supabaseAdmin
      .from('linen_categories')
      .select('*')
      .order('name', { ascending: true });

    // Filter out inactive categories if requested
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    // Handle pagination if provided
    if (page && pageSize) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      // Get total count for pagination
      const { count, error: countError } = await supabaseAdmin
        .from('linen_categories')
        .select('*', { count: 'exact', head: true })
        .modify((query) => {
          if (!includeInactive) {
            query.eq('is_active', true);
          }
        });

      if (countError) {
        throw new PricingServiceError(
          `Failed to get category count: ${countError.message}`,
          'COUNT_ERROR',
          500
        );
      }

      query = query.range(from, to);

      const { data, error } = await query;

      if (error) {
        throw new PricingServiceError(
          `Failed to fetch categories: ${error.message}`,
          'FETCH_ERROR',
          500
        );
      }

      const totalPages = Math.ceil((count || 0) / pageSize);

      return {
        data: {
          data: data || [],
          count: count || 0,
          page,
          pageSize,
          totalPages,
        },
        error: null,
        success: true,
      };
    }

    // No pagination
    const { data, error } = await query;

    if (error) {
      throw new PricingServiceError(
        `Failed to fetch categories: ${error.message}`,
        'FETCH_ERROR',
        500
      );
    }

    return {
      data: data || [],
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof PricingServiceError) {
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
 * Get a single category by ID
 * @param id - Category UUID
 * @returns Promise<PricingServiceResponse<LinenCategory>>
 */
export async function getCategoryById(
  id: string
): Promise<PricingServiceResponse<LinenCategory>> {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new PricingServiceError(
        'Invalid category ID format',
        'INVALID_ID',
        400
      );
    }

    const { data, error } = await supabaseAdmin
      .from('linen_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new PricingServiceError(
          'Category not found',
          'NOT_FOUND',
          404
        );
      }
      throw new PricingServiceError(
        `Failed to fetch category: ${error.message}`,
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
    if (error instanceof PricingServiceError) {
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
 * Update the price of a single category
 * @param id - Category UUID
 * @param price - New price per item
 * @returns Promise<PricingServiceResponse<LinenCategory>>
 */
export async function updateCategoryPrice(
  id: string,
  price: number
): Promise<PricingServiceResponse<LinenCategory>> {
  try {
    // Validate inputs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new PricingServiceError(
        'Invalid category ID format',
        'INVALID_ID',
        400
      );
    }

    if (typeof price !== 'number' || price < 0 || !isFinite(price)) {
      throw new PricingServiceError(
        'Price must be a valid positive number',
        'INVALID_PRICE',
        400
      );
    }

    // Round to 2 decimal places
    const roundedPrice = Math.round(price * 100) / 100;

    const updateData: LinenCategoryUpdate = {
      price_per_item: roundedPrice,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('linen_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new PricingServiceError(
          'Category not found',
          'NOT_FOUND',
          404
        );
      }
      throw new PricingServiceError(
        `Failed to update category price: ${error.message}`,
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
    if (error instanceof PricingServiceError) {
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
 * Bulk update pricing for multiple categories
 * @param updates - Array of category ID and price pairs
 * @returns Promise<PricingServiceResponse<BulkUpdateResult>>
 */
export async function bulkUpdatePricing(
  updates: PriceUpdateRequest[]
): Promise<PricingServiceResponse<BulkUpdateResult>> {
  try {
    // Validate input
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new PricingServiceError(
        'Updates array is required and must not be empty',
        'INVALID_INPUT',
        400
      );
    }

    if (updates.length > 100) {
      throw new PricingServiceError(
        'Cannot update more than 100 categories at once',
        'TOO_MANY_UPDATES',
        400
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const result: BulkUpdateResult = {
      updated: 0,
      failed: 0,
      errors: [],
    };

    // Process updates in batches to avoid overwhelming the database
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < updates.length; i += batchSize) {
      batches.push(updates.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (update) => {
        try {
          // Validate individual update
          if (!uuidRegex.test(update.id)) {
            throw new PricingServiceError(
              `Invalid category ID format: ${update.id}`,
              'INVALID_ID',
              400
            );
          }

          if (typeof update.price !== 'number' || update.price < 0 || !isFinite(update.price)) {
            throw new PricingServiceError(
              `Invalid price for category ${update.id}: ${update.price}`,
              'INVALID_PRICE',
              400
            );
          }

          // Round to 2 decimal places
          const roundedPrice = Math.round(update.price * 100) / 100;

          const updateData: LinenCategoryUpdate = {
            price_per_item: roundedPrice,
            updated_at: new Date().toISOString(),
          };

          const { error } = await supabaseAdmin
            .from('linen_categories')
            .update(updateData)
            .eq('id', update.id);

          if (error) {
            if (error.code === 'PGRST116') {
              throw new PricingServiceError(
                `Category not found: ${update.id}`,
                'NOT_FOUND',
                404
              );
            }
            throw new PricingServiceError(
              `Failed to update category ${update.id}: ${error.message}`,
              'UPDATE_ERROR',
              500
            );
          }

          result.updated++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            id: update.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      await Promise.all(batchPromises);
    }

    return {
      data: result,
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof PricingServiceError) {
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
 * Search categories by name
 * @param searchTerm - Search term for category name
 * @param includeInactive - Whether to include inactive categories
 * @returns Promise<PricingServiceResponse<LinenCategory[]>>
 */
export async function searchCategories(
  searchTerm: string,
  includeInactive: boolean = false
): Promise<PricingServiceResponse<LinenCategory[]>> {
  try {
    if (!searchTerm || searchTerm.trim().length === 0) {
      throw new PricingServiceError(
        'Search term is required',
        'INVALID_SEARCH',
        400
      );
    }

    let query = supabaseAdmin
      .from('linen_categories')
      .select('*')
      .ilike('name', `%${searchTerm.trim()}%`)
      .order('name', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      throw new PricingServiceError(
        `Failed to search categories: ${error.message}`,
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
    if (error instanceof PricingServiceError) {
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
 * Get category statistics
 * @param id - Category UUID (optional, if not provided returns stats for all categories)
 * @returns Promise<PricingServiceResponse<any>>
 */
export async function getCategoryStats(
  id?: string
): Promise<PricingServiceResponse<any>> {
  try {
    if (id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        throw new PricingServiceError(
          'Invalid category ID format',
          'INVALID_ID',
          400
        );
      }

      // Get stats for specific category using the database function
      const { data, error } = await supabaseAdmin
        .rpc('get_linen_category_stats', { category_uuid: id });

      if (error) {
        throw new PricingServiceError(
          `Failed to get category stats: ${error.message}`,
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

    // Get overall category statistics
    const { data, error } = await supabaseAdmin
      .from('linen_categories')
      .select('id, name, price_per_item, is_active')
      .eq('is_active', true);

    if (error) {
      throw new PricingServiceError(
        `Failed to get category stats: ${error.message}`,
        'STATS_ERROR',
        500
      );
    }

    const stats = {
      total_categories: data?.length || 0,
      active_categories: data?.filter(c => c.is_active).length || 0,
      average_price: data?.reduce((sum, c) => sum + c.price_per_item, 0) / (data?.length || 1) || 0,
      price_range: {
        min: Math.min(...(data?.map(c => c.price_per_item) || [0])),
        max: Math.max(...(data?.map(c => c.price_per_item) || [0])),
      },
    };

    return {
      data: stats,
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof PricingServiceError) {
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
