import jsPDF from 'jspdf';

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
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private currentY: number;

  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4');
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 20;
    this.currentY = this.margin;
  }

  private addHeader(): void {
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

  private addQuotationHeader(data: QuotationData): void {
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

  private addItemsTable(data: QuotationData): void {
    // Table header
    this.doc.setFillColor(248, 250, 252); // Light gray background
    this.doc.rect(this.margin, this.currentY - 5, this.pageWidth - 2 * this.margin, 10, 'F');
    
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    
    const colWidths = [100, 25, 30, 35]; // Item, Qty, Price, Subtotal
    const startX = this.margin;
    
    this.doc.text('Item Description', startX, this.currentY);
    this.doc.text('Qty', startX + colWidths[0], this.currentY);
    this.doc.text('Price', startX + colWidths[0] + colWidths[1], this.currentY);
    this.doc.text('Subtotal', startX + colWidths[0] + colWidths[1] + colWidths[2], this.currentY);
    
    this.currentY += 15;
    
    // Table rows
    this.doc.setFont('helvetica', 'normal');
    
    data.items.forEach((item, index) => {
      // Alternate row colors
      if (index % 2 === 0) {
        this.doc.setFillColor(249, 250, 251);
        this.doc.rect(this.margin, this.currentY - 5, this.pageWidth - 2 * this.margin, 10, 'F');
      }
      
      // Item details
      this.doc.text(item.name, startX, this.currentY);
      this.doc.text(item.quantity.toString(), startX + colWidths[0], this.currentY);
      this.doc.text(`R${item.price.toFixed(2)}`, startX + colWidths[0] + colWidths[1], this.currentY);
      this.doc.text(`R${item.subtotal.toFixed(2)}`, startX + colWidths[0] + colWidths[1] + colWidths[2], this.currentY);
      
      this.currentY += 10;
      
      // Check if we need a new page
      if (this.currentY > this.pageHeight - 60) {
        this.addNewPage();
        this.addTableHeader(colWidths, startX);
      }
    });
    
    this.currentY += 10;
  }

  private addTableHeader(colWidths: number[], startX: number): void {
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

  private addNewPage(): void {
    this.doc.addPage();
    this.currentY = this.margin;
  }

  private addTotals(data: QuotationData): void {
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

  private addFooter(): void {
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

  public generateQuotation(data: Partial<QuotationData>): void {
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
    this.addHeader();
    this.addQuotationHeader(quotationData);
    this.addItemsTable(quotationData);
    this.addTotals(quotationData);
    this.addFooter();

    // Open PDF in new tab
    const pdfBlob = this.doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
    
    // Clean up the URL after a short delay
    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 1000);
  }

  public generateQuotationBlob(data: Partial<QuotationData>): Blob {
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
    const doc = new jsPDF('p', 'mm', 'a4');
    this.doc = doc;
    this.pageWidth = doc.internal.pageSize.getWidth();
    this.pageHeight = doc.internal.pageSize.getHeight();
    this.currentY = this.margin;

    // Generate PDF content
    this.addHeader();
    this.addQuotationHeader(quotationData);
    this.addItemsTable(quotationData);
    this.addTotals(quotationData);
    this.addFooter();

    return this.doc.output('blob');
  }
}

// Export a singleton instance
export const pdfGenerator = new PDFGenerator();
