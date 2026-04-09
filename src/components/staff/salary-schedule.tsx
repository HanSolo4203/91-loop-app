'use client';

import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Calendar } from 'lucide-react';
import {
  useSalarySchedule,
  useSalarySummary,
  useGenerateSalarySchedule,
  useMarkSalaryPaid,
} from '@/lib/hooks/use-employees';
import type { SalaryPaymentWithEmployee } from '@/types/database';

const monthOptions = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(v);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    paid: 'bg-green-100 text-green-800 border-green-200',
    skipped: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return (
    <Badge className={map[status] ?? 'bg-slate-100 text-slate-700'}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

interface ScheduleRow {
  employeeId: string;
  employeeName: string;
  role: string | null;
  monthlySalary: number;
  payment1: SalaryPaymentWithEmployee | null;
  payment2: SalaryPaymentWithEmployee | null;
  monthlyTotal: number;
}

function buildScheduleRows(payments: SalaryPaymentWithEmployee[]): ScheduleRow[] {
  const byEmployee = new Map<string, ScheduleRow>();

  for (const p of payments) {
    const existing = byEmployee.get(p.employee_id);
    const emp = p.employee;
    const monthly =
      emp.monthly_salary ?? (emp.bi_weekly_salary != null ? emp.bi_weekly_salary * 2 : 0);

    if (!existing) {
      byEmployee.set(p.employee_id, {
        employeeId: p.employee_id,
        employeeName: emp.full_name,
        role: emp.role ?? null,
        monthlySalary: monthly,
        payment1: p.payment_number === 1 ? p : null,
        payment2: p.payment_number === 2 ? p : null,
        monthlyTotal: 0,
      });
    }
    const row = byEmployee.get(p.employee_id)!;
    if (p.payment_number === 1) row.payment1 = p;
    else row.payment2 = p;
  }

  const rows = Array.from(byEmployee.values());
  for (const row of rows) {
    row.monthlyTotal = (row.payment1?.net_amount ?? 0) + (row.payment2?.net_amount ?? 0);
  }
  return rows.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

export default function SalarySchedule() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [year, setYear] = useState(now.getFullYear());
  const [markPaidPayment, setMarkPaidPayment] = useState<SalaryPaymentWithEmployee | null>(null);
  const [deductions, setDeductions] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const { data: scheduleData, isLoading: scheduleLoading, refetch: refetchSchedule } = useSalarySchedule(month, year);
  const { data: summaryData, isLoading: summaryLoading, refetch: refetchSummary } = useSalarySummary(month, year);
  const generateMutation = useGenerateSalarySchedule();
  const markPaidMutation = useMarkSalaryPaid();

  const payments = scheduleData?.success && Array.isArray(scheduleData.data) ? scheduleData.data : [];
  const rows = useMemo(() => buildScheduleRows(payments), [payments]);

  const summary = summaryData?.success && summaryData.data ? summaryData.data : null;

  const yearOptions = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i);

  const handleGenerate = async () => {
    try {
      await generateMutation.mutateAsync({ month, year });
      refetchSchedule();
      refetchSummary();
    } catch {
      // Error from mutation
    }
  };

  const handleMarkPaidConfirm = async () => {
    if (!markPaidPayment) return;
    const ded = parseFloat(deductions) || 0;
    try {
      await markPaidMutation.mutateAsync({
        id: markPaidPayment.id,
        deductions: ded,
        notes: notes.trim() || undefined,
      });
      setMarkPaidPayment(null);
      setDeductions('');
      setNotes('');
      refetchSchedule();
      refetchSummary();
    } catch {
      // Error from mutation
    }
  };

  const openMarkPaid = (p: SalaryPaymentWithEmployee) => {
    setMarkPaidPayment(p);
    setDeductions(String(p.deductions ?? 0));
    setNotes(p.notes ?? '');
  };

  const isLoading = scheduleLoading || summaryLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Select
            value={month.toString()}
            onValueChange={(v) => setMonth(parseInt(v, 10))}
            disabled={isLoading}
          >
            <SelectTrigger className="w-40 bg-white border border-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value.toString()}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={year.toString()}
            onValueChange={(v) => setYear(parseInt(v, 10))}
            disabled={isLoading}
          >
            <SelectTrigger className="w-24 bg-white border border-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generateMutation.isPending || isLoading}
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Generating...
            </>
          ) : (
            'Generate Schedule'
          )}
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Payroll</p>
            <p className="text-lg font-semibold text-slate-900">{formatCurrency(summary.total_monthly_payroll)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Payment 1 Total</p>
            <p className="text-lg font-semibold text-slate-900">{formatCurrency(summary.payment_1_total)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Payment 2 Total</p>
            <p className="text-lg font-semibold text-slate-900">{formatCurrency(summary.payment_2_total)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Paid</p>
            <p className="text-lg font-semibold text-green-700">{formatCurrency(summary.total_paid)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Pending</p>
            <p className="text-lg font-semibold text-amber-700">{formatCurrency(summary.total_pending)}</p>
          </div>
        </div>
      )}

      <div className="rounded-md border border-slate-200 bg-white overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Monthly Salary (ZAR)</TableHead>
                <TableHead>Payment 1</TableHead>
                <TableHead>Payment 2</TableHead>
                <TableHead>Monthly Total</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                    No schedule for this period. Click &quot;Generate Schedule&quot; to create payments for active employees.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.employeeId}>
                    <TableCell className="font-medium">
                      <div>{row.employeeName}</div>
                      {row.role && <div className="text-xs text-slate-500">{row.role}</div>}
                    </TableCell>
                    <TableCell>{formatCurrency(row.monthlySalary)}</TableCell>
                    <TableCell>
                      {row.payment1 ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-slate-600">{row.payment1.payment_date}</span>
                          <span>{formatCurrency(row.payment1.net_amount)}</span>
                          <StatusBadge status={row.payment1.status} />
                          {row.payment1.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openMarkPaid(row.payment1!)}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.payment2 ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-slate-600">{row.payment2.payment_date}</span>
                          <span>{formatCurrency(row.payment2.net_amount)}</span>
                          <StatusBadge status={row.payment2.status} />
                          {row.payment2.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openMarkPaid(row.payment2!)}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(row.monthlyTotal)}</TableCell>
                    <TableCell />
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!markPaidPayment} onOpenChange={(o) => !o && setMarkPaidPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark payment as paid</DialogTitle>
            <DialogDescription>
              {markPaidPayment && (
                <>
                  {markPaidPayment.employee.full_name} — {formatCurrency(markPaidPayment.gross_amount)} on {markPaidPayment.payment_date}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {markPaidPayment && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="deductions">Deductions (optional)</Label>
                <Input
                  id="deductions"
                  type="number"
                  min={0}
                  step={0.01}
                  value={deductions}
                  onChange={(e) => setDeductions(e.target.value)}
                  className="bg-white border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes"
                  className="bg-white border-slate-300"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkPaidPayment(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleMarkPaidConfirm}
              disabled={markPaidMutation.isPending}
            >
              {markPaidMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
