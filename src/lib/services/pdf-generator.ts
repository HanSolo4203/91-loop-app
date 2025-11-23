// Dynamic import for jsPDF - loaded only when needed
import type { jsPDF } from 'jspdf';

let jsPDFModule: { default: typeof jsPDF } | null = null;

async function getJsPDF(): Promise<typeof jsPDF> {
  if (!jsPDFModule) {
    jsPDFModule = await import('jspdf');
  }
  return jsPDFModule.default;
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
    this.doc.text('Payment terms: Net 30 days', this.margin, footerY + 22);
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
}

// Factory function to create PDFGenerator instance
export async function createPDFGenerator(): Promise<PDFGenerator> {
  return new PDFGenerator();
}

// Export a singleton instance for convenience
export const pdfGenerator = new PDFGenerator();
