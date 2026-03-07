'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, ChevronRight } from 'lucide-react';
import { formatCurrencySSR } from '@/lib/utils/formatters';

interface Batch {
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
  status: 'draft' | 'invoiced' | 'paid';
  created_at: string;
}

interface BatchHistorySectionProps {
  batches: Batch[];
  onViewBatch: (id: string) => void;
  onDownloadPDF: (batch: Batch) => void;
}

const statusBadge: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-800' },
  invoiced: { label: 'Invoiced', className: 'bg-amber-100 text-amber-800' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-800' },
};

export default function BatchHistorySection({
  batches,
  onViewBatch,
  onDownloadPDF,
}: BatchHistorySectionProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Batch History</h2>

      <Card className="p-4 md:p-6">
        {batches.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-semibold text-slate-900">{batch.batch_ref}</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusBadge[batch.status]?.className ?? 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {statusBadge[batch.status]?.label ?? batch.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                    <span>{batch.scan_date}</span>
                    <span>{batch.total_items} items</span>
                    <span>{batch.total_washes} washes</span>
                    <span className="font-medium text-slate-900">
                      {formatCurrencySSR(Number(batch.grand_total))}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDownloadPDF(batch)}
                    className="flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewBatch(batch.id)}
                    className="flex items-center gap-1"
                  >
                    <ChevronRight className="w-4 h-4" />
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <FileText className="w-12 h-12 mb-3 text-slate-300" />
            <p>No batches yet</p>
            <p className="text-sm mt-1">Upload a CSV to create your first batch</p>
          </div>
        )}
      </Card>
    </div>
  );
}
