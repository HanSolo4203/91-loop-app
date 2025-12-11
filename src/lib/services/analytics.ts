/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '@/lib/supabase';
import type { 
  BatchStatus 
} from '@/types/database';

interface BatchWithItems {
  id: string;
  total_amount: number;
  status: BatchStatus;
  has_discrepancy: boolean;
  client?: {
    name: string;
  };
  items?: Array<{
    quantity_received: number;
    linen_category?: {
      name: string;
    };
  }>;
}

interface BatchWithClient {
  id: string;
  paper_batch_id: string;
  system_batch_id: string;
  client_id: string;
  client_name: string;
  pickup_date: string;
  status: BatchStatus;
  total_amount: number;
  has_discrepancy: boolean;
}

interface BatchWithDiscrepancy {
  id: string;
  paper_batch_id: string;
  client_name: string;
  pickup_date: string;
  total_amount: number;
  items?: Array<{
    quantity_sent: number;
    quantity_received: number;
    linen_category_name: string;
    discrepancy_amount: number;
  }>;
}

// Custom error class for analytics service errors
export class AnalyticsServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AnalyticsServiceError';
  }
}

// Service response types
export interface AnalyticsServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

// Analytics data types
export interface MonthlyStats {
  month: string;
  year: number;
  totalBatches: number;
  totalRevenue: number;
  totalItemsProcessed: number;
  averageBatchValue: number;
  completedBatches: number;
  pendingBatches: number;
  discrepancyCount: number;
  discrepancyPercentage: number;
  topClients: Array<{
    client_id: string;
    client_name: string;
    batch_count: number;
    total_revenue: number;
  }>;
  topCategories: Array<{
    category_id: string;
    category_name: string;
    total_quantity: number;
    total_revenue: number;
  }>;
  monthOverMonth: {
    batchGrowth: number;
    revenueGrowth: number;
    itemsGrowth: number;
  };
}

export interface RecentBatch {
  id: string;
  paper_batch_id: string;
  system_batch_id: string;
  client_name: string;
  pickup_date: string;
  status: BatchStatus;
  total_amount: number;
  has_discrepancy: boolean;
  item_count: number;
  created_at: string;
}

export interface RevenueByMonth {
  month: string;
  year: number;
  revenue: number;
  batch_count: number;
  average_batch_value: number;
}

export interface TopClient {
  client_id: string;
  client_name: string;
  total_revenue: number;
  batch_count: number;
  average_batch_value: number;
  last_pickup_date: string;
}

export interface DiscrepancyReport {
  batch_id: string;
  paper_batch_id: string;
  system_batch_id: string;
  client_name: string;
  pickup_date: string;
  total_amount: number;
  discrepancy_count: number;
  discrepancy_percentage: number;
  items_with_discrepancy: Array<{
    category_name: string;
    quantity_sent: number;
    quantity_received: number;
    discrepancy: number;
  }>;
}

export interface ClientInvoiceSummary {
  client_id: string;
  client_name: string;
  logo_url: string | null;
  total_items_washed: number;
  total_amount: number;
  batch_count: number;
  discrepancy_batches: number;
}

export interface ClientBatchSummaryItem {
  id: string;
  paper_batch_id: string;
  system_batch_id: string;
  pickup_date: string;
  status: BatchStatus;
  total_amount: number;
  has_discrepancy: boolean;
  total_items_sent: number;
  total_items_received: number;
}

const REPORT_YEAR_MIN = 2020;
const REPORT_YEAR_MAX = 2030;

function getDateRange(year: number, month?: number) {
  if (year < REPORT_YEAR_MIN || year > REPORT_YEAR_MAX) {
    throw new AnalyticsServiceError(
      `Year must be between ${REPORT_YEAR_MIN} and ${REPORT_YEAR_MAX}`,
      'INVALID_YEAR',
      400
    );
  }

  // Helper function to format date as YYYY-MM-DD without timezone issues
  const formatDate = (y: number, m: number, d: number): string => {
    const monthStr = String(m).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    return `${y}-${monthStr}-${dayStr}`;
  };

  if (typeof month === 'number') {
    if (month < 1 || month > 12) {
      throw new AnalyticsServiceError(
        'Month must be between 1 and 12',
        'INVALID_MONTH',
        400
      );
    }

    const startDate = formatDate(year, month, 1);
    const lastDayOfMonth = new Date(year, month, 0).getDate(); // day 0 of next month = last day of current month
    const endDate = formatDate(year, month, lastDayOfMonth);
    
    return {
      startDate,
      endDate,
    };
  }

  // For full year
  return {
    startDate: formatDate(year, 1, 1),
    endDate: formatDate(year, 12, 31),
  };
}

export interface BatchInvoiceItem {
  category_name: string;
  quantity_sent: number | null;
  quantity_received: number | null;
  unit_price: number | null;
  line_total: number;
  discrepancy: number; // sent - received
}

export interface BatchInvoice {
  batch_id: string;
  client_name: string | null;
  client_logo_url: string | null;
  paper_batch_id: string | null;
  system_batch_id: string | null;
  pickup_date: string;
  total_amount: number;
  has_discrepancy: boolean;
  items: BatchInvoiceItem[];
}

/**
 * Get a batch invoice with line items and pricing
 */
export async function getBatchInvoice(
  batchId: string
): Promise<AnalyticsServiceResponse<BatchInvoice>> {
  try {
    if (!batchId) {
      throw new AnalyticsServiceError('Batch ID is required', 'INVALID_BATCH', 400);
    }

    const { data, error } = await supabaseAdmin
      .from('batches')
      .select(`
        id,
        paper_batch_id,
        system_batch_id,
        pickup_date,
        total_amount,
        has_discrepancy,
        client:clients(name, logo_url),
        items:batch_items(
          quantity_sent,
          quantity_received,
          linen_category:linen_categories(name, price_per_item)
        )
      `)
      .eq('id', batchId)
      .single() as any;

    if (error) {
      throw new AnalyticsServiceError(`Failed to fetch batch invoice: ${error.message}`, 'FETCH_BATCH_INVOICE_ERROR', 500);
    }

    const items: BatchInvoiceItem[] = (data.items || []).map((it: any) => {
      const unitPrice = it.linen_category?.price_per_item ?? null;
      const qty = it.quantity_received ?? 0;
      const lineTotal = unitPrice !== null ? unitPrice * qty : 0;
      const discrepancy = (it.quantity_sent ?? 0) - (it.quantity_received ?? 0);
      return {
        category_name: it.linen_category?.name || 'Unknown',
        quantity_sent: it.quantity_sent ?? null,
        quantity_received: it.quantity_received ?? null,
        unit_price: unitPrice,
        line_total: lineTotal,
        discrepancy,
      };
    });

    const invoice: BatchInvoice = {
      batch_id: data.id,
      client_name: data.client?.name ?? null,
      client_logo_url: data.client?.logo_url ?? null,
      paper_batch_id: data.paper_batch_id ?? null,
      system_batch_id: data.system_batch_id ?? null,
      pickup_date: data.pickup_date,
      total_amount: data.total_amount ?? 0,
      has_discrepancy: !!data.has_discrepancy,
      items,
    };

    return { data: invoice, error: null, success: true };
  } catch (error) {
    if (error instanceof AnalyticsServiceError) {
      return { data: null, error: error.message, success: false };
    }
    return {
      data: null,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false,
    };
  }
}

/**
 * Get batches for a specific client within a given month
 */
async function getClientBatchesByPeriod(
  clientId: string,
  year: number,
  month?: number
): Promise<AnalyticsServiceResponse<ClientBatchSummaryItem[]>> {
  try {
    if (!clientId) {
      throw new AnalyticsServiceError('Client ID is required', 'INVALID_CLIENT', 400);
    }

    const { startDate, endDate } = getDateRange(year, month);

    const { data, error } = await supabaseAdmin
      .from('batches')
      .select(`
        id,
        paper_batch_id,
        system_batch_id,
        pickup_date,
        status,
        total_amount,
        has_discrepancy,
        items:batch_items(quantity_received, quantity_sent)
      `)
      .eq('client_id', clientId)
      .gte('pickup_date', startDate)
      .lte('pickup_date', endDate) as any;

    if (error) {
      throw new AnalyticsServiceError(`Failed to fetch client batches: ${error.message}`, 'FETCH_CLIENT_BATCHES_ERROR', 500);
    }

    const rows: ClientBatchSummaryItem[] = (data || []).map((b: any) => ({
      id: b.id,
      paper_batch_id: b.paper_batch_id,
      system_batch_id: b.system_batch_id || '',
      pickup_date: b.pickup_date,
      status: b.status,
      total_amount: b.total_amount || 0,
      has_discrepancy: !!b.has_discrepancy,
      total_items_sent: (b.items || []).reduce((s: number, it: any) => s + (it.quantity_sent || 0), 0),
      total_items_received: (b.items || []).reduce((s: number, it: any) => s + (it.quantity_received || 0), 0),
    }));

    return { data: rows, error: null, success: true };
  } catch (error) {
    if (error instanceof AnalyticsServiceError) {
      return { data: null, error: error.message, success: false };
    }
    return {
      data: null,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false,
    };
  }
}

export async function getClientBatchesByMonth(
  clientId: string,
  year: number,
  month: number
) {
  return getClientBatchesByPeriod(clientId, year, month);
}

export async function getClientBatchesByYear(
  clientId: string,
  year: number
) {
  return getClientBatchesByPeriod(clientId, year);
}
async function getInvoiceSummaryByPeriod(
  year: number,
  month?: number
): Promise<AnalyticsServiceResponse<ClientInvoiceSummary[]>> {
  try {
    const { startDate, endDate } = getDateRange(year, month);

    const { data, error } = await supabaseAdmin
      .from('batches')
      .select(`
        id,
        client_id,
        total_amount,
        has_discrepancy,
        pickup_date,
        client:clients(id, name, logo_url),
        items:batch_items(quantity_received)
      `)
      .gte('pickup_date', startDate)
      .lte('pickup_date', endDate) as any;

    if (error) {
      throw new AnalyticsServiceError(
        `Failed to fetch invoice data: ${error.message}`,
        'FETCH_INVOICE_ERROR',
        500
      );
    }

    const summaryMap = new Map<string, ClientInvoiceSummary>();

    (data || []).forEach((batch: any) => {
      const clientId = batch.client?.id || batch.client_id || 'unknown';
      const clientName = batch.client?.name || 'Unknown Client';
      const clientLogoUrl = batch.client?.logo_url || null;
      const existing = summaryMap.get(clientId) || {
        client_id: clientId,
        client_name: clientName,
        logo_url: clientLogoUrl,
        total_items_washed: 0,
        total_amount: 0,
        batch_count: 0,
        discrepancy_batches: 0,
      } as ClientInvoiceSummary;

      const itemsCount = (batch.items || []).reduce((sum: number, it: any) => sum + (it.quantity_received || 0), 0);

      summaryMap.set(clientId, {
        client_id: clientId,
        client_name: clientName,
        logo_url: clientLogoUrl,
        total_items_washed: existing.total_items_washed + itemsCount,
        total_amount: existing.total_amount + (batch.total_amount || 0),
        batch_count: existing.batch_count + 1,
        discrepancy_batches: existing.discrepancy_batches + (batch.has_discrepancy ? 1 : 0),
      });
    });

    const summaries = Array.from(summaryMap.values()).sort((a, b) => b.total_amount - a.total_amount);

    return {
      data: summaries,
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof AnalyticsServiceError) {
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

export async function getInvoiceSummaryByMonth(
  year: number,
  month: number
) {
  return getInvoiceSummaryByPeriod(year, month);
}

export async function getInvoiceSummaryByYear(
  year: number
) {
  return getInvoiceSummaryByPeriod(year);
}

/**
 * Get comprehensive monthly statistics
 * @param year - Year for statistics
 * @param month - Month for statistics (1-12)
 * @returns Promise<AnalyticsServiceResponse<MonthlyStats>>
 */
export async function getMonthlyStats(
  year: number, 
  month: number
): Promise<AnalyticsServiceResponse<MonthlyStats>> {
  try {
    // Validate inputs
    if (year < 2020 || year > 2030) {
      throw new AnalyticsServiceError(
        'Year must be between 2020 and 2030',
        'INVALID_YEAR',
        400
      );
    }

    if (month < 1 || month > 12) {
      throw new AnalyticsServiceError(
        'Month must be between 1 and 12',
        'INVALID_MONTH',
        400
      );
    }

    // Date calculation: month is 1-indexed (1-12), but Date constructor uses 0-indexed months (0-11)
    // Helper function to format date as YYYY-MM-DD without timezone issues
    const formatDate = (y: number, m: number, d: number): string => {
      const monthStr = String(m).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      return `${y}-${monthStr}-${dayStr}`;
    };
    
    // startDate: first day of the month
    const startDate = formatDate(year, month, 1);
    // endDate: last day of the month - get last day by creating date for next month and subtracting
    const lastDayOfMonth = new Date(year, month, 0).getDate(); // day 0 of next month = last day of current month
    const endDate = formatDate(year, month, lastDayOfMonth);
    
    // previousMonthStart: first day of previous month
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const previousMonthStart = formatDate(prevYear, prevMonth, 1);
    // previousMonthEnd: last day of previous month
    const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
    const previousMonthEnd = formatDate(prevYear, prevMonth, prevLastDay);

    // Get current month statistics
    const { data: currentMonthData, error: currentError } = await supabaseAdmin
      .from('batches')
      .select(`
        id,
        paper_batch_id,
        system_batch_id,
        total_amount,
        status,
        has_discrepancy,
        pickup_date,
        created_at,
        client:clients(name),
        items:batch_items(
          quantity_sent,
          quantity_received,
          linen_category:linen_categories(name)
        )
      `)
      .gte('pickup_date', startDate)
      .lte('pickup_date', endDate) as any;

    if (currentError) {
      throw new AnalyticsServiceError(
        `Failed to fetch current month data: ${currentError.message}`,
        'FETCH_CURRENT_ERROR',
        500
      );
    }

    // Get previous month statistics for comparison
    const { data: previousMonthData, error: previousError } = await supabaseAdmin
      .from('batches')
      .select('total_amount, status, has_discrepancy')
      .gte('pickup_date', previousMonthStart)
      .lte('pickup_date', previousMonthEnd) as any;

    if (previousError) {
      throw new AnalyticsServiceError(
        `Failed to fetch previous month data: ${previousError.message}`,
        'FETCH_PREVIOUS_ERROR',
        500
      );
    }

    // Calculate current month statistics
    const totalBatches = currentMonthData?.length || 0;
    const totalRevenue = currentMonthData?.reduce((sum: number, batch: BatchWithItems) => sum + batch.total_amount, 0) || 0;
    const totalItemsProcessed = currentMonthData?.reduce((sum: number, batch: BatchWithItems) => 
      sum + (batch.items?.reduce((itemSum: number, item) => itemSum + item.quantity_received, 0) || 0), 0) || 0;
    const averageBatchValue = totalBatches > 0 ? totalRevenue / totalBatches : 0;
    const completedBatches = currentMonthData?.filter((batch: BatchWithItems) => batch.status === 'delivered').length || 0;
    const pendingBatches = totalBatches - completedBatches;
    const discrepancyCount = currentMonthData?.filter((batch: BatchWithItems) => batch.has_discrepancy).length || 0;
    const discrepancyPercentage = totalBatches > 0 ? (discrepancyCount / totalBatches) * 100 : 0;

    // Calculate top clients for current month
    const clientStats = new Map<string, { name: string; batchCount: number; totalRevenue: number }>();
    currentMonthData?.forEach((batch: BatchWithItems) => {
      const clientId = batch.client?.name || 'Unknown';
      const existing = clientStats.get(clientId) || { name: clientId, batchCount: 0, totalRevenue: 0 };
      clientStats.set(clientId, {
        name: clientId,
        batchCount: existing.batchCount + 1,
        totalRevenue: existing.totalRevenue + batch.total_amount
      });
    });

    const topClients = Array.from(clientStats.entries())
      .map(([client_id, stats]) => ({
        client_id,
        client_name: stats.name,
        batch_count: stats.batchCount,
        total_revenue: stats.totalRevenue
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 5);

    // Calculate top categories for current month
    const categoryStats = new Map<string, { name: string; totalQuantity: number; totalRevenue: number }>();
    currentMonthData?.forEach((batch: BatchWithItems) => {
      batch.items?.forEach((item) => {
        const categoryName = item.linen_category?.name || 'Unknown';
        const existing = categoryStats.get(categoryName) || { name: categoryName, totalQuantity: 0, totalRevenue: 0 };
        categoryStats.set(categoryName, {
          name: categoryName,
          totalQuantity: existing.totalQuantity + item.quantity_received,
          totalRevenue: existing.totalRevenue + (item.quantity_received * 0) // Price not available in this data structure
        });
      });
    });

    const topCategories = Array.from(categoryStats.entries())
      .map(([category_id, stats]) => ({
        category_id,
        category_name: stats.name,
        total_quantity: stats.totalQuantity,
        total_revenue: stats.totalRevenue
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 5);

    // Calculate month-over-month growth
    const previousTotalBatches = previousMonthData?.length || 0;
    const previousTotalRevenue = previousMonthData?.reduce((sum: number, batch: BatchWithItems) => sum + batch.total_amount, 0) || 0;
    const previousTotalItems = previousMonthData?.length || 0; // Simplified for now

    const batchGrowth = previousTotalBatches > 0 ? 
      ((totalBatches - previousTotalBatches) / previousTotalBatches) * 100 : 0;
    const revenueGrowth = previousTotalRevenue > 0 ? 
      ((totalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100 : 0;
    const itemsGrowth = previousTotalItems > 0 ? 
      ((totalItemsProcessed - previousTotalItems) / previousTotalItems) * 100 : 0;

    const monthlyStats: MonthlyStats = {
      month: new Date(year, month - 1).toLocaleString('default', { month: 'long' }),
      year,
      totalBatches,
      totalRevenue,
      totalItemsProcessed,
      averageBatchValue,
      completedBatches,
      pendingBatches,
      discrepancyCount,
      discrepancyPercentage,
      topClients,
      topCategories,
      monthOverMonth: {
        batchGrowth,
        revenueGrowth,
        itemsGrowth
      }
    };

    return {
      data: monthlyStats,
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof AnalyticsServiceError) {
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
 * Get recent batches with pagination
 * @param limit - Number of batches to return
 * @param offset - Number of batches to skip
 * @param dateFrom - Optional: filter batches by pickup_date >= dateFrom
 * @param dateTo - Optional: filter batches by pickup_date <= dateTo
 * @returns Promise<AnalyticsServiceResponse<RecentBatch[]>>
 */
export async function getRecentBatches(
  limit: number = 10,
  offset: number = 0,
  dateFrom?: string,
  dateTo?: string
): Promise<AnalyticsServiceResponse<RecentBatch[]>> {
  try {
    // Validate inputs
    if (limit < 1 || limit > 100) {
      throw new AnalyticsServiceError(
        'Limit must be between 1 and 100',
        'INVALID_LIMIT',
        400
      );
    }

    if (offset < 0) {
      throw new AnalyticsServiceError(
        'Offset must be non-negative',
        'INVALID_OFFSET',
        400
      );
    }

    let query = supabaseAdmin
      .from('batches')
      .select(`
        id,
        paper_batch_id,
        system_batch_id,
        pickup_date,
        status,
        total_amount,
        has_discrepancy,
        created_at,
        client:clients(name),
        batch_items(id)
      `);

    // Apply date filters if provided (filter by pickup_date)
    if (dateFrom) {
      query = query.gte('pickup_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('pickup_date', dateTo);
    }

    // Order by created_at descending (most recent first) and apply pagination
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new AnalyticsServiceError(
        `Failed to fetch recent batches: ${error.message}`,
        'FETCH_BATCHES_ERROR',
        500
      );
    }

    const recentBatches: RecentBatch[] = (data || []).map((batch: any) => ({
      id: batch.id,
      paper_batch_id: batch.paper_batch_id,
      system_batch_id: batch.system_batch_id,
      client_name: (batch.client?.name) || 'Unknown Client',
      pickup_date: batch.pickup_date,
      status: batch.status,
      total_amount: batch.total_amount,
      has_discrepancy: batch.has_discrepancy,
      item_count: Array.isArray(batch.batch_items) ? batch.batch_items.length : 0,
      created_at: batch.created_at || new Date().toISOString()
    }));

    return {
      data: recentBatches,
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof AnalyticsServiceError) {
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
 * Get monthly revenue data for charts
 * @param year - Year for revenue data
 * @returns Promise<AnalyticsServiceResponse<RevenueByMonth[]>>
 */
export async function getRevenueByMonth(
  year: number
): Promise<AnalyticsServiceResponse<RevenueByMonth[]>> {
  try {
    // Validate input
    if (year < 2020 || year > 2030) {
      throw new AnalyticsServiceError(
        'Year must be between 2020 and 2030',
        'INVALID_YEAR',
        400
      );
    }

    const startDate = new Date(year, 0, 1).toISOString().split('T')[0];
    const endDate = new Date(year, 11, 31).toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('batches')
      .select('total_amount, pickup_date')
      .gte('pickup_date', startDate)
      .lte('pickup_date', endDate) as any;

    if (error) {
      throw new AnalyticsServiceError(
        `Failed to fetch revenue data: ${error.message}`,
        'FETCH_REVENUE_ERROR',
        500
      );
    }

    // Group by month
    const monthlyData = new Map<number, { revenue: number; batchCount: number }>();
    
    (data || []).forEach((batch: BatchWithClient) => {
      const month = new Date(batch.pickup_date).getMonth();
      const existing = monthlyData.get(month) || { revenue: 0, batchCount: 0 };
      monthlyData.set(month, {
        revenue: existing.revenue + batch.total_amount,
        batchCount: existing.batchCount + 1
      });
    });

    // Create array for all 12 months
    const revenueByMonth: RevenueByMonth[] = [];
    for (let month = 0; month < 12; month++) {
      const monthData = monthlyData.get(month) || { revenue: 0, batchCount: 0 };
      revenueByMonth.push({
        month: new Date(year, month).toLocaleString('default', { month: 'short' }),
        year,
        revenue: monthData.revenue,
        batch_count: monthData.batchCount,
        average_batch_value: monthData.batchCount > 0 ? monthData.revenue / monthData.batchCount : 0
      });
    }

    return {
      data: revenueByMonth,
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof AnalyticsServiceError) {
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
 * Get top clients by revenue
 * @param limit - Number of clients to return
 * @returns Promise<AnalyticsServiceResponse<TopClient[]>>
 */
export async function getTopClients(
  limit: number = 10
): Promise<AnalyticsServiceResponse<TopClient[]>> {
  try {
    // Validate input
    if (limit < 1 || limit > 50) {
      throw new AnalyticsServiceError(
        'Limit must be between 1 and 50',
        'INVALID_LIMIT',
        400
      );
    }

    const { data, error } = await supabaseAdmin
      .from('batches')
      .select(`
        client_id,
        total_amount,
        pickup_date,
        client:clients(name)
      `)
      .order('pickup_date', { ascending: false }) as any;

    if (error) {
      throw new AnalyticsServiceError(
        `Failed to fetch client data: ${error.message}`,
        'FETCH_CLIENTS_ERROR',
        500
      );
    }

    // Group by client
    const clientStats = new Map<string, {
      name: string;
      totalRevenue: number;
      batchCount: number;
      lastPickupDate: string;
    }>();

    (data || []).forEach((batch: BatchWithClient) => {
      const clientId = batch.client_id;
      const existing = clientStats.get(clientId) || {
        name: batch.client_name || 'Unknown Client',
        totalRevenue: 0,
        batchCount: 0,
        lastPickupDate: batch.pickup_date
      };

      clientStats.set(clientId, {
        name: existing.name,
        totalRevenue: existing.totalRevenue + batch.total_amount,
        batchCount: existing.batchCount + 1,
        lastPickupDate: batch.pickup_date > existing.lastPickupDate ? batch.pickup_date : existing.lastPickupDate
      });
    });

    const topClients: TopClient[] = Array.from(clientStats.entries())
      .map(([client_id, stats]) => ({
        client_id,
        client_name: stats.name,
        total_revenue: stats.totalRevenue,
        batch_count: stats.batchCount,
        average_batch_value: stats.batchCount > 0 ? stats.totalRevenue / stats.batchCount : 0,
        last_pickup_date: stats.lastPickupDate
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, limit);

    return {
      data: topClients,
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof AnalyticsServiceError) {
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
 * Get discrepancy report
 * @returns Promise<AnalyticsServiceResponse<DiscrepancyReport[]>>
 */
export async function getDiscrepancyReport(): Promise<AnalyticsServiceResponse<DiscrepancyReport[]>> {
  try {
    const { data, error } = await supabaseAdmin
      .from('batches')
      .select(`
        id,
        paper_batch_id,
        system_batch_id,
        pickup_date,
        total_amount,
        has_discrepancy,
        client:clients(name),
        items:batch_items(
          quantity_sent,
          quantity_received,
          linen_category:linen_categories(name)
        )
      `)
      .eq('has_discrepancy', true)
      .order('pickup_date', { ascending: false }) as any;

    if (error) {
      throw new AnalyticsServiceError(
        `Failed to fetch discrepancy data: ${error.message}`,
        'FETCH_DISCREPANCY_ERROR',
        500
      );
    }

    const discrepancyReports: DiscrepancyReport[] = (data || []).map((batch: BatchWithDiscrepancy) => {
      const itemsWithDiscrepancy = batch.items?.filter((item) => 
        item.quantity_sent !== item.quantity_received
      ) || [];

      const totalItems = batch.items?.length || 0;
      const discrepancyCount = itemsWithDiscrepancy.length;
      const discrepancyPercentage = totalItems > 0 ? (discrepancyCount / totalItems) * 100 : 0;

      return {
        batch_id: batch.id,
        paper_batch_id: batch.paper_batch_id,
        system_batch_id: '', // System batch ID not available in this data structure
        client_name: batch.client_name || 'Unknown Client',
        pickup_date: batch.pickup_date,
        total_amount: batch.total_amount,
        discrepancy_count: discrepancyCount,
        discrepancy_percentage: discrepancyPercentage,
        items_with_discrepancy: itemsWithDiscrepancy.map((item) => ({
          category_name: item.linen_category_name || 'Unknown Category',
          quantity_sent: item.quantity_sent,
          quantity_received: item.quantity_received,
          discrepancy: item.quantity_sent - item.quantity_received
        }))
      };
    });

    return {
      data: discrepancyReports,
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof AnalyticsServiceError) {
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
 * Get dashboard overview statistics
 * @returns Promise<AnalyticsServiceResponse<any>>
 */
export async function getDashboardOverview(): Promise<AnalyticsServiceResponse<any>> {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // Get current month stats
    const monthlyStats = await getMonthlyStats(currentYear, currentMonth);
    if (!monthlyStats.success) {
      throw new AnalyticsServiceError(
        `Failed to get monthly stats: ${monthlyStats.error}`,
        'MONTHLY_STATS_ERROR',
        500
      );
    }

    // Get recent batches
    const recentBatches = await getRecentBatches(5, 0);
    if (!recentBatches.success) {
      throw new AnalyticsServiceError(
        `Failed to get recent batches: ${recentBatches.error}`,
        'RECENT_BATCHES_ERROR',
        500
      );
    }

    // Get top clients
    const topClients = await getTopClients(5);
    if (!topClients.success) {
      throw new AnalyticsServiceError(
        `Failed to get top clients: ${topClients.error}`,
        'TOP_CLIENTS_ERROR',
        500
      );
    }

    // Get discrepancy report
    const discrepancyReport = await getDiscrepancyReport();
    if (!discrepancyReport.success) {
      throw new AnalyticsServiceError(
        `Failed to get discrepancy report: ${discrepancyReport.error}`,
        'DISCREPANCY_REPORT_ERROR',
        500
      );
    }

    const overview = {
      monthlyStats: monthlyStats.data,
      recentBatches: recentBatches.data,
      topClients: topClients.data,
      discrepancyReport: discrepancyReport.data,
      lastUpdated: new Date().toISOString()
    };

    return {
      data: overview,
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof AnalyticsServiceError) {
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
