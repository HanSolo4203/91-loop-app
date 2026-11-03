'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMovements, useWeighIns } from '@/lib/hooks/use-inventory';
import type { ChemicalStockLevel } from '@/types/database';
import { MovementTypeBadge } from '@/components/inventory/movements-table';
import type { OnHandPoint } from '@/components/inventory/on-hand-chart';
import {
  asNumber,
  eachIsoDate,
  formatActorWhen,
  formatDayTick,
  formatKg,
  formatQuantity,
  formatShiftDate,
  isDecantProduct,
  formatSignedQuantity,
  stockUnit,
  isUnclosedWeighIn,
  johannesburgDate,
} from '@/components/inventory/stock-display';

const OnHandChart = dynamic(() => import('./on-hand-chart'), {
  ssr: false,
  loading: () => (
    <div className="flex h-56 items-center justify-center text-sm text-slate-500">Loading charts...</div>
  ),
});

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function onHandSeries(
  currentOnHand: number,
  movements: { occurred_on: string; litres: unknown }[],
  from: string,
  to: string
): OnHandPoint[] {
  const days = eachIsoDate(from, to);
  const net = new Map<string, number>();
  let afterWindow = 0;
  for (const movement of movements) {
    const litres = asNumber(movement.litres);
    if (movement.occurred_on > to) {
      afterWindow += litres;
    } else if (movement.occurred_on >= from && movement.occurred_on <= to) {
      net.set(movement.occurred_on, (net.get(movement.occurred_on) ?? 0) + litres);
    }
  }
  const points: OnHandPoint[] = new Array(days.length);
  let running = currentOnHand - afterWindow;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    const date = days[index];
    points[index] = { date, label: formatDayTick(date), on_hand: round3(running) };
    running -= net.get(date) ?? 0;
  }
  return points;
}

interface ProductHistorySheetProps {
  product: ChemicalStockLevel | null;
  onOpenChange: (open: boolean) => void;
}

export default function ProductHistorySheet({ product, onOpenChange }: ProductHistorySheetProps) {
  const range = useMemo(
    () => ({ from: johannesburgDate(-29), to: johannesburgDate(0) }),
    [product?.id]
  );
  const open = !!product;
  const movements = useMovements(
    { product_id: product?.id, from: range.from },
    { enabled: open }
  );
  const weighIns = useWeighIns(
    { product_id: product?.id, from: range.from, to: range.to },
    { enabled: open }
  );

  const movementRows = (movements.data?.success ? movements.data.data ?? [] : []).filter(
    (row) => row.occurred_on >= range.from && row.occurred_on <= range.to
  );
  const weighInRows = weighIns.data?.success ? weighIns.data.data ?? [] : [];
  const movementError = movements.isError
    ? movements.error instanceof Error
      ? movements.error.message
      : 'Could not load movements'
    : null;
  const weighInError = weighIns.isError
    ? weighIns.error instanceof Error
      ? weighIns.error.message
      : 'Could not load weigh-ins'
    : null;
  const points =
    product && !movements.isLoading && !movementError
      ? onHandSeries(asNumber(product.on_hand_l), movements.data?.success ? movements.data.data ?? [] : [], range.from, range.to)
      : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="pr-8 text-left">
          <SheetTitle>{product?.name ?? 'Product'}</SheetTitle>
          <SheetDescription>
            Last 30 days. On hand now {product ? formatQuantity(product.on_hand_l, product.unit) : '—'}
            {product && isDecantProduct(product)
              ? `. In drums ${formatQuantity(product.drum_l, product.unit)}. In the bottle ${formatQuantity(product.jug_l, product.unit)}.`
              : '.'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">On hand</h3>
            {movements.isLoading ? (
              <div className="flex h-56 items-center justify-center text-sm text-slate-500">Loading charts...</div>
            ) : movementError ? (
              <div className="space-y-2 py-4 text-center">
                <p className="text-sm text-red-600">{movementError}</p>
                <Button variant="outline" size="sm" onClick={() => movements.refetch()}>
                  Try again
                </Button>
              </div>
            ) : (
              <OnHandChart points={points} unit={stockUnit(product?.unit)} />
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Movements</h3>
            {movements.isLoading ? (
              <p className="py-4 text-sm text-slate-500">Loading movements…</p>
            ) : movementError ? null : movementRows.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">No movements in the last 30 days.</p>
            ) : (
              <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                {movementRows.map((row) => {
                  const litres = asNumber(row.litres);
                  return (
                    <li key={row.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <MovementTypeBadge type={row.movement_type} />
                          <span className="text-sm text-slate-500">{formatShiftDate(row.occurred_on)}</span>
                        </div>
                        {row.note && <p className="mt-1 text-sm text-slate-600">{row.note}</p>}
                        <p className="mt-1 text-xs text-slate-500">{row.recorded_by || '—'}</p>
                      </div>
                      <p
                        className={cn(
                          'shrink-0 text-sm font-semibold tabular-nums',
                          litres > 0 && 'text-green-700',
                          litres < 0 && 'text-red-700'
                        )}
                      >
                        {formatSignedQuantity(litres, product?.unit)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Weigh-ins</h3>
            {weighIns.isLoading ? (
              <p className="py-4 text-sm text-slate-500">Loading weigh-ins…</p>
            ) : weighInError ? (
              <div className="space-y-2 py-4 text-center">
                <p className="text-sm text-red-600">{weighInError}</p>
                <Button variant="outline" size="sm" onClick={() => weighIns.refetch()}>
                  Try again
                </Button>
              </div>
            ) : weighInRows.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">No weigh-ins in the last 30 days.</p>
            ) : (
              <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                {weighInRows.map((row) => {
                  const stale = isUnclosedWeighIn(row.status, row.start_recorded_at);
                  return (
                    <li key={row.id} className={cn('px-3 py-2.5', stale && 'bg-amber-50')}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-slate-900">{formatShiftDate(row.shift_date)}</p>
                        <p className="text-sm tabular-nums text-slate-700">
                          {row.used_l == null ? '—' : formatQuantity(row.used_l, row.product?.unit ?? product?.unit)}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Start {formatKg(row.start_kg)} · {formatActorWhen(row.start_employee?.full_name, row.start_recorded_at)}
                      </p>
                      {asNumber(row.poured_l) > 0 && (
                        <p className="text-xs text-slate-500">
                          Poured {formatQuantity(row.poured_l, row.product?.unit ?? product?.unit)} from the drum
                        </p>
                      )}
                      <p className="text-xs text-slate-500">
                        End {row.end_kg == null ? '—' : formatKg(row.end_kg)} ·{' '}
                        {formatActorWhen(row.end_employee?.full_name, row.end_recorded_at)}
                      </p>
                      {stale && (
                        <p className="mt-1 text-xs font-medium text-amber-800">
                          Not closed — end weight missing
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
