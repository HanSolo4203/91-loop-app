'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { ChemicalStockLevel } from '@/types/database';
import {
  asNumber,
  formatContainerLine,
  formatDaysLeft,
  formatQuantity,
  formatWeighedAt,
  isArchived,
  isDecantProduct,
  stockFillPercent,
  stockStatus,
  type StockStatus,
} from '@/components/inventory/stock-display';

interface StockTableProps {
  products: ChemicalStockLevel[];
  onOpen: (product: ChemicalStockLevel) => void;
  onEdit: (product: ChemicalStockLevel) => void;
  onReceive: (product: ChemicalStockLevel) => void;
  onStockTake: (product: ChemicalStockLevel) => void;
  onDelete: (product: ChemicalStockLevel) => void;
  onRestore: (product: ChemicalStockLevel) => void;
}

const statusStyles: Record<StockStatus, string> = {
  ok: 'bg-green-100 text-green-800',
  low: 'bg-amber-100 text-amber-800',
  out: 'bg-red-100 text-red-800',
};

const statusLabels: Record<StockStatus, string> = {
  ok: 'OK',
  low: 'Low',
  out: 'Out',
};

const barStyles: Record<StockStatus, string> = {
  ok: 'bg-green-600',
  low: 'bg-amber-500',
  out: 'bg-red-600',
};

function StatusBadge({ status }: { status: StockStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
        statusStyles[status]
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

function FillBar({
  onHand,
  reorderLevel,
  status,
  unit,
}: {
  onHand: number;
  reorderLevel: number;
  status: StockStatus;
  unit: unknown;
}) {
  const percent = stockFillPercent(onHand, reorderLevel);
  const target = reorderLevel > 0 ? reorderLevel * 3 : onHand;
  return (
    <div
      className="h-2 w-full min-w-[4.5rem] max-w-[7rem] rounded-full bg-slate-200 overflow-hidden"
      title={`${formatQuantity(onHand, unit)} of ${formatQuantity(target, unit)}`}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      aria-label="Stock against three times the reorder level"
    >
      <div
        className={cn('h-full rounded-full', barStyles[status])}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function RowActions({
  product,
  onEdit,
  onReceive,
  onStockTake,
  onDelete,
  onRestore,
}: {
  product: ChemicalStockLevel;
  onEdit: () => void;
  onReceive: () => void;
  onStockTake: () => void;
  onDelete: () => void;
  onRestore: () => void;
}) {
  const archived = isArchived(product);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const toggle = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const width = 192;
      const height = archived ? 96 : 176;
      const margin = 8;
      let left = rect.right - width;
      left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
      const spaceBelow = window.innerHeight - rect.bottom;
      const top =
        spaceBelow < height && rect.top > height ? rect.top - height - 4 : rect.bottom + 4;
      setPosition({ top, left });
    }
    setOpen((current) => !current);
  };

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  const itemClass =
    'flex w-full items-center px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100';

  return (
    <>
      <Button
        ref={buttonRef}
        type="button"
        variant="ghost"
        size="sm"
        className="h-9 w-9 px-0"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${product.name}`}
        onClick={toggle}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: position.top, left: position.left }}
            className="fixed z-[60] w-48 rounded-md border border-slate-200 bg-white py-1 shadow-lg"
          >
            <button type="button" role="menuitem" className={itemClass} onClick={() => choose(onEdit)}>
              Edit
            </button>
            {archived ? (
              <button
                type="button"
                role="menuitem"
                className={cn(itemClass, 'text-blue-700')}
                onClick={() => choose(onRestore)}
              >
                Restore
              </button>
            ) : (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className={itemClass}
                  onClick={() => choose(onReceive)}
                >
                  Receive delivery
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={itemClass}
                  onClick={() => choose(onStockTake)}
                >
                  Stock-take
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={cn(itemClass, 'text-red-700')}
                  onClick={() => choose(onDelete)}
                >
                  Archive / Delete
                </button>
              </>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

function rowClass(product: ChemicalStockLevel, status: StockStatus): string {
  if (isArchived(product)) return 'bg-slate-50 text-slate-500';
  if (status === 'out') return 'bg-red-50';
  if (status === 'low') return 'bg-amber-50';
  return '';
}

function productInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[1]?.[0] ?? '' : parts[0]?.[1] ?? '';
  return (first + second).toUpperCase() || '?';
}

function ProductName({ product, onOpen }: { product: ChemicalStockLevel; onOpen: () => void }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {product.image_url ? (
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
          <Image
            src={product.image_url}
            alt=""
            fill
            className="object-cover"
            sizes="40px"
          />
        </div>
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm font-medium text-slate-600">
          {productInitials(product.name)}
        </div>
      )}
      <div className="min-w-0">
        <p className={cn('font-medium text-slate-900', isArchived(product) && 'text-slate-500')}>
          <button
            type="button"
            onClick={onOpen}
            className={cn(
              'rounded-sm text-left hover:text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              isArchived(product) && 'text-slate-500'
            )}
          >
            {product.name}
          </button>
          {isArchived(product) && (
            <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Archived
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function StockFacts({ product, status }: { product: ChemicalStockLevel; status: StockStatus }) {
  const onHand = asNumber(product.on_hand_l);
  const reorder = asNumber(product.reorder_level_l);
  return (
    <div className="space-y-2">
      <div>
        <p
          className={cn(
            'text-2xl font-semibold tabular-nums leading-none',
            isArchived(product) ? 'text-slate-500' : 'text-slate-900'
          )}
        >
          {formatQuantity(onHand, product.unit)}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {formatContainerLine(
            isDecantProduct(product) && product.drum_l != null && asNumber(product.container_size_l) > 0
              ? asNumber(product.drum_l) / asNumber(product.container_size_l)
              : product.containers_on_hand,
            product.container_size_l,
            product.unit
          )}
        </p>
        {isDecantProduct(product) && (
          <p className="mt-1 text-sm text-slate-600">
            In drums {formatQuantity(product.drum_l, product.unit)} · In the bottle{' '}
            {formatQuantity(product.jug_l, product.unit)}
          </p>
        )}
      </div>
      <FillBar onHand={onHand} reorderLevel={reorder} status={status} unit={product.unit} />
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <dt className="text-slate-500">Reorder at</dt>
        <dd className="text-right tabular-nums">{formatQuantity(reorder, product.unit)}</dd>
        <dt className="text-slate-500">Avg use / day</dt>
        <dd className="text-right tabular-nums">{formatQuantity(product.avg_daily_use_l_14d, product.unit)}</dd>
        <dt className="text-slate-500">Days left</dt>
        <dd className="text-right tabular-nums">{formatDaysLeft(product.days_left)}</dd>
        <dt className="text-slate-500">Last weighed</dt>
        <dd className="text-right">{formatWeighedAt(product.last_weighed_at)}</dd>
      </dl>
    </div>
  );
}

export function StockTableSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading stock">
      <div className="hidden sm:grid grid-cols-6 gap-3 px-2 py-2">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-3 rounded bg-slate-200 animate-pulse" />
        ))}
      </div>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-14 rounded-md bg-slate-100 animate-pulse" />
      ))}
    </div>
  );
}

export default function StockTable({
  products,
  onOpen,
  onEdit,
  onReceive,
  onStockTake,
  onDelete,
  onRestore,
}: StockTableProps) {
  return (
    <>
      <div className="space-y-3 sm:hidden">
        {products.map((product) => {
          const status = stockStatus(product);
          return (
            <div
              key={product.id}
              className={cn('rounded-lg border border-slate-200 p-4', rowClass(product, status))}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <ProductName product={product} onOpen={() => onOpen(product)} />
                  <p className="text-sm text-slate-500">{product.supplier || '—'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <StatusBadge status={status} />
                  <RowActions
                    product={product}
                    onEdit={() => onEdit(product)}
                    onReceive={() => onReceive(product)}
                    onStockTake={() => onStockTake(product)}
                    onDelete={() => onDelete(product)}
                    onRestore={() => onRestore(product)}
                  />
                </div>
              </div>
              <StockFacts product={product} status={status} />
            </div>
          );
        })}
      </div>

      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">On hand</TableHead>
              <TableHead>Containers</TableHead>
              <TableHead>Level</TableHead>
              <TableHead className="text-right">Reorder at</TableHead>
              <TableHead className="text-right">Avg use / day</TableHead>
              <TableHead className="text-right">Days left</TableHead>
              <TableHead>Last weighed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const status = stockStatus(product);
              const onHand = asNumber(product.on_hand_l);
              return (
                <TableRow key={product.id} className={rowClass(product, status)}>
                  <TableCell>
                    <ProductName product={product} onOpen={() => onOpen(product)} />
                  </TableCell>
                  <TableCell>{product.supplier || '—'}</TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        'text-lg font-semibold tabular-nums',
                        isArchived(product) ? 'text-slate-500' : 'text-slate-900'
                      )}
                    >
                      {formatQuantity(onHand, product.unit)}
                    </span>
                    {isDecantProduct(product) && (
                      <p className="text-xs text-slate-500 tabular-nums">
                        In drums {formatQuantity(product.drum_l, product.unit)}
                        <br />
                        In the bottle {formatQuantity(product.jug_l, product.unit)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums whitespace-nowrap">
                    {formatContainerLine(
                      isDecantProduct(product) &&
                        product.drum_l != null &&
                        asNumber(product.container_size_l) > 0
                        ? asNumber(product.drum_l) / asNumber(product.container_size_l)
                        : product.containers_on_hand,
                      product.container_size_l,
                      product.unit
                    )}
                  </TableCell>
                  <TableCell>
                    <FillBar
                      onHand={onHand}
                      reorderLevel={asNumber(product.reorder_level_l)}
                      status={status}
                      unit={product.unit}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">
                    {formatQuantity(product.reorder_level_l, product.unit)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">
                    {formatQuantity(product.avg_daily_use_l_14d, product.unit)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatDaysLeft(product.days_left)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatWeighedAt(product.last_weighed_at)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={status} />
                  </TableCell>
                  <TableCell>
                    <RowActions
                      product={product}
                      onEdit={() => onEdit(product)}
                      onReceive={() => onReceive(product)}
                      onStockTake={() => onStockTake(product)}
                      onDelete={() => onDelete(product)}
                      onRestore={() => onRestore(product)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
