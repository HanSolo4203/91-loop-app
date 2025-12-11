/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getBusinessSettings } from '@/lib/services/business-settings';

// Dynamic import for jsPDF - loaded only when needed
let jsPDFModule: any = null;

async function getJsPDF() {
  if (!jsPDFModule) {
    jsPDFModule = await import('jspdf');
  }
  return jsPDFModule.default;
}

// Helper to format date
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Helper to format currency
function formatCurrency(amount: number): string {
  return `R ${amount.toFixed(2)}`;
}

// Get date range for month
function getMonthDateRange(year: number, month: number) {
  const formatDate = (y: number, m: number, d: number): string => {
    const monthStr = String(m).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    return `${y}-${monthStr}-${dayStr}`;
  };
  
  const startDate = formatDate(year, month, 1);
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const endDate = formatDate(year, month, lastDayOfMonth);
  
  return { startDate, endDate };
}

// GET /api/dashboard/reports/download-invoices-pdf?month=YYYY-MM or YYYY-all
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month');

    if (!monthParam) {
      return NextResponse.json(
        { success: false, error: 'Month parameter is required (YYYY-MM)', data: null },
        { status: 400 }
      );
    }

    // Parse month parameter (supports YYYY-MM and YYYY-all for full year)
    const parts = monthParam.split('-');
    if (parts.length !== 2) {
      return NextResponse.json(
        { success: false, error: 'Invalid month format. Use YYYY-MM', data: null },
        { status: 400 }
      );
    }

    const targetYear = parseInt(parts[0], 10);
    const monthPart = parts[1].toLowerCase();
    const isAllMonths = monthPart === 'all';
    const targetMonth = isAllMonths ? null : parseInt(monthPart, 10);

    if (
      isNaN(targetYear) ||
      (!isAllMonths && (targetMonth === null || isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12))
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid month format. Use YYYY-MM', data: null },
        { status: 400 }
      );
    }

    // Get all batches for the month or full year
    const { startDate, endDate } = isAllMonths
      ? { startDate: `${targetYear}-01-01`, endDate: `${targetYear}-12-31` }
      : getMonthDateRange(targetYear, targetMonth as number);
    
    const { data: batches, error: batchesError } = await supabaseAdmin
      .from('batches')
      .select(`
        id,
        paper_batch_id,
        system_batch_id,
        pickup_date,
        total_amount,
        has_discrepancy,
        status,
        client:clients(id, name, logo_url, email, address, contact_number),
        items:batch_items(
          quantity_sent,
          quantity_received,
          price_per_item,
          express_delivery,
          linen_category:linen_categories(name)
        )
      `)
      .gte('pickup_date', startDate)
      .lte('pickup_date', endDate)
      .order('pickup_date', { ascending: false }) as any;

    if (batchesError) {
      console.error('Error fetching batches:', batchesError);
      return NextResponse.json(
        { success: false, error: `Failed to fetch batches: ${batchesError.message}`, data: null },
        { status: 500 }
      );
    }

    if (!batches || batches.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No batches found for the selected month', data: null },
        { status: 404 }
      );
    }

    // Load business settings for bank details
    const businessSettingsResult = await getBusinessSettings();
    const bankDetails = businessSettingsResult.success && businessSettingsResult.data
      ? businessSettingsResult.data
      : null;

    // Generate PDF
    const jsPDF = await getJsPDF();
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let currentY = margin;

    // Load logo from public folder as high-quality image
    let logoDataUrl: string | null = null;
    try {
      const { origin } = new URL(request.url);
      const logoUrl = `${origin}/rsllogo.png`;
      const logoResponse = await fetch(logoUrl);
      if (logoResponse.ok) {
        const buffer = await logoResponse.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        logoDataUrl = `data:image/png;base64,${base64}`;
      } else {
        console.error('Failed to load logo image for PDF header:', logoResponse.statusText);
      }
    } catch (e) {
      console.error('Error loading logo image for PDF header:', e);
    }

    // Helper function to add header
    const addHeader = () => {
      // Clean white header with logo on the left and contact details on the right
      doc.setTextColor(0, 0, 0);

      // Logo on the left (let jsPDF preserve the original aspect ratio from the PNG)
      if (logoDataUrl) {
        const logoWidth = 84; // 2x previous width, height auto to preserve aspect ratio
        const logoHeight = 0; // 0 = auto height to preserve intrinsic aspect ratio
        const logoX = margin;
        const logoY = 12;
        try {
          doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoWidth, logoHeight);
        } catch (e) {
          console.error('Error adding logo image to PDF header:', e);
        }
      } else {
        // Fallback to text logo if image fails
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('RSL Express', margin, 24);
      }
      
      doc.setFontSize(10);
      const contactX = pageWidth - 70;
      doc.text('Tel: +27 11 123 4567', contactX, 12);
      doc.text('Email: info@rslexpress.co.za', contactX, 18);
      doc.text('Web: www.rslexpress.co.za', contactX, 24);
      
      currentY = 45;
    };

    // Helper function to add new page
    const addNewPage = () => {
      doc.addPage();
      addHeader();
    };

    // Helper function to add footer
    const addFooter = () => {
      const footerY = pageHeight - 30;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, footerY, pageWidth - margin, footerY);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      
      const footerText = 'Thank you for choosing RSL Express Services';
      const textWidth = doc.getTextWidth(footerText);
      const centerX = (pageWidth - textWidth) / 2;
      doc.text(footerText, centerX, footerY + 10);
      
      doc.setFontSize(8);
      doc.text('Payment terms: Net 30 days', margin, footerY + 18);
      
      // Page number
      const pageNum = doc.getNumberOfPages();
      doc.text(`Page ${pageNum}`, pageWidth - margin - 20, footerY + 18);
    };

    // ========== SUMMARY PAGE ==========
    addHeader();

    // Title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('MONTHLY INVOICES SUMMARY', margin, currentY);
    currentY += 10;

    // Month/Year info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const monthLabel = targetMonth ? `${monthNames[targetMonth - 1]} ${targetYear}` : `${targetYear} (All Months)`;
    doc.text(monthLabel, margin, currentY);
    currentY += 15;

    // Calculate totals
    let totalSubtotal = 0;
    let totalVat = 0;
    let totalAmount = 0;

    // Summary table header
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, currentY - 5, pageWidth - 2 * margin, 10, 'F');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    const colWidths = [40, 50, 30, 35, 35]; // Invoice #, Client, Date, Subtotal, Total
    const startX = margin;
    
    doc.text('Invoice #', startX, currentY);
    doc.text('Client', startX + colWidths[0], currentY);
    doc.text('Date', startX + colWidths[0] + colWidths[1], currentY);
    doc.text('Subtotal', startX + colWidths[0] + colWidths[1] + colWidths[2], currentY);
    doc.text('Total', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], currentY);
    
    currentY += 12;

    // Summary table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    for (const batch of batches) {
      // Check if we need a new page
      if (currentY > pageHeight - 80) {
        addFooter();
        addNewPage();
      }

      const batchSubtotal = batch.total_amount || 0;
      const batchVat = Math.round(batchSubtotal * 0.15 * 100) / 100;
      const batchTotal = Math.round((batchSubtotal + batchVat) * 100) / 100;

      totalSubtotal += batchSubtotal;
      totalVat += batchVat;
      totalAmount += batchTotal;

      // Alternate row colors
      const rowIndex = batches.indexOf(batch);
      if (rowIndex % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, currentY - 5, pageWidth - 2 * margin, 8, 'F');
      }

      // Invoice number
      doc.text(batch.paper_batch_id || `#${batch.id.slice(-8).toUpperCase()}`, startX, currentY);
      
      // Client name (truncate if too long)
      const clientName = (batch.client?.name || 'Unknown Client').substring(0, 20);
      doc.text(clientName, startX + colWidths[0], currentY);
      
      // Date
      const pickupDate = new Date(batch.pickup_date);
      const dateStr = pickupDate.toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit', year: 'numeric' });
      doc.text(dateStr, startX + colWidths[0] + colWidths[1], currentY);
      
      // Subtotal
      doc.text(formatCurrency(batchSubtotal), startX + colWidths[0] + colWidths[1] + colWidths[2], currentY);
      
      // Total
      doc.text(formatCurrency(batchTotal), startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], currentY);
      
      currentY += 8;
    }

    currentY += 10;

    // Total summary
    if (currentY > pageHeight - 60) {
      addFooter();
      addNewPage();
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 10;

    const rightAlign = pageWidth - margin;
    const labelWidth = 50;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTALS:', margin, currentY);
    currentY += 10;

    doc.setFont('helvetica', 'normal');
    doc.text('Total Subtotal (before VAT):', margin, currentY);
    doc.text(formatCurrency(totalSubtotal), rightAlign - 30, currentY);
    currentY += 8;

    doc.text('Total VAT (15%):', margin, currentY);
    doc.text(formatCurrency(totalVat), rightAlign - 30, currentY);
    currentY += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('TOTAL AMOUNT (incl. VAT):', margin, currentY);
    doc.text(formatCurrency(totalAmount), rightAlign - 30, currentY);
    currentY += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Number of Invoices: ${batches.length}`, margin, currentY);
    currentY += 12;

    // Bank account details (front page only)
    if (bankDetails && (
      bankDetails.bank_name ||
      bankDetails.bank_account_name ||
      bankDetails.bank_account_number ||
      bankDetails.bank_branch_code ||
      bankDetails.bank_account_type ||
      bankDetails.bank_payment_reference
    )) {
      if (currentY > pageHeight - 70) {
        addFooter();
        addNewPage();
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Bank Details for Payment', margin, currentY);
      currentY += 6;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const details: string[] = [];
      if (bankDetails.bank_name) details.push(`Bank: ${bankDetails.bank_name}`);
      if (bankDetails.bank_account_name) details.push(`Account Name: ${bankDetails.bank_account_name}`);
      if (bankDetails.bank_account_number) details.push(`Account Number: ${bankDetails.bank_account_number}`);
      if (bankDetails.bank_branch_code) details.push(`Branch Code: ${bankDetails.bank_branch_code}`);
      if (bankDetails.bank_account_type) details.push(`Account Type: ${bankDetails.bank_account_type}`);

      details.forEach((line) => {
        doc.text(line, margin, currentY);
        currentY += 5;
      });

      if (bankDetails.bank_payment_reference) {
        currentY += 2;
        doc.setFont('helvetica', 'italic');
        doc.text(`Payment Reference: ${bankDetails.bank_payment_reference}`, margin, currentY);
      }
    }

    addFooter();

    // ========== INDIVIDUAL INVOICE PAGES ==========
    for (const batch of batches) {
      addNewPage();

      // Invoice title
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', margin, currentY);
      currentY += 15;

      // Invoice details
      const leftColumn = margin;
      const rightColumn = pageWidth / 2 + 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Invoice Number:', leftColumn, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(batch.paper_batch_id || `#${batch.id.slice(-8).toUpperCase()}`, leftColumn + 40, currentY);
      
      currentY += 8;
      doc.setFont('helvetica', 'bold');
      doc.text('Date:', leftColumn, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(new Date()), leftColumn + 40, currentY);
      
      currentY += 8;
      doc.setFont('helvetica', 'bold');
      doc.text('Pickup Date:', leftColumn, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(new Date(batch.pickup_date)), leftColumn + 40, currentY);

      // Bill To
      currentY -= 16;
      doc.setFont('helvetica', 'bold');
      doc.text('Bill To:', rightColumn, currentY);
      
      currentY += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(batch.client?.name || 'Unknown Client', rightColumn, currentY);
      
      if (batch.client?.email) {
        currentY += 6;
        doc.text(batch.client.email, rightColumn, currentY);
      }
      
      if (batch.client?.contact_number) {
        currentY += 6;
        doc.text(batch.client.contact_number, rightColumn, currentY);
      }
      
      if (batch.client?.address) {
        currentY += 6;
        const addressLines = batch.client.address.split('\n');
        for (const line of addressLines.slice(0, 3)) {
          doc.text(line.substring(0, 40), rightColumn, currentY);
          currentY += 5;
        }
      }

      currentY += 15;

      // Items table
      if (currentY > pageHeight - 100) {
        addFooter();
        addNewPage();
      }

      doc.setFillColor(248, 250, 252);
      doc.rect(margin, currentY - 5, pageWidth - 2 * margin, 10, 'F');
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      
      const itemColWidths = [80, 20, 20, 20, 30];
      const itemStartX = margin;
      
      doc.text('Item', itemStartX, currentY);
      doc.text('Qty Sent', itemStartX + itemColWidths[0], currentY);
      doc.text('Qty Rec.', itemStartX + itemColWidths[0] + itemColWidths[1], currentY);
      doc.text('Price', itemStartX + itemColWidths[0] + itemColWidths[1] + itemColWidths[2], currentY);
      doc.text('Total', itemStartX + itemColWidths[0] + itemColWidths[1] + itemColWidths[2] + itemColWidths[3], currentY);
      
      currentY += 12;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      let subtotalReceived = 0;
      let totalDiscrepancyValue = 0;
      let totalSurcharge = 0;

      for (const [index, item] of (batch.items || []).entries()) {
        if (currentY > pageHeight - 80) {
          addFooter();
          addNewPage();
        }

        if (index % 2 === 0) {
          doc.setFillColor(249, 250, 251);
          doc.rect(margin, currentY - 4, pageWidth - 2 * margin, 8, 'F');
        }

        const qtySent = item.quantity_sent || 0;
        const qtyReceived = item.quantity_received || 0;
        const price = item.price_per_item || 0;
        const discrepancy = qtyReceived - qtySent; // Positive when more received than sent
        const discrepancyValue = Math.round(discrepancy * price * 100) / 100;
        const lineTotal = Math.round(qtyReceived * price * 100) / 100;
        const expressDelivery = item.express_delivery || false;
        const surcharge = expressDelivery ? Math.round(lineTotal * 0.5 * 100) / 100 : 0;

        subtotalReceived += lineTotal;
        totalDiscrepancyValue += discrepancyValue;
        totalSurcharge += surcharge;

        doc.text(item.linen_category?.name || 'Unknown', itemStartX, currentY);
        doc.text(qtySent.toString(), itemStartX + itemColWidths[0], currentY);
        doc.text(qtyReceived.toString(), itemStartX + itemColWidths[0] + itemColWidths[1], currentY);
        doc.text(formatCurrency(price), itemStartX + itemColWidths[0] + itemColWidths[1] + itemColWidths[2], currentY);
        doc.text(formatCurrency(lineTotal), itemStartX + itemColWidths[0] + itemColWidths[1] + itemColWidths[2] + itemColWidths[3], currentY);

        currentY += 8;
      }

      currentY += 10;

      // Invoice totals
      if (currentY > pageHeight - 80) {
        addFooter();
        addNewPage();
      }

      const adjustedSubtotal = Math.round((subtotalReceived + totalDiscrepancyValue + totalSurcharge) * 100) / 100;
      const invoiceVat = Math.round(adjustedSubtotal * 0.15 * 100) / 100;
      const invoiceTotal = Math.round((adjustedSubtotal + invoiceVat) * 100) / 100;

      doc.setDrawColor(200, 200, 200);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Subtotal (Received):', rightAlign - labelWidth - 30, currentY);
      doc.text(formatCurrency(subtotalReceived), rightAlign - 30, currentY);
      currentY += 8;

      if (totalDiscrepancyValue !== 0) {
        doc.text('Discrepancy Adjustment:', rightAlign - labelWidth - 30, currentY);
        const discText = totalDiscrepancyValue > 0 ? `+${formatCurrency(totalDiscrepancyValue)}` : formatCurrency(totalDiscrepancyValue);
        doc.text(discText, rightAlign - 30, currentY);
        currentY += 8;
      }

      if (totalSurcharge > 0) {
        doc.text('Express Delivery Surcharge (50%):', rightAlign - labelWidth - 30, currentY);
        doc.text(formatCurrency(totalSurcharge), rightAlign - 30, currentY);
        currentY += 8;
      }

      doc.text('Subtotal (Adjusted):', rightAlign - labelWidth - 30, currentY);
      doc.text(formatCurrency(adjustedSubtotal), rightAlign - 30, currentY);
      currentY += 8;

      doc.text('VAT (15%):', rightAlign - labelWidth - 30, currentY);
      doc.text(formatCurrency(invoiceVat), rightAlign - 30, currentY);
      currentY += 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('TOTAL:', rightAlign - labelWidth - 30, currentY);
      doc.text(formatCurrency(invoiceTotal), rightAlign - 30, currentY);

      addFooter();
    }

    // Generate PDF blob
    const pdfBlob = doc.output('blob');

    // Return PDF as response
    return new NextResponse(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoices-${monthNames[targetMonth - 1]}-${targetYear}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating combined invoices PDF:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: null,
      },
      { status: 500 }
    );
  }
}

