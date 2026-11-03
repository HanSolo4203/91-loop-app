'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ChemicalStockLevel } from '@/types/database';
import {
  asNumber,
  asNumberOrNull,
  formatQuantity,
  stockUnit,
  johannesburgDate,
} from '@/components/inventory/stock-display';
import type { RecordDeliveryPayload } from '@/lib/hooks/use-inventory';

interface ReceiveDeliveryDialogProps {
  product: ChemicalStockLevel | null;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: RecordDeliveryPayload) => Promise<void>;
}

const inputClass =
  'bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus-visible:ring-slate-400';

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export default function ReceiveDeliveryDialog({
  product,
  onOpenChange,
  onSave,
}: ReceiveDeliveryDialogProps) {
  const open = !!product;
  const [containers, setContainers] = useState('1');
  const [litres, setLitres] = useState('');
  const [date, setDate] = useState('');
  const [cost, setCost] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!product) return;
    const size = asNumber(product.container_size_l);
    const startingContainers = 1;
    setContainers(String(startingContainers));
    setLitres(String(round3(startingContainers * size)));
    setDate(johannesburgDate(0));
    const unitCost = asNumberOrNull(product.cost_per_container);
    setCost(unitCost == null ? '' : String(unitCost));
    setReference('');
    setNote('');
    setError(null);
  }, [product]);

  const size = product ? asNumber(product.container_size_l) : 0;
  const containerCount = Number(containers);
  const calculated =
    Number.isFinite(containerCount) && containerCount > 0 ? round3(containerCount * size) : null;

  const updateContainers = (value: string) => {
    setContainers(value);
    const next = Number(value);
    if (Number.isFinite(next) && next > 0) {
      setLitres(String(round3(next * size)));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!product) return;
    const count = Number(containers);
    const litreValue = Number(litres);
    const costValue = cost.trim() === '' ? null : Number(cost);

    if (!Number.isFinite(count) || count <= 0) {
      setError('Containers must be greater than 0');
      return;
    }
    if (!Number.isFinite(litreValue) || litreValue < 0 || litreValue >= 1000) {
      setError(
        `${stockUnit(product.unit) === 'kg' ? 'Kilograms' : 'Litres'} must be 0 or more and below 1000`
      );
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Choose a delivery date');
      return;
    }
    if (costValue != null && (!Number.isFinite(costValue) || costValue < 0 || costValue > 999999.99)) {
      setError('Cost per container must be 0 or more');
      return;
    }
    if (reference.trim().length > 255) {
      setError('Invoice reference must be 255 characters or fewer');
      return;
    }
    if (note.trim().length > 2000) {
      setError('Note must be 2000 characters or fewer');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSave({
        product_id: product.id,
        containers: count,
        litres: litreValue,
        unit_cost: costValue,
        reference: reference.trim() || null,
        occurred_on: date,
        note: note.trim() || null,
      });
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not record the delivery');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Receive delivery{product ? ` — ${product.name}` : ''}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="delivery-containers">Containers *</Label>
            <Input
              id="delivery-containers"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={containers}
              onChange={(event) => updateContainers(event.target.value)}
              className={inputClass}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="delivery-litres">{stockUnit(product?.unit) === 'kg' ? 'Kilograms' : 'Litres'} *</Label>
            <Input
              id="delivery-litres"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={litres}
              onChange={(event) => setLitres(event.target.value)}
              className={inputClass}
              disabled={isSubmitting}
            />
            {calculated != null && (
              <p className="text-xs text-slate-500">
                Calculated from containers × {formatQuantity(size, product?.unit)}:{' '}
                {formatQuantity(calculated, product?.unit)}. You can edit the amount.
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="delivery-date">Date *</Label>
              <Input
                id="delivery-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={inputClass}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery-cost">Cost per container (R)</Label>
              <Input
                id="delivery-cost"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={cost}
                onChange={(event) => setCost(event.target.value)}
                className={inputClass}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="delivery-reference">Supplier invoice ref</Label>
            <Input
              id="delivery-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              className={inputClass}
              disabled={isSubmitting}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="delivery-note">Note</Label>
            <Textarea
              id="delivery-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={cn(inputClass, 'min-h-[80px]')}
              disabled={isSubmitting}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Record delivery'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
