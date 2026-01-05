/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '@/lib/supabase';
import type { 
  Batch, 
  Client, 
  LinenCategory,
  BatchStatus,
  BatchItem
} from '@/types/database';

// Custom error class for batch details service errors
export class BatchDetailsServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'BatchDetailsServiceError';
  }
}

// Service response types
export interface BatchDetailsServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

// Extended batch details interface
export interface BatchDetails extends Batch {
  client: Client;
  items: BatchItemWithDetails[];
  financial_summary: {
    total_amount: number;
    total_items_sent: number;
    total_items_received: number;
    discrepancy_count: number;
    discrepancy_percentage: number;
    average_item_price: number;
  };
  status_history: Array<{
    status: BatchStatus;
    timestamp: string;
    notes?: string;
  }>;
  // Stage-specific notes
  washing_notes?: string | null;
  completed_notes?: string | null;
  delivery_notes?: string | null;
}

export interface BatchItemWithDetails extends BatchItem {
  category: LinenCategory;
  discrepancy: {
    quantity: number;
    percentage: number;
    value_impact: number;
  };
  pricing: {
    price_per_item: number;
    total_sent_value: number;
    total_received_value: number;
    discrepancy_value: number;
  };
}

export interface BatchUpdateData {
  status?: BatchStatus;
  notes?: string;
  pickup_date?: string;
  delivery_date?: string;
}

/**
 * Get complete batch details by ID
 * @param id - Batch ID
 * @returns Promise<BatchDetailsServiceResponse<BatchDetails>>
 */
export async function getBatchById(
  id: string
): Promise<BatchDetailsServiceResponse<BatchDetails>> {
  try {
    // Validate input
    if (!id || typeof id !== 'string') {
      throw new BatchDetailsServiceError(
        'Batch ID is required and must be a string',
        'INVALID_BATCH_ID',
        400
      );
    }

    // Get batch with client information
    const { data: batchData, error: batchError } = await supabaseAdmin
      .from('batches')
      .select(`
        *,
        clients (
          id,
          name,
          contact_number,
          email,
          address,
          is_active,
          created_at,
          updated_at
        )
      `)
      .eq('id', id)
      .single();

    if (batchError) {
      if (batchError.code === 'PGRST116') {
        throw new BatchDetailsServiceError(
          'Batch not found',
          'BATCH_NOT_FOUND',
          404
        );
      }
      throw new BatchDetailsServiceError(
        `Failed to fetch batch: ${batchError.message}`,
        'BATCH_FETCH_ERROR',
        500
      );
    }

    // Get batch items with category details
    const { data: itemsData, error: itemsError } = await supabaseAdmin
      .from('batch_items')
      .select(`
        *,
        linen_categories (
          id,
          name,
          price_per_item,
          is_active,
          created_at,
          updated_at
        )
      `)
      .eq('batch_id', id)
      .order('created_at', { ascending: true });

    if (itemsError) {
      throw new BatchDetailsServiceError(
        `Failed to fetch batch items: ${itemsError.message}`,
        'ITEMS_FETCH_ERROR',
        500
      );
    }

    // Transform items with detailed calculations
    const itemsWithDetails: BatchItemWithDetails[] = itemsData?.map((item: any) => {
      const category = item.linen_categories as LinenCategory;
      const quantityDiscrepancy = item.quantity_sent - item.quantity_received;
      const discrepancyPercentage = item.quantity_sent > 0 
        ? (quantityDiscrepancy / item.quantity_sent) * 100 
        : 0;
      const unitPrice = category?.price_per_item || 0;
      const totalSentValue = item.quantity_sent * unitPrice;
      const totalReceivedValue = item.quantity_received * unitPrice;
      const discrepancyValue = quantityDiscrepancy * unitPrice;

      return {
        ...item,
        category,
        discrepancy: {
          quantity: quantityDiscrepancy,
          percentage: discrepancyPercentage,
          value_impact: discrepancyValue
        },
        pricing: {
          price_per_item: unitPrice,
          total_sent_value: totalSentValue,
          total_received_value: totalReceivedValue,
          discrepancy_value: discrepancyValue
        }
      };
    }) || [];

    // Calculate financial summary (including express delivery surcharges AND discrepancy adjustments)
    // This must match the invoice calculation exactly:
    // 1. Subtotal (Received) = quantity_received * price
    // 2. Discrepancy Adjustment = (quantity_received - quantity_sent) * price
    // 3. Express Delivery = (lineTotal * 0.5) if express_delivery
    // 4. Total = Subtotal + Discrepancy Adjustment + Express Delivery
    const totalAmount = itemsWithDetails.reduce((sum, item) => {
      const baseAmount = item.pricing.total_received_value; // quantity_received * price
      // discrepancy_value is (sent - received) * price, but invoice uses (received - sent) * price
      // So we negate it to match invoice calculation
      const discrepancyAdjustment = -item.pricing.discrepancy_value;
      const surcharge = (item.express_delivery ? Math.round(baseAmount * 0.5 * 100) / 100 : 0);
      return Math.round((sum + baseAmount + discrepancyAdjustment + surcharge) * 100) / 100;
    }, 0);
    const totalItemsSent = itemsWithDetails.reduce((sum, item) => sum + item.quantity_sent, 0);
    const totalItemsReceived = itemsWithDetails.reduce((sum, item) => sum + item.quantity_received, 0);
    const discrepancyCount = itemsWithDetails.filter(item => item.discrepancy.quantity !== 0).length;
    const discrepancyPercentage = totalItemsSent > 0 
      ? ((totalItemsSent - totalItemsReceived) / totalItemsSent) * 100 
      : 0;
    const averageItemPrice = totalItemsSent > 0 ? totalAmount / totalItemsSent : 0;

    // Get status history (simplified - in a real app, you'd have a status_history table)
    const statusHistory = [
      {
        status: (batchData as any).status,
        timestamp: (batchData as any).updated_at || (batchData as any).created_at,
        notes: (batchData as any).notes || undefined
      }
    ];

    // Construct the complete batch details
    const batchDetails: BatchDetails = {
      ...(batchData as any),
      client: (batchData as any).clients as Client,
      items: itemsWithDetails,
      financial_summary: {
        total_amount: totalAmount,
        total_items_sent: totalItemsSent,
        total_items_received: totalItemsReceived,
        discrepancy_count: discrepancyCount,
        discrepancy_percentage: discrepancyPercentage,
        average_item_price: averageItemPrice
      },
      status_history: statusHistory
    };

    return {
      success: true,
      error: null,
      data: batchDetails
    };
  } catch (error) {
    if (error instanceof BatchDetailsServiceError) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }

    console.error('Unexpected error in getBatchById:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while fetching batch details',
      data: null
    };
  }
}

/**
 * Update batch status
 * @param id - Batch ID
 * @param status - New status
 * @param notes - Optional notes for the status change
 * @returns Promise<BatchDetailsServiceResponse<Batch>>
 */
export async function updateBatchStatus(
  id: string,
  status: BatchStatus,
  notes?: string
): Promise<BatchDetailsServiceResponse<Batch>> {
  try {
    // Validate inputs
    if (!id || typeof id !== 'string') {
      throw new BatchDetailsServiceError(
        'Batch ID is required and must be a string',
        'INVALID_BATCH_ID',
        400
      );
    }

    if (!status || typeof status !== 'string') {
      throw new BatchDetailsServiceError(
        'Status is required and must be a string',
        'INVALID_STATUS',
        400
      );
    }

    const validStatuses: BatchStatus[] = ['pickup', 'washing', 'completed', 'delivered'];
    if (!validStatuses.includes(status)) {
      throw new BatchDetailsServiceError(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        'INVALID_STATUS',
        400
      );
    }

    // Determine which notes column to update based on status
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    // Store notes in the appropriate stage column
    if (notes !== undefined) {
      if (status === 'washing') {
        updateData.washing_notes = notes.trim() || null;
      } else if (status === 'completed') {
        updateData.completed_notes = notes.trim() || null;
      } else if (status === 'delivered') {
        updateData.delivery_notes = notes.trim() || null;
      }
      // Also update the general notes field for backward compatibility
      updateData.notes = notes.trim() || null;
    }

    // Update the batch
    const { data, error } = await (supabaseAdmin as any)
      .from('batches')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new BatchDetailsServiceError(
          'Batch not found',
          'BATCH_NOT_FOUND',
          404
        );
      }
      throw new BatchDetailsServiceError(
        `Failed to update batch status: ${error.message}`,
        'BATCH_UPDATE_ERROR',
        500
      );
    }

    return {
      success: true,
      error: null,
      data
    };
  } catch (error) {
    if (error instanceof BatchDetailsServiceError) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }

    console.error('Unexpected error in updateBatchStatus:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while updating batch status',
      data: null
    };
  }
}

/**
 * Get all items for a batch with pricing details
 * @param batchId - Batch ID
 * @returns Promise<BatchDetailsServiceResponse<BatchItemWithDetails[]>>
 */
export async function getBatchItems(
  batchId: string
): Promise<BatchDetailsServiceResponse<BatchItemWithDetails[]>> {
  try {
    // Validate input
    if (!batchId || typeof batchId !== 'string') {
      throw new BatchDetailsServiceError(
        'Batch ID is required and must be a string',
        'INVALID_BATCH_ID',
        400
      );
    }

    // Get batch items with category details
    const { data, error } = await supabaseAdmin
      .from('batch_items')
      .select(`
        *,
        linen_categories (
          id,
          name,
          price_per_item,
          is_active,
          created_at,
          updated_at
        )
      `)
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new BatchDetailsServiceError(
        `Failed to fetch batch items: ${error.message}`,
        'ITEMS_FETCH_ERROR',
        500
      );
    }

    // Transform items with detailed calculations
    const itemsWithDetails: BatchItemWithDetails[] = data?.map((item: any) => {
      const category = item.linen_categories as LinenCategory;
      const quantityDiscrepancy = item.quantity_sent - item.quantity_received;
      const discrepancyPercentage = item.quantity_sent > 0 
        ? (quantityDiscrepancy / item.quantity_sent) * 100 
        : 0;
      const unitPrice = category?.price_per_item || 0;
      const totalSentValue = item.quantity_sent * unitPrice;
      const totalReceivedValue = item.quantity_received * unitPrice;
      const discrepancyValue = quantityDiscrepancy * unitPrice;

      return {
        ...item,
        category,
        discrepancy: {
          quantity: quantityDiscrepancy,
          percentage: discrepancyPercentage,
          value_impact: discrepancyValue
        },
        pricing: {
          price_per_item: unitPrice,
          total_sent_value: totalSentValue,
          total_received_value: totalReceivedValue,
          discrepancy_value: discrepancyValue
        }
      };
    }) || [];

    return {
      success: true,
      error: null,
      data: itemsWithDetails
    };
  } catch (error) {
    if (error instanceof BatchDetailsServiceError) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }

    console.error('Unexpected error in getBatchItems:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while fetching batch items',
      data: null
    };
  }
}

/**
 * Update batch notes
 * @param id - Batch ID
 * @param notes - New notes
 * @returns Promise<BatchDetailsServiceResponse<Batch>>
 */
export async function updateBatchNotes(
  id: string,
  notes: string
): Promise<BatchDetailsServiceResponse<Batch>> {
  try {
    // Validate inputs
    if (!id || typeof id !== 'string') {
      throw new BatchDetailsServiceError(
        'Batch ID is required and must be a string',
        'INVALID_BATCH_ID',
        400
      );
    }

    // Update the batch notes
    const { data, error } = await (supabaseAdmin as any)
      .from('batches')
      .update({
        notes: notes.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new BatchDetailsServiceError(
          'Batch not found',
          'BATCH_NOT_FOUND',
          404
        );
      }
      throw new BatchDetailsServiceError(
        `Failed to update batch notes: ${error.message}`,
        'BATCH_UPDATE_ERROR',
        500
      );
    }

    return {
      success: true,
      error: null,
      data
    };
  } catch (error) {
    if (error instanceof BatchDetailsServiceError) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }

    console.error('Unexpected error in updateBatchNotes:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while updating batch notes',
      data: null
    };
  }
}

/**
 * Update multiple batch fields
 * @param id - Batch ID
 * @param updateData - Data to update
 * @returns Promise<BatchDetailsServiceResponse<Batch>>
 */
export async function updateBatch(
  id: string,
  updateData: BatchUpdateData
): Promise<BatchDetailsServiceResponse<Batch>> {
  try {
    // Validate inputs
    if (!id || typeof id !== 'string') {
      throw new BatchDetailsServiceError(
        'Batch ID is required and must be a string',
        'INVALID_BATCH_ID',
        400
      );
    }

    if (!updateData || typeof updateData !== 'object') {
      throw new BatchDetailsServiceError(
        'Update data is required and must be an object',
        'INVALID_UPDATE_DATA',
        400
      );
    }

    // Validate status if provided
    if (updateData.status) {
      const validStatuses: BatchStatus[] = ['pickup', 'washing', 'completed', 'delivered'];
      if (!validStatuses.includes(updateData.status)) {
        throw new BatchDetailsServiceError(
          `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          'INVALID_STATUS',
          400
        );
      }
    }

    // Validate dates if provided
    if (updateData.pickup_date) {
      const pickupDate = new Date(updateData.pickup_date);
      if (isNaN(pickupDate.getTime())) {
        throw new BatchDetailsServiceError(
          'Invalid pickup date format',
          'INVALID_PICKUP_DATE',
          400
        );
      }
    }

    if (updateData.delivery_date) {
      const deliveryDate = new Date(updateData.delivery_date);
      if (isNaN(deliveryDate.getTime())) {
        throw new BatchDetailsServiceError(
          'Invalid delivery date format',
          'INVALID_DELIVERY_DATE',
          400
        );
      }
    }

    // Prepare update object
    const updateObject: Record<string, unknown> = {
      ...updateData,
      updated_at: new Date().toISOString()
    };

    // Handle notes - if status is being updated, store notes in appropriate stage column
    if ('notes' in updateData && updateData.notes !== undefined) {
      const notesValue = updateData.notes?.trim() || null;
      
      // If status is also being updated, store notes in stage-specific column
      if (updateData.status) {
        if (updateData.status === 'washing') {
          updateObject.washing_notes = notesValue;
        } else if (updateData.status === 'completed') {
          updateObject.completed_notes = notesValue;
        } else if (updateData.status === 'delivered') {
          updateObject.delivery_notes = notesValue;
        }
      }
      
      // Also update the general notes field for backward compatibility
      updateObject.notes = notesValue;
    } else if ('notes' in updateData) {
      // Handle empty/null notes
      updateObject.notes = null;
    }

    // Update the batch
    const { data, error } = await (supabaseAdmin as any)
      .from('batches')
      .update(updateObject)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new BatchDetailsServiceError(
          'Batch not found',
          'BATCH_NOT_FOUND',
          404
        );
      }
      throw new BatchDetailsServiceError(
        `Failed to update batch: ${error.message}`,
        'BATCH_UPDATE_ERROR',
        500
      );
    }

    return {
      success: true,
      error: null,
      data
    };
  } catch (error) {
    if (error instanceof BatchDetailsServiceError) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }

    console.error('Unexpected error in updateBatch:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while updating batch',
      data: null
    };
  }
}
