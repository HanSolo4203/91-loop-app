'use client';

import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useEmployees } from '@/lib/hooks/use-employees';
import {
  defaultWeighInRange,
  useDeleteWeighIn,
  useUpdateWeighIn,
  useWeighIns,
  type WeighInQuery,
} from '@/lib/hooks/use-inventory';
import type {
  AdminUpdateWeighInRequest,
  ChemicalWeighInWithEmployees,
  UsageByDayRow,
} from '@/lib/services/inventory';
import WeighInCorrectDialog from '@/components/inventory/weigh-in-correct-dialog';
import {
  asNumber,
  formatActorWhen,
  formatKg,
  formatQuantity,
  formatShiftDate,
  formatSignedQuantity,
  isArchived,
  isUnclosedWeighIn,
  stockUnit,
} from '@/components/inventory/stock-display';

type UsageChartComponent = typeof import('./usage-chart').default;

let usageChartComponent: UsageChartComponent | null = null;
let usageChartLoad: Promise<void> | null = null;

export function preloadWeighInChart(): Promise<void> {
  if (!usageChartLoad) {
    usageChartLoad = import('./usage-chart').then((mod) => {
      usageChartComponent = mod.default;
    });
  }
  return usageChartLoad;
}

function UsageChartSlot({
  rows,
  from,
  to,
  productId,
}: {
  rows: UsageByDayRow[];
  from: string;
  to: string;
  productId?: string;
}) {
  const [ready, setReady] = useState(usageChartComponent != null);

  useEffect(() => {
    let cancelled = false;
    void preloadWeighInChart().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready || !usageChartComponent) {
    return <div className="h-72" />;
  }

  const UsageChart = usageChartComponent;
  return <UsageChart rows={rows} from={from} to={to} productId={productId} />;
}

const fieldClass =
  'h-10 bg-white border-slate-300 text-slate-900 focus-visible:ring-slate-400';

function wasEdited(value: unknown): boolean {
  return value === true || value === 'true' || value === 't';
}

function formatUsed(value: unknown, unit: unknown): string {
  if (value == null || value === '') return '—';
  const amount = asNumber(value);
  return amount < 0 ? formatSignedQuantity(amount, unit) : formatQuantity(amount, unit);
}

function usageHeading(rows: UsageByDayRow[], productId: string): string {
  const visible = productId ? rows.filter((row) => row.product_id === productId) : rows;
  const units = new Set(visible.map((row) => stockUnit(row.unit)));
  if (units.size === 1 && units.has('kg')) return 'Kilograms used';
  if (units.size === 1) return 'Litres used';
  return 'Amount used';
}

function queryMessage(
  isError: boolean,
  error: unknown,
  data: { success: boolean; error: string | null } | undefined,
  fallback: string
): string | null {
  if (isError) return error instanceof Error ? error.message : fallback;
  if (data && !data.success) return data.error || fallback;
  return null;
}

function pouredLabel(row: ChemicalWeighInWithEmployees): string {
  if (row.product?.tracking_mode === 'decant' || asNumber(row.poured_l) > 0) {
    return formatQuantity(row.poured_l, row.product?.unit);
  }
  return '—';
}

function StatusMarks({ row, stale }: { row: ChemicalWeighInWithEmployees; stale: boolean }) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
            row.status === 'closed' ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-700'
          )}
        >
          {row.status === 'closed' ? 'Closed' : 'Open'}
        </span>
        {wasEdited(row.edited_by_admin) && (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
            Edited
          </span>
        )}
      </div>
      {stale && (
        <p className="text-xs font-medium text-amber-800">Not closed — end weight missing</p>
      )}
    </div>
  );
}

function downloadCsv(rows: ChemicalWeighInWithEmployees[], from: string, to: string) {
  const csv = Papa.unparse({
    fields: [
      'Shift date',
      'Product',
      'Start kg',
      'Started by',
      'Started at',
      'Poured',
      'Added',
      'End kg',
      'Ended by',
      'Ended at',
      'Used',
      'Unit',
      'Status',
      'Edited',
      'Notes',
    ],
    data: rows.map((row) => ({
      'Shift date': row.shift_date,
      Product: row.product?.name ?? 'Unknown product',
      'Start kg': asNumber(row.start_kg),
      'Started by': row.start_employee?.full_name ?? '',
      'Started at': row.start_recorded_at,
      Poured: asNumber(row.poured_l),
      Added: asNumber(row.added_l),
      'End kg': row.end_kg == null ? '' : asNumber(row.end_kg),
      'Ended by': row.end_employee?.full_name ?? '',
      'Ended at': row.end_recorded_at ?? '',
      Used: row.used_l == null ? '' : asNumber(row.used_l),
      Unit: stockUnit(row.product?.unit),
      Status: row.status,
      Edited: wasEdited(row.edited_by_admin) ? 'Yes' : 'No',
      Notes: row.notes ?? '',
    })),
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const stamp = from && to ? `${from}-to-${to}` : 'export';
  link.download = `weigh-ins-${stamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export interface WeighInProductOption {
  id: string;
  name: string;
  is_active: unknown;
}

export default function WeighInsTable({ products: stockProducts }: { products: WeighInProductOption[] }) {
  const [from, setFrom] = useState(() => defaultWeighInRange().from);
  const [to, setTo] = useState(() => defaultWeighInRange().to);
  const [productId, setProductId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [status, setStatus] = useState<'' | 'open' | 'closed'>('');
  const [editing, setEditing] = useState<ChemicalWeighInWithEmployees | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChemicalWeighInWithEmployees | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const rangeError = from && to && from > to ? 'Start date must be on or before the end date.' : null;
  const dateFilters = useMemo<WeighInQuery>(() => {
    const next: WeighInQuery = {};
    if (from) next.from = from;
    if (to) next.to = to;
    return next;
  }, [from, to]);

  const employees = useEmployees();
  const weighIns = useWeighIns(dateFilters, { enabled: !rangeError });
  const updateWeighIn = useUpdateWeighIn();
  const deleteWeighIn = useDeleteWeighIn();

  const allRows = weighIns.data?.success ? weighIns.data.data ?? [] : [];
  const products = useMemo(() => {
    const byId = new Map(stockProducts.map((product) => [product.id, product]));
    for (const row of allRows) {
      if (!byId.has(row.product_id)) {
        byId.set(row.product_id, {
          id: row.product_id,
          name: row.product?.name ?? 'Unknown product',
          is_active: true,
        });
      }
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  }, [stockProducts, allRows]);
  const employeeOptions = [...(employees.data?.success ? employees.data.data ?? [] : [])].sort((a, b) =>
    a.full_name.localeCompare(b.full_name, 'en', { sensitivity: 'base' })
  );
  const rows = useMemo(
    () =>
      allRows.filter((row) => {
        if (productId && row.product_id !== productId) return false;
        if (status && row.status !== status) return false;
        if (
          employeeId &&
          row.start_employee_id !== employeeId &&
          row.end_employee_id !== employeeId
        ) {
          return false;
        }
        return true;
      }),
    [allRows, productId, employeeId, status]
  );
  const usageRows = useMemo<UsageByDayRow[]>(() => {
    const points: UsageByDayRow[] = [];
    for (const row of allRows) {
      if (row.status !== 'closed' || row.used_l == null) continue;
      points.push({
        product_id: row.product_id,
        product_name: row.product?.name ?? 'Unknown product',
        shift_date: row.shift_date,
        litres: asNumber(row.used_l),
        unit: stockUnit(row.product?.unit),
      });
    }
    return points;
  }, [allRows]);
  const loadError = queryMessage(weighIns.isError, weighIns.error, weighIns.data, 'Could not load weigh-ins');

  const saveCorrection = async (id: string, payload: AdminUpdateWeighInRequest) => {
    setActionError(null);
    await updateWeighIn.mutateAsync({ id, payload });
    setNotice(payload.end_kg != null && editing?.status === 'open' ? 'Weigh-in closed.' : 'Weigh-in updated.');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setActionError(null);
    try {
      await deleteWeighIn.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      setNotice('Weigh-in deleted.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not delete this weigh-in');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between space-y-0">
        <CardTitle>Weigh-ins</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => downloadCsv(rows, from, to)}
          disabled={rows.length === 0 || weighIns.isFetching}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="weigh-from">From</Label>
            <Input
              id="weigh-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="weigh-to">To</Label>
            <Input
              id="weigh-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="weigh-product">Product</Label>
            <select
              id="weigh-product"
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              className={cn(fieldClass, 'w-full rounded-md border px-3 text-sm')}
            >
              <option value="">All products</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                  {isArchived(product) ? ' (archived)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="weigh-employee">Employee</Label>
            <select
              id="weigh-employee"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              className={cn(fieldClass, 'w-full rounded-md border px-3 text-sm')}
            >
              <option value="">All employees</option>
              {employeeOptions.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name}
                  {employee.status === 'inactive' ? ' (inactive)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="weigh-status">Status</Label>
            <select
              id="weigh-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as '' | 'open' | 'closed')}
              className={cn(fieldClass, 'w-full rounded-md border px-3 text-sm')}
            >
              <option value="">Open and closed</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {rangeError && <p className="text-sm text-red-700">{rangeError}</p>}
        {notice && (
          <p role="status" className="text-sm text-green-800">
            {notice}
          </p>
        )}

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            {usageHeading(usageRows, productId)}
          </h3>
          {rangeError || !from || !to ? (
            <p className="py-10 text-center text-sm text-slate-500">
              {rangeError ?? 'Choose a start and end date to see usage.'}
            </p>
          ) : weighIns.isLoading ? (
            <div className="h-72" />
          ) : (
            <UsageChartSlot rows={usageRows} from={from} to={to} productId={productId || undefined} />
          )}
        </div>

        {weighIns.isLoading ? (
          <p className="py-8 text-center text-slate-500">Loading weigh-ins…</p>
        ) : loadError ? (
          <div className="space-y-3 py-8 text-center">
            <p className="text-red-600">{loadError}</p>
            <Button variant="outline" size="sm" onClick={() => weighIns.refetch()}>
              Try again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-slate-500">No weigh-ins in this range.</p>
        ) : (
          <>
            <div className="space-y-3 sm:hidden">
              {rows.map((row) => {
                const stale = isUnclosedWeighIn(row.status, row.start_recorded_at);
                return (
                  <div
                    key={row.id}
                    className={cn('rounded-lg border border-slate-200 p-4', stale && 'border-amber-300 bg-amber-50')}
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{row.product?.name ?? 'Unknown product'}</p>
                        <p className="text-sm text-slate-500">{formatShiftDate(row.shift_date)}</p>
                      </div>
                      <StatusMarks row={row} stale={stale} />
                    </div>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                      <dt className="text-slate-500">Start</dt>
                      <dd className="text-right">
                        <span className="tabular-nums">{formatKg(row.start_kg)}</span>
                        <span className="block text-xs text-slate-500">
                          {formatActorWhen(row.start_employee?.full_name, row.start_recorded_at)}
                        </span>
                      </dd>
                      <dt className="text-slate-500">Poured</dt>
                      <dd className="text-right tabular-nums">{pouredLabel(row)}</dd>
                      <dt className="text-slate-500">Added</dt>
                      <dd className="text-right tabular-nums">
                        {formatQuantity(row.added_l, row.product?.unit)}
                      </dd>
                      <dt className="text-slate-500">End</dt>
                      <dd className="text-right">
                        <span className="tabular-nums">{row.end_kg == null ? '—' : formatKg(row.end_kg)}</span>
                        <span className="block text-xs text-slate-500">
                          {formatActorWhen(row.end_employee?.full_name, row.end_recorded_at)}
                        </span>
                      </dd>
                      <dt className="text-slate-500">Used</dt>
                      <dd className={cn('text-right tabular-nums', asNumber(row.used_l) < 0 && 'text-red-700')}>
                        {formatUsed(row.used_l, row.product?.unit)}
                      </dd>
                    </dl>
                    <div className="mt-3 flex gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => setEditing(row)}>
                        Correct
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-red-700"
                        onClick={() => {
                          setActionError(null);
                          setDeleteTarget(row);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shift date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Start kg</TableHead>
                    <TableHead className="text-right">Poured</TableHead>
                    <TableHead className="text-right">Added</TableHead>
                    <TableHead>End kg</TableHead>
                    <TableHead className="text-right">Used</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-36">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const stale = isUnclosedWeighIn(row.status, row.start_recorded_at);
                    return (
                      <TableRow key={row.id} className={cn(stale && 'bg-amber-50')}>
                        <TableCell className="whitespace-nowrap">{formatShiftDate(row.shift_date)}</TableCell>
                        <TableCell className="font-medium">{row.product?.name ?? 'Unknown product'}</TableCell>
                        <TableCell>
                          <p className="tabular-nums">{formatKg(row.start_kg)}</p>
                          <p className="text-xs text-slate-500">
                            {formatActorWhen(row.start_employee?.full_name, row.start_recorded_at)}
                          </p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">
                          {pouredLabel(row)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">
                          {formatQuantity(row.added_l, row.product?.unit)}
                        </TableCell>
                        <TableCell>
                          <p className="tabular-nums">{row.end_kg == null ? '—' : formatKg(row.end_kg)}</p>
                          <p className="text-xs text-slate-500">
                            {formatActorWhen(row.end_employee?.full_name, row.end_recorded_at)}
                          </p>
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right tabular-nums whitespace-nowrap',
                            row.used_l != null && asNumber(row.used_l) < 0 && 'text-red-700'
                          )}
                        >
                          {formatUsed(row.used_l, row.product?.unit)}
                        </TableCell>
                        <TableCell>
                          <StatusMarks row={row} stale={stale} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(row)}>
                              Correct
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-red-700"
                              onClick={() => {
                                setActionError(null);
                                setDeleteTarget(row);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>

      <WeighInCorrectDialog
        weighIn={editing}
        pending={updateWeighIn.isPending}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
        onSave={saveCorrection}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(next) => {
          if (!next) {
            setDeleteTarget(null);
            setActionError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete weigh-in?</DialogTitle>
            <DialogDescription className="text-slate-600">
              {deleteTarget
                ? `${deleteTarget.product?.name ?? 'This product'} on ${formatShiftDate(deleteTarget.shift_date)} will be removed.`
                : ''}{' '}
              {deleteTarget?.status === 'closed'
                ? `The ${stockUnit(deleteTarget.product?.unit) === 'kg' ? 'kilograms' : 'litres'} it recorded will come back onto stock.`
                : 'This cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          {actionError && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {actionError}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteWeighIn.isPending}
            >
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={deleteWeighIn.isPending}>
              {deleteWeighIn.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
