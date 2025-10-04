/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getInvoiceSummaryByMonth, getClientBatchesByMonth } from '@/lib/services/analytics';

// GET /api/dashboard/reports/pdf-stats?month=YYYY-MM
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month'); // YYYY-MM

    let targetYear: number;
    let targetMonth: number;

    if (monthParam) {
      const parts = monthParam.split('-');
      if (parts.length !== 2) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid month format. Use YYYY-MM',
            data: null,
          },
          { status: 400 }
        );
      }
      targetYear = parseInt(parts[0], 10);
      targetMonth = parseInt(parts[1], 10);
      if (isNaN(targetYear) || isNaN(targetMonth)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid month format. Use YYYY-MM',
            data: null,
          },
          { status: 400 }
        );
      }
    } else {
      const now = new Date();
      targetYear = now.getFullYear();
      targetMonth = now.getMonth() + 1;
    }

    // Get summary data
    const summaryResult = await getInvoiceSummaryByMonth(targetYear, targetMonth);
    if (!summaryResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: summaryResult.error,
          data: null,
        },
        { status: 500 }
      );
    }

    const summaryData = summaryResult.data || [];
    
    // Calculate overall statistics
    const totalClients = summaryData.length;
    const totalItems = summaryData.reduce((sum: number, client: any) => sum + client.total_items_washed, 0);
    const totalRevenueBeforeVat = summaryData.reduce((sum: number, client: any) => sum + client.total_amount, 0);
    const totalVatAmount = Math.round(totalRevenueBeforeVat * 0.15 * 100) / 100;
    const totalRevenueInclVat = Math.round((totalRevenueBeforeVat + totalVatAmount) * 100) / 100;
    const totalBatches = summaryData.reduce((sum: number, client: any) => sum + client.batch_count, 0);
    const totalDiscrepancies = summaryData.reduce((sum: number, client: any) => sum + client.discrepancy_batches, 0);
    const discrepancyRate = totalBatches > 0 ? (totalDiscrepancies / totalBatches) * 100 : 0;

    // Get detailed batch data for each client
    const detailedStats = [];
    for (const client of summaryData) {
      const clientBatchesResult = await getClientBatchesByMonth(client.client_id, targetYear, targetMonth);
      
      if (clientBatchesResult.success && clientBatchesResult.data) {
        const batches = clientBatchesResult.data;
        const clientItemsSent = batches.reduce((sum: number, batch: any) => sum + batch.total_items_sent, 0);
        const clientItemsReceived = batches.reduce((sum: number, batch: any) => sum + batch.total_items_received, 0);
        const clientDiscrepancyItems = clientItemsSent - clientItemsReceived;
        
        detailedStats.push({
          ...client,
          batches: batches.map((batch: any) => ({
            id: batch.id,
            paper_batch_id: batch.paper_batch_id || `#${batch.id.slice(-8).toUpperCase()}`,
            pickup_date: batch.pickup_date,
            status: batch.status,
            items_sent: batch.total_items_sent,
            items_received: batch.total_items_received,
            amount: batch.total_amount,
            discrepancy: batch.total_items_sent - batch.total_items_received
          })),
          items_sent: clientItemsSent,
          items_received: clientItemsReceived,
          discrepancy_items: clientDiscrepancyItems,
          discrepancy_rate: clientItemsSent > 0 ? (clientDiscrepancyItems / clientItemsSent) * 100 : 0
        });
      } else {
        detailedStats.push({
          ...client,
          batches: [],
          items_sent: 0,
          items_received: 0,
          discrepancy_items: 0,
          discrepancy_rate: 0
        });
      }
    }

    // Calculate additional statistics
    const averageBatchValue = totalBatches > 0 ? totalRevenueBeforeVat / totalBatches : 0;
    const averageItemsPerBatch = totalBatches > 0 ? totalItems / totalBatches : 0;
    const topClient = summaryData.reduce((top: any, client: any) => 
      client.total_amount > (top?.total_amount || 0) ? client : top, null
    );

    const statisticsData = {
      period: {
        year: targetYear,
        month: targetMonth,
        month_name: new Date(targetYear, targetMonth - 1).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long' 
        })
      },
      summary: {
        total_clients: totalClients,
        total_items_washed: totalItems,
        total_revenue_before_vat: totalRevenueBeforeVat,
        total_vat_amount: totalVatAmount,
        total_revenue_incl_vat: totalRevenueInclVat,
        total_batches: totalBatches,
        total_discrepancies: totalDiscrepancies,
        discrepancy_rate: discrepancyRate,
        average_batch_value: averageBatchValue,
        average_items_per_batch: averageItemsPerBatch
      },
      top_client: topClient,
      client_details: detailedStats,
      generated_at: new Date().toISOString()
    };

    return NextResponse.json(
      {
        success: true,
        error: null,
        data: statisticsData,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('GET /api/dashboard/reports/pdf-stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        data: null,
      },
      { status: 500 }
    );
  }
}
