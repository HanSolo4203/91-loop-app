'use client';

import React, { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Navigation from '@/components/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import {
  Radio,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Activity,
  History,
  Download,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import BatchInvoiceModal, { type BatchInvoiceData } from '@/components/rfid/batch-invoice-modal';
import LinenHealthSection from '@/components/rfid/linen-health-section';
import BatchHistorySection from '@/components/rfid/batch-history-section';
import { pdfGenerator } from '@/lib/services/pdf-generator';
import { ErrorBoundary } from '@/components/ui/error-boundary';

function Breadcrumb() {
  return (
    <nav className="flex items-center space-x-2 text-sm text-slate-600 mb-8">
      <Radio className="w-4 h-4" />
      <span>/</span>
      <span className="text-slate-900 font-medium">RFID Dashboard</span>
    </nav>
  );
}

function CSVUploadZone({
  onFileSelected,
  isLoading,
  uploadProgress,
  error,
}: {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  uploadProgress: number | null;
  error: string | null;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setUploadError('Please upload a CSV file');
      return;
    }
    setUploadError(null);
    onFileSelected(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <Card className="p-8">
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            {(isLoading) ? (
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-blue-600" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {isLoading ? (uploadProgress != null ? 'Uploading...' : 'Processing CSV...') : 'Upload RFID Batch'}
            </h3>
            <p className="text-slate-600 mb-4">
              {isLoading
                ? uploadProgress !== null && uploadProgress < 100
                  ? `Uploading... ${uploadProgress}%`
                  : 'Processing your file...'
                : 'Drag and drop your CSV file here, or click to browse'}
            </p>
            {isLoading && (
              <div className="w-full max-w-xs mx-auto h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-blue-600 rounded-full transition-all duration-300 ease-out ${
                    uploadProgress === 100 ? 'animate-pulse' : ''
                  }`}
                  style={{ width: `${uploadProgress ?? 0}%` }}
                />
              </div>
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
              disabled={isLoading}
            />
            <Button
              type="button"
              disabled={isLoading}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Select CSV File</span>
            </Button>
          </div>
          {(uploadError || error) && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{uploadError || error}</span>
            </div>
          )}
          <p className="text-xs text-slate-500">
            Required columns: RFID Number, Category
          </p>
        </div>
      </div>
    </Card>
  );
}

function RFIDDashboardContent() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [batchModal, setBatchModal] = useState<{
    open: boolean;
    data: BatchInvoiceData;
  } | null>(null);
  const [viewBatchId, setViewBatchId] = useState<string | null>(null);

  const { data: items = [], refetch: refetchItems } = useQuery({
    queryKey: ['rfid-items'],
    queryFn: async () => {
      const res = await fetch('/api/rfid-data/items');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const { data: batches = [], refetch: refetchBatches } = useQuery({
    queryKey: ['rfid-batches'],
    queryFn: async () => {
      const res = await fetch('/api/rfid-data/batches');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const batches30Days = batches.slice(0, 30).map((b: { scan_date: string; total_washes: number }) => ({
    scan_date: b.scan_date,
    total_washes: b.total_washes ?? 0,
  }));

  const handleFileSelected = useCallback(async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);
      const formData = new FormData();
      formData.append('file', file);

      const json = await new Promise<{ success: boolean; data?: BatchInvoiceData; error?: string }>(
        (resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/rfid-data/upload');

          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setUploadProgress(pct);
            } else {
              setUploadProgress((prev) => (prev != null && prev < 90 ? prev + 10 : prev));
            }
          });

          xhr.upload.addEventListener('loadend', () => setUploadProgress(100));

          xhr.onload = () => {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } catch {
              reject(new Error('Invalid response'));
            }
          };
          xhr.onerror = () => reject(new Error('Upload failed'));
          xhr.send(formData);
        }
      );
      if (!json.success) {
        throw new Error(json.error ?? 'Upload failed');
      }
      setBatchModal({
        open: true,
        data: json.data as BatchInvoiceData,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }, []);

  const handleConfirmBatch = useCallback(async () => {
    if (!batchModal) return;
    try {
      setIsUploading(true);
      setError(null);
      const payload = {
        batch_ref: batchModal.data.batch_ref,
        location: batchModal.data.location,
        scanned_by: batchModal.data.scanned_by,
        scan_date: batchModal.data.scan_date,
        total_items: batchModal.data.total_items,
        total_washes: batchModal.data.total_washes,
        subtotal: batchModal.data.subtotal,
        vat_amount: batchModal.data.vat_amount,
        grand_total: batchModal.data.grand_total,
        items: batchModal.data.items.map((i) => ({
          rfid_number: i.rfid_number,
          category: i.category,
          qty_washed_this_batch: i.qty_washed_this_batch,
          washes_remaining_after: i.washes_remaining_after,
          price_per_wash: i.price_per_wash,
          line_total: i.line_total,
        })),
      };
      const res = await fetch('/api/rfid-data/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed to save batch');
      setBatchModal(null);
      void queryClient.invalidateQueries({ queryKey: ['rfid-items'] });
      void queryClient.invalidateQueries({ queryKey: ['rfid-batches'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save batch');
    } finally {
      setIsUploading(false);
    }
  }, [batchModal, queryClient]);

  const handleDownloadPDF = useCallback(async (batch?: BatchInvoiceData) => {
    const data = batch ?? batchModal?.data;
    if (!data) return;

    const bsRes = await fetch('/api/business-settings');
    const bsJson = await bsRes.json();
    const bs = bsJson.success ? bsJson.data : null;

    pdfGenerator.generateRFIDInvoicePDF({
      invoice_number: data.batch_ref,
      location: data.location,
      generated_by: data.scanned_by ?? '',
      date: data.scan_date,
      bill_to: '91 Loop Hostel',
      items: data.items.map((i) => ({
        rfid_number: i.rfid_number,
        category: i.category,
        qty_washed: i.qty_washed_this_batch,
        washes_remaining: i.washes_remaining_after,
        price_per_wash: i.price_per_wash,
        line_total: i.line_total,
      })),
      subtotal: data.subtotal,
      vatAmount: data.vat_amount,
      total: data.grand_total,
      total_items: data.total_items,
      category_breakdown: data.category_breakdown.map((c) => ({
        category: c.category,
        count: c.item_count,
      })),
      lifecycle_health_summary:
        (data.near_end_of_life_items?.length ?? 0) > 0
          ? `${data.near_end_of_life_items!.length} item(s) flagged for replacement`
          : undefined,
      business_settings: bs
        ? {
            company_name: bs.company_name ?? undefined,
            bank_name: bs.bank_name ?? undefined,
            bank_account_number: bs.bank_account_number ?? undefined,
            bank_branch_code: bs.bank_branch_code ?? undefined,
            bank_account_type: bs.bank_account_type ?? undefined,
            payment_terms_days: bs.payment_terms_days ?? undefined,
          }
        : undefined,
    });
  }, [batchModal]);

  const handleDownloadBatchPDF = useCallback(
    async (batch: { id: string; batch_ref: string; location: string; scanned_by: string | null; scan_date: string; total_items: number; total_washes: number; grand_total: number; subtotal?: number; vat_amount?: number }) => {
      const res = await fetch(`/api/rfid-data/batches/${batch.id}`);
      const json = await res.json();
      if (!json.success || !json.data) return;
      const b = json.data;
      const items = (b.items ?? []).map((i: { rfid_number: string; category: string; qty_washed_this_batch: number; washes_remaining_after: number; price_per_wash: number; line_total: number }) => i);
      const categoryBreakdown: Record<string, number> = {};
      items.forEach((i: { category: string; qty_washed_this_batch: number }) => {
        categoryBreakdown[i.category] = (categoryBreakdown[i.category] ?? 0) + i.qty_washed_this_batch;
      });
      const data: BatchInvoiceData = {
        batch_ref: b.batch_ref,
        scan_date: b.scan_date,
        location: b.location,
        scanned_by: b.scanned_by ?? '',
        total_items: b.total_items,
        total_washes: b.total_washes,
        subtotal: Number(b.subtotal),
        vat_amount: Number(b.vat_amount),
        grand_total: Number(b.grand_total),
        items: items.map((i: { rfid_number: string; category: string; qty_washed_this_batch: number; washes_remaining_after: number; price_per_wash: number; line_total: number }) => ({
          rfid_number: i.rfid_number,
          category: i.category,
          qty_washed_this_batch: i.qty_washed_this_batch,
          washes_remaining_after: i.washes_remaining_after,
          price_per_wash: i.price_per_wash,
          line_total: i.line_total,
          near_end_of_life: i.washes_remaining_after < 50,
        })),
        category_breakdown: Object.entries(categoryBreakdown).map(([category, item_count]) => ({
          category,
          item_count,
          total_washes: item_count,
          price_per_wash: 0,
          subtotal: 0,
        })),
        near_end_of_life_items: items.filter((i: { washes_remaining_after: number }) => i.washes_remaining_after < 50),
      };
      await handleDownloadPDF(data);
    },
    [handleDownloadPDF]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb />

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-red-800">{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
              Dismiss
            </Button>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
            <Radio className="w-8 h-8 text-blue-600" />
            <span>RSL Express RFID Laundry</span>
          </h1>
          <p className="text-slate-600 mt-2">
            Upload RFID scans, track linen lifecycle, and invoice 91 Loop Hostel
          </p>
        </div>

        <div className="mb-8">
          <CSVUploadZone
            onFileSelected={handleFileSelected}
            isLoading={isUploading}
            uploadProgress={uploadProgress}
            error={error}
          />
        </div>

        {/* Tiles for each uploaded CSV (batch) */}
        {batches.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              Uploaded Batches ({batches.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {batches.map((batch: { id: string; batch_ref: string; location: string; scanned_by: string | null; scan_date: string; total_items: number; total_washes: number; grand_total: number; status: string }) => (
                <Card
                  key={batch.id}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer border-slate-200"
                  onClick={() => setViewBatchId(batch.id)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-mono text-sm font-semibold text-slate-900 truncate">
                      {batch.batch_ref}
                    </span>
                    <span
                      className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        batch.status === 'draft'
                          ? 'bg-slate-100 text-slate-800'
                          : batch.status === 'invoiced'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {batch.status === 'draft' ? 'Draft' : batch.status === 'invoiced' ? 'Invoiced' : 'Paid'}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-slate-600">
                    <p>{batch.scan_date}</p>
                    <p>{batch.location}</p>
                    <p>
                      <span className="font-medium text-slate-900">{batch.total_items}</span> items
                      <span className="text-slate-500"> · </span>
                      <span className="font-medium text-slate-900">{batch.total_washes}</span> washes
                    </p>
                    <p className="font-semibold text-slate-900 pt-1">
                      {Number(batch.grand_total).toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' })}
                    </p>
                  </div>
                  <div
                    className="mt-3 pt-3 border-t border-slate-100 flex gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => handleDownloadBatchPDF(batch)}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => setViewBatchId(batch.id)}
                    >
                      <History className="w-3 h-3 mr-1" />
                      View
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="linen-health" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="linen-health" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Linen Health
            </TabsTrigger>
            <TabsTrigger value="batch-history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Batch History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="linen-health">
            <LinenHealthSection items={items} batches30Days={batches30Days} />
          </TabsContent>

          <TabsContent value="batch-history">
            <BatchHistorySection
              batches={batches}
              onViewBatch={(id) => setViewBatchId(id)}
              onDownloadPDF={handleDownloadBatchPDF}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Batch Invoice Modal (full-screen) */}
      <Dialog open={!!batchModal} onOpenChange={(open) => !open && setBatchModal(null)}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Batch Invoice – Review Before Saving</DialogTitle>
          </DialogHeader>
          {batchModal && (
            <BatchInvoiceModal
              data={batchModal.data}
              onDownloadPDF={() => handleDownloadPDF()}
              onConfirm={handleConfirmBatch}
              isLoading={isUploading}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Batch Detail View Modal */}
      {viewBatchId && (
        <BatchDetailModal
          batchId={viewBatchId}
          onClose={() => setViewBatchId(null)}
          onDownloadPDF={handleDownloadBatchPDF}
        />
      )}
    </div>
  );
}

function BatchDetailModal({
  batchId,
  onClose,
  onDownloadPDF,
}: {
  batchId: string;
  onClose: () => void;
  onDownloadPDF: (batch: {
    id: string;
    batch_ref: string;
    location: string;
    scanned_by: string | null;
    scan_date: string;
    total_items: number;
    total_washes: number;
    grand_total: number;
    subtotal?: number;
    vat_amount?: number;
  }) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['rfid-batch', batchId],
    queryFn: async () => {
      const res = await fetch(`/api/rfid-data/batches/${batchId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!batchId,
  });

  const batch = (data ?? null) as {
    id: string;
    batch_ref: string;
    location: string;
    scanned_by: string | null;
    scan_date: string;
    total_items: number;
    total_washes: number;
    grand_total: number;
    subtotal: number;
    vat_amount: number;
    items?: Array<{
      rfid_number: string;
      category: string;
      qty_washed_this_batch: number;
      washes_remaining_after: number;
      price_per_wash: number;
      line_total: number;
    }>;
  };

  return (
    <Dialog open={!!batchId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch {batch?.batch_ref}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="py-8 text-center text-slate-500">Loading...</div>
        ) : batch ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Date</p>
                <p className="font-medium">{batch.scan_date}</p>
              </div>
              <div>
                <p className="text-slate-500">Location</p>
                <p className="font-medium">{batch.location}</p>
              </div>
              <div>
                <p className="text-slate-500">Items</p>
                <p className="font-medium">{batch.total_items}</p>
              </div>
              <div>
                <p className="text-slate-500">Grand Total</p>
                <p className="font-medium">R {Number(batch.grand_total).toFixed(2)}</p>
              </div>
            </div>
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-2 px-3">RFID</th>
                    <th className="text-left py-2 px-3">Category</th>
                    <th className="text-right py-2 px-3">Qty</th>
                    <th className="text-right py-2 px-3">Remaining</th>
                    <th className="text-right py-2 px-3">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(batch.items ?? []).map((item, i) => (
                    <tr key={i} className="border-t">
                      <td className="py-2 px-3 font-mono">{item.rfid_number}</td>
                      <td className="py-2 px-3">{item.category}</td>
                      <td className="py-2 px-3 text-right">{item.qty_washed_this_batch}</td>
                      <td className="py-2 px-3 text-right">{item.washes_remaining_after}</td>
                      <td className="py-2 px-3 text-right">R {Number(item.line_total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  onDownloadPDF(batch);
                }}
                className="flex items-center gap-2"
              >
                Download PDF
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500">
            {isLoading ? 'Loading...' : 'Batch not found'}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function RFIDDashboardPage() {
  return (
    <AuthGuard>
      <ErrorBoundary resetKeys={['rfid-dashboard']}>
        <RFIDDashboardContent />
      </ErrorBoundary>
    </AuthGuard>
  );
}
