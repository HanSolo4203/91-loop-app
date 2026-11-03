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
  formatQuantity,
  formatSignedQuantity,
  stockUnit,
} from '@/components/inventory/stock-display';
import type { RecordStockTakePayload } from '@/lib/hooks/use-inventory';

interface StockTakeDialogProps {
  product: ChemicalStockLevel | null;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: RecordStockTakePayload) => Promise<void>;
}

const inputClass =
  'bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus-visible:ring-slate-400';

export default function StockTakeDialog({ product, onOpenChange, onSave }: StockTakeDialogProps) {
  const open = !!product;
  const [counted, setCounted] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!product) return;
    setCounted('');
    setNote('');
    setError(null);
  }, [product]);

  const onHand = product ? asNumber(product.on_hand_l) : 0;
  const unit = stockUnit(product?.unit);
  const countedValue = Number(counted);
  const difference = counted.trim() !== '' && Number.isFinite(countedValue) ? countedValue - onHand : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!product) return;
    const litres = Number(counted);
    if (counted.trim() === '' || !Number.isFinite(litres) || litres < 0 || litres >= 1000) {
      setError(`Counted ${unit === 'kg' ? 'kilograms' : 'litres'} must be 0 or more and below 1000`);
      return;
    }
    if (note.trim().length === 0) {
      setError('A note is required');
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
        counted_litres: litres,
        note: note.trim(),
      });
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save the stock take');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Stock-take{product ? ` — ${product.name}` : ''}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-600">On hand</p>
            <p className="text-2xl font-semibold tabular-nums text-slate-900">
              {formatQuantity(onHand, unit)}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock-take-counted">Counted {unit} *</Label>
            <Input
              id="stock-take-counted"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={counted}
              onChange={(event) => setCounted(event.target.value)}
              className={inputClass}
              disabled={isSubmitting}
            />
          </div>
          <div className="rounded-lg border border-slate-200 px-4 py-3">
            <p className="text-sm text-slate-600">Difference</p>
            <p
              className={cn(
                'text-xl font-semibold tabular-nums',
                difference == null && 'text-slate-400',
                difference != null && difference > 0 && 'text-green-700',
                difference != null && difference < 0 && 'text-red-700',
                difference === 0 && 'text-slate-900'
              )}
            >
              {difference == null ? 'Enter a count' : formatSignedQuantity(difference, unit)}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock-take-note">Note *</Label>
            <Textarea
              id="stock-take-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={cn(inputClass, 'min-h-[80px]')}
              disabled={isSubmitting}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || difference == null || note.trim().length === 0}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save stock-take'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
