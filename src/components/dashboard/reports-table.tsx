'use client';

import { useEffect, useState, Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import MonthSelector from '@/components/dashboard/month-selector';
import { formatCurrencySSR } from '@/lib/utils/formatters';
import { AlertCircle, FileSpreadsheet, RefreshCw, ChevronDown, ChevronRight, AlertTriangle, Download, FileText, Printer, FileDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { BLUR_DATA_URL } from '@/lib/utils/image-helpers';
import { useReports } from '@/lib/hooks/use-reports';

interface ClientInvoiceSummary {
  client_id: string;
  client_name: string;
  logo_url: string | null;
  total_items_washed: number;
  total_amount: number;
  batch_count: number;
  discrepancy_batches: number;
}

interface BatchRow {
  id: string;
  pickup_date: string;
  paper_batch_id: string | null;
  status: string;
  has_discrepancy: boolean;
  total_items_received: number;
  total_amount: number;
}

interface InvoiceItem {
  category_name: string;
  quantity_sent: number | null;
  quantity_received: number | null;
  unit_price: number | null;
  line_total: number;
  discrepancy: number;
}

interface InvoiceData {
  client_name: string;
  client_logo_url: string | null;
  pickup_date: string;
  paper_batch_id: string | null;
  has_discrepancy: boolean;
  total_amount: number;
  items: InvoiceItem[];
}

const buildMonthParam = (monthValue: number | null, yearValue: number) => {
  if (monthValue === null) {
    return `${yearValue}-all`;
  }
  return `${yearValue}-${String(monthValue + 1).padStart(2, '0')}`;
};

interface ReportsTableProps {
  month?: number | null;
  year?: number;
  onMonthYearChange?: (month: number | null, year: number) => void;
}

export default function ReportsTable({ 
  month: propMonth, 
  year: propYear,
  onMonthYearChange 
}: ReportsTableProps = {} as ReportsTableProps) {
  const now = new Date();
  const [internalMonth, setInternalMonth] = useState<number | null>(now.getMonth());
  const [internalYear, setInternalYear] = useState<number>(now.getFullYear());
  
  // Use props if provided, otherwise use internal state
  const month = propMonth !== undefined ? propMonth : internalMonth;
  const year = propYear !== undefined ? propYear : internalYear;
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ClientInvoiceSummary[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [batchRows, setBatchRows] = useState<Record<string, BatchRow[]>>({});
  const [loadingClient, setLoadingClient] = useState<Record<string, boolean>>({});
  const [invoiceOpen, setInvoiceOpen] = useState<boolean>(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchRow | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState<boolean>(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [exportLoading, setExportLoading] = useState<boolean>(false);

  // Use React Query for data fetching with caching
  const monthParam = buildMonthParam(month, year);
  const { data, isLoading, error: queryError, refetch } = useReports({ month: monthParam });
  
  useEffect(() => {
    if (data?.data) {
      setRows(data.data);
      setError(null);
    } else if (data && !data.success) {
      setError(data.error || 'Failed to load reports');
      setRows([]);
    }
  }, [data]);
  
  useEffect(() => {
    if (queryError) {
      setError('Failed to load reports');
      setRows([]);
    }
  }, [queryError]);
  
  const loading = isLoading;

  const handleChange = (m: number | null, y: number) => {
    if (propMonth === undefined) {
      setInternalMonth(m);
    }
    if (propYear === undefined) {
      setInternalYear(y);
    }
    if (onMonthYearChange) {
      onMonthYearChange(m, y);
    }
  };

  const totals = rows.reduce(
    (acc, r) => {
      acc.items += r.total_items_washed;
      acc.amount += r.total_amount;
      acc.batches += r.batch_count;
      acc.discrepancies += r.discrepancy_batches;
      return acc;
    },
    { items: 0, amount: 0, batches: 0, discrepancies: 0 }
  );

  const toggleExpand = async (clientId: string) => {
    const isOpen = !!expanded[clientId];
    const newExpanded = { ...expanded, [clientId]: !isOpen };
    setExpanded(newExpanded);

    if (!isOpen && !batchRows[clientId]) {
      try {
        setLoadingClient(prev => ({ ...prev, [clientId]: true }));
        const ym = buildMonthParam(month, year);
        const res = await fetch(`/api/dashboard/reports/client-batches?clientId=${clientId}&month=${ym}`);
        const json = await res.json();
        if (!json.success) {
          return;
        }
        setBatchRows(prev => ({ ...prev, [clientId]: json.data || [] }));
      } finally {
        setLoadingClient(prev => ({ ...prev, [clientId]: false }));
      }
    }
  };

  const openInvoice = async (batch: BatchRow) => {
    setSelectedBatch(batch);
    setInvoiceLoading(true);
    setInvoiceData(null);
    setInvoiceOpen(true);
    try {
      const res = await fetch(`/api/dashboard/reports/batch-invoice?batchId=${batch.id}`);
      const json = await res.json();
      if (json.success) {
        setInvoiceData(json.data);
      }
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExportLoading(true);
      const ym = buildMonthParam(month, year);
      const response = await fetch(`/api/dashboard/reports/export-excel?month=${ym}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const monthLabel = month === null
          ? `${year} All Months`
          : new Date(year, month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        a.download = `RSL_Express_Report_${monthLabel.replace(/\s+/g, '_')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to export Excel file');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export Excel file. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleViewStatistics = () => {
    const ym = buildMonthParam(month, year);
    window.open(`/reports/statistics?month=${ym}`, '_blank');
  };

  const handleDownloadAllInvoicesPDF = () => {
    const ym = buildMonthParam(month, year);
    // Open PDF in new tab - the API route will return the PDF with proper headers
    window.open(`/api/dashboard/reports/download-invoices-pdf?month=${ym}`, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <span>Client Invoicing Summary</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <div className="flex space-x-2">
              <Button
                onClick={handleExportExcel}
                disabled={exportLoading || loading}
                size="sm"
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>{exportLoading ? 'Exporting...' : 'Excel'}</span>
              </Button>
              <Button
                onClick={handleDownloadAllInvoicesPDF}
                disabled={loading || rows.length === 0}
                size="sm"
                variant="outline"
                className="flex items-center space-x-2"
              >
                <FileDown className="w-4 h-4" />
                <span>Download All Invoices (PDF)</span>
              </Button>
              <Button
                onClick={handleViewStatistics}
                disabled={loading}
                size="sm"
                variant="outline"
                className="flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>Statistics</span>
              </Button>
            </div>
            <MonthSelector value={{ month, year }} onChange={handleChange} loading={loading} />
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-3 py-2 border rounded-md text-sm"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        )}

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Batches</TableHead>
                <TableHead className="text-right">Total Items Washed</TableHead>
                <TableHead className="text-right">Discrepancy Batches</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="animate-pulse"><div className="h-4 bg-slate-200 rounded w-40"></div></TableCell>
                    <TableCell className="text-right animate-pulse"><div className="h-4 bg-slate-200 rounded w-10 ml-auto"></div></TableCell>
                    <TableCell className="text-right animate-pulse"><div className="h-4 bg-slate-200 rounded w-16 ml-auto"></div></TableCell>
                    <TableCell className="text-right animate-pulse"><div className="h-4 bg-slate-200 rounded w-16 ml-auto"></div></TableCell>
                    <TableCell className="text-right animate-pulse"><div className="h-4 bg-slate-200 rounded w-24 ml-auto"></div></TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 py-8">No data for selected month</TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <Fragment key={r.client_id}>
                    <TableRow className="hover:bg-slate-50">
                      <TableCell className="font-medium">
                        <button
                          onClick={() => toggleExpand(r.client_id)}
                          className="inline-flex items-center space-x-2"
                        >
                          {expanded[r.client_id] ? (
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                          )}
                          {r.logo_url && (
                            <div className="w-10 h-10 relative">
                              <Image 
                                src={r.logo_url} 
                                alt={`${r.client_name} logo`}
                                fill
                                className="object-contain rounded-sm"
                                quality={85}
                                loading="lazy"
                                placeholder="blur"
                                blurDataURL={BLUR_DATA_URL}
                                sizes="40px"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <span>{r.client_name}</span>
                        </button>
                      </TableCell>
                      <TableCell className="text-right">{r.batch_count}</TableCell>
                      <TableCell className="text-right">{r.total_items_washed}</TableCell>
                      <TableCell className="text-right">{r.discrepancy_batches}</TableCell>
                      <TableCell className="text-right">{formatCurrencySSR(r.total_amount)}</TableCell>
                    </TableRow>
                    {expanded[r.client_id] && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <div className="p-3 bg-slate-50 rounded-md border">
                            {loadingClient[r.client_id] && (
                              <div className="text-sm text-slate-500">Loading batches...</div>
                            )}
                            {!loadingClient[r.client_id] && (!batchRows[r.client_id] || batchRows[r.client_id].length === 0) && (
                              <div className="text-sm text-slate-500">No batches for this client in selected month.</div>
                            )}
                            {!loadingClient[r.client_id] && batchRows[r.client_id] && batchRows[r.client_id].length > 0 && (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-left text-slate-600">
                                      <th className="py-2 pr-4">Pickup Date</th>
                                      <th className="py-2 pr-4">Paper Batch ID</th>
                                      <th className="py-2 pr-4">Status</th>
                                      <th className="py-2 pr-4">Discrepancy</th>
                                      <th className="py-2 pr-4 text-right">Items</th>
                                      <th className="py-2 pr-0 text-right">Amount</th>
                                      <th className="py-2 pl-4 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {batchRows[r.client_id].map((b: BatchRow) => (
                                      <tr key={b.id} className="border-t">
                                        <td className="py-2 pr-4">{new Date(b.pickup_date).toLocaleDateString()}</td>
                                        <td className="py-2 pr-4">{b.paper_batch_id || '-'}</td>
                                        <td className="py-2 pr-4">{b.status}</td>
                                        <td className="py-2 pr-4">
                                          {b.has_discrepancy ? (
                                            <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-red-100 text-red-700 border border-red-200">
                                              <AlertTriangle className="w-3 h-3 mr-1" />
                                              Discrepancy
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-green-100 text-green-700 border border-green-200">OK</span>
                                          )}
                                        </td>
                                        <td className="py-2 pr-4 text-right">{b.total_items_received}</td>
                                        <td className="py-2 pr-0 text-right">{formatCurrencySSR(b.total_amount)}</td>
                                        <td className="py-2 pl-4 text-right">
                                          <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="outline" onClick={() => openInvoice(b)}>
                                              View Invoice
                                            </Button>
                                            <Button
                                              size="sm"
                                              className="flex items-center space-x-1"
                                              onClick={() => window.open(`/invoice/${b.id}`, '_blank')}
                                            >
                                              <Printer className="w-3 h-3" />
                                              <span>Open</span>
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))
              )}
              {!loading && rows.length > 0 && (
                <TableRow>
                  <TableCell className="font-semibold">Totals</TableCell>
                  <TableCell className="text-right font-semibold">{totals.batches}</TableCell>
                  <TableCell className="text-right font-semibold">{totals.items}</TableCell>
                  <TableCell className="text-right font-semibold">{totals.discrepancies}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrencySSR(totals.amount)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Batch Invoice Summary</DialogTitle>
            </DialogHeader>
            {!selectedBatch ? (
              <div className="text-sm text-slate-700">No batch selected.</div>
            ) : invoiceLoading ? (
              <div className="text-sm text-slate-700">Loading invoice...</div>
            ) : invoiceData ? (
              <div className="space-y-4 text-sm text-slate-800">
                {/* Client Logo and Header */}
                <div className="flex items-center space-x-4 pb-4 border-b">
                  {invoiceData.client_logo_url && (
                    <div className="w-16 h-16 relative">
                      <Image 
                        src={invoiceData.client_logo_url} 
                        alt={`${invoiceData.client_name} logo`}
                        fill
                        className="object-contain rounded-lg border border-slate-200"
                        quality={85}
                        loading="lazy"
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                        sizes="64px"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{invoiceData.client_name || 'Unknown Client'}</h3>
                    <p className="text-slate-600">Batch Invoice Summary</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-slate-500">Pickup Date</p>
                    <p className="font-medium">{new Date(invoiceData.pickup_date).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Paper Batch ID</p>
                    <p className="font-medium">{invoiceData.paper_batch_id || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Status</p>
                    <p className="font-medium">{selectedBatch.status}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Discrepancy</p>
                    <p className={`font-medium ${invoiceData.has_discrepancy ? 'text-red-600' : 'text-green-600'}`}>{invoiceData.has_discrepancy ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="text-left py-2 px-3">Item</th>
                        <th className="text-right py-2 px-3">Qty Sent</th>
                        <th className="text-right py-2 px-3">Qty Received</th>
                        <th className="text-right py-2 px-3">Unit Price</th>
                        <th className="text-right py-2 px-3">Line Total</th>
                        <th className="text-right py-2 px-3">Discrepancy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceData.items?.map((it: InvoiceItem, idx: number) => (
                        <tr key={idx} className="border-t">
                          <td className="py-2 px-3">{it.category_name}</td>
                          <td className="py-2 px-3 text-right">{it.quantity_sent ?? '-'}</td>
                          <td className="py-2 px-3 text-right">{it.quantity_received ?? '-'}</td>
                          <td className="py-2 px-3 text-right">{it.unit_price !== null ? formatCurrencySSR(it.unit_price) : '-'}</td>
                          <td className="py-2 px-3 text-right">{formatCurrencySSR(it.line_total)}</td>
                          <td className={`py-2 px-3 text-right ${it.discrepancy !== 0 ? 'text-red-600' : 'text-slate-600'}`}>{it.discrepancy}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50">
                      <tr className="border-t-2 border-slate-200">
                        <td colSpan={4} className="py-3 px-3 font-semibold text-slate-900">Total</td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-900">{formatCurrencySSR(invoiceData.total_amount)}</td>
                        <td className="py-3 px-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-700">Failed to load invoice.</div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}


