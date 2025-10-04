import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 'demo-key');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerName,
      customerEmail,
      items,
      subtotal,
      vatAmount,
      total,
      quotationNumber
    } = body;

    // Validate required fields
    if (!customerEmail) {
      return NextResponse.json(
        { success: false, error: 'Customer email is required' },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No items found in quotation' },
        { status: 400 }
      );
    }

    // Generate PDF
    const pdfBlob = await generatePDFBlob({
      customerName,
      items,
      subtotal,
      vatAmount,
      total,
      quotationNumber
    });

    // Convert blob to base64 for email attachment
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
    const pdfBase64 = pdfBuffer.toString('base64');

    // Email content
    const subject = `RSL Express Quotation - ${quotationNumber}`;
    const emailBody = generateEmailBody({
      customerName,
      quotationNumber,
      items,
      subtotal,
      vatAmount,
      total
    });

    // Check if API key is configured
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'demo-key') {
      return NextResponse.json({
        success: false,
        error: 'Email service not configured. Please add RESEND_API_KEY to environment variables.'
      }, { status: 503 });
    }

    // Send email
    const { data, error } = await resend.emails.send({
      from: 'RSL Express <quotations@rslexpress.co.za>',
      to: [customerEmail],
      subject,
      html: emailBody,
      attachments: [
        {
          filename: `RSL_Quotation_${quotationNumber}.pdf`,
          content: pdfBase64,
          contentType: 'application/pdf'
        }
      ]
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: data?.id,
      message: 'Quotation sent successfully'
    });

  } catch (error) {
    console.error('Email quotation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to generate PDF blob
async function generatePDFBlob(quotationData: {
  customerName: string;
  items: Array<{ name: string; quantity: number; price: number; total: number }>;
  subtotal: number;
  vatAmount: number;
  total: number;
  quotationNumber: string;
}): Promise<Blob> {
  try {
    // Dynamic import for server-side use
    const { PDFGenerator } = await import('@/lib/services/pdf-generator');
    const generator = new PDFGenerator();
    
    // Transform items to match PDF generator expectations
    const transformedData = {
      ...quotationData,
      items: quotationData.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.total // Map total to subtotal
      }))
    };
    
    // Generate the PDF blob
    return generator.generateQuotationBlob(transformedData);
  } catch (error) {
    console.error('Error generating PDF blob:', error);
    throw error;
  }
}

// Helper function to generate email body HTML
function generateEmailBody({
  customerName,
  quotationNumber,
  items,
  subtotal,
  vatAmount,
  total
}: {
  customerName: string;
  quotationNumber: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  subtotal: number;
  vatAmount: number;
  total: number;
}) {
  const itemsList = items.map(item => 
    `<tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">R${item.price.toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">R${item.subtotal.toFixed(2)}</td>
    </tr>`
  ).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RSL Express Quotation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 5px 0 0 0; font-size: 14px; opacity: 0.9; }
        .content { margin-bottom: 30px; }
        .quotation-details { background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th { background-color: #e2e8f0; padding: 12px 8px; text-align: left; font-weight: bold; }
        .items-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
        .totals { background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin-top: 20px; }
        .totals table { width: 100%; }
        .totals td { padding: 5px 0; }
        .totals .total-row { font-weight: bold; font-size: 18px; border-top: 2px solid #2563eb; padding-top: 10px; }
        .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
        .contact-info { background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 20px; }
        .contact-info p { margin: 5px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>RSL Express</h1>
        <p>Professional Linen Services</p>
      </div>

      <div class="content">
        <p>Dear ${customerName},</p>
        
        <p>Thank you for your interest in our professional linen services. Please find attached your detailed quotation.</p>

        <div class="quotation-details">
          <h3>Quotation Details</h3>
          <p><strong>Quotation Number:</strong> ${quotationNumber}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-ZA', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
        </div>

        <h3>Items Quoted</h3>
        <table class="items-table">
          <thead>
            <tr>
              <th>Item Description</th>
              <th style="text-align: center;">Quantity</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
          </tbody>
        </table>

        <div class="totals">
          <table>
            <tr>
              <td>Subtotal:</td>
              <td style="text-align: right;">R${subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td>VAT (15%):</td>
              <td style="text-align: right;">R${vatAmount.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td>TOTAL:</td>
              <td style="text-align: right;">R${total.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <p>This quotation is valid for 30 days from the date of issue. Please don't hesitate to contact us if you have any questions or would like to proceed with this quotation.</p>

        <div class="contact-info">
          <h4>Contact Information</h4>
          <p><strong>Phone:</strong> +27 11 123 4567</p>
          <p><strong>Email:</strong> info@rslexpress.co.za</p>
          <p><strong>Website:</strong> www.rslexpress.co.za</p>
        </div>
      </div>

      <div class="footer">
        <p>Thank you for choosing RSL Express Services</p>
        <p>This quotation was generated electronically and is valid without signature.</p>
      </div>
    </body>
    </html>
  `;
}
