'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import TabletNumericInput from '@/components/ui/tablet-numeric-input';
import { Calculator, CheckCircle, Copy, GripVertical, RotateCcw, Star, Trash2, X, Zap } from 'lucide-react';
import { formatCurrencySSR } from '@/lib/utils/formatters';
import type { LinenCountItem } from '@/components/batch/linen-count-grid';

export interface DragHandleProps {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
}

export interface LinenEntryProps {
  item: LinenCountItem;
  isFavorite: boolean;
  canToggleFavorite: boolean;
  isFocused: boolean;
  isEditingLayout: boolean;
  validationErrors: Record<string, string>;
  dragHandle?: DragHandleProps | null;
  onQuantityChange: (categoryId: string, field: 'sent' | 'received', value: string) => void;
  onDiscrepancyChange: (categoryId: string, value: string) => void;
  onCopy: (categoryId: string) => void;
  onClear: (categoryId: string) => void;
  onClearDiscrepancy: (categoryId: string) => void;
  onExpressToggle: (categoryId: string, checked: boolean) => void;
  onToggleFavorite?: (categoryId: string, nextFavorite: boolean) => void;
  onFocus: (categoryId: string) => void;
  onRemoveFromLayout?: (categoryId: string) => void;
}

export function SortableLinenEntry({
  id,
  children,
}: {
  id: string;
  children: (dragHandle: DragHandleProps) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
    position: 'relative',
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="h-full">
      {children({ attributes, listeners })}
    </div>
  );
}

export function LinenListTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-300 bg-white">
      <div className="bg-slate-800 py-1.5 text-center text-xs font-semibold tracking-[0.18em] text-white">
        LINEN LIST
      </div>
      <div className="hidden border-b border-slate-300 bg-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-600 md:grid md:grid-cols-[minmax(0,1.7fr)_8.5rem_8.5rem_minmax(0,1.3fr)]">
        <div className="border-r border-slate-300 px-3 py-2">Item Description</div>
        <div className="border-r border-slate-300 px-3 py-2 text-center">QTY (Dispatched)</div>
        <div className="border-r border-slate-300 px-3 py-2 text-center">QTY (Returned)</div>
        <div className="px-3 py-2">Notes</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function DragHandle({ dragHandle }: { dragHandle: DragHandleProps }) {
  return (
    <button
      type="button"
      className="mt-0.5 shrink-0 cursor-grab touch-none rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
      aria-label="Drag to reorder"
      {...dragHandle.attributes}
      {...dragHandle.listeners}
      onClick={(event) => event.stopPropagation()}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
      aria-label="Remove from layout"
      title="Remove from this client's list"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

function ExpressControl({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`flex items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
        onClick={(event) => event.stopPropagation()}
        disabled={disabled}
      />
      <span className="flex items-center gap-1 text-xs font-medium text-slate-700">
        <Zap className="h-3.5 w-3.5 text-yellow-500" />
        Express (+50%)
      </span>
    </label>
  );
}

export function LinenTile(props: LinenEntryProps) {
  const {
    item,
    isFavorite,
    canToggleFavorite,
    isFocused,
    isEditingLayout,
    validationErrors,
    dragHandle,
    onQuantityChange,
    onDiscrepancyChange,
    onCopy,
    onClear,
    onClearDiscrepancy,
    onExpressToggle,
    onToggleFavorite,
    onFocus,
    onRemoveFromLayout,
  } = props;

  const hasDiscrepancy = item.quantity_sent !== item.quantity_received;
  const hasQuantity = item.quantity_sent > 0;

  return (
    <div
      data-card-id={item.category.id}
      className={`h-full cursor-pointer touch-manipulation rounded-lg border p-3 transition-all sm:p-4 lg:p-5 ${
        hasDiscrepancy
          ? 'border-orange-200 bg-orange-50'
          : hasQuantity
            ? 'border-blue-200 bg-blue-50'
            : 'border-slate-200 hover:border-slate-300'
      } ${isFocused ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
      onClick={() => onFocus(item.category.id)}
      tabIndex={0}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-1">
            {dragHandle && <DragHandle dragHandle={dragHandle} />}
            <h4 className="text-sm font-medium leading-tight text-slate-900">{item.category.name}</h4>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isEditingLayout && onRemoveFromLayout && (
              <RemoveButton onClick={() => onRemoveFromLayout(item.category.id)} />
            )}
            {!isEditingLayout && canToggleFavorite && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleFavorite?.(item.category.id, !isFavorite);
                }}
                className={`rounded-full p-1 transition-colors ${
                  isFavorite
                    ? 'bg-amber-50 text-amber-500 hover:text-amber-600'
                    : 'text-slate-400 hover:bg-amber-50 hover:text-amber-500'
                }`}
                aria-label={isFavorite ? 'Remove favourite' : 'Mark as favourite'}
              >
                <Star className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
              </button>
            )}
            {item.discrepancy_details && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onClearDiscrepancy(item.category.id);
                }}
                className="p-1 text-slate-400 transition-colors hover:text-red-500"
                title="Clear discrepancy details"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
            {hasDiscrepancy && (
              <Badge variant="destructive" className="text-xs">
                Discrepancy
              </Badge>
            )}
            {hasQuantity && !hasDiscrepancy && (
              <Badge variant="default" className="bg-green-600 text-xs">
                <CheckCircle className="mr-1 h-3 w-3" />
                Complete
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-600">Price: {formatCurrencySSR(item.price_per_item)}</span>
        </div>

        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Quantity Sent</label>
            <TabletNumericInput
              value={item.quantity_sent.toString()}
              onChange={(value) => onQuantityChange(item.category.id, 'sent', value)}
              placeholder="0"
              maxLength={5}
              className={`text-sm ${validationErrors[`${item.category.id}-sent`] ? 'border-red-300' : ''}`}
            />
            {validationErrors[`${item.category.id}-sent`] && (
              <p className="text-xs text-red-600">{validationErrors[`${item.category.id}-sent`]}</p>
            )}
          </div>

          {isFocused && !isEditingLayout && (
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onCopy(item.category.id);
                }}
                className={`flex min-h-[44px] touch-manipulation items-center gap-1 rounded-md px-3 py-2 text-xs transition-colors ${
                  item.quantity_sent > 0
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'cursor-not-allowed bg-slate-100 text-slate-400'
                }`}
                title="Copy quantity sent to received"
                disabled={item.quantity_sent === 0}
              >
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onClear(item.category.id);
                }}
                className="flex min-h-[44px] touch-manipulation items-center gap-1 rounded-md bg-red-100 px-3 py-2 text-xs text-red-700 transition-colors hover:bg-red-200"
                title="Clear all fields"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Clear</span>
              </button>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Quantity Received</label>
            <TabletNumericInput
              value={item.quantity_received.toString()}
              onChange={(value) => onQuantityChange(item.category.id, 'received', value)}
              placeholder="0"
              maxLength={5}
              className={`text-sm ${validationErrors[`${item.category.id}-received`] ? 'border-red-300' : ''}`}
            />
            {validationErrors[`${item.category.id}-received`] && (
              <p className="text-xs text-red-600">{validationErrors[`${item.category.id}-received`]}</p>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-2">
          <ExpressControl
            checked={item.express_delivery || false}
            disabled={item.quantity_sent === 0}
            onChange={(checked) => onExpressToggle(item.category.id, checked)}
          />
        </div>

        <div className="border-t border-slate-200 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Subtotal:</span>
            <span className="text-sm font-bold text-slate-900">{formatCurrencySSR(item.subtotal)}</span>
          </div>
          {item.express_delivery && (
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-slate-600">Surcharge (50%):</span>
              <span className="text-xs font-semibold text-yellow-600">{formatCurrencySSR(item.subtotal * 0.5)}</span>
            </div>
          )}
        </div>

        {hasDiscrepancy && (
          <div className="space-y-3">
            <div className="rounded border border-orange-200 bg-orange-100 p-2 text-xs">
              <p className="text-orange-800">
                <strong>Discrepancy:</strong> {item.quantity_sent} sent, {item.quantity_received} received (
                {item.quantity_sent - item.quantity_received > 0 ? '+' : ''}
                {item.quantity_sent - item.quantity_received})
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">What caused this discrepancy?</label>
              <Textarea
                placeholder="e.g., Items damaged during washing, items lost, incorrect count..."
                value={item.discrepancy_details || ''}
                onChange={(event) => onDiscrepancyChange(item.category.id, event.target.value)}
                className="min-h-[60px] resize-none text-xs"
                maxLength={500}
                onClick={(event) => event.stopPropagation()}
              />
              <p className="text-xs text-slate-500">{(item.discrepancy_details || '').length}/500 characters</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function LinenRow(props: LinenEntryProps) {
  const {
    item,
    isFocused,
    isEditingLayout,
    validationErrors,
    dragHandle,
    onQuantityChange,
    onDiscrepancyChange,
    onCopy,
    onClear,
    onExpressToggle,
    onFocus,
    onRemoveFromLayout,
  } = props;

  const hasDiscrepancy = item.quantity_sent !== item.quantity_received;
  const hasQuantity = item.quantity_sent > 0;

  return (
    <div
      data-card-id={item.category.id}
      className={`grid cursor-pointer grid-cols-1 border-b border-slate-200 last:border-b-0 md:grid-cols-[minmax(0,1.7fr)_8.5rem_8.5rem_minmax(0,1.3fr)] ${
        hasDiscrepancy ? 'bg-orange-50' : hasQuantity ? 'bg-blue-50/60' : 'bg-white'
      } ${isFocused ? 'ring-2 ring-inset ring-blue-500' : ''}`}
      onClick={() => onFocus(item.category.id)}
    >
      <div className="border-b border-slate-200 px-3 py-2 md:border-b-0 md:border-r">
        <div className="flex items-start gap-1">
          {dragHandle && <DragHandle dragHandle={dragHandle} />}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-slate-900">{item.category.name}</p>
              {isEditingLayout && onRemoveFromLayout && (
                <RemoveButton onClick={() => onRemoveFromLayout(item.category.id)} />
              )}
            </div>
            <p className="text-xs text-slate-500">
              {formatCurrencySSR(item.price_per_item)} each
              {item.quantity_received > 0 && (
                <span className="text-slate-700"> · {formatCurrencySSR(item.subtotal + (item.express_delivery ? item.subtotal * 0.5 : 0))}</span>
              )}
            </p>
            <ExpressControl
              checked={item.express_delivery || false}
              disabled={item.quantity_sent === 0}
              onChange={(checked) => onExpressToggle(item.category.id, checked)}
            />
            {isFocused && !isEditingLayout && (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onCopy(item.category.id);
                  }}
                  className={`rounded px-2 py-1 text-xs ${
                    item.quantity_sent > 0 ? 'bg-blue-100 text-blue-700' : 'cursor-not-allowed bg-slate-100 text-slate-400'
                  }`}
                  disabled={item.quantity_sent === 0}
                >
                  Copy to returned
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onClear(item.category.id);
                  }}
                  className="rounded bg-red-100 px-2 py-1 text-xs text-red-700"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-3 py-2 md:border-r md:border-slate-200">
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:sr-only">
          QTY (Dispatched)
        </label>
        <TabletNumericInput
          value={item.quantity_sent.toString()}
          onChange={(value) => onQuantityChange(item.category.id, 'sent', value)}
          placeholder="0"
          maxLength={5}
          className={`text-sm ${validationErrors[`${item.category.id}-sent`] ? 'border-red-300' : ''}`}
        />
      </div>

      <div className="px-3 py-2 md:border-r md:border-slate-200">
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:sr-only">
          QTY (Returned)
        </label>
        <TabletNumericInput
          value={item.quantity_received.toString()}
          onChange={(value) => onQuantityChange(item.category.id, 'received', value)}
          placeholder="0"
          maxLength={5}
          className={`text-sm ${validationErrors[`${item.category.id}-received`] ? 'border-red-300' : ''}`}
        />
      </div>

      <div className="px-3 py-2">
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:sr-only">
          Notes
        </label>
        {hasDiscrepancy && (
          <p className="mb-1 text-[11px] text-orange-800">
            {item.quantity_sent} dispatched, {item.quantity_received} returned
          </p>
        )}
        <Textarea
          placeholder="Notes"
          value={item.discrepancy_details || ''}
          onChange={(event) => onDiscrepancyChange(item.category.id, event.target.value)}
          className="min-h-[44px] resize-none text-xs"
          maxLength={500}
          onClick={(event) => event.stopPropagation()}
        />
      </div>
    </div>
  );
}
