/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '@/lib/supabase';
import type {
  Batch,
  Client,
  BatchStatus
} from '@/types/database';

type BatchWithItems = Batch & {
  batch_items: Array<{
    quantity_sent: number;
    quantity_received: number;
    price_per_item: number;
    express_delivery: boolean;
  }> | null;
  clients: Client | null;
};

// Custom error class for query errors
export class QueryError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'QueryError';
  }
}

// Query result types
export interface QueryResult<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

// Filter interfaces
export interface BatchFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: BatchStatus | BatchStatus[];
  clientId?: string;
  hasDiscrepancy?: boolean;
  searchTerm?: string;
}

export interface RevenueFilters {
  dateFrom?: string;
  dateTo?: string;
  clientId?: string;
  groupBy?: 'day' | 'week' | 'month' | 'year';
}

export interface DiscrepancyFilters {
  dateFrom?: string;
  dateTo?: string;
  threshold?: number; // Percentage threshold for significant discrepancies
  clientId?: string;
}

// Result interfaces
export interface BatchQueryResult extends Batch {
  client: Client;
  item_count: number;
  total_amount: number;
  has_discrepancy: boolean;
  discrepancy_percentage: number;
}

export interface RevenueResult {
  period: string;
  total_revenue: number;
  batch_count: number;
  average_batch_value: number;
  client_count: number;
}

export interface DiscrepancyReport {
  batch_id: string;
  paper_batch_id: string;
  client_name: string;
  pickup_date: string;
  total_items: number;
  discrepancy_count: number;
  discrepancy_percentage: number;
  total_value_impact: number;
  items_with_discrepancy: Array<{
    category_name: string;
    quantity_sent: number;
    quantity_received: number;
    discrepancy: number;
    discrepancy_percentage: number;
  }>;
}

export interface ClientPerformanceMetrics {
  client_id: string;
  client_name: string;
  total_batches: number;
  total_revenue: number;
  average_batch_value: number;
  total_items_processed: number;
  discrepancy_rate: number;
  last_pickup_date: string;
  performance_score: number; // 0-100 score based on various metrics
}

/**
 * Build complex batch queries with filters
 * @param filters - Filter options
 * @param options - Query options (limit, offset, orderBy)
 * @returns Promise<QueryResult<BatchQueryResult[]>>
 */
export async function getBatchesWithFilters(
  filters: BatchFilters = {},
  options: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    ascending?: boolean;
  } = {}
): Promise<QueryResult<BatchQueryResult[]>> {
  try {
    const { limit = 50, offset = 0, orderBy = 'created_at', ascending = false } = options;

    // Start building the query
    let query = supabaseAdmin
      .from('batches')
      .select(`
        *,
        clients (
          id,
          name,
          contact_number,
          email,
          address,
          is_active
        ),
        batch_items (
          quantity_sent,
          quantity_received,
          price_per_item,
          express_delivery
        )
      `);

    // Apply date filters
    if (filters.dateFrom) {
      query = query.gte('pickup_date', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('pickup_date', filters.dateTo);
    }

    // Apply status filter
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    // Apply client filter
    if (filters.clientId) {
      query = query.eq('client_id', filters.clientId);
    }

    // Apply search filter (search in paper_batch_id or client name)
    if (filters.searchTerm) {
      const searchTerm = `%${filters.searchTerm.toLowerCase()}%`;
      query = query.or(`paper_batch_id.ilike.${searchTerm},clients.name.ilike.${searchTerm}`);
    }

    // Apply pagination and ordering
    query = query
      .range(offset, offset + limit - 1)
      .order(orderBy, { ascending });

    const { data, error } = await query;

    if (error) {
      throw new QueryError(
        `Failed to fetch batches: ${error.message}`,
        'BATCH_QUERY_ERROR',
        500
      );
    }

    // Process and enrich the data
    const enrichedData: BatchQueryResult[] = (data || []).map(batch => {
      const typedBatch = batch as unknown as BatchWithItems;
      const { batch_items, clients, ...batchRest } = typedBatch;
      const items = batch_items || [];
      const totalItems = items.reduce((sum: number, item) => sum + item.quantity_sent, 0);
      // Calculate total amount including express delivery surcharges (50% of base amount)
      const totalAmount = items.reduce((sum: number, item) => {
        const baseAmount = item.quantity_sent * item.price_per_item;
        const surcharge = (item.express_delivery ? baseAmount * 0.5 : 0);
        return sum + baseAmount + surcharge;
      }, 0);
      
      const discrepancies = items.filter((item) => 
        item.quantity_sent !== item.quantity_received).length;
      const discrepancyPercentage = totalItems > 0 ? (discrepancies / items.length) * 100 : 0;
      return {
        ...(batchRest as Batch),
        client: clients as Client,
        item_count: items.length,
        total_amount: totalAmount,
        has_discrepancy: discrepancies > 0,
        discrepancy_percentage: discrepancyPercentage
      };
    });

    // Apply discrepancy filter after processing
    let filteredData = enrichedData;
    if (filters.hasDiscrepancy !== undefined) {
      filteredData = enrichedData.filter(batch => 
        batch.has_discrepancy === filters.hasDiscrepancy);
    }

    return {
      success: true,
      error: null,
      data: filteredData
    };
  } catch (error) {
    if (error instanceof QueryError) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }

    console.error('Unexpected error in getBatchesWithFilters:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while fetching batches',
      data: null
    };
  }
}

/**
 * Calculate revenue with grouping and filters
 * @param filters - Revenue filter options
 * @returns Promise<QueryResult<RevenueResult[]>>
 */
export async function getRevenueAnalysis(
  filters: RevenueFilters = {}
): Promise<QueryResult<RevenueResult[]>> {
  try {
    const { dateFrom, dateTo, clientId, groupBy = 'month' } = filters;

    // Build base query for batches
    let query = supabaseAdmin
      .from('batches')
      .select(`
        pickup_date,
        total_amount,
        client_id,
        clients (name),
        batch_items (
          quantity_sent,
          price_per_item,
          express_delivery
        )
      `)
      .eq('status', 'completed'); // Only completed batches for revenue

    // Apply filters
    if (dateFrom) {
      query = query.gte('pickup_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('pickup_date', dateTo);
    }
    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) {
      throw new QueryError(
        `Failed to fetch revenue data: ${error.message}`,
        'REVENUE_QUERY_ERROR',
        500
      );
    }

    // Group data by period
    const groupedData = new Map<string, RevenueResult>();

    (data || []).forEach((batch) => {
      const typedBatch = batch as unknown as {
        pickup_date: string;
        client_id: string;
        batch_items: Array<{
          quantity_sent: number;
          price_per_item: number;
          express_delivery: boolean;
        }> | null;
      };
      const { pickup_date, client_id, batch_items } = typedBatch;
      // Recalculate total_amount including express delivery surcharges
      const items = batch_items || [];
      const total_amount = items.reduce((sum: number, item: any) => {
        const baseAmount = item.quantity_sent * (item.price_per_item || 0);
        const surcharge = (item.express_delivery ? baseAmount * 0.5 : 0);
        return sum + baseAmount + surcharge;
      }, 0);
      const date = new Date(pickup_date);
      let period: string;

      switch (groupBy) {
        case 'day':
          period = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          period = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'year':
          period = date.getFullYear().toString();
          break;
        default:
          period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!groupedData.has(period)) {
        groupedData.set(period, {
          period,
          total_revenue: 0,
          batch_count: 0,
          average_batch_value: 0,
          client_count: 0
        });
      }

      const existing = groupedData.get(period)!;
      existing.total_revenue += total_amount || 0;
      existing.batch_count += 1;
      existing.client_count = new Set([
        ...(existing as any).clients || [],
        client_id
      ]).size;
      (existing as any).clients = [...((existing as any).clients || []), client_id];
    });

    // Calculate averages and clean up
    const results: RevenueResult[] = Array.from(groupedData.values()).map(result => {
      const cleanResult = { ...result };
      cleanResult.average_batch_value = cleanResult.batch_count > 0 
        ? cleanResult.total_revenue / cleanResult.batch_count 
        : 0;
      delete (cleanResult as any).clients;
      return cleanResult;
    });

    // Sort by period
    results.sort((a, b) => a.period.localeCompare(b.period));

    return {
      success: true,
      error: null,
      data: results
    };
  } catch (error) {
    if (error instanceof QueryError) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }

    console.error('Unexpected error in getRevenueAnalysis:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while calculating revenue',
      data: null
    };
  }
}

/**
 * Generate discrepancy reports with detailed analysis
 * @param filters - Discrepancy filter options
 * @returns Promise<QueryResult<DiscrepancyReport[]>>
 */
export async function getDiscrepancyReport(
  filters: DiscrepancyFilters = {}
): Promise<QueryResult<DiscrepancyReport[]>> {
  try {
    const { dateFrom, dateTo, threshold = 5, clientId } = filters;

    // Build query for batches with items
    let query = supabaseAdmin
      .from('batches')
      .select(`
        id,
        paper_batch_id,
        pickup_date,
        client_id,
        clients (name),
        batch_items (
          quantity_sent,
          quantity_received,
          linen_categories (name)
        )
      `);

    // Apply filters
    if (dateFrom) {
      query = query.gte('pickup_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('pickup_date', dateTo);
    }
    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) {
      throw new QueryError(
        `Failed to fetch discrepancy data: ${error.message}`,
        'DISCREPANCY_QUERY_ERROR',
        500
      );
    }

    // Process data and identify discrepancies
    const reports: DiscrepancyReport[] = [];

    (data || []).forEach((batch: any) => {
      const items = batch.batch_items || [];
      const itemsWithDiscrepancy = items
        .map((item: any) => {
          const discrepancy = item.quantity_sent - item.quantity_received;
          const discrepancyPercentage = item.quantity_sent > 0 
            ? Math.abs(discrepancy) / item.quantity_sent * 100 
            : 0;

          return {
            category_name: item.linen_categories?.name || 'Unknown',
            quantity_sent: item.quantity_sent,
            quantity_received: item.quantity_received,
            discrepancy,
            discrepancy_percentage: discrepancyPercentage
          };
        })
        .filter((item: any) => item.discrepancy !== 0);

      if (itemsWithDiscrepancy.length > 0) {
        const totalItems = items.reduce((sum: number, item: any) => sum + item.quantity_sent, 0);
        const discrepancyCount = itemsWithDiscrepancy.length;
        const discrepancyPercentage = totalItems > 0 
          ? (discrepancyCount / items.length) * 100 
          : 0;

        // Apply threshold filter
        if (discrepancyPercentage >= threshold) {
          const totalValueImpact = itemsWithDiscrepancy.reduce((sum: number, item: any) => 
            sum + Math.abs(item.discrepancy), 0);

          reports.push({
            batch_id: batch.id,
            paper_batch_id: batch.paper_batch_id,
            client_name: batch.clients?.name || 'Unknown',
            pickup_date: batch.pickup_date,
            total_items: totalItems,
            discrepancy_count: discrepancyCount,
            discrepancy_percentage: discrepancyPercentage,
            total_value_impact: totalValueImpact,
            items_with_discrepancy: itemsWithDiscrepancy
          });
        }
      }
    });

    // Sort by discrepancy percentage (highest first)
    reports.sort((a, b) => b.discrepancy_percentage - a.discrepancy_percentage);

    return {
      success: true,
      error: null,
      data: reports
    };
  } catch (error) {
    if (error instanceof QueryError) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }

    console.error('Unexpected error in getDiscrepancyReport:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while generating discrepancy report',
      data: null
    };
  }
}

/**
 * Calculate client performance metrics
 * @param dateFrom - Start date for analysis
 * @param dateTo - End date for analysis
 * @returns Promise<QueryResult<ClientPerformanceMetrics[]>>
 */
export async function getClientPerformanceMetrics(
  dateFrom?: string,
  dateTo?: string
): Promise<QueryResult<ClientPerformanceMetrics[]>> {
  try {
    // Build query for client performance data
    let query = supabaseAdmin
      .from('batches')
      .select(`
        client_id,
        pickup_date,
        total_amount,
        status,
        clients (name),
        batch_items (
          quantity_sent,
          quantity_received,
          price_per_item,
          express_delivery
        )
      `);

    // Apply date filters
    if (dateFrom) {
      query = query.gte('pickup_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('pickup_date', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      throw new QueryError(
        `Failed to fetch client performance data: ${error.message}`,
        'CLIENT_PERFORMANCE_QUERY_ERROR',
        500
      );
    }

    // Group data by client
    const clientData = new Map<string, ClientPerformanceMetrics>();

    (data || []).forEach((batch: any) => {
      const clientId = batch.client_id;
      
      if (!clientData.has(clientId)) {
        clientData.set(clientId, {
          client_id: clientId,
          client_name: batch.clients?.name || 'Unknown',
          total_batches: 0,
          total_revenue: 0,
          average_batch_value: 0,
          total_items_processed: 0,
          discrepancy_rate: 0,
          last_pickup_date: '',
          performance_score: 0
        });
      }

      const client = clientData.get(clientId)!;
      client.total_batches += 1;
      // Recalculate batch total including express delivery surcharges
      const items = batch.batch_items || [];
      const batchTotal = items.reduce((itemSum: number, item: any) => {
        const baseAmount = item.quantity_sent * (item.price_per_item || 0);
        const surcharge = (item.express_delivery ? baseAmount * 0.5 : 0);
        return itemSum + baseAmount + surcharge;
      }, 0);
      client.total_revenue += batchTotal;
      
      // Calculate items processed
      const itemsProcessed = batch.batch_items?.reduce((sum: number, item: any) => 
        sum + item.quantity_sent, 0) || 0;
      client.total_items_processed += itemsProcessed;

      // Update last pickup date
      if (!client.last_pickup_date || batch.pickup_date > client.last_pickup_date) {
        client.last_pickup_date = batch.pickup_date;
      }
    });

    // Calculate derived metrics and performance scores
    const results: ClientPerformanceMetrics[] = Array.from(clientData.values()).map(client => {
      // Calculate averages
      client.average_batch_value = client.total_batches > 0 
        ? client.total_revenue / client.total_batches 
        : 0;

      // Calculate discrepancy rate (simplified - in real app you'd calculate actual discrepancies)
      client.discrepancy_rate = Math.random() * 10; // Placeholder

      // Calculate performance score (0-100)
      const revenueScore = Math.min(client.total_revenue / 10000 * 30, 30); // Max 30 points
      const volumeScore = Math.min(client.total_batches * 5, 30); // Max 30 points
      const consistencyScore = client.discrepancy_rate < 5 ? 20 : 
                              client.discrepancy_rate < 10 ? 15 : 10; // Max 20 points
      const recencyScore = client.last_pickup_date ? 
        (new Date().getTime() - new Date(client.last_pickup_date).getTime()) < 30 * 24 * 60 * 60 * 1000 ? 20 : 10 : 0; // Max 20 points

      client.performance_score = Math.round(revenueScore + volumeScore + consistencyScore + recencyScore);

      return client;
    });

    // Sort by performance score (highest first)
    results.sort((a, b) => b.performance_score - a.performance_score);

    return {
      success: true,
      error: null,
      data: results
    };
  } catch (error) {
    if (error instanceof QueryError) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }

    console.error('Unexpected error in getClientPerformanceMetrics:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while calculating client performance metrics',
      data: null
    };
  }
}

/**
 * Get batch statistics for dashboard
 * @param month - Month (0-11)
 * @param year - Year
 * @returns Promise<QueryResult<any>>
 */
export async function getBatchStatistics(
  month: number,
  year: number
): Promise<QueryResult<any>> {
  try {
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    // Get batches for the month
    const { data: batches, error: batchesError } = await supabaseAdmin
      .from('batches')
      .select(`
        id,
        status,
        total_amount,
        pickup_date,
        batch_items (
          quantity_sent,
          quantity_received,
          price_per_item,
          express_delivery
        )
      `)
      .gte('pickup_date', startDate)
      .lte('pickup_date', endDate);

    if (batchesError) {
      throw new QueryError(
        `Failed to fetch batch statistics: ${batchesError.message}`,
        'STATISTICS_QUERY_ERROR',
        500
      );
    }

    // Calculate statistics
    const totalBatches = batches?.length || 0;
    // Recalculate total revenue including express delivery surcharges
    const totalRevenue = batches?.reduce((sum: number, batch: any) => {
      const items = batch.batch_items || [];
      const batchTotal = items.reduce((itemSum: number, item: any) => {
        const baseAmount = item.quantity_sent * (item.price_per_item || 0);
        const surcharge = (item.express_delivery ? baseAmount * 0.5 : 0);
        return itemSum + baseAmount + surcharge;
      }, 0);
      return sum + batchTotal;
    }, 0) || 0;
    const totalItems = batches?.reduce((sum: number, batch: any) => 
      sum + (batch.batch_items?.reduce((itemSum: number, item: any) => itemSum + item.quantity_sent, 0) || 0), 0) || 0;
    
    const completedBatches = batches?.filter((batch: any) => batch.status === 'completed').length || 0;
    const avgBatchValue = totalBatches > 0 ? totalRevenue / totalBatches : 0;

    // Calculate discrepancies
    let discrepancyCount = 0;
    batches?.forEach((batch: any) => {
      const hasDiscrepancy = batch.batch_items?.some((item: any) => 
        item.quantity_sent !== item.quantity_received) || false;
      if (hasDiscrepancy) discrepancyCount++;
    });

    const statistics = {
      totalBatches,
      totalRevenue,
      totalItemsProcessed: totalItems,
      averageBatchValue: avgBatchValue,
      completedBatches,
      discrepancyCount,
      discrepancyPercentage: totalBatches > 0 ? (discrepancyCount / totalBatches) * 100 : 0
    };

    return {
      success: true,
      error: null,
      data: statistics
    };
  } catch (error) {
    if (error instanceof QueryError) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }

    console.error('Unexpected error in getBatchStatistics:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while calculating batch statistics',
      data: null
    };
  }
}
