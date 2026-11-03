'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/auth-guard';
import Navigation from '@/components/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MetricCard from '@/components/dashboard/metric-card';
import StockTable, { StockTableSkeleton } from '@/components/inventory/stock-table';
import WeighInsTable, { preloadWeighInChart } from '@/components/inventory/weigh-ins-table';
import MovementsTable from '@/components/inventory/movements-table';
import ProductHistorySheet from '@/components/inventory/product-history-sheet';
import ProductFormDialog, { type ProductFormValues } from '@/components/inventory/product-form-dialog';
import ReceiveDeliveryDialog from '@/components/inventory/receive-delivery-dialog';
import StockTakeDialog from '@/components/inventory/stock-take-dialog';
import DeleteProductDialog from '@/components/inventory/delete-product-dialog';
import {
  AlertTriangle,
  Banknote,
  Droplets,
  FlaskConical,
  Package,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChemicalStockLevel } from '@/types/database';
import type { UpdateProductRequest } from '@/lib/services/inventory';
import {
  useCreateProduct,
  useDeleteProduct,
  useRecordDelivery,
  useRecordStockTake,
  useRestoreProduct,
  defaultWeighInRange,
  invalidateInventory,
  useStockLevels,
  useUpdateProduct,
  useUsage,
  weighInsQueryOptions,
  type RecordDeliveryPayload,
  type RecordStockTakePayload,
} from '@/lib/hooks/use-inventory';
import {
  formatCount,
  formatMixedUsage,
  formatRands,
  isArchived,
  johannesburgDate,
  needsReorder,
  reorderBannerText,
  stockValue,
} from '@/components/inventory/stock-display';

type Notice = { tone: 'success' | 'error'; text: string };

function toUpdatePayload(values: ProductFormValues): UpdateProductRequest {
  return {
    name: values.name,
    supplier: values.supplier,
    unit: values.unit,
    container_size_l: values.container_size_l,
    reorder_level_l: values.reorder_level_l,
    reorder_qty_containers: values.reorder_qty_containers,
    cost_per_container: values.cost_per_container,
    notes: values.notes,
    image_url: values.image_url,
    tracking_mode: values.tracking_mode,
    issue_size_l: values.issue_size_l,
    jug_baseline_l: values.jug_baseline_l,
  };
}

function InventoryPageContent() {
  const [activeTab, setActiveTab] = useState('stock');
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ChemicalStockLevel | null>(null);
  const [deliveryProduct, setDeliveryProduct] = useState<ChemicalStockLevel | null>(null);
  const [stockTakeProduct, setStockTakeProduct] = useState<ChemicalStockLevel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChemicalStockLevel | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailSnapshot, setDetailSnapshot] = useState<ChemicalStockLevel | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const usageRange = useMemo(
    () => ({ from: johannesburgDate(-6), to: johannesburgDate(0) }),
    []
  );

  const queryClient = useQueryClient();
  const stockQuery = useStockLevels(showArchived);
  const usageQuery = useUsage(usageRange);

  useEffect(() => {
    preloadWeighInChart();
    void queryClient.prefetchQuery(weighInsQueryOptions(defaultWeighInRange()));
  }, [queryClient]);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const restoreProduct = useRestoreProduct();
  const recordDelivery = useRecordDelivery();
  const recordStockTake = useRecordStockTake();

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void invalidateInventory(queryClient);
    }, 10_000);
    return () => window.clearInterval(id);
  }, [queryClient]);

  const refreshing = stockQuery.isFetching || usageQuery.isFetching;

  const products = stockQuery.data?.success ? stockQuery.data.data ?? [] : [];
  const detailProduct = useMemo(() => {
    if (!detailId) return null;
    return products.find((product) => product.id === detailId) ?? detailSnapshot;
  }, [detailId, products, detailSnapshot]);
  const activeProducts = products.filter((product) => !isArchived(product));
  const lowCount = activeProducts.filter(needsReorder).length;
  const banner = reorderBannerText(products);
  const usageSummary = usageQuery.data?.success
    ? formatMixedUsage(usageQuery.data.data ?? [])
    : formatMixedUsage([]);

  const flash = (text: string, tone: Notice['tone'] = 'success') => {
    setNotice({ tone, text });
  };

  const handleSaveProduct = async (values: ProductFormValues) => {
    if (editing) {
      await updateProduct.mutateAsync({ id: editing.id, payload: toUpdatePayload(values) });
      flash('Detergent updated.');
      return;
    }
    await createProduct.mutateAsync({
      name: values.name,
      supplier: values.supplier,
      unit: values.unit,
      container_size_l: values.container_size_l,
      reorder_level_l: values.reorder_level_l,
      reorder_qty_containers: values.reorder_qty_containers,
      cost_per_container: values.cost_per_container,
      notes: values.notes,
      image_url: values.image_url,
      opening_stock_l: values.opening_stock_l,
      tracking_mode: values.tracking_mode,
      issue_size_l: values.issue_size_l,
      jug_baseline_l: values.jug_baseline_l,
    });
    flash(
      values.opening_stock_l != null && values.opening_stock_l > 0
        ? 'Detergent added with opening stock.'
        : 'Detergent added.'
    );
  };

  const handleDelivery = async (payload: RecordDeliveryPayload) => {
    await recordDelivery.mutateAsync(payload);
    flash('Delivery recorded.');
  };

  const handleStockTake = async (payload: RecordStockTakePayload) => {
    const result = await recordStockTake.mutateAsync(payload);
    flash(
      result.difference === 0
        ? 'Counted stock matches the quantity on hand.'
        : 'Stock take saved.'
    );
  };

  const handleRestore = async (product: ChemicalStockLevel) => {
    try {
      await restoreProduct.mutateAsync(product.id);
      flash(`${product.name} restored.`);
    } catch (error) {
      flash(error instanceof Error ? error.message : 'Could not restore this detergent', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      const result = await deleteProduct.mutateAsync(deleteTarget.id);
      if ('archived' in result && result.archived) {
        setShowArchived(true);
        flash('This product has history, so it was archived instead of deleted.');
      } else {
        flash('Product deleted.');
      }
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Could not remove this detergent');
    }
  };

  const stockError = stockQuery.isError
    ? stockQuery.error instanceof Error
      ? stockQuery.error.message
      : 'Could not load stock'
    : stockQuery.data && !stockQuery.data.success
      ? stockQuery.data.error || 'Could not load stock'
      : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center space-x-3">
                <FlaskConical className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
                <span>Inventory</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
                Track detergent on hand, deliveries, and when to reorder.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void invalidateInventory(queryClient)}
              className="flex items-center justify-center space-x-2 w-full sm:w-auto"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {notice && (
          <div
            role="status"
            className={cn(
              'mb-6 rounded-lg border px-4 py-3 text-sm',
              notice.tone === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-green-200 bg-green-50 text-green-800'
            )}
          >
            {notice.text}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="weigh-ins">Weigh-ins</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="space-y-6 mt-6">
            {banner && (
              <div
                role="alert"
                className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{banner}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Active products"
                value={stockError ? '—' : formatCount(activeProducts.length)}
                icon={Package}
                loading={stockQuery.isPending && stockQuery.data == null}
              />
              <MetricCard
                title="Low stock"
                value={stockError ? '—' : formatCount(lowCount)}
                icon={AlertTriangle}
                variant={!stockError && lowCount > 0 ? 'discrepancies' : 'default'}
                loading={stockQuery.isPending && stockQuery.data == null}
              />
              <MetricCard
                title="Used last 7 days"
                value={
                  (usageQuery.isPending && usageQuery.data == null) || usageQuery.isError
                    ? '—'
                    : usageSummary
                }
                icon={Droplets}
                loading={usageQuery.isPending && usageQuery.data == null}
              />
              <MetricCard
                title="Stock value"
                value={stockError ? '—' : formatRands(stockValue(products))}
                icon={Banknote}
                loading={stockQuery.isPending && stockQuery.data == null}
              />
            </div>

            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between space-y-0">
                <CardTitle>Stock</CardTitle>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showArchived}
                      onChange={(event) => setShowArchived(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                    Show archived
                  </label>
                  <Button
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add detergent
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {stockQuery.isPending && stockQuery.data == null ? (
                  <StockTableSkeleton />
                ) : stockError ? (
                  <div className="text-center py-8 space-y-3">
                    <p className="text-red-600">{stockError}</p>
                    <Button variant="outline" size="sm" onClick={() => stockQuery.refetch()}>
                      Try again
                    </Button>
                  </div>
                ) : products.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">
                    {showArchived ? 'No detergents yet.' : 'No active detergents yet.'}
                  </p>
                ) : (
                  <StockTable
                    products={products}
                    onOpen={(product) => {
                      setDetailId(product.id);
                      setDetailSnapshot(product);
                    }}
                    onEdit={(product) => {
                      setEditing(product);
                      setFormOpen(true);
                    }}
                    onReceive={setDeliveryProduct}
                    onStockTake={setStockTakeProduct}
                    onDelete={(product) => {
                      setDeleteError(null);
                      setDeleteTarget(product);
                    }}
                    onRestore={handleRestore}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weigh-ins" className="mt-6">
            {activeTab === 'weigh-ins' ? <WeighInsTable products={products} /> : null}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {activeTab === 'history' ? <MovementsTable /> : null}
          </TabsContent>
        </Tabs>

        <ProductFormDialog
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditing(null);
          }}
          product={editing}
          onSave={handleSaveProduct}
        />
        <ReceiveDeliveryDialog
          product={deliveryProduct}
          onOpenChange={(open) => {
            if (!open) setDeliveryProduct(null);
          }}
          onSave={handleDelivery}
        />
        <StockTakeDialog
          product={stockTakeProduct}
          onOpenChange={(open) => {
            if (!open) setStockTakeProduct(null);
          }}
          onSave={handleStockTake}
        />
        <ProductHistorySheet
          product={detailProduct}
          onOpenChange={(open) => {
            if (!open) {
              setDetailId(null);
              setDetailSnapshot(null);
            }
          }}
        />
        <DeleteProductDialog
          product={deleteTarget}
          pending={deleteProduct.isPending}
          error={deleteError}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTarget(null);
              setDeleteError(null);
            }
          }}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <AuthGuard>
      <InventoryPageContent />
    </AuthGuard>
  );
}
