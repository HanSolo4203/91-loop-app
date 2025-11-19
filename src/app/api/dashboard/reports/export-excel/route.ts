/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getInvoiceSummaryByMonth, getClientBatchesByMonth, getInvoiceSummaryByYear, getClientBatchesByYear } from '@/lib/services/analytics';
import * as XLSX from 'xlsx';

// GET /api/dashboard/reports/export-excel?month=YYYY-MM
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month'); // YYYY-MM

    let targetYear: number;
    let targetMonth: number | null = null;
    let isAllMonths = false;

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
      const monthPart = parts[1].toLowerCase();
      if (monthPart === 'all') {
        isAllMonths = true;
      } else {
        targetMonth = parseInt(monthPart, 10);
      }
      if (isNaN(targetYear) || (!isAllMonths && (targetMonth === null || isNaN(targetMonth)))) {
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
    const summaryResult = isAllMonths
      ? await getInvoiceSummaryByYear(targetYear)
      : await getInvoiceSummaryByMonth(targetYear, targetMonth as number);
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
    
    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Create summary sheet with VAT calculations
    const summarySheetData = [
      ['Client Name', 'Total Items Washed', 'Amount before VAT (R)', 'VAT Amount (R)', 'Total Amount incl. VAT (R)', 'Batch Count', 'Discrepancy Batches', 'Discrepancy Rate (%)'],
      ...summaryData.map((client: any) => {
        const vatAmount = Math.round(client.total_amount * 0.15 * 100) / 100;
        const totalInclVat = Math.round((client.total_amount + vatAmount) * 100) / 100;
        return [
          client.client_name,
          client.total_items_washed,
          client.total_amount,
          vatAmount,
          totalInclVat,
          client.batch_count,
          client.discrepancy_batches,
          client.batch_count > 0 ? ((client.discrepancy_batches / client.batch_count) * 100).toFixed(2) : '0.00'
        ];
      })
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summarySheetData);
    
    // Style the header row
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2563EB" } },
      alignment: { horizontal: "center" }
    };

    // Apply header styling (Note: XLSX styling is limited, this is a basic approach)
    for (let col = 0; col < summarySheetData[0].length; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!summarySheet[cellRef]) summarySheet[cellRef] = { v: summarySheetData[0][col] };
      summarySheet[cellRef].s = headerStyle;
    }

    XLSX.utils.book_append_sheet(workbook, summarySheet, isAllMonths ? 'Annual Summary' : 'Monthly Summary');

    // Create detailed sheets for each client
    for (const client of summaryData) {
      const clientBatchesResult = isAllMonths
        ? await getClientBatchesByYear(client.client_id, targetYear)
        : await getClientBatchesByMonth(client.client_id, targetYear, targetMonth as number);
      
      if (clientBatchesResult.success && clientBatchesResult.data) {
        const batchData = clientBatchesResult.data;
        
        const clientSheetData = [
          ['Batch ID', 'Pickup Date', 'Status', 'Items Sent', 'Items Received', 'Amount before VAT (R)', 'VAT Amount (R)', 'Total Amount incl. VAT (R)', 'Discrepancy Items', 'Discrepancy Value (R)'],
          ...batchData.map((batch: any) => {
            const vatAmount = Math.round(batch.total_amount * 0.15 * 100) / 100;
            const totalInclVat = Math.round((batch.total_amount + vatAmount) * 100) / 100;
            return [
              batch.paper_batch_id || `#${batch.id.slice(-8).toUpperCase()}`,
              new Date(batch.pickup_date).toLocaleDateString(),
              batch.status,
              batch.total_items_sent,
              batch.total_items_received,
              batch.total_amount,
              vatAmount,
              totalInclVat,
              batch.total_items_sent - batch.total_items_received,
              (batch.total_items_sent - batch.total_items_received) * (batch.total_amount / batch.total_items_sent || 0)
            ];
          })
        ];

        const clientSheet = XLSX.utils.aoa_to_sheet(clientSheetData);
        
        // Apply header styling
        for (let col = 0; col < clientSheetData[0].length; col++) {
          const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
          if (!clientSheet[cellRef]) clientSheet[cellRef] = { v: clientSheetData[0][col] };
          clientSheet[cellRef].s = headerStyle;
        }

        // Clean client name for sheet name (Excel sheet names have restrictions)
        const cleanClientName = client.client_name.replace(/[\\\/\?\*\[\]]/g, '_').substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, clientSheet, cleanClientName);
      }
    }

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Create filename
    const monthName = isAllMonths
      ? `${targetYear} All Months`
      : new Date(targetYear, (targetMonth as number) - 1).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long' 
        });
    const filename = `RSL_Express_Report_${monthName.replace(/\s+/g, '_')}.xlsx`;

    // Return Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('GET /api/dashboard/reports/export-excel error:', error);
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
