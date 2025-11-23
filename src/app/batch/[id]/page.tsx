'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Navigation from '@/components/navigation';
import BatchHeader from '@/components/batch/batch-header';
import StatusUpdater from '@/components/batch/status-updater';
import ItemsBreakdown from '@/components/batch/items-breakdown';
import FinancialSummary from '@/components/batch/financial-summary';

// Lazy load InvoiceView - only loaded when invoice view is shown
const InvoiceView = dynamic(() => import('@/components/batch/invoice-view'), {
  loading: () => <div className="p-8 text-center text-slate-500">Loading invoice...</div>,
  ssr: false,
});
import { 
  ArrowLeft, 
  RefreshCw, 
  AlertCircle, 
  Package,
  FileEdit
} from 'lucide-react';
import Link from 'next/link';

// Types
interface BatchDetails {
  id: string;
  paper_batch_id: string;
  status: 'pickup' | 'washing' | 'completed' | 'delivered';
  pickup_date: string;
  delivery_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  client: {
    id: string;
    name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
    billing_address?: string;
  };
  items: Array<{
    id: string;
    linen_category_id: string;
    quantity_sent: number;
    quantity_received: number;
    price_per_item: number;
    category: {
      id: string;
      name: string;
      description?: string;
      unit_price: number;
      is_active: boolean;
    };
    discrepancy: {
      quantity: number;
      percentage: number;
      value_impact: number;
    };
    pricing: {
      unit_price: number;
      total_sent_value: number;
      total_received_value: number;
      discrepancy_value: number;
    };
  }>;
  financial_summary: {
    total_amount: number;
    total_items_sent: number;
    total_items_received: number;
    discrepancy_count: number;
    discrepancy_percentage: number;
    average_item_price: number;
  };
}

// Loading component
function BatchDetailsLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb skeleton */}
        <div className="mb-8">
          <div className="h-4 bg-slate-200 rounded w-64 animate-pulse"></div>
        </div>
        
        {/* Page header skeleton */}
        <div className="mb-8">
          <div className="h-8 bg-slate-200 rounded w-80 mb-2 animate-pulse"></div>
          <div className="h-4 bg-slate-200 rounded w-96 animate-pulse"></div>
        </div>

        {/* Content skeleton */}
        <div className="space-y-8">
          <div className="h-64 bg-slate-200 rounded animate-pulse"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-96 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-96 bg-slate-200 rounded animate-pulse"></div>
          </div>
          <div className="h-96 bg-slate-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}


// Breadcrumb component
function Breadcrumb() {
  return (
    <nav className="flex items-center space-x-2 text-sm text-slate-600 mb-8">
      <Link href="/dashboard" className="flex items-center space-x-1 hover:text-slate-900 transition-colors">
        <Package className="w-4 h-4" />
        <span>Dashboard</span>
      </Link>
      <span>/</span>
      <Link href="/dashboard" className="hover:text-slate-900 transition-colors">
        <span>Batches</span>
      </Link>
      <span>/</span>
      <span className="text-slate-900 font-medium">Batch Details</span>
    </nav>
  );
}

// Main batch details content
function BatchDetailsContent() {
  const params = useParams();
  const batchId = params.id as string;

  const [batchDetails, setBatchDetails] = useState<BatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showInvoice] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Fetch batch details
  const fetchBatchDetails = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const response = await fetch(`/api/batches/${batchId}`);
      const result = await response.json();

      if (result.success) {
        setBatchDetails(result.data);
      } else {
        setError(result.error || 'Failed to load batch details');
      }
    } catch {
      setError('Failed to load batch details. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [batchId]);

  // Handle status update
  const handleStatusUpdate = async (newStatus: string, notes?: string) => {
    try {
      const response = await fetch(`/api/batches/${batchId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          notes: notes || null
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh the batch details
        await fetchBatchDetails(true);
      } else {
        throw new Error(result.error || 'Failed to update status');
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  // Handle invoice generation
  const handleGenerateInvoice = () => {
    // Open invoice in new tab
    window.open(`/invoice/${batchId}`, '_blank');
  };

  // Set client-side flag and load batch details on mount
  useEffect(() => {
    setIsClient(true);
    if (batchId) {
      fetchBatchDetails();
    }
  }, [batchId, fetchBatchDetails]);

  // Prevent hydration mismatch by not rendering until client-side
  if (!isClient) {
    return <BatchDetailsLoading />;
  }

  if (loading) {
    return <BatchDetailsLoading />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => fetchBatchDetails()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!batchDetails) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Batch not found.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb />
        
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/dashboard"
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                size="sm"
                className="flex items-center space-x-2"
                asChild
              >
                <Link href={`/batch/${batchDetails.id}/edit`}>
                  <FileEdit className="w-4 h-4" />
                  <span>Amend Invoice</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchBatchDetails(true)}
                disabled={refreshing}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Top Row - Batch Header and Status Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Batch Header */}
          <BatchHeader
            batch={batchDetails}
            client={batchDetails.client}
            loading={refreshing}
          />

          {/* Status Management */}
          <StatusUpdater
            currentStatus={batchDetails.status}
            onStatusUpdate={handleStatusUpdate}
            loading={refreshing}
          />
        </div>

        {/* Financial Summary - Full Width */}
        <div className="mb-8">
          <FinancialSummary
            financial_summary={batchDetails.financial_summary}
            batchId={batchDetails.id}
            paperBatchId={batchDetails.paper_batch_id}
            onGenerateInvoice={handleGenerateInvoice}
            loading={refreshing}
          />
        </div>

        {/* Items Breakdown / Invoice */}
        {showInvoice ? (
          <InvoiceView
            batchId={batchDetails.id}
            paperBatchId={batchDetails.paper_batch_id}
            client={{ name: batchDetails.client.name, email: batchDetails.client.email, address: batchDetails.client.address }}
            pickup_date={batchDetails.pickup_date}
            items={batchDetails.items.map((it) => ({ 
              id: it.id, 
              category: { name: it.category?.name || 'Item' }, 
              quantity_sent: it.quantity_sent,
              quantity_received: it.quantity_received, 
              price_per_item: it.price_per_item,
              discrepancy_details: null
            }))}
            subtotal={batchDetails.financial_summary.total_amount}
          />
        ) : (
          <ItemsBreakdown
            items={batchDetails.items}
            loading={refreshing}
          />
        )}
      </div>
    </div>
  );
}

export default function BatchDetailsPage() {
  return (
    <Suspense fallback={<BatchDetailsLoading />}>
      <BatchDetailsContent />
    </Suspense>
  );
}
