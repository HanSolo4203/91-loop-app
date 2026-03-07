// Dynamic import for jsPDF - loaded only when needed
import type { jsPDF } from 'jspdf';

let jsPDFModule: { default: typeof jsPDF } | null = null;

async function getJsPDF(): Promise<typeof jsPDF> {
  if (!jsPDFModule) {
    jsPDFModule = await import('jspdf');
  }
  return jsPDFModule.default;
}

export interface PayrollData {
  periodStart: string;
  periodEnd: string;
  status: string;
  date: string;
  items: Array<{
    employeeName: string;
    biWeeklySalary: number;
    deductions: number;
    netPay: number;
    notes?: string;
  }>;
  totalAmount: number;
}

export interface QuotationData {
  quotationNumber: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  subtotal: number;
  vatAmount: number;
  total: number;
  date: string;
}

export interface RFIDInvoicePDFData {
  invoice_number: string;
  location: string;
  generated_by: string;
  date: string;
  bill_to?: string;
  items: Array<{
    rfid_number: string;
    category: string;
    qty_washed: number;
    washes_remaining: number;
    price_per_wash: number;
    line_total: number;
  }>;
  subtotal: number;
  vatAmount: number;
  total: number;
  total_items: number;
  category_breakdown: Array<{ category: string; count: number }>;
  lifecycle_health_summary?: string; // e.g. "16 items flagged for replacement"
  business_settings?: {
    company_name?: string;
    bank_name?: string;
    bank_account_number?: string;
    bank_branch_code?: string;
    bank_account_type?: string;
    payment_terms_days?: number;
  };
}

export class PDFGenerator {
  private doc: jsPDF | null = null;
  private pageWidth: number = 0;
  private pageHeight: number = 0;
  private margin: number = 20;
  private currentY: number = 20;

  private async initialize() {
    if (!this.doc) {
      const jsPDF = await getJsPDF();
      this.doc = new jsPDF('p', 'mm', 'a4');
      this.pageWidth = this.doc.internal.pageSize.getWidth();
      this.pageHeight = this.doc.internal.pageSize.getHeight();
      this.currentY = this.margin;
    }
  }

  private async addHeader(): Promise<void> {
    await this.initialize();
    if (!this.doc) return;
    // RSL Logo/Header
    this.doc.setFillColor(37, 99, 235); // Blue color
    this.doc.rect(0, 0, this.pageWidth, 30, 'F');
    
    // RSL Text
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('RSL Express', this.margin, 20);
    
    // Subtitle
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Professional Linen Services', this.margin + 60, 20);
    
    // Contact info
    this.doc.setFontSize(10);
    this.doc.text('Tel: +27 11 123 4567', this.pageWidth - 60, 12);
    this.doc.text('Email: info@rslexpress.co.za', this.pageWidth - 60, 18);
    this.doc.text('Web: www.rslexpress.co.za', this.pageWidth - 60, 24);
    
    this.currentY = 45;
  }

  private async addQuotationHeader(data: QuotationData): Promise<void> {
    await this.initialize();
    if (!this.doc) return;
    // Quotation title
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('QUOTATION', this.margin, this.currentY);
    
    this.currentY += 15;
    
    // Quotation details in two columns
    const leftColumn = this.margin;
    const rightColumn = this.pageWidth / 2 + 10;
    
    // Left column - Quotation info
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Quotation Number:', leftColumn, this.currentY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(data.quotationNumber, leftColumn + 40, this.currentY);
    
    this.currentY += 8;
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Date:', leftColumn, this.currentY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(data.date, leftColumn + 40, this.currentY);
    
    // Right column - Customer info
    this.currentY -= 8;
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Bill To:', rightColumn, this.currentY);
    
    this.currentY += 8;
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(data.customerName, rightColumn, this.currentY);
    
    if (data.customerEmail) {
      this.currentY += 6;
      this.doc.text(data.customerEmail, rightColumn, this.currentY);
    }
    
    this.currentY += 20;
  }

  private async addItemsTable(data: QuotationData): Promise<void> {
    await this.initialize();
    if (!this.doc) return;
    const doc = this.doc; // Store in local variable for type narrowing
    
    // Table header
    doc.setFillColor(248, 250, 252); // Light gray background
    doc.rect(this.margin, this.currentY - 5, this.pageWidth - 2 * this.margin, 10, 'F');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    const colWidths = [100, 25, 30, 35]; // Item, Qty, Price, Subtotal
    const startX = this.margin;
    
    doc.text('Item Description', startX, this.currentY);
    doc.text('Qty', startX + colWidths[0], this.currentY);
    doc.text('Price', startX + colWidths[0] + colWidths[1], this.currentY);
    doc.text('Subtotal', startX + colWidths[0] + colWidths[1] + colWidths[2], this.currentY);
    
    this.currentY += 15;
    
    // Table rows
    doc.setFont('helvetica', 'normal');
    
    for (const [index, item] of data.items.entries()) {
      // Alternate row colors
      if (index % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(this.margin, this.currentY - 5, this.pageWidth - 2 * this.margin, 10, 'F');
      }
      
      // Item details
      doc.text(item.name, startX, this.currentY);
      doc.text(item.quantity.toString(), startX + colWidths[0], this.currentY);
      doc.text(`R${item.price.toFixed(2)}`, startX + colWidths[0] + colWidths[1], this.currentY);
      doc.text(`R${item.subtotal.toFixed(2)}`, startX + colWidths[0] + colWidths[1] + colWidths[2], this.currentY);
      
      this.currentY += 10;
      
      // Check if we need a new page
      if (this.currentY > this.pageHeight - 60) {
        await this.addNewPage();
        await this.addTableHeader(colWidths, startX);
      }
    }
    
    this.currentY += 10;
  }

  private async addTableHeader(colWidths: number[], startX: number): Promise<void> {
    await this.initialize();
    if (!this.doc) return;
    this.doc.setFillColor(248, 250, 252);
    this.doc.rect(this.margin, this.currentY - 5, this.pageWidth - 2 * this.margin, 10, 'F');
    
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    
    this.doc.text('Item Description', startX, this.currentY);
    this.doc.text('Qty', startX + colWidths[0], this.currentY);
    this.doc.text('Price', startX + colWidths[0] + colWidths[1], this.currentY);
    this.doc.text('Subtotal', startX + colWidths[0] + colWidths[1] + colWidths[2], this.currentY);
    
    this.currentY += 15;
  }

  private async addNewPage(): Promise<void> {
    await this.initialize();
    if (!this.doc) return;
    this.doc.addPage();
    this.currentY = this.margin;
  }

  private async addTotals(data: QuotationData): Promise<void> {
    await this.initialize();
    if (!this.doc) return;
    const rightAlign = this.pageWidth - this.margin;
    const labelWidth = 50;
    
    // Line separator
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margin, this.currentY, rightAlign, this.currentY);
    this.currentY += 10;
    
    // Subtotal
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Subtotal:', rightAlign - labelWidth - 30, this.currentY);
    this.doc.text(`R${data.subtotal.toFixed(2)}`, rightAlign - 30, this.currentY);
    this.currentY += 8;
    
    // VAT
    this.doc.text('VAT (15%):', rightAlign - labelWidth - 30, this.currentY);
    this.doc.text(`R${data.vatAmount.toFixed(2)}`, rightAlign - 30, this.currentY);
    this.currentY += 8;
    
    // Total
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(14);
    this.doc.text('TOTAL:', rightAlign - labelWidth - 30, this.currentY);
    this.doc.text(`R${data.total.toFixed(2)}`, rightAlign - 30, this.currentY);
    
    this.currentY += 20;
  }

  private async addFooter(): Promise<void> {
    await this.initialize();
    if (!this.doc) return;
    const footerY = this.pageHeight - 30;
    
    // Footer line
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margin, footerY, this.pageWidth - this.margin, footerY);
    
    // Footer text
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 100, 100);
    
    const footerText = 'Thank you for choosing RSL Express Services';
    const textWidth = this.doc.getTextWidth(footerText);
    const centerX = (this.pageWidth - textWidth) / 2;
    
    this.doc.text(footerText, centerX, footerY + 10);
    
    // Terms
    this.doc.setFontSize(8);
    this.doc.text('This quotation is valid for 30 days from the date of issue.', this.margin, footerY + 18);
    this.doc.text('Payment terms: Net 8 days', this.margin, footerY + 22);
  }

  private generateQuotationNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const timestamp = now.getTime().toString().slice(-6);
    return `RSL-${year}-Q${timestamp}`;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  public async generateQuotation(data: Partial<QuotationData>): Promise<void> {
    // Set default values
    const quotationData: QuotationData = {
      quotationNumber: data.quotationNumber || this.generateQuotationNumber(),
      customerName: data.customerName || 'RSL Express Services',
      customerEmail: data.customerEmail || '',
      items: data.items || [],
      subtotal: data.subtotal || 0,
      vatAmount: data.vatAmount || 0,
      total: data.total || 0,
      date: data.date || this.formatDate(new Date())
    };

    // Generate PDF content
    await this.addHeader();
    await this.addQuotationHeader(quotationData);
    await this.addItemsTable(quotationData);
    await this.addTotals(quotationData);
    await this.addFooter();

    if (!this.doc) return;

    // Open PDF in new tab
    const pdfBlob = this.doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
    
    // Clean up the URL after a short delay
    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 1000);
  }

  public async generatePayrollPDF(data: PayrollData): Promise<void> {
    await this.initialize();
    if (!this.doc) return;

    // Header
    await this.addHeader();

    // Payroll title
    this.doc!.setTextColor(0, 0, 0);
    this.doc!.setFontSize(20);
    this.doc!.setFont('helvetica', 'bold');
    this.doc!.text('PAYROLL SUMMARY', this.margin, this.currentY);
    this.currentY += 12;

    this.doc!.setFontSize(12);
    this.doc!.setFont('helvetica', 'normal');
    this.doc!.text(`Period: ${data.periodStart} – ${data.periodEnd}`, this.margin, this.currentY);
    this.currentY += 8;
    this.doc!.text(`Status: ${data.status}`, this.margin, this.currentY);
    this.currentY += 8;
    this.doc!.text(`Generated: ${data.date}`, this.margin, this.currentY);
    this.currentY += 20;

    // Table
    const colWidths = [70, 35, 35, 35, 40];
    const startX = this.margin;

    this.doc!.setFillColor(248, 250, 252);
    this.doc!.rect(this.margin, this.currentY - 5, this.pageWidth - 2 * this.margin, 10, 'F');
    this.doc!.setTextColor(0, 0, 0);
    this.doc!.setFontSize(10);
    this.doc!.setFont('helvetica', 'bold');
    this.doc!.text('Employee', startX, this.currentY);
    this.doc!.text('Salary', startX + colWidths[0], this.currentY);
    this.doc!.text('Deductions', startX + colWidths[0] + colWidths[1], this.currentY);
    this.doc!.text('Net Pay', startX + colWidths[0] + colWidths[1] + colWidths[2], this.currentY);
    this.doc!.text('Notes', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], this.currentY);
    this.currentY += 12;

    this.doc!.setFont('helvetica', 'normal');
    for (const [i, item] of data.items.entries()) {
      if (i % 2 === 0) {
        this.doc!.setFillColor(249, 250, 251);
        this.doc!.rect(this.margin, this.currentY - 5, this.pageWidth - 2 * this.margin, 10, 'F');
      }
      this.doc!.text(item.employeeName.slice(0, 25), startX, this.currentY);
      this.doc!.text(`R${item.biWeeklySalary.toFixed(2)}`, startX + colWidths[0], this.currentY);
      this.doc!.text(`R${item.deductions.toFixed(2)}`, startX + colWidths[0] + colWidths[1], this.currentY);
      this.doc!.text(`R${item.netPay.toFixed(2)}`, startX + colWidths[0] + colWidths[1] + colWidths[2], this.currentY);
      this.doc!.text((item.notes || '-').slice(0, 15), startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], this.currentY);
      this.currentY += 10;
      if (this.currentY > this.pageHeight! - 60) {
        await this.addNewPage();
        this.doc!.setFillColor(248, 250, 252);
        this.doc!.rect(this.margin, this.currentY - 5, this.pageWidth - 2 * this.margin, 10, 'F');
        this.doc!.setFont('helvetica', 'bold');
        this.doc!.text('Employee', startX, this.currentY);
        this.doc!.text('Salary', startX + colWidths[0], this.currentY);
        this.doc!.text('Deductions', startX + colWidths[0] + colWidths[1], this.currentY);
        this.doc!.text('Net Pay', startX + colWidths[0] + colWidths[1] + colWidths[2], this.currentY);
        this.doc!.text('Notes', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], this.currentY);
        this.currentY += 12;
        this.doc!.setFont('helvetica', 'normal');
      }
    }

    this.currentY += 10;
    this.doc!.setDrawColor(200, 200, 200);
    this.doc!.line(this.margin, this.currentY, this.pageWidth! - this.margin, this.currentY);
    this.currentY += 12;
    this.doc!.setFont('helvetica', 'bold');
    this.doc!.text('TOTAL:', this.margin, this.currentY);
    this.doc!.text(`R${data.totalAmount.toFixed(2)}`, this.pageWidth! - this.margin - 40, this.currentY);

    const pdfBlob = this.doc!.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
  }

  public async generateQuotationBlob(data: Partial<QuotationData>): Promise<Blob> {
    // Set default values
    const quotationData: QuotationData = {
      quotationNumber: data.quotationNumber || this.generateQuotationNumber(),
      customerName: data.customerName || 'RSL Express Services',
      customerEmail: data.customerEmail || '',
      items: data.items || [],
      subtotal: data.subtotal || 0,
      vatAmount: data.vatAmount || 0,
      total: data.total || 0,
      date: data.date || this.formatDate(new Date())
    };

    // Create a new document for the blob
    const jsPDF = await getJsPDF();
    const doc = new jsPDF('p', 'mm', 'a4');
    this.doc = doc;
    this.pageWidth = doc.internal.pageSize.getWidth();
    this.pageHeight = doc.internal.pageSize.getHeight();
    this.currentY = this.margin;

    // Generate PDF content
    await this.addHeader();
    await this.addQuotationHeader(quotationData);
    await this.addItemsTable(quotationData);
    await this.addTotals(quotationData);
    await this.addFooter();

    if (!this.doc) throw new Error('Failed to generate PDF');

    return this.doc.output('blob');
  }

  private async addRFIDInvoiceHeader(data: RFIDInvoicePDFData): Promise<void> {
    await this.initialize();
    if (!this.doc) return;
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('INVOICE', this.margin, this.currentY);
    this.currentY += 15;

    const leftColumn = this.margin;
    const rightColumn = this.pageWidth / 2 + 10;

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Invoice Number:', leftColumn, this.currentY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(data.invoice_number, leftColumn + 40, this.currentY);

    this.currentY += 8;
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Date:', leftColumn, this.currentY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(data.date, leftColumn + 40, this.currentY);

    this.currentY -= 8;
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Bill To:', rightColumn, this.currentY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(data.bill_to ?? data.location, rightColumn, this.currentY + 6);
    this.currentY += 14;

    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Generated by:', rightColumn, this.currentY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(data.generated_by || '-', rightColumn, this.currentY);

    this.currentY += 20;
  }

  private async addRFIDInvoiceItemsTable(data: RFIDInvoicePDFData): Promise<void> {
    await this.initialize();
    if (!this.doc) return;
    const doc = this.doc;

    doc.setFillColor(248, 250, 252);
    doc.rect(this.margin, this.currentY - 5, this.pageWidth - 2 * this.margin, 10, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');

    const colWidths = [28, 35, 22, 30, 28, 30];
    const startX = this.margin;

    doc.text('RFID', startX, this.currentY);
    doc.text('Category', startX + colWidths[0], this.currentY);
    doc.text('QTY Wash', startX + colWidths[0] + colWidths[1], this.currentY);
    doc.text('Remaining', startX + colWidths[0] + colWidths[1] + colWidths[2], this.currentY);
    doc.text('Price', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], this.currentY);
    doc.text('Line Total', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], this.currentY);

    this.currentY += 10;
    doc.setFont('helvetica', 'normal');

    for (const [index, item] of data.items.entries()) {
      if (index % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(this.margin, this.currentY - 5, this.pageWidth - 2 * this.margin, 8, 'F');
      }
      const truncate = (s: string, len: number) => (s.length > len ? s.slice(0, len - 1) + '…' : s);
      doc.text(truncate(item.rfid_number, 8), startX, this.currentY);
      doc.text(truncate(item.category, 12), startX + colWidths[0], this.currentY);
      doc.text(item.qty_washed.toString(), startX + colWidths[0] + colWidths[1], this.currentY);
      doc.text(item.washes_remaining.toString(), startX + colWidths[0] + colWidths[1] + colWidths[2], this.currentY);
      doc.text(`R${item.price_per_wash.toFixed(2)}`, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], this.currentY);
      doc.text(`R${item.line_total.toFixed(2)}`, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], this.currentY);

      this.currentY += 8;
      if (this.currentY > this.pageHeight - 80) {
        await this.addNewPage();
      }
    }
    this.currentY += 10;
  }

  private async addRFIDInvoiceTotals(data: RFIDInvoicePDFData): Promise<void> {
    await this.initialize();
    if (!this.doc) return;
    const rightAlign = this.pageWidth - this.margin;
    const labelWidth = 50;

    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margin, this.currentY, rightAlign, this.currentY);
    this.currentY += 10;

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Subtotal:', rightAlign - labelWidth - 30, this.currentY);
    this.doc.text(`R${data.subtotal.toFixed(2)}`, rightAlign - 30, this.currentY);
    this.currentY += 8;

    this.doc.text('VAT (15%):', rightAlign - labelWidth - 30, this.currentY);
    this.doc.text(`R${data.vatAmount.toFixed(2)}`, rightAlign - 30, this.currentY);
    this.currentY += 8;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(14);
    this.doc.text('Grand Total (ZAR):', rightAlign - labelWidth - 30, this.currentY);
    this.doc.text(`R${data.total.toFixed(2)}`, rightAlign - 30, this.currentY);
    this.currentY += 12;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.text(`Total items: ${data.total_items}`, this.margin, this.currentY);
    this.currentY += 6;
    if (data.lifecycle_health_summary) {
      this.doc.setTextColor(180, 83, 9); // amber-700
      this.doc.text(data.lifecycle_health_summary, this.margin, this.currentY);
      this.doc.setTextColor(0, 0, 0);
      this.currentY += 6;
    }
    if (data.category_breakdown.length > 0) {
      this.doc.text(
        `Breakdown: ${data.category_breakdown.map((c) => `${c.category} × ${c.count}`).join(', ')}`,
        this.margin,
        this.currentY
      );
      this.currentY += 6;
    }
    if (data.business_settings) {
      const bs = data.business_settings;
      this.currentY += 8;
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Payment Details', this.margin, this.currentY);
      this.doc.setFont('helvetica', 'normal');
      this.currentY += 6;
      if (bs.company_name) {
        this.doc.text(bs.company_name, this.margin, this.currentY);
        this.currentY += 5;
      }
      if (bs.bank_name) {
        this.doc.text(`Bank: ${bs.bank_name}`, this.margin, this.currentY);
        this.currentY += 5;
      }
      if (bs.bank_account_number) {
        this.doc.text(`Account: ${bs.bank_account_number}`, this.margin, this.currentY);
        this.currentY += 5;
      }
      if (bs.bank_branch_code) {
        this.doc.text(`Branch: ${bs.bank_branch_code}`, this.margin, this.currentY);
        this.currentY += 5;
      }
      if (bs.payment_terms_days != null) {
        this.doc.text(`Payment terms: Net ${bs.payment_terms_days} days`, this.margin, this.currentY);
        this.currentY += 5;
      }
    }
    this.currentY += 15;
  }

  public async generateRFIDInvoiceBlob(data: RFIDInvoicePDFData): Promise<Blob> {
    const jsPDF = await getJsPDF();
    const doc = new jsPDF('p', 'mm', 'a4');
    this.doc = doc;
    this.pageWidth = doc.internal.pageSize.getWidth();
    this.pageHeight = doc.internal.pageSize.getHeight();
    this.currentY = this.margin;

    await this.addHeader();
    await this.addRFIDInvoiceHeader(data);
    await this.addRFIDInvoiceItemsTable(data);
    await this.addRFIDInvoiceTotals(data);
    await this.addFooter();

    if (!this.doc) throw new Error('Failed to generate PDF');
    return this.doc.output('blob');
  }

  public async generateRFIDInvoicePDF(data: RFIDInvoicePDFData): Promise<void> {
    const blob = await this.generateRFIDInvoiceBlob(data);
    const pdfUrl = URL.createObjectURL(blob);
    window.open(pdfUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
  }
}

// Factory function to create PDFGenerator instance
export async function createPDFGenerator(): Promise<PDFGenerator> {
  return new PDFGenerator();
}

// Export a singleton instance for convenience
export const pdfGenerator = new PDFGenerator();
