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

    // Load business settings for bank details and payment terms
    const businessSettingsResult = await getBusinessSettings();
    const bankDetails = businessSettingsResult.success && businessSettingsResult.data
      ? businessSettingsResult.data
      : null;
    const paymentTermsDays = bankDetails?.payment_terms_days ?? 8;

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
      const contactX = pageWidth - margin;
      const phone = bankDetails?.phone || '+27 (0) 21 XXX XXXX';
      const email = bankDetails?.email || 'info@rslexpress.co.za';
      const website = bankDetails?.website || '';
      
      let contactY = 12;
      if (phone) {
        doc.text(`Tel: ${phone}`, contactX, contactY, { align: 'right' });
        contactY += 6;
      }
      if (email) {
        doc.text(`Email: ${email}`, contactX, contactY, { align: 'right' });
        contactY += 6;
      }
      if (website) {
        doc.text(`Web: ${website}`, contactX, contactY, { align: 'right' });
        contactY += 6;
      }
      
      currentY = 45;
    };

    // Helper function to add new page
    const addNewPage = () => {
      doc.addPage();
      addHeader();
    };

    // Helper function to add footer
    const addFooter = () => {
      const footerY = pageHeight - 25; // Increased padding from bottom (was 30, now 25)
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
      doc.text(`Payment terms: Net ${paymentTermsDays} days`, margin, footerY + 18);
      
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

    // Calculate analytics: total items, categories, and daily data
    let totalLinenItems = 0;
    const categorySet = new Set<string>();
    const dailyData = new Map<string, number>(); // Map of date string to total items
    
    batches.forEach((batch: any) => {
      const items = batch.items || [];
      items.forEach((item: any) => {
        const qtyReceived = item.quantity_received || 0;
        totalLinenItems += qtyReceived;
        
        if (item.linen_category?.name) {
          categorySet.add(item.linen_category.name);
        }
      });
      
      // Group by pickup date
      const pickupDateStr = batch.pickup_date;
      const currentTotal = dailyData.get(pickupDateStr) || 0;
      const batchItems = items.reduce((sum: number, item: any) => sum + (item.quantity_received || 0), 0);
      dailyData.set(pickupDateStr, currentTotal + batchItems);
    });

    const categoriesList = Array.from(categorySet).sort();
    const sortedDailyData = Array.from(dailyData.entries())
      .map(([date, items]) => ({ date, items }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Display analytics information
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary Statistics', margin, currentY);
    currentY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total Linen Items Washed: ${totalLinenItems.toLocaleString()}`, margin, currentY);
    currentY += 7;

    doc.text(`Categories Washed: ${categoriesList.length}`, margin, currentY);
    currentY += 12;

    // Professional line graph with design elements
    if (sortedDailyData.length > 0) {
      // Check if we need a new page before adding graph
      if (currentY > pageHeight - 120) {
        addFooter();
        addNewPage();
      }
      
      currentY += 8;
      
      // Graph container with background
      const graphContainerWidth = pageWidth - 2 * margin;
      const graphContainerHeight = 60;
      const graphContainerY = currentY;
      
      // Title section - positioned above the container to avoid overlap
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      const titleText = 'Daily Linen Items Washed';
      const titleWidth = doc.getTextWidth(titleText);
      const titleX = (pageWidth - titleWidth) / 2; // Center the title
      doc.text(titleText, titleX, graphContainerY - 2);
      
      // Draw container background with subtle border
      doc.setFillColor(252, 252, 253);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      // Use regular rectangle (roundedRect may not be available in all jsPDF versions)
      doc.rect(margin, graphContainerY, graphContainerWidth, graphContainerHeight, 'FD');
      
      const maxItems = Math.max(...sortedDailyData.map(d => d.items));
      if (maxItems > 0) {
        // Graph area dimensions - centered within container
        const graphPadding = 15;
        const yAxisLabelWidth = 35; // Space for Y-axis labels
        const xAxisLabelHeight = 20; // Space for X-axis labels and title
        const graphWidth = graphContainerWidth - 2 * graphPadding - yAxisLabelWidth;
        const graphHeight = 35;
        const graphStartX = margin + graphPadding + yAxisLabelWidth;
        const graphStartY = graphContainerY + graphContainerHeight - xAxisLabelHeight; // Position from bottom with space for labels
        const graphEndX = graphStartX + graphWidth;
        const graphEndY = graphStartY - graphHeight;
        
        // Draw subtle grid lines (softer, more elegant)
        doc.setDrawColor(240, 242, 245);
        doc.setLineWidth(0.2);
        const ySteps = 5;
        for (let i = 0; i <= ySteps; i++) {
          const y = graphStartY - (i / ySteps) * graphHeight;
          doc.line(graphStartX, y, graphEndX, y);
        }
        
        // Draw axes with softer, more elegant lines
        doc.setDrawColor(200, 210, 220);
        doc.setLineWidth(0.5);
        doc.line(graphStartX, graphStartY, graphEndX, graphStartY); // X-axis
        doc.line(graphStartX, graphStartY, graphStartX, graphEndY); // Y-axis
        
        // Draw elegant bar chart
        if (sortedDailyData.length > 0) {
          // Calculate bar width and spacing
          const totalBars = sortedDailyData.length;
          const barSpacing = 1.5; // Space between bars in mm
          const totalSpacing = barSpacing * Math.max(0, totalBars - 1);
          const availableWidth = graphWidth - totalSpacing;
          const barWidth = Math.max(2.5, availableWidth / totalBars); // Minimum 2.5mm bar width
          
          // Draw bars for each data point
          doc.setFillColor(99, 102, 241); // Elegant indigo color
          
          for (let i = 0; i < sortedDailyData.length; i++) {
            const dataPoint = sortedDailyData[i];
            const barHeight = (dataPoint.items / maxItems) * graphHeight;
            
            // Calculate bar center position - evenly distribute across graph width
            const barCenterX = graphStartX + (i / Math.max(1, totalBars - 1)) * graphWidth;
            const barX = barCenterX - (barWidth / 2);
            const barY = graphStartY - barHeight;
            
            // Draw bar
            if (barHeight > 0) {
              // Main bar
              doc.rect(barX, barY, barWidth, barHeight, 'F');
              
              // Add subtle highlight on top of bar for depth
              doc.setFillColor(139, 142, 251); // Lighter indigo for highlight
              const highlightHeight = Math.min(barHeight * 0.15, 1.5);
              doc.rect(barX, barY, barWidth, highlightHeight, 'F');
              doc.setFillColor(99, 102, 241); // Reset to main color
            }
          }
        }
        
        // Y-axis labels with better styling
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        for (let i = 0; i <= ySteps; i++) {
          const value = Math.round((maxItems / ySteps) * i);
          const y = graphStartY - (i / ySteps) * graphHeight;
          doc.text(value.toString(), graphStartX - 8, y + 2, { align: 'right' });
        }
        
        // Y-axis title (centered vertically along the graph)
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        const yAxisTitle = 'Number of Items';
        // Position at the middle of the Y-axis, to the left of labels
        const yAxisTitleX = margin + 2; // Left position, before Y-axis labels
        const yAxisTitleY = graphStartY - (graphHeight / 2); // Centered vertically in the middle of the graph
        doc.text(yAxisTitle, yAxisTitleX, yAxisTitleY);
        
        // X-axis labels with better formatting - prevent overlap
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        if (sortedDailyData.length > 0) {
          // Calculate minimum spacing needed for labels (date format: DD/MM = ~8mm wide)
          const sampleDateStr = '31/12';
          const labelWidth = doc.getTextWidth(sampleDateStr);
          const minSpacing = labelWidth + 4; // Add 4mm padding between labels to prevent overlap
          
          // Determine how many labels we can fit without overlap
          const maxLabels = Math.max(1, Math.floor(graphWidth / minSpacing));
          const labelCount = Math.min(sortedDailyData.length, maxLabels, 7); // Cap at 7 labels
          const labelStep = Math.max(1, Math.floor(sortedDailyData.length / labelCount));
          
          // Track which indices we've already labeled
          const labeledIndices = new Set<number>();
          const placedLabels: Array<number> = []; // Track X positions to prevent overlap
          
          // Label dates at intervals
          for (let i = 0; i < sortedDailyData.length; i += labelStep) {
            const dataPoint = sortedDailyData[i];
            const date = new Date(dataPoint.date);
            const dateStr = date.toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit' });
            const x = graphStartX + (i / Math.max(1, sortedDailyData.length - 1)) * graphWidth;
            
            // Check if this position is too close to any existing label
            let tooClose = false;
            for (const existingX of placedLabels) {
              if (Math.abs(x - existingX) < minSpacing) {
                tooClose = true;
                break;
              }
            }
            
            if (!tooClose) {
              doc.text(dateStr, x, graphStartY + 4, { align: 'center' });
              labeledIndices.add(i);
              placedLabels.push(x);
            }
          }
          
          // Only show last date if it wasn't already included and has enough space
          if (sortedDailyData.length > 1) {
            const lastIndex = sortedDailyData.length - 1;
            if (!labeledIndices.has(lastIndex)) {
              const lastDate = new Date(sortedDailyData[lastIndex].date);
              const lastDateStr = lastDate.toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit' });
              const lastX = graphEndX;
              
              // Check if last position is too close to any existing label
              let tooClose = false;
              for (const existingX of placedLabels) {
                if (Math.abs(lastX - existingX) < minSpacing) {
                  tooClose = true;
                  break;
                }
              }
              
              if (!tooClose) {
                doc.text(lastDateStr, lastX, graphStartY + 4, { align: 'center' });
              }
            }
          }
        }
        
        // X-axis title - positioned closer to the graph
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        const xAxisTitle = 'Date';
        const xAxisTitleX = graphStartX + (graphWidth / 2);
        const xAxisTitleY = graphStartY + 10; // Moved closer (was 15, now 10)
        doc.text(xAxisTitle, xAxisTitleX, xAxisTitleY, { align: 'center' });
        
        // Add summary text below graph - moved lower and centered
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 116, 139);
        const avgItems = Math.round(totalLinenItems / sortedDailyData.length);
        const summaryText = `Average daily items: ${avgItems.toLocaleString()} | Peak: ${maxItems.toLocaleString()} items`;
        const summaryTextWidth = doc.getTextWidth(summaryText);
        const summaryX = (pageWidth - summaryTextWidth) / 2; // Center the summary text
        doc.text(summaryText, summaryX, graphContainerY + graphContainerHeight - 2); // Moved lower (was -8, now -2)
      } else {
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('No items data available for graph', margin + 10, graphContainerY + 30);
      }
      
      doc.setTextColor(0, 0, 0);
      currentY += graphContainerHeight + 15; // Extra space for title above
    }

    // Calculate totals
    let totalSubtotal = 0;
    let totalExpressDelivery = 0;
    let totalVat = 0;
    let totalAmount = 0;

    // Summary table header - centered on page
    // Column widths adjusted to fit A4 page (210mm width - 40mm margins = 170mm usable)
    const colWidths = [22, 35, 22, 28, 28, 28]; // Invoice #, Client, Date, Subtotal, Express Delivery, Total
    const totalTableWidth = colWidths.reduce((sum, width) => sum + width, 0);
    // Ensure table doesn't exceed page width
    const maxTableWidth = pageWidth - 2 * margin;
    const actualTableWidth = Math.min(totalTableWidth, maxTableWidth);
    const tableStartX = margin; // Left-align to ensure it fits
    
    doc.setFillColor(248, 250, 252);
    doc.rect(tableStartX, currentY - 5, actualTableWidth, 10, 'F');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    let colX = tableStartX;
    doc.text('Invoice #', colX, currentY);
    colX += colWidths[0];
    doc.text('Client', colX, currentY);
    colX += colWidths[1];
    doc.text('Date', colX + colWidths[2], currentY, { align: 'right' });
    colX += colWidths[2];
    // Right-align numeric columns
    doc.text('Subtotal', colX + colWidths[3], currentY, { align: 'right' });
    colX += colWidths[3];
    doc.text('Express', colX + colWidths[4], currentY, { align: 'right' });
    colX += colWidths[4];
    doc.text('Total', colX + colWidths[5], currentY, { align: 'right' });
    
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

      // Calculate batch subtotal including express delivery surcharges
      const items = batch.items || [];
      let batchSubtotalBase = 0;
      let batchExpressDelivery = 0;
      
      items.forEach((item: any) => {
        const qtyReceived = item.quantity_received || 0;
        const price = item.price_per_item || 0;
        const lineTotal = Math.round(qtyReceived * price * 100) / 100;
        batchSubtotalBase += lineTotal;
        
        if (item.express_delivery) {
          const surcharge = Math.round(lineTotal * 0.5 * 100) / 100;
          batchExpressDelivery += surcharge;
        }
      });
      
      const batchSubtotal = Math.round((batchSubtotalBase + batchExpressDelivery) * 100) / 100;
      const batchVat = Math.round(batchSubtotal * 0.15 * 100) / 100;
      const batchTotal = Math.round((batchSubtotal + batchVat) * 100) / 100;

      totalSubtotal += batchSubtotal;
      totalExpressDelivery += batchExpressDelivery;
      totalVat += batchVat;
      totalAmount += batchTotal;


      // Alternate row colors
      const rowIndex = batches.indexOf(batch);
      if (rowIndex % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(tableStartX, currentY - 5, actualTableWidth, 8, 'F');
      }

      // Invoice number
      let colX = tableStartX;
      const invoiceId = (batch.paper_batch_id || `#${batch.id.slice(-8).toUpperCase()}`).substring(0, 15);
      doc.text(invoiceId, colX, currentY);
      
      // Client name (truncate if too long)
      colX += colWidths[0];
      const clientName = (batch.client?.name || 'Unknown Client').substring(0, 18);
      doc.text(clientName, colX, currentY);
      
      // Date - right-aligned within column
      colX += colWidths[1];
      const pickupDate = new Date(batch.pickup_date);
      const dateStr = pickupDate.toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit', year: 'numeric' });
      doc.text(dateStr, colX + colWidths[2], currentY, { align: 'right' });
      
      // Subtotal (base amount before express delivery) - right-aligned
      colX += colWidths[2];
      doc.text(formatCurrency(batchSubtotalBase), colX + colWidths[3], currentY, { align: 'right' });
      
      // Express Delivery - right-aligned
      colX += colWidths[3];
      doc.text(formatCurrency(batchExpressDelivery), colX + colWidths[4], currentY, { align: 'right' });
      
      // Total (subtotal + express delivery + VAT) - right-aligned
      colX += colWidths[4];
      doc.text(formatCurrency(batchTotal), colX + colWidths[5], currentY, { align: 'right' });
      
      currentY += 8;
    }

    currentY += 10;

    // Total summary - aligned with centered table
    if (currentY > pageHeight - 60) {
      addFooter();
      addNewPage();
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(tableStartX, currentY, tableStartX + actualTableWidth, currentY);
    currentY += 10;

    const totalsRightAlign = tableStartX + actualTableWidth;
    const totalsLabelWidth = 80;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTALS:', tableStartX, currentY);
    currentY += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const totalSubtotalBase = totalSubtotal - totalExpressDelivery;
    doc.text('Total Subtotal (base):', tableStartX, currentY);
    doc.text(formatCurrency(totalSubtotalBase), totalsRightAlign - 2, currentY, { align: 'right' });
    currentY += 8;

    if (totalExpressDelivery > 0) {
      doc.text('Total Express Delivery:', tableStartX, currentY);
      doc.text(formatCurrency(totalExpressDelivery), totalsRightAlign - 2, currentY, { align: 'right' });
      currentY += 8;
    }

    doc.text('Total Subtotal (incl. Express):', tableStartX, currentY);
    doc.text(formatCurrency(totalSubtotal), totalsRightAlign - 2, currentY, { align: 'right' });
    currentY += 8;

    doc.text('Total VAT (15%):', tableStartX, currentY);
    doc.text(formatCurrency(totalVat), totalsRightAlign - 2, currentY, { align: 'right' });
    currentY += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('TOTAL AMOUNT (incl. VAT):', tableStartX, currentY);
    doc.text(formatCurrency(totalAmount), totalsRightAlign - 2, currentY, { align: 'right' });
    currentY += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Number of Invoices: ${batches.length}`, tableStartX, currentY);
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

      // Invoice details - aligned properly
      const leftColumn = margin;
      const rightColumn = pageWidth / 2 + 10;
      const labelWidth = 45; // Fixed width for labels to ensure alignment

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Invoice Number:', leftColumn, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(batch.paper_batch_id || `#${batch.id.slice(-8).toUpperCase()}`, leftColumn + labelWidth, currentY);
      
      currentY += 8;
      doc.setFont('helvetica', 'bold');
      doc.text('Invoice Date:', leftColumn, currentY);
      doc.setFont('helvetica', 'normal');
      // Invoice date is 1 day after pickup date
      const pickupDate = new Date(batch.pickup_date);
      const invoiceDate = new Date(pickupDate);
      invoiceDate.setDate(invoiceDate.getDate() + 1);
      doc.text(formatDate(invoiceDate), leftColumn + labelWidth, currentY);
      
      currentY += 8;
      doc.setFont('helvetica', 'bold');
      doc.text('Pickup Date:', leftColumn, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(new Date(batch.pickup_date)), leftColumn + labelWidth, currentY);

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
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      
      // Column widths: Item, Qty Sent, Qty Rec., Price, Total
      const itemColWidths = [80, 20, 20, 25, 30];
      const itemStartX = margin;
      
      // Calculate column positions (right edge for right-aligned columns)
      const colPositions = [
        itemStartX, // Item - left edge (left-aligned)
        itemStartX + itemColWidths[0], // Qty Sent - left edge of column
        itemStartX + itemColWidths[0] + itemColWidths[1], // Qty Rec. - left edge of column
        itemStartX + itemColWidths[0] + itemColWidths[1] + itemColWidths[2], // Price - left edge of column
        itemStartX + itemColWidths[0] + itemColWidths[1] + itemColWidths[2] + itemColWidths[3], // Total - left edge of column
      ];
      
      // Headers - Item left-aligned, others right-aligned
      doc.text('Item', colPositions[0], currentY);
      doc.text('Qty Sent', colPositions[1] + itemColWidths[1], currentY, { align: 'right' });
      doc.text('Qty Rec.', colPositions[2] + itemColWidths[2], currentY, { align: 'right' });
      doc.text('Price', colPositions[3] + itemColWidths[3], currentY, { align: 'right' });
      doc.text('Total', colPositions[4] + itemColWidths[4], currentY, { align: 'right' });
      
      currentY += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

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

        // Item name - left-aligned
        const itemName = (item.linen_category?.name || 'Unknown').substring(0, 35);
        doc.text(itemName, colPositions[0], currentY);
        
        // Numeric columns - right-aligned at the right edge of each column
        doc.text(qtySent.toString(), colPositions[1] + itemColWidths[1], currentY, { align: 'right' });
        doc.text(qtyReceived.toString(), colPositions[2] + itemColWidths[2], currentY, { align: 'right' });
        doc.text(formatCurrency(price), colPositions[3] + itemColWidths[3], currentY, { align: 'right' });
        doc.text(formatCurrency(lineTotal), colPositions[4] + itemColWidths[4], currentY, { align: 'right' });

        currentY += 7;
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

      // Align totals to match the "Total" column from the table above
      const totalColumnRightEdge = colPositions[4] + itemColWidths[4];
      const labelStartX = colPositions[0]; // Start labels at the same position as "Item" column

      doc.setDrawColor(200, 200, 200);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;

      // Use font size 12 throughout
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      doc.text('Subtotal (Received):', labelStartX, currentY);
      doc.text(formatCurrency(subtotalReceived), totalColumnRightEdge, currentY, { align: 'right' });
      currentY += 8;

      if (totalDiscrepancyValue !== 0) {
        doc.text('Discrepancy Adjustment:', labelStartX, currentY);
        const discText = totalDiscrepancyValue > 0 ? `+${formatCurrency(totalDiscrepancyValue)}` : formatCurrency(totalDiscrepancyValue);
        doc.text(discText, totalColumnRightEdge, currentY, { align: 'right' });
        currentY += 8;
      }

      if (totalSurcharge > 0) {
        doc.text('Express Delivery (50%):', labelStartX, currentY);
        doc.text(formatCurrency(totalSurcharge), totalColumnRightEdge, currentY, { align: 'right' });
        currentY += 8;
      }

      doc.text('Subtotal (Adjusted):', labelStartX, currentY);
      doc.text(formatCurrency(adjustedSubtotal), totalColumnRightEdge, currentY, { align: 'right' });
      currentY += 8;

      doc.text('VAT (15%):', labelStartX, currentY);
      doc.text(formatCurrency(invoiceVat), totalColumnRightEdge, currentY, { align: 'right' });
      currentY += 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12); // Keep same size, just bold
      doc.text('TOTAL:', labelStartX, currentY);
      doc.text(formatCurrency(invoiceTotal), totalColumnRightEdge, currentY, { align: 'right' });

      addFooter();
    }

    // Generate PDF blob
    const pdfBlob = doc.output('blob');

    // Return PDF as response
    const filenameMonth = targetMonth ? monthNames[targetMonth - 1] : 'all-months';
    return new NextResponse(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoices-${filenameMonth}-${targetYear}.pdf"`,
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

