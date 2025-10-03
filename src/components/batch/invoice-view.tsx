'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrencySSR } from '@/lib/utils/formatters';

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

interface InvoiceViewProps {
  batchId: string;
  paperBatchId: string;
  client: { name: string; email?: string; address?: string };
  pickup_date: string;
  items: Array<{ 
    id: string; 
    category: { name: string }; 
    quantity_sent: number;
    quantity_received: number; 
    price_per_item: number;
    discrepancy_details?: string | null;
  }>;
  subtotal: number;
  vatRate?: number; // default 0.15
}

export default function InvoiceView({ batchId, paperBatchId, client, pickup_date, items, subtotal, vatRate = 0.15 }: InvoiceViewProps) {
  const lines: InvoiceItem[] = items.map((it) => {
    const qtySent = it.quantity_sent;
    const qtyReceived = it.quantity_received;
    const price = it.price_per_item;
    const discrepancy = qtyReceived - qtySent; // Reversed: positive when more received than sent
    const discrepancyValue = discrepancy * price;
    const lineTotal = qtyReceived * price;
    
    return {
      id: it.id,
      name: it.category.name,
      quantity_sent: qtySent,
      quantity_received: qtyReceived,
      unit_price: price,
      line_total: Math.round(lineTotal * 100) / 100,
      discrepancy: discrepancy,
      discrepancy_value: Math.round(discrepancyValue * 100) / 100,
    };
  });

  // Calculate totals including discrepancy adjustments
  const subtotalReceived = lines.reduce((sum, line) => sum + line.line_total, 0);
  const totalDiscrepancyValue = lines.reduce((sum, line) => sum + line.discrepancy_value, 0);
  const adjustedSubtotal = subtotalReceived + totalDiscrepancyValue;
  
  const vat = Math.round(adjustedSubtotal * vatRate * 100) / 100;
  const total = Math.round((adjustedSubtotal + vat) * 100) / 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-slate-900 font-semibold">{client.name}</p>
            {client.email && <p className="text-sm text-slate-600">{client.email}</p>}
            {client.address && <p className="text-sm text-slate-600 whitespace-pre-wrap">{client.address}</p>}
          </div>
          <div className="text-right text-sm">
            <p className="text-slate-500">Batch</p>
            <p className="font-medium">{paperBatchId}</p>
            <p className="text-slate-500 mt-2">Pickup Date</p>
            <p className="font-medium">{new Date(pickup_date).toLocaleDateString()}</p>
            <p className="text-slate-500 mt-2">Reference</p>
            <p className="font-medium">#{batchId.slice(-8).toUpperCase()}</p>
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left py-2 px-3">Item</th>
                <th className="text-right py-2 px-3">Qty Sent</th>
                <th className="text-right py-2 px-3">Qty Received</th>
                <th className="text-right py-2 px-3">Discrepancy</th>
                <th className="text-right py-2 px-3">Unit Price</th>
                <th className="text-right py-2 px-3">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="py-2 px-3">{l.name}</td>
                  <td className="py-2 px-3 text-right">{l.quantity_sent}</td>
                  <td className="py-2 px-3 text-right">{l.quantity_received}</td>
                  <td className={`py-2 px-3 text-right ${l.discrepancy !== 0 ? (l.discrepancy > 0 ? 'text-green-600' : 'text-red-600') : ''}`}>
                    {l.discrepancy !== 0 ? (l.discrepancy > 0 ? `+${l.discrepancy}` : l.discrepancy) : '-'}
                  </td>
                  <td className="py-2 px-3 text-right">{formatCurrencySSR(l.unit_price)}</td>
                  <td className="py-2 px-3 text-right">{formatCurrencySSR(l.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-1 text-sm max-w-sm ml-auto">
          <div className="flex items-center justify-between">
            <span className="text-slate-700">Subtotal (Received)</span>
            <span className="font-semibold">{formatCurrencySSR(subtotalReceived)}</span>
          </div>
          {totalDiscrepancyValue !== 0 && (
            <div className="flex items-center justify-between">
              <span className="text-slate-700">Discrepancy Adjustment</span>
              <span className={`font-semibold ${totalDiscrepancyValue > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalDiscrepancyValue > 0 ? '+' : ''}{formatCurrencySSR(totalDiscrepancyValue)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-slate-700">Subtotal (Adjusted)</span>
            <span className="font-semibold">{formatCurrencySSR(adjustedSubtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-700">VAT (15%)</span>
            <span className="font-semibold">{formatCurrencySSR(vat)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-slate-900 font-medium">Total</span>
            <span className="text-lg font-bold">{formatCurrencySSR(total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


