'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrencySSR } from '@/lib/utils/formatters';
import { Download, FileText, Receipt, AlertTriangle } from 'lucide-react';

export interface BatchInvoiceItem {
  rfid_number: string;
  category: string;
  qty_washed_this_batch: number;
  washes_remaining_before?: number;
  washes_remaining_after: number;
  price_per_wash: number;
  line_total: number;
  near_end_of_life?: boolean;
}

export interface BatchInvoiceData {
  batch_ref: string;
  scan_date: string;
  location: string;
  scanned_by: string;
  total_items: number;
  total_washes: number;
  subtotal: number;
  vat_amount: number;
  grand_total: number;
  items: BatchInvoiceItem[];
  category_breakdown: Array<{
    category: string;
    item_count: number;
    total_washes: number;
    price_per_wash: number;
    subtotal: number;
  }>;
  near_end_of_life_items?: BatchInvoiceItem[];
}

interface BatchInvoiceModalProps {
  data: BatchInvoiceData;
  onDownloadPDF: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export default function BatchInvoiceModal({
  data,
  onDownloadPDF,
  onConfirm,
  isLoading = false,
}: BatchInvoiceModalProps) {
  const nearEndCount = data.near_end_of_life_items?.length ?? 0;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="batch-summary" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="batch-summary" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Batch Summary
          </TabsTrigger>
          <TabsTrigger value="client-invoice" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Client Invoice
          </TabsTrigger>
        </TabsList>

        <TabsContent value="batch-summary" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">RSL Express Internal – Batch Summary</CardTitle>
              <p className="text-sm text-slate-600">Batch reference: {data.batch_ref}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Date</p>
                  <p className="font-medium">{data.scan_date}</p>
                </div>
                <div>
                  <p className="text-slate-500">Location</p>
                  <p className="font-medium">{data.location}</p>
                </div>
                <div>
                  <p className="text-slate-500">Scanned by</p>
                  <p className="font-medium">{data.scanned_by || '–'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Items</p>
                  <p className="font-medium">{data.total_items}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Category Breakdown</h4>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left py-2 px-3">Category</th>
                        <th className="text-right py-2 px-3">Item Count</th>
                        <th className="text-right py-2 px-3">Total Washes</th>
                        <th className="text-right py-2 px-3">Price/Wash</th>
                        <th className="text-right py-2 px-3">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.category_breakdown.map((cb, i) => (
                        <tr key={i} className="border-t">
                          <td className="py-2 px-3">{cb.category}</td>
                          <td className="py-2 px-3 text-right">{cb.item_count}</td>
                          <td className="py-2 px-3 text-right">{cb.total_washes}</td>
                          <td className="py-2 px-3 text-right">{formatCurrencySSR(cb.price_per_wash)}</td>
                          <td className="py-2 px-3 text-right font-medium">{formatCurrencySSR(cb.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {nearEndCount > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Items Near End of Life ({nearEndCount})
                  </h4>
                  <div className="overflow-x-auto border rounded-lg border-amber-200 bg-amber-50/50">
                    <table className="min-w-full text-sm">
                      <thead className="bg-amber-100/50">
                        <tr>
                          <th className="text-left py-2 px-3">RFID Number</th>
                          <th className="text-left py-2 px-3">Category</th>
                          <th className="text-right py-2 px-3">Washes Remaining</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.near_end_of_life_items?.map((item, i) => (
                          <tr key={i} className="border-t border-amber-200/50">
                            <td className="py-2 px-3 font-mono text-red-800">{item.rfid_number}</td>
                            <td className="py-2 px-3">{item.category}</td>
                            <td className="py-2 px-3 text-right font-semibold text-red-700">
                              {item.washes_remaining_after}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="space-y-1 text-sm max-w-sm ml-auto">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-semibold">{formatCurrencySSR(data.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">VAT (15%)</span>
                  <span className="font-semibold">{formatCurrencySSR(data.vat_amount)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t text-base">
                  <span className="font-medium">Grand Total (ZAR)</span>
                  <span className="font-bold">{formatCurrencySSR(data.grand_total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="client-invoice" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">RSL Express</CardTitle>
                  <p className="text-sm text-slate-600 mt-1">Invoice for 91 Loop Hostel</p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-slate-500">Invoice #</p>
                  <p className="font-medium">{data.batch_ref}</p>
                  <p className="text-slate-500 mt-1">Date</p>
                  <p className="font-medium">{data.scan_date}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Bill to: 91 Loop Hostel</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Line Items</h4>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left py-2 px-3">Category</th>
                        <th className="text-right py-2 px-3">Qty Washed</th>
                        <th className="text-right py-2 px-3">Unit Price</th>
                        <th className="text-right py-2 px-3">Line Total</th>
                        <th className="text-center py-2 px-3">Lifecycle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((item, i) => {
                        const washesUsed = 500 - item.washes_remaining_after;
                        const pct = Math.min(100, Math.round((washesUsed / 500) * 100));
                        return (
                          <tr key={i} className="border-t">
                            <td className="py-2 px-3">{item.category}</td>
                            <td className="py-2 px-3 text-right">{item.qty_washed_this_batch}</td>
                            <td className="py-2 px-3 text-right">{formatCurrencySSR(item.price_per_wash)}</td>
                            <td className="py-2 px-3 text-right font-medium">{formatCurrencySSR(item.line_total)}</td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 min-w-[60px] h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      item.near_end_of_life ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-green-500'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-slate-500 whitespace-nowrap">
                                  {washesUsed}/500
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-1 text-sm max-w-sm ml-auto">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-semibold">{formatCurrencySSR(data.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">VAT (15%)</span>
                  <span className="font-semibold">{formatCurrencySSR(data.vat_amount)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t text-base">
                  <span className="font-medium">Grand Total (ZAR)</span>
                  <span className="font-bold">{formatCurrencySSR(data.grand_total)}</span>
                </div>
              </div>

              {nearEndCount > 0 && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Lifecycle health: {nearEndCount} item{nearEndCount !== 1 ? 's' : ''} flagged for replacement.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-3 justify-end pt-4 border-t">
        <button
          type="button"
          onClick={onDownloadPDF}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : null}
          Confirm & Save Batch
        </button>
      </div>
    </div>
  );
}
