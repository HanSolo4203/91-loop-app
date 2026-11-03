'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ChemicalWeighInWithEmployees } from '@/lib/services/inventory';
import type { AdminUpdateWeighInRequest } from '@/lib/services/inventory';
import {
  asNumber,
  formatQuantity,
  formatShiftDate,
  formatSignedQuantity,
  previewUsedLitres,
  stockUnit,
} from '@/components/inventory/stock-display';

interface WeighInCorrectDialogProps {
  weighIn: ChemicalWeighInWithEmployees | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, payload: AdminUpdateWeighInRequest) => Promise<void>;
}

const inputClass =
  'bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus-visible:ring-slate-400';

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function parseAmount(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed >= 1000) return null;
  return round3(parsed);
}

function formatPreview(amount: number | null, unit: unknown): string {
  if (amount == null) return '—';
  return amount < 0 ? formatSignedQuantity(amount, unit) : formatQuantity(amount, unit);
}

export default function WeighInCorrectDialog({
  weighIn,
  pending,
  onOpenChange,
  onSave,
}: WeighInCorrectDialogProps) {
  const open = !!weighIn;
  const [startKg, setStartKg] = useState('');
  const [endKg, setEndKg] = useState('');
  const [addedL, setAddedL] = useState('');
  const [pouredL, setPouredL] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!weighIn) return;
    setStartKg(String(asNumber(weighIn.start_kg)));
    setAddedL(String(asNumber(weighIn.added_l)));
    setPouredL(String(asNumber(weighIn.poured_l)));
    setEndKg(weighIn.end_kg == null ? '' : String(asNumber(weighIn.end_kg)));
    setNotes(weighIn.notes ?? '');
    setError(null);
  }, [weighIn]);

  const decant = weighIn?.product?.tracking_mode === 'decant';
  const unit = stockUnit(weighIn?.product?.unit);
  const start = parseAmount(startKg);
  const added = parseAmount(addedL);
  const poured = decant ? parseAmount(pouredL) : null;
  const end = endKg.trim() === '' ? null : parseAmount(endKg);
  const endInvalid = endKg.trim() !== '' && end == null;
  const density = weighIn?.product?.kg_per_litre ?? 1;
  const preview =
    start != null && added != null && !endInvalid
      ? previewUsedLitres(start, added, end, density)
      : null;
  const closing = weighIn?.status === 'open' && end != null;
  const reopening = weighIn?.status === 'closed' && endKg.trim() === '';
  const productName = weighIn?.product?.name ?? 'this product';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!weighIn) return;
    if (start == null) {
      setError('Start weight must be 0 or more and below 1000');
      return;
    }
    if (added == null) {
      setError(`Added ${unit === 'kg' ? 'kilograms' : 'litres'} must be 0 or more and below 1000`);
      return;
    }
    if (decant && poured == null) {
      setError(
        `${unit === 'kg' ? 'Kilograms' : 'Litres'} poured from the drum must be 0 or more and below 1000`
      );
      return;
    }
    if (endInvalid || (endKg.trim() !== '' && end == null)) {
      setError('End weight must be 0 or more and below 1000');
      return;
    }
    if (notes.trim().length > 2000) {
      setError('Notes must be 2000 characters or fewer');
      return;
    }

    setError(null);
    try {
      await onSave(weighIn.id, {
        start_kg: start,
        added_l: added,
        ...(decant && poured != null ? { poured_l: poured } : {}),
        end_kg: end,
        notes: notes.trim() ? notes.trim() : null,
      });
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save this weigh-in');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Correct weigh-in</DialogTitle>
          <DialogDescription className="text-slate-600">
            {productName}
            {weighIn ? ` · ${formatShiftDate(weighIn.shift_date)}` : ''}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weigh-in-start">Start kg</Label>
              <Input
                id="weigh-in-start"
                type="number"
                inputMode="decimal"
                min="0"
                max="999.999"
                step="0.001"
                value={startKg}
                onChange={(event) => setStartKg(event.target.value)}
                className={inputClass}
                disabled={pending}
                required
              />
            </div>
            {decant && (
              <div className="space-y-2">
                <Label htmlFor="weigh-in-poured">Poured from the drum ({unit})</Label>
                <Input
                  id="weigh-in-poured"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="999.999"
                  step="0.001"
                  value={pouredL}
                  onChange={(event) => setPouredL(event.target.value)}
                  className={inputClass}
                  disabled={pending}
                  required
                />
                <p className="text-xs text-slate-500">
                  Taken from the drum before the start weight. Usage still comes from the bottle weights.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="weigh-in-added">
                {decant ? `Poured more during the shift (${unit})` : `Added ${unit === 'kg' ? 'kilograms' : 'litres'}`}
              </Label>
              <Input
                id="weigh-in-added"
                type="number"
                inputMode="decimal"
                min="0"
                max="999.999"
                step="0.001"
                value={addedL}
                onChange={(event) => setAddedL(event.target.value)}
                className={inputClass}
                disabled={pending}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="weigh-in-end">End kg</Label>
            <Input
              id="weigh-in-end"
              type="number"
              inputMode="decimal"
              min="0"
              max="999.999"
              step="0.001"
              value={endKg}
              onChange={(event) => setEndKg(event.target.value)}
              className={inputClass}
              disabled={pending}
              placeholder={weighIn?.status === 'open' ? 'Enter to close' : ''}
            />
            <p className="text-xs text-slate-500">
              {reopening
                ? 'Clearing the end weight reopens this weigh-in and removes its usage from stock.'
                : 'Enter an end weight to close this weigh-in and record usage.'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-600">Used</p>
            <p
              className={cn(
                'text-2xl font-semibold tabular-nums',
                preview == null && 'text-slate-400',
                preview != null && preview < 0 && 'text-red-700',
                preview != null && preview >= 0 && 'text-slate-900'
              )}
            >
              {formatPreview(preview, unit)}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="weigh-in-notes">Notes</Label>
            <Textarea
              id="weigh-in-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={inputClass}
              disabled={pending}
              maxLength={2000}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : closing ? (
                'Close weigh-in'
              ) : (
                'Save correction'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
