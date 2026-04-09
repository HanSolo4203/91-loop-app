'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ImageUpload from '@/components/ui/image-upload';
import { getExpenseIcon } from '@/lib/constants/expense-icons';
import type { ExpenseWithCategory, ExpenseCategory } from '@/types/database';
import type { CreateExpenseRequest } from '@/lib/services/expenses';

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ExpenseCategory[];
  expense?: ExpenseWithCategory | null;
  defaultMonth?: number;
  defaultYear?: number;
  onSave: (data: CreateExpenseRequest) => Promise<void>;
}

export default function ExpenseForm({
  open,
  onOpenChange,
  categories,
  expense,
  defaultMonth,
  defaultYear,
  onSave,
}: ExpenseFormProps) {
  const now = new Date();
  const month = defaultMonth ?? now.getMonth() + 1;
  const year = defaultYear ?? now.getFullYear();
  const today = now.toISOString().split('T')[0];

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(today);
  const [isRecurring, setIsRecurring] = useState(false);
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (expense) {
      setName(expense.name);
      setCategoryId(expense.category_id);
      setAmount(String(expense.amount));
      setExpenseDate(expense.expense_date);
      setIsRecurring(expense.is_recurring);
      setNotes(expense.notes || '');
      setReceiptUrl(expense.receipt_url || null);
    } else {
      setName('');
      setCategoryId('');
      setAmount('');
      setExpenseDate(today);
      setIsRecurring(false);
      setNotes('');
      setReceiptUrl(null);
    }
    setError(null);
  }, [expense, open, today]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amt = parseFloat(amount);
    if (!name.trim()) {
      setError('Description is required');
      return;
    }
    if (!categoryId) {
      setError('Category is required');
      return;
    }
    if (isNaN(amt) || amt < 0) {
      setError('Amount must be a valid non-negative number');
      return;
    }
    if (!expenseDate) {
      setError('Date is required');
      return;
    }

    const date = new Date(expenseDate);
    const periodMonth = date.getMonth() + 1;
    const periodYear = date.getFullYear();

    setSaving(true);
    try {
      await onSave({
        category_id: categoryId,
        name: name.trim(),
        amount: amt,
        expense_date: expenseDate,
        period_month: periodMonth,
        period_year: periodYear,
        is_recurring: isRecurring,
        notes: notes.trim() || undefined,
        receipt_url: receiptUrl || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="overflow-y-auto sm:max-w-md bg-white text-slate-900"
      >
        <SheetHeader>
          <SheetTitle className="text-slate-900">
            {expense ? 'Edit Expense' : 'Add Expense'}
          </SheetTitle>
          <SheetDescription className="text-slate-600 sr-only">
            {expense ? 'Edit expense details' : 'Enter details for the new expense'}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-6">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="category" className="text-slate-700 font-medium">
              Category
            </Label>
            <Select value={categoryId} onValueChange={setCategoryId} required>
              <SelectTrigger
                id="category"
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500"
              >
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 text-slate-900">
                {categories.map((cat) => {
                  const Icon = getExpenseIcon(cat.icon);
                  return (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {cat.name}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-700 font-medium">
              Description
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. March Rent - Paarden Eiland"
              required
              className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-slate-700 font-medium">
              Amount (ZAR)
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense_date" className="text-slate-700 font-medium">
              Date
            </Label>
            <Input
              id="expense_date"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              required
              className="bg-white border-slate-300 text-slate-900"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_recurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <Label
              htmlFor="is_recurring"
              className="cursor-pointer font-normal text-slate-700"
            >
              Recurring expense (copy to next month)
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-slate-700 font-medium">
              Notes
            </Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              placeholder="Optional notes..."
            />
          </div>

          <div className="space-y-2">
            <ImageUpload
              label="Receipt"
              value={receiptUrl}
              onChange={setReceiptUrl}
              bucket="expense-receipts"
              folder="receipts"
              acceptedFormats={['.jpg', '.jpeg', '.png', '.webp']}
              className="[&_p]:!text-slate-700"
            />
          </div>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
