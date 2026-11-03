'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ChemicalStockLevel } from '@/types/database';
import { stockUnit, type StockUnit } from '@/lib/chemical-unit';
import { asNumber, asNumberOrNull } from '@/components/inventory/stock-display';
import ImageUpload from '@/components/ui/image-upload';

export interface ProductFormValues {
  name: string;
  supplier: string | null;
  unit: StockUnit;
  container_size_l: number;
  reorder_level_l: number;
  reorder_qty_containers: number | null;
  cost_per_container: number | null;
  notes: string | null;
  opening_stock_l?: number | null;
  tracking_mode: 'container' | 'decant';
  issue_size_l?: number;
  /** Sent only when the bottle amount should reset the baseline. */
  jug_baseline_l?: number | null;
  image_url: string | null;
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ChemicalStockLevel | null;
  onSave: (values: ProductFormValues) => Promise<void>;
}

const inputClass =
  'bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus-visible:ring-slate-400';
const labelClass = 'text-slate-700';

const QUICK_SIZES = [5, 25];

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-sm text-red-600 flex items-center gap-1">
      <AlertCircle className="w-4 h-4" />
      {message}
    </p>
  );
}

export default function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSave,
}: ProductFormDialogProps) {
  const isEditing = !!product;
  const [name, setName] = useState('');
  const [supplier, setSupplier] = useState('');
  const [unit, setUnit] = useState<StockUnit>('L');
  const [containerSize, setContainerSize] = useState('25');
  const [reorderLevel, setReorderLevel] = useState('0');
  const [reorderQty, setReorderQty] = useState('1');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [openingStock, setOpeningStock] = useState('');
  const [decant, setDecant] = useState(false);
  const [issueSize, setIssueSize] = useState('5');
  const [jugLitres, setJugLitres] = useState('0');
  const [loadedJug, setLoadedJug] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? '');
    setSupplier(product?.supplier ?? '');
    setUnit(stockUnit(product?.unit));
    setContainerSize(product ? String(asNumber(product.container_size_l)) : '25');
    setReorderLevel(product ? String(asNumber(product.reorder_level_l)) : '0');
    setReorderQty(
      product && asNumberOrNull(product.reorder_qty_containers) != null
        ? String(asNumber(product.reorder_qty_containers))
        : '1'
    );
    setCost(
      product && asNumberOrNull(product.cost_per_container) != null
        ? String(asNumber(product.cost_per_container))
        : ''
    );
    setNotes(product?.notes ?? '');
    setOpeningStock('');
    const poured = product?.tracking_mode === 'decant';
    setDecant(poured);
    setIssueSize(
      product && asNumber(product.issue_size_l) > 0 ? String(asNumber(product.issue_size_l)) : '5'
    );
    const jug = product ? asNumber(product.jug_l) : 0;
    setJugLitres(poured ? String(jug) : '0');
    setLoadedJug(jug);
    setImageUrl(product?.image_url ?? '');
    setErrors({});
    setFormError(null);
  }, [open, product]);

  const selectedSize = Number(containerSize);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const trimmedName = name.trim();
    if (!trimmedName) nextErrors.name = 'Product name is required';
    else if (trimmedName.length > 255) nextErrors.name = 'Product name must be less than 255 characters';

    const size = Number(containerSize);
    if (!Number.isFinite(size) || size <= 0) {
      nextErrors.container_size_l = 'Container size must be greater than 0';
    } else if (size > 999999.99) {
      nextErrors.container_size_l = 'Container size is too large';
    }

    const level = Number(reorderLevel);
    if (reorderLevel.trim() === '' || !Number.isFinite(level) || level < 0 || level >= 1000) {
      nextErrors.reorder_level_l = `Reorder level must be 0 or more and below 1000 ${unit}`;
    }

    let qty: number | null = null;
    if (reorderQty.trim() !== '') {
      qty = Number(reorderQty);
      if (!Number.isInteger(qty) || qty < 0 || qty > 100000) {
        nextErrors.reorder_qty_containers = 'Reorder quantity must be a whole number from 0';
      }
    }

    let costValue: number | null = null;
    if (cost.trim() !== '') {
      costValue = Number(cost);
      if (!Number.isFinite(costValue) || costValue < 0 || costValue > 999999.99) {
        nextErrors.cost_per_container = 'Cost must be 0 or more';
      }
    }

    let opening: number | null = null;
    if (!isEditing && openingStock.trim() !== '') {
      opening = Number(openingStock);
      if (!Number.isFinite(opening) || opening < 0 || opening >= 1000) {
        nextErrors.opening_stock_l = `Opening stock must be 0 or more and below 1000 ${unit}`;
      }
    }

    let pourSize: number | undefined;
    let bottleLitres: number | undefined;
    if (decant) {
      pourSize = Number(issueSize);
      if (!Number.isFinite(pourSize) || pourSize <= 0 || pourSize >= 1000) {
        nextErrors.issue_size_l = `Pour size must be greater than 0 and below 1000 ${unit}`;
      }
      bottleLitres = jugLitres.trim() === '' ? 0 : Number(jugLitres);
      if (!Number.isFinite(bottleLitres) || bottleLitres < 0 || bottleLitres >= 1000) {
        nextErrors.jug_baseline_l = `Amount in the bottle must be 0 or more and below 1000 ${unit}`;
      } else if (!isEditing) {
        const openingTotal = opening ?? 0;
        if (bottleLitres > openingTotal) {
          nextErrors.jug_baseline_l = 'Amount in the bottle cannot be more than opening stock';
        }
      } else if (product && bottleLitres > asNumber(product.on_hand_l)) {
        nextErrors.jug_baseline_l = 'Amount in the bottle cannot be more than stock on hand';
      }
    }

    if (notes.trim().length > 2000) nextErrors.notes = 'Notes must be 2000 characters or fewer';
    if (supplier.trim().length > 255) nextErrors.supplier = 'Supplier must be 255 characters or fewer';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      await onSave({
        name: trimmedName,
        supplier: blankToNull(supplier),
        unit,
        container_size_l: size,
        reorder_level_l: level,
        reorder_qty_containers: qty,
        cost_per_container: costValue,
        notes: blankToNull(notes),
        image_url: blankToNull(imageUrl),
        tracking_mode: decant ? 'decant' : 'container',
        ...(decant && pourSize != null ? { issue_size_l: pourSize } : {}),
        ...(decant &&
        bottleLitres != null &&
        (!isEditing ||
          product?.tracking_mode !== 'decant' ||
          Math.round(bottleLitres * 1000) !== Math.round(loadedJug * 1000))
          ? { jug_baseline_l: bottleLitres }
          : {}),
        ...(!isEditing ? { opening_stock_l: opening } : {}),
      });
      onOpenChange(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save this detergent');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col h-full sm:max-w-lg p-0 bg-white text-slate-900 border-slate-200"
      >
        <SheetHeader className="px-6 pt-6 pb-4 pr-12 border-b border-slate-200 shrink-0">
          <SheetTitle className="text-slate-900">
            {isEditing ? 'Edit detergent' : 'Add detergent'}
          </SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-white">
            {formError && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {formError}
              </p>
            )}

            <ImageUpload
              label="Photo"
              value={imageUrl}
              onChange={(url) => setImageUrl(url ?? '')}
              disabled={isSubmitting}
              bucket="chemical-product-photos"
              folder="products"
            />

            <div className="space-y-2">
              <Label htmlFor="product-name" className={labelClass}>
                Name *
              </Label>
              <Input
                id="product-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={cn(inputClass, errors.name && 'border-red-400')}
                disabled={isSubmitting}
                autoComplete="off"
              />
              <FieldError message={errors.name} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-supplier" className={labelClass}>
                Supplier
              </Label>
              <Input
                id="product-supplier"
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
                className={cn(inputClass, errors.supplier && 'border-red-400')}
                disabled={isSubmitting}
                autoComplete="off"
              />
              <FieldError message={errors.supplier} />
            </div>

            <div className="space-y-2">
              <Label className={labelClass}>Measured in *</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={unit === 'L' ? 'default' : 'outline'}
                  onClick={() => setUnit('L')}
                  disabled={isSubmitting}
                >
                  Litres (L)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={unit === 'kg' ? 'default' : 'outline'}
                  onClick={() => setUnit('kg')}
                  disabled={isSubmitting}
                >
                  Kilograms (kg)
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Liquids stay in litres. Powders such as laundry powder are stocked in kilograms. The
                scale weight is still kilograms either way.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-container-size" className={labelClass}>
                {decant ? `Drum size (${unit}) *` : `Container size (${unit}) *`}
              </Label>
              <div className="flex flex-wrap gap-2">
                {QUICK_SIZES.map((size) => (
                  <Button
                    key={size}
                    type="button"
                    size="sm"
                    variant={selectedSize === size ? 'default' : 'outline'}
                    onClick={() => setContainerSize(String(size))}
                    disabled={isSubmitting}
                  >
                    {size} {unit}
                  </Button>
                ))}
              </div>
              <Input
                id="product-container-size"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={containerSize}
                onChange={(event) => setContainerSize(event.target.value)}
                className={cn(inputClass, errors.container_size_l && 'border-red-400')}
                disabled={isSubmitting}
              />
              {decant && (
                <p className="text-xs text-slate-500">
                  Deliveries use this drum size. Staff pour from it into the smaller bottle.
                </p>
              )}
              <FieldError message={errors.container_size_l} />
            </div>

            <label className="flex items-start gap-3 rounded-md border border-slate-200 px-3 py-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={decant}
                onChange={(event) => setDecant(event.target.checked)}
                disabled={isSubmitting}
              />
              <span>
                <span className="block text-sm font-medium text-slate-800">
                  Poured from a drum into a smaller bottle
                </span>
                <span className="block text-xs text-slate-500">
                  Staff pour {unit === 'kg' ? 'kilograms' : 'litres'} out of the drum, then weigh only
                  the small bottle.
                </span>
              </span>
            </label>

            {decant && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="product-issue-size" className={labelClass}>
                    Pour size ({unit}) *
                  </Label>
                  <Input
                    id="product-issue-size"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    value={issueSize}
                    onChange={(event) => setIssueSize(event.target.value)}
                    className={cn(inputClass, errors.issue_size_l && 'border-red-400')}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-slate-500">Preset on the kiosk. Staff can change it.</p>
                  <FieldError message={errors.issue_size_l} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-jug" className={labelClass}>
                    {unit === 'kg' ? 'Kilograms' : 'Litres'} in the small bottle now
                  </Label>
                  <Input
                    id="product-jug"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    value={jugLitres}
                    onChange={(event) => setJugLitres(event.target.value)}
                    className={cn(inputClass, errors.jug_baseline_l && 'border-red-400')}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-slate-500">
                    What is already in the bottle. The rest of stock on hand stays in the drums.
                  </p>
                  <FieldError message={errors.jug_baseline_l} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-reorder-level" className={labelClass}>
                  Reorder level ({unit}) *
                </Label>
                <Input
                  id="product-reorder-level"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={reorderLevel}
                  onChange={(event) => setReorderLevel(event.target.value)}
                  className={cn(inputClass, errors.reorder_level_l && 'border-red-400')}
                  disabled={isSubmitting}
                />
                <FieldError message={errors.reorder_level_l} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-reorder-qty" className={labelClass}>
                  Reorder quantity (containers)
                </Label>
                <Input
                  id="product-reorder-qty"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={reorderQty}
                  onChange={(event) => setReorderQty(event.target.value)}
                  className={cn(inputClass, errors.reorder_qty_containers && 'border-red-400')}
                  disabled={isSubmitting}
                />
                <FieldError message={errors.reorder_qty_containers} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-cost" className={labelClass}>
                Cost per container (R)
              </Label>
              <Input
                id="product-cost"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={cost}
                onChange={(event) => setCost(event.target.value)}
                className={cn(inputClass, errors.cost_per_container && 'border-red-400')}
                disabled={isSubmitting}
              />
              <FieldError message={errors.cost_per_container} />
            </div>

            {!isEditing && (
              <div className="space-y-2">
                <Label htmlFor="product-opening-stock" className={labelClass}>
                  Opening stock ({unit})
                </Label>
                <Input
                  id="product-opening-stock"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={openingStock}
                  onChange={(event) => setOpeningStock(event.target.value)}
                  className={cn(inputClass, errors.opening_stock_l && 'border-red-400')}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-slate-500">
                  Optional. Records the {unit === 'kg' ? 'kilograms' : 'litres'} already on hand as an
                  opening balance.
                </p>
                <FieldError message={errors.opening_stock_l} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="product-notes" className={labelClass}>
                Notes
              </Label>
              <Textarea
                id="product-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className={cn(inputClass, errors.notes && 'border-red-400')}
                disabled={isSubmitting}
              />
              <FieldError message={errors.notes} />
            </div>
          </div>

          <div className="shrink-0 px-6 py-4 border-t border-slate-200 bg-white flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Save changes'
              ) : (
                'Add detergent'
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
