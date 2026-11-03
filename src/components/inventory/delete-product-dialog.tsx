'use client';

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
import type { ChemicalStockLevel } from '@/types/database';
import { useMovements, useWeighIns } from '@/lib/hooks/use-inventory';

interface DeleteProductDialogProps {
  product: ChemicalStockLevel | null;
  pending: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function DeleteProductDialog({
  product,
  pending,
  error,
  onOpenChange,
  onConfirm,
}: DeleteProductDialogProps) {
  const open = !!product;
  const historyEnabled = open && !!product?.id;
  const movements = useMovements(
    { product_id: product?.id },
    { enabled: historyEnabled }
  );
  const weighIns = useWeighIns(
    { product_id: product?.id },
    { enabled: historyEnabled }
  );

  const checking = historyEnabled && (movements.isPending || weighIns.isPending);
  const historyFailed =
    movements.isError ||
    weighIns.isError ||
    (movements.data != null && !movements.data.success) ||
    (weighIns.data != null && !weighIns.data.success);
  const movementCount = movements.data?.success ? movements.data.data?.length ?? 0 : 0;
  const weighInCount = weighIns.data?.success ? weighIns.data.data?.length ?? 0 : 0;
  const hasHistory = !checking && !historyFailed && (movementCount > 0 || weighInCount > 0);

  let description = 'Checking this product’s history…';
  if (!checking && historyFailed) {
    description = 'If this product has history, it will be archived instead of deleted.';
  } else if (!checking && hasHistory) {
    description = 'This product has history, so it will be archived instead of deleted.';
  } else if (!checking) {
    description = `${product?.name ?? 'This detergent'} will be permanently deleted.`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {product?.name ?? 'detergent'}?</DialogTitle>
          <DialogDescription className="text-slate-600">{description}</DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={pending || checking}
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Working...
              </>
            ) : hasHistory ? (
              'Archive'
            ) : (
              'Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
