'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useMovements, useStockLevels, type MovementQuery } from '@/lib/hooks/use-inventory';
import type { ChemicalMovementListItem } from '@/lib/services/inventory';
import type { ChemicalMovementType } from '@/types/database';
import {
  asNumber,
  asNumberOrNull,
  formatContainers,
  formatRands,
  formatShiftDate,
  formatSignedLitres,
  isArchived,
  MOVEMENT_TYPE_CLASS,
  MOVEMENT_TYPE_LABEL,
} from '@/components/inventory/stock-display';

const fieldClass =
  'h-10 bg-white border-slate-300 text-slate-900 focus-visible:ring-slate-400';

const TYPE_OPTIONS: { value: '' | ChemicalMovementType; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'usage', label: 'Usage' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'opening_balance', label: 'Opening' },
];

export function MovementTypeBadge({ type }: { type: ChemicalMovementType }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
        MOVEMENT_TYPE_CLASS[type]
      )}
    >
      {MOVEMENT_TYPE_LABEL[type]}
    </span>
  );
}

function movementCost(row: ChemicalMovementListItem): { text: string; title?: string } {
  const unit = asNumberOrNull(row.unit_cost);
  if (unit == null) return { text: '—' };
  const containers = asNumberOrNull(row.containers);
  if (containers == null) return { text: formatRands(unit) };
  return {
    text: formatRands(containers * unit),
    title: `${containers} × ${formatRands(unit)}`,
  };
}

function litresClass(litres: number): string {
  if (litres > 0) return 'text-green-700';
  if (litres < 0) return 'text-red-700';
  return 'text-slate-700';
}

export default function MovementsTable() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [productId, setProductId] = useState('');
  const [type, setType] = useState<'' | ChemicalMovementType>('');

  const rangeError = from && to && from > to ? 'Start date must be on or before the end date.' : null;
  const filters = useMemo<MovementQuery>(() => {
    const next: MovementQuery = {};
    if (from) next.from = from;
    if (to) next.to = to;
    if (productId) next.product_id = productId;
    if (type) next.type = type;
    return next;
  }, [from, to, productId, type]);

  const stock = useStockLevels(true);
  const movements = useMovements(filters, { enabled: !rangeError });
  const products = [...(stock.data?.success ? stock.data.data ?? [] : [])].sort((a, b) =>
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
  );
  const rows = movements.data?.success ? movements.data.data ?? [] : [];
  const loadError = movements.isError
    ? movements.error instanceof Error
      ? movements.error.message
      : 'Could not load movements'
    : movements.data && !movements.data.success
      ? movements.data.error || 'Could not load movements'
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="move-product">Product</Label>
            <select
              id="move-product"
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
            <Label htmlFor="move-type">Type</Label>
            <select
              id="move-type"
              value={type}
              onChange={(event) => setType(event.target.value as '' | ChemicalMovementType)}
              className={cn(fieldClass, 'w-full rounded-md border px-3 text-sm')}
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="move-from">From</Label>
            <Input
              id="move-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="move-to">To</Label>
            <Input
              id="move-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className={fieldClass}
            />
          </div>
        </div>

        {rangeError && <p className="text-sm text-red-700">{rangeError}</p>}

        {movements.isLoading ? (
          <p className="py-8 text-center text-slate-500">Loading movements…</p>
        ) : loadError ? (
          <div className="space-y-3 py-8 text-center">
            <p className="text-red-600">{loadError}</p>
            <Button variant="outline" size="sm" onClick={() => movements.refetch()}>
              Try again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-slate-500">No stock movements match these filters.</p>
        ) : (
          <>
            <div className="space-y-3 sm:hidden">
              {rows.map((row) => {
                const litres = asNumber(row.litres);
                const cost = movementCost(row);
                return (
                  <div key={row.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{row.product_name}</p>
                        <p className="text-sm text-slate-500">{formatShiftDate(row.occurred_on)}</p>
                      </div>
                      <MovementTypeBadge type={row.movement_type} />
                    </div>
                    <p className={cn('text-xl font-semibold tabular-nums', litresClass(litres))}>
                      {formatSignedLitres(litres)}
                    </p>
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                      <dt className="text-slate-500">Containers</dt>
                      <dd className="text-right tabular-nums">{formatContainers(row.containers)}</dd>
                      <dt className="text-slate-500">Cost</dt>
                      <dd className="text-right tabular-nums" title={cost.title}>
                        {cost.text}
                      </dd>
                      <dt className="text-slate-500">Reference</dt>
                      <dd className="text-right">{row.reference || '—'}</dd>
                      <dt className="text-slate-500">By</dt>
                      <dd className="text-right">{row.recorded_by || '—'}</dd>
                    </dl>
                    {row.note && <p className="mt-2 text-sm text-slate-600">{row.note}</p>}
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Litres</TableHead>
                    <TableHead className="text-right">Containers</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const litres = asNumber(row.litres);
                    const cost = movementCost(row);
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap">{formatShiftDate(row.occurred_on)}</TableCell>
                        <TableCell className="font-medium">{row.product_name}</TableCell>
                        <TableCell>
                          <MovementTypeBadge type={row.movement_type} />
                        </TableCell>
                        <TableCell className={cn('text-right tabular-nums whitespace-nowrap font-medium', litresClass(litres))}>
                          {formatSignedLitres(litres)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatContainers(row.containers)}</TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap" title={cost.title}>
                          {cost.text}
                        </TableCell>
                        <TableCell>{row.reference || '—'}</TableCell>
                        <TableCell className="max-w-[16rem] truncate" title={row.note ?? undefined}>
                          {row.note || '—'}
                        </TableCell>
                        <TableCell>{row.recorded_by || '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
