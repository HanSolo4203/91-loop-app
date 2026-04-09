'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ImageUpload from '@/components/ui/image-upload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Employee } from '@/types/database';
import type { CreateEmployeeRequest } from '@/lib/services/staff/employees';

export interface EmployeeFormData {
  full_name: string;
  phone?: string;
  email?: string;
  role?: string;
  shift_type: 'day' | 'night' | 'both';
  monthly_salary?: number;
  salary_payment_day_1?: number;
  salary_payment_day_2?: number;
  bank_reference?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_branch_code?: string;
  account_type?: 'cheque' | 'savings';
  id_number?: string;
  id_document_url?: string;
  status: 'active' | 'inactive';
}

interface EmployeeFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
  onSave: (data: EmployeeFormData) => Promise<void>;
}

export default function EmployeeFormDrawer({
  open,
  onOpenChange,
  employee,
  onSave,
}: EmployeeFormDrawerProps) {
  const [formData, setFormData] = useState<EmployeeFormData>({
    full_name: '',
    phone: '',
    email: '',
    role: '',
    shift_type: 'both',
    monthly_salary: undefined,
    salary_payment_day_1: 1,
    salary_payment_day_2: 15,
    bank_reference: '',
    bank_name: '',
    bank_account_number: '',
    bank_branch_code: '',
    account_type: undefined,
    id_number: '',
    id_document_url: '',
    status: 'active',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({
        full_name: employee.full_name || '',
        phone: employee.phone || '',
        email: employee.email || '',
        role: employee.role || '',
        shift_type: employee.shift_type ?? 'both',
        monthly_salary: employee.monthly_salary ?? employee.bi_weekly_salary != null ? employee.bi_weekly_salary * 2 : undefined,
        salary_payment_day_1: employee.salary_payment_day_1 ?? 1,
        salary_payment_day_2: employee.salary_payment_day_2 ?? 15,
        bank_reference: employee.bank_reference || '',
        bank_name: employee.bank_name || '',
        bank_account_number: employee.bank_account_number || '',
        bank_branch_code: employee.bank_branch_code || '',
        account_type: employee.account_type || undefined,
        id_number: employee.id_number || '',
        id_document_url: employee.id_document_url || '',
        status: employee.status ?? 'active',
      });
    } else {
      setFormData({
        full_name: '',
        phone: '',
        email: '',
        role: '',
        shift_type: 'both',
        monthly_salary: undefined,
        salary_payment_day_1: 1,
        salary_payment_day_2: 15,
        bank_reference: '',
        bank_name: '',
        bank_account_number: '',
        bank_branch_code: '',
        account_type: undefined,
        id_number: '',
        id_document_url: '',
        status: 'active',
      });
    }
    setErrors({});
  }, [employee, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.full_name?.trim()) {
      newErrors.full_name = 'Full name is required';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (formData.monthly_salary !== undefined && formData.monthly_salary < 0) {
      newErrors.monthly_salary = 'Salary cannot be negative';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const update = (field: keyof EmployeeFormData, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const isEditing = !!employee;

  const inputClass = 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus-visible:ring-slate-400';
  const labelClass = 'text-slate-700';
  const selectClass = 'bg-white border-slate-300 text-slate-900 data-[placeholder]:text-slate-500';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col h-full sm:max-w-lg p-0 bg-white text-slate-900 border-slate-200">
        <SheetHeader className="px-6 pt-6 pb-4 pr-12 border-b border-slate-200 shrink-0">
          <SheetTitle className="text-slate-900">{isEditing ? 'Edit Employee' : 'Add Employee'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-white">
          <div className="space-y-2">
            <Label htmlFor="full_name" className={labelClass}>Full Name *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              placeholder="Enter full name"
              className={cn(inputClass, errors.full_name && 'border-red-400')}
              disabled={isSubmitting}
            />
            {errors.full_name && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.full_name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className={labelClass}>Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="+27..."
                disabled={isSubmitting}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className={labelClass}>Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => update('email', e.target.value)}
                placeholder="email@example.com"
                className={cn(inputClass, errors.email && 'border-red-400')}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.email}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="role" className={labelClass}>Role</Label>
            <Input
              id="role"
              value={formData.role || ''}
              onChange={(e) => update('role', e.target.value)}
              placeholder="e.g. Driver"
              disabled={isSubmitting}
              className={inputClass}
            />
          </div>
            <div className="space-y-2">
              <Label className={labelClass}>Shift Type</Label>
              <Select
                value={formData.shift_type}
                onValueChange={(v) => update('shift_type', v as 'day' | 'night' | 'both')}
                disabled={isSubmitting}
              >
                <SelectTrigger className={selectClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="night">Night</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthly_salary" className={labelClass}>Monthly Salary (ZAR)</Label>
            <Input
              id="monthly_salary"
              type="number"
              min={0}
              step={0.01}
              value={formData.monthly_salary ?? ''}
              onChange={(e) => update('monthly_salary', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="0.00"
              className={cn(inputClass, errors.monthly_salary && 'border-red-400')}
              disabled={isSubmitting}
            />
            {errors.monthly_salary && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.monthly_salary}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary_payment_day_1" className={labelClass}>1st Payment — Day of Month</Label>
              <Input
                id="salary_payment_day_1"
                type="number"
                min={1}
                max={28}
                value={formData.salary_payment_day_1 ?? 1}
                onChange={(e) => update('salary_payment_day_1', Math.min(28, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                disabled={isSubmitting}
                className={inputClass}
              />
              <p className="text-xs text-slate-500">e.g. 1 = paid on the 1st of each month</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary_payment_day_2" className={labelClass}>2nd Payment — Day of Month</Label>
              <Input
                id="salary_payment_day_2"
                type="number"
                min={1}
                max={28}
                value={formData.salary_payment_day_2 ?? 15}
                onChange={(e) => update('salary_payment_day_2', Math.min(28, Math.max(1, parseInt(e.target.value, 10) || 15)))}
                disabled={isSubmitting}
                className={inputClass}
              />
              <p className="text-xs text-slate-500">e.g. 15 = paid on the 15th of each month</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank_reference" className={labelClass}>Bank Payment Reference</Label>
            <Input
              id="bank_reference"
              value={formData.bank_reference || ''}
              onChange={(e) => update('bank_reference', e.target.value)}
              placeholder="Reference on bank statement"
              disabled={isSubmitting}
              className={inputClass}
            />
            <p className="text-xs text-slate-500">Reference shown on employee&apos;s bank statement</p>
          </div>

          {(formData.monthly_salary != null && formData.monthly_salary > 0) && (
            <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
              Each payment: R {((formData.monthly_salary ?? 0) / 2).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} — Paid on the {formData.salary_payment_day_1 ?? 1} and {formData.salary_payment_day_2 ?? 15} of each month
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="bank_name" className={labelClass}>Bank Name</Label>
            <Input
              id="bank_name"
              value={formData.bank_name || ''}
              onChange={(e) => update('bank_name', e.target.value)}
              placeholder="Bank name"
              disabled={isSubmitting}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank_account_number" className={labelClass}>Account Number</Label>
              <Input
                id="bank_account_number"
                value={formData.bank_account_number || ''}
                onChange={(e) => update('bank_account_number', e.target.value)}
                placeholder="Account #"
                disabled={isSubmitting}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_branch_code" className={labelClass}>Branch Code</Label>
              <Input
                id="bank_branch_code"
                value={formData.bank_branch_code || ''}
                onChange={(e) => update('bank_branch_code', e.target.value)}
                placeholder="Branch code"
                disabled={isSubmitting}
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className={labelClass}>Account Type</Label>
            <Select
              value={formData.account_type || ''}
              onValueChange={(v) => update('account_type', v === '' ? undefined : (v as 'cheque' | 'savings'))}
              disabled={isSubmitting}
            >
              <SelectTrigger className={selectClass}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="id_number" className={labelClass}>ID Number</Label>
            <Input
              id="id_number"
              value={formData.id_number || ''}
              onChange={(e) => update('id_number', e.target.value)}
              placeholder="South African ID"
              disabled={isSubmitting}
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <p className={cn('text-sm font-medium', labelClass)}>ID Document</p>
            <ImageUpload
              label=""
              value={formData.id_document_url || null}
              onChange={(url) => update('id_document_url', url || '')}
              bucket="staff-documents"
              folder="id-documents"
              disabled={isSubmitting}
              showPreview
              previewSize="sm"
              className="pb-2"
            />
          </div>

          <div className="space-y-2">
            <Label className={labelClass}>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(v) => update('status', v as 'active' | 'inactive')}
              disabled={isSubmitting}
            >
              <SelectTrigger className={selectClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>

          <div className="shrink-0 px-6 py-4 border-t border-slate-200 bg-white flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                isEditing ? 'Update' : 'Create'
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
