/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '@/lib/supabase';
import type { 
  Batch, 
  BatchItem, 
  BatchItemInsert,
  BatchStatus,
  LinenCategory,
  Client
} from '@/types/database';

// Custom error class for batch service errors
export class BatchServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'BatchServiceError';
  }
}

// Service response types
export interface BatchServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
  statusCode?: number;
}

// Request/response types
export interface BatchItemData {
  linen_category_id: string;
  quantity_sent: number;
  quantity_received?: number;
  price_per_item?: number;
  discrepancy_details?: string;
  express_delivery?: boolean;
}

export interface CreateBatchRequest {
  paper_batch_id?: string;
  client_id: string;
  pickup_date: string;
  status?: BatchStatus;
  notes?: string;
  items: BatchItemData[];
}

export interface UpdateBatchItemsRequest {
  items: BatchItemData[];
  notes?: string | null;
  pickup_date?: string;
}

export interface BatchWithDetails extends Batch {
  client: Client;
  items: (BatchItem & { linen_category: LinenCategory })[];
}

export interface BatchSearchFilters {
  client_id?: string;
  status?: BatchStatus;
  date_from?: string;
  date_to?: string;
  has_discrepancy?: boolean;
  search_text?: string;
  page?: number;
  page_size?: number;
}

/**
 * Generate a system batch ID in RSL-YYYY-XXXXXX format
 * @returns Promise<string> - Generated system batch ID
 */
export async function generateSystemBatchId(): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('generate_system_batch_id');

    if (error) {
      throw new BatchServiceError(
        `Failed to generate system batch ID: ${error.message}`,
        'GENERATE_ID_ERROR',
        500
      );
    }

    return data;
  } catch (error) {
    if (error instanceof BatchServiceError) {
      throw error;
    }
    throw new BatchServiceError(
      `Unexpected error generating system batch ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'GENERATE_ID_ERROR',
      500
    );
  }
}

/**
 * Validate batch data before creation
 * @param batchData - Batch data to validate
 * @returns Promise<{ isValid: boolean; errors: string[] }>
 */
export async function validateBatchData(batchData: CreateBatchRequest): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Validate paper_batch_id (optional)
  if (batchData.paper_batch_id !== undefined) {
    if (batchData.paper_batch_id.trim().length === 0) {
      // allow empty string; will be generated
    } else if (batchData.paper_batch_id.length > 50) {
      errors.push('Paper batch ID must be 50 characters or less');
    }
  }

  // Validate client_id
  if (!batchData.client_id || batchData.client_id.trim().length === 0) {
    errors.push('Client ID is required');
  } else {
    // Check if client exists
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(batchData.client_id)) {
      errors.push('Invalid client ID format');
    } else {
      const { data: client, error: clientError } = await supabaseAdmin
        .from('clients')
        .select('id, is_active')
        .eq('id', batchData.client_id)
        .single();

      if (clientError || !client) {
        errors.push('Client not found');
      } else if (!(client as any).is_active) {
        errors.push('Client is inactive');
      }
    }
  }

  // Validate pickup_date
  if (!batchData.pickup_date) {
    errors.push('Pickup date is required');
  } else {
    const pickupDate = new Date(batchData.pickup_date);
    if (isNaN(pickupDate.getTime())) {
      errors.push('Invalid pickup date format');
    }
    // Past dates are allowed - removed validation restriction
  }

  // Validate status
  if (batchData.status && !['pickup', 'washing', 'completed', 'delivered'].includes(batchData.status)) {
    errors.push('Invalid batch status');
  }

  // Validate notes
  if (batchData.notes && batchData.notes.length > 1000) {
    errors.push('Notes must be 1000 characters or less');
  }

  // Validate items
  if (!batchData.items || !Array.isArray(batchData.items) || batchData.items.length === 0) {
    errors.push('At least one item is required');
  } else {
    // Check for duplicate categories
    const categoryIds = batchData.items.map(item => item.linen_category_id);
    const uniqueCategoryIds = new Set(categoryIds);
    if (categoryIds.length !== uniqueCategoryIds.size) {
      errors.push('Duplicate linen categories are not allowed');
    }

    // Validate each item
    for (let i = 0; i < batchData.items.length; i++) {
      const item = batchData.items[i];
      const itemPrefix = `Item ${i + 1}:`;

      // Validate linen_category_id
      if (!item.linen_category_id || item.linen_category_id.trim().length === 0) {
        errors.push(`${itemPrefix} Linen category ID is required`);
      } else {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(item.linen_category_id)) {
          errors.push(`${itemPrefix} Invalid linen category ID format`);
        } else {
          // Check if category exists
          const { data: category, error: categoryError } = await supabaseAdmin
            .from('linen_categories')
            .select('id, is_active')
            .eq('id', item.linen_category_id)
            .single();

          if (categoryError || !category) {
            errors.push(`${itemPrefix} Linen category not found`);
          } else if (!(category as any).is_active) {
            errors.push(`${itemPrefix} Linen category is inactive`);
          }
        }
      }

      // Validate quantity_sent
      if (typeof item.quantity_sent !== 'number' || item.quantity_sent < 0 || !Number.isInteger(item.quantity_sent)) {
        errors.push(`${itemPrefix} Quantity sent must be a non-negative integer`);
      } else if (item.quantity_sent > 10000) {
        errors.push(`${itemPrefix} Quantity sent cannot exceed 10,000`);
      }

      // Validate quantity_received (optional)
      if (item.quantity_received !== undefined) {
        if (typeof item.quantity_received !== 'number' || item.quantity_received < 0 || !Number.isInteger(item.quantity_received)) {
          errors.push(`${itemPrefix} Quantity received must be a non-negative integer`);
        } else if (item.quantity_received > 10000) {
          errors.push(`${itemPrefix} Quantity received cannot exceed 10,000`);
        }
      }

      // Validate price_per_item (optional)
      if (item.price_per_item !== undefined) {
        if (typeof item.price_per_item !== 'number' || item.price_per_item < 0) {
          errors.push(`${itemPrefix} Price per item must be a non-negative number`);
        } else if (item.price_per_item > 1000) {
          errors.push(`${itemPrefix} Price per item cannot exceed R1000`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculate batch total amount from items
 * @param items - Array of batch items
 * @returns Promise<number> - Total amount
 */
export async function calculateBatchTotal(items: BatchItemData[]): Promise<number> {
  try {
    let total = 0;

    for (const item of items) {
      const quantity = item.quantity_received !== undefined ? item.quantity_received : item.quantity_sent;
      
      let price = item.price_per_item;
      if (price === undefined) {
        // Get price from category if not provided
        const { data: category, error } = await supabaseAdmin
          .from('linen_categories')
          .select('price_per_item')
          .eq('id', item.linen_category_id)
          .single();

        if (error || !category) {
          throw new BatchServiceError(
            `Failed to get price for category ${item.linen_category_id}`,
            'PRICE_LOOKUP_ERROR',
            500
          );
        }

        price = (category as any).price_per_item;
      }

      total += quantity * (price || 0);
    }

    return Math.round(total * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    if (error instanceof BatchServiceError) {
      throw error;
    }
    throw new BatchServiceError(
      `Unexpected error calculating batch total: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'CALCULATE_TOTAL_ERROR',
      500
    );
  }
}

interface PreparedBatchItem {
  linen_category_id: string;
  quantity_sent: number;
  quantity_received: number;
  price_per_item: number;
  discrepancy_details?: string | null;
  express_delivery?: boolean;
}

/**
 * Update the items that belong to an existing batch
 * @param batchId - Batch UUID
 * @param payload - Items payload
 * @returns Promise<BatchServiceResponse<{ batch: Batch; items: BatchItem[] }>>
 */
export async function updateBatchItems(
  batchId: string,
  payload: UpdateBatchItemsRequest
): Promise<BatchServiceResponse<{ batch: Batch; items: BatchItem[] }>> {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(batchId)) {
      throw new BatchServiceError(
        'Invalid batch ID format',
        'INVALID_ID',
        400
      );
    }

    if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
      throw new BatchServiceError(
        'At least one item is required to amend a batch',
        'INVALID_ITEMS',
        400
      );
    }

    const errors: string[] = [];
    const seenCategories = new Set<string>();

    payload.items.forEach((item, index) => {
      const prefix = `Item ${index + 1}:`;

      if (!item.linen_category_id || item.linen_category_id.trim().length === 0) {
        errors.push(`${prefix} Linen category ID is required`);
      } else if (seenCategories.has(item.linen_category_id)) {
        errors.push(`${prefix} Duplicate linen category detected`);
      } else {
        seenCategories.add(item.linen_category_id);
      }

      if (typeof item.quantity_sent !== 'number' || item.quantity_sent < 0 || !Number.isInteger(item.quantity_sent)) {
        errors.push(`${prefix} Quantity sent must be a non-negative integer`);
      } else if (item.quantity_sent > 10000) {
        errors.push(`${prefix} Quantity sent cannot exceed 10,000`);
      }

      if (item.quantity_received !== undefined) {
        if (typeof item.quantity_received !== 'number' || item.quantity_received < 0 || !Number.isInteger(item.quantity_received)) {
          errors.push(`${prefix} Quantity received must be a non-negative integer`);
        } else if (item.quantity_received > 10000) {
          errors.push(`${prefix} Quantity received cannot exceed 10,000`);
        }
      }

      if (item.price_per_item !== undefined) {
        if (typeof item.price_per_item !== 'number' || item.price_per_item < 0) {
          errors.push(`${prefix} Price per item must be a non-negative number`);
        } else if (item.price_per_item > 1000) {
          errors.push(`${prefix} Price per item cannot exceed R1000`);
        }
      }
    });

    if (errors.length > 0) {
      throw new BatchServiceError(
        `Validation failed: ${errors.join(', ')}`,
        'VALIDATION_ERROR',
        400
      );
    }

    const uniqueCategoryIds = Array.from(seenCategories);
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from('linen_categories')
      .select('id, price_per_item, is_active')
      .in('id', uniqueCategoryIds);

    if (categoriesError) {
      throw new BatchServiceError(
        `Failed to load linen categories: ${categoriesError.message}`,
        'CATEGORY_LOOKUP_ERROR',
        500
      );
    }

    if (!categories || categories.length !== uniqueCategoryIds.length) {
      throw new BatchServiceError(
        'One or more linen categories could not be found',
        'CATEGORY_NOT_FOUND',
        400
      );
    }

    const categoryMap = new Map<string, { price_per_item: number; is_active: boolean }>();
    categories.forEach((category: any) => {
      categoryMap.set(category.id, {
        price_per_item: category.price_per_item,
        is_active: category.is_active,
      });
    });

    for (const categoryId of uniqueCategoryIds) {
      const category = categoryMap.get(categoryId);
      if (!category) {
        throw new BatchServiceError(
          `Linen category ${categoryId} does not exist`,
          'CATEGORY_NOT_FOUND',
          400
        );
      }

      if (!category.is_active) {
        throw new BatchServiceError(
          `Linen category ${categoryId} is inactive`,
          'CATEGORY_INACTIVE',
          400
        );
      }
    }

    const preparedItems: PreparedBatchItem[] = payload.items.map((item) => {
      const category = categoryMap.get(item.linen_category_id);
      const pricePerItem = item.price_per_item ?? category?.price_per_item ?? 0;
      const quantityReceived = item.quantity_received !== undefined ? item.quantity_received : item.quantity_sent;

      return {
        linen_category_id: item.linen_category_id,
        quantity_sent: item.quantity_sent,
        quantity_received: quantityReceived,
        price_per_item: pricePerItem,
        discrepancy_details: item.discrepancy_details || null,
        express_delivery: item.express_delivery || false,
      };
    });

    const totalAmount = preparedItems.reduce((sum, item) => {
      return sum + item.quantity_received * item.price_per_item;
    }, 0);
    const hasDiscrepancy = preparedItems.some(
      (item) => item.quantity_sent !== item.quantity_received
    );

    // Ensure batch exists
    const { data: existingBatch, error: batchError } = await supabaseAdmin
      .from('batches')
      .select('id, notes')
      .eq('id', batchId)
      .single();

    if (batchError || !existingBatch) {
      throw new BatchServiceError(
        'Batch not found',
        'NOT_FOUND',
        404
      );
    }

    const { data: existingItems, error: existingItemsError } = await supabaseAdmin
      .from('batch_items')
      .select('id, linen_category_id')
      .eq('batch_id', batchId);

    if (existingItemsError) {
      throw new BatchServiceError(
        `Failed to load existing batch items: ${existingItemsError.message}`,
        'ITEMS_FETCH_ERROR',
        500
      );
    }

    const existingItemsMap = new Map<string, { id: string }>();
    (existingItems || []).forEach((item) => {
      existingItemsMap.set(item.linen_category_id, { id: item.id });
    });

    // Separate items into updates (existing) and inserts (new)
    const itemsToUpdate: Array<{
      id: string;
      batch_id: string;
      linen_category_id: string;
      quantity_sent: number;
      quantity_received: number;
      price_per_item: number;
      discrepancy_details: string | null;
      subtotal: number;
    }> = [];
    const itemsToInsert: Array<{
      batch_id: string;
      linen_category_id: string;
      quantity_sent: number;
      quantity_received: number;
      price_per_item: number;
      discrepancy_details: string | null;
      subtotal: number;
    }> = [];

    preparedItems.forEach((item) => {
      const existing = existingItemsMap.get(item.linen_category_id);
      const itemData = {
        batch_id: batchId,
        linen_category_id: item.linen_category_id,
        quantity_sent: item.quantity_sent,
        quantity_received: item.quantity_received,
        price_per_item: item.price_per_item,
        discrepancy_details: item.discrepancy_details || null,
        express_delivery: item.express_delivery || false,
        subtotal: item.quantity_received * item.price_per_item,
      };

      if (existing) {
        itemsToUpdate.push({ ...itemData, id: existing.id });
      } else {
        itemsToInsert.push(itemData);
      }
    });

    // Update existing items
    if (itemsToUpdate.length > 0) {
      for (const item of itemsToUpdate) {
        const { id, ...updateData } = item;
        const { error: updateError } = await supabaseAdmin
          .from('batch_items')
          .update(updateData)
          .eq('id', id);

        if (updateError) {
          throw new BatchServiceError(
            `Failed to update batch items: ${updateError.message}`,
            'ITEMS_UPDATE_ERROR',
            500
          );
        }
      }
    }

    // Insert new items
    if (itemsToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('batch_items')
        .insert(itemsToInsert);

      if (insertError) {
        throw new BatchServiceError(
          `Failed to insert batch items: ${insertError.message}`,
          'ITEMS_INSERT_ERROR',
          500
        );
      }
    }

    const newCategoryIds = new Set(preparedItems.map((item) => item.linen_category_id));
    const idsToDelete =
      existingItems
        ?.filter((item) => !newCategoryIds.has(item.linen_category_id))
        .map((item) => item.id) || [];

    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from('batch_items')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        throw new BatchServiceError(
          `Failed to remove old batch items: ${deleteError.message}`,
          'ITEMS_DELETE_ERROR',
          500
        );
      }
    }

    const batchUpdatePayload: Record<string, unknown> = {
      total_amount: Math.round(totalAmount * 100) / 100,
      has_discrepancy: hasDiscrepancy,
      updated_at: new Date().toISOString(),
    };

    if (payload.notes !== undefined) {
      batchUpdatePayload.notes = payload.notes?.trim() || null;
    }

    if (payload.pickup_date !== undefined) {
      batchUpdatePayload.pickup_date = payload.pickup_date;
    }

    const { data: updatedBatch, error: batchUpdateError } = await (supabaseAdmin as any)
      .from('batches')
      .update(batchUpdatePayload)
      .eq('id', batchId)
      .select()
      .single();

    if (batchUpdateError) {
      throw new BatchServiceError(
        `Failed to update batch totals: ${batchUpdateError.message}`,
        'BATCH_UPDATE_ERROR',
        500
      );
    }

    const { data: refreshedItems, error: refreshedItemsError } = await supabaseAdmin
      .from('batch_items')
      .select(`
        *,
        linen_category:linen_categories(id, name, price_per_item, is_active, created_at, updated_at)
      `)
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true });

    if (refreshedItemsError) {
      throw new BatchServiceError(
        `Failed to fetch updated batch items: ${refreshedItemsError.message}`,
        'ITEMS_FETCH_ERROR',
        500
      );
    }

    return {
      data: {
        batch: updatedBatch as Batch,
        items: (refreshedItems as BatchItem[]) || [],
      },
      error: null,
      success: true,
      statusCode: 200,
    };
  } catch (error) {
    if (error instanceof BatchServiceError) {
      return {
        data: null,
        error: error.message,
        success: false,
        statusCode: error.statusCode,
      };
    }

    return {
      data: null,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false,
      statusCode: 500,
    };
  }
}

/**
 * Create a new batch with items
 * @param batchData - Batch data including items
 * @returns Promise<BatchServiceResponse<BatchWithDetails>>
 */
export async function createBatch(batchData: CreateBatchRequest): Promise<BatchServiceResponse<BatchWithDetails>> {
  try {
    // Validate batch data
    const validation = await validateBatchData(batchData);
    if (!validation.isValid) {
      throw new BatchServiceError(
        `Validation failed: ${validation.errors.join(', ')}`,
        'VALIDATION_ERROR',
        400
      );
    }

    // If a paper_batch_id is provided, ensure it's unique; otherwise let DB trigger generate it
    const trimmedPaperId = typeof batchData.paper_batch_id === 'string' ? batchData.paper_batch_id.trim() : undefined;
    if (trimmedPaperId) {
      const { data: existingBatch, error: checkError } = await supabaseAdmin
        .from('batches')
        .select('id')
        .eq('paper_batch_id', trimmedPaperId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new BatchServiceError(
          `Failed to check existing batch: ${checkError.message}`,
          'CHECK_EXISTING_ERROR',
          500
        );
      }

      if (existingBatch) {
        throw new BatchServiceError(
          'Paper batch ID already exists',
          'DUPLICATE_BATCH_ID',
          409
        );
      }
    }

    // Calculate total amount
    const totalAmount = await calculateBatchTotal(batchData.items);

    // Start transaction by creating batch first (omit paper_batch_id if auto-generating)
    const batchInsert: any = {
      ...(trimmedPaperId ? { paper_batch_id: trimmedPaperId } : {}),
      client_id: batchData.client_id,
      pickup_date: batchData.pickup_date,
      status: batchData.status || 'pickup',
      total_amount: totalAmount,
      notes: batchData.notes || null,
    };

    // Insert with simple retry if unique violation occurs on auto-generated paper_batch_id
    let newBatch: any = null;
    let batchError: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await (supabaseAdmin as any)
        .from('batches')
        .insert(batchInsert)
        .select()
        .single();

      if (!error) {
        newBatch = data;
        batchError = null;
        break;
      }

      // If duplicate key on paper_batch_id and we didn't provide a custom ID, retry
      const isDuplicate = error.code === '23505' || (typeof error.message === 'string' && error.message.includes('duplicate key value'));
      const usedCustomId = !!trimmedPaperId;
      if (isDuplicate && !usedCustomId) {
        // Let the next attempt try again; DB trigger will pick next sequence value
        continue;
      } else {
        batchError = error;
        break;
      }
    }

    if (batchError) {
      throw new BatchServiceError(
        `Failed to create batch: ${batchError.message}`,
        'CREATE_BATCH_ERROR',
        500
      );
    }

    // Create batch items
    const batchItems: BatchItemInsert[] = [];
    
    for (const item of batchData.items) {
      let price = item.price_per_item;
      if (price === undefined) {
        // Get price from category
        const { data: category, error: categoryError } = await supabaseAdmin
          .from('linen_categories')
          .select('price_per_item')
          .eq('id', item.linen_category_id)
          .single();

        if (categoryError || !category) {
          throw new BatchServiceError(
            `Failed to get price for category ${item.linen_category_id}`,
            'PRICE_LOOKUP_ERROR',
            500
          );
        }

        price = (category as any).price_per_item;
      }

      const quantityReceived = item.quantity_received !== undefined ? item.quantity_received : item.quantity_sent;

      batchItems.push({
        batch_id: newBatch.id,
        linen_category_id: item.linen_category_id,
        quantity_sent: item.quantity_sent,
        quantity_received: quantityReceived,
        price_per_item: price,
        discrepancy_details: item.discrepancy_details || null,
      });
    }

    const { error: itemsError } = await (supabaseAdmin as any)
      .from('batch_items')
      .insert(batchItems)
      .select(`
        *,
        linen_category:linen_categories(id, name, price_per_item, is_active, created_at, updated_at)
      `);

    if (itemsError) {
      // If items creation fails, we should clean up the batch
      await supabaseAdmin
        .from('batches')
        .delete()
        .eq('id', newBatch.id);

      throw new BatchServiceError(
        `Failed to create batch items: ${itemsError.message}`,
        'CREATE_ITEMS_ERROR',
        500
      );
    }

    // Get the complete batch with client and items
    const { data: completeBatch, error: fetchError } = await supabaseAdmin
      .from('batches')
      .select(`
        *,
        client:clients(*),
        items:batch_items(
          *,
          linen_category:linen_categories(id, name, price_per_item, is_active, created_at, updated_at)
        )
      `)
      .eq('id', newBatch.id)
      .single();

    if (fetchError) {
      throw new BatchServiceError(
        `Failed to fetch complete batch: ${fetchError.message}`,
        'FETCH_BATCH_ERROR',
        500
      );
    }

    return {
      data: completeBatch as unknown as BatchWithDetails,
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof BatchServiceError) {
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
 * Get batches with pagination and filtering
 * @param filters - Search and filter options
 * @returns Promise<BatchServiceResponse<{ batches: BatchWithDetails[]; total: number; page: number; pageSize: number }>>
 */
export async function getBatches(filters: BatchSearchFilters = {}): Promise<BatchServiceResponse<{ batches: BatchWithDetails[]; total: number; page: number; pageSize: number }>> {
  try {
    const page = filters.page || 1;
    const pageSize = Math.min(filters.page_size || 20, 100); // Max 100 items per page
    const offset = (page - 1) * pageSize;

    let query = supabaseAdmin
      .from('batches')
      .select(`
        *,
        client:clients(*),
        items:batch_items(
          *,
          linen_category:linen_categories(id, name, price_per_item, is_active, created_at, updated_at)
        )
      `, { count: 'exact' });

    // Apply filters
    if (filters.client_id) {
      query = query.eq('client_id', filters.client_id);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.date_from) {
      query = query.gte('pickup_date', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('pickup_date', filters.date_to);
    }

    if (filters.has_discrepancy !== undefined) {
      query = query.eq('has_discrepancy', filters.has_discrepancy);
    }

    if (filters.search_text) {
      query = query.or(`paper_batch_id.ilike.%${filters.search_text}%,system_batch_id.ilike.%${filters.search_text}%,notes.ilike.%${filters.search_text}%`);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new BatchServiceError(
        `Failed to fetch batches: ${error.message}`,
        'FETCH_BATCHES_ERROR',
        500
      );
    }

    return {
      data: {
        batches: ((data as unknown) as BatchWithDetails[]) || [],
        total: count || 0,
        page,
        pageSize,
      },
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof BatchServiceError) {
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
 * Get a single batch by ID with full details
 * @param id - Batch UUID
 * @returns Promise<BatchServiceResponse<BatchWithDetails>>
 */
export async function getBatchById(id: string): Promise<BatchServiceResponse<BatchWithDetails>> {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new BatchServiceError(
        'Invalid batch ID format',
        'INVALID_ID',
        400
      );
    }

    const { data, error } = await supabaseAdmin
      .from('batches')
      .select(`
        *,
        client:clients(*),
        items:batch_items(
          *,
          linen_category:linen_categories(id, name, price_per_item, is_active, created_at, updated_at)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new BatchServiceError(
          'Batch not found',
          'NOT_FOUND',
          404
        );
      }
      throw new BatchServiceError(
        `Failed to fetch batch: ${error.message}`,
        'FETCH_BATCH_ERROR',
        500
      );
    }

    return {
      data: data as unknown as BatchWithDetails,
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof BatchServiceError) {
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
