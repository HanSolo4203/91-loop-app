'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/navigation';
import BatchHeader from '@/components/batch/batch-header';
import LinenCountGrid, { LinenCountGridRef } from '@/components/batch/linen-count-grid';
import type { LinenCountItem } from '@/components/batch/linen-count-grid';
import BatchTotalCard from '@/components/batch/batch-total-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, FileEdit, RefreshCw } from 'lucide-react';
import type { LinenCategory } from '@/types/database';

interface BatchItemPayload {
  linen_category_id: string;
  quantity_sent: number;
  quantity_received: number;
  price_per_item: number;
  discrepancy_details?: string | null;
}

interface BatchDetails {
  id: string;
  paper_batch_id: string;
  pickup_date: string;
  status: 'pickup' | 'washing' | 'completed' | 'delivered';
  created_at: string;
  updated_at: string;
  notes?: string | null;
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
    discrepancy_details?: string | null;
    category?: {
      id: string;
      name: string;
      price_per_item: number;
    };
  }>;
}

function EditBatchLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="h-4 bg-slate-200 rounded w-48 animate-pulse" />
        <div className="h-10 bg-slate-200 rounded w-96 animate-pulse" />
        <div className="h-64 bg-slate-200 rounded animate-pulse" />
      </div>
    </div>
  );
}

function Breadcrumb() {
  return (
    <nav className="flex items-center space-x-2 text-sm text-slate-600 mb-8">
      <Link href="/dashboard" className="flex items-center space-x-1 hover:text-slate-900 transition-colors">
        <span>Dashboard</span>
      </Link>
      <span>/</span>
      <Link href="/dashboard" className="hover:text-slate-900 transition-colors">
        <span>Batches</span>
      </Link>
      <span>/</span>
      <span className="text-slate-900 font-medium">Amend Invoice</span>
    </nav>
  );
}

function EditBatchContent() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.id as string;

  const linenGridRef = useRef<LinenCountGridRef>(null);
  const [isClient, setIsClient] = useState(false);
  const [categories, setCategories] = useState<LinenCategory[]>([]);
  const [initialSelections, setInitialSelections] = useState<BatchItemPayload[]>([]);
  const [linenItems, setLinenItems] = useState<LinenCountItem[]>([]);
  const [batchDetails, setBatchDetails] = useState<BatchDetails | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState('');
  const [gridError, setGridError] = useState('');
  const [amendStatus, setAmendStatus] = useState<'draft' | 'creating' | 'success' | 'error'>('draft');
  const [errorMessage, setErrorMessage] = useState('');

  const loadPageData = useCallback(
    async (isRefresh = false) => {
      if (!batchId) {
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setPageLoading(true);
      }

      setPageError('');
      setGridError('');

      try {
        const [categoriesResponse, batchResponse] = await Promise.all([
          fetch('/api/categories?includeInactive=false').then((res) => res.json()),
          fetch(`/api/batches/${batchId}`).then((res) => res.json()),
        ]);

        if (!categoriesResponse.success) {
          throw new Error(categoriesResponse.error || 'Failed to load linen categories');
        }

        if (!batchResponse.success) {
          throw new Error(batchResponse.error || 'Failed to load batch details');
        }

        setCategories(categoriesResponse.data || []);
        setBatchDetails(batchResponse.data);

        const mappedItems: BatchItemPayload[] = (batchResponse.data.items || []).map((item: BatchDetails['items'][number]) => ({
          linen_category_id: item.linen_category_id,
          quantity_sent: item.quantity_sent,
          quantity_received: item.quantity_received,
          price_per_item: item.price_per_item || item.category?.price_per_item || 0,
          discrepancy_details: item.discrepancy_details || '',
        }));
        setInitialSelections(mappedItems);
      } catch (error) {
        setPageError(error instanceof Error ? error.message : 'Failed to load batch information');
      } finally {
        setPageLoading(false);
        setRefreshing(false);
      }
    },
    [batchId]
  );

  useEffect(() => {
    setIsClient(true);
    if (batchId) {
      loadPageData();
    }
  }, [batchId, loadPageData]);

  const handleLinenItemsChange = useCallback((items: LinenCountItem[]) => {
    setLinenItems(items);
  }, []);

  const getCurrentItems = () => {
    return linenGridRef.current?.getItems() || [];
  };

  const isFormReady = () => {
    const currentItems = getCurrentItems();
    return currentItems.some((item) => item.quantity_sent > 0);
  };

  const handleAmendInvoice = async () => {
    if (!batchDetails) return;

    const currentItems = getCurrentItems();
    const filteredItems = currentItems.filter((item) => item.quantity_sent > 0);

    if (filteredItems.length === 0) {
      setGridError('At least one category must have quantities before amending.');
      return;
    }

    setGridError('');
    setErrorMessage('');
    setAmendStatus('creating');

    try {
      const payloadItems = filteredItems.map((item) => ({
        linen_category_id: item.category.id,
        quantity_sent: item.quantity_sent,
        quantity_received: item.quantity_received,
        price_per_item: item.price_per_item,
        discrepancy_details: item.discrepancy_details || null,
      }));

      const response = await fetch(`/api/batches/${batchId}/items`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: payloadItems }),
      });

      const result = await response.json();

      if (result.success) {
        setAmendStatus('success');
        setTimeout(() => {
          router.push(`/batch/${batchId}`);
        }, 2000);
      } else {
        setAmendStatus('error');
        setErrorMessage(result.error || 'Failed to amend batch items');
      }
    } catch {
      setAmendStatus('error');
      setErrorMessage('Failed to amend batch items. Please try again.');
    }
  };

  if (!isClient) {
    return <EditBatchLoading />;
  }

  if (pageLoading) {
    return <EditBatchLoading />;
  }

  if (pageError) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{pageError}</AlertDescription>
          </Alert>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => loadPageData()} className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </Button>
            <Button variant="ghost" onClick={() => router.push(`/batch/${batchId}`)}>
              Back to Batch Details
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb />

        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <Link
              href={`/batch/${batchId}`}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Batch Details</span>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadPageData(true)}
              disabled={refreshing}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
            <FileEdit className="w-8 h-8 text-blue-600" />
            <span>Amend Invoice Items</span>
          </h1>
          <p className="text-slate-600 mt-2">
            Adjust the linen counts below to correct any invoice discrepancies. Once you submit the amendments, totals
            will be recalculated for this batch.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
          <div className="lg:col-span-2 xl:col-span-3 space-y-6">
            {batchDetails && (
              <BatchHeader batch={batchDetails} client={batchDetails.client} loading={refreshing} />
            )}

            <LinenCountGrid
              ref={linenGridRef}
              categories={categories}
              onItemsChange={handleLinenItemsChange}
              isLoading={refreshing && categories.length === 0}
              error={gridError}
              initialSelections={initialSelections}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-base text-slate-900">Amendment Tips</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 space-y-2">
                <p>• Update both sent and received quantities for each category you are correcting.</p>
                <p>• Provide discrepancy notes when counts do not match to keep an audit trail.</p>
                <p>• Use the summary card to confirm totals before submitting the amendment.</p>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 xl:col-span-1">
            <div className="sticky top-8 space-y-6">
              <BatchTotalCard
                items={linenItems}
                paperBatchId={batchDetails?.paper_batch_id || ''}
                clientName={batchDetails?.client.name}
                pickupDate={batchDetails?.pickup_date}
                status={amendStatus}
                errorMessage={errorMessage}
                mode="edit"
              />

              <div className="space-y-3">
                <Button
                  onClick={handleAmendInvoice}
                  disabled={!isFormReady() || amendStatus === 'creating'}
                  className="w-full flex items-center justify-center space-x-2 min-h-[48px] text-base font-semibold"
                >
                  {amendStatus === 'creating' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <FileEdit className="w-5 h-5" />
                      <span>Amend Invoice</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/batch/${batchId}`)}
                  className="w-full min-h-[48px] text-base font-semibold"
                  disabled={amendStatus === 'creating'}
                >
                  Cancel
                </Button>
              </div>

              {!isFormReady() && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>Add quantities to at least one category to enable amendments.</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditBatchPage() {
  return (
    <Suspense fallback={<EditBatchLoading />}>
      <EditBatchContent />
    </Suspense>
  );
}

