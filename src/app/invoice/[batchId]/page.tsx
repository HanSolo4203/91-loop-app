'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { formatCurrencySSR } from '@/lib/utils/formatters';

interface BatchDetails {
  id: string;
  paper_batch_id: string;
  pickup_date: string;
  status: string;
  client: {
    name: string;
    email?: string;
    address?: string;
    phone?: string;
    contact_person?: string;
  };
  items: Array<{
    id: string;
    linen_categories: {
      name: string;
    };
    quantity_sent: number;
    quantity_received: number;
    price_per_item: number;
    discrepancy_details?: string | null;
  }>;
  financial_summary: {
    total_amount: number;
    total_items_sent: number;
    total_items_received: number;
    average_item_price: number;
  };
}

interface InvoiceItem {
  id: string;
  name: string;
  quantity_sent: number;
  quantity_received: number;
  unit_price: number;
  line_total: number;
  discrepancy: number;
  discrepancy_value: number;
}

export default function InvoicePage() {
  const params = useParams();
  const batchId = params.batchId as string;
  
  const [batchDetails, setBatchDetails] = useState<BatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBatchDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/batches/${batchId}`);
        const result = await response.json();

        if (result.success) {
          setBatchDetails(result.data);
        } else {
          setError(result.error || 'Failed to load invoice data');
        }
      } catch {
        setError('Failed to load invoice data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (batchId) {
      fetchBatchDetails();
    }
  }, [batchId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !batchDetails) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading invoice</p>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  // Process invoice items
  const lines: InvoiceItem[] = batchDetails.items.map((item) => {
    const qtySent = item.quantity_sent;
    const qtyReceived = item.quantity_received;
    const price = item.price_per_item;
    const discrepancy = qtyReceived - qtySent;
    const discrepancyValue = discrepancy * price;
    const lineTotal = qtyReceived * price;
    
    return {
      id: item.id,
      name: item.linen_categories.name,
      quantity_sent: qtySent,
      quantity_received: qtyReceived,
      unit_price: price,
      line_total: Math.round(lineTotal * 100) / 100,
      discrepancy: discrepancy,
      discrepancy_value: Math.round(discrepancyValue * 100) / 100,
    };
  });

  // Calculate totals
  const subtotalReceived = lines.reduce((sum, line) => sum + line.line_total, 0);
  const totalDiscrepancyValue = lines.reduce((sum, line) => sum + line.discrepancy_value, 0);
  const adjustedSubtotal = subtotalReceived + totalDiscrepancyValue;
  const vatRate = 0.15;
  const vat = Math.round(adjustedSubtotal * vatRate * 100) / 100;
  const total = Math.round((adjustedSubtotal + vat) * 100) / 100;

  // Get logo URL from Supabase storage
  const logoUrl = `https://bwuslachnnapmtenbdgq.supabase.co/storage/v1/object/public/business-logos/rsl_dynamic_italic_final444.svg`;

  return (
    <div className="min-h-screen bg-white p-8 print:p-4">
      <div className="max-w-4xl mx-auto">
        {/* Print Button - Hidden in print */}
        <div className="mb-6 print:hidden">
          <button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Print Invoice
          </button>
        </div>

        {/* Invoice Header */}
        <div className="flex items-start justify-between mb-8 border-b-2 border-blue-100 pb-8">
          <div className="flex flex-col">
            <Image 
              src={logoUrl} 
              alt="RSL Express Logo" 
              width={256}
              height={128}
              className="h-32 w-auto object-contain mb-4"
              onError={(e) => {
                // Fallback to text if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden">
              <h1 className="text-3xl font-bold text-blue-900">RSL Express</h1>
              <p className="text-blue-700 font-medium">Professional Laundry Services</p>
            </div>
            
            {/* Company Details */}
            <div className="text-slate-700 space-y-1">
              <p className="font-semibold text-lg text-slate-900">RSL Express</p>
              <p className="text-sm">Professional Laundry Services</p>
              <p className="text-sm">Cape Town, South Africa</p>
              <p className="text-sm">Email: info@rslexpress.co.za</p>
              <p className="text-sm">Phone: +27 (0) 21 XXX XXXX</p>
            </div>
          </div>
          
          <div className="text-right">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">INVOICE</h2>
            <div className="space-y-1 text-sm">
              <p className="text-slate-600">Invoice #</p>
              <p className="font-semibold text-slate-900">{batchDetails.paper_batch_id}</p>
              <p className="text-slate-600">Date</p>
              <p className="font-semibold text-slate-900">{new Date().toLocaleDateString()}</p>
              <p className="text-slate-600">Reference</p>
              <p className="font-semibold text-slate-900">#{batchDetails.id.slice(-8).toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Bill To Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Bill To:</h3>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="font-semibold text-slate-900 text-lg">{batchDetails.client.name}</p>
              {batchDetails.client.contact_person && (
                <p className="text-slate-700 mt-1">Contact: {batchDetails.client.contact_person}</p>
              )}
              {batchDetails.client.email && (
                <p className="text-slate-700">{batchDetails.client.email}</p>
              )}
              {batchDetails.client.phone && (
                <p className="text-slate-700">{batchDetails.client.phone}</p>
              )}
              {batchDetails.client.address && (
                <p className="text-slate-700 whitespace-pre-line mt-2">{batchDetails.client.address}</p>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Service Details:</h3>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Pickup Date:</span>
                  <span className="font-medium">{new Date(batchDetails.pickup_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Status:</span>
                  <span className="font-medium capitalize">{batchDetails.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Items Processed:</span>
                  <span className="font-medium">{batchDetails.financial_summary.total_items_received}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="text-left py-4 px-4 font-semibold">Item Description</th>
                  <th className="text-center py-4 px-4 font-semibold">Qty Sent</th>
                  <th className="text-center py-4 px-4 font-semibold">Qty Received</th>
                  <th className="text-center py-4 px-4 font-semibold">Discrepancy</th>
                  <th className="text-right py-4 px-4 font-semibold">Unit Price</th>
                  <th className="text-right py-4 px-4 font-semibold">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={line.id} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-blue-50'}`}>
                    <td className="py-4 px-4 font-medium text-slate-900">{line.name}</td>
                    <td className="py-4 px-4 text-center text-slate-700">{line.quantity_sent}</td>
                    <td className="py-4 px-4 text-center text-slate-700">{line.quantity_received}</td>
                    <td className={`py-4 px-4 text-center font-medium ${
                      line.discrepancy !== 0 
                        ? (line.discrepancy > 0 ? 'text-green-600' : 'text-red-600') 
                        : 'text-slate-500'
                    }`}>
                      {line.discrepancy !== 0 
                        ? (line.discrepancy > 0 ? `+${line.discrepancy}` : line.discrepancy) 
                        : '-'
                      }
                    </td>
                    <td className="py-4 px-4 text-right text-slate-700">{formatCurrencySSR(line.unit_price)}</td>
                    <td className="py-4 px-4 text-right font-semibold text-slate-900">{formatCurrencySSR(line.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Section */}
        <div className="flex justify-end">
          <div className="w-80 space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-200">
              <span className="text-slate-700">Subtotal (Received):</span>
              <span className="font-semibold">{formatCurrencySSR(subtotalReceived)}</span>
            </div>
            
            {totalDiscrepancyValue !== 0 && (
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-700">Discrepancy Adjustment:</span>
                <span className={`font-semibold ${totalDiscrepancyValue > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalDiscrepancyValue > 0 ? '+' : ''}{formatCurrencySSR(totalDiscrepancyValue)}
                </span>
              </div>
            )}
            
            <div className="flex justify-between py-2 border-b border-slate-200">
              <span className="text-slate-700">Subtotal (Adjusted):</span>
              <span className="font-semibold">{formatCurrencySSR(adjustedSubtotal)}</span>
            </div>
            
            <div className="flex justify-between py-2 border-b border-slate-200">
              <span className="text-slate-700">VAT Amount (15%):</span>
              <span className="font-semibold text-slate-700">{formatCurrencySSR(vat)}</span>
            </div>
            
            <div className="flex justify-between py-3 bg-blue-50 rounded-lg px-4 border-2 border-blue-200">
              <span className="text-lg font-bold text-blue-900">Total Amount (incl. VAT):</span>
              <span className="text-xl font-bold text-blue-900">{formatCurrencySSR(total)}</span>
            </div>
            
            <div className="mt-4 p-3 bg-slate-50 rounded-lg border text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-slate-600">Amount before VAT:</span>
                <span className="font-medium">{formatCurrencySSR(adjustedSubtotal)}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-600">VAT (15%):</span>
                <span className="font-medium">{formatCurrencySSR(vat)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="font-semibold text-slate-900">Total payable:</span>
                <span className="font-bold text-slate-900">{formatCurrencySSR(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <div className="text-center">
            <h4 className="font-semibold text-slate-900 mb-2">Payment Terms:</h4>
            <p className="text-slate-600 text-sm">Payment is due within 30 days of invoice date.</p>
            <p className="text-slate-600 text-sm mt-1">Thank you for your business!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
